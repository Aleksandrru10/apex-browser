import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import SplitView from './components/SplitView';
import WebTab from './components/WebTab';
import NewTabPage from './components/NewTabPage';
import CommandPalette from './components/CommandPalette';
import ProfileModal from './components/ProfileModal';
import ReaderModal from './components/ReaderModal';
import PeekModal from './components/PeekModal';
import SettingsModal from './components/SettingsModal';
import TabContextMenu from './components/TabContextMenu';
import Toast from './components/Toast';
import PasswordModal from './components/PasswordModal';
import BrowserImportModal from './components/BrowserImportModal';

export default function App() {
  // Profiles
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);

  // Spaces & Tabs
  const [spaces, setSpaces] = useState([
    { id: 'space_general', name: 'Общее', icon: 'Sparkles', color: '#3b82f6' },
    { id: 'space_dev', name: 'Разработка', icon: 'Code', color: '#10b981' },
    { id: 'space_media', name: 'Медиа & Чтение', icon: 'BookOpen', color: '#ec4899' }
  ]);
  const [activeSpaceId, setActiveSpaceId] = useState('space_general');

  const [tabs, setTabs] = useState([
    {
      id: 'tab_init_1',
      spaceId: 'space_general',
      title: 'Новая вкладка',
      url: 'apex://newtab',
      favicon: '',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isPlayingAudio: false,
      isSleeping: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab_init_1');

  // Split View (Edge / Arc style)
  const [splitScreen, setSplitScreen] = useState(false);
  const [splitTabId, setSplitTabId] = useState(null);

  // Pinned Favorites
  const [pinnedTabs, setPinnedTabs] = useState([
    { id: 'pin_google', title: 'Google', url: 'https://www.google.com', favicon: 'https://www.google.com/favicon.ico' },
    { id: 'pin_github', title: 'GitHub', url: 'https://github.com', favicon: 'https://github.githubassets.com/favicons/favicon.svg' },
    { id: 'pin_yt', title: 'YouTube', url: 'https://www.youtube.com', favicon: 'https://www.youtube.com/s/desktop/favicon.ico' }
  ]);

  // Data collections
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);

  // Adblocker & Tracking
  const [adblockStats, setAdblockStats] = useState({ enabled: true, blockedCount: 0, patternCount: 40 });

  // Settings
  const [settings, setSettings] = useState({
    searchEngine: 'google',
    adblockEnabled: true,
    dntEnabled: true,
    splitScreenMode: false,
    sleepingTabsEnabled: true,
    sleepingTimeoutMinutes: 15,
    theme: 'dark',
    forceDark: false
  });

  const isDarkMode = settings.theme !== 'light';

  const handleToggleDarkMode = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    handleUpdateSettings({ theme: nextTheme });
  };

  const handleUpdateSettings = (up) => {
    setSettings(prev => {
      const next = { ...prev, ...up };
      if (up.theme && window.api?.theme) {
        window.api.theme.set(up.theme);
      }
      return next;
    });
  };

  // UI Panels & Modals
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReaderModeOpen, setIsReaderModeOpen] = useState(false);
  const [readerArticle, setReaderArticle] = useState(null);
  const [isPeekOpen, setIsPeekOpen] = useState(false);
  const [peekUrl, setPeekUrl] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalFilter, setPasswordModalFilter] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [savedPasswordsForActiveTab, setSavedPasswordsForActiveTab] = useState([]);

  // Tab Context Menu & Toasts
  const [tabContextMenu, setTabContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    tab: null
  });
  const [toast, setToast] = useState({ visible: false, message: '' });

  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  // Reload user data after import
  const handleReloadUserData = () => {
    if (window.api?.bookmarks) {
      window.api.bookmarks.getAll().then(bm => setBookmarks(bm || []));
    }
    if (window.api?.history) {
      window.api.history.getAll().then(h => setHistory(h || []));
    }
    if (window.api?.passwords && activeTab?.url) {
      window.api.passwords.getByUrl(activeTab.url).then(res => setSavedPasswordsForActiveTab(res || []));
    }
    showToast('✨ Данные из браузера успешно импортированы!');
  };

  // Webview element references map: tabId -> webview DOM element
  const webviewMap = useRef(new Map());

  const handleRegisterWebview = useCallback((tabId, el) => {
    if (el) {
      webviewMap.current.set(tabId, el);
    } else {
      webviewMap.current.delete(tabId);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    if (!window.api) return;

    // First run wizard: prompt user to import data from browsers
    const hasSeenImport = localStorage.getItem('apex_has_seen_import_wizard');
    if (!hasSeenImport) {
      setIsImportModalOpen(true);
      localStorage.setItem('apex_has_seen_import_wizard', 'true');
    }

    // Window maximize listener
    if (window.api.onMaximizedChange) {
      window.api.onMaximizedChange(setIsMaximized);
      window.api.isMaximized().then(setIsMaximized);
    }

    // Load profiles
    window.api.profiles.getAll().then(all => {
      setProfiles(all || []);
    });
    window.api.profiles.getActive().then(act => {
      setActiveProfile(act);
    });

    // Load state
    window.api.state.get().then(savedState => {
      if (savedState) {
        if (savedState.spaces) setSpaces(savedState.spaces);
        if (savedState.activeSpaceId) setActiveSpaceId(savedState.activeSpaceId);
        if (savedState.pinnedTabs) setPinnedTabs(savedState.pinnedTabs);
        if (savedState.settings) setSettings(prev => ({ ...prev, ...savedState.settings }));
      }
    });

    // Load bookmarks, history, downloads, adblock
    window.api.bookmarks.getAll().then(bm => setBookmarks(bm || []));
    window.api.history.getAll().then(h => setHistory(h || []));
    window.api.downloads.getAll().then(dl => setDownloads(dl || []));
    window.api.adblock.getStats().then(st => setAdblockStats(st || { enabled: true, blockedCount: 0 }));

    // Download event listeners
    const unsubStarted = window.api.downloads.onStarted(item => {
      setDownloads(prev => [item, ...prev.filter(d => d.id !== item.id)]);
      setRightSidebarOpen(true);
    });

    const unsubUpdated = window.api.downloads.onUpdated(item => {
      setDownloads(prev => prev.map(d => d.id === item.id ? item : d));
    });

    const unsubDone = window.api.downloads.onDone(item => {
      setDownloads(prev => prev.map(d => d.id === item.id ? item : d));
    });

    return () => {
      if (unsubStarted) unsubStarted();
      if (unsubUpdated) unsubUpdated();
      if (unsubDone) unsubDone();
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+T: New Tab
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleNewTab();
      }
      // Ctrl+W: Close Tab
      else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleCloseTab(activeTabId);
      }
      // Ctrl+K: Command Palette
      else if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Alt+S: Split Screen
      else if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleToggleSplitScreen();
      }
      // Ctrl+Shift+M: Profiles
      else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsProfileModalOpen(true);
      }
      // F12: DevTools
      else if (e.key === 'F12') {
        e.preventDefault();
        window.api?.openDevTools();
      }
      // Escape: Close overlays
      else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsProfileModalOpen(false);
        setIsSettingsOpen(false);
        setIsReaderModeOpen(false);
        setIsPeekOpen(false);
        setIsPasswordModalOpen(false);
        setIsImportModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, splitScreen, tabs]);

  // Periodic Adblock stats refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.api?.adblock) {
        window.api.adblock.getStats().then(st => {
          if (st) setAdblockStats(st);
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Active Tab object
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const splitTab = tabs.find(t => t.id === splitTabId);

  // Tab operations
  const handleSelectTab = (id) => {
    setActiveTabId(id);
    const target = tabs.find(t => t.id === id);
    if (target && target.isSleeping) {
      handleWakeTab(id);
    }
  };

  const handleUpdateTab = (id, updates) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleNewTab = (customUrl = 'apex://newtab') => {
    const newId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newTab = {
      id: newId,
      spaceId: activeSpaceId,
      title: customUrl === 'apex://newtab' ? 'Новая вкладка' : customUrl,
      url: customUrl,
      favicon: '',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isPlayingAudio: false,
      isSleeping: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id) => {
    if (tabs.length === 1) {
      // Just reset current tab to new tab
      handleUpdateTab(id, { url: 'apex://newtab', title: 'Новая вкладка', favicon: '' });
      return;
    }
    const idx = tabs.findIndex(t => t.id === id);
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);

    if (activeTabId === id) {
      const nextTab = remaining[Math.max(0, idx - 1)];
      setActiveTabId(nextTab.id);
    }

    if (splitTabId === id) {
      setSplitTabId(null);
      setSplitScreen(false);
    }
  };

  // Sleeping Tabs (Edge-style RAM Saver)
  const handleSleepInactiveTabs = () => {
    const candidateTabs = tabs.filter(t => t.id !== activeTabId && t.id !== splitTabId && !t.isSleeping);
    if (candidateTabs.length > 0) {
      setTabs(prev => prev.map(t => {
        if (t.id !== activeTabId && t.id !== splitTabId) {
          return { ...t, isSleeping: true };
        }
        return t;
      }));
      showToast(`💤 Усыплено неактивных вкладок: ${candidateTabs.length}. Память высвобождена!`);
    } else {
      // If only 1 tab exists or all other tabs are already asleep:
      // Put the current active tab to sleep directly!
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isSleeping: true } : t));
      showToast('💤 Вкладка усыплена! Нажмите в любом месте, чтобы разбудить.');
    }
  };

  const handleWakeTab = (id) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isSleeping: false } : t));
    showToast('✨ Вкладка разбужена');
  };

  // Tab Context Menu Handlers
  const handleTabContextMenu = (e, tab) => {
    setTabContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      tab
    });
  };

  const handleDuplicateTab = (tab) => {
    handleNewTab(tab.url);
    showToast('Вкладка дублирована');
  };

  const handleTogglePinTab = (tab) => {
    const isPinned = pinnedTabs.some(p => p.url === tab.url);
    if (isPinned) {
      setPinnedTabs(prev => prev.filter(p => p.url !== tab.url));
      showToast('Вкладка откреплена');
    } else {
      const newPin = { id: 'pin_' + Date.now(), title: tab.title || 'Закладка', url: tab.url, favicon: tab.favicon };
      setPinnedTabs(prev => [...prev, newPin]);
      showToast('📌 Вкладка закреплена в доке');
    }
  };

  const handleToggleSleepTab = (tabId) => {
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        const nextState = !t.isSleeping;
        if (nextState) {
          showToast('💤 Вкладка усыплена (ОЗУ высвобождена)');
        } else {
          showToast('✨ Вкладка разбужена');
        }
        return { ...t, isSleeping: nextState };
      }
      return t;
    }));
  };

  const handleToggleMuteTab = (tabId) => {
    const wv = webviewMap.current.get(tabId);
    setTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        const nextMute = !t.isMuted;
        if (wv && wv.setAudioMuted) {
          wv.setAudioMuted(nextMute);
        }
        showToast(nextMute ? '🔇 Звук отключен' : '🔊 Звук включен');
        return { ...t, isMuted: nextMute };
      }
      return t;
    }));
  };

  const handleCopyUrl = (url) => {
    navigator.clipboard.writeText(url);
    showToast('📋 Ссылка скопирована в буфер обмена');
  };

  const handleCloseOtherTabs = (tabId) => {
    setTabs(prev => prev.filter(t => t.id === tabId));
    setActiveTabId(tabId);
    showToast('Остальные вкладки закрыты');
  };

  const handleCloseTabsBelow = (tabId) => {
    const idx = tabs.findIndex(t => t.id === tabId);
    if (idx !== -1) {
      setTabs(prev => prev.slice(0, idx + 1));
      showToast('Вкладки снизу закрыты');
    }
  };

  // Arc Auto-Archive unpinned tabs
  const handleArchiveTabs = () => {
    const currentTabs = tabs.filter(t => t.spaceId === activeSpaceId);
    if (currentTabs.length <= 1) return;
    const keepTab = currentTabs.find(t => t.id === activeTabId) || currentTabs[0];
    setTabs(prev => prev.filter(t => t.spaceId !== activeSpaceId || t.id === keepTab.id));
  };

  // Navigation handlers
  const handleNavigate = (url) => {
    if (!activeTab) return;
    handleUpdateTab(activeTab.id, { url, title: url, isSleeping: false });
    const wv = webviewMap.current.get(activeTab.id);
    if (wv && url !== 'apex://newtab') {
      wv.loadURL(url);
    }
  };

  const handleNavigateTab = (tabId, url) => {
    handleUpdateTab(tabId, { url, title: url, isSleeping: false });
    const wv = webviewMap.current.get(tabId);
    if (wv && url !== 'apex://newtab') {
      wv.loadURL(url);
    }
  };

  const handleReload = () => {
    const wv = webviewMap.current.get(activeTabId);
    if (wv) {
      if (activeTab?.isLoading) {
        wv.stop();
      } else {
        wv.reload();
      }
    }
  };

  const handleGoBack = () => {
    const wv = webviewMap.current.get(activeTabId);
    if (wv && wv.canGoBack()) wv.goBack();
  };

  const handleGoForward = () => {
    const wv = webviewMap.current.get(activeTabId);
    if (wv && wv.canGoForward()) wv.goForward();
  };

  // Firefox Reader Mode Extractor
  const handleToggleReaderMode = async () => {
    if (isReaderModeOpen) {
      setIsReaderModeOpen(false);
      return;
    }
    const wv = webviewMap.current.get(activeTabId);
    if (!wv || activeTab?.url?.startsWith('apex://')) return;

    try {
      const script = await window.api.reader.getScript();
      const article = await wv.executeJavaScript(script);
      if (article && article.success) {
        setReaderArticle(article);
        setIsReaderModeOpen(true);
      }
    } catch (e) {
      console.error('Reader extraction error:', e);
    }
  };

  // Arc Peek Preview
  const handleNewWindowOpen = (url) => {
    // Open in Arc-style Peek preview card!
    setPeekUrl(url);
    setIsPeekOpen(true);
  };

  // Split Screen
  const handleToggleSplitScreen = () => {
    if (splitScreen) {
      setSplitScreen(false);
    } else {
      const other = tabs.find(t => t.id !== activeTabId && t.spaceId === activeSpaceId) || tabs.find(t => t.id !== activeTabId);
      if (other) {
        setSplitTabId(other.id);
        setSplitScreen(true);
      } else {
        // Create a second tab for split
        handleNewTab();
        setSplitScreen(true);
      }
    }
  };

  const handleSwapSplitTabs = () => {
    const prevActive = activeTabId;
    setActiveTabId(splitTabId);
    setSplitTabId(prevActive);
  };

  // Bookmarks
  const isBookmarked = bookmarks.some(b => b.url === activeTab?.url);
  const handleToggleBookmark = async () => {
    if (!activeTab?.url || activeTab.url.startsWith('apex://')) return;
    if (isBookmarked) {
      const target = bookmarks.find(b => b.url === activeTab.url);
      if (target) {
        const updated = await window.api.bookmarks.delete(target.id);
        setBookmarks(updated);
      }
    } else {
      const newBm = await window.api.bookmarks.add({ title: activeTab.title, url: activeTab.url });
      setBookmarks(prev => [newBm, ...prev]);
    }
  };

  const handleDeleteBookmark = async (id) => {
    const updated = await window.api.bookmarks.delete(id);
    setBookmarks(updated);
  };

  // History
  const handleClearHistory = async () => {
    await window.api.history.clear();
    setHistory([]);
  };

  // Passwords: Query credentials for active tab domain
  useEffect(() => {
    if (window.api?.passwords && activeTab?.url && !activeTab.url.startsWith('apex://')) {
      window.api.passwords.getByUrl(activeTab.url).then(res => {
        setSavedPasswordsForActiveTab(res || []);
      }).catch(() => setSavedPasswordsForActiveTab([]));
    } else {
      setSavedPasswordsForActiveTab([]);
    }
  }, [activeTab?.url, isPasswordModalOpen]);

  // Autofill handler: injects credentials into login forms in the active webview
  const handleAutofill = async (cred) => {
    const wv = webviewMap.current.get(activeTabId);
    if (!wv) {
      showToast('⚠️ Вкладка не найдена');
      return;
    }
    try {
      const script = `
        (() => {
          try {
            const user = ${JSON.stringify(cred.username)};
            const pass = ${JSON.stringify(cred.password)};

            function setNativeValue(element, value) {
              if (!element) return;
              element.focus();
              const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
              const prototype = Object.getPrototypeOf(element);
              const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
              if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
                prototypeValueSetter.call(element, value);
              } else if (valueSetter) {
                valueSetter.call(element, value);
              } else {
                element.value = value;
              }
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
              element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            }

            const passInputs = Array.from(document.querySelectorAll('input[type="password"]'));
            if (passInputs.length > 0) {
              const pInput = passInputs[0];
              
              // Find visible username/email inputs on the page
              const allInputs = Array.from(document.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])'));
              
              let uInput = allInputs.find(i => {
                const text = ((i.name || '') + ' ' + (i.id || '') + ' ' + (i.placeholder || '') + ' ' + (i.getAttribute('autocomplete') || '') + ' ' + (i.getAttribute('aria-label') || '')).toLowerCase();
                return text.includes('user') || text.includes('login') || text.includes('email') || text.includes('mail') || text.includes('логин') || text.includes('емейл') || text.includes('имя');
              });

              if (!uInput && allInputs.length > 0) {
                uInput = allInputs[0];
              }

              if (user && uInput) {
                setNativeValue(uInput, user);
              }
              setNativeValue(pInput, pass);

              return { success: true };
            }
            return { success: false, reason: 'Поле пароля не найдено на этой странице' };
          } catch (e) {
            return { success: false, reason: e.message };
          }
        })()
      `;
      const res = await wv.executeJavaScript(script);
      if (res && res.success) {
        showToast(`✅ Логин и пароль для "${cred.username}" подставлены!`);
        setIsPasswordModalOpen(false);
      } else {
        showToast('⚠️ ' + (res?.reason || 'Поле пароля не найдено'));
      }
    } catch (err) {
      showToast('⚠️ Ошибка автозаполнения: ' + err.message);
    }
  };

  const handleQuickAutofill = () => {
    if (savedPasswordsForActiveTab.length === 1) {
      handleAutofill(savedPasswordsForActiveTab[0]);
    } else if (savedPasswordsForActiveTab.length > 1) {
      const domain = activeTab?.url ? new URL(activeTab.url.startsWith('http') ? activeTab.url : 'https://' + activeTab.url).hostname.replace(/^www\./, '') : '';
      setPasswordModalFilter(domain);
      setIsPasswordModalOpen(true);
    } else {
      setPasswordModalFilter('');
      setIsPasswordModalOpen(true);
    }
  };

  // Profile operations
  const handleSelectProfile = async (id) => {
    await window.api.profiles.setActive(id);
    const act = await window.api.profiles.getActive();
    setActiveProfile(act);
    const all = await window.api.profiles.getAll();
    setProfiles(all);
  };

  const handleCreateProfile = async (data) => {
    const newProf = await window.api.profiles.create(data);
    setProfiles(prev => [...prev, newProf]);
    setActiveProfile(newProf);
  };

  const handleUpdateProfile = async (id, updates) => {
    const updated = await window.api.profiles.update(id, updates);
    setProfiles(prev => prev.map(p => p.id === id ? updated : p));
    if (activeProfile?.id === id) setActiveProfile(updated);
  };

  const handleCloneProfile = async (id) => {
    const cloned = await window.api.profiles.clone(id);
    if (cloned) setProfiles(prev => [...prev, cloned]);
  };

  const handleDeleteProfile = async (id) => {
    const res = await window.api.profiles.delete(id);
    if (res.success) {
      const all = await window.api.profiles.getAll();
      setProfiles(all);
      const act = await window.api.profiles.getActive();
      setActiveProfile(act);
    }
  };

  const handleClearProfileData = async (id) => {
    await window.api.profiles.clearData(id);
  };

  // Adblock toggle
  const handleToggleAdblock = async (enabled) => {
    await window.api.adblock.toggle(enabled);
    const st = await window.api.adblock.getStats();
    setAdblockStats(st);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. Top Navigation & Omnibox Bar */}
      <TopBar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onReload={handleReload}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        canGoBack={activeTab?.canGoBack}
        canGoForward={activeTab?.canGoForward}
        isLoading={activeTab?.isLoading}
        activeProfile={activeProfile}
        onOpenProfiles={() => setIsProfileModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        splitScreen={splitScreen}
        onToggleSplitScreen={handleToggleSplitScreen}
        onToggleReaderMode={handleToggleReaderMode}
        isReaderModeActive={isReaderModeOpen}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        rightSidebarOpen={rightSidebarOpen}
        isMaximized={isMaximized}
        onMinimize={() => window.api?.minimize()}
        onMaximize={() => window.api?.maximize()}
        onClose={() => window.api?.close()}
        adblockStats={adblockStats}
        onToggleAdblock={handleToggleAdblock}
        isBookmarked={isBookmarked}
        onToggleBookmark={handleToggleBookmark}
        isDarkMode={isDarkMode}
        onOpenPasswords={(filter) => {
          setPasswordModalFilter(filter || '');
          setIsPasswordModalOpen(true);
        }}
        savedPasswordsCountForDomain={savedPasswordsForActiveTab.length}
        savedPasswordsForActiveTab={savedPasswordsForActiveTab}
        onAutofillCredential={handleAutofill}
        onQuickAutofill={handleQuickAutofill}
        onOpenImport={() => setIsImportModalOpen(true)}
      />

      {/* 2. Main Body: Sidebar + Web Content + Right Utility Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Arc & Edge Collapsible Vertical Sidebar */}
        <Sidebar
          spaces={spaces}
          activeSpaceId={activeSpaceId}
          onSelectSpace={setActiveSpaceId}
          onCreateSpace={(sp) => setSpaces(prev => [...prev, { ...sp, id: 'space_' + Date.now() }])}
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={() => handleNewTab()}
          pinnedTabs={pinnedTabs}
          onSelectPinnedTab={(pin) => handleNewTab(pin.url)}
          activeProfile={activeProfile}
          onOpenProfiles={() => setIsProfileModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onSleepInactiveTabs={handleSleepInactiveTabs}
          onArchiveTabs={handleArchiveTabs}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onTabContextMenu={handleTabContextMenu}
        />

        {/* Browser Web Viewport */}
        <main className="flex-1 h-full relative overflow-hidden bg-slate-950">
          {splitScreen ? (
            /* Microsoft Edge Split Screen dual view */
            <SplitView
              activeTab={activeTab}
              splitTab={splitTab}
              allTabs={tabs}
              onSelectSplitTab={setSplitTabId}
              onSwapSplitTabs={handleSwapSplitTabs}
              onCloseSplit={() => setSplitScreen(false)}
              activeProfile={activeProfile}
              activeSpace={spaces.find(s => s.id === activeSpaceId)}
              adblockStats={adblockStats}
              onUpdateTab={handleUpdateTab}
              onNewWindow={handleNewWindowOpen}
              onWakeTab={handleWakeTab}
              onNavigateTab={handleNavigateTab}
              webviewRefCallback={handleRegisterWebview}
              isDarkMode={isDarkMode}
              forceDark={settings.forceDark}
            />
          ) : (
            /* Single Tab View */
            <div className="w-full h-full relative">
              {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                if (!isActive && tab.isSleeping) return null; // Don't mount frozen tabs
                return (
                  <div
                    key={tab.id}
                    className="w-full h-full absolute inset-0"
                    style={{ display: isActive ? 'block' : 'none' }}
                  >
                    {tab.url === 'apex://newtab' ? (
                      <NewTabPage
                        onNavigate={(url) => handleNavigateTab(tab.id, url)}
                        activeProfile={activeProfile}
                        activeSpace={spaces.find(s => s.id === activeSpaceId)}
                        adblockStats={adblockStats}
                        onOpenImport={() => setIsImportModalOpen(true)}
                      />
                    ) : (
                      <WebTab
                        tab={tab}
                        isActive={isActive}
                        partition={activeProfile?.partition}
                        onUpdateTab={handleUpdateTab}
                        onNewWindow={handleNewWindowOpen}
                        onWakeTab={handleWakeTab}
                        webviewRefCallback={handleRegisterWebview}
                        isDarkMode={isDarkMode}
                        forceDark={settings.forceDark}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Microsoft Edge Right Utility Sidebar */}
        <RightSidebar
          isOpen={rightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
          activeTab={activeTab}
          onNavigate={handleNavigate}
          downloads={downloads}
          onPauseDownload={(id) => window.api?.downloads.pause(id)}
          onResumeDownload={(id) => window.api?.downloads.resume(id)}
          onCancelDownload={(id) => window.api?.downloads.cancel(id)}
          onOpenDownload={(id) => window.api?.downloads.open(id)}
          onShowDownloadInFolder={(id) => window.api?.downloads.showInFolder(id)}
          bookmarks={bookmarks}
          onDeleteBookmark={handleDeleteBookmark}
          history={history}
          onClearHistory={handleClearHistory}
        />
      </div>

      {/* 3. Arc-style Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        tabs={tabs}
        onSelectTab={handleSelectTab}
        onNewTab={() => handleNewTab()}
        onToggleSplit={handleToggleSplitScreen}
        onOpenProfiles={() => setIsProfileModalOpen(true)}
        onToggleReader={handleToggleReaderMode}
        onToggleAdblock={() => handleToggleAdblock(!adblockStats.enabled)}
        onSleepTabs={handleSleepInactiveTabs}
        onOpenDevTools={() => window.api?.openDevTools()}
        onNavigate={handleNavigate}
        bookmarks={bookmarks}
        onOpenPasswords={() => {
          setIsCommandPaletteOpen(false);
          setIsPasswordModalOpen(true);
        }}
        onOpenImport={() => {
          setIsCommandPaletteOpen(false);
          setIsImportModalOpen(true);
        }}
      />

      {/* 4. Unlimited Multi-Profile Engine Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfile?.id}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
        onUpdateProfile={handleUpdateProfile}
        onCloneProfile={handleCloneProfile}
        onDeleteProfile={handleDeleteProfile}
        onClearProfileData={handleClearProfileData}
      />

      {/* 5. Firefox Distraction-Free Reader Mode */}
      <ReaderModal
        isOpen={isReaderModeOpen}
        onClose={() => setIsReaderModeOpen(false)}
        article={readerArticle}
      />

      {/* 6. Arc Peek Preview Modal */}
      <PeekModal
        isOpen={isPeekOpen}
        url={peekUrl}
        partition={activeProfile?.partition}
        onClose={() => setIsPeekOpen(false)}
        onOpenAsTab={(url) => handleNewTab(url)}
      />

      {/* 7. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClearHistory={handleClearHistory}
        adblockStats={adblockStats}
        onToggleAdblock={handleToggleAdblock}
        onOpenPasswords={() => {
          setIsSettingsOpen(false);
          setIsPasswordModalOpen(true);
        }}
        onOpenImport={() => {
          setIsSettingsOpen(false);
          setIsImportModalOpen(true);
        }}
      />

      {/* 8. Tab Context Menu */}
      <TabContextMenu
        isOpen={tabContextMenu.isOpen}
        position={tabContextMenu.position}
        tab={tabContextMenu.tab}
        onClose={() => setTabContextMenu(prev => ({ ...prev, isOpen: false }))}
        onReload={handleReload}
        onDuplicate={handleDuplicateTab}
        onTogglePin={handleTogglePinTab}
        onToggleSleep={handleToggleSleepTab}
        onSplit={(tabId) => {
          setSplitTabId(tabId);
          setSplitScreen(true);
        }}
        onToggleMute={handleToggleMuteTab}
        onCopyUrl={handleCopyUrl}
        onCloseTab={handleCloseTab}
        onCloseOtherTabs={handleCloseOtherTabs}
        onCloseTabsBelow={handleCloseTabsBelow}
      />

      {/* 9. Visual Toast Notification */}
      <Toast message={toast.message} visible={toast.visible} />

      {/* 10. Password Manager & Migration Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onAutofillActiveTab={handleAutofill}
        activeTabUrl={activeTab?.url}
        initialSearch={passwordModalFilter}
        onOpenImport={() => {
          setIsPasswordModalOpen(false);
          setIsImportModalOpen(true);
        }}
      />

      {/* 11. Browser Migration & Import Wizard Modal */}
      <BrowserImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleReloadUserData}
      />
    </div>
  );
}
