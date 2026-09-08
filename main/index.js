const { app, BrowserWindow, ipcMain, session, shell, nativeTheme, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const ProfileStore = require('./profile-store');
const PasswordStore = require('./password-store');
const BrowserImporter = require('./browser-importer');
const adBlocker = require('./adblocker');
const downloadManager = require('./downloader');
const proxyManager = require('./proxy-manager');
const { getSearchSuggestions } = require('./search-suggestions');
const { generateReaderExtractionScript } = require('./reader');

// Enforce Dark Theme across Electron and all Chromium WebViews
nativeTheme.themeSource = 'dark';

let mainWindow = null;
const profileStore = new ProfileStore();
const passwordStore = new PasswordStore();
const browserImporter = new BrowserImporter(profileStore, passwordStore);
const GitHubUpdater = require('./github-updater');
const gitHubUpdater = new GitHubUpdater();

async function setDarkThemeCookies(sess) {
  if (!sess || !sess.cookies) return;
  try {
    // YouTube dark theme cookie (f6=400 enables dark mode)
    await sess.cookies.set({
      url: 'https://www.youtube.com',
      name: 'PREF',
      value: 'f6=400',
      domain: '.youtube.com',
      path: '/'
    });
  } catch (e) {}
}

function initializeSession(sess, profile) {
  if (!sess) return;
  adBlocker.attachToSession(sess);
  downloadManager.attachToSession(sess, mainWindow);
  setDarkThemeCookies(sess);
  if (profile) {
    proxyManager.applyProxyToSession(sess, profile);
  }
}

function setupAllProfileSessions() {
  const profiles = profileStore.getAllProfiles();
  profiles.forEach(p => {
    const sess = session.fromPartition(p.partition);
    initializeSession(sess, p);
  });
  // Also default session
  initializeSession(session.defaultSession, profileStore.getActiveProfile());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f172a', // slate-900
    title: 'Apex Browser',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Track maximize state
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-change', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-change', false);
  });

  // Handle external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'allow' };
  });

  setupAllProfileSessions();

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(err => {
      console.log('Vite server starting, retrying in 1s...', err.message);
      setTimeout(() => mainWindow.loadURL(devUrl), 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    proxyManager.setupAuthHandler(app);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==================== IPC HANDLERS ====================

// Window controls
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow.maximize();
    return true;
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('window:openDevTools', () => {
  if (mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' });
});

// Theme API
ipcMain.handle('theme:get', () => {
  return nativeTheme.themeSource;
});

ipcMain.handle('theme:set', (event, theme) => {
  nativeTheme.themeSource = theme || 'dark';
  return nativeTheme.themeSource;
});

// Profiles API
ipcMain.handle('profile:getAll', () => {
  return profileStore.getAllProfiles();
});

ipcMain.handle('profile:getActive', () => {
  return profileStore.getActiveProfile();
});

ipcMain.handle('profile:setActive', (event, id) => {
  const ok = profileStore.setActiveProfile(id);
  if (ok) {
    const profile = profileStore.getActiveProfile();
    const sess = session.fromPartition(profile.partition);
    initializeSession(sess, profile);
  }
  return ok;
});

ipcMain.handle('profile:create', (event, data) => {
  const newProfile = profileStore.createProfile(data);
  const sess = session.fromPartition(newProfile.partition);
  initializeSession(sess, newProfile);
  return newProfile;
});

ipcMain.handle('profile:update', (event, { id, updates }) => {
  const updated = profileStore.updateProfile(id, updates);
  if (updated) {
    const sess = session.fromPartition(updated.partition);
    initializeSession(sess, updated);
  }
  return updated;
});

ipcMain.handle('profile:clone', (event, { id, newName }) => {
  const cloned = profileStore.cloneProfile(id, newName);
  if (cloned) {
    const sess = session.fromPartition(cloned.partition);
    initializeSession(sess, cloned);
  }
  return cloned;
});

ipcMain.handle('profile:delete', (event, id) => {
  return profileStore.deleteProfile(id);
});

ipcMain.handle('profile:clearData', async (event, id) => {
  const profiles = profileStore.getAllProfiles();
  const target = profiles.find(p => p.id === id);
  if (!target) return false;
  const sess = session.fromPartition(target.partition);
  await sess.clearStorageData();
  await sess.clearCache();
  return true;
});

// State, Spaces, Tabs
ipcMain.handle('state:get', () => {
  return profileStore.getState();
});

ipcMain.handle('state:save', (event, state) => {
  return profileStore.saveState(state);
});

// Bookmarks
ipcMain.handle('bookmarks:get', () => {
  return profileStore.getBookmarks();
});

ipcMain.handle('bookmarks:add', (event, bm) => {
  return profileStore.addBookmark(bm);
});

ipcMain.handle('bookmarks:delete', (event, id) => {
  return profileStore.deleteBookmark(id);
});

// History
ipcMain.handle('history:get', () => {
  return profileStore.getHistory();
});

ipcMain.handle('history:add', (event, item) => {
  return profileStore.addHistory(item);
});

ipcMain.handle('history:clear', (event, profileId) => {
  return profileStore.clearHistory(profileId);
});

// Notes (Easel / Scratchpad)
ipcMain.handle('notes:get', () => {
  return profileStore.getNotes();
});

ipcMain.handle('notes:save', (event, content) => {
  return profileStore.saveNotes(content);
});

// AdBlocker
ipcMain.handle('adblock:getStats', () => {
  return adBlocker.getStats();
});

ipcMain.handle('adblock:toggle', (event, enabled) => {
  return adBlocker.setEnabled(enabled);
});

// Omnibox search suggestions
ipcMain.handle('search:suggestions', async (event, { query, engine }) => {
  return await getSearchSuggestions(query, engine);
});

// Reader Mode
ipcMain.handle('reader:getScript', () => {
  return generateReaderExtractionScript();
});

// Downloads
ipcMain.handle('downloads:getAll', () => {
  return downloadManager.getAll();
});

ipcMain.handle('downloads:pause', (event, id) => {
  return downloadManager.pause(id);
});

ipcMain.handle('downloads:resume', (event, id) => {
  return downloadManager.resume(id);
});

ipcMain.handle('downloads:cancel', (event, id) => {
  return downloadManager.cancel(id);
});

ipcMain.handle('downloads:open', (event, id) => {
  return downloadManager.openFile(id);
});

ipcMain.handle('downloads:showInFolder', (event, id) => {
  return downloadManager.showInFolder(id);
});

// Passwords API
ipcMain.handle('passwords:getAll', () => {
  return passwordStore.getAll();
});

ipcMain.handle('passwords:getByUrl', (event, url) => {
  return passwordStore.getByUrl(url);
});

ipcMain.handle('passwords:add', (event, data) => {
  return passwordStore.add(data);
});

ipcMain.handle('passwords:update', (event, { id, data }) => {
  return passwordStore.update(id, data);
});

ipcMain.handle('passwords:delete', (event, id) => {
  return passwordStore.delete(id);
});

ipcMain.handle('passwords:importCsv', (event, { csvContent, profileId }) => {
  return passwordStore.importFromCsv(csvContent, profileId);
});

ipcMain.handle('passwords:exportCsv', () => {
  return passwordStore.exportToCsv();
});

ipcMain.handle('passwords:pickAndImportCsv', async (event, profileId) => {
  if (!mainWindow) return { success: false, message: 'Окно не найдено' };
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите CSV-файл паролей из Chrome, Edge или Firefox',
    filters: [
      { name: 'CSV файлы паролей (*.csv)', extensions: ['csv'] },
      { name: 'Все файлы (*.*)', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
    return { canceled: true };
  }

  try {
    const filePath = res.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    const importRes = passwordStore.importFromCsv(content, profileId);
    return {
      ...importRes,
      filePath: path.basename(filePath)
    };
  } catch (err) {
    return { success: false, message: 'Ошибка чтения файла: ' + err.message };
  }
});

// Browser Migration & Import Wizard API
ipcMain.handle('importer:detect', () => {
  return browserImporter.detectInstalledBrowsers();
});

ipcMain.handle('importer:importPasswords', (event, browserId) => {
  return browserImporter.importPasswords(browserId);
});

ipcMain.handle('importer:importBookmarks', (event, browserId) => {
  return browserImporter.importBookmarks(browserId);
});

ipcMain.handle('importer:importHistory', (event, browserId) => {
  return browserImporter.importHistory(browserId);
});

ipcMain.handle('importer:openPasswordsPage', (event, browserId) => {
  return browserImporter.openBrowserPasswordsPage(browserId);
});

ipcMain.handle('importer:scanDownloads', (event, deleteAfterImport) => {
  return browserImporter.scanDownloadsForPasswords(deleteAfterImport);
});

ipcMain.handle('importer:startAutoWatcher', () => {
  browserImporter.startAutoWatcher((res) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('importer:autoWatcherSuccess', res);
    }
  });
  return { success: true };
});

ipcMain.handle('importer:stopAutoWatcher', () => {
  browserImporter.stopAutoWatcher();
  return { success: true };
});

// GitHub Releases Auto-Updater API
ipcMain.handle('updater:check', async () => {
  return await gitHubUpdater.checkForUpdates();
});

ipcMain.handle('updater:download', async (event, downloadUrl) => {
  return await gitHubUpdater.downloadUpdate(downloadUrl, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:progress', progress);
    }
  });
});

ipcMain.handle('updater:install', (event, filePath) => {
  return gitHubUpdater.installAndRestart(filePath);
});


