const { shell } = require('electron');
const path = require('path');

class DownloadManager {
  constructor() {
    this.downloads = [];
    this.itemsMap = new Map(); // id -> DownloadItem
  }

  attachToSession(sess, mainWindow) {
    if (!sess) return;
    
    sess.on('will-download', (event, item, webContents) => {
      const id = 'dl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const filename = item.getFilename();
      const savePath = item.getSavePath();
      const totalBytes = item.getTotalBytes();
      
      const record = {
        id,
        filename,
        savePath: savePath || filename,
        totalBytes,
        receivedBytes: 0,
        percent: 0,
        speed: 0,
        state: 'progressing',
        startTime: Date.now()
      };

      this.downloads.unshift(record);
      this.itemsMap.set(id, item);

      let lastBytes = 0;
      let lastTime = Date.now();

      item.on('updated', (event, state) => {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000;
        const currentBytes = item.getReceivedBytes();
        
        if (timeDiff >= 0.5) {
          record.speed = Math.round((currentBytes - lastBytes) / timeDiff);
          lastBytes = currentBytes;
          lastTime = now;
        }

        record.receivedBytes = currentBytes;
        record.savePath = item.getSavePath();
        if (record.totalBytes > 0) {
          record.percent = Math.round((record.receivedBytes / record.totalBytes) * 100);
        }
        record.state = state; // 'progressing' or 'interrupted'

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download:updated', record);
        }
      });

      item.once('done', (event, state) => {
        record.state = state; // 'completed', 'cancelled' or 'interrupted'
        record.savePath = item.getSavePath();
        record.receivedBytes = item.getReceivedBytes();
        record.percent = 100;
        record.speed = 0;

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download:done', record);
        }
      });

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download:started', record);
      }
    });
  }

  getAll() {
    return this.downloads;
  }

  pause(id) {
    const item = this.itemsMap.get(id);
    if (item && item.canResume()) {
      item.pause();
      return true;
    }
    return false;
  }

  resume(id) {
    const item = this.itemsMap.get(id);
    if (item && item.canResume()) {
      item.resume();
      return true;
    }
    return false;
  }

  cancel(id) {
    const item = this.itemsMap.get(id);
    if (item) {
      item.cancel();
      return true;
    }
    return false;
  }

  openFile(id) {
    const rec = this.downloads.find(d => d.id === id);
    if (rec && rec.savePath) {
      shell.openPath(rec.savePath);
      return true;
    }
    return false;
  }

  showInFolder(id) {
    const rec = this.downloads.find(d => d.id === id);
    if (rec && rec.savePath) {
      shell.showItemInFolder(rec.savePath);
      return true;
    }
    return false;
  }
}

module.exports = new DownloadManager();
