
import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
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
