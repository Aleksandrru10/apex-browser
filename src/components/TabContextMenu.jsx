import React, { useEffect, useRef } from 'react';
import { 
  RotateCw, Copy, Pin, Moon, RefreshCw, SplitSquareVertical, 
  Volume2, VolumeX, Link, X, Trash2, ArrowDown, Folder, FolderPlus, FolderMinus
} from 'lucide-react';

export default function TabContextMenu({
  isOpen,
  position,
  tab,
  onClose,
  onReload,
  onDuplicate,
  onTogglePin,
  onToggleSleep,
  onSplit,
  onToggleMute,
  onCopyUrl,
  onCloseTab,
  onCloseOtherTabs,
  onCloseTabsBelow,
  pinnedFolders = [],
  onMovePinToFolder,
  onCreatePinnedFolder
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !tab) return null;

  // Ensure menu stays within viewport
  const menuWidth = 240;
  const menuHeight = 360;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return (
    <div 
      ref={menuRef}
      style={{ left: `${x}px`, top: `${y}px` }}
      className="fixed z-50 w-60 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl py-1.5 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={e => e.stopPropagation()}
    >
      {/* Tab Title Header */}
      <div className="px-3 py-1.5 border-b border-slate-800/80 mb-1">
        <div className="font-semibold text-slate-100 truncate text-[11px]">{tab.title || 'Вкладка'}</div>
        <div className="text-[10px] text-slate-500 truncate">{tab.url}</div>
      </div>

      {/* Menu Actions */}
      <button
        onClick={() => { onReload(tab.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left"
      >
        <RotateCw size={13} className="text-slate-400 group-hover:text-white" />
        <span className="flex-1">Перезагрузить вкладку</span>
        <kbd className="text-[9px] opacity-60 font-mono">Ctrl+R</kbd>
      </button>

      <button
        onClick={() => { onDuplicate(tab); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left"
      >
        <Copy size={13} className="text-slate-400" />
        <span>Дублировать вкладку</span>
      </button>

      <button
        onClick={() => { onTogglePin(tab); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left"
      >
        <Pin size={13} className="text-slate-400" />
        <span>{tab.isPinned ? 'Открепить вкладку' : 'Закрепить вкладку'}</span>
      </button>

      {tab.isPinned && (
        <>
          <div className="h-px bg-slate-800/80 my-1"></div>
          <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">Папка для вкладки</div>
          {tab.folderId && onMovePinToFolder && (
            <button
              onClick={() => { onMovePinToFolder(tab.id, null); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-600/30 text-rose-300 hover:text-rose-100 transition-colors text-left"
            >
              <FolderMinus size={13} />
              <span>Убрать из папки</span>
            </button>
          )}
          {pinnedFolders.map(f => (
            <button
              key={f.id}
              onClick={() => { if (onMovePinToFolder) onMovePinToFolder(tab.id, f.id); onClose(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left ${tab.folderId === f.id ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : ''}`}
            >
              <Folder size={13} style={{ color: f.color || '#3b82f6' }} />
              <span className="truncate flex-1">Папка: {f.name}</span>
              {tab.folderId === f.id && <span className="text-[10px]">✓</span>}
            </button>
          ))}
          {onCreatePinnedFolder && (
            <button
              onClick={() => {
                const name = prompt('Введите название папки:');
                if (name && name.trim()) {
                  onCreatePinnedFolder(name.trim(), tab.id);
                }
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left text-indigo-400 hover:text-white"
            >
              <FolderPlus size={13} />
              <span>+ Создать папку...</span>
            </button>
          )}
        </>
      )}

      <div className="h-px bg-slate-800/80 my-1"></div>

      {/* Sleep / Wake Tab */}
      <button
        onClick={() => { onToggleSleep(tab.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-amber-600 hover:text-white text-amber-300 transition-colors text-left"
      >
        {tab.isSleeping ? (
          <>
            <RefreshCw size={13} />
            <span className="flex-1">Разбудить вкладку</span>
          </>
        ) : (
          <>
            <Moon size={13} />
            <span className="flex-1">Усыпить вкладку (Освободить ОЗУ)</span>
            <span className="text-[9px] font-mono bg-amber-500/20 px-1 rounded">RAM</span>
          </>
        )}
      </button>

      {/* Split Screen with this tab */}
      <button
        onClick={() => { onSplit(tab.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left"
      >
        <SplitSquareVertical size={13} className="text-slate-400" />
        <span className="flex-1">Открыть в Split Screen</span>
        <kbd className="text-[9px] opacity-60 font-mono">Alt+S</kbd>
      </button>

      {/* Mute Audio */}
      <button
        onClick={() => { onToggleMute(tab.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left"
      >
        {tab.isMuted ? (
          <>
            <Volume2 size={13} className="text-slate-400" />
            <span>Включить звук</span>
          </>
        ) : (
          <>
            <VolumeX size={13} className="text-slate-400" />
            <span>Отключить звук на вкладке</span>
          </>
        )}
      </button>

      {/* Copy URL */}
      <button
        onClick={() => { onCopyUrl(tab.url); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors text-left"
      >
        <Link size={13} className="text-slate-400" />
        <span>Скопировать адрес ссылки</span>
      </button>

      <div className="h-px bg-slate-800/80 my-1"></div>

      {/* Close Options */}
      <button
        onClick={() => { onCloseTab(tab.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-600 hover:text-white text-rose-300 transition-colors text-left"
      >
        <X size={13} />
        <span className="flex-1">Закрыть вкладку</span>
        <kbd className="text-[9px] opacity-60 font-mono">Ctrl+W</kbd>
      </button>

      <button
        onClick={() => { onCloseOtherTabs(tab.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-left"
      >
        <Trash2 size={13} />
        <span>Закрыть другие вкладки</span>
      </button>

      <button
        onClick={() => { onCloseTabsBelow(tab.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors text-left"
      >
        <ArrowDown size={13} />
        <span>Закрыть вкладки снизу</span>
      </button>
    </div>
  );
}
