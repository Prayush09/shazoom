
import React, { useState, useEffect, useRef } from 'react';
import { X, Link as LinkIcon } from 'lucide-react';

export const AddSongModal = ({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (url: string) => void }) => {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
        // small timeout to allow animation to start/render
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setIsSubmitting(true);
    // Simulate API network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    onAdd(url);
    setIsSubmitting(false);
    setUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
       {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-[var(--surface)] p-8 rounded-3xl shadow-2xl border border-[var(--highlight)] transform transition-all animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col items-center">
        <button 
          onClick={onClose} 
          className="absolute right-6 top-6 text-[var(--text-sec)] hover:text-[var(--text)] transition-colors p-2 hover:bg-[var(--highlight)] rounded-full"
        >
          <X size={20} />
        </button>
        
        <div className="w-16 h-16 rounded-full bg-[var(--highlight)] flex items-center justify-center text-[var(--text)] mb-6 shadow-inner">
           <LinkIcon size={32} />
        </div>

        <h3 className="text-xl font-bold text-[var(--text)] mb-2 tracking-wide">Add from Spotify</h3>
        <p className="text-sm text-[var(--text-sec)] mb-8 text-center leading-relaxed">
          Paste a song link to manually add it to your history.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative mb-6 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-sec)] group-focus-within:text-[var(--accent)] transition-colors">
              <LinkIcon size={18} />
            </div>
            <input 
              ref={inputRef}
              type="url" 
              placeholder="https://open.spotify.com/track/..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[var(--surface-highlight)] text-[var(--text)] text-base rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder-[var(--text-sec)]/50"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!url.trim() || isSubmitting}
            className="w-full bg-[var(--accent)] text-white font-bold text-sm tracking-wider uppercase py-4 rounded-full hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shadow-lg shadow-[var(--accent)]/20"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Add Song'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
