import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import SimpleMatchPerformance from './SimpleMatchPerformance';
import DetailedMatchPerformance from './DetailedMatchPerformance';
import { getEventData } from '../../../utils/matchUtils';

const DEFAULT_APP_HEADER_HEIGHT = 64;
const APP_TO_CARD_GAP_PX = 8;
const CARD_TO_TABLE_GAP_PX = 0;

const MatchPerformanceContainer = ({ 
  playerEvents, 
  loading, 
  error, 
  sortConfig, 
  handleSort, 
  activeSquadId, 
  leagueId,
  isMobile
}) => {
  // Set initial view mode based on device - desktop: detailed, mobile: simple
  const [viewMode, setViewMode] = useState(isMobile ? 'simple' : 'detailed');
  const [portalHeaderStyle, setPortalHeaderStyle] = useState(null);
  const [tableStickyTop, setTableStickyTop] = useState(DEFAULT_APP_HEADER_HEIGHT + APP_TO_CARD_GAP_PX);
  const cardRef = useRef(null);
  const headerRef = useRef(null);
  
  // Update viewMode if isMobile changes (e.g. on window resize)
  useEffect(() => {
    setViewMode(isMobile ? 'simple' : 'detailed');
  }, [isMobile]);

  // Process the data once for both views
  const processedEvents = useMemo(() => {
    if (!playerEvents?.length) return [];
    return playerEvents.map(event => getEventData(event));
  }, [playerEvents]);

  const hasFantasyData = useMemo(() => {
    return playerEvents.some(event => event.fantasy_points || event.squad_name);
  }, [playerEvents]);

  // Toggle between simple and detailed views
  const toggleViewMode = () => {
    setViewMode(viewMode === 'simple' ? 'detailed' : 'simple');
  };

  useEffect(() => {
    const updatePinnedHeader = () => {
      const containerEl = cardRef.current;
      const headerEl = headerRef.current;
      if (!containerEl || !headerEl) return;

      const containerRect = containerEl.getBoundingClientRect();
      const fixedAppHeader = document.querySelector('header.fixed');
      const appHeaderHeight = fixedAppHeader
        ? fixedAppHeader.getBoundingClientRect().height
        : DEFAULT_APP_HEADER_HEIGHT;
      const headerHeight = Math.ceil(headerEl.getBoundingClientRect().height);
      const cardStickyTop = Math.round(appHeaderHeight + APP_TO_CARD_GAP_PX);
      const nextTableStickyTop = cardStickyTop + headerHeight + CARD_TO_TABLE_GAP_PX;

      setTableStickyTop((previousTop) => (
        previousTop === nextTableStickyTop ? previousTop : nextTableStickyTop
      ));

      const shouldPin =
        containerRect.top <= cardStickyTop &&
        containerRect.bottom - headerHeight > cardStickyTop;

      if (shouldPin) {
        const nextStyle = {
          top: cardStickyTop,
          left: Math.round(containerRect.left),
          width: Math.round(containerRect.width),
          zIndex: 49
        };

        setPortalHeaderStyle((previousStyle) => (
          previousStyle &&
          previousStyle.top === nextStyle.top &&
          previousStyle.left === nextStyle.left &&
          previousStyle.width === nextStyle.width
            ? previousStyle
            : nextStyle
        ));
      } else {
        setPortalHeaderStyle((previousStyle) => (previousStyle ? null : previousStyle));
      }
    };

    const onScrollOrResize = () => {
      requestAnimationFrame(updatePinnedHeader);
    };

    updatePinnedHeader();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [viewMode, isMobile]);

  const renderHeaderContent = (isPinned = false) => (
    <div
      className={`px-4 py-3 border-b border-neutral-200/70 dark:border-neutral-700/70 flex justify-between items-center ${
        isPinned ? 'lg-glass-tertiary rounded-t-xl shadow-sm' : ''
      }`}
    >
      <h2 className="text-lg font-caption font-semibold text-neutral-900 dark:text-white">
        Player Points
      </h2>
      <button
        onClick={toggleViewMode}
        className="p-1 lg-rounded-md lg-glass-tertiary text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
        title={viewMode === 'simple' ? 'Show detailed view' : 'Show simple view'}
      >
        {viewMode === 'simple' ? (
          <Maximize2 className="h-5 w-5" />
        ) : (
          <Minimize2 className="h-5 w-5" />
        )}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="lg-glass lg-rounded-xl p-4">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg-glass lg-rounded-xl p-4">
        <div className="text-red-500 dark:text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="lg-glass lg-rounded-xl overflow-visible">
      <div ref={headerRef}>
        {renderHeaderContent()}
      </div>

      {portalHeaderStyle && createPortal(
        <>
          {APP_TO_CARD_GAP_PX > 0 && (
            <div
              className="lg-glass-tertiary rounded-t-xl overflow-hidden"
              style={{
                position: 'fixed',
                top: `${Math.max(0, portalHeaderStyle.top - APP_TO_CARD_GAP_PX)}px`,
                left: `${portalHeaderStyle.left}px`,
                width: `${portalHeaderStyle.width}px`,
                height: `${APP_TO_CARD_GAP_PX}px`,
                zIndex: 48
              }}
            />
          )}
          <div style={{ position: 'fixed', ...portalHeaderStyle }}>
            {renderHeaderContent(true)}
          </div>
        </>,
        document.body
      )}

      {viewMode === 'simple' ? (
        <SimpleMatchPerformance 
          processedEvents={processedEvents}
          handleSort={handleSort}
          sortConfig={sortConfig}
          hasFantasyData={hasFantasyData}
          leagueId={leagueId}
          activeSquadId={activeSquadId}
          tableStickyTop={tableStickyTop}
        />
      ) : (
        <DetailedMatchPerformance 
          processedEvents={processedEvents}
          handleSort={handleSort}
          sortConfig={sortConfig}
          hasFantasyData={hasFantasyData}
          leagueId={leagueId}
          activeSquadId={activeSquadId}
          isMobile={isMobile}
          tableStickyTop={tableStickyTop}
        />
      )}
    </div>
  );
};

export default MatchPerformanceContainer;
