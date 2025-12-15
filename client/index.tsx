
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Mic, Plus, ChevronDown } from 'lucide-react';

// Components
import { GlobalStyles } from './components/GlobalStyles';
import { LoadingScreen } from './components/LoadingScreen';
import { Header } from './components/Header';
import { AddSongModal } from './components/AddSongModal';
import { WaveformVisualizer } from './components/WaveformVisualizer';
import { RecentItem } from './components/RecentItem';
import { ModeToggle } from './components/ModeToggle';

// Types
import { SongResult } from './types';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mode, setMode] = useState<'identify' | 'add'>('identify');
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Tap to identify');
  const [wsConnected, setWsConnected] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Recent History Logic
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [recentSongs, setRecentSongs] = useState<SongResult[]>([
    { title: "Blinding Lights", artist: "The Weeknd", album: "", coverArt: "", timeAgo: "2m" },
    { title: "Bohemian Rhapsody", artist: "Queen", album: "", coverArt: "", timeAgo: "15m" },
    { title: "Shape of You", artist: "Ed Sheeran", album: "", coverArt: "", timeAgo: "1h" },
    { title: "Levitating", artist: "Dua Lipa", album: "", coverArt: "", timeAgo: "2h" },
    { title: "Stay", artist: "Kid Laroi", album: "", coverArt: "", timeAgo: "1d" },
  ]);

  const socketRef = useRef<WebSocket | null>(null);
  const displayedSongs = showAllHistory ? recentSongs : recentSongs.slice(0, 3);

  // Apply theme
  useEffect(() => { document.body.className = `theme-${theme}`; }, [theme]);

  // WebSocket
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('ws://localhost:8080');
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'result') handleFound(msg.data);
        } catch {}
      };
      socketRef.current = ws;
    };
    try { connect(); } catch {}
    return () => socketRef.current?.close();
  }, []);

  const handleFound = (data: any) => {
    stopListening();
    // Add to history
    const newSong = {
      title: data.title || "Unknown",
      artist: data.artist || "Unknown",
      album: data.album || "",
      coverArt: data.coverArt || "",
      timeAgo: "Just now"
    };
    setRecentSongs(prev => [newSong, ...prev]);
  };

  const stopListening = () => {
    setIsListening(false);
    setStatus(mode === 'identify' ? 'Tap to identify' : 'Tap to add song');
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);
      setIsListening(true);
      setStatus('Listening...');

      // Simulation
      if (!wsConnected) {
        setTimeout(() => setStatus('Identifying...'), 3000);
        setTimeout(() => {
           handleFound({
             title: "Midnight City",
             artist: "M83",
             coverArt: "https://upload.wikimedia.org/wikipedia/en/4/47/HurryUpWereDreaming.jpg"
           });
        }, 5000);
      }
    } catch (e) {
      setStatus('Microphone denied');
      setIsListening(false);
    }
  };

  const handleConfirmAddSong = (url: string) => {
      // Simulate Adding a Song Manually from URL
      // In a real app, you would parse the URL ID and fetch metadata
      const fakeSongs = [
         { title: "New Gold", artist: "Gorillaz", coverArt: "", timeAgo: "Just now" },
         { title: "Glimpse of Us", artist: "Joji", coverArt: "", timeAgo: "Just now" },
         { title: "As It Was", artist: "Harry Styles", coverArt: "", timeAgo: "Just now" }
      ];
      const random = fakeSongs[Math.floor(Math.random() * fakeSongs.length)];
      
      const newSong = { ...random, album: "Manual Add" };
      setRecentSongs(prev => [newSong, ...prev]);
      setStatus('Song Added!');
      setTimeout(() => setStatus('Tap to add song'), 1500);
  };

  const handleMainAction = () => {
    if (mode === 'identify') {
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    } else {
      setShowAddModal(true);
    }
  };

  const handleModeChange = (newMode: 'identify' | 'add') => {
    if (newMode === mode) return;
    setMode(newMode);
    
    // Reset state on mode switch
    if (isListening) stopListening();
    
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
      
      {/* 1. Header */}
      <Header 
        toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
        wsStatus={wsConnected} 
      />

      {/* 2. Main Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md px-6 shrink-0 min-h-[500px]">
        
        {/* Helper Text */}
        <p className={`text-sm font-medium mb-12 tracking-wide transition-opacity duration-300 ${isListening ? 'opacity-50' : 'opacity-80 text-[var(--text-sec)]'}`}>
          {status}
        </p>

        {/* Main Action Button */}
        <div className="relative mb-8 group shrink-0">
          {/* Animated Glow Ring when listening in Identify mode */}
          <div className={`absolute inset-0 rounded-full bg-[var(--accent)] blur-2xl transition-all duration-1000 ${isListening && mode === 'identify' ? 'opacity-20 scale-150' : 'opacity-0 scale-100'}`}></div>
          
          <button 
            onClick={handleMainAction}
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

        {/* Visualizer (Only visible in Identify Mode) */}
        <WaveformVisualizer isListening={isListening} stream={mediaStream} visible={mode === 'identify'} />

        {/* Mode Toggle Slider */}
        <ModeToggle mode={mode} setMode={handleModeChange} />

      </div>

      {/* 3. Recent History Section */}
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

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
