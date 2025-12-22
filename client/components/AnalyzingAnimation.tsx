import React from 'react';

export const AnalyzingAnimation = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none">
      
      {/* 1. Background Ping (Subtle Radar) */}
      <div 
        className="absolute inset-0 m-2 rounded-full bg-[var(--accent)] opacity-10 animate-ping" 
        style={{ animationDuration: '2.5s' }} 
      />

      {/* 
        REMOVED: The outer dashed ring that was causing visual clutter.
      */}

      {/* 3. Middle Arc Ring (Loader) - Inward */}
      <div 
        className="absolute inset-0 m-12 rounded-full border-2 border-transparent border-t-[var(--accent)] border-l-[var(--accent)] opacity-80"
        style={{ animation: 'spinReverse 3s cubic-bezier(0.4, 0.0, 0.2, 1) infinite' }} 
      />

      {/* 4. Center Logo / Icon (Static Anchor) */}
      <div className="absolute z-20 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--highlight)] flex items-center justify-center shadow-lg">
             <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_10px_var(--accent)]"></div>
          </div>
      </div>

      {/* 5. ROTATING TEXT RING - Radius 70 */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <svg 
           viewBox="0 0 200 200" 
           className="w-full h-full absolute inset-0 text-[var(--text)] opacity-90"
           style={{ animation: 'spin 10s linear infinite' }}
        >
            <defs>
                <path id="textCircle" d="M 100, 100 m -70, 0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0" />
            </defs>
            
            <text className="text-[9px] font-bold tracking-[0.26em] uppercase fill-current font-[Outfit]">
                <textPath xlinkHref="#textCircle" startOffset="0%">
                    • SHAZOOM • AT WORK • SHAZOOM • AT WORK • SHAZOOM • AT WORK
                </textPath>
            </text>
        </svg>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
