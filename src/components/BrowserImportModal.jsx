import React, { useState, useEffect } from 'react';
import { 
  X, Check, Compass, Flame, Globe, Sparkles, Shield, 
  FolderDown, Key, Star, Clock, ArrowRight, Upload, ExternalLink, 
  RefreshCw, CheckCircle2, AlertCircle, Zap, ShieldCheck, Download
} from 'lucide-react';

function ChromeIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#ea4335" strokeWidth="2" strokeDasharray="63" strokeDashoffset="0" />
      <circle cx="12" cy="12" r="4" fill="#4285f4" />
      <path d="M12 2a10 10 0 0 1 8.66 5H12" stroke="#ea4335" strokeWidth="2" strokeLinecap="round" />
      <path d="M20.66 7A10 10 0 0 1 12 22l4.33-7.5" stroke="#fbbc05" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 22A10 10 0 0 1 3.34 7l7.66 4.4" stroke="#34a853" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function BrowserImportModal({
  isOpen,
  onClose,
  onImportComplete
}) {
  const [browsers, setBrowsers] = useState([]);
  const [selectedBrowserId, setSelectedBrowserId] = useState('firefox');
  const [loading, setLoading] = useState(true);
  
  // What to import
  const [importPasswords, setImportPasswords] = useState(true);
  const [importBookmarks, setImportBookmarks] = useState(true);
  const [importHistory, setImportHistory] = useState(true);

  // States: 'select' | 'importing' | 'watcher_active' | 'success'
  const [stage, setStage] = useState('select');
  const [importResult, setImportResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen && window.api?.importer) {
      setLoading(true);
      setStage('select');
      setImportResult(null);

      window.api.importer.detect().then(detected => {
        setBrowsers(detected || []);
        if (detected && detected.length > 0) {
          // Prefer Firefox (since it has 100% 1-click password decryption) or Chrome
          const pref = detected.find(b => b.id === 'firefox') || detected.find(b => b.id === 'chrome') || detected[0];
          setSelectedBrowserId(pref.id);
        }
        setLoading(false);
      }).catch(err => {
        console.error('Error detecting browsers:', err);
        setLoading(false);
      });
    }

    return () => {
      if (window.api?.importer?.stopAutoWatcher) {
        window.api.importer.stopAutoWatcher();
      }
    };
  }, [isOpen]);

  // Listen for background auto-watcher detection (Chrome/Edge CSV export)
  useEffect(() => {
    if (!isOpen || !window.api?.importer?.onAutoWatcherSuccess) return;

    const cleanup = window.api.importer.onAutoWatcherSuccess((res) => {
      if (res && res.success) {
        setImportResult(prev => {
          const next = {
            ...prev,
            passwordsCount: (prev?.passwordsCount || 0) + res.count,
            passwordsSuccess: true,
            message: res.message
          };
          return next;
        });
        setStage('success');
        if (onImportComplete) onImportComplete();
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [isOpen, onImportComplete]);

  if (!isOpen) return null;

  const selectedBrowser = browsers.find(b => b.id === selectedBrowserId) || browsers[0];

  const getBrowserIcon = (iconName, color) => {
    const props = { size: 24, style: { color } };
    switch (iconName) {
      case 'Chrome': return <ChromeIcon size={22} />;
      case 'Compass': return <Compass {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Globe': return <Globe {...props} />;
      case 'Sparkles': return <Sparkles {...props} />;
      case 'Shield': return <Shield {...props} />;
      default: return <Globe {...props} />;
    }
  };

  const handleExecute1ClickImport = async () => {
    if (!selectedBrowserId || !window.api?.importer) return;
    setStage('importing');

    const summary = {
      browserName: selectedBrowser?.name || 'Браузер',
      browserId: selectedBrowserId,
      bookmarksCount: 0,
      historyCount: 0,
      passwordsCount: 0,
      passwordsSuccess: false,
      passwordsNeeded: importPasswords
    };

    try {
      // 1. Direct Bookmarks Import (100% 1-click for all browsers)
      if (importBookmarks) {
        const bmRes = await window.api.importer.importBookmarks(selectedBrowserId);
        if (bmRes && bmRes.success) {
          summary.bookmarksCount = bmRes.count;
        }
      }

      // 2. Direct History Import (100% 1-click for all browsers)
      if (importHistory) {
        const hRes = await window.api.importer.importHistory(selectedBrowserId);
        if (hRes && hRes.success) {
          summary.historyCount = hRes.count;
        }
      }

      // 3. Passwords Import
      if (importPasswords) {
        if (selectedBrowser?.type === 'firefox') {
          // Firefox has native 100% 1-click password decryption!
          const pwRes = await window.api.importer.importPasswords(selectedBrowserId);
          if (pwRes && pwRes.success) {
            summary.passwordsCount = pwRes.count;
            summary.passwordsSuccess = true;
          }
          setImportResult(summary);
          setStage('success');
          if (onImportComplete) onImportComplete();
          return;
        } else {
          // For Chromium (Chrome, Edge):
          // Check if a password CSV was already saved recently
          const scanRes = await window.api.importer.scanDownloads(true);
          if (scanRes && scanRes.success) {
            summary.passwordsCount = scanRes.count;
            summary.passwordsSuccess = true;
            setImportResult(summary);
            setStage('success');
            if (onImportComplete) onImportComplete();
            return;
          }

          // Otherwise, show guided assistant screen (do not unexpectedly pop open Chrome)
          setImportResult(summary);
          setStage('passwords_guide');
          return;
        }
      }

      setImportResult(summary);
      setStage('success');
      if (onImportComplete) onImportComplete();
    } catch (e) {
      console.error('Import execution error:', e);
      setImportResult(summary);
      setStage('success');
    }
  };

  const handleStartExportAndWatcher = async () => {
    setStage('watcher_active');
    if (window.api?.importer) {
      await window.api.importer.startAutoWatcher();
      await window.api.importer.openPasswordsPage(selectedBrowserId);
    }
  };

  const handleReopenExportPage = async () => {
    if (window.api?.importer) {
      await window.api.importer.openPasswordsPage(selectedBrowserId);
    }
  };

  const handleManualScanDownloads = async () => {
    if (!window.api?.importer) return;
    try {
      const res = await window.api.importer.scanDownloads(true);
      if (res && res.success) {
        setImportResult(prev => ({
          ...prev,
          passwordsCount: res.count,
          passwordsSuccess: true
        }));
        setStage('success');
        if (onImportComplete) onImportComplete();
      } else {
        alert(res.message || 'Файл паролей пока не появился в Загрузках. Нажмите "Экспорт" в Chrome и подтвердите сохранение.');
      }
    } catch (e) {
      alert('Ошибка при проверке Загрузок: ' + e.message);
    }
  };

  const handlePickCsvFile = async () => {
    if (!window.api?.passwords) return;
    try {
      const res = await window.api.passwords.pickAndImportCsv();
      if (res && res.success) {
        setImportResult(prev => ({
          ...prev,
          passwordsCount: res.count,
          passwordsSuccess: true
        }));
        setStage('success');
        if (onImportComplete) onImportComplete();
      }
    } catch (e) {}
  };

  const handlePickHtmlFile = async () => {
    if (!window.api?.bookmarks?.pickAndImportHtml) return;
    try {
      const res = await window.api.bookmarks.pickAndImportHtml();
      if (res && res.success) {
        setImportResult(prev => ({
          ...prev,
          bookmarksCount: res.count
        }));
        setStage('success');
        if (onImportComplete) onImportComplete();
      }
    } catch (e) {}
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const fname = file.name.toLowerCase();
      if (fname.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target.result;
          if (window.api?.passwords) {
            const res = await window.api.passwords.importCsv(content);
            if (res.success) {
              setImportResult(prev => ({
                ...prev,
                passwordsCount: res.count,
                passwordsSuccess: true
              }));
              setStage('success');
              if (onImportComplete) onImportComplete();
            } else {
              alert(res.message || 'Ошибка импорта файла паролей');
            }
          }
        };
        reader.readAsText(file);
      } else if (fname.endsWith('.html') || fname.endsWith('.htm')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target.result;
          if (window.api?.bookmarks?.importHtml) {
            const res = await window.api.bookmarks.importHtml(content);
            if (res.success) {
              setImportResult(prev => ({
                ...prev,
                bookmarksCount: res.count
              }));
              setStage('success');
              if (onImportComplete) onImportComplete();
            } else {
              alert(res.message || 'Ошибка импорта файла закладок');
            }
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const getBrowserExportGuide = (browser) => {
    const id = browser?.id || 'chrome';
    const name = browser?.name || 'Браузер';
    switch (id) {
      case 'edge':
        return {
          title: `Перенос паролей из Microsoft Edge`,
          description: `Microsoft Edge защищает пароли технологией Windows DPAPI. Apex Browser поможет автоматически перенести их:`,
          openBtnText: `Открыть пароли Microsoft Edge`,
          step1: `Нажмите кнопку «Открыть пароли Microsoft Edge» ниже.`,
          step2: `В Edge в разделе «Пароли» нажмите кнопку «···» (три точки) рядом с поиском → «Экспорт паролей» и введите PIN/пароль Windows.`,
          step3: `✨ Apex Browser автоматически перехватит файл при сохранении, перенесет все пароли и удалит временный файл!`,
          waitingTitle: `Ожидание сохранения паролей из Microsoft Edge...`,
          waitingDesc: `Страница настроек Edge открыта. Нажмите «···» → «Экспорт паролей» и подтвердите сохранение.`
        };
      case 'opera':
        return {
          title: `Перенос паролей из Opera`,
          description: `Apex Browser поможет безопасно перенести сохраненные пароли из Opera:`,
          openBtnText: `Открыть настройки паролей Opera`,
          step1: `Нажмите кнопку «Открыть настройки паролей Opera» ниже.`,
          step2: `В открывшемся окне Opera нажмите кнопку «···» рядом с паролями → «Экспорт паролей».`,
          step3: `✨ Apex Browser автоматически перехватит файл при сохранении в Загрузки!`,
          waitingTitle: `Ожидание сохранения паролей из Opera...`,
          waitingDesc: `Настройки паролей Opera открыты. Нажмите «···» → «Экспорт паролей».`
        };
      case 'yandex':
        return {
          title: `Перенос паролей из Яндекс Браузера`,
          description: `Apex Browser поможет перенести пароли из Яндекс Браузера:`,
          openBtnText: `Открыть менеджер паролей Яндекс`,
          step1: `Нажмите кнопку «Открыть менеджер паролей Яндекс» ниже.`,
          step2: `В Яндекс Браузере откройте меню паролей → «Экспорт паролей».`,
          step3: `✨ Apex Browser автоматически перехватит файл при сохранении!`,
          waitingTitle: `Ожидание сохранения паролей из Яндекс Браузера...`,
          waitingDesc: `Менеджер паролей открыт. Нажмите «Экспорт паролей» и подтвердите.`
        };
      case 'brave':
        return {
          title: `Перенос паролей из Brave Browser`,
          description: `Apex Browser поможет перенести пароли из Brave:`,
          openBtnText: `Открыть настройки паролей Brave`,
          step1: `Нажмите кнопку «Открыть настройки паролей Brave» ниже.`,
          step2: `В Brave нажмите «···» рядом со списком паролей → «Экспорт паролей».`,
          step3: `✨ Apex Browser автоматически перехватит файл при сохранении!`,
          waitingTitle: `Ожидание сохранения паролей из Brave...`,
          waitingDesc: `Настройки Brave открыты. Нажмите «···» → «Экспорт паролей».`
        };
      case 'chrome':
      default:
        return {
          title: `Перенос паролей из Google Chrome`,
          description: `Google Chrome v127+ блокирует прямое чтение паролей сторонними приложениями (App-Bound Encryption). Apex Browser поможет автоматически перенести их:`,
          openBtnText: `Открыть Google Passwords для экспорта`,
          step1: `Нажмите кнопку «Открыть Google Passwords для экспорта» ниже.`,
          step2: `В открывшейся вкладке нажмите кнопку «Экспорт паролей» → «Скачать файл» и введите PIN/пароль Windows.`,
          step3: `✨ Apex Browser автоматически перехватит файл при сохранении, добавит все пароли и удалит временный файл!`,
          waitingTitle: `Ожидание сохранения паролей из Google Chrome...`,
          waitingDesc: `Страница Google Passwords открыта. Нажмите «Экспорт паролей» → «Скачать файл».`
        };
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropFile}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <FolderDown size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Импорт данных из других браузеров
              </h2>
              <p className="text-xs text-slate-400">
                Перенос паролей, закладок и журнала истории в 1 клик
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {stage === 'passwords_guide' ? (
            /* Passwords Guide for Chromium (Chrome/Edge/Opera/Yandex/Brave) */
            (() => {
              const guide = getBrowserExportGuide(selectedBrowser);
              return (
                <div className="py-2 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  {/* Success note for Bookmarks and History */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        Закладки ({importResult?.bookmarksCount || 0}) и история ({importResult?.historyCount || 0}) уже успешно перенесены!
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Они уже добавлены в ваш профиль Apex Browser.
                      </div>
                    </div>
                  </div>

                  {/* Passwords Assistant Card */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                        <Key size={22} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">
                          {guide.title} ({selectedBrowser?.passwordCount || 0} паролей)
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {guide.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 bg-slate-900/70 p-4 rounded-xl border border-slate-700/40 text-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                          1
                        </div>
                        <div className="text-slate-300">
                          {guide.step1}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                          2
                        </div>
                        <div className="text-slate-300">
                          {guide.step2}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                          3
                        </div>
                        <div className="text-emerald-400 font-medium">
                          {guide.step3}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        onClick={handleStartExportAndWatcher}
                        className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all"
                      >
                        <ExternalLink size={14} />
                        {guide.openBtnText}
                      </button>

                      <button
                        onClick={handlePickCsvFile}
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Upload size={13} />
                        Выбрать файл .csv
                      </button>

                      <button
                        onClick={() => setStage('success')}
                        className="w-full sm:w-auto px-4 py-2.5 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors text-center"
                      >
                        Завершить (без паролей)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : stage === 'watcher_active' ? (
            /* Live Auto-Watcher Assistant View */
            (() => {
              const guide = getBrowserExportGuide(selectedBrowser);
              return (
                <div className="py-2 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                    <div className="w-16 h-16 rounded-full bg-indigo-600/30 border border-indigo-500/50 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950/50 relative z-10">
                      <RefreshCw size={28} className="animate-spin text-indigo-300" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-2">
                      <span>{guide.waitingTitle}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      {guide.waitingDesc}
                    </p>
                  </div>

                  {/* Step by Step Guide Card */}
                  <div className="max-w-lg mx-auto bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 text-left space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {guide.step1}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {guide.step2}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          Сохраните файл в папку Загрузки
                        </div>
                        <div className="text-[11px] text-emerald-400 font-medium">
                          {guide.step3}
                        </div>
                      </div>
                    </div>
                  </div>

              {/* Direct Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  onClick={handleManualScanDownloads}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-950/50"
                >
                  <RefreshCw size={13} />
                  Проверить Загрузки сейчас
                </button>
                <button
                  onClick={handleReopenExportPage}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={13} />
                  Открыть страницу повторно
                </button>
                <button
                  onClick={handlePickCsvFile}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={13} />
                  Выбрать файл .csv
                </button>
                <button
                  onClick={() => setStage('success')}
                  className="px-3 py-2 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
                >
                  Пропустить пароли
                </button>
              </div>
            </div>
          );
        })()
      ) : stage === 'success' && importResult ? (
            /* Success Summary View */
            <div className="py-4 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Данные из {importResult.browserName} успешно импортированы!
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Все перенесенные элементы уже доступны в вашем Apex Browser
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center">
                  <Key size={18} className="text-amber-400 mb-1" />
                  <span className="text-lg font-black text-slate-100">{importResult.passwordsCount || 0}</span>
                  <span className="text-[11px] text-slate-400">Паролей</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center">
                  <Star size={18} className="text-blue-400 mb-1" />
                  <span className="text-lg font-black text-slate-100">{importResult.bookmarksCount || 0}</span>
                  <span className="text-[11px] text-slate-400">Закладок</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center">
                  <Clock size={18} className="text-purple-400 mb-1" />
                  <span className="text-lg font-black text-slate-100">{importResult.historyCount || 0}</span>
                  <span className="text-[11px] text-slate-400">Истории</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/50"
                >
                  Готово, начать пользоваться
                </button>
              </div>
            </div>
          ) : (
            /* Main 1-Click Browser Selection View */
            <>
              {/* Question 1: Which Browser? */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  1. Выберите браузер для импорта:
                </label>

                {loading ? (
                  <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Поиск установленных браузеров на компьютере...
                  </div>
                ) : browsers.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-800/50 text-center text-xs text-slate-400">
                    Установленные браузеры не обнаружены в стандартных путях. Вы можете импортировать файл вручную.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {browsers.map(b => {
                      const isSelected = selectedBrowserId === b.id;
                      const is100PercentAuto = b.features?.oneClickPasswords;

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelectedBrowserId(b.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected 
                              ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-950/30' 
                              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center">
                                {getBrowserIcon(b.icon, b.color)}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                                  {b.name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Профиль: {b.profileName || 'Основной'}
                                </div>
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-600 text-white' 
                                : 'border-slate-600 bg-slate-900'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>

                          {/* Stats and Auto Badge */}
                          <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2 text-slate-300">
                              {b.passwordCount > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-300 font-medium">
                                  <Key size={11} /> {b.passwordCount}
                                </span>
                              )}
                              {b.bookmarkCount > 0 && (
                                <span className="flex items-center gap-0.5 text-blue-300 font-medium">
                                  <Star size={11} /> {b.bookmarkCount}
                                </span>
                              )}
                              {b.historyCount > 0 && (
                                <span className="flex items-center gap-0.5 text-purple-300 font-medium">
                                  <Clock size={11} /> {b.historyCount}
                                </span>
                              )}
                            </div>

                            {is100PercentAuto ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                                <Zap size={10} /> 100% авто 1-клик
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
                                Закладки+история авто
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Question 2: What to Import? */}
              <div className="space-y-3 pt-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  2. Что именно перенести:
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <label 
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      importPasswords 
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' 
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={importPasswords} 
                      onChange={e => setImportPasswords(e.target.checked)}
                      className="hidden" 
                    />
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      importPasswords ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-600'
                    }`}>
                      {importPasswords && <Check size={11} strokeWidth={3} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <Key size={12} /> Пароли
                      </div>
                      <div className="text-[10px] opacity-75">
                        {selectedBrowser?.passwordCount ? `${selectedBrowser.passwordCount} шт.` : 'Все сохраненные'}
                      </div>
                    </div>
                  </label>

                  <label 
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      importBookmarks 
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-200' 
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={importBookmarks} 
                      onChange={e => setImportBookmarks(e.target.checked)}
                      className="hidden" 
                    />
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      importBookmarks ? 'bg-blue-500 border-blue-400 text-slate-950' : 'border-slate-600'
                    }`}>
                      {importBookmarks && <Check size={11} strokeWidth={3} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <Star size={12} /> Закладки
                      </div>
                      <div className="text-[10px] opacity-75">
                        {selectedBrowser?.bookmarkCount ? `${selectedBrowser.bookmarkCount} шт.` : 'Все папки'}
                      </div>
                    </div>
                  </label>

                  <label 
                    className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      importHistory 
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-200' 
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={importHistory} 
                      onChange={e => setImportHistory(e.target.checked)}
                      className="hidden" 
                    />
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                      importHistory ? 'bg-purple-500 border-purple-400 text-slate-950' : 'border-slate-600'
                    }`}>
                      {importHistory && <Check size={11} strokeWidth={3} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <Clock size={12} /> Журнал истории
                      </div>
                      <div className="text-[10px] opacity-75">
                        {selectedBrowser?.historyCount ? `~${selectedBrowser.historyCount} шт.` : 'Все сайты'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Universal File Import Section (from ANY browser) */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <FolderDown size={15} className="text-indigo-400" />
                    <span>Импорт из файла любого браузера (HTML / CSV)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">или перетащите файл в окно</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handlePickHtmlFile}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Star size={13} className="text-amber-400" />
                    Выбрать HTML закладки
                  </button>
                  <button
                    onClick={handlePickCsvFile}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Key size={13} className="text-blue-400" />
                    Выбрать CSV пароли
                  </button>
                </div>
              </div>

              {/* Informational feature box */}
              {selectedBrowser?.type === 'firefox' ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="text-[11px] text-emerald-300">
                    <span className="font-bold">Мгновенный перенос:</span> Все пароли, закладки и история из Mozilla Firefox будут перенесены мгновенно в 1 клик без открытия каких-либо сторонних окон.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Zap size={18} />
                  </div>
                  <div className="text-[11px] text-indigo-200">
                    <span className="font-bold">Мгновенно + ассистент:</span> Закладки и история из {selectedBrowser?.name || 'браузера'} переносятся мгновенно в 1 клик. Для паролей откроется страница экспорта, а Apex Browser перехватит файл при сохранении.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {stage === 'select' && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Отмена
            </button>

            <button
              onClick={handleExecute1ClickImport}
              disabled={stage === 'importing' || (!importBookmarks && !importHistory && !importPasswords)}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-950/50"
            >
              <Zap size={14} className="text-amber-300" />
              Импортировать всё в 1 клик
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
