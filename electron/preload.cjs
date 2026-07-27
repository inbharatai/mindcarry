const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('mindcarry', {
  app: {
    status: () => invoke('app:status'),
    openDataFolder: () => invoke('app:openDataFolder'),
  },
  settings: {
    setGeminiKey: (apiKey) => invoke('settings:setGeminiKey', { apiKey }),
    removeGeminiKey: () => invoke('settings:removeGeminiKey'),
    testProvider: () => invoke('settings:testProvider'),
  },
  learners: {
    list: () => invoke('learner:list'),
    create: (payload) => invoke('learner:create', payload),
    unlock: (learnerId, passphrase) => invoke('learner:unlock', { learnerId, passphrase }),
    dashboard: (learnerId) => invoke('learner:dashboard', { learnerId }),
    memoryInbox: (learnerId) => invoke('learner:memoryInbox', { learnerId }),
    memoryGraph: (learnerId) => invoke('learner:memoryGraph', { learnerId }),
    archiveMemory: (learnerId, memoryId) => invoke('learner:archiveMemory', { learnerId, memoryId }),
    restoreMemory: (learnerId, memoryId) => invoke('learner:restoreMemory', { learnerId, memoryId }),
    lock: (learnerId) => invoke('learner:lock', { learnerId }),
    export: (learnerId) => invoke('learner:export', { learnerId }),
    import: () => invoke('learner:import'),
  },
  lessons: {
    start: (learnerId) => invoke('lesson:start', { learnerId }),
    answer: (payload) => invoke('lesson:answer', payload),
    cancel: (sessionId) => invoke('lesson:cancel', { sessionId }),
  },
});