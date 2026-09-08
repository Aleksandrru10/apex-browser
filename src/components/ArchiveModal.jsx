import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Archive, Search, RotateCcw, Trash2, ExternalLink, Globe, Sparkles, Check, Clock, Layers
} from 'lucide-react';

export default function ArchiveModal({
  isOpen,
  onClose,
  archivedTabs = [],
  spaces = [],
  activeSpaceId,
  onRestoreTab,
  onRestoreAll,
  onDeleteArchivedTab,
  onClearArchive
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState('all');
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTabs = archivedTabs.filter(tab => {
    const matchesSearch = !searchQuery.trim() || 
      (tab.title && tab.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tab.url && tab.url.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSpace = selectedSpaceFilter === 'all' || tab.spaceId === selectedSpaceFilter;
    return matchesSearch && matchesSpace;
  });

  const formatArchivedDate = (ts) => {
    if (!ts) return 'Ранее';
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Сегодня, ${timeStr}`;
    return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Archive size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Архив вкладок (Arc Archive)</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {archivedTabs.length}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Здесь хранятся убранные из панели вкладки. Вы можете достать любую вкладку обратно в 1 клик.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            title="Закрыть (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        {/* Toolbar: Search + Filter + Mass Actions */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по архивированным страницам..."
                className="w-full bg-slate-950 text-xs text-slate-200 pl-8 pr-3 py-2 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none placeholder:text-slate-500 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {filteredTabs.length > 0 && (
              <button
                onClick={() => onRestoreAll(selectedSpaceFilter === 'all' ? activeSpaceId : selectedSpaceFilter)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold rounded-xl transition-all shadow-sm shrink-0"
                title="Восстановить все показанные вкладки"
              >
                <RotateCcw size={13} />
                <span>Восстановить все ({filteredTabs.length})</span>
              </button>
            )}

            {archivedTabs.length > 0 && (
              <button
                onClick={onClearArchive}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-medium rounded-xl transition-colors shrink-0"
                title="Очистить весь архив"
              >
                <Trash2 size={13} />
                <span>Очистить</span>
              </button>
            )}
          </div>

          {/* Spaces Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setSelectedSpaceFilter('all')}
              className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                selectedSpaceFilter === 'all'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              Все пространства ({archivedTabs.length})
            </button>
            {spaces.map(sp => {
              const count = archivedTabs.filter(t => t.spaceId === sp.id).length;
              return (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSpaceFilter(sp.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
                    selectedSpaceFilter === sp.id
                      ? 'bg-slate-800 text-slate-100 font-medium border border-slate-700'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sp.color || '#3b82f6' }} />
                  <span>{sp.name}</span>
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Archive Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[300px]">
          {filteredTabs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <Archive size={36} className="text-slate-600 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-400 mb-1">
                {searchQuery ? 'Ничего не найдено по запросу' : 'В архиве пока пусто'}
              </p>
              <p className="text-xs max-w-sm">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос.'
                  : 'Когда вы нажимаете кнопку архивации в боковой панели, закрытые вкладки сохраняются здесь и могут быть возвращены в любой момент.'}
              </p>
            </div>
          ) : (
            filteredTabs.map(item => {
              const space = spaces.find(s => s.id === item.spaceId);
              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between gap-3 p-2.5 bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700 rounded-xl transition-all"
                >
                  {/* Favicon & Title */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-800">
                      {item.favicon ? (
                        <img 
                          src={item.favicon} 
                          alt="" 
                          className="w-4 h-4 rounded" 
                          onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                      ) : (
                        <Globe size={13} className="text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-200 truncate flex items-center gap-2">
                        <span>{item.title || item.url}</span>
                        {space && (
                          <span 
                            className="text-[9px] px-1.5 py-0.2 rounded font-mono font-normal border"
                            style={{ 
                              color: space.color, 
                              borderColor: `${space.color}40`,
                              backgroundColor: `${space.color}15`
                            }}
                          >
                            {space.name}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-mono">
                        {item.url}
                      </div>
                    </div>
                  </div>

                  {/* Date & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock size={10} />
                      {formatArchivedDate(item.archivedAt)}
                    </span>

                    {/* Restore Button */}
                    <button
                      onClick={() => onRestoreTab(item)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                      title="Достать из архива и открыть вкладку"
                    >
                      <RotateCcw size={12} />
                      <span>Достать</span>
                    </button>

                    {/* Delete from archive */}
                    <button
                      onClick={() => onDeleteArchivedTab(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="Удалить навсегда из архива"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Закрепленные вкладки никогда не архивируются автоматически.</span>
          <span>Нажмите «Достать», чтобы вернуться к работе с вкладкой.</span>
        </div>
      </div>
    </div>
  );
}
