const { app, BrowserWindow, dialog, ipcMain, safeStorage, session, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { CatalogStore } = require('./services/catalogStore.cjs');
const { DEFAULT_GEMINI_MODEL, DemoProvider, GeminiProvider } = require('./services/aiProvider.cjs');
const {
  assessAnswer,
  calculateMastery,
  chooseIntervention,
  nextQuestion,
  shouldComplete,
} = require('./services/lessonEngine.cjs');
const { MemoryStore } = require('./services/memoryStore.cjs');
const { VaultManager } = require('./services/vaultManager.cjs');

let mainWindow;
let vault;
let catalog;
let memoryStore;
const activeLessons = new Map();
let activeMediaPolicy = { audio: false, video: false };

const DEFAULT_SETTINGS = Object.freeze({ provider: 'demo', geminiModel: DEFAULT_GEMINI_MODEL });

function readSettings() {
  try {
    if (!fs.existsSync(vault.settingsPath)) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(fs.readFileSync(vault.settingsPath, 'utf8'));
    return { ...DEFAULT_SETTINGS, ...parsed, geminiModel: parsed.geminiModel || DEFAULT_GEMINI_MODEL };
  } catch {
    try {
      if (fs.existsSync(vault.settingsPath)) {
        vault.backupFile(vault.settingsPath, vault.recoveryDir, 'settings-corrupt', 3);
      }
    } catch {
      // Recovery backup is best effort.
    }
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings) {
  vault.atomicWriteJson(vault.settingsPath, { ...DEFAULT_SETTINGS, ...settings });
}

function ensureDeviceKey() {
  if (!safeStorage.isEncryptionAvailable()) return null;
  const settings = readSettings();
  if (settings.deviceKeyEncrypted) {
    try {
      const decoded = safeStorage.decryptString(Buffer.from(settings.deviceKeyEncrypted, 'base64'));
      const key = Buffer.from(decoded, 'base64');
      if (key.length === 32) return key;
    } catch {
      throw new Error('MindCarry cannot unlock its secure device catalogue. Restore the app data or create a new vault.');
    }
  }
  const key = crypto.randomBytes(32);
  settings.deviceKeyEncrypted = safeStorage.encryptString(key.toString('base64')).toString('base64');
  writeSettings(settings);
  return Buffer.from(key);
}

function getGeminiKey() {
  const settings = readSettings();
  if (!settings.geminiKeyEncrypted || !safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(settings.geminiKeyEncrypted, 'base64'));
  } catch {
    return null;
  }
}

async function saveAndTestGeminiKey(apiKey) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure operating-system credential storage is unavailable. MindCarry will not store an API key insecurely.');
  }
  const settings = readSettings();
  const model = settings.geminiModel || DEFAULT_GEMINI_MODEL;
  const provider = new GeminiProvider(apiKey, model);
  const status = await provider.healthCheck();
  if (!status.ok) throw new Error('Gemini responded, but the connection test did not pass.');
  settings.geminiKeyEncrypted = safeStorage.encryptString(apiKey.trim()).toString('base64');
  settings.provider = 'gemini';
  settings.geminiModel = model;
  writeSettings(settings);
  return status;
}

function getProvider() {
  const settings = readSettings();
  const key = getGeminiKey();
  if (settings.provider === 'gemini' && key) {
    return new GeminiProvider(key, settings.geminiModel || DEFAULT_GEMINI_MODEL);
  }
  return new DemoProvider();
}

