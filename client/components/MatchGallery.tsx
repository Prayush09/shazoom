
import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SongResult } from '../types';
import { MatchResultCard } from './MatchResultCard';

interface MatchGalleryProps {
  matches: SongResult[];
}

export const MatchGallery: React.FC<MatchGalleryProps> = ({ matches }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = matches.length;

  // Touch handling state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Infinite Scroll Logic: Wrap around using modulo
  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handleSelect = (index: number) => {
    setActiveIndex(index);
  };

  // --- Touch Swipe Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Prev
      handlePrev();
    }

    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (matches.length === 0) return null;

  const getPositionStyle = (index: number) => {
    if (index === activeIndex) {
      return {
        transform: 'translateX(0) scale(1) translateZ(0) rotateY(0deg)',
        opacity: 1,
        zIndex: 30,
        filter: 'blur(0px)',
        pointerEvents: 'auto',
      };
    }

    const isRight = index === (activeIndex + 1) % total;
    
    const isLeft = index === (activeIndex - 1 + total) % total;

    if (isRight) {
      return {
        transform: 'translateX(60%) scale(0.85) translateZ(-100px) rotateY(-25deg)',
        opacity: 0.5,
        zIndex: 10,
        filter: 'blur(3px) grayscale(40%)',
        pointerEvents: 'auto',
      };
    }

    if (isLeft) {
      return {
        transform: 'translateX(-60%) scale(0.85) translateZ(-100px) rotateY(25deg)',
        opacity: 0.5,
        zIndex: 10,
        filter: 'blur(3px) grayscale(40%)',
        pointerEvents: 'auto', 
      };
    }

    // Fallback for cases with > 3 items (hidden behind)
    return {
      transform: 'translateZ(-200px) scale(0)',
      opacity: 0,
      zIndex: 0,
      filter: 'blur(10px)',
      pointerEvents: 'none',
    };
  };

  return (
    <div 
        className="w-full relative flex flex-col items-center outline-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      
      {/* 3D Stage */}
      <div className="relative w-full h-[340px] flex items-center justify-center perspective-[1000px] mb-2">
        {matches.map((song, index) => {
          const style = getPositionStyle(index);
          const isActive = index === activeIndex;

          return (
            <div
              key={index}
              onClick={() => !isActive && handleSelect(index)}
              className="absolute w-full max-w-[90%] md:max-w-[380px] transition-all duration-700 cubic-bezier(0.25, 0.8, 0.25, 1) origin-center cursor-pointer"
              style={{
                ...style,
                pointerEvents: style.pointerEvents as any
              }}
            >
              <MatchResultCard song={song} isActive={isActive} />
              
              {/* Overlay for non-active cards to darken/blur them further if needed */}
              {!isActive && (
                <div className="absolute inset-0 bg-black/10 rounded-2xl pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-6 z-40 mt-2">
        <button 
          onClick={handlePrev}
          className="hidden md:flex p-3 rounded-full bg-[var(--surface)] border border-[var(--highlight)] text-[var(--text)] hover:bg-[var(--accent)] hover:text-white hover:scale-110 transition-all shadow-lg"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Indicator Dots */}
        <div className="flex gap-2">
            {matches.map((_, i) => (
                <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-[var(--accent)] w-6' : 'bg-[var(--text-sec)] w-1.5 opacity-30'}`}
                />
            ))}
        </div>

        <button 
          onClick={handleNext}
          className="hidden md:flex p-3 rounded-full bg-[var(--surface)] border border-[var(--highlight)] text-[var(--text)] hover:bg-[var(--accent)] hover:text-white hover:scale-110 transition-all shadow-lg"
        >
          <ChevronRight size={24} />
        </button>
      </div>

    </div>
  );
};
