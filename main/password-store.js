const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class PasswordStore {
  constructor(customStorageDir = null) {
    this.storageDir = customStorageDir || (app ? app.getPath('userData') : path.join(__dirname, '..', '.data'));
    if (!fs.existsSync(this.storageDir)) {
      try { fs.mkdirSync(this.storageDir, { recursive: true }); } catch (e) {}
    }
    this.passwordsFile = path.join(this.storageDir, 'passwords.json');
    this.init();
  }

  init() {
    if (!fs.existsSync(this.passwordsFile)) {
      this.saveJson(this.passwordsFile, []);
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

  extractDomain(url) {
    if (!url) return '';
    try {
      let normalized = url.trim();
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
      }
      const parsed = new URL(normalized);
      const parts = parsed.hostname.toLowerCase().split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return parsed.hostname.toLowerCase();
    } catch (e) {
      return url.toLowerCase().trim();
    }
  }

  getAll() {
    return this.loadJson(this.passwordsFile, []);
  }

  getByUrl(url) {
    if (!url) return [];
    const targetDomain = this.extractDomain(url);
    const all = this.getAll();
    return all.filter(item => {
      const itemDomain = this.extractDomain(item.url);
      return itemDomain && targetDomain && itemDomain === targetDomain;
    });
  }

  add({ name, url, username, password, note, profileId }) {
    if (!url || !username || !password) {
      return { success: false, message: 'URL, логин и пароль обязательны' };
    }
    const list = this.getAll();
    const id = 'pwd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const domain = this.extractDomain(url);
    const newEntry = {
      id,
      name: name || domain || url,
      url: url.trim(),
      domain,
      username: username.trim(),
      password: password.trim(),
      note: note || '',
      profileId: profileId || 'all',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    list.unshift(newEntry);
    this.saveJson(this.passwordsFile, list);
    return { success: true, entry: newEntry };
  }

  update(id, updates) {
    const list = this.getAll();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return { success: false, message: 'Запись не найдена' };
    
    if (updates.url) {
      updates.domain = this.extractDomain(updates.url);
    }
    list[idx] = {
      ...list[idx],
      ...updates,
      id,
      updatedAt: Date.now()
    };
    this.saveJson(this.passwordsFile, list);
    return { success: true, entry: list[idx] };
  }

  delete(id) {
    let list = this.getAll();
    const prevLen = list.length;
    list = list.filter(p => p.id !== id);
    if (list.length !== prevLen) {
      this.saveJson(this.passwordsFile, list);
      return { success: true, remainingCount: list.length };
    }
    return { success: false, message: 'Запись не найдена' };
  }

  // Parse CSV from Google Chrome, Microsoft Edge, Mozilla Firefox, 1Password, Bitwarden
  importFromCsv(csvContent, profileId = 'all') {
    if (!csvContent || typeof csvContent !== 'string') {
      return { success: false, message: 'Файл пуст или поврежден', count: 0 };
    }

    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return { success: false, message: 'В файле нет записей с паролями', count: 0 };
    }

    // Parse header
    const headerLine = lines[0].toLowerCase();
    const parseCsvRow = (text) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          if (inQuotes && text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseCsvRow(headerLine).map(h => h.replace(/^["']|["']$/g, '').trim());
    
    // Find column indexes
    let urlIdx = headers.findIndex(h => h.includes('url') || h === 'hostname' || h === 'login_url');
    let userIdx = headers.findIndex(h => h.includes('user') || h.includes('login') || h.includes('email'));
    let passIdx = headers.findIndex(h => h.includes('pass') || h === 'password');
    let nameIdx = headers.findIndex(h => h === 'name' || h === 'title');

    // Fallback if headers not matching
    if (urlIdx === -1) urlIdx = 1;
    if (userIdx === -1) userIdx = 2;
    if (passIdx === -1) passIdx = 3;

    let importedCount = 0;
    const list = this.getAll();

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvRow(lines[i]);
      if (!row || row.length < 3) continue;

      const rawUrl = (urlIdx >= 0 && row[urlIdx]) ? row[urlIdx] : '';
      const rawUser = (userIdx >= 0 && row[userIdx]) ? row[userIdx] : '';
      const rawPass = (passIdx >= 0 && row[passIdx]) ? row[passIdx] : '';
      const rawName = (nameIdx >= 0 && row[nameIdx]) ? row[nameIdx] : '';

      if (!rawUrl || !rawPass) continue;

      const domain = this.extractDomain(rawUrl);
      const id = 'pwd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      // Avoid exact duplicates
      const exists = list.some(item => 
        item.url === rawUrl && item.username === rawUser
      );

      if (!exists) {
        list.push({
          id,
          name: rawName || domain || rawUrl,
          url: rawUrl,
          domain,
          username: rawUser,
          password: rawPass,
          note: 'Импортировано из другого браузера',
          profileId: profileId || 'all',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        importedCount++;
      }
    }

    if (importedCount > 0) {
      this.saveJson(this.passwordsFile, list);
    }

    return {
      success: true,
      count: importedCount,
      total: list.length,
      message: `Успешно импортировано паролей: ${importedCount}`
    };
  }

  exportToCsv() {
    const all = this.getAll();
    const rows = ['name,url,username,password,note'];
    all.forEach(item => {
      const escape = (val) => `"${(val || '').replace(/"/g, '""')}"`;
      rows.push([
        escape(item.name),
        escape(item.url),
        escape(item.username),
        escape(item.password),
        escape(item.note)
      ].join(','));
    });
    return rows.join('\r\n');
  }
}

module.exports = PasswordStore;
