const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  openDevTools: () => ipcRenderer.invoke('window:openDevTools'),
  onMaximizedChange: (callback) => {
    const handler = (event, isMax) => callback(isMax);
    ipcRenderer.on('window:maximized-change', handler);
    return () => ipcRenderer.removeListener('window:maximized-change', handler);
  },

  // Theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (theme) => ipcRenderer.invoke('theme:set', theme)
  },

  // Profiles
  profiles: {
    getAll: () => ipcRenderer.invoke('profile:getAll'),
    getActive: () => ipcRenderer.invoke('profile:getActive'),
    setActive: (id) => ipcRenderer.invoke('profile:setActive', id),
    create: (data) => ipcRenderer.invoke('profile:create', data),
    update: (id, updates) => ipcRenderer.invoke('profile:update', { id, updates }),
    clone: (id, newName) => ipcRenderer.invoke('profile:clone', { id, newName }),
    delete: (id) => ipcRenderer.invoke('profile:delete', id),
    clearData: (id) => ipcRenderer.invoke('profile:clearData', id)
  },

  // State (Tabs, Spaces, Settings)
  state: {
    get: () => ipcRenderer.invoke('state:get'),
    save: (data) => ipcRenderer.invoke('state:save', data)
  },

  // Bookmarks
  bookmarks: {
    getAll: () => ipcRenderer.invoke('bookmarks:get'),
    add: (bm) => ipcRenderer.invoke('bookmarks:add', bm),
    delete: (id) => ipcRenderer.invoke('bookmarks:delete', id),
    importHtml: (htmlContent) => ipcRenderer.invoke('bookmarks:importHtml', htmlContent),
    pickAndImportHtml: () => ipcRenderer.invoke('bookmarks:pickAndImportHtml')
  },

  // History
  history: {
    getAll: () => ipcRenderer.invoke('history:get'),
    add: (item) => ipcRenderer.invoke('history:add', item),
    search: (query, limit) => ipcRenderer.invoke('history:search', query, limit),
    clear: (profileId) => ipcRenderer.invoke('history:clear', profileId)
  },

  // Notes (Easel / Scratchpad)
  notes: {
    get: () => ipcRenderer.invoke('notes:get'),
    save: (content) => ipcRenderer.invoke('notes:save', content)
  },

  // Passwords & Migration
  passwords: {
    getAll: () => ipcRenderer.invoke('passwords:getAll'),
    getByUrl: (url) => ipcRenderer.invoke('passwords:getByUrl', url),
    add: (data) => ipcRenderer.invoke('passwords:add', data),
    update: (id, data) => ipcRenderer.invoke('passwords:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('passwords:delete', id),
    importCsv: (csvContent, profileId) => ipcRenderer.invoke('passwords:importCsv', { csvContent, profileId }),
    exportCsv: () => ipcRenderer.invoke('passwords:exportCsv'),
    pickAndImportCsv: (profileId) => ipcRenderer.invoke('passwords:pickAndImportCsv', profileId)
  },

  // Browser Importer & Migration Wizard
  importer: {
    detect: () => ipcRenderer.invoke('importer:detect'),
    importPasswords: (browserId) => ipcRenderer.invoke('importer:importPasswords', browserId),
    importBookmarks: (browserId) => ipcRenderer.invoke('importer:importBookmarks', browserId),
    importHistory: (browserId) => ipcRenderer.invoke('importer:importHistory', browserId),
    openPasswordsPage: (browserId) => ipcRenderer.invoke('importer:openPasswordsPage', browserId),
    scanDownloads: (deleteAfterImport) => ipcRenderer.invoke('importer:scanDownloads', deleteAfterImport),
    startAutoWatcher: () => ipcRenderer.invoke('importer:startAutoWatcher'),
    stopAutoWatcher: () => ipcRenderer.invoke('importer:stopAutoWatcher'),
    onAutoWatcherSuccess: (cb) => {
      const h = (e, res) => cb(res);
      ipcRenderer.on('importer:autoWatcherSuccess', h);
      return () => ipcRenderer.removeListener('importer:autoWatcherSuccess', h);
    }
  },

  // GitHub Auto-Updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: (downloadUrl) => ipcRenderer.invoke('updater:download', downloadUrl),
    install: (filePath) => ipcRenderer.invoke('updater:install', filePath),
    onProgress: (cb) => {
      const h = (e, progress) => cb(progress);
      ipcRenderer.on('updater:progress', h);
      return () => ipcRenderer.removeListener('updater:progress', h);
    }
  },

  // AdBlocker
  adblock: {
    getStats: () => ipcRenderer.invoke('adblock:getStats'),
    toggle: (enabled) => ipcRenderer.invoke('adblock:toggle', enabled)
  },

  // Omnibox suggestions
  search: {
    getSuggestions: (query, engine) => ipcRenderer.invoke('search:suggestions', { query, engine })
  },

  // Reader Mode
  reader: {
    getScript: () => ipcRenderer.invoke('reader:getScript')
  },

  // Downloads
  downloads: {
    getAll: () => ipcRenderer.invoke('downloads:getAll'),
    pause: (id) => ipcRenderer.invoke('downloads:pause', id),
    resume: (id) => ipcRenderer.invoke('downloads:resume', id),
    cancel: (id) => ipcRenderer.invoke('downloads:cancel', id),
    open: (id) => ipcRenderer.invoke('downloads:open', id),
    showInFolder: (id) => ipcRenderer.invoke('downloads:showInFolder', id),
    onStarted: (cb) => {
      const h = (e, item) => cb(item);
      ipcRenderer.on('download:started', h);
      return () => ipcRenderer.removeListener('download:started', h);
    },
    onUpdated: (cb) => {
      const h = (e, item) => cb(item);
      ipcRenderer.on('download:updated', h);
      return () => ipcRenderer.removeListener('download:updated', h);
    },
    onDone: (cb) => {
      const h = (e, item) => cb(item);
      ipcRenderer.on('download:done', h);
      return () => ipcRenderer.removeListener('download:done', h);
    }
  }
});
