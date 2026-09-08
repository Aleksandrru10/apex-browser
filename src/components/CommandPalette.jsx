import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, SplitSquareVertical, Users, BookOpen, 
  Trash2, Shield, Moon, Edit3, Terminal, ExternalLink, ArrowRight, Key, FolderDown
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  tabs,
  onSelectTab,
  onNewTab,
  onToggleSplit,
  onOpenProfiles,
  onToggleReader,
  onToggleAdblock,
  onSleepTabs,
  onOpenDevTools,
  onNavigate,
  bookmarks,
  onOpenPasswords,
  onOpenImport
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Actions list
  const actions = [
    { id: 'act_new_tab', title: 'Создать новую вкладку', icon: Plus, shortcut: 'Ctrl+T', run: onNewTab },
    { id: 'act_import_browsers', title: 'С каких браузеров импортировать пароли и закладки?', icon: FolderDown, shortcut: '', run: onOpenImport },
    { id: 'act_passwords', title: 'Менеджер сохраненных паролей', icon: Key, shortcut: '', run: onOpenPasswords },
    { id: 'act_split', title: 'Разделить экран (Edge Split Screen)', icon: SplitSquareVertical, shortcut: 'Alt+S', run: onToggleSplit },
    { id: 'act_profiles', title: 'Менеджер профилей (Сменить или создать)', icon: Users, shortcut: 'Ctrl+Shift+M', run: onOpenProfiles },
    { id: 'act_reader', title: 'Режим чтения (Firefox Reader Mode)', icon: BookOpen, run: onToggleReader },
    { id: 'act_sleep', title: 'Усыпить фоновые вкладки (Экономия памяти Edge)', icon: Moon, run: onSleepTabs },
    { id: 'act_shield', title: 'Вкл/выкл защиту от рекламы и трекеров', icon: Shield, run: onToggleAdblock },
    { id: 'act_devtools', title: 'Открыть инструменты разработчика DevTools', icon: Terminal, shortcut: 'F12', run: onOpenDevTools },
  ];

  // Filter tabs
  const matchingTabs = tabs.filter(t => 
    !query || 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.url.toLowerCase().includes(query.toLowerCase())
  ).map(t => ({
    id: 'tab_' + t.id,
    type: 'tab',
    title: t.title || 'Вкладка',
    subtitle: t.url,
    icon: ExternalLink,
    tabId: t.id,
    run: () => onSelectTab(t.id)
  }));

  // Filter actions
  const matchingActions = actions.filter(a => 
    !query || a.title.toLowerCase().includes(query.toLowerCase())
  ).map(a => ({
    ...a,
    type: 'action'
  }));

  // Web search option
  const webSearchOption = query.trim() ? [{
    id: 'search_web',
    type: 'search',
    title: `Искать "${query}" в Интернете`,
    subtitle: 'Google Search',
    icon: Search,
    run: () => onNavigate(`https://www.google.com/search?q=${encodeURIComponent(query)}`)
  }] : [];

  const allItems = [...webSearchOption, ...matchingActions, ...matchingTabs];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = allItems[selectedIndex];
      if (target) {
        target.run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-start justify-center pt-24 z-50 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search size={18} className="text-indigo-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Введите команду, название вкладки или поисковый запрос..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />
          <kbd className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">Ничего не найдено</div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={15} className={isSelected ? 'text-white' : 'text-indigo-400'} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.shortcut && (
                    <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded ml-2 ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400'
                    }`}>
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Навигация: ↑ ↓ Стрелки</span>
          <span>Выбрать: Enter</span>
        </div>
      </div>
    </div>
  );
}
