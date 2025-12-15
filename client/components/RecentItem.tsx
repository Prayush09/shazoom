
import React from 'react';
import { Music } from 'lucide-react';
import { SongResult } from '../types';

// Explicitly typing as React.FC to handle 'key' prop correctly in strict TypeScript environments
export const RecentItem: React.FC<{ song: SongResult }> = ({ song }) => (
  <div className="flex items-center gap-4 w-full p-3 rounded-xl hover:bg-[var(--highlight)] transition-colors cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="w-12 h-12 rounded-md bg-[var(--highlight)] flex items-center justify-center text-[var(--text-sec)] group-hover:text-[var(--text)] overflow-hidden relative shrink-0">
      {song.coverArt && song.coverArt.startsWith('http') ? (
        <img src={song.coverArt} alt="" className="w-full h-full object-cover" />
      ) : (
        <Music size={20} />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-[var(--text)] truncate">{song.title}</h3>
      <p className="text-xs text-[var(--text-sec)] truncate">{song.artist}</p>
    </div>
    <span className="text-xs text-[var(--text-sec)] font-medium shrink-0">{song.timeAgo}</span>
  </div>
);
