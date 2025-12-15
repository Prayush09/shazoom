
import React from 'react';
import { Moon } from 'lucide-react';

export const Header = ({ toggleTheme, wsStatus }: { toggleTheme: () => void, wsStatus: boolean }) => {
  return (
    <div className="w-full p-8 flex justify-center items-center relative z-40 shrink-0">
      <span className="font-bold text-lg tracking-[0.2em] uppercase text-[var(--text)]">SHAZOOM</span>
      
      {/* Hidden Controls (Top Right) */}
      <div className="absolute right-6 top-6 flex items-center gap-3 opacity-30 hover:opacity-100 transition-opacity">
        <div className={`w-2 h-2 rounded-full ${wsStatus ? 'bg-green-500' : 'bg-red-500'}`} title={wsStatus ? "Online" : "Offline"} />
        <button onClick={toggleTheme} className="hover:text-[var(--accent)]">
          <Moon size={18} />
        </button>
      </div>
    </div>
  );
};
