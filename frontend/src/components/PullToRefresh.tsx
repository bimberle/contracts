import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IconRefresh } from '@tabler/icons-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  disabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Nur wenn am Anfang der Seite
    if (window.scrollY > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    if (window.scrollY > 0) {
      setPullDistance(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Reduzierte Geschwindigkeit für natürlicheres Gefühl
      const distance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(distance);
      
      // Verhindere normales Scroll-Verhalten beim Pull
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Touch events müssen am window/document sein für korrektes Pull-Verhalten
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const scale = 0.5 + progress * 0.5;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull-to-Refresh Indikator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="pull-refresh-indicator flex items-center justify-center bg-white shadow-lg rounded-full p-3"
          style={{
            transform: `translateX(-50%) translateY(${Math.min(pullDistance, threshold) - 10}px)`,
            opacity: progress,
          }}
        >
          <IconRefresh 
            size={24} 
            className={`text-blue-600 transition-transform ${isRefreshing ? 'pull-refresh-spinner' : ''}`}
            style={{ 
              transform: isRefreshing ? undefined : `rotate(${rotation}deg) scale(${scale})`,
            }}
          />
        </div>
      )}
      
      {/* Content mit Transform beim Ziehen */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.3}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
