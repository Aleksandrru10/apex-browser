import React, { useState, useEffect } from 'react';
import { 
  Bot, Edit3, QrCode, Download, Star, History, X, Send, 
  Trash2, ExternalLink, FolderOpen, Play, Pause, FileText, Check
} from 'lucide-react';

export default function RightSidebar({
  isOpen,
  onClose,
  activeTab,
  onNavigate,
  downloads,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onOpenDownload,
  onShowDownloadInFolder,
  bookmarks,
  onDeleteBookmark,
  history,
  onClearHistory
}) {
  const [activeTool, setActiveTool] = useState('notes'); // 'ai', 'notes', 'qr', 'downloads', 'bookmarks', 'history'
  
  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', text: 'Привет! Я встроенный AI-ассистент Apex. Могу помочь структурировать мысли, ответить на вопросы или сделать выжимку из прочитанного.' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Search filters
  const [bmSearch, setBmSearch] = useState('');
  const [histSearch, setHistSearch] = useState('');

  // Load persistent notes
  useEffect(() => {
    if (window.api?.notes) {
      window.api.notes.get().then(res => {
        if (res?.content) setNoteContent(res.content);
      });
    }
  }, []);

  const handleSaveNotes = (val) => {
    setNoteContent(val);
    if (window.api?.notes) {
      window.api.notes.save(val);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1500);
    }
  };

  const handleSendAi = (e) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiTyping) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      let reply = `Ответ по запросу: "${userMsg}"\n\nЯ зафиксировал ваш вопрос. В браузере Apex все запросы и контекст остаются строго локальными в пределах текущего профиля.`;
      if (userMsg.toLowerCase().includes('страниц') || userMsg.toLowerCase().includes('ссылк')) {
        reply = `Текущая открытая вкладка: "${activeTab?.title || 'Страница'}" (${activeTab?.url || 'нет URL'}).\nВы можете скопировать данные в заметки или отправить ссылку по QR-коду!`;
      }
      setAiMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setIsAiTyping(false);
    }, 600);
  };

  if (!isOpen) return null;

  // Filtered bookmarks & history
  const filteredBookmarks = (bookmarks || []).filter(b => 
    b.title?.toLowerCase().includes(bmSearch.toLowerCase()) || 
    b.url?.toLowerCase().includes(bmSearch.toLowerCase())
  );

  const filteredHistory = (history || []).filter(h => 
    h.title?.toLowerCase().includes(histSearch.toLowerCase()) || 
    h.url?.toLowerCase().includes(histSearch.toLowerCase())
  );

  // QR Code URL generation using standard Google Chart / QR API
  const qrUrl = activeTab?.url && !activeTab.url.startsWith('apex://')
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeTab.url)}`
    : null;

  return (
    <aside className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-20 select-none shadow-2xl">
      {/* Top Header & Tool Selector Tabs */}
      <div className="p-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          <button
            onClick={() => setActiveTool('notes')}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              activeTool === 'notes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
            title="Заметки (Edge Drop / Easel)"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => setActiveTool('ai')}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              activeTool === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
            title="AI Помощник (Copilot)"
          >
            <Bot size={14} />
          </button>
          <button
            onClick={() => setActiveTool('qr')}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              activeTool === 'qr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
            title="QR-код страницы"
          >
            <QrCode size={14} />
          </button>
          <button
            onClick={() => setActiveTool('downloads')}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 relative ${
              activeTool === 'downloads' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
            title="Загрузки"
          >
            <Download size={14} />
            {downloads?.some(d => d.state === 'progressing') && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1 right-1 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTool('bookmarks')}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              activeTool === 'bookmarks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
            title="Закладки"
          >
            <Star size={14} />
          </button>
          <button
            onClick={() => setActiveTool('history')}
            className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
              activeTool === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
            title="История"
          >
            <History size={14} />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors ml-1"
          title="Закрыть панель"
        >
          <X size={15} />
        </button>
      </div>

      {/* Tool Content Views */}
      <div className="flex-1 overflow-hidden flex flex-col p-3">
        {/* 1. Quick Notes Tool */}
        {activeTool === 'notes' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Быстрые заметки</span>
              {noteSaved && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> Сохранено
                </span>
              )}
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => handleSaveNotes(e.target.value)}
              placeholder="Записывайте мысли, ссылки и выжимки... (сохраняется автоматически)"
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 resize-none font-mono leading-relaxed"
            />
          </div>
        )}

        {/* 2. AI Assistant Tool */}
        {activeTool === 'ai' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bot size={15} className="text-indigo-400" />
              <span>Apex Copilot AI</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl text-xs ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600/30 border border-indigo-500/30 text-indigo-100 ml-4' 
                      : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 mr-4 whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {isAiTyping && (
                <div className="p-2 rounded-xl bg-slate-800/40 text-slate-400 text-xs italic flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200"></div>
                  <span>Думаю...</span>
                </div>
              )}
            </div>
            <form onSubmit={handleSendAi} className="flex gap-1.5">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="Спросить ассистента..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl transition-colors"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}

        {/* 3. QR Code Tool */}
        {activeTool === 'qr' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
              QR-код текущей страницы
            </div>
            {qrUrl ? (
              <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-700 mb-3">
                <img src={qrUrl} alt="QR Code" className="w-44 h-44 rounded-lg" />
              </div>
            ) : (
              <div className="text-xs text-slate-500 mb-3">Откройте любую веб-страницу для генерации QR</div>
            )}
            <p className="text-xs text-slate-300 font-medium truncate max-w-full mb-1">
              {activeTab?.title}
            </p>
            <p className="text-[11px] text-slate-500 truncate max-w-full">
              {activeTab?.url}
            </p>
            <p className="text-[10px] text-indigo-400 mt-3">
              Отсканируйте камерой смартфона, чтобы открыть страницу на телефоне
            </p>
          </div>
        )}

        {/* 4. Downloads Tool */}
        {activeTool === 'downloads' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Загрузки</span>
              <span className="text-[11px] text-slate-500 font-mono">{(downloads || []).length} файлов</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {(downloads || []).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">Нет активных загрузок</div>
              ) : (
                downloads.map(dl => (
                  <div key={dl.id} className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-200 truncate flex-1 mr-2" title={dl.filename}>
                        {dl.filename}
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-1 rounded ${
                        dl.state === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        dl.state === 'progressing' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {dl.state === 'completed' ? 'Готово' : dl.state === 'progressing' ? `${dl.percent}%` : 'Отменено'}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {dl.state === 'progressing' && (
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${dl.percent}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {(dl.receivedBytes / (1024 * 1024)).toFixed(1)} / {(dl.totalBytes / (1024 * 1024)).toFixed(1)} МБ
                        {dl.speed > 0 && ` (${(dl.speed / 1024).toFixed(0)} КБ/с)`}
                      </span>
                      <div className="flex items-center gap-1">
                        {dl.state === 'progressing' ? (
                          <button onClick={() => onPauseDownload(dl.id)} className="p-1 hover:text-white" title="Пауза">
                            <Pause size={12} />
                          </button>
                        ) : dl.state === 'interrupted' ? (
                          <button onClick={() => onResumeDownload(dl.id)} className="p-1 hover:text-white" title="Продолжить">
                            <Play size={12} />
                          </button>
                        ) : null}

                        {dl.state === 'completed' && (
                          <>
                            <button onClick={() => onOpenDownload(dl.id)} className="p-1 hover:text-emerald-400" title="Открыть файл">
                              <ExternalLink size={12} />
                            </button>
                            <button onClick={() => onShowDownloadInFolder(dl.id)} className="p-1 hover:text-indigo-400" title="Показать в папке">
                              <FolderOpen size={12} />
                            </button>
                          </>
                        )}

                        {dl.state === 'progressing' && (
                          <button onClick={() => onCancelDownload(dl.id)} className="p-1 hover:text-rose-400" title="Отменить">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 5. Bookmarks Tool */}
        {activeTool === 'bookmarks' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">Закладки</div>
            <input
              type="text"
              value={bmSearch}
              onChange={e => setBmSearch(e.target.value)}
              placeholder="Поиск по закладкам..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 mb-2"
            />
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredBookmarks.map(bm => (
                <div
                  key={bm.id}
                  onClick={() => onNavigate(bm.url)}
                  className="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="text-slate-200 truncate font-medium">{bm.title}</div>
                    <div className="text-[10px] text-slate-500 truncate">{bm.url}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBookmark(bm.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
                    title="Удалить закладку"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. History Tool */}
        {activeTool === 'history' && (
          <div className="flex-1 flex flex-col h-full">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
              <span>История</span>
              <button
                onClick={onClearHistory}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-normal"
              >
                Очистить
              </button>
            </div>
            <input
              type="text"
              value={histSearch}
              onChange={e => setHistSearch(e.target.value)}
              placeholder="Поиск по истории..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 mb-2"
            />
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredHistory.map(item => (
                <div
                  key={item.id}
                  onClick={() => onNavigate(item.url)}
                  className="p-2 rounded-xl hover:bg-slate-800 cursor-pointer text-xs transition-colors"
                >
                  <div className="text-slate-200 truncate font-medium">{item.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{item.url}</div>
                  <div className="text-[9px] text-slate-600 mt-0.5">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
