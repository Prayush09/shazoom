import React, { useState, useEffect } from 'react';
import { Mic, Plus, ChevronDown, X } from 'lucide-react';

// Hooks
import { useSocket } from './hooks/useSocket';
import { useAudioRecorder } from './hooks/useAudioRecorder';

// Components
import { GlobalStyles } from './components/GlobalStyles';
import { LoadingScreen } from './components/LoadingScreen';
import { Header } from './components/Header';
import { AddSongModal } from './components/AddSongModal';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { RecentItem } from './components/RecentItem';
import { ModeToggle } from './components/ModeToggle';
import { MatchResultCard } from './components/MatchResultCard'; // Imported

import { SongResult, MatchResult, DownloadStatus } from './types';

const SOCKET_URL = 'http://localhost:3001'; 

export const App = () => {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mode, setMode] = useState<'identify' | 'add'>('identify');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Tap to identify');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  const [recentSongs, setRecentSongs] = useState<SongResult[]>([]);
  const [identifiedSong, setIdentifiedSong] = useState<SongResult | null>(null); // State for the currently found song
  
  const [totalSongs, setTotalSongs] = useState(0);

  const displayedSongs = showAllHistory ? recentSongs : recentSongs.slice(0, 3);

  const handleMatch = (matches: MatchResult[]) => {
    setIsProcessing(false);
    if (matches && matches.length > 0) {
      const bestMatch = matches[0];
      // Map MatchResult to SongResult, ensuring we capture the ID from various potential case styles
      // The logger in useSocket will confirm the exact casing if this fails.
      const youtubeId = bestMatch.YouTubeID || (bestMatch as any).YoutubeID || (bestMatch as any).videoID || (bestMatch as any).youtube_id;
      
      const newSong: SongResult = {
        title: bestMatch.SongTitle,
        artist: bestMatch.SongArtist,
        album: "", 
        coverArt: "", 
        timeAgo: "Just now",
        score: bestMatch.Score,
        youtubeId: youtubeId
      };
      
      // Update Recent History
      setRecentSongs(prev => [newSong, ...prev]);
      
      // Set the main identified song to show the card
      setIdentifiedSong(newSong);
      
      setStatus(`Found: ${bestMatch.SongTitle}`);
    } else {
      setStatus('No matches found.');
      setTimeout(() => setStatus('Tap to identify'), 3000);
    }
  };

  const handleDownloadStatus = (data: DownloadStatus) => {
    if (data.type === 'success') {
      setStatus(`Success: ${data.message}`);
      setTimeout(() => setStatus('Tap to add song'), 3000);
    } else if (data.type === 'error') {
      setStatus(`Error: ${data.message}`);
    } else {
      setStatus(data.message);
    }
  };

  const { socket, isConnected } = useSocket({
    url: SOCKET_URL,
    onMatch: handleMatch,
    onDownloadStatus: handleDownloadStatus,
    onTotalSongs: (count) => setTotalSongs(count)
  });

  const { isListening, startListening, cancelRecording, mediaStream } = useAudioRecorder({
    onRecordingComplete: (payload) => {
      setIsProcessing(true);
      setStatus("Analyzing...");
      if (socket && socket.connected) {
        socket.emit('newRecording', payload);
      } else {
        setStatus("Connection lost");
        setIsProcessing(false);
      }
    },
    onError: (msg) => {
      setStatus(msg);
      setIsProcessing(false);
    }
  });

  useEffect(() => { document.body.className = `theme-${theme}`; }, [theme]);

  const handleConfirmAddSong = (url: string) => {
    if (socket) {
        setStatus(`Requesting download...`);
        socket.emit('newDownload', url);
    }
  };

  const handleMainAction = () => {
    if (mode === 'identify') {
      // Clear previous identification when starting new
      if (!isListening) {
        setIdentifiedSong(null);
      }

      if (isListening) {
        cancelRecording();
        setStatus('Cancelled');
        setTimeout(() => setStatus('Tap to identify'), 1000);
      } else if (!isProcessing) {
        setStatus('Listening...');
        startListening();
      }
    } else {
      setShowAddModal(true);
    }
  };

  const handleModeChange = (newMode: 'identify' | 'add') => {
    if (newMode === mode) return;
    setMode(newMode);
    
    if (isListening) {
      cancelRecording();
    }
    setIdentifiedSong(null); // Clear result on mode switch
    setStatus(newMode === 'identify' ? 'Tap to identify' : 'Tap to add song');
  };

  if (loading) {
    return (
      <>
        <GlobalStyles />
        <LoadingScreen onComplete={() => setLoading(false)} />
      </>
    );
  }

  return (
    <div className="w-full h-full min-h-screen flex flex-col items-center bg-[var(--bg)] text-[var(--text)] transition-colors duration-300 relative overflow-y-auto no-scrollbar">
      <GlobalStyles />
      
      {/* Modals */}
      <AddSongModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onAdd={handleConfirmAddSong} 
      />
      
      {/* Header */}
      <Header 
        toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
        wsStatus={isConnected} 
        totalSongs={totalSongs}
      />

      {/* Main Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 shrink-0 min-h-[500px]">
        
        {/* Identified Song Card (Replaces Visualizer/Buttons when found) */}
        {identifiedSong && !isListening && !isProcessing ? (
          <div className="w-full animate-in fade-in zoom-in-95 duration-500 mb-8 relative">
             <button 
                onClick={() => setIdentifiedSong(null)}
                className="absolute -top-12 right-0 text-[var(--text-sec)] hover:text-[var(--text)] flex items-center gap-1 text-xs uppercase tracking-widest font-bold py-2 px-4 rounded-full bg-[var(--surface-highlight)] hover:bg-[var(--surface)] transition-all"
             >
                <X size={14} /> Close
             </button>
             <MatchResultCard song={identifiedSong} index={0} />
             
             {/* Action to identify again below the card */}
             <div className="flex justify-center mt-8">
               <button 
                  onClick={handleMainAction}
                  className="bg-[var(--accent)] text-white font-bold rounded-full px-8 py-3 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
               >
                 <Mic size={20} /> Identify Another
               </button>
             </div>
          </div>
        ) : (
          <>
            {/* Helper Text */}
            <p className={`text-sm font-medium mb-12 tracking-wide transition-opacity duration-300 ${isListening ? 'opacity-50' : 'opacity-80 text-[var(--text-sec)]'}`}>
              {status}
            </p>

            {/* Main Action Button */}
            <div className="relative mb-8 group shrink-0">
              <div className={`absolute inset-0 rounded-full bg-[var(--accent)] blur-2xl transition-all duration-1000 ${isListening && mode === 'identify' ? 'opacity-20 scale-150' : 'opacity-0 scale-100'}`}></div>
              
              <button 
                onClick={handleMainAction}
                disabled={isProcessing}
                className={`
                  w-40 h-40 rounded-full flex items-center justify-center z-10 relative
                  bg-[var(--surface-dark)] 
                  border-[1px] 
                  transition-all duration-300 ease-in-out
                  active:scale-95
                  shadow-2xl
                  ${(isListening && mode === 'identify') 
                      ? 'scale-105 border-[var(--accent)]' 
                      : 'border-[var(--ring-color)] hover:scale-105 hover:border-[var(--text-sec)]'
                  }
                  ${isProcessing ? 'opacity-50 cursor-wait' : ''}
                `}
              >
                {mode === 'identify' ? (
                  <Mic 
                    size={48} 
                    className={`transition-colors duration-300 ${isListening ? 'text-[var(--accent)]' : 'text-white'}`} 
                    strokeWidth={1.5}
                  />
                ) : (
                  <Plus 
                    size={48} 
                    className="text-white transition-transform duration-300 group-active:rotate-90" 
                    strokeWidth={1.5}
                  />
                )}
              </button>
            </div>

            {/* Visualizer */}
            <WaveformVisualizer isListening={isListening} stream={mediaStream} visible={mode === 'identify'} />

            {/* Mode Toggle */}
            <ModeToggle mode={mode} setMode={handleModeChange} />
          </>
        )}

      </div>

      {/* Recent History */}
      <div className="w-full max-w-md px-8 pb-12 shrink-0">
        <div 
          className="flex items-center justify-center gap-2 mb-6 cursor-pointer group select-none"
          onClick={() => setShowAllHistory(!showAllHistory)}
          title={showAllHistory ? "Show less" : "Show all history"}
        >
          <h2 className="text-xs font-bold tracking-[0.15em] text-[var(--text-sec)] uppercase group-hover:text-[var(--text)] transition-colors">Recent</h2>
          <div className={`text-[var(--text-sec)] group-hover:text-[var(--text)] transition-transform duration-300 ${showAllHistory ? 'rotate-180' : ''}`}>
             <ChevronDown size={14} />
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          {displayedSongs.map((song, idx) => (
            <RecentItem key={idx} song={song} />
          ))}
          {displayedSongs.length === 0 && (
            <div className="text-center text-[var(--text-sec)] text-xs py-4 opacity-50">No recent songs</div>
          )}
        </div>
      </div>

    </div>
  );
};