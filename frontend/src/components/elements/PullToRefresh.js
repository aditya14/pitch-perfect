import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ onRefresh, children, threshold = 80, maxPull = 120 }) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const isTouchActiveRef = useRef(false);
  
  // Check if the device is a mobile device to enable pull-to-refresh
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Check if the app is running in standalone mode (added to home screen)
  const isStandalone = () => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone || 
           document.referrer.includes('android-app://');
  };

  // Only enable pull-to-refresh on mobile devices or when in standalone mode
  const shouldEnablePullToRefresh = isMobile() || isStandalone();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldEnablePullToRefresh) return;

    const touchStartHandler = (e) => {
      // Only initiate pull-to-refresh if at the top of the page
      if (window.scrollY <= 0) {
        isTouchActiveRef.current = true;
        startYRef.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const touchMoveHandler = (e) => {
      if (!isTouchActiveRef.current) return;
      
      const currentY = e.touches[0].clientY;
      const distance = currentY - startYRef.current;
      
      // Only allow pulling down, not up
      if (distance > 0 && window.scrollY <= 0) {
        // Apply resistance to make the pull feel more natural
        const pull = Math.min(distance * 0.5, maxPull);
        setPullDistance(pull);
        
        // Prevent default scrolling behavior when pulling
        e.preventDefault();
      } else {
        setPullDistance(0);
      }
    };

    const touchEndHandler = () => {
      if (!isTouchActiveRef.current) return;
      
      isTouchActiveRef.current = false;
      
      // If pulled past threshold, trigger refresh
      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        
        // Call the refresh function
        if (onRefresh) {
          onRefresh();
        }
        
        // Reset after a short delay to show the refresh animation
        setTimeout(() => {
          setPullDistance(0);
          setIsRefreshing(false);
          setIsPulling(false);
        }, 1000);
      } else {
        // If not pulled far enough, just reset
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    container.addEventListener('touchstart', touchStartHandler);
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', touchEndHandler);

    return () => {
      container.removeEventListener('touchstart', touchStartHandler);
      container.removeEventListener('touchmove', touchMoveHandler);
      container.removeEventListener('touchend', touchEndHandler);
    };
  }, [onRefresh, pullDistance, threshold, maxPull, shouldEnablePullToRefresh]);

  return (
    <div ref={containerRef} className="min-h-screen relative w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Pull to refresh indicator */}
      {shouldEnablePullToRefresh && isPulling && (
        <div 
          className="fixed top-0 left-0 w-full z-50 flex justify-center transition-transform duration-200 pointer-events-none"
          style={{ 
            transform: `translateY(${pullDistance - 60}px)`,
            opacity: Math.min(pullDistance / threshold, 1)
          }}
        >
          <div className="flex items-center justify-center p-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-lg">
            <RefreshCw 
              className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : pullDistance >= threshold ? 'rotate-180' : `rotate-${Math.min(Math.floor((pullDistance / threshold) * 180), 180)}`}`}
            />
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div 
        className="theme-transition"
        style={{ 
          transform: isPulling ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;