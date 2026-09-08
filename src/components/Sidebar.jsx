import React, { useState } from 'react';
import { 
  Plus, X, Volume2, VolumeX, Moon, Sparkles, Code, BookOpen, 
  Briefcase, Coffee, Compass, ChevronLeft, ChevronRight, Settings, 
  Search, Pin, Archive, Layers, ShieldCheck
} from 'lucide-react';

const SPACE_ICONS = {
  Sparkles: Sparkles,
  Code: Code,
  BookOpen: BookOpen,
  Briefcase: Briefcase,
  Coffee: Coffee,
  Compass: Compass
};

export default function Sidebar({
  spaces,
  activeSpaceId,
  onSelectSpace,
  onCreateSpace,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  pinnedTabs,
  onSelectPinnedTab,
  onUnpinTab,
  onTogglePinTab,
  activeProfile,
  onOpenProfiles,
  onOpenSettings,
  onOpenCommandPalette,
  onSleepInactiveTabs,
  onArchiveTabs,
  collapsed,
  onToggleCollapse,
  onTabContextMenu
}) {
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showAddSpace, setShowAddSpace] = useState(false);

  // Tabs for the currently selected space (pinned tabs first)
  const currentSpaceTabs = tabs.filter(t => t.spaceId === activeSpaceId);
  const pinnedSpaceTabs = currentSpaceTabs.filter(t => t.isPinned);
  const unpinnedSpaceTabs = currentSpaceTabs.filter(t => !t.isPinned);
  const orderedSpaceTabs = [...pinnedSpaceTabs, ...unpinnedSpaceTabs];
  const activeSpace = spaces.find(s => s.id === activeSpaceId) || spaces[0];

  const handleCreateSpaceSubmit = (e) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    const icons = ['Sparkles', 'Code', 'BookOpen', 'Briefcase', 'Coffee', 'Compass'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    onCreateSpace({
      name: newSpaceName.trim(),
      icon: randomIcon,
      color: randomColor,
      profileId: activeProfile?.id
    });
    setNewSpaceName('');
    setShowAddSpace(false);
  };

  return (
    <aside 
      className={`h-full bg-slate-900/90 border-r border-slate-800 flex flex-col transition-all duration-200 select-none ${
        collapsed ? 'w-14' : 'w-64'
      }`}
    >
      {/* Top Header: Profile & Settings */}
      <div className="p-2.5 border-b border-slate-800 flex items-center justify-between">
        {!collapsed ? (
          <div 
            onClick={onOpenProfiles}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors flex-1 mr-1"
            title="Менеджер профилей"
          >
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-md"
              style={{ backgroundColor: activeProfile?.color || '#3b82f6' }}
            >
              {activeProfile?.avatar || '🌐'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100 truncate flex items-center gap-1.5">
                {activeProfile?.name || 'Основной'}
                {activeProfile?.proxy?.enabled && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono px-1 rounded">
                    PROXY
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {activeProfile?.partition?.replace('persist:', '') || 'изоляция активна'}
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={onOpenProfiles}
            className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all text-base"
            style={{ backgroundColor: activeProfile?.color || '#3b82f6' }}
            title={`Профиль: ${activeProfile?.name}`}
          >
            {activeProfile?.avatar || '🌐'}
          </div>
        )}

        {!collapsed && (
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Настройки браузера"
            >
              <Settings size={15} />
            </button>
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Свернуть боковую панель"
            >
              <ChevronLeft size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Arc-style Spaces Switcher */}
      {!collapsed ? (
        <div className="px-2.5 py-2 border-b border-slate-800/60">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            <span>Пространства (Arc Spaces)</span>
            <button
              onClick={() => setShowAddSpace(!showAddSpace)}
              className="hover:text-slate-200 transition-colors"
              title="Добавить пространство"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Spaces Pills */}
          <div className="grid grid-cols-3 gap-1.5">
            {spaces.map(space => {
              const IconComponent = SPACE_ICONS[space.icon] || Sparkles;
              const isSelected = space.id === activeSpaceId;
              return (
                <button
                  key={space.id}
                  onClick={() => onSelectSpace(space.id)}
                  className={`flex flex-col items-center py-1.5 px-1 rounded-xl text-center transition-all ${
                    isSelected 
                      ? 'bg-slate-800/90 text-slate-100 shadow-sm border border-slate-700' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  style={{
                    borderBottomColor: isSelected ? space.color : 'transparent',
                    borderBottomWidth: isSelected ? '2px' : '0px'
                  }}
                  title={space.name}
                >
                  <IconComponent size={14} style={{ color: space.color }} />
                  <span className="text-[10px] font-medium truncate w-full mt-0.5">{space.name}</span>
                </button>
              );
            })}
          </div>

          {/* Add Space Input */}
          {showAddSpace && (
            <form onSubmit={handleCreateSpaceSubmit} className="mt-2 flex gap-1">
              <input
                type="text"
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setShowAddSpace(false);
                }}
                placeholder="Имя пространства..."
                className="flex-1 bg-slate-950 text-xs px-2 py-1 rounded-lg border border-slate-700 text-slate-200 outline-none focus:border-indigo-500"
                autoFocus
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg text-xs"
              >
                ОК
              </button>
              <button
                type="button"
                onClick={() => setShowAddSpace(false)}
                className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 text-xs"
                title="Отмена (ESC)"
              >
                <X size={13} />
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="py-2 flex flex-col items-center gap-1.5 border-b border-slate-800/60">
          {spaces.map(space => {
            const IconComponent = SPACE_ICONS[space.icon] || Sparkles;
            const isSelected = space.id === activeSpaceId;
            return (
              <button
                key={space.id}
                onClick={() => onSelectSpace(space.id)}
                className={`p-2 rounded-xl transition-all ${
                  isSelected ? 'bg-slate-800 text-slate-100 ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={space.name}
              >
                <IconComponent size={16} style={{ color: space.color }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Arc-style Pinned Favorites Dock */}
      <div className={`p-2 border-b border-slate-800/60 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {!collapsed && (
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
            <Pin size={11} />
            <span>Закрепленные</span>
          </div>
        )}
        <div className={`flex gap-1.5 ${collapsed ? 'flex-col' : 'flex-wrap'}`}>
          {pinnedTabs.map(pin => {
            const isPinActive = tabs.some(t => t.id === activeTabId && (t.url === pin.url || (pin.tabId && t.id === pin.tabId)));
            return (
              <div key={pin.id} className="relative group">
                <button
                  onClick={() => onSelectPinnedTab(pin)}
                  className={`p-1.5 rounded-xl transition-all flex items-center justify-center border ${
                    isPinActive 
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/80 shadow-sm ring-1 ring-indigo-500/50' 
                      : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                  title={`${pin.title} (${pin.url})`}
                >
                  {pin.favicon ? (
                    <img src={pin.favicon} alt="" className="w-4 h-4 rounded" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-4 h-4 rounded bg-indigo-600/30 flex items-center justify-center text-[9px] text-indigo-300 font-bold">
                      {pin.title[0]}
                    </div>
                  )}
                </button>
                {onUnpinTab && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnpinTab(pin);
                    }}
                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-full transition-opacity shadow z-10"
                    title="Открепить вкладку"
                  >
                    <X size={9} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edge & Arc Vertical Tabs List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!collapsed && (
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 px-1">
            <span>Вкладки ({currentSpaceTabs.length})</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onSleepInactiveTabs}
                className="hover:text-amber-400 transition-colors"
                title="Усыпить неактивные вкладки (Освободить ОЗУ как в Edge)"
              >
                <Moon size={12} />
              </button>
              <button
                onClick={onArchiveTabs}
                className="hover:text-indigo-400 transition-colors"
                title="Архивировать вкладки (Arc Auto-Archive)"
              >
                <Archive size={12} />
              </button>
            </div>
          </div>
        )}

        {orderedSpaceTabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (onTabContextMenu) onTabContextMenu(e, tab);
              }}
              className={`group relative flex items-center gap-2 p-1.5 rounded-xl cursor-pointer transition-all ${
                isActive 
                  ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              } ${collapsed ? 'justify-center p-2' : ''}`}
              title={`${tab.title} (${tab.url})`}
            >
              {/* Tab Favicon or Sleeping status */}
              <div className="relative shrink-0 flex items-center justify-center w-4 h-4">
                {tab.isSleeping ? (
                  <Moon size={13} className="text-amber-400" title="Вкладка спит (ОЗУ освобождена)" />
                ) : tab.isLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                ) : tab.favicon ? (
                  <img src={tab.favicon} alt="" className="w-4 h-4 rounded" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-4 h-4 rounded bg-slate-700 flex items-center justify-center text-[9px] text-slate-300">
                    {(tab.title || 'W')[0]}
                  </div>
                )}

                {/* Audio playing indicator */}
                {tab.isPlayingAudio && (
                  <span className="absolute -bottom-1 -right-1 text-emerald-400 bg-slate-900 rounded-full p-0.5 shadow">
                    <Volume2 size={8} />
                  </span>
                )}

                {/* Collapsed mode pinned indicator */}
                {collapsed && tab.isPinned && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full ring-1 ring-slate-900" title="Закрепленная вкладка" />
                )}
              </div>

              {/* Title (hidden when collapsed) */}
              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  {tab.isPinned && (
                    <Pin size={10} className="text-indigo-400 shrink-0" title="Закрепленная вкладка" />
                  )}
                  <p className={`text-xs truncate ${tab.isPinned ? 'font-medium text-slate-100' : 'font-normal'}`}>
                    {tab.title || 'Новая вкладка'}
                  </p>
                </div>
              )}

              {/* Sleeping badge */}
              {!collapsed && tab.isSleeping && (
                <span className="text-[10px] text-amber-400/80 font-mono">💤</span>
              )}

              {/* Action Buttons on Hover */}
              {!collapsed && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  {tab.isPinned && onTogglePinTab && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinTab(tab);
                      }}
                      className="p-1 hover:bg-slate-700 rounded text-indigo-300 hover:text-indigo-100 transition-colors"
                      title="Открепить вкладку"
                    >
                      <Pin size={11} className="rotate-45" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-100 transition-colors"
                    title={tab.isPinned ? "Закрыть и открепить вкладку (Ctrl + W)" : "Закрыть вкладку (Ctrl + W)"}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: New Tab, Command Palette & Collapse toggle */}
      <div className="p-2 border-t border-slate-800/80 flex flex-col gap-1.5">
        {/* New Tab Button */}
        <button
          onClick={onNewTab}
          className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-1.5 px-3 text-xs font-medium transition-colors shadow-md ${
            collapsed ? 'p-2' : ''
          }`}
          title="Новая вкладка (Ctrl + T)"
        >
          <Plus size={15} />
          {!collapsed && <span>Новая вкладка</span>}
        </button>

        {/* Command Palette Button (Arc-style Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className={`flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl py-1.5 px-2.5 text-xs transition-colors border border-slate-800 ${
            collapsed ? 'justify-center p-2' : ''
          }`}
          title="Командная строка (Ctrl + K)"
        >
          <div className="flex items-center gap-1.5">
            <Search size={13} />
            {!collapsed && <span>Команды...</span>}
          </div>
          {!collapsed && (
            <kbd className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
              Ctrl+K
            </kbd>
          )}
        </button>

        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors mx-auto"
            title="Развернуть боковую панель"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
