
import React, { useRef, useEffect } from 'react';

export const WaveformVisualizer = ({ isListening, stream, visible, theme }: { isListening: boolean, stream: MediaStream | null, visible: boolean, theme: 'light' | 'dark' }) => {
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
      ctx.fillStyle = theme === 'light' ? '#CBD5E1' : '#333333'; // Lighter dots for light theme
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
      
      if (theme === 'light') {
         // Purple/Indigo for Light Mode
         gradient.addColorStop(0, '#6366F1'); // Indigo-500
         gradient.addColorStop(0.5, '#818CF8'); // Indigo-400
         gradient.addColorStop(1, '#6366F1');
      } else {
         // Green for Dark Mode
         gradient.addColorStop(0, '#10b981'); // Emerald-500
         gradient.addColorStop(0.5, '#34d399'); // Emerald-400
         gradient.addColorStop(1, '#10b981');
      }

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
  }, [isListening, stream, theme]);

  return (
    <div className={`h-16 w-64 flex items-center justify-center mb-8 shrink-0 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <canvas ref={canvasRef} width={256} height={64} className="w-full h-full" />
    </div>
  );
};
