const { app, BrowserWindow, ipcMain, dialog, safeStorage, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { MemoryStore } = require('./services/memoryStore.cjs');
const { assessAnswer, chooseIntervention, calculateMastery, nextQuestion } = require('./services/lessonEngine.cjs');
const { DemoProvider, GeminiProvider } = require('./services/aiProvider.cjs');

let mainWindow;
let memoryStore;
const activeLessons = new Map();

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
  } catch {
    return { provider: 'demo', geminiModel: 'gemini-3.6-flash' };
  }
}

function writeSettings(settings) {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
}

function setGeminiKey(apiKey) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure operating-system credential storage is unavailable on this device.');
  }
  const settings = readSettings();
  settings.geminiKeyEncrypted = safeStorage.encryptString(apiKey.trim()).toString('base64');
  settings.provider = 'gemini';
  writeSettings(settings);
}

function getGeminiKey() {
  const settings = readSettings();
  if (!settings.geminiKeyEncrypted) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.decryptString(Buffer.from(settings.geminiKeyEncrypted, 'base64'));
}

function getProvider() {
  const settings = readSettings();
  const key = getGeminiKey();
  if (settings.provider === 'gemini' && key) {
    return new GeminiProvider(key, settings.geminiModel || 'gemini-3.6-flash');
  }
  return new DemoProvider();
}

function assertString(value, name, min = 1, max = 500) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new Error(`${name} is invalid.`);
  }
  return value.trim();
}

