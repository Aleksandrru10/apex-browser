import React, { useState, useEffect } from 'react';
import { Search, Globe, Shield, Sparkles, Plus, ExternalLink, FolderDown } from 'lucide-react';

const DEFAULT_SHORTCUTS = [
  { title: 'Google', url: 'https://www.google.com', icon: '🔍', color: '#4285F4' },
  { title: 'YouTube', url: 'https://www.youtube.com', icon: '▶️', color: '#FF0000' },
  { title: 'GitHub', url: 'https://github.com', icon: '🐙', color: '#24292e' },
  { title: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖', color: '#10a37f' },
  { title: 'Telegram Web', url: 'https://web.telegram.org', icon: '✈️', color: '#2AABEE' },
  { title: 'Wikipedia', url: 'https://ru.wikipedia.org', icon: '📚', color: '#636466' },
  { title: 'Reddit', url: 'https://www.reddit.com', icon: '👽', color: '#FF4500' },
  { title: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: '🦆', color: '#DE5833' }
];

export default function NewTabPage({
  onNavigate,
  activeProfile,
  activeSpace,
  adblockStats,
  onOpenImport
}) {
  const [query, setQuery] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const q = query.trim();
    if (q.startsWith('http://') || q.startsWith('https://')) {
      onNavigate(q);
    } else {
      onNavigate(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background glow circle */}
      <div 
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: activeProfile?.color || '#6366f1' }}
      ></div>

      <div className="w-full max-w-2xl flex flex-col items-center relative z-10">
        {/* Clock & Greeting */}
        <div className="text-center mb-8">
          <div className="text-6xl font-light tracking-tight text-white font-mono mb-2">
            {timeStr}
          </div>
          <div className="text-sm font-medium text-indigo-300/80 capitalize">
            {dateStr}
          </div>
        </div>

        {/* Central Search Bar */}
        <form onSubmit={handleSearch} className="w-full mb-8">
          <div className="flex items-center bg-slate-900/80 border border-slate-700/80 hover:border-indigo-500/60 focus-within:border-indigo-500 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-xl transition-all">
            <Search size={18} className="text-indigo-400 mr-3" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Искать в Google или ввести адрес сайта..."
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shadow"
            >
              Найти
            </button>
          </div>
        </form>

        {/* Speed Dial Shortcuts Grid */}
        <div className="w-full grid grid-cols-4 gap-3 mb-8">
          {DEFAULT_SHORTCUTS.map((sc, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(sc.url)}
              className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 transition-all shadow-md hover:scale-[1.02]"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow mb-2 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: `${sc.color}20`, border: `1px solid ${sc.color}40` }}
              >
                {sc.icon}
              </div>
              <span className="text-xs font-medium text-slate-300 truncate w-full text-center">
                {sc.title}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Migration & Import Banner */}
        <div 
          onClick={onOpenImport}
          className="w-full mb-6 p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 hover:border-indigo-500/50 cursor-pointer flex items-center justify-between transition-all group shadow-lg shadow-indigo-950/20"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <FolderDown size={16} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-200">
                Перенести пароли и закладки из Chrome, Edge или Firefox
              </div>
              <div className="text-[11px] text-slate-400">
                Нажмите здесь для быстрого импорта ваших данных в Apex Browser
              </div>
            </div>
          </div>
          <button 
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition-colors"
          >
            Импортировать
          </button>
        </div>

        {/* Status badges bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span>{activeProfile?.avatar || '🌐'}</span>
            <span className="text-slate-200 font-medium">{activeProfile?.name || 'Основной'}</span>
            {activeProfile?.proxy?.enabled && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-mono">
                {activeProfile.proxy.type?.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Sparkles size={13} style={{ color: activeSpace?.color || '#3b82f6' }} />
            <span className="text-slate-200 font-medium">Пространство: {activeSpace?.name || 'Общее'}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/70 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Shield size={13} className="text-emerald-400" />
            <span className="text-slate-200 font-medium">
              Заблокировано: {adblockStats?.blockedCount || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
