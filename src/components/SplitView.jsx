import React, { useState, useRef, useEffect } from 'react';
import WebTab from './WebTab';
import NewTabPage from './NewTabPage';
import { ArrowLeftRight, X, ExternalLink } from 'lucide-react';

export default function SplitView({
  activeTab,
  splitTab,
  allTabs,
  onSelectSplitTab,
  onSwapSplitTabs,
  onCloseSplit,
  activeProfile,
  activeSpace,
  adblockStats,
  onUpdateTab,
  onNewWindow,
  onWakeTab,
  onNavigateTab,
  webviewRefCallback,
  isDarkMode = true,
  forceDark = false
}) {
  const [splitPercent, setSplitPercent] = useState(50);
  const isDragging = useRef(false);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const containerWidth = window.innerWidth;
      const newPercent = Math.min(80, Math.max(20, (e.clientX / containerWidth) * 100));
      setSplitPercent(newPercent);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const otherTabs = allTabs.filter(t => t.id !== activeTab?.id);

  return (
    <div className="w-full h-full flex relative overflow-hidden bg-slate-950">
      {/* Left Pane (Active Tab) */}
      <div 
        className="h-full flex flex-col relative overflow-hidden"
        style={{ width: `${splitPercent}%` }}
      >
        <div className="h-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-3 text-[11px] text-slate-400 select-none">
          <span className="truncate font-medium text-slate-200">Левая панель: {activeTab?.title}</span>
          <span className="text-[10px] text-indigo-400 font-mono">АКТИВНА</span>
        </div>
        <div className="flex-1 w-full h-full relative">
          {activeTab?.url === 'apex://newtab' ? (
            <NewTabPage 
              onNavigate={(url) => onNavigateTab(activeTab.id, url)}
              activeProfile={activeProfile}
              activeSpace={activeSpace}
              adblockStats={adblockStats}
            />
          ) : (
            <WebTab
              tab={activeTab}
              isActive={true}
              partition={activeProfile?.partition}
              onUpdateTab={onUpdateTab}
              onNewWindow={onNewWindow}
              onWakeTab={onWakeTab}
              webviewRefCallback={webviewRefCallback}
              isDarkMode={isDarkMode}
              forceDark={forceDark}
            />
          )}
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 h-full bg-slate-800 hover:bg-indigo-500 cursor-col-resize transition-colors flex items-center justify-center z-10 select-none"
        title="Перетащите для изменения пропорции разделения экрана"
      >
        <div className="w-0.5 h-8 bg-slate-600 rounded"></div>
      </div>

      {/* Right Pane (Split Tab) */}
      <div 
        className="h-full flex flex-col relative overflow-hidden"
        style={{ width: `${100 - splitPercent}%` }}
      >
        <div className="h-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between px-3 text-[11px] text-slate-400 select-none">
          <div className="flex items-center gap-2 truncate flex-1 mr-2">
            <span className="truncate font-medium text-slate-200">
              Правая панель: {splitTab ? splitTab.title : 'Выберите вкладку'}
            </span>
            {splitTab && (
              <select
                value={splitTab.id}
                onChange={e => onSelectSplitTab(e.target.value)}
                className="bg-slate-950 text-slate-300 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] outline-none"
              >
                {allTabs.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onSwapSplitTabs}
              className="p-1 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
              title="Поменять вкладки местами"
            >
              <ArrowLeftRight size={12} />
            </button>
            <button
              onClick={onCloseSplit}
              className="p-1 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
              title="Закрыть режим разделения экрана"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div className="flex-1 w-full h-full relative">
          {splitTab ? (
            splitTab.url === 'apex://newtab' ? (
              <NewTabPage 
                onNavigate={(url) => onNavigateTab(splitTab.id, url)}
                activeProfile={activeProfile}
                activeSpace={activeSpace}
                adblockStats={adblockStats}
              />
            ) : (
              <WebTab
                tab={splitTab}
                isActive={true}
                partition={activeProfile?.partition}
                onUpdateTab={onUpdateTab}
                onNewWindow={onNewWindow}
                onWakeTab={onWakeTab}
                webviewRefCallback={webviewRefCallback}
                isDarkMode={isDarkMode}
                forceDark={forceDark}
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-slate-950">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Выберите вкладку для разделения</h4>
              <div className="w-full max-w-xs space-y-1.5">
                {otherTabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onSelectSplitTab(t.id)}
                    className="w-full p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-left truncate text-slate-200 transition-colors"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
