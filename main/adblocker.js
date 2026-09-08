const { session } = require('electron');

class AdBlocker {
  constructor() {
    this.enabled = true;
    this.blockedCount = 0;
    this.blockedPerTab = new Map(); // tabId or url -> count
    
    // Core tracking and ad domains list (Firefox/uBlock inspired)
    this.blockedPatterns = [
      // Major ad networks
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'adservice.google.',
      'pagead2.googlesyndication.com',
      'adnxs.com',
      'criteo.com',
      'criteo.net',
      'rubiconproject.com',
      'pubmatic.com',
      'openx.net',
      'casalemedia.com',
      'taboola.com',
      'outbrain.com',
      'adroll.com',
      'popads.net',
      'propellerads.com',
      'bidswitch.net',
      'smartadserver.com',
      'amazon-adsystem.com',
      'adtechus.com',
      'serving-sys.com',
      'advertising.com',
      
      // Trackers & Telemetry
      'google-analytics.com',
      'googletagmanager.com/gtag/js',
      'analytics.google.com',
      'hotjar.com',
      'segment.io',
      'segment.com',
      'clarity.ms',
      'scorecardresearch.com',
      'quantserve.com',
      'yandex.ru/metrika',
      'mc.yandex.ru',
      'top-fwz1.mail.ru',
      'facebook.com/tr/',
      'connect.facebook.net/en_us/fbevents.js',
      'analytics.twitter.com',
      't.co/i/adsct',
      'bat.bing.com',
      'pixel.wp.com',
      'stats.wp.com',
      'mixpanel.com',
      'amplitude.com',
      'fullstory.com',
      
      // Cryptominers & malicious scripts
      'coinhive.com',
      'coin-hive.com',
      'crypto-loot.com'
    ];
  }

  isBlocked(requestUrl) {
    if (!this.enabled) return false;
    const urlLower = requestUrl.toLowerCase();
    for (const pattern of this.blockedPatterns) {
      if (urlLower.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  attachToSession(sess, profileId = 'default') {
    if (!sess || !sess.webRequest) return;

    // 1. Block tracking & ads before request
    sess.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      // Don't block main frame documents navigation
      if (details.resourceType === 'mainFrame') {
        return callback({ cancel: false });
      }

      if (this.isBlocked(details.url)) {
        this.blockedCount++;
        return callback({ cancel: true });
      }

      callback({ cancel: false });
    });

    // 2. Firefox-style Privacy Headers: DNT & Global Privacy Control
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['DNT'] = '1';
      details.requestHeaders['Sec-GPC'] = '1';
      callback({ requestHeaders: details.requestHeaders });
    });
  }

  getStats() {
    return {
      enabled: this.enabled,
      blockedCount: this.blockedCount,
      patternCount: this.blockedPatterns.length
    };
  }

  setEnabled(val) {
    this.enabled = !!val;
    return this.enabled;
  }

  resetStats() {
    this.blockedCount = 0;
  }
}

module.exports = new AdBlocker();
