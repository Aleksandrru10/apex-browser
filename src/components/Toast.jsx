import React from 'react';
import { Info } from 'lucide-react';

export default function Toast({ message, visible }) {
  if (!visible || !message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-900/95 border border-slate-700 text-slate-100 text-xs font-medium px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2">
        <Info size={14} className="text-indigo-400" />
        <span>{message}</span>
      </div>
    </div>
  );
}
