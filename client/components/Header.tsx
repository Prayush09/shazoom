import React from 'react';
import { Moon, Music2, Database } from 'lucide-react';

export const Header = ({ 
  toggleTheme, 
  wsStatus,
  totalSongs 
}: { 
  toggleTheme: () => void, 
  wsStatus: boolean,
  totalSongs: number 
}) => {
  return (
    <div className="w-full p-6 md:p-8 flex justify-between items-center relative z-40 shrink-0 max-w-5xl mx-auto">
      <div className="flex flex-col">
        <span className="font-bold text-lg tracking-[0.2em] uppercase text-[var(--text)]">SHAZOOM</span>
        {totalSongs > 0 && (
            <div className="flex items-center gap-2 mt-1.5 animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--surface-highlight)] border border-[var(--highlight)]">
                    <Database size={10} className="text-[var(--accent)]" />
                    <span className="text-[10px] font-semibold tracking-wider text-[var(--text-sec)] uppercase tabular-nums">
                        {totalSongs.toLocaleString()}
                    </span>
                </div>
            </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full transition-colors duration-500 ${wsStatus ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} title={wsStatus ? "Online" : "Offline"} />
        <button onClick={toggleTheme} className="text-[var(--text-sec)] hover:text-[var(--text)] transition-colors p-2 hover:bg-[var(--surface-highlight)] rounded-full">
          <Moon size={20} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};