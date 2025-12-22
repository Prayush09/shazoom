
import React from 'react';
import { SongResult } from '../types';
import { Music, AlertCircle } from 'lucide-react';

interface MatchResultCardProps {
  song: SongResult;
  isActive?: boolean; // Added for styling hooks if needed
}

export const MatchResultCard: React.FC<MatchResultCardProps> = ({ song, isActive = true }) => {
  return (
    <div 
      className={`w-full bg-[var(--surface)] rounded-2xl overflow-hidden border transition-all duration-500 group shadow-xl ${isActive ? 'border-[var(--accent)] shadow-[var(--accent)]/20' : 'border-[var(--highlight)]'}`}
    >
      {/* Header Info */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--highlight)] bg-[var(--surface)]">
         <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--highlight)] flex items-center justify-center shrink-0 text-[var(--text-sec)]">
               <Music size={18} />
            </div>
            <div className="min-w-0 text-left">
                <h3 className="text-base font-bold text-[var(--text)] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">{song.title}</h3>
                <p className="text-xs text-[var(--text-sec)] truncate">{song.artist}</p>
            </div>
         </div>
         
         <div className="flex flex-col items-end shrink-0 ml-4">
            <span className="text-[10px] text-[var(--text-sec)]/50 mt-1">{song.timeAgo}</span>
         </div>
      </div>

      {/* Video Embed */}
      <div className="relative w-full aspect-video bg-black/50">
        {song.youtubeId ? (
          <iframe 
            src={`https://www.youtube.com/embed/${song.youtubeId}`}
            title={song.title}
            className="absolute inset-0 w-full h-full pointer-events-auto"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            style={{ pointerEvents: isActive ? 'auto' : 'none' }} // Disable interaction on non-active cards
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-sec)]">
             <AlertCircle size={32} className="mb-2 opacity-50" />
             <span className="text-sm">Video not available</span>
          </div>
        )}
      </div>
    </div>
  );
};
