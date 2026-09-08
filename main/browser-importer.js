const fs = require('fs');
const path = require('path');
const { exec, execFile, execSync, execFileSync } = require('child_process');

class BrowserImporter {
  constructor(profileStore, passwordStore) {
    this.profileStore = profileStore;
    this.passwordStore = passwordStore;
    this.autoWatcherInterval = null;
    this.watchedDir = null;
    this.knownCsvFiles = new Set();
  }

  getBrowserDefinitions() {
    const local = process.env.LOCALAPPDATA || '';
    const appdata = process.env.APPDATA || '';

    return [
      {
        id: 'chrome',
        name: 'Google Chrome',
        icon: 'Chrome',
        color: '#ea4335',
        userDataDir: path.join(local, 'Google', 'Chrome', 'User Data'),
        defaultProfileDir: path.join(local, 'Google', 'Chrome', 'User Data', 'Default'),
        type: 'chromium',
        passwordUrl: 'chrome://password-manager/settings',
        execName: 'chrome',
        features: {
          oneClickBookmarks: true,
          oneClickHistory: true,
          oneClickPasswords: false,
          hasAutoWatcher: true
        }
      },
      {
        id: 'firefox',
        name: 'Mozilla Firefox',
        icon: 'Flame',
        color: '#ff7139',
        userDataDir: path.join(appdata, 'Mozilla', 'Firefox'),
        profilesDir: path.join(appdata, 'Mozilla', 'Firefox', 'Profiles'),
        type: 'firefox',
        passwordUrl: 'about:logins',
        execName: 'firefox',
        features: {
          oneClickBookmarks: true,
          oneClickHistory: true,
          oneClickPasswords: true,
          hasAutoWatcher: false
        }
      },
      {
        id: 'edge',
        name: 'Microsoft Edge',
        icon: 'Compass',
        color: '#0078d4',
        userDataDir: path.join(local, 'Microsoft', 'Edge', 'User Data'),
        defaultProfileDir: path.join(local, 'Microsoft', 'Edge', 'User Data', 'Default'),
        type: 'chromium',
        passwordUrl: 'edge://settings/passwords',
        execName: 'msedge',
        features: {
          oneClickBookmarks: true,
          oneClickHistory: true,
          oneClickPasswords: false,
          hasAutoWatcher: true
        }
      },
      {
        id: 'opera',
        name: 'Opera',
        icon: 'Globe',
        color: '#ff1b2d',
        userDataDir: path.join(appdata, 'Opera Software', 'Opera Stable'),
        defaultProfileDir: path.join(appdata, 'Opera Software', 'Opera Stable'),
        type: 'chromium',
        passwordUrl: 'opera://settings/passwords',
        execName: 'opera',
        features: {
          oneClickBookmarks: true,
          oneClickHistory: true,
          oneClickPasswords: false,
          hasAutoWatcher: true
        }
      },
      {
        id: 'yandex',
        name: 'Яндекс Браузер',
        icon: 'Sparkles',
        color: '#ffcc00',
        userDataDir: path.join(local, 'Yandex', 'YandexBrowser', 'User Data'),
        defaultProfileDir: path.join(local, 'Yandex', 'YandexBrowser', 'User Data', 'Default'),
        type: 'chromium',
        passwordUrl: 'browser://passwords',
        execName: 'browser',
        features: {
          oneClickBookmarks: true,
          oneClickHistory: true,
          oneClickPasswords: false,
          hasAutoWatcher: true
        }
      },
      {
        id: 'brave',
        name: 'Brave Browser',
        icon: 'Shield',
        color: '#fb542b',
        userDataDir: path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data'),
        defaultProfileDir: path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default'),
        type: 'chromium',
        passwordUrl: 'brave://settings/passwords',
        execName: 'brave',
        features: {
          oneClickBookmarks: true,
          oneClickHistory: true,
          oneClickPasswords: false,
          hasAutoWatcher: true
        }
      }
    ];
  }