function assertString(value, name, min = 1, max = 500) {
  if (typeof value !== 'string') throw new Error(`${name} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new Error(`${name} is invalid.`);
  return trimmed;
}

function assertLearnerId(value) {
  return vault.validateLearnerId(assertString(value, 'Learner ID', 36, 36));
}

function trustedRendererUrl(url) {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl && url.startsWith(devUrl)) return true;
  return url.startsWith('file://');
}

function registerHandler(channel, handler) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, async (event, payload) => {
    const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
    if (!trustedRendererUrl(senderUrl)) throw new Error('Blocked an untrusted application request.');
    return handler(payload, event);
  });
}

function mediaPermissionAllowed(permission, details = {}) {
  if (permission === 'audioCapture') return activeMediaPolicy.audio;
  if (permission === 'videoCapture') return activeMediaPolicy.video;
  if (permission !== 'media') return false;
  const mediaTypes = Array.isArray(details.mediaTypes) ? details.mediaTypes : [];
  if (mediaTypes.length === 0) return activeMediaPolicy.audio || activeMediaPolicy.video;
  return mediaTypes.every((type) => {
    if (type === 'audio') return activeMediaPolicy.audio;
    if (type === 'video') return activeMediaPolicy.video;
    return false;
  });
}

function configurePermissions() {
  session.defaultSession.setPermissionCheckHandler((webContents, permission, _origin, details) => {
    return webContents === mainWindow?.webContents && mediaPermissionAllowed(permission, details);
  });
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(webContents === mainWindow?.webContents && mediaPermissionAllowed(permission, details));
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f5f7fb',
    title: 'MindCarry',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!trustedRendererUrl(url)) event.preventDefault();
  });
  mainWindow.on('closed', () => {
    activeMediaPolicy = { audio: false, video: false };
    mainWindow = null;
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function registerIpc() {
  registerHandler('app:status', async () => {
    const settings = readSettings();
    return {
      version: app.getVersion(),
      platform: process.platform,
      provider: settings.provider || 'demo',
      model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
      hasGeminiKey: Boolean(settings.geminiKeyEncrypted),
      secureStorageAvailable: safeStorage.isEncryptionAvailable(),
      vault: vault.status(),
    };
  });

  registerHandler('app:openDataFolder', async () => {
    const error = await shell.openPath(vault.rootDir);
    if (error) throw new Error(`Could not open the MindCarry vault: ${error}`);
    return { ok: true };
  });

  registerHandler('settings:setGeminiKey', async (payload) => {
    const apiKey = assertString(payload?.apiKey, 'Gemini API key', 20, 300);
    return saveAndTestGeminiKey(apiKey);
  });

  registerHandler('settings:removeGeminiKey', async () => {
    const settings = readSettings();
    delete settings.geminiKeyEncrypted;
    settings.provider = 'demo';
    writeSettings(settings);
    return { ok: true };
  });

  registerHandler('settings:testProvider', async () => getProvider().healthCheck());

  registerHandler('learner:list', async () => memoryStore.listLearners());

  registerHandler('learner:create', async (payload) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure device storage is required before creating a learner profile.');
    }
    const preferredName = assertString(payload?.preferredName, 'Child name', 1, 80);
    const age = Number(payload?.age);
    if (!Number.isInteger(age) || age < 4 || age > 14) throw new Error('Age must be between 4 and 14.');
    const passphrase = assertString(payload?.passphrase, 'Parent passphrase', 12, 256);
    const interests = Array.isArray(payload?.interests)
      ? payload.interests.map((item) => assertString(item, 'Interest', 1, 50)).slice(0, 10)
      : [];
    return memoryStore.createLearner({
      preferredName,
      age,
      language: assertString(payload?.language || 'English', 'Language', 1, 50),
      interests,
      parentGoal: String(payload?.parentGoal || '').trim().slice(0, 500),
      passphrase,
      consent: {
        microphoneAllowed: payload?.consent?.microphoneAllowed !== false,
        cameraAllowed: Boolean(payload?.consent?.cameraAllowed),
        localBehaviourAnalysisAllowed: Boolean(payload?.consent?.localBehaviourAnalysisAllowed),
        transcriptStorageAllowed: payload?.consent?.transcriptStorageAllowed !== false,
        rawAudioStorageAllowed: false,
        rawVideoStorageAllowed: false,
      },
    });
  });

  registerHandler('learner:unlock', async (payload) => {
    return memoryStore.open(
      assertLearnerId(payload?.learnerId),
      assertString(payload?.passphrase, 'Parent passphrase', 8, 256),
    );
  });

  registerHandler('learner:dashboard', async (payload) => memoryStore.dashboard(assertLearnerId(payload?.learnerId)));

  registerHandler('learner:lock', async (payload) => {
    const learnerId = assertLearnerId(payload?.learnerId);
    memoryStore.close(learnerId);
    for (const [sessionId, lesson] of activeLessons.entries()) {
      if (lesson.learnerId === learnerId) activeLessons.delete(sessionId);
    }
    activeMediaPolicy = { audio: false, video: false };
    return { ok: true };
  });

  registerHandler('learner:export', async (payload) => {
    const learnerId = assertLearnerId(payload?.learnerId);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export encrypted Learner Memory',
      defaultPath: memoryStore.defaultExportPath(learnerId),
      filters: [{ name: 'MindCarry Learner Memory', extensions: ['childmind'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    const filePath = result.filePath.toLowerCase().endsWith('.childmind')
      ? result.filePath
      : `${result.filePath}.childmind`;
    memoryStore.exportPackage(learnerId, filePath);
    return { canceled: false, filePath };
  });

  registerHandler('learner:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import encrypted Learner Memory',
      properties: ['openFile'],
      filters: [{ name: 'MindCarry Learner Memory', extensions: ['childmind'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const manifest = await memoryStore.importPackage(result.filePaths[0]);
    return { canceled: false, manifest };
  });

  registerHandler('lesson:start', async (payload) => {
    const learnerId = assertLearnerId(payload?.learnerId);
    const dashboard = memoryStore.dashboard(learnerId);
    const { sessionId } = await memoryStore.startSession(learnerId);
    activeMediaPolicy = {
      audio: Boolean(Number(dashboard.consent.microphone_allowed)),
      video: Boolean(
        Number(dashboard.consent.camera_allowed) && Number(dashboard.consent.local_behaviour_analysis_allowed),
      ),
    };
    const lesson = {
      learnerId,
      sessionId,
      questionIndex: 0,
      evidence: [],
      startedQuestionAt: Date.now(),
      currentQuestion: nextQuestion(0),
      dashboard,
      firstMisconception: null,
      usedPersonalisedIntervention: false,
    };
    activeLessons.set(sessionId, lesson);
    return {
      sessionId,
      question: lesson.currentQuestion,
      greeting: `Hello ${dashboard.profile.preferred_name}. Today we will practise addition in three short steps.`,
    };
  });

  registerHandler('lesson:answer', async (payload) => {
    const sessionId = assertString(payload?.sessionId, 'Session ID', 36, 36);
    const lesson = activeLessons.get(sessionId);
    if (!lesson) throw new Error('Lesson session has ended or expired.');
    const answer = assertString(String(payload?.answer ?? ''), 'Answer', 1, 100);
    const responseMs = Math.max(0, Number(payload?.responseMs || Date.now() - lesson.startedQuestionAt));
    const assessment = assessAnswer(lesson.currentQuestion, answer, responseMs, Boolean(payload?.usedHint));
    if (!assessment.correct && !lesson.firstMisconception) lesson.firstMisconception = assessment.misconception;
    const intervention = chooseIntervention(assessment, {
      interests: lesson.dashboard.profile.interests,
    });
    if (!assessment.correct) lesson.usedPersonalisedIntervention = intervention.type === 'visual-interest';

    const evidenceItem = {
      correct: assessment.correct,
      independent: assessment.independent,
      usedHint: assessment.usedHint,
      explained: Boolean(payload?.reasoning && String(payload.reasoning).trim().length > 2),
      transfer: lesson.currentQuestion.representation === 'transfer',
    };
    lesson.evidence.push(evidenceItem);

    let explanation = intervention.message;
    let providerName = 'deterministic';
    if (!assessment.correct) {
      try {
        const providerResponse = await getProvider().explain({
          learnerName: lesson.dashboard.profile.preferred_name,
          age: lesson.dashboard.profile.age,
          interest: lesson.dashboard.profile.interests?.[0],
          question: lesson.currentQuestion.prompt,
          misconception: assessment.misconception,
          successfulStrategy: 'visual counting-on examples',
        });
        explanation = providerResponse.text;
        providerName = providerResponse.provider;
      } catch {
        const fallback = await new DemoProvider().explain({
          learnerName: lesson.dashboard.profile.preferred_name,
          interest: lesson.dashboard.profile.interests?.[0],
        });
        explanation = fallback.text;
        providerName = 'demo-fallback';
      }
    }

    await memoryStore.recordAttempt(lesson.learnerId, {
      sessionId,
      questionId: lesson.currentQuestion.id,
      prompt: lesson.currentQuestion.prompt,
      answerText: answer,
      ...assessment,
      intervention: intervention.type,
      reasoningObservation: assessment.reasoningObservation,
      provider: providerName,
    });

    const movementLevel = Number(payload?.movementLevel);
    if (activeMediaPolicy.video && Number.isFinite(movementLevel)) {
      await memoryStore.recordEngagement(lesson.learnerId, {
        sessionId,
        movementLevel,
        responseLatencyMs: responseMs,
        cue: 'Local movement signal recorded with parent consent; not an emotion or diagnosis.',
      });
    }

    if (shouldComplete(lesson.evidence)) {
      const mastery = calculateMastery(lesson.evidence);
      const profile = lesson.dashboard.profile;
      const interest = profile.interests?.[0];
      const correctCount = lesson.evidence.filter((item) => item.correct).length;
      const memories = [];
      if (lesson.firstMisconception) {
        memories.push({
          type: 'misconception',
          content: `During addition within 20, the learner showed: ${lesson.firstMisconception}.`,
          confidence: 0.65,
        });
      }
      if (lesson.usedPersonalisedIntervention && interest) {
        memories.push({
          type: 'pedagogical',
          content: `${interest} examples were used while reteaching counting on. More sessions are needed to confirm effectiveness.`,
          confidence: 0.55,
        });
      }
      memories.push({
        type: 'skill',
        content: 'Completed an addition-within-20 transfer question independently.',
        confidence: 0.75,
      });
      const dashboard = await memoryStore.completeSession(lesson.learnerId, sessionId, {
        mastery,
        summary: `${profile.preferred_name} answered ${correctCount} of ${lesson.evidence.length} questions correctly and completed the final transfer question independently.`,
        nextRecommendation:
          mastery >= 80
            ? 'Review counting on briefly, then introduce a new addition representation.'
            : 'Review counting on from the larger number before increasing difficulty.',
        memories,
      });
      activeLessons.delete(sessionId);
      activeMediaPolicy = { audio: false, video: false };
      return {
        completed: true,
        assessment,
        explanation: 'You completed a new example independently. MindCarry saved the learning evidence for next time.',
        mastery,
        dashboard,
      };
    }

    lesson.questionIndex = Math.min(lesson.questionIndex + 1, 2);
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

  registerHandler('lesson:cancel', async (payload) => {
    const sessionId = assertString(payload?.sessionId, 'Session ID', 36, 36);
    const lesson = activeLessons.get(sessionId);
    if (!lesson) return { ok: true };
    await memoryStore.cancelSession(lesson.learnerId, sessionId);
    activeLessons.delete(sessionId);
    activeMediaPolicy = { audio: false, video: false };
    return { ok: true };
  });
}

app.whenReady().then(async () => {
  vault = new VaultManager(path.join(app.getPath('userData'), 'MindCarryVault'));
  vault.ensure();
  catalog = new CatalogStore({
    filePath: vault.catalogPath,
    getDeviceKey: ensureDeviceKey,
    atomicWrite: (filePath, data) => vault.atomicWrite(filePath, data),
  });
  memoryStore = new MemoryStore(vault, catalog);
  await memoryStore.initialise();
  createWindow();
  configurePermissions();
  registerIpc();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  activeMediaPolicy = { audio: false, video: false };
  activeLessons.clear();
  memoryStore?.closeAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
