
import React from 'react';

export const ModeToggle = ({ mode, setMode }: { mode: 'identify' | 'add', setMode: (m: 'identify' | 'add') => void }) => {
  return (
    <div className="flex p-1 bg-[var(--highlight)] rounded-full relative mb-12 shrink-0">
      <div 
        className="absolute top-1 bottom-1 rounded-full bg-[var(--text)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ 
          left: mode === 'identify' ? '4px' : '50%', 
          width: 'calc(50% - 4px)'
        }}
      />
      <button 
        onClick={() => setMode('identify')}
        className={`relative z-10 w-28 py-2.5 text-sm font-medium rounded-full transition-colors duration-200 ${mode === 'identify' ? 'text-[var(--bg)]' : 'text-[var(--text-sec)] hover:text-[var(--text)]'}`}
      >
        Identify
      </button>
      <button 
        onClick={() => setMode('add')}
        className={`relative z-10 w-28 py-2.5 text-sm font-medium rounded-full transition-colors duration-200 ${mode === 'add' ? 'text-[var(--bg)]' : 'text-[var(--text-sec)] hover:text-[var(--text)]'}`}
      >
        Add Song
      </button>
    </div>
  );
};
