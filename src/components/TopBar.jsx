import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCw, Home, Shield, ShieldAlert, 
  Star, SplitSquareVertical, BookOpen, PanelRight, Minus, Square, 
  Copy, Check, X, Search, Globe, Lock, ExternalLink, Moon, Sun, Key, FolderDown, Settings, Clock
} from 'lucide-react';

export default function TopBar({
  activeTab,
  onNavigate,
  onReload,
  onGoBack,
  onGoForward,
  canGoBack,
  canGoForward,
  isLoading,
  activeProfile,
  onOpenProfiles,
  onOpenSettings,
  splitScreen,
  onToggleSplitScreen,
  onToggleReaderMode,
  isReaderModeActive,
  onToggleRightSidebar,
  rightSidebarOpen,
  isMaximized,
  onMinimize,
  onMaximize,
  onClose,
  adblockStats,
  onToggleAdblock,
  isBookmarked,
  onToggleBookmark,
  isDarkMode = true,
  onToggleDarkMode,
  onOpenPasswords,
  savedPasswordsCountForDomain = 0,
  savedPasswordsForActiveTab = [],
  onAutofillCredential,
  onQuickAutofill,
  onOpenImport
}) {
  const [urlInput, setUrlInput] = useState(activeTab?.url || '');
  const [isFocused, setIsFocused] = useState(false);
  const [unifiedSuggestions, setUnifiedSuggestions] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showShieldMenu, setShowShieldMenu] = useState(false);
  const [showPasswordMenu, setShowPasswordMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const shieldRef = useRef(null);
  const passwordMenuRef = useRef(null);

  // Close password popover on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (passwordMenuRef.current && !passwordMenuRef.current.contains(e.target)) {
        setShowPasswordMenu(false);
      }
    }
    if (showPasswordMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPasswordMenu]);

  const getDomain = (rawUrl) => {
    try {
      if (!rawUrl || rawUrl.startsWith('apex://')) return '';
      const u = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
      return u.hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  };
  const activeDomain = getDomain(activeTab?.url);

  useEffect(() => {
    if (!isFocused && activeTab?.url) {
      setUrlInput(activeTab.url === 'about:blank' || activeTab.url.startsWith('apex://') ? '' : activeTab.url);
    }
  }, [activeTab?.url, isFocused]);

  // Fetch unified suggestions (History + Bookmarks + Google search) as user types
  useEffect(() => {
    if (!isFocused || !urlInput.trim()) {
      setUnifiedSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const query = urlInput.trim();
        const results = [];

        // 1. History search (direct match by visited sites)
        if (window.api?.history?.search) {
          const histMatches = await window.api.history.search(query, 5);
          if (histMatches && histMatches.length > 0) {
            histMatches.forEach(h => {
              results.push({
                type: 'history',
                title: h.title || h.url,
                url: h.url
              });
            });
          }
        }

        // 2. Bookmarks search
        if (window.api?.bookmarks?.getAll) {
          const allBm = await window.api.bookmarks.getAll();
          const qLower = query.toLowerCase();
          const bmMatches = (allBm || []).filter(b => 
            (b.title && b.title.toLowerCase().includes(qLower)) || 
            (b.url && b.url.toLowerCase().includes(qLower))
          ).slice(0, 3);

          bmMatches.forEach(b => {
            if (!results.some(r => r.url === b.url)) {
              results.push({
                type: 'bookmark',
                title: b.title || b.url,
                url: b.url
              });
            }
          });
        }

        // 3. Web Search Suggestions (Google)
        if (!query.startsWith('http://') && !query.startsWith('https://') && window.api?.search) {
          const searchSugs = await window.api.search.getSuggestions(query, 'google');
          if (searchSugs && searchSugs.length > 0) {
            searchSugs.slice(0, 5).forEach(s => {
              results.push({
                type: 'search',
                query: s
              });
            });
          }
        }

        setUnifiedSuggestions(results);
        setSelectedIndex(-1);
      } catch (e) {
        setUnifiedSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [urlInput, isFocused]);

  // Close shield popover when clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (shieldRef.current && !shieldRef.current.contains(e.target)) {
        setShowShieldMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (targetUrl) => {
    const query = targetUrl || urlInput.trim();
    if (!query) return;

    let destination = query;
    const isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/.test(query);
    if (query.startsWith('http://') || query.startsWith('https://') || query.startsWith('apex://') || query.startsWith('file://')) {
      destination = query;
    } else if (isDomain) {
      destination = 'https://' + query;
    } else {
      destination = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }

    onNavigate(destination);
    setIsFocused(false);
    setUnifiedSuggestions([]);
  };

  const handleSelectSuggestion = (item) => {
    if (item.type === 'history' || item.type === 'bookmark') {
      onNavigate(item.url);
    } else if (item.type === 'search') {
      handleSubmit(item.query);
    }
    setIsFocused(false);
    setUnifiedSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && unifiedSuggestions[selectedIndex]) {
        handleSelectSuggestion(unifiedSuggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < unifiedSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setUnifiedSuggestions([]);
    }
  };

  // Firefox-style clean link copy (strips UTM & tracking params)
  const copyCleanLink = () => {
    if (!activeTab?.url) return;
    try {
      const parsed = new URL(activeTab.url);
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'yclid', 'msclkid'];
      trackingParams.forEach(p => parsed.searchParams.delete(p));
      navigator.clipboard.writeText(parsed.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      navigator.clipboard.writeText(activeTab.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <header className="h-11 bg-slate-900/95 border-b border-slate-800 flex items-center px-2 gap-2 select-none app-drag relative z-30">
      {/* Navigation buttons */}
      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={onGoBack}
          disabled={!canGoBack}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Назад (Alt + Left)"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={onGoForward}
          disabled={!canGoForward}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Вперед (Alt + Right)"
        >
          <ArrowRight size={16} />
        </button>
        <button
          onClick={onReload}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          title={isLoading ? "Остановить" : "Обновить (Ctrl + R)"}
        >
          {isLoading ? <X size={16} className="text-amber-400" /> : <RotateCw size={16} />}
        </button>
        <button
          onClick={() => onNavigate('apex://newtab')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          title="Домашняя страница"
        >
          <Home size={16} />
        </button>
      </div>

      {/* Omnibox / Smart Address Bar */}
      <div className="flex-1 max-w-3xl mx-auto relative app-no-drag">
        <div className={`flex items-center bg-slate-950/80 border rounded-xl px-3 py-1.5 transition-all shadow-inner ${
          isFocused ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 bg-slate-950' : 'border-slate-800 hover:border-slate-700'
        }`}>
          {/* Security lock or search icon */}
          <div className="mr-2 text-slate-400 flex items-center">
            {activeTab?.url?.startsWith('https://') ? (
              <Lock size={14} className="text-emerald-400" title="Безопасное соединение (SSL)" />
            ) : isFocused ? (
              <Search size={14} className="text-indigo-400" />
            ) : (
              <Globe size={14} className="text-slate-500" />
            )}
          </div>

          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setSelectedIndex(-1);
            }}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Введите URL или поисковый запрос..."
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 w-full"
          />

          {/* Actions inside Omnibox */}
          <div className="flex items-center gap-1 ml-2 text-slate-400">
            {/* Copy Clean Link */}
            {activeTab?.url && !activeTab.url.startsWith('apex://') && (
              <button
                onClick={copyCleanLink}
                className="p-1 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title="Скопировать чистую ссылку (без трекинга)"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            )}

            {/* Bookmark star */}
            <button
              onClick={onToggleBookmark}
              className={`p-1 rounded transition-colors ${
                isBookmarked ? 'text-amber-400 hover:text-amber-300' : 'hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isBookmarked ? "Удалить из закладок" : "Добавить в закладки"}
            >
              <Star size={14} fill={isBookmarked ? "currentColor" : "none"} />
            </button>

            {/* Password Autofill Quick Badge with Dropdown Picker */}
            {savedPasswordsForActiveTab && savedPasswordsForActiveTab.length > 0 && (
              <div className="relative" ref={passwordMenuRef}>
                <button
                  onClick={() => {
                    if (savedPasswordsForActiveTab.length === 1) {
                      if (onAutofillCredential) onAutofillCredential(savedPasswordsForActiveTab[0]);
                      else if (onQuickAutofill) onQuickAutofill();
                    } else {
                      setShowPasswordMenu(!showPasswordMenu);
                    }
                  }}
                  className={`p-1 rounded flex items-center gap-1 transition-colors ${
                    showPasswordMenu 
                      ? 'text-amber-300 bg-amber-500/20 shadow' 
                      : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/20'
                  }`}
                  title={
                    savedPasswordsForActiveTab.length === 1
                      ? `Автозаполнить логин и пароль (${savedPasswordsForActiveTab[0].username})`
                      : `Выбрать аккаунт для автозаполнения (${savedPasswordsForActiveTab.length} сохраненных)`
                  }
                >
                  <Key size={14} />
                  <span className="font-mono text-[9px] bg-amber-500/20 px-1 rounded text-amber-300 font-bold">
                    {savedPasswordsForActiveTab.length}
                  </span>
                </button>

                {/* Account Selection Popover */}
                {showPasswordMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-3 text-xs z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Key size={13} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-200 truncate max-w-[190px]">
                            {activeDomain || 'Аккаунты для этого сайта'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {savedPasswordsForActiveTab.length} сохранённых аккаунта
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowPasswordMenu(false)}
                        className="p-1 text-slate-500 hover:text-slate-300 rounded"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="py-2 space-y-1.5 max-h-60 overflow-y-auto">
                      {savedPasswordsForActiveTab.map((cred, idx) => (
                        <div
                          key={cred.id || idx}
                          onClick={() => {
                            if (onAutofillCredential) onAutofillCredential(cred);
                            setShowPasswordMenu(false);
                          }}
                          className="group flex items-center justify-between p-2 rounded-xl bg-slate-800/60 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-slate-700/50 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-amber-300 group-hover:text-indigo-300 shrink-0">
                              <Key size={12} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-200">
                                {cred.username || '(без логина)'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                ••••••••
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onAutofillCredential) onAutofillCredential(cred);
                              setShowPasswordMenu(false);
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold shrink-0 transition-colors shadow"
                          >
                            Вставить
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <button
                        onClick={() => {
                          setShowPasswordMenu(false);
                          if (onOpenPasswords) onOpenPasswords(activeDomain);
                        }}
                        className="text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-medium"
                      >
                        <Settings size={12} />
                        <span>Все пароли в менеджере</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Firefox Reader Mode Button */}
            <button
              onClick={onToggleReaderMode}
              className={`p-1 rounded transition-colors ${
                isReaderModeActive ? 'text-indigo-400 bg-indigo-500/20' : 'hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Режим чтения (Firefox Reader Mode)"
            >
              <BookOpen size={14} />
            </button>

            {/* Firefox Tracking Protection Shield */}
            <div className="relative" ref={shieldRef}>
              <button
                onClick={() => setShowShieldMenu(!showShieldMenu)}
                className={`p-1 rounded flex items-center gap-1 text-xs transition-colors ${
                  adblockStats?.enabled 
                    ? 'text-emerald-400 hover:bg-emerald-500/10' 
                    : 'text-rose-400 hover:bg-rose-500/10'
                }`}
                title="Защита от слежения и рекламы (Apex Shield)"
              >
                {adblockStats?.enabled ? <Shield size={14} /> : <ShieldAlert size={14} />}
                {adblockStats?.blockedCount > 0 && (
                  <span className="font-mono text-[10px] bg-slate-800 px-1 rounded">
                    {adblockStats.blockedCount}
                  </span>
                )}
              </button>

              {/* Shield details popover */}
              {showShieldMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-xs z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-emerald-400" />
                      <div>
                        <div className="font-semibold text-slate-200">Apex Shield</div>
                        <div className="text-[11px] text-slate-400">Защита от трекеров и рекламы</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adblockStats?.enabled}
                        onChange={(e) => onToggleAdblock(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                  <div className="py-2.5 space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Заблокировано трекеров:</span>
                      <span className="font-bold text-emerald-400">{adblockStats?.blockedCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Правил блокировки:</span>
                      <span className="font-medium text-slate-300">{adblockStats?.patternCount || 0} фильтров</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Заголовки DNT / Sec-GPC:</span>
                      <span className="text-emerald-400 font-medium">Активны</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Omnibox Autocomplete & Unified Suggestions Dropdown */}
        {isFocused && unifiedSuggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
            {unifiedSuggestions.map((item, idx) => (
              <div
                key={idx}
                onMouseDown={() => handleSelectSuggestion(item)}
                className={`flex items-center px-3.5 py-2.5 cursor-pointer text-xs transition-colors border-b border-slate-800/40 last:border-0 ${
                  selectedIndex === idx ? 'bg-indigo-600/30 text-indigo-200' : 'hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                {item.type === 'history' ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center mr-2.5 shrink-0">
                      <Clock size={13} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="truncate font-medium text-slate-100">{item.title}</span>
                      <span className="truncate text-[11px] text-slate-400 font-mono">
                        {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold shrink-0 ml-2">
                      История
                    </span>
                  </>
                ) : item.type === 'bookmark' ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center mr-2.5 shrink-0">
                      <Star size={13} fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="truncate font-medium text-slate-100">{item.title}</span>
                      <span className="truncate text-[11px] text-slate-400 font-mono">
                        {item.url.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold shrink-0 ml-2">
                      Закладка
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center mr-2.5 shrink-0">
                      <Search size={13} />
                    </div>
                    <span className="flex-1 truncate text-slate-200">{item.query}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 ml-2">Поиск Google</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls & Tools */}
      <div className="flex items-center gap-1.5 app-no-drag">
        {/* Dark / Light Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`p-1.5 rounded-lg transition-colors ${
            isDarkMode ? 'text-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30' : 'text-amber-400 hover:bg-slate-800'
          }`}
          title={isDarkMode ? "Тёмная тема сайтов и браузера активна (кликните для смены)" : "Светлая тема (кликните для смены)"}
        >
          {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Password Manager */}
        <button
          onClick={onOpenPasswords}
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
          title="Менеджер паролей"
        >
          <Key size={16} />
        </button>

        {/* Browser Import Wizard */}
        <button
          onClick={onOpenImport}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
          title="Импорт паролей и закладок из других браузеров (Chrome, Edge, Firefox)"
        >
          <FolderDown size={16} />
        </button>

        {/* Edge Split Screen Toggle */}
        <button
          onClick={onToggleSplitScreen}
          className={`p-1.5 rounded-lg transition-colors ${
            splitScreen ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
          title="Разделить экран (Edge Split Screen)"
        >
          <SplitSquareVertical size={16} />
        </button>

        {/* Edge Right Utility Sidebar Toggle */}
        <button
          onClick={onToggleRightSidebar}
          className={`p-1.5 rounded-lg transition-colors ${
            rightSidebarOpen ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
          title="Боковая панель инструментов (Edge Sidebar)"
        >
          <PanelRight size={16} />
        </button>

        {/* Active Profile Quick Button */}
        <button
          onClick={onOpenProfiles}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800 text-xs text-slate-200 transition-colors border border-slate-800"
          title="Менеджер профилей (Сменить или создать профиль)"
        >
          <span className="text-sm">{activeProfile?.avatar || '🌐'}</span>
          <span className="max-w-[80px] truncate hidden sm:inline font-medium">{activeProfile?.name || 'Профиль'}</span>
          {activeProfile?.proxy?.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Прокси активен"></span>
          )}
        </button>

        {/* Window Controls (frameless titlebar) */}
        <div className="flex items-center ml-1 border-l border-slate-800 pl-1">
          <button
            onClick={onMinimize}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title="Свернуть"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={onMaximize}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            title={isMaximized ? "Восстановить" : "Развернуть"}
          >
            <Square size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-rose-600 text-slate-400 hover:text-white transition-colors"
            title="Закрыть"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
