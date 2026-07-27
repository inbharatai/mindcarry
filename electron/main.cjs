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
const { MemoryStore } = require('./services/learnerMemoryStore.cjs');
const { assertUuid, secureStorageStatus, trustedRendererUrl } = require('./services/runtimeSecurity.cjs');
const { VaultManager } = require('./services/vaultManager.cjs');

let mainWindow;
let vault;
let catalog;
let memoryStore;
const activeLessons = new Map();
let activeMediaPolicy = { audio: false, video: false };

const DEFAULT_SETTINGS = Object.freeze({ provider: 'demo', geminiModel: DEFAULT_GEMINI_MODEL });
const PRODUCTION_INDEX = path.join(__dirname, '..', 'dist', 'index.html');

function normaliseSettings(value) {
  const parsed = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    provider: parsed.provider === 'gemini' ? 'gemini' : 'demo',
    geminiModel:
      typeof parsed.geminiModel === 'string' && /^[a-z0-9][a-z0-9._-]{2,79}$/i.test(parsed.geminiModel)
        ? parsed.geminiModel
        : DEFAULT_GEMINI_MODEL,
    ...(typeof parsed.deviceKeyEncrypted === 'string' ? { deviceKeyEncrypted: parsed.deviceKeyEncrypted } : {}),
    ...(typeof parsed.geminiKeyEncrypted === 'string' ? { geminiKeyEncrypted: parsed.geminiKeyEncrypted } : {}),
  };
}

