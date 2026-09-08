const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron');

class GitHubUpdater {
  constructor(options = {}) {
    this.repoOwner = options.owner || 'Aleksandrru10';
    this.repoName = options.repo || 'apex-browser';
    this.currentVersion = options.currentVersion || (app ? app.getVersion() : '1.0.0');
    this.downloadAbortController = null;
  }

  // Parse semver e.g. "1.0.1" or "v1.0.1" into [major, minor, patch]
  parseSemver(v) {
    const clean = (v || '').replace(/^v/i, '').trim();
    const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }

  // Returns true if v2 > v1
  isNewer(vCurrent, vLatest) {
    const [cMaj, cMin, cPatch] = this.parseSemver(vCurrent);
    const [lMaj, lMin, lPatch] = this.parseSemver(vLatest);

    if (lMaj > cMaj) return true;
    if (lMaj < cMaj) return false;
    if (lMin > cMin) return true;
    if (lMin < cMin) return false;
    return lPatch > cPatch;
  }

  // Fetch JSON from URL with redirect support
  fetchJson(url) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const req = https.get(parsedUrl, {
        headers: {
          'User-Agent': 'Apex-Browser-Updater',
          'Accept': 'application/vnd.github.v3+json'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.fetchJson(res.headers.location).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub API returned status ${res.statusCode}`));
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Invalid JSON from GitHub: ' + e.message));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('GitHub API request timed out'));
      });
    });
  }

  // Check GitHub Releases for newer version
  async checkForUpdates() {
    const currentVer = app ? app.getVersion() : this.currentVersion;
    const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest`;

    try {
      const release = await this.fetchJson(apiUrl);
      const latestTag = release.tag_name || release.name || '';
      const hasUpdate = this.isNewer(currentVer, latestTag);

      // Find Windows EXE asset
      let exeAsset = null;
      if (Array.isArray(release.assets)) {
        exeAsset = release.assets.find(a => a.name.toLowerCase().endsWith('.exe')) || release.assets[0];
      }

      return {
        success: true,
        hasUpdate,
        currentVersion: currentVer,
        latestVersion: latestTag.replace(/^v/i, ''),
        releaseTitle: release.name || latestTag,
        releaseNotes: release.body || '',
        publishedAt: release.published_at,
        htmlUrl: release.html_url,
        downloadUrl: exeAsset ? exeAsset.browser_download_url : null,
        assetName: exeAsset ? exeAsset.name : null,
        assetSize: exeAsset ? exeAsset.size : 0
      };
    } catch (err) {
      return {
        success: false,
        hasUpdate: false,
        currentVersion: currentVer,
        error: err.message,
        message: 'Не удалось проверить обновления на GitHub: ' + err.message
      };
    }
  }

  // Download update file with progress tracking and redirect handling
  downloadUpdate(downloadUrl, onProgress) {
    return new Promise((resolve, reject) => {
      const tempDir = app ? app.getPath('temp') : (process.env.TEMP || '.');
      const targetFile = path.join(tempDir, `Apex-Browser-Update-${Date.now()}.exe`);
      const fileStream = fs.createWriteStream(targetFile);

      const makeRequest = (targetUrl) => {
        const parsed = new URL(targetUrl);
        const protocol = parsed.protocol === 'https:' ? https : http;

        const req = protocol.get(targetUrl, {
          headers: {
            'User-Agent': 'Apex-Browser-Updater',
            'Accept': 'application/octet-stream'
          }
        }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return makeRequest(res.headers.location);
          }

          if (res.statusCode !== 200) {
            fileStream.close();
            try { fs.unlinkSync(targetFile); } catch (e) {}
            return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
          }

          const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
          let receivedBytes = 0;

          res.on('data', (chunk) => {
            receivedBytes += chunk.length;
            fileStream.write(chunk);
            if (typeof onProgress === 'function') {
              const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0;
              onProgress({
                receivedBytes,
                totalBytes,
                percent
              });
            }
          });

          res.on('end', () => {
            fileStream.end();
            fileStream.on('finish', () => {
              resolve({
                success: true,
                filePath: targetFile
              });
            });
          });
        });

        req.on('error', (err) => {
          fileStream.close();
          try { fs.unlinkSync(targetFile); } catch (e) {}
          reject(err);
        });
      };

      makeRequest(downloadUrl);
    });
  }

  // Execute downloaded installer and quit current app
  installAndRestart(exePath) {
    if (!fs.existsSync(exePath)) {
      return { success: false, message: 'Файл установщика не найден: ' + exePath };
    }

    try {
      // Spawn installer detached from current Electron process
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Gracefully exit current app so installer can overwrite files
      setTimeout(() => {
        if (app) {
          app.quit();
        } else {
          process.exit(0);
        }
      }, 500);

      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

module.exports = GitHubUpdater;
