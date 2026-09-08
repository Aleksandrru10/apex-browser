import React, { useState } from 'react';
import { 
  Users, Plus, Copy, Trash2, Eraser, Edit2, Check, X, Shield, 
  Server, Globe, Search, RefreshCw, Key, ShieldCheck
} from 'lucide-react';

const EMOJI_OPTIONS = ['🌐', '💼', '🏖️', '🕵️', '🚀', '🎮', '🛒', '📈', '🎨', '🔬', '💎', '🛡️', '🤖', '📚', '🎬', '💡', '🥑', '⚡'];
const COLOR_OPTIONS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#14b8a6', '#64748b'];

const USER_AGENT_PRESETS = [
  { label: 'По умолчанию (Chromium)', value: '' },
  { label: 'Google Chrome (Windows 11)', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36' },
  { label: 'Apple Safari (macOS Sonoma)', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15' },
  { label: 'Mozilla Firefox (Linux)', value: 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0' },
  { label: 'Apple iPhone (iOS 17 Safari)', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1' }
];

export default function ProfileModal({
  isOpen,
  onClose,
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onCloneProfile,
  onDeleteProfile,
  onClearProfileData
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🌐');
  const [color, setColor] = useState('#3b82f6');
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyType, setProxyType] = useState('http');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState(8080);
  const [proxyUser, setProxyUser] = useState('');
  const [proxyPass, setProxyPass] = useState('');
  const [userAgent, setUserAgent] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setAvatar('🌐');
    setColor('#3b82f6');
    setProxyEnabled(false);
    setProxyType('http');
    setProxyHost('');
    setProxyPort(8080);
    setProxyUser('');
    setProxyPass('');
    setUserAgent('');
    setIsCreating(false);
    setEditingProfileId(null);
  };

  const handleStartCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleStartEdit = (p) => {
    setName(p.name);
    setAvatar(p.avatar);
    setColor(p.color);
    setProxyEnabled(!!p.proxy?.enabled);
    setProxyType(p.proxy?.type || 'http');
    setProxyHost(p.proxy?.host || '');
    setProxyPort(p.proxy?.port || 8080);
    setProxyUser(p.proxy?.username || '');
    setProxyPass(p.proxy?.password || '');
    setUserAgent(p.userAgent || '');
    setEditingProfileId(p.id);
    setIsCreating(false);
  };

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const profileData = {
      name: name.trim(),
      avatar,
      color,
      proxy: {
        enabled: proxyEnabled && !!proxyHost.trim(),
        type: proxyType,
        host: proxyHost.trim(),
        port: Number(proxyPort) || 8080,
        username: proxyUser.trim(),
        password: proxyPass.trim()
      },
      userAgent: userAgent.trim()
    };

    if (editingProfileId) {
      onUpdateProfile(editingProfileId, profileData);
    } else {
      onCreateProfile(profileData);
    }
    resetForm();
  };

  const filteredProfiles = (profiles || []).filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.proxy?.host && p.proxy.host.includes(searchQuery))
  );

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Менеджер профилей Apex</h2>
              <p className="text-[11px] text-slate-400">
                Полная изоляция куки, истории, сессий и персональный прокси для каждого профиля
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action bar / Search */}
        {!isCreating && !editingProfileId && (
          <div className="p-3 border-b border-slate-800/80 flex items-center gap-2 bg-slate-950/40">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск профилей по названию или прокси..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 px-3 rounded-xl transition-colors shadow"
            >
              <Plus size={14} />
              <span>Создать профиль</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Create or Edit Profile Form */}
          {(isCreating || editingProfileId) ? (
            <form onSubmit={handleSaveSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider pb-1 border-b border-slate-800">
                {editingProfileId ? 'Редактирование профиля' : 'Новый изолированный профиль'}
              </div>

              {/* Name & Avatar Preview */}
              <div className="flex gap-3 items-center">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg border border-white/10 shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {avatar}
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Название профиля</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Например: Крипта, Клиент #1, Магазин..."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Avatar Emoji Selector */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Иконка профиля</label>
                <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  {EMOJI_OPTIONS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setAvatar(em)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-transform ${
                        avatar === em ? 'bg-indigo-600/40 ring-2 ring-indigo-500 scale-110' : 'hover:bg-slate-800'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Цветовая тема</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Dedicated Proxy Configuration */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server size={15} className="text-indigo-400" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Выделенный прокси (Proxy)</div>
                      <div className="text-[10px] text-slate-400">Назначьте отдельный IP для этого профиля</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proxyEnabled}
                      onChange={e => setProxyEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {proxyEnabled && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Протокол</label>
                        <select
                          value={proxyType}
                          onChange={e => setProxyType(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 outline-none"
                        >
                          <option value="http">HTTP</option>
                          <option value="https">HTTPS</option>
                          <option value="socks5">SOCKS5</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-1">Хост / IP</label>
                        <input
                          type="text"
                          value={proxyHost}
                          onChange={e => setProxyHost(e.target.value)}
                          placeholder="192.168.1.1 или domain.com"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Порт</label>
                        <input
                          type="number"
                          value={proxyPort}
                          onChange={e => setProxyPort(e.target.value)}
                          placeholder="8080"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Логин (опционально)</label>
                        <input
                          type="text"
                          value={proxyUser}
                          onChange={e => setProxyUser(e.target.value)}
                          placeholder="username"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Пароль (опционально)</label>
                        <input
                          type="password"
                          value={proxyPass}
                          onChange={e => setProxyPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User-Agent Override */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">User-Agent (Маскировка браузера)</label>
                <select
                  value={userAgent}
                  onChange={e => setUserAgent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  {USER_AGENT_PRESETS.map((p, idx) => (
                    <option key={idx} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 text-xs rounded-xl transition-colors shadow"
                >
                  {editingProfileId ? 'Сохранить изменения' : 'Создать профиль'}
                </button>
              </div>
            </form>
          ) : (
            /* Profiles List Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProfiles.map(p => {
                const isActive = p.id === activeProfileId;
                return (
                  <div
                    key={p.id}
                    className={`bg-slate-950/60 border rounded-2xl p-3 flex flex-col justify-between transition-all ${
                      isActive 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg' 
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Row: Avatar, Name, Active Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-base shadow shrink-0"
                            style={{ backgroundColor: p.color || '#3b82f6' }}
                          >
                            {p.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-100 truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {p.partition}
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> Активен
                          </span>
                        )}
                      </div>

                      {/* Info Badges (Proxy, UA) */}
                      <div className="flex flex-wrap gap-1.5 my-2">
                        {p.proxy?.enabled ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Server size={10} />
                            {p.proxy.type?.toUpperCase()} {p.proxy.host}:{p.proxy.port}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Globe size={10} /> Прямое подключение
                          </span>
                        )}

                        {p.userAgent && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded truncate max-w-[140px]" title={p.userAgent}>
                            Кастомный UA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-2">
                      <div>
                        {!isActive ? (
                          <button
                            onClick={() => {
                              onSelectProfile(p.id);
                              onClose();
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-2.5 py-1 rounded-xl transition-colors shadow"
                          >
                            Активировать
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Текущий профиль</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          onClick={() => onCloneProfile(p.id)}
                          className="p-1 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                          title="Клонировать профиль"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                          title="Редактировать"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Очистить все куки, кеш и данные профиля "${p.name}"?`)) {
                              onClearProfileData(p.id);
                            }
                          }}
                          className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                          title="Очистить кеш и куки профиля"
                        >
                          <Eraser size={13} />
                        </button>
                        {profiles.length > 1 && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Удалить профиль "${p.name}"?`)) {
                                onDeleteProfile(p.id);
                              }
                            }}
                            className="p-1 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                            title="Удалить профиль"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Всего профилей: {profiles.length}</span>
          <span>Изоляция: Chromium session partitions</span>
        </div>
      </div>
    </div>
  );
}
