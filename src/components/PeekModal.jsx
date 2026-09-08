import React, { useRef, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, Globe } from 'lucide-react';

export default function PeekModal({
  isOpen,
  url,
  partition,
  onClose,
  onOpenAsTab
}) {
  const [copied, setCopied] = React.useState(false);
  const webviewRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 z-50 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl h-[82vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Peek Top Header */}
        <div className="h-11 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0 flex-1 mr-4">
            <Globe size={14} className="text-indigo-400 shrink-0" />
            <span className="font-medium text-slate-200 truncate">{url}</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono shrink-0">
              Arc Peek
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Скопировать ссылку"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>

            <button
              onClick={() => {
                onOpenAsTab(url);
                onClose();
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1 px-3 rounded-xl transition-colors shadow"
              title="Открыть в качестве новой полноценной вкладки"
            >
              <ExternalLink size={13} />
              <span>Открыть во вкладке</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors ml-1"
              title="Закрыть предпросмотр (ESC)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Live Webview inside Peek preview */}
        <div className="flex-1 w-full h-full relative bg-slate-950">
          <webview
            ref={webviewRef}
            src={url}
            partition={partition || 'persist:profile_default'}
            allowpopups="true"
            className="w-full h-full border-0"
            style={{ width: '100%', height: '100%' }}
          ></webview>
        </div>
      </div>
    </div>
  );
}
