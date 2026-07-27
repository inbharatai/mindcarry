const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('mindcarry', {
  app: {
    status: () => invoke('app:status'),
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
    lock: (learnerId) => invoke('learner:lock', { learnerId }),
    export: (learnerId) => invoke('learner:export', { learnerId }),
    import: () => invoke('learner:import'),
  },
  lessons: {
    start: (learnerId) => invoke('lesson:start', { learnerId }),
    answer: (payload) => invoke('lesson:answer', payload),
  },
});
