import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { Mic, Moon, Sun, Heart, Share2, ExternalLink, Wifi, WifiOff, Disc, Plus, Music, ChevronDown } from 'lucide-react';

// --- Types ---
interface SongResult {
  title: string;
  artist: string;
  album: string;
  coverArt: string;
  timeAgo: string;
}

interface WebSocketMessage {
  type: 'status' | 'result' | 'error';
  data?: any;
  message?: string;
}

// --- Global Styles ---
const GlobalStyles = () => (
  <style>{`
    :root {
      --font-main: 'Outfit', sans-serif;
      
      /* Default to Dark (Reference Design) */
      --bg-dark: #000000;
      --surface-dark: #121212;
      --surface-highlight: #1E1E1E;
      --text-main-dark: #FFFFFF;
      --text-sec-dark: #A1A1AA;
      --accent-color: #1DB954; /* Spotify/Shazam Green */
      
      /* Light Theme (Inverted) */
      --bg-light: #FFFFFF;
      --surface-light: #F4F4F5;
      --surface-highlight-light: #E4E4E7;
      --text-main-light: #000000;
      --text-sec-light: #52525B;
    }

    body {
      font-family: var(--font-main);
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .theme-dark {
      background-color: var(--bg-dark);
      color: var(--text-main-dark);
      --bg: var(--bg-dark);
      --surface: var(--surface-dark);
      --highlight: var(--surface-highlight);
      --text: var(--text-main-dark);
      --text-sec: var(--text-sec-dark);
      --accent: var(--accent-color);
      --ring-color: #333333;
    }

    .theme-light {
      background-color: var(--bg-light);
      color: var(--text-main-light);
      --bg: var(--bg-light);
      --surface: var(--surface-light);
      --highlight: var(--surface-highlight-light);
      --text: var(--text-main-light);
      --text-sec: var(--text-sec-light);
      --accent: #6366F1;
      --ring-color: #E5E7EB;
    }

    /* Scrollbar hiding */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

// --- Components ---

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
             if (containerRef.current) containerRef.current.style.display = 'none';
             onComplete();
          }
        });
      }
    });

    tl.fromTo(textRef.current, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
    ).to(textRef.current, 
      { opacity: 1, duration: 0.5 } // hold
    );
    
    return () => { tl.kill(); };
  }, [onComplete]);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
      <div ref={textRef} className="tracking-[0.3em] font-medium text-xl uppercase">
        Shazoom
      </div>
    </div>
  );
};

const Header = ({ toggleTheme, wsStatus }: { toggleTheme: () => void, wsStatus: boolean }) => {
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

// --- Waveform Visualizer (Bar Style) ---
const WaveformVisualizer = ({ isListening, stream }: { isListening: boolean, stream: MediaStream | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If not listening, draw a static flat line or nothing
    if (!isListening || !stream) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // Draw static dots/line
      ctx.fillStyle = '#333';
      const centerY = canvas.height / 2;
      const dotCount = 40;
      const spacing = canvas.width / dotCount;
      for(let i = 0; i < dotCount; i++) {
        ctx.beginPath();
        ctx.arc(i * spacing + spacing/2, centerY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 64; // Smaller FFT for fewer bars
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 0.5;
      const gap = (canvas.width / bufferLength) * 0.5;
      const centerY = canvas.height / 2;
      
      // Gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#10b981'); // Green-500
      gradient.addColorStop(0.5, '#34d399'); // Green-400
      gradient.addColorStop(1, '#10b981');

      ctx.fillStyle = gradient;

      for (let i = 0; i < bufferLength; i++) {
        // Mirror visuals from center out is common, but linear is fine too.
        // Let's do a simple linear for the "Voice" look.
        // We trim the high/low ends for better visuals
        if (i < 2 || i > bufferLength - 2) continue;

        let val = dataArray[i];
        // Scale opacity/height
        const percent = val / 255;
        const h = 5 + (percent * 40); // Base height + dynamic
        
        // Rounded caps
        const x = i * (barWidth + gap);
        const y = centerY - h / 2;

        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 10); 
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      source.disconnect();
      analyser.disconnect();
      if (audioCtx.state !== 'closed') audioCtx.close();
    };
  }, [isListening, stream]);

  return (
    <div className="h-16 w-64 flex items-center justify-center mb-8 shrink-0">
      <canvas ref={canvasRef} width={256} height={64} className="w-full h-full" />
    </div>
  );
};

const RecentItem = ({ song }: { song: SongResult }) => (
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

const App = () => {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Tap to identify');
  const [wsConnected, setWsConnected] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  
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
    setIsListening(false);
    setStatus('Tap to identify');
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
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

  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      setStatus('Tap to identify');
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        setMediaStream(null);
      }
      return;
    }

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
    }
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

        {/* Main Mic Button */}
        <div className="relative mb-8 group shrink-0">
          {/* Animated Glow Ring when listening */}
          <div className={`absolute inset-0 rounded-full bg-[var(--accent)] blur-2xl transition-all duration-1000 ${isListening ? 'opacity-20 scale-150' : 'opacity-0 scale-100'}`}></div>
          
          <button 
            onClick={toggleListening}
            className={`
              w-40 h-40 rounded-full flex items-center justify-center z-10 relative
              bg-[var(--surface-dark)] 
              border-[1px] border-[var(--ring-color)]
              transition-transform duration-300 ease-in-out
              active:scale-95
              shadow-2xl
              ${isListening ? 'scale-105 border-[var(--accent)]' : 'hover:scale-105'}
            `}
          >
             <Mic 
              size={48} 
              className={`transition-colors duration-300 ${isListening ? 'text-[var(--accent)]' : 'text-white'}`} 
              strokeWidth={1.5}
            />
          </button>
        </div>

        {/* Visualizer (Replaces the large one) */}
        <WaveformVisualizer isListening={isListening} stream={mediaStream} />

        {/* Action Button */}
        <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--highlight)] text-[var(--text)] text-sm font-medium hover:bg-[var(--surface-light)]/10 transition-colors border border-[var(--ring-color)] mb-12 shrink-0">
          <Plus size={16} />
          <span>Add Song</span>
        </button>

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