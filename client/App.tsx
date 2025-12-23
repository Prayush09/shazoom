
import { useState, useEffect, useRef } from 'react';
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
import { MatchGallery } from './components/MatchGallery';
import { AnalyzingAnimation } from './components/AnalyzingAnimation';

import { SongResult, MatchResult, DownloadStatus } from './types';

const SOCKET_URL = 'https://shazoom-950182729943.us-central1.run.app'; 

export const App = () => {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mode, setMode] = useState<'identify' | 'add'>('identify');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Tap to identify');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [recentSongs, setRecentSongs] = useState<SongResult[]>([]);
  const [currentMatches, setCurrentMatches] = useState<SongResult[]>([]);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [totalSongs, setTotalSongs] = useState(0);
  const processStartTimeRef = useRef<number>(0);
  const displayedSongs = showAllHistory ? recentSongs : recentSongs.slice(0, 3);
  const handleMatch = (matches: MatchResult[]) => {
    const now = Date.now();
    const elapsed = now - processStartTimeRef.current;
    const minLoadingTime = 3000; // 3 seconds minimum
    const remainingTime = Math.max(0, minLoadingTime - elapsed);

    setTimeout(() => {
        setIsProcessing(false);
        
        if (matches && matches.length > 0) {
          // Take top 3 matches
          const topMatches = matches.slice(0, 3).map(match => {
            const youtubeId = match.YouTubeID || (match as any).YoutubeID || (match as any).videoID || (match as any).youtube_id;
            return {
              title: match.SongTitle,
              artist: match.SongArtist,
              album: "", 
              coverArt: "", 
              timeAgo: "Just now",
              score: match.Score,
              youtubeId: youtubeId
            };
          });
          
          setRecentSongs(prev => [topMatches[0], ...prev]);
          setCurrentMatches(topMatches);
          setStatus(`Found: ${topMatches[0].title}`);
          
          // Show popup
          setShowMatchPopup(true);
          setTimeout(() => setShowMatchPopup(false), 5000);

        } else {
          setStatus('No matches found.');
          setTimeout(() => setStatus('Tap to identify'), 3000);
        }
    }, remainingTime);
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
      processStartTimeRef.current = Date.now(); // Start timer
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
    if (isProcessing) return; 

    if (mode === 'identify') {
      if (!isListening) {
        setCurrentMatches([]); // Clear matches on new start
      }

      if (isListening) {
        cancelRecording();
        setStatus('Cancelled');
        setTimeout(() => setStatus('Tap to identify'), 1000);
      } else {
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
    setCurrentMatches([]); // Clear result on mode switch
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

  const hasMatches = currentMatches.length > 0;

  return (
    <div className="w-full h-full min-h-screen flex flex-col items-center bg-[var(--bg)] text-[var(--text)] transition-colors duration-300 relative overflow-y-auto no-scrollbar">
      <GlobalStyles />
      
      {/* Toast Popup */}
      {showMatchPopup && (
        <div className="fixed top-24 z-[60] bg-[var(--surface-highlight)] border border-[var(--highlight)] text-[var(--text)] px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-2 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"></span>
            <span className="text-xs font-medium tracking-wide">Potential matches found</span>
        </div>
      )}

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
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-6 shrink-0 min-h-[500px] relative py-8">
        
        {/* Identified Song Gallery */}
        {hasMatches && !isListening && !isProcessing ? (
          <div className="w-full animate-in fade-in zoom-in-95 duration-500 mb-8 relative flex flex-col items-center">
             
             {/* Close Button */}
             <div className="w-full flex justify-end mb-6 z-50 px-2">
                 <button 
                    onClick={() => setCurrentMatches([])}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-sec)] hover:text-[var(--text)] hover:bg-[var(--surface-highlight)] border border-[var(--highlight)] transition-all shadow-sm hover:shadow-md active:scale-95"
                    title="Close Results"
                 >
                    <X size={20} strokeWidth={2} />
                 </button>
             </div>
             
             {/* Gallery Component */}
             <MatchGallery matches={currentMatches} />
             
             {/* Action to identify again below the gallery */}
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
          <div className="flex flex-col items-center justify-center w-full gap-8">
            {/* Helper Text */}
            <p className={`text-sm font-medium tracking-wide transition-opacity duration-300 ${isListening ? 'opacity-50' : 'opacity-80 text-[var(--text-sec)]'}`}>
              {status}
            </p>

            {/* Main Action Button */}
            <div className="relative group shrink-0">
              <div className={`absolute inset-0 rounded-full bg-[var(--accent)] blur-2xl transition-all duration-1000 ${isListening && mode === 'identify' ? 'opacity-20 scale-150' : 'opacity-0 scale-100'}`}></div>
              
              <button 
                onClick={handleMainAction}
                disabled={isProcessing}
                className={`
                  w-40 h-40 rounded-full flex items-center justify-center z-10 relative
                  bg-[var(--btn-bg)] 
                  border-[1px] 
                  transition-all duration-300 ease-in-out
                  active:scale-95
                  ${theme === 'dark' ? 'shadow-[0_0_50px_-12px_rgba(255,255,255,0.15)]' : 'shadow-2xl'}
                  ${(isListening && mode === 'identify') 
                      ? 'scale-105 border-[var(--accent)]' 
                      : 'border-[var(--ring-color)] hover:scale-105 hover:border-[var(--text-sec)]'
                  }
                  ${isProcessing ? 'cursor-wait border-[var(--accent)]' : ''}
                `}
              >
                {isProcessing ? (
                  <AnalyzingAnimation />
                ) : mode === 'identify' ? (
                  <Mic 
                    size={48} 
                    className={`transition-colors duration-300 ${isListening ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`} 
                    strokeWidth={1.5}
                  />
                ) : (
                  <Plus 
                    size={48} 
                    className="text-[var(--text)] transition-transform duration-300 group-active:rotate-90" 
                    strokeWidth={1.5}
                  />
                )}
              </button>
            </div>


            {/* Visualizer */}
            <div className="h-16 w-64 flex items-center justify-center shrink-0">
               <WaveformVisualizer isListening={isListening} stream={mediaStream} visible={mode === 'identify'} theme={theme} />
            </div>

            {/* Mode Toggle */}
            <div className="mb-4">
              <ModeToggle mode={mode} setMode={handleModeChange} theme={theme} />
            </div>
          </div>
        )}

      </div>

      {/* Recent History */}
      <div className="w-full max-w-md px-8 pb-4 shrink-0 mt-4">
        <div 
          className="flex items-center justify-center gap-2 mb-8 cursor-pointer group select-none"
          onClick={() => setShowAllHistory(!showAllHistory)}
          title={showAllHistory ? "Show less" : "Show all history"}
        >
          <h2 className="text-xs font-bold tracking-[0.15em] text-[var(--text-sec)] uppercase group-hover:text-[var(--text)] transition-colors">Recent</h2>
          <div className={`text-[var(--text-sec)] group-hover:text-[var(--text)] transition-transform duration-300 ${showAllHistory ? 'rotate-180' : ''}`}>
             <ChevronDown size={14} />
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {displayedSongs.map((song, idx) => (
            <RecentItem key={idx} song={song} />
          ))}
          {displayedSongs.length === 0 && (
            <div className="text-center text-[var(--text-sec)] text-xs py-4 opacity-50">No recent songs</div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="pb-8 text-[11px] text-[var(--text-sec)] flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
        <span>By</span>
        <a 
          href="https://www.prayushgiri.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-semibold hover:text-[var(--accent)] transition-colors border-b border-transparent hover:border-[var(--accent)]"
        >
          Prayush Giri
        </a>
      </div>

    </div>
  );
};
