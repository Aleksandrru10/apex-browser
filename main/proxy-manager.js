// Per-profile Proxy Manager for Apex Browser

class ProxyManager {
  constructor() {
    this.authMap = new Map(); // host:port -> { username, password }
  }

  setupAuthHandler(app) {
    if (!app) return;
    app.on('login', (event, webContents, request, authInfo, callback) => {
      if (authInfo.isProxy) {
        const key = `${authInfo.host}:${authInfo.port}`;
        const creds = this.authMap.get(key);
        if (creds && creds.username) {
          event.preventDefault();
          callback(creds.username, creds.password || '');
          return;
        }
      }
    });
  }

  applyProxyToSession(sess, profile) {
    if (!sess || !profile) return;

    if (profile.proxy && profile.proxy.enabled && profile.proxy.host) {
      const type = profile.proxy.type || 'http';
      const host = profile.proxy.host.trim();
      const port = profile.proxy.port || 8080;
      const proxyRules = `${type}://${host}:${port}`;

      if (profile.proxy.username) {
        this.authMap.set(`${host}:${port}`, {
          username: profile.proxy.username,
          password: profile.proxy.password || ''
        });
      }

      sess.setProxy({
        proxyRules,
        proxyBypassRules: '<local>;localhost;127.0.0.1'
      }).then(() => {
        console.log(`[Proxy] Applied ${proxyRules} to profile "${profile.name}" (${profile.id})`);
      }).catch(err => {
        console.error('[Proxy] Failed to apply proxy:', err);
      });
    } else {
      sess.setProxy({ mode: 'direct' }).catch(() => {});
    }

    // Set custom User-Agent if configured
    if (profile.userAgent && profile.userAgent.trim()) {
      sess.setUserAgent(profile.userAgent.trim());
    }
  }
}

module.exports = new ProxyManager();
