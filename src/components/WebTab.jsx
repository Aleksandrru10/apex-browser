import React, { useRef, useEffect } from 'react';
import { Moon, RefreshCw } from 'lucide-react';

export default function WebTab({
  tab,
  isActive,
  partition,
  onUpdateTab,
  onNewWindow,
  onWakeTab,
  webviewRefCallback,
  isDarkMode = true,
  forceDark = false
}) {
  const webviewRef = useRef(null);

  useEffect(() => {
    if (webviewRefCallback && webviewRef.current) {
      webviewRefCallback(tab.id, webviewRef.current);
    }
  }, [webviewRefCallback, tab.id]);

  useEffect(() => {
    const el = webviewRef.current;
    if (!el || tab.isSleeping) return;

    const handleStartLoading = () => {
      onUpdateTab(tab.id, { isLoading: true });
    };

    const handleStopLoading = () => {
      onUpdateTab(tab.id, { 
        isLoading: false, 
        canGoBack: el.canGoBack ? el.canGoBack() : false, 
        canGoForward: el.canGoForward ? el.canGoForward() : false 
      });
    };

    const handleTitleUpdated = (e) => {
      if (e.title) onUpdateTab(tab.id, { title: e.title });
    };

    const handleFaviconUpdated = (e) => {
      if (e.favicons && e.favicons.length > 0) {
        onUpdateTab(tab.id, { favicon: e.favicons[0] });
      }
    };

    const handleNavigate = (e) => {
      onUpdateTab(tab.id, { 
        url: e.url, 
        canGoBack: el.canGoBack ? el.canGoBack() : false, 
        canGoForward: el.canGoForward ? el.canGoForward() : false 
      });
      // Add to history
      if (window.api?.history) {
        window.api.history.add({
          url: e.url,
          title: el.getTitle ? el.getTitle() : e.url,
          profileId: tab.profileId
        });
      }
    };

    const handleMediaPlaying = () => onUpdateTab(tab.id, { isPlayingAudio: true });
    const handleMediaPaused = () => onUpdateTab(tab.id, { isPlayingAudio: false });

    const handleNewWindow = (e) => {
      e.preventDefault();
      if (e.url && onNewWindow) {
        onNewWindow(e.url);
      }
    };

    // Auto Dark Theme Injection (YouTube, GitHub, Wikipedia, etc.)
    const handleDomReady = () => {
      if (isDarkMode) {
        el.executeJavaScript(`
          try {
            // 1. YouTube Dark Theme
            if (location.hostname.includes('youtube.com')) {
              if (!document.documentElement.hasAttribute('dark')) {
                document.documentElement.setAttribute('dark', 'true');
              }
              try {
                document.cookie = "PREF=f6=400; domain=.youtube.com; path=/";
                localStorage.setItem('yt-player-theme', 'dark');
              } catch(e) {}
            }

            // 2. GitHub Dark Theme
            if (location.hostname.includes('github.com')) {
              document.documentElement.setAttribute('data-color-mode', 'dark');
              document.documentElement.setAttribute('data-dark-theme', 'dark');
            }

            // 3. Wikipedia Dark Theme
            if (location.hostname.includes('wikipedia.org')) {
              document.documentElement.classList.add('skin-theme-clientpref-night');
            }
          } catch(e) {}
        `).catch(() => {});
      }

      // Force Dark Mode for sites without native dark mode
      if (forceDark) {
        el.executeJavaScript(`location.hostname`).then(hostname => {
          const isNativeDark = ['youtube.com', 'github.com', 'twitch.tv', 'spotify.com'].some(d => (hostname || '').includes(d));
          if (!isNativeDark) {
            el.insertCSS(`
              html {
                filter: invert(90%) hue-rotate(180deg) !important;
                background-color: #121212 !important;
              }
              img, video, iframe, canvas, svg, [style*="background-image"], embed {
                filter: invert(100%) hue-rotate(180deg) !important;
              }
            `).catch(() => {});
          }
        }).catch(() => {});
      }
    };

    el.addEventListener('did-start-loading', handleStartLoading);
    el.addEventListener('did-stop-loading', handleStopLoading);
    el.addEventListener('page-title-updated', handleTitleUpdated);
    el.addEventListener('page-favicon-updated', handleFaviconUpdated);
    el.addEventListener('did-navigate', handleNavigate);
    el.addEventListener('did-navigate-in-page', handleNavigate);
    el.addEventListener('media-started-playing', handleMediaPlaying);
    el.addEventListener('media-paused', handleMediaPaused);
    el.addEventListener('new-window', handleNewWindow);
    el.addEventListener('dom-ready', handleDomReady);

    return () => {
      el.removeEventListener('did-start-loading', handleStartLoading);
      el.removeEventListener('did-stop-loading', handleStopLoading);
      el.removeEventListener('page-title-updated', handleTitleUpdated);
      el.removeEventListener('page-favicon-updated', handleFaviconUpdated);
      el.removeEventListener('did-navigate', handleNavigate);
      el.removeEventListener('did-navigate-in-page', handleNavigate);
      el.removeEventListener('media-started-playing', handleMediaPlaying);
      el.removeEventListener('media-paused', handleMediaPaused);
      el.removeEventListener('new-window', handleNewWindow);
      el.removeEventListener('dom-ready', handleDomReady);
    };
  }, [tab.id, tab.isSleeping, isDarkMode, forceDark]);

  // If tab was put to sleep by Edge-style resource saver
  if (tab.isSleeping) {
    return (
      <div 
        onClick={() => onWakeTab(tab.id)}
        className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center cursor-pointer select-none group"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
          <Moon size={32} />
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1">
          {tab.title || 'Вкладка спит'}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          Эта вкладка была заморожена технологией Sleeping Tabs для высвобождения оперативной памяти.
        </p>
        <button
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow"
        >
          <RefreshCw size={14} />
          <span>Разбудить вкладку</span>
        </button>
      </div>
    );
  }

  return (
    <webview
      ref={webviewRef}
      src={tab.url}
      partition={partition || 'persist:profile_default'}
      allowpopups="true"
      className="w-full h-full border-0 bg-slate-950"
      style={{ width: '100%', height: '100%', display: 'flex' }}
    ></webview>
  );
}