function assertLearnerId(value) {
  return assertString(value, 'Learner ID', 8, 80);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f5f7fb',
    title: 'MindCarry',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl && url.startsWith(devUrl)) return;
    if (url.startsWith('file://')) return;
    event.preventDefault();
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function registerIpc() {
  ipcMain.handle('app:status', async () => {
    const settings = readSettings();
    return {
      version: app.getVersion(),
      platform: process.platform,
      provider: settings.provider || 'demo',
      hasGeminiKey: Boolean(settings.geminiKeyEncrypted),
      secureStorageAvailable: safeStorage.isEncryptionAvailable(),
      dataRoot: path.join(app.getPath('userData'), 'MindCarryData', 'learners'),
    };
  });

  ipcMain.handle('settings:setGeminiKey', async (_event, payload) => {
    const apiKey = assertString(payload?.apiKey, 'Gemini API key', 20, 300);
    setGeminiKey(apiKey);
    const provider = getProvider();
    return provider.healthCheck();
  });

  ipcMain.handle('settings:removeGeminiKey', async () => {
    const settings = readSettings();
    delete settings.geminiKeyEncrypted;
    settings.provider = 'demo';
    writeSettings(settings);
    return { ok: true };
  });

  ipcMain.handle('settings:testProvider', async () => getProvider().healthCheck());

  ipcMain.handle('learner:list', async () => memoryStore.listLearners());

  ipcMain.handle('learner:create', async (_event, payload) => {
    const preferredName = assertString(payload?.preferredName, 'Child name', 1, 80);
    const age = Number(payload?.age);
    if (!Number.isInteger(age) || age < 4 || age > 14) throw new Error('Age must be between 4 and 14.');
    const passphrase = assertString(payload?.passphrase, 'Passphrase', 8, 200);
    const interests = Array.isArray(payload?.interests)
      ? payload.interests.map((item) => assertString(item, 'Interest', 1, 50)).slice(0, 10)
      : [];
    return memoryStore.createLearner({
      preferredName,
      age,
      language: payload?.language || 'English',
      interests,
      parentGoal: String(payload?.parentGoal || '').slice(0, 500),
      passphrase,
      consent: payload?.consent || {},
    });
  });

  ipcMain.handle('learner:unlock', async (_event, payload) => {
    return memoryStore.open(assertLearnerId(payload?.learnerId), assertString(payload?.passphrase, 'Passphrase', 8, 200));
  });

  ipcMain.handle('learner:dashboard', async (_event, payload) => {
    return memoryStore.dashboard(assertLearnerId(payload?.learnerId));
  });

  ipcMain.handle('learner:lock', async (_event, payload) => {
    memoryStore.close(assertLearnerId(payload?.learnerId));
    return { ok: true };
  });

  ipcMain.handle('learner:export', async (_event, payload) => {
    const learnerId = assertLearnerId(payload?.learnerId);
    const manifest = memoryStore.listLearners().find((item) => item.learnerId === learnerId);
    if (!manifest) throw new Error('Learner not found.');
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export learner memory',
      defaultPath: `${manifest.preferredName.replace(/[^a-z0-9_-]/gi, '_')}.childmind`,
      filters: [{ name: 'MindCarry Learner Memory', extensions: ['childmind'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    memoryStore.exportPackage(learnerId, result.filePath);
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('learner:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import learner memory',
      properties: ['openFile'],
      filters: [{ name: 'MindCarry Learner Memory', extensions: ['childmind'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const manifest = await memoryStore.importPackage(result.filePaths[0]);
    return { canceled: false, manifest };
  });

  ipcMain.handle('lesson:start', async (_event, payload) => {
    const learnerId = assertLearnerId(payload?.learnerId);
    const dashboard = memoryStore.dashboard(learnerId);
    const { sessionId } = await memoryStore.startSession(learnerId);
    const lesson = {
      learnerId,
      sessionId,
      questionIndex: 0,
      evidence: [],
      startedQuestionAt: Date.now(),
      currentQuestion: nextQuestion(0),
      dashboard,
    };
    activeLessons.set(sessionId, lesson);
    return {
      sessionId,
      question: lesson.currentQuestion,
      greeting: `Hello ${dashboard.profile.preferred_name}. Today we will practise addition.`,
    };
  });

  ipcMain.handle('lesson:answer', async (_event, payload) => {
    const sessionId = assertString(payload?.sessionId, 'Session ID', 8, 80);
    const lesson = activeLessons.get(sessionId);
    if (!lesson) throw new Error('Lesson session has ended or expired.');
    const responseMs = Math.max(0, Number(payload?.responseMs || Date.now() - lesson.startedQuestionAt));
    const assessment = assessAnswer(lesson.currentQuestion, payload?.answer, responseMs, Boolean(payload?.usedHint));
    const intervention = chooseIntervention(assessment, {
      interests: lesson.dashboard.profile.interests,
    });
    lesson.evidence.push({
      correct: assessment.correct,
      independent: assessment.independent,
      usedHint: assessment.usedHint,
      explained: Boolean(payload?.reasoning && String(payload.reasoning).trim().length > 2),
      transfer: lesson.questionIndex > 0,
    });

    await memoryStore.recordAttempt(lesson.learnerId, {
      sessionId,
      questionId: lesson.currentQuestion.id,
      prompt: lesson.currentQuestion.prompt,
      answerText: payload?.answer,
      ...assessment,
      intervention: intervention.type,
    });

    if (payload?.movementLevel != null) {
      await memoryStore.recordEngagement(lesson.learnerId, {
        sessionId,
        movementLevel: Number(payload.movementLevel),
        responseLatencyMs: responseMs,
        cue: 'Local movement signal; not an emotion or diagnosis.',
      });
    }

    let explanation = intervention.message;
    if (!assessment.correct) {
      const profile = lesson.dashboard.profile;
      const providerResponse = await getProvider().explain({
        learnerName: profile.preferred_name,
        age: profile.age,
        interest: profile.interests?.[0],
        question: lesson.currentQuestion.prompt,
        misconception: assessment.misconception,
        successfulStrategy: 'visual counting-on examples',
      });
      explanation = providerResponse.text;
    }

    if (assessment.correct && lesson.questionIndex >= 1) {
      const mastery = calculateMastery(lesson.evidence);
      const profile = lesson.dashboard.profile;
      const interest = profile.interests?.[0] || 'visual examples';
      const dashboard = await memoryStore.completeSession(lesson.learnerId, sessionId, {
        mastery,
        summary: `${profile.preferred_name} practised addition within 20 and completed an independent transfer question.`,
        nextRecommendation: 'Review counting on from the larger number in the next session.',
        memories: [
          {
            type: 'pedagogical',
            content: `${interest} examples were used to support counting-on practice.`,
            confidence: 0.65,
          },
          ...(assessment.independent
            ? [{ type: 'skill', content: 'Completed an addition transfer question independently.', confidence: 0.75 }]
            : []),
        ],
      });
      activeLessons.delete(sessionId);
      return {
        completed: true,
        assessment,
        explanation: 'You worked through the idea and completed a new example. Well done for explaining your steps.',
        mastery,
        dashboard,
      };
    }

    lesson.questionIndex += 1;
    lesson.currentQuestion = nextQuestion(lesson.questionIndex);
    lesson.startedQuestionAt = Date.now();
    return {
      completed: false,
      assessment,
      explanation,
      question: lesson.currentQuestion,
      visual: assessment.correct ? null : lesson.currentQuestion.visual,
    };
  });
}

app.whenReady().then(async () => {
  const dataRoot = path.join(app.getPath('userData'), 'MindCarryData', 'learners');
  memoryStore = new MemoryStore(dataRoot);
  await memoryStore.initialise();

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