  detectInstalledBrowsers() {
    const defs = this.getBrowserDefinitions();
    const results = [];

    for (const def of defs) {
      const isInstalled = fs.existsSync(def.userDataDir);
      if (!isInstalled) continue;

      let passwordCount = 0;
      let bookmarkCount = 0;
      let historyCount = 0;
      let profileName = 'Default';
      let activeProfileDir = def.defaultProfileDir || '';

      if (def.type === 'chromium') {
        const profDir = def.defaultProfileDir;
        if (fs.existsSync(profDir)) {
          // 1. Check Bookmarks
          const bmPath = path.join(profDir, 'Bookmarks');
          if (fs.existsSync(bmPath)) {
            try {
              const bmData = JSON.parse(fs.readFileSync(bmPath, 'utf8'));
              bookmarkCount = this.countChromiumBookmarks(bmData);
            } catch (e) {}
          }

          // 2. Check Passwords (count from Login Data SQLite)
          const loginDataPath = path.join(profDir, 'Login Data');
          if (fs.existsSync(loginDataPath)) {
            passwordCount = this.estimateChromiumPasswords(loginDataPath);
          }

          // 3. Check History
          const historyPath = path.join(profDir, 'History');
          if (fs.existsSync(historyPath)) {
            historyCount = this.estimateChromiumHistory(historyPath);
          }
        }
      } else if (def.type === 'firefox') {
        if (fs.existsSync(def.profilesDir)) {
          try {
            const profiles = fs.readdirSync(def.profilesDir);
            let bestLogins = -1;
            for (const p of profiles) {
              const pPath = path.join(def.profilesDir, p);
              const loginsPath = path.join(pPath, 'logins.json');
              let pCount = 0;
              if (fs.existsSync(loginsPath)) {
                try {
                  const logData = JSON.parse(fs.readFileSync(loginsPath, 'utf8'));
                  pCount = (logData.logins || []).length;
                } catch (e) {}
              }

              // Prefer profile with greatest number of logins or ending in .default-release
              if (pCount > bestLogins || (pCount === bestLogins && p.includes('default-release'))) {
                bestLogins = pCount;
                passwordCount = pCount;
                profileName = p;
                activeProfileDir = pPath;
              }
            }

            if (activeProfileDir) {
              const placesPath = path.join(activeProfileDir, 'places.sqlite');
              if (fs.existsSync(placesPath)) {
                const counts = this.countFirefoxPlaces(placesPath);
                bookmarkCount = counts.bookmarks;
                historyCount = counts.history;
              }
            }
          } catch (e) {}
        }
      }

      results.push({
        id: def.id,
        name: def.name,
        icon: def.icon,
        color: def.color,
        type: def.type,
        isInstalled: true,
        profileName,
        profileDir: activeProfileDir,
        passwordCount,
        bookmarkCount,
        historyCount,
        passwordUrl: def.passwordUrl,
        features: def.features
      });
    }

    return results;
  }

  countChromiumBookmarks(bmData) {
    let count = 0;
    const walk = (children) => {
      if (!Array.isArray(children)) return;
      for (const item of children) {
        if (item.type === 'url') {
          count++;
        } else if (item.children) {
          walk(item.children);
        }
      }
    };

    if (bmData && bmData.roots) {
      if (bmData.roots.bookmark_bar) walk(bmData.roots.bookmark_bar.children);
      if (bmData.roots.other) walk(bmData.roots.other.children);
      if (bmData.roots.synced) walk(bmData.roots.synced.children);
    }
    return count;
  }

  countFirefoxPlaces(placesPath) {
    try {
      const tempDb = path.join(process.env.TEMP || '.', `apex_ff_count_${Date.now()}.sqlite`);
      fs.copyFileSync(placesPath, tempDb);
      const pyLines = [
        'import sqlite3',
        `c = sqlite3.connect(r'${tempDb}')`,
        'cur = c.cursor()',
        "cur.execute('SELECT count(*) FROM moz_bookmarks b JOIN moz_places p ON b.fk = p.id WHERE b.type = 1 AND p.url NOT LIKE \"place:%\"')",
        'b = cur.fetchone()[0]',
        "cur.execute('SELECT count(*) FROM moz_places WHERE visit_count > 0 AND url NOT LIKE \"place:%\"')",
        'h = cur.fetchone()[0]',
        'c.close()',
        'print(f\"{b},{h}\")'
      ].join('\n');
      const out = execFileSync('python', ['-c', pyLines], { encoding: 'utf8', timeout: 4000 }).trim();
      try { fs.unlinkSync(tempDb); } catch (e) {}
      const [bm, hist] = out.split(',').map(n => parseInt(n, 10) || 0);
      return { bookmarks: bm, history: hist };
    } catch (e) {
      return { bookmarks: 0, history: 0 };
    }
  }

