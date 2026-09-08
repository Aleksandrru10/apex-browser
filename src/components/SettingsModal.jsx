import React, { useState, useEffect } from 'react';
import { 
  X, Settings, Search, Shield, Moon, Trash2, Info, Check, Sun, 
  Palette, Key, FolderDown, RefreshCw, Download, CheckCircle2, AlertCircle, Sparkles, ExternalLink 
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearHistory,
  adblockStats,
  onToggleAdblock,
  onOpenPasswords,
  onOpenImport
}) {
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | up_to_date | available | downloading | ready | error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedFilePath, setDownloadedFilePath] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (window.api?.updater?.onProgress) {
      const cleanup = window.api.updater.onProgress((p) => {
        setDownloadProgress(p.percent || 0);
      });
      return cleanup;
    }
  }, [isOpen]);

  const handleCheckUpdate = async () => {
    if (!window.api?.updater) return;
    setUpdateStatus('checking');
    setErrorMessage('');

    try {
      const res = await window.api.updater.check();
      if (res.success) {
        setUpdateInfo(res);
        if (res.hasUpdate) {
          setUpdateStatus('available');
        } else {
          setUpdateStatus('up_to_date');
        }
      } else {
        setUpdateStatus('error');
        setErrorMessage(res.message || res.error || 'Ошибка проверки обновлений');
      }
    } catch (e) {
      setUpdateStatus('error');
      setErrorMessage(e.message);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.api?.updater) return;
    if (!updateInfo?.downloadUrl) {
      alert('Установочный файл v' + (updateInfo?.latestVersion || '1.0.1') + ' сейчас передается на сервер GitHub. Пожалуйста, подождите 1-2 минуты завершения передачи и нажмите «Проверить обновления» еще раз.');
      return;
    }
    setUpdateStatus('downloading');
    setDownloadProgress(0);

    try {
      const res = await window.api.updater.download(updateInfo.downloadUrl);
      if (res.success && res.filePath) {
        setDownloadedFilePath(res.filePath);
        setUpdateStatus('ready');
      } else {
        setUpdateStatus('error');
        setErrorMessage(res.message || 'Ошибка загрузки установщика');
      }
    } catch (e) {
      setUpdateStatus('error');
      setErrorMessage(e.message);
    }
  };

  const handleInstallAndRestart = () => {
    if (!window.api?.updater || !downloadedFilePath) return;
    window.api.updater.install(downloadedFilePath);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Настройки браузера Apex</h2>
              <p className="text-[11px] text-slate-400">Конфигурация поиска, защиты, паролей и обновлений</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Search Engine */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
              <Search size={14} className="text-indigo-400" />
              <span>Поисковая система по умолчанию</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'google', name: 'Google' },
                { id: 'duckduckgo', name: 'DuckDuckGo (Приватный)' },
                { id: 'yandex', name: 'Яндекс' },
                { id: 'bing', name: 'Microsoft Bing' },
                { id: 'brave', name: 'Brave Search' }
              ].map(se => (
                <button
                  key={se.id}
                  onClick={() => onUpdateSettings({ searchEngine: se.id })}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    settings.searchEngine === se.id 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold' 
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {se.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tracking & Adblock (Firefox style) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                <Shield size={14} className="text-emerald-400" />
                <span>Защита от слежения и рекламы (Apex Shield)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={adblockStats?.enabled}
                  onChange={e => onToggleAdblock(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Блокирует рекламные баннеры, трекеры сбора данных, криптомайнеры и отправляет защитные заголовки Do Not Track & Global Privacy Control.
            </p>
          </div>

          {/* 3. Sleeping Tabs (Edge style) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                <Moon size={14} className="text-blue-400" />
                <span>Усыпление неактивных вкладок (Sleeping Tabs)</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sleepingTabsEnabled}
                  onChange={e => onUpdateSettings({ sleepingTabsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
            <p className="text-xs text-slate-400">
              Автоматически выгружает фоновые вкладки из оперативной памяти RAM после 10 минут простоя, экономя до 80% системных ресурсов.
            </p>
          </div>

          {/* 4. Theme & Dark Mode for Websites */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
              <Palette size={14} className="text-indigo-400" />
              <span>Оформление и тёмный режим сайтов</span>
            </div>

            {/* Theme selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'dark', name: '🌙 Тёмная (Dark)', desc: 'Для сайтов и интерфейса' },
                { id: 'light', name: '☀️ Светлая (Light)', desc: 'Классический светлый вид' },
                { id: 'system', name: '💻 Системная (Auto)', desc: 'Как в Windows' }
              ].map(th => (
                <button
                  key={th.id}
                  onClick={() => onUpdateSettings({ theme: th.id })}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    settings.theme === th.id 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold shadow' 
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-medium">{th.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{th.desc}</div>
                </button>
              ))}
            </div>

            {/* Force Dark Mode toggle */}
            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800 mt-2">
              <div>
                <div className="text-xs font-medium text-slate-200">
                  Принудительный тёмный режим (Force Dark Mode)
                </div>
                <div className="text-[11px] text-slate-400">
                  Автоматически затемняет сайты, у которых нет встроенной тёмной темы. YouTube, GitHub и Google используют свой официальный тёмный режим.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={settings.forceDark}
                  onChange={e => onUpdateSettings({ forceDark: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>
          </div>

          {/* 5. Privacy & Data */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider">История посещений</div>
                <div className="text-[11px] text-slate-400">Очистить историю веб-серфинга для всех профилей</div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Очистить всю историю посещений?')) {
                    onClearHistory();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-medium rounded-xl border border-rose-500/30 transition-colors"
              >
                <Trash2 size={13} />
                <span>Очистить</span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">Импорт данных из других браузеров</div>
                <div className="text-[11px] text-slate-400">
                  Мгновенный 1-клик перенос паролей, закладок и истории из Chrome, Edge, Firefox
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenImport) onOpenImport();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors shadow shrink-0 ml-2"
              >
                <FolderDown size={13} />
                <span>Мастер импорта...</span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              <div>
                <div className="text-xs font-medium text-slate-200">Менеджер паролей</div>
                <div className="text-[11px] text-slate-400">
                  Просмотр, редактирование, ручное добавление и экспорт сохраненных паролей
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenPasswords();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition-colors shrink-0 ml-2"
              >
                <Key size={13} />
                <span>Управление</span>
              </button>
            </div>
          </div>

          {/* 6. GitHub Auto-Update & Releases */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
                <Sparkles size={14} className="text-cyan-400" />
                <span>Обновление браузера (GitHub Releases)</span>
              </div>
              <button
                onClick={handleCheckUpdate}
                disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                <span>{updateStatus === 'checking' ? 'Проверка...' : 'Проверить обновления'}</span>
              </button>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Установленная версия:</span>
                <span className="font-mono font-bold text-slate-200">v1.0.0</span>
              </div>

              {updateStatus === 'up_to_date' && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                  <CheckCircle2 size={16} />
                  <span>У вас установлена самая последняя версия Apex Browser!</span>
                </div>
              )}

              {updateStatus === 'available' && updateInfo && (
                <div className="space-y-3 bg-indigo-500/10 border border-indigo-500/30 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-200">
                        Доступна новая версия: v{updateInfo.latestVersion}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {updateInfo.assetName} {updateInfo.assetSize ? `(${Math.round(updateInfo.assetSize / (1024 * 1024))} МБ)` : ''}
                      </div>
                    </div>

                    <button
                      onClick={handleDownloadUpdate}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                    >
                      <Download size={13} />
                      Скачать и обновить
                    </button>
                  </div>

                  {updateInfo.releaseNotes && (
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto">
                      <div className="font-bold text-slate-400 mb-1 text-[10px] uppercase tracking-wider">Что нового:</div>
                      {updateInfo.releaseNotes}
                    </div>
                  )}
                </div>
              )}

              {updateStatus === 'downloading' && (
                <div className="space-y-2 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-indigo-300 font-medium">Загрузка обновления из GitHub...</span>
                    <span className="font-mono text-indigo-400 font-bold">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {updateStatus === 'ready' && (
                <div className="flex items-center justify-between bg-emerald-500/15 border border-emerald-500/30 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 size={16} />
                    <span>Обновление загружено и готово к установке!</span>
                  </div>
                  <button
                    onClick={handleInstallAndRestart}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow"
                  >
                    Перезапустить и обновить
                  </button>
                </div>
              )}

              {updateStatus === 'error' && (
                <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage || 'Не удалось проверить или скачать обновление.'}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Apex Browser автоматически проверяет официальные релизы в репозитории GitHub. При выходе новой версии вы можете обновиться прямо из интерфейса в 1 клик.
              </p>
            </div>
          </div>

          {/* 7. About */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Info size={13} />
              <span>Apex Browser v1.0.0 (Chromium Core, Electron 34, React 19)</span>
            </div>
            <span>Fusion of Arc, Edge, Firefox & Chrome</span>
          </div>
        </div>
      </div>
    </div>
  );
}
