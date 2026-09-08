import React, { useState } from 'react';
import { X, Type, BookOpen, Clock, AlignLeft, Sun, Moon, Coffee } from 'lucide-react';

export default function ReaderModal({
  isOpen,
  onClose,
  article
}) {
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState('dark'); // 'dark', 'sepia', 'light'
  const [fontFamily, setFontFamily] = useState('serif'); // 'serif', 'sans'

  if (!isOpen || !article) return null;

  const themes = {
    dark: 'bg-slate-950 text-slate-200 border-slate-800',
    sepia: 'bg-[#f4ecd8] text-[#5b4636] border-[#e2d5bc]',
    light: 'bg-white text-slate-900 border-slate-200'
  };

  const containerTheme = themes[theme] || themes.dark;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-text overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border my-auto ${containerTheme} transition-colors duration-200`}
        onClick={e => e.stopPropagation()}
      >
        {/* Reader Controls Header */}
        <div className="p-3 border-b flex items-center justify-between opacity-85 select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
              <BookOpen size={15} className="text-indigo-400" />
              <span>Режим чтения Firefox</span>
            </div>

            {/* Font size */}
            <div className="flex items-center border rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className="px-2 py-1 hover:bg-black/10 transition-colors"
                title="Уменьшить шрифт"
              >
                A-
              </button>
              <span className="px-2 py-1 font-mono text-[11px]">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                className="px-2 py-1 hover:bg-black/10 transition-colors"
                title="Увеличить шрифт"
              >
                A+
              </button>
            </div>

            {/* Font family */}
            <div className="flex items-center border rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setFontFamily('serif')}
                className={`px-2 py-1 font-serif ${fontFamily === 'serif' ? 'bg-indigo-500/20 font-bold' : 'hover:bg-black/10'}`}
              >
                Serif
              </button>
              <button
                onClick={() => setFontFamily('sans')}
                className={`px-2 py-1 font-sans ${fontFamily === 'sans' ? 'bg-indigo-500/20 font-bold' : 'hover:bg-black/10'}`}
              >
                Sans
              </button>
            </div>

            {/* Theme switcher */}
            <div className="flex items-center border rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 ${theme === 'dark' ? 'bg-slate-800 text-indigo-400' : 'hover:bg-black/10'}`}
                title="Темная тема"
              >
                <Moon size={13} />
              </button>
              <button
                onClick={() => setTheme('sepia')}
                className={`p-1.5 ${theme === 'sepia' ? 'bg-[#e7d8bc] text-[#5b4636]' : 'hover:bg-black/10'}`}
                title="Сепия"
              >
                <Coffee size={13} />
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 ${theme === 'light' ? 'bg-slate-200 text-slate-900' : 'hover:bg-black/10'}`}
                title="Светлая тема"
              >
                <Sun size={13} />
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            title="Закрыть режим чтения"
          >
            <X size={16} />
          </button>
        </div>

        {/* Reader Article Body */}
        <div className="p-8 max-h-[80vh] overflow-y-auto">
          {/* Article Header */}
          <div className="mb-6 pb-4 border-b border-current/10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">
              {article.title || 'Статья'}
            </h1>
            <div className="flex items-center gap-4 text-xs opacity-70">
              {article.byline && <span>Автор: {article.byline}</span>}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {article.readingMinutes || 2} мин чтения
              </span>
              {article.wordCount > 0 && <span>{article.wordCount} слов</span>}
            </div>
          </div>

          {/* Render article blocks */}
          <div 
            className={`space-y-4 leading-relaxed ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {article.blocks && article.blocks.length > 0 ? (
              article.blocks.map((block, idx) => {
                if (block.type === 'heading') {
                  return <h2 key={idx} className="text-xl font-bold mt-6 mb-2">{block.text}</h2>;
                }
                if (block.type === 'quote') {
                  return (
                    <blockquote key={idx} className="border-l-4 border-indigo-500 pl-4 italic opacity-90 my-4">
                      {block.text}
                    </blockquote>
                  );
                }
                if (block.type === 'code') {
                  return (
                    <pre key={idx} className="bg-black/20 p-3 rounded-xl font-mono text-xs overflow-x-auto my-3">
                      <code>{block.text}</code>
                    </pre>
                  );
                }
                if (block.type === 'list') {
                  return (
                    <ul key={idx} className="list-disc list-inside space-y-1 my-3 pl-2">
                      {block.items.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                  );
                }
                if (block.type === 'img') {
                  return (
                    <figure key={idx} className="my-4 text-center">
                      <img src={block.src} alt={block.alt} className="max-w-full rounded-2xl mx-auto shadow-md" />
                      {block.alt && <figcaption className="text-xs opacity-60 mt-1">{block.alt}</figcaption>}
                    </figure>
                  );
                }
                return <p key={idx}>{block.text}</p>;
              })
            ) : (
              <p className="text-sm opacity-75">Текст статьи извлечен или пуст.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