  estimateChromiumPasswords(loginDataPath) {
    try {
      const tempDb = path.join(process.env.TEMP || '.', `apex_tmp_${Date.now()}.db`);
      fs.copyFileSync(loginDataPath, tempDb);
      const pyCode = `import sqlite3; c = sqlite3.connect(r'${tempDb}'); cur = c.cursor(); cur.execute('SELECT count(*) FROM logins WHERE password_value IS NOT NULL AND length(password_value) > 0'); print(cur.fetchone()[0]); c.close()`;
      const out = execSync(`python -c "${pyCode}"`, { encoding: 'utf8', timeout: 3000 }).trim();
      try { fs.unlinkSync(tempDb); } catch (e) {}
      return parseInt(out, 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  estimateChromiumHistory(historyPath) {
    try {
      const stats = fs.statSync(historyPath);
      return Math.max(10, Math.round(stats.size / 2048));
    } catch (e) {
      return 0;
    }
  }

  // 1. Direct Passwords Import (1-Click for Firefox, or manual CSV)
  async importPasswords(browserId) {
    const detected = this.detectInstalledBrowsers();
    const browser = detected.find(b => b.id === browserId);
    if (!browser) return { success: false, message: 'Браузер не найден', count: 0 };

    if (browser.type === 'firefox') {
      const profileDir = browser.profileDir;
      if (!profileDir || !fs.existsSync(profileDir)) {
        return { success: false, message: 'Профиль Firefox не найден', count: 0 };
      }

      const scriptPath = path.join(__dirname, 'firefox-decrypt.py');
      if (!fs.existsSync(scriptPath)) {
        return { success: false, message: 'Модуль дешифрования firefox-decrypt.py не найден', count: 0 };
      }

      return new Promise((resolve) => {
        execFile('python', [scriptPath, profileDir], { encoding: 'utf8', timeout: 15000 }, (err, stdout, stderr) => {
          if (err) {
            return resolve({ success: false, message: 'Ошибка дешифрования: ' + err.message, count: 0 });
          }

          try {
            const data = JSON.parse(stdout);
            if (!data.success) {
              return resolve({ success: false, message: data.error || 'Не удалось расшифровать пароли', count: 0 });
            }

            let imported = 0;
            const logins = data.logins || [];
            for (const item of logins) {
              if (item.url && (item.username || item.password)) {
                this.passwordStore.add({
                  name: item.url.replace(/^https?:\/\//, '').split('/')[0] || item.url,
                  url: item.url,
                  username: item.username || '',
                  password: item.password || '',
                  note: 'Импортировано из Mozilla Firefox'
                });
                imported++;
              }
            }

            resolve({
              success: true,
              count: imported,
              message: `Успешно перенесено ${imported} паролей из Mozilla Firefox в 1 клик!`
            });
          } catch (parseErr) {
            resolve({ success: false, message: 'Ошибка чтения результатов: ' + parseErr.message, count: 0 });
          }
        });
      });
    }

    return {
      success: false,
      message: 'Для данного браузера требуется экспорт через авто-ассистент',
      count: 0
    };
  }

  // 2. Direct Bookmarks Import from Selected Browser
  importBookmarks(browserId) {
    const detected = this.detectInstalledBrowsers();
    const browser = detected.find(b => b.id === browserId);
    if (!browser) return { success: false, message: 'Браузер не найден', count: 0 };

    let importedCount = 0;

    if (browser.type === 'chromium') {
      const bmPath = path.join(browser.profileDir, 'Bookmarks');
      if (!fs.existsSync(bmPath)) {
        return { success: false, message: 'Файл закладок не найден', count: 0 };
      }

      try {
        const bmData = JSON.parse(fs.readFileSync(bmPath, 'utf8'));
        const extracted = [];

        const walk = (children) => {
          if (!Array.isArray(children)) return;
          for (const item of children) {
            if (item.type === 'url' && item.url) {
              extracted.push({
                title: item.name || item.url,
                url: item.url,
                favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.url)}&sz=32`
              });
            } else if (item.children) {
              walk(item.children);
            }
          }
        };

        if (bmData && bmData.roots) {
          if (bmData.roots.bookmark_bar) walk(bmData.roots.bookmark_bar.children);
          if (bmData.roots.other) walk(bmData.roots.other.children);
          if (bmData.roots.synced) walk(bmData.roots.synced.children);
        }

        for (const item of extracted) {
          this.profileStore.addBookmark(item);
          importedCount++;
        }

        return {
          success: true,
          count: importedCount,
          message: `Успешно импортировано закладок: ${importedCount}`
        };
      } catch (err) {
        return { success: false, message: err.message, count: 0 };
      }
    } else if (browser.type === 'firefox') {
      const placesPath = path.join(browser.profileDir, 'places.sqlite');
      if (!fs.existsSync(placesPath)) {
        return { success: false, message: 'Файл places.sqlite не найден', count: 0 };
      }

      try {
        const tempDb = path.join(process.env.TEMP || '.', `apex_ff_bm_${Date.now()}.sqlite`);
        fs.copyFileSync(placesPath, tempDb);
        const pyLines = [
          'import sqlite3, json',
          `c = sqlite3.connect(r'${tempDb}')`,
          'cur = c.cursor()',
          'cur.execute("SELECT b.title, p.url FROM moz_bookmarks b JOIN moz_places p ON b.fk = p.id WHERE b.type = 1 AND p.url IS NOT NULL AND p.url NOT LIKE \'place:%\' AND length(p.url) > 0")',
          "rows = [{'title': r[0] or r[1], 'url': r[1]} for r in cur.fetchall()]",
          'c.close()',
          'print(json.dumps(rows))'
        ].join('\n');
        const out = execFileSync('python', ['-c', pyLines], { encoding: 'utf8', timeout: 5000 }).trim();
        try { fs.unlinkSync(tempDb); } catch (e) {}

        const entries = JSON.parse(out);
        for (const item of entries) {
          this.profileStore.addBookmark({
            title: item.title,
            url: item.url,
            favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.url)}&sz=32`
          });
          importedCount++;
        }

        return {
          success: true,
          count: importedCount,
          message: `Успешно импортировано закладок из Firefox: ${importedCount}`
        };
      } catch (err) {
        return { success: false, message: err.message, count: 0 };
      }
    }

    return { success: false, message: 'Импорт закладок для данного браузера не поддерживается', count: 0 };
  }

  // 3. Direct History Import from Selected Browser
  importHistory(browserId, limit = 200) {
    const detected = this.detectInstalledBrowsers();
    const browser = detected.find(b => b.id === browserId);
    if (!browser) return { success: false, message: 'Браузер не найден', count: 0 };

    let count = 0;

    if (browser.type === 'chromium') {
      const histPath = path.join(browser.profileDir, 'History');
      if (!fs.existsSync(histPath)) {
        return { success: false, message: 'Файл истории не найден', count: 0 };
      }

      try {
        const tempDb = path.join(process.env.TEMP || '.', `apex_hist_${Date.now()}.db`);
        fs.copyFileSync(histPath, tempDb);

        const pyLines = [
          'import sqlite3, json',
          `c = sqlite3.connect(r'${tempDb}')`,
          'cur = c.cursor()',
          `cur.execute("SELECT url, title, last_visit_time FROM urls WHERE url IS NOT NULL ORDER BY last_visit_time DESC LIMIT ${limit}")`,
          "rows = [{'url': r[0], 'title': r[1] or r[0]} for r in cur.fetchall()]",
          'c.close()',
          'print(json.dumps(rows))'
        ].join('\n');
        const out = execFileSync('python', ['-c', pyLines], { encoding: 'utf8', timeout: 5000 }).trim();
        try { fs.unlinkSync(tempDb); } catch (e) {}

        const entries = JSON.parse(out);
        for (const entry of entries) {
          this.profileStore.addHistory({ url: entry.url, title: entry.title });
          count++;
        }

        return {
          success: true,
          count,
          message: `Успешно импортировано записей истории: ${count}`
        };
      } catch (err) {
        return { success: false, message: err.message, count: 0 };
      }
    } else if (browser.type === 'firefox') {
      const placesPath = path.join(browser.profileDir, 'places.sqlite');
      if (!fs.existsSync(placesPath)) {
        return { success: false, message: 'Файл истории Firefox не найден', count: 0 };
      }

      try {
        const tempDb = path.join(process.env.TEMP || '.', `apex_ff_hist_${Date.now()}.sqlite`);
        fs.copyFileSync(placesPath, tempDb);
        const pyLines = [
          'import sqlite3, json',
          `c = sqlite3.connect(r'${tempDb}')`,
          'cur = c.cursor()',
          `cur.execute("SELECT url, title FROM moz_places WHERE visit_count > 0 AND url IS NOT NULL AND url NOT LIKE 'place:%' ORDER BY last_visit_date DESC LIMIT ${limit}")`,
          "rows = [{'url': r[0], 'title': r[1] or r[0]} for r in cur.fetchall()]",
          'c.close()',
          'print(json.dumps(rows))'
        ].join('\n');
        const out = execFileSync('python', ['-c', pyLines], { encoding: 'utf8', timeout: 5000 }).trim();
        try { fs.unlinkSync(tempDb); } catch (e) {}

        const entries = JSON.parse(out);
        for (const entry of entries) {
          this.profileStore.addHistory({ url: entry.url, title: entry.title });
          count++;
        }

        return {
          success: true,
          count,
          message: `Успешно импортировано записей истории Firefox: ${count}`
        };
      } catch (err) {
        return { success: false, message: err.message, count: 0 };
      }
    }

    return { success: false, message: 'Импорт истории для данного браузера не поддерживается', count: 0 };
  }

  // 4. Open Browser Passwords Export Page directly
  openBrowserPasswordsPage(browserId) {
    const def = this.getBrowserDefinitions().find(b => b.id === browserId);
    if (!def) return { success: false, message: 'Браузер не найден' };

    try {
      if (process.platform === 'win32') {
        exec(`cmd /c start ${def.execName} "${def.passwordUrl}"`, (err) => {
          if (err) {
            console.error('Failed to open browser passwords page:', err);
          }
        });
      }
      return { success: true, message: `Открыта страница настроек экспорта в ${def.name}` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  // 5. Scan Downloads folder for password CSV file and optionally delete plaintext file
  scanDownloadsForPasswords(deleteAfterImport = false) {
    const downloadsDir = path.join(process.env.USERPROFILE || '', 'Downloads');
    if (!fs.existsSync(downloadsDir)) {
      return { success: false, message: 'Папка Загрузки не найдена', count: 0 };
    }

    try {
      const files = fs.readdirSync(downloadsDir);
      const csvFiles = files
        .filter(f => f.toLowerCase().endsWith('.csv'))
        .map(f => {
          const fullPath = path.join(downloadsDir, f);
          try {
            const stat = fs.statSync(fullPath);
            return { name: f, path: fullPath, mtime: stat.mtimeMs };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => b.mtime - a.mtime);

      if (csvFiles.length === 0) {
        return { success: false, message: 'В папке Загрузки пока нет файлов .csv', count: 0 };
      }

      for (const file of csvFiles.slice(0, 5)) {
        try {
          const content = fs.readFileSync(file.path, 'utf8');
          const lower = content.toLowerCase();
          if (
            (lower.includes('url') || lower.includes('hostname')) &&
            (lower.includes('username') || lower.includes('login')) &&
            (lower.includes('password'))
          ) {
            const res = this.passwordStore.importFromCsv(content);
            if (res.success && res.count > 0) {
              // Securely clean up plaintext CSV from Downloads to protect user privacy
              if (deleteAfterImport) {
                try { fs.unlinkSync(file.path); } catch (delErr) {}
              }

              return {
                success: true,
                filename: file.name,
                count: res.count,
                message: `Успешно перехвачено и импортировано ${res.count} паролей из "${file.name}"!`
              };
            }
          }
        } catch (readErr) {}
      }

      return { success: false, message: 'Файлы .csv в Загрузках не содержат структуры паролей', count: 0 };
    } catch (err) {
      return { success: false, message: err.message, count: 0 };
    }
  }

  // 6. Realtime Live Watcher for Chrome/Edge downloads
  startAutoWatcher(onDetected) {
    this.stopAutoWatcher();

    const downloadsDir = path.join(process.env.USERPROFILE || '', 'Downloads');
    if (!fs.existsSync(downloadsDir)) return;

    // Snapshot existing CSVs so we only trigger on fresh exports
    try {
      const existing = fs.readdirSync(downloadsDir).filter(f => f.toLowerCase().endsWith('.csv'));
      this.knownCsvFiles = new Set(existing);
    } catch (e) {
      this.knownCsvFiles = new Set();
    }

    let elapsed = 0;
    this.autoWatcherInterval = setInterval(() => {
      elapsed += 500;
      // Timeout watcher after 3 minutes
      if (elapsed > 180000) {
        this.stopAutoWatcher();
        return;
      }

      try {
        const files = fs.readdirSync(downloadsDir).filter(f => f.toLowerCase().endsWith('.csv'));
        const newFiles = files.filter(f => !this.knownCsvFiles.has(f));

        if (newFiles.length > 0) {
          const res = this.scanDownloadsForPasswords(true);
          if (res.success && res.count > 0) {
            this.stopAutoWatcher();
            if (typeof onDetected === 'function') {
              onDetected(res);
            }
          }
        }
      } catch (err) {}
    }, 500);
  }

  stopAutoWatcher() {
    if (this.autoWatcherInterval) {
      clearInterval(this.autoWatcherInterval);
      this.autoWatcherInterval = null;
    }
  }
}

module.exports = BrowserImporter;