function readSettings() {
  try {
    if (!fs.existsSync(vault.settingsPath)) return { ...DEFAULT_SETTINGS };
    return normaliseSettings(JSON.parse(fs.readFileSync(vault.settingsPath, 'utf8')));
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
  vault.atomicWriteJson(vault.settingsPath, normaliseSettings(settings));
}

function currentSecureStorageStatus() {
  return secureStorageStatus(safeStorage, process.platform);
}

function ensureDeviceKey() {
  if (!currentSecureStorageStatus().available) return null;
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
  if (!settings.geminiKeyEncrypted || !currentSecureStorageStatus().available) return null;
  try {
    return safeStorage.decryptString(Buffer.from(settings.geminiKeyEncrypted, 'base64'));
  } catch {
    return null;
  }
}

async function saveAndTestGeminiKey(apiKey) {
  if (!currentSecureStorageStatus().available) {
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

function assertSessionId(value) {
  return assertUuid(assertString(value, 'Session ID', 36, 36), 'Session ID');
}

function isTrustedRendererUrl(url) {
  return trustedRendererUrl(url, {
    devUrl: process.env.VITE_DEV_SERVER_URL,
    productionFile: PRODUCTION_INDEX,
  });
}

function registerHandler(channel, handler) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, async (event, payload) => {
    const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || '';
    if (!isTrustedRendererUrl(senderUrl)) throw new Error('Blocked an untrusted application request.');
    return handler(payload, event);
  });
}

function mediaPermissionAllowed(permission, details = {}) {
  if (permission === 'audioCapture') return activeMediaPolicy.audio;
  if (permission === 'videoCapture') return activeMediaPolicy.video;
  if (permission !== 'media') return false;
  const mediaTypes = Array.isArray(details.mediaTypes) ? details.mediaTypes : [];
  if (mediaTypes.length === 0) return false;
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
  const devUrl = process.env.VITE_DEV_SERVER_URL;
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
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: Boolean(devUrl),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  mainWindow.on('closed', () => {
    activeMediaPolicy = { audio: false, video: false };
    mainWindow = null;
  });

  if (devUrl) mainWindow.loadURL(devUrl);
  else mainWindow.loadFile(PRODUCTION_INDEX);
}

async function cancelLessonsForLearner(learnerId, statusMessage) {
  for (const [sessionId, lesson] of [...activeLessons.entries()]) {
    if (lesson.learnerId !== learnerId) continue;
    try {
      await memoryStore.cancelSession(learnerId, sessionId, statusMessage);
    } finally {
      activeLessons.delete(sessionId);
    }
  }
}

function registerIpc() {
  registerHandler('app:status', async () => {
    const settings = readSettings();
    const storage = currentSecureStorageStatus();
    return {
      version: app.getVersion(),
      platform: process.platform,
      provider: settings.provider || 'demo',
      model: settings.geminiModel || DEFAULT_GEMINI_MODEL,
      hasGeminiKey: Boolean(settings.geminiKeyEncrypted),
      secureStorageAvailable: storage.available,
      secureStorageBackend: storage.backend,
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
    if (!currentSecureStorageStatus().available) {
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
  registerHandler('learner:memoryInbox', async (payload) => memoryStore.memoryInbox(assertLearnerId(payload?.learnerId), true));
  registerHandler('learner:memoryGraph', async (payload) => memoryStore.memoryGraph(assertLearnerId(payload?.learnerId)));
  registerHandler('learner:archiveMemory', async (payload) => {
    return memoryStore.archiveMemory(
      assertLearnerId(payload?.learnerId),
      assertUuid(assertString(payload?.memoryId, 'Memory ID', 36, 36), 'Memory ID'),
    );
  });
  registerHandler('learner:restoreMemory', async (payload) => {
    return memoryStore.restoreMemory(
      assertLearnerId(payload?.learnerId),
      assertUuid(assertString(payload?.memoryId, 'Memory ID', 36, 36), 'Memory ID'),
    );
  });

  registerHandler('learner:lock', async (payload) => {
    const learnerId = assertLearnerId(payload?.learnerId);
    await cancelLessonsForLearner(learnerId, 'The lesson was ended when the learner memory was locked.');
    memoryStore.close(learnerId);
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
    await cancelLessonsForLearner(learnerId, 'A new lesson replaced the previous unfinished lesson.');
    const dashboard = memoryStore.dashboard(learnerId);
    const objective = 'Practise addition within 20';
    const contextPacket = memoryStore.contextPacket(learnerId, objective);
    const { sessionId } = await memoryStore.startSession(learnerId, objective);
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
      contextPacket,
      firstMisconception: null,
      usedPersonalisedIntervention: false,
      processing: false,
    };
    activeLessons.set(sessionId, lesson);
    return {
      sessionId,
      question: lesson.currentQuestion,
      greeting: `Hello ${dashboard.profile.preferred_name}. Today we will practise addition in three short steps.`,
      memoryContextLoaded: contextPacket.relevantMemories.length,
    };
  });

  registerHandler('lesson:answer', async (payload) => {
    const sessionId = assertSessionId(payload?.sessionId);
    const lesson = activeLessons.get(sessionId);
    if (!lesson) throw new Error('Lesson session has ended or expired.');
    if (lesson.processing) throw new Error('MindCarry is already checking this answer.');
    lesson.processing = true;

    try {
      const rawAnswer = payload?.answer;
      if (typeof rawAnswer !== 'string' && typeof rawAnswer !== 'number') {
        throw new Error('Answer is invalid.');
      }
      const answer = assertString(String(rawAnswer), 'Answer', 1, 100);
      const reasoning = typeof payload?.reasoning === 'string' ? payload.reasoning.trim().slice(0, 500) : '';
      const responseMs = Math.max(0, Number(payload?.responseMs || Date.now() - lesson.startedQuestionAt));
      const assessment = assessAnswer(lesson.currentQuestion, answer, responseMs, Boolean(payload?.usedHint));
      if (!assessment.correct && !lesson.firstMisconception) lesson.firstMisconception = assessment.misconception;
      const intervention = chooseIntervention(assessment, { interests: lesson.dashboard.profile.interests });
      if (!assessment.correct) lesson.usedPersonalisedIntervention = intervention.type === 'visual-interest';

      lesson.evidence.push({
        correct: assessment.correct,
        independent: assessment.independent,
        usedHint: assessment.usedHint,
        explained: reasoning.length > 2,
        transfer: lesson.currentQuestion.representation === 'transfer',
      });

      let explanation = intervention.message;
      let providerName = 'deterministic';
      if (!assessment.correct) {
        try {
          const providerResponse = await getProvider().explain({
            age: lesson.dashboard.profile.age,
            interest: lesson.dashboard.profile.interests?.[0],
            question: lesson.currentQuestion.prompt,
            misconception: assessment.misconception,
            successfulStrategy: 'visual counting-on examples',
            memoryContext: lesson.contextPacket.providerText,
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
        reasoningObservation: reasoning || assessment.reasoningObservation,
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
    } finally {
      lesson.processing = false;
    }
  });

  registerHandler('lesson:cancel', async (payload) => {
    const sessionId = assertSessionId(payload?.sessionId);
    const lesson = activeLessons.get(sessionId);
    if (!lesson) return { ok: true };
    await memoryStore.cancelSession(lesson.learnerId, sessionId);
    activeLessons.delete(sessionId);
    activeMediaPolicy = { audio: false, video: false };
    return { ok: true };
  });
}

app.whenReady()
  .then(async () => {
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
  })
  .catch((error) => {
    dialog.showErrorBox('MindCarry could not start', error instanceof Error ? error.message : String(error));
    app.quit();
  });

app.on('before-quit', () => {
  activeMediaPolicy = { audio: false, video: false };
  activeLessons.clear();
  memoryStore?.closeAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});