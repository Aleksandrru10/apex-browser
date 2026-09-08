import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Upload, Download, Search, Eye, EyeOff, Copy, 
  Trash2, ExternalLink, HelpCircle, Check, X, ShieldCheck, Globe, FolderDown
} from 'lucide-react';

export default function PasswordModal({
  isOpen,
  onClose,
  onAutofillActiveTab,
  activeTabUrl,
  onOpenImport,
  initialSearch = ''
}) {
  const [passwords, setPasswords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [copiedField, setCopiedField] = useState(null); // 'user_id' or 'pwd_id'

  // Add form fields
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNote, setNewNote] = useState('');

  const loadPasswords = async () => {
    if (window.api?.passwords) {
      const list = await window.api.passwords.getAll();
      setPasswords(list || []);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPasswords();
      setSearchQuery(initialSearch || '');
      if (activeTabUrl && !activeTabUrl.startsWith('apex://')) {
        setNewUrl(activeTabUrl);
      }
    }
  }, [isOpen, activeTabUrl, initialSearch]);

  if (!isOpen) return null;

  const handleToggleShowPassword = (id) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить эту сохранённую учётную запись?')) {
      await window.api?.passwords.delete(id);
      loadPasswords();
    }
  };

  const handleImportCsv = async () => {
    if (!window.api?.passwords) return;
    const res = await window.api.passwords.pickAndImportCsv('all');
    if (res && res.success) {
      alert(`Успешно импортировано: ${res.count} паролей из файла ${res.filePath || ''}!`);
      loadPasswords();
    } else if (res && !res.canceled && res.message) {
      alert(res.message);
    }
  };

  const handleExportCsv = async () => {
    if (!window.api?.passwords) return;
    const csv = await window.api.passwords.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-passwords-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!newUrl.trim() || !newUsername.trim() || !newPassword.trim()) {
      alert('Пожалуйста, заполните URL, логин и пароль');
      return;
    }

    await window.api?.passwords.add({
      url: newUrl.trim(),
      name: newName.trim() || newUrl.trim(),
      username: newUsername.trim(),
      password: newPassword.trim(),
      note: newNote.trim()
    });

    setNewUrl('');
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewNote('');
    setShowAddForm(false);
    loadPasswords();
  };

  const filtered = passwords.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.url && item.url.toLowerCase().includes(q)) ||
      (item.domain && item.domain.toLowerCase().includes(q)) ||
      (item.username && item.username.toLowerCase().includes(q))
    );
  });

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Менеджер паролей Apex</span>
                <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                  {passwords.length} записей
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Импорт и автозаполнение паролей из Chrome, Edge и Firefox
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 ${
                showHelp ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Инструкция по экспорту паролей из других браузеров"
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">Как импортировать?</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick Instructions Banner */}
        {showHelp && (
          <div className="bg-indigo-950/40 border-b border-indigo-900/60 p-4 text-xs text-indigo-200 space-y-2 animate-in fade-in duration-150">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-indigo-400" />
              <span>Как выгрузить пароли из старого браузера за 1 минуту:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-800/40">
                <div className="font-bold text-indigo-300 mb-1">Google Chrome:</div>
                Откройте в Chrome: <code className="text-amber-300 select-all">https://passwords.google.com/options</code>
                <br />Нажмите «Экспорт паролей» → Скачать файл (.csv).
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-800/40">
                <div className="font-bold text-indigo-300 mb-1">Microsoft Edge:</div>
                Вставьте в строку браузера: <code className="text-amber-300 select-all">edge://wallet/passwords</code>
                <br />Кликните меню с тремя точками <kbd>...</kbd> → «Экспортировать пароли».
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-800/40">
                <div className="font-bold text-indigo-300 mb-1">Mozilla Firefox:</div>
                Вставьте в строку браузера: <code className="text-amber-300 select-all">about:logins</code>
                <br />Кликните меню <kbd>...</kbd> справа вверху → «Экспортировать логины».
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1">
              После скачивания нажмите кнопку <strong>«Импорт из файла (CSV)»</strong> ниже и выберите скачанный файл!
            </p>
          </div>
        )}

        {/* Actions bar */}
        <div className="p-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-slate-950/40">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по сайту, логину или email..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (onOpenImport) {
                  onClose();
                  onOpenImport();
                }
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition-colors shadow"
              title="С каких браузеров импортировать пароли (Chrome, Edge, Firefox)"
            >
              <FolderDown size={13} />
              <span>Импорт из браузеров...</span>
            </button>

            <button
              onClick={handleImportCsv}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-1.5 px-3 rounded-xl transition-colors border border-slate-700"
              title="Выбрать CSV-файл паролей, экспортированный из Chrome, Edge или Firefox"
            >
              <Upload size={13} />
              <span>Файл (CSV)</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded-xl transition-colors border border-slate-700"
            >
              <Plus size={13} />
              <span>Добавить</span>
            </button>

            {passwords.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-colors border border-slate-800"
                title="Экспортировать резервную копию всех паролей в CSV"
              >
                <Download size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Main Content: Add form or Password List */}
        <div className="flex-1 overflow-y-auto p-4">
          {showAddForm ? (
            <form onSubmit={handleSaveSubmit} className="max-w-md mx-auto space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
                Новая учетная запись
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Адрес сайта (URL)</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Название (опционально)</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Например: YouTube, Work Mail..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Логин / Email / Телефон</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Заметка (опционально)</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Дополнительная информация"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition-colors shadow"
                >
                  Сохранить
                </button>
              </div>
            </form>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Key size={24} />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">
                {passwords.length === 0 ? 'Пароли пока не добавлены' : 'Ничего не найдено'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {passwords.length === 0 
                  ? 'Вы можете перенести все пароли из Chrome, Edge или Firefox за пару кликов, нажав «Импорт из файла (CSV)».' 
                  : 'Попробуйте изменить поисковый запрос.'}
              </p>
              {passwords.length === 0 && (
                <button
                  onClick={handleImportCsv}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-4 rounded-xl transition-colors shadow"
                >
                  <Upload size={14} />
                  <span>Импортировать пароли из файла CSV</span>
                </button>
              )}
            </div>
          ) : (
            /* Passwords List Table */
            <div className="space-y-2">
              {filtered.map(item => {
                const isVisible = visiblePasswords.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 transition-colors text-xs"
                  >
                    {/* Site Info */}
                    <div className="min-w-[160px] flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <Globe size={13} className="text-indigo-400 shrink-0" />
                        <span className="truncate">{item.name || item.domain}</span>
                      </div>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-slate-500 hover:text-indigo-400 truncate flex items-center gap-1 mt-0.5"
                      >
                        <span className="truncate max-w-[200px]">{item.url}</span>
                        <ExternalLink size={9} />
                      </a>
                    </div>

                    {/* Username & Copy */}
                    <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 shrink-0">
                      <span className="text-slate-300 font-mono text-[11px] truncate max-w-[160px]" title={item.username}>
                        {item.username}
                      </span>
                      <button
                        onClick={() => handleCopy(item.username, `user_${item.id}`)}
                        className="p-1 hover:text-slate-100 text-slate-400 transition-colors"
                        title="Скопировать логин"
                      >
                        {copiedField === `user_${item.id}` ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>

                    {/* Password & Toggle / Copy */}
                    <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 shrink-0">
                      <span className="text-slate-300 font-mono text-[11px] min-w-[80px]">
                        {isVisible ? item.password : '••••••••••••'}
                      </span>
                      <button
                        onClick={() => handleToggleShowPassword(item.id)}
                        className="p-1 hover:text-slate-100 text-slate-400 transition-colors"
                        title={isVisible ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      <button
                        onClick={() => handleCopy(item.password, `pwd_${item.id}`)}
                        className="p-1 hover:text-slate-100 text-slate-400 transition-colors"
                        title="Скопировать пароль"
                      >
                        {copiedField === `pwd_${item.id}` ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {onAutofillActiveTab && (
                        <button
                          onClick={() => onAutofillActiveTab(item)}
                          className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-2.5 py-1 rounded-xl text-[11px] font-medium border border-indigo-500/30 transition-colors"
                          title="Автозаполнить в активной вкладке"
                        >
                          Вставить
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
                        title="Удалить пароль"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Все пароли хранятся строго локально на вашем ПК</span>
          </div>
          <span>Поддержка Chrome, Edge, Firefox, Bitwarden</span>
        </div>
      </div>
    </div>
  );
}
