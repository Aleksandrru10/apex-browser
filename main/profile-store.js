const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ProfileStore {
  constructor(customStorageDir = null) {
    this.storageDir = customStorageDir || (app ? app.getPath('userData') : path.join(__dirname, '..', '.data'));
    if (!fs.existsSync(this.storageDir)) {
      try { fs.mkdirSync(this.storageDir, { recursive: true }); } catch (e) {}
    }
    this.profilesFile = path.join(this.storageDir, 'profiles.json');
    this.stateFile = path.join(this.storageDir, 'browser_state.json');
    this.historyFile = path.join(this.storageDir, 'history.json');
    this.bookmarksFile = path.join(this.storageDir, 'bookmarks.json');
    this.notesFile = path.join(this.storageDir, 'notes.json');
    
    this.init();
  }

  init() {
    if (!fs.existsSync(this.profilesFile)) {
      const defaultProfiles = [
        {
          id: 'profile_default',
          name: 'Основной',
          avatar: '🌐',
          color: '#3b82f6',
          partition: 'persist:profile_default',
          proxy: { enabled: false, type: 'http', host: '', port: 8080, username: '', password: '' },
          userAgent: '',
          createdAt: Date.now()
        },
        {
          id: 'profile_work',
          name: 'Работа / Офис',
          avatar: '💼',
          color: '#8b5cf6',
          partition: 'persist:profile_work',
          proxy: { enabled: false, type: 'http', host: '', port: 8080, username: '', password: '' },
          userAgent: '',
          createdAt: Date.now()
        },
        {
          id: 'profile_stealth',
          name: 'Приватный / Stealth',
          avatar: '🕵️',
          color: '#10b981',
          partition: 'persist:profile_stealth',
          proxy: { enabled: false, type: 'socks5', host: '', port: 1080, username: '', password: '' },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          createdAt: Date.now()
        }
      ];
      this.saveJson(this.profilesFile, { activeProfileId: 'profile_default', profiles: defaultProfiles });
    }

    if (!fs.existsSync(this.stateFile)) {
      const defaultState = {
        spaces: [
          { id: 'space_general', name: 'Общее', icon: 'Sparkles', color: '#3b82f6', profileId: 'profile_default' },
          { id: 'space_dev', name: 'Разработка', icon: 'Code', color: '#10b981', profileId: 'profile_work' },
          { id: 'space_media', name: 'Медиа & Чтение', icon: 'BookOpen', color: '#ec4899', profileId: 'profile_default' }
        ],
        activeSpaceId: 'space_general',
        pinnedTabs: [
          { id: 'pin_google', title: 'Google', url: 'https://www.google.com', favicon: 'https://www.google.com/favicon.ico' },
          { id: 'pin_github', title: 'GitHub', url: 'https://github.com', favicon: 'https://github.githubassets.com/favicons/favicon.svg' },
          { id: 'pin_yt', title: 'YouTube', url: 'https://www.youtube.com', favicon: 'https://www.youtube.com/s/desktop/favicon.ico' }
        ],
        settings: {
          searchEngine: 'google',
          adblockEnabled: true,
          dntEnabled: true,
          splitScreenMode: false,
          sleepingTabsEnabled: true,
          sleepingTimeoutMinutes: 15,
          theme: 'dark'
        }
      };
      this.saveJson(this.stateFile, defaultState);
    }

    if (!fs.existsSync(this.bookmarksFile)) {
      this.saveJson(this.bookmarksFile, [
        { id: 'bm_1', title: 'Google Search', url: 'https://www.google.com', dateAdded: Date.now() },
        { id: 'bm_2', title: 'GitHub Code', url: 'https://github.com', dateAdded: Date.now() },
        { id: 'bm_3', title: 'DuckDuckGo Privacy', url: 'https://duckduckgo.com', dateAdded: Date.now() }
      ]);
    }

    if (!fs.existsSync(this.historyFile)) {
      this.saveJson(this.historyFile, []);
    }

    if (!fs.existsSync(this.notesFile)) {
      this.saveJson(this.notesFile, {
        content: '# Быстрые заметки Apex\n\nЗдесь можно сохранять ссылки, цитаты, фрагменты кода и мысли во время серфинга.'
      });
    }
  }

  loadJson(filePath, defaultValue) {
    try {
      if (!fs.existsSync(filePath)) return defaultValue;
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading JSON from', filePath, err);
      return defaultValue;
    }
  }

  saveJson(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error writing JSON to', filePath, err);
      return false;
    }
  }

  // Profiles
  getProfilesData() {
    return this.loadJson(this.profilesFile, { activeProfileId: 'profile_default', profiles: [] });
  }

  getAllProfiles() {
    return this.getProfilesData().profiles;
  }

  getActiveProfileId() {
    return this.getProfilesData().activeProfileId;
  }

  getActiveProfile() {
    const data = this.getProfilesData();
    return data.profiles.find(p => p.id === data.activeProfileId) || data.profiles[0];
  }

  setActiveProfile(profileId) {
    const data = this.getProfilesData();
    const exists = data.profiles.some(p => p.id === profileId);
    if (!exists) return false;
    data.activeProfileId = profileId;
    this.saveJson(this.profilesFile, data);
    return true;
  }

  createProfile({ name, avatar, color, proxy, userAgent }) {
    const data = this.getProfilesData();
    const id = 'profile_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newProfile = {
      id,
      name: name || 'Профиль ' + (data.profiles.length + 1),
      avatar: avatar || '🚀',
      color: color || '#6366f1',
      partition: 'persist:' + id,
      proxy: proxy || { enabled: false, type: 'http', host: '', port: 8080, username: '', password: '' },
      userAgent: userAgent || '',
      createdAt: Date.now()
    };
    data.profiles.push(newProfile);
    this.saveJson(this.profilesFile, data);
    return newProfile;
  }

  updateProfile(id, updates) {
    const data = this.getProfilesData();
    const idx = data.profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    data.profiles[idx] = { ...data.profiles[idx], ...updates, id };
    this.saveJson(this.profilesFile, data);
    return data.profiles[idx];
  }

  cloneProfile(id, newName) {
    const data = this.getProfilesData();
    const source = data.profiles.find(p => p.id === id);
    if (!source) return null;
    const cloneId = 'profile_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const cloned = {
      ...source,
      id: cloneId,
      name: newName || (source.name + ' (Копия)'),
      partition: 'persist:' + cloneId,
      createdAt: Date.now()
    };
    data.profiles.push(cloned);
    this.saveJson(this.profilesFile, data);
    return cloned;
  }

  deleteProfile(id) {
    const data = this.getProfilesData();
    if (data.profiles.length <= 1) return { success: false, message: 'Нельзя удалить единственный профиль' };
    data.profiles = data.profiles.filter(p => p.id !== id);
    if (data.activeProfileId === id) {
      data.activeProfileId = data.profiles[0].id;
    }
    this.saveJson(this.profilesFile, data);
    return { success: true, activeProfileId: data.activeProfileId };
  }

  // State (Spaces, tabs, settings)
  getState() {
    return this.loadJson(this.stateFile, {});
  }

  saveState(state) {
    return this.saveJson(this.stateFile, state);
  }

  // Bookmarks
  getBookmarks() {
    return this.loadJson(this.bookmarksFile, []);
  }

  addBookmark(bm) {
    const list = this.getBookmarks();
    const newBm = { id: 'bm_' + Date.now(), title: bm.title || 'Новая закладка', url: bm.url, dateAdded: Date.now() };
    list.unshift(newBm);
    this.saveJson(this.bookmarksFile, list);
    return newBm;
  }

  deleteBookmark(id) {
    let list = this.getBookmarks();
    list = list.filter(b => b.id !== id);
    this.saveJson(this.bookmarksFile, list);
    return list;
  }

  // History
  getHistory() {
    return this.loadJson(this.historyFile, []);
  }

  addHistory(entry) {
    if (!entry.url || entry.url.startsWith('about:') || entry.url.startsWith('chrome:') || entry.url.startsWith('apex:')) return;
    let list = this.getHistory();
    const existing = list.find(item => item.url === entry.url);
    const hasGoodTitle = entry.title && entry.title !== entry.url && entry.title.trim().length > 0;
    const title = hasGoodTitle ? entry.title.trim() : (existing?.title || entry.title || entry.url);

    list = list.filter(item => item.url !== entry.url);
    list.unshift({
      id: 'hist_' + Date.now(),
      title: title,
      url: entry.url,
      timestamp: Date.now(),
      profileId: entry.profileId || 'profile_default'
    });
    if (list.length > 3000) list = list.slice(0, 3000);
    this.saveJson(this.historyFile, list);
  }

  searchHistory(query, limit = 8) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const list = this.getHistory();
    const results = [];

    for (const item of list) {
      const url = (item.url || '').toLowerCase();
      const title = (item.title || '').toLowerCase();

      const allWordsMatch = words.every(w => url.includes(w) || title.includes(w));
      if (allWordsMatch) {
        let score = 0;
        const cleanUrl = url.replace(/^https?:\/\/(www\.)?/, '');
        if (cleanUrl.startsWith(q) || url.startsWith(q)) {
          score += 200;
        } else if (title.startsWith(q)) {
          score += 150;
        } else if (cleanUrl.includes(q)) {
          score += 100;
        } else if (title.includes(q)) {
          score += 80;
        } else {
          score += 40;
        }
        results.push({ ...item, score });
      }
    }

    results.sort((a, b) => b.score - a.score || b.timestamp - a.timestamp);
    return results.slice(0, limit);
  }

  importBookmarksFromHtml(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
      return { success: false, message: 'Файл пуст или поврежден', count: 0 };
    }

    const regex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
    const list = this.getBookmarks();
    const existingUrls = new Set(list.map(b => b.url));
    let match;
    let addedCount = 0;

    while ((match = regex.exec(htmlContent)) !== null) {
      const url = match[1];
      let title = match[2] ? match[2].replace(/<[^>]+>/g, '').trim() : '';
      title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

      if (url && (url.startsWith('http://') || url.startsWith('https://')) && !existingUrls.has(url)) {
        list.push({
          id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          title: title || url,
          url: url,
          dateAdded: Date.now()
        });
        existingUrls.add(url);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.saveJson(this.bookmarksFile, list);
    }

    return {
      success: true,
      count: addedCount,
      message: `Успешно импортировано закладок: ${addedCount}`
    };
  }

  clearHistory(profileId = null) {
    if (profileId) {
      let list = this.getHistory();
      list = list.filter(item => item.profileId !== profileId);
      this.saveJson(this.historyFile, list);
    } else {
      this.saveJson(this.historyFile, []);
    }
    return true;
  }

  // Notes
  getNotes() {
    return this.loadJson(this.notesFile, { content: '' });
  }

  saveNotes(content) {
    return this.saveJson(this.notesFile, { content, updatedAt: Date.now() });
  }
}

module.exports = ProfileStore;
