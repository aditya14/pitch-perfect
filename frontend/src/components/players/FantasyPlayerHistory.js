import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../utils/axios';
import { Calendar, Trophy, ArrowUp, ArrowDown } from 'lucide-react';

// Helper functions for colors
const getTextColor = (hexColor) => {
  if (!hexColor) return '#FFFFFF';
  
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Calculate luminance - simplified formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Use white text for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

const getLighterColor = (hexColor, opacity = 0.2) => {
  if (!hexColor) return 'rgba(59, 130, 246, 0.2)'; // Default blue with opacity
  
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const getDarkerColor = (hexColor) => {
  if (!hexColor) return '#2563EB'; // Default darker blue
  
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  
  // Make it darker by reducing each component by 30%
  const darker = {
    r: Math.max(0, Math.floor(r * 0.7)),
    g: Math.max(0, Math.floor(g * 0.7)),
    b: Math.max(0, Math.floor(b * 0.7))
  };
  
  return `#${darker.r.toString(16).padStart(2, '0')}${darker.g.toString(16).padStart(2, '0')}${darker.b.toString(16).padStart(2, '0')}`;
};

// Format date string
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatPoints = (value) => {
  if (Number.isFinite(value)) {
    return value.toFixed(1);
  }
  return '0.0';
};

const buildLegacyMetrics = (seasonStats, matches) => {
  const seasons = [...seasonStats].sort((a, b) => a.year - b.year);
  const totalMatches = seasons.reduce((sum, season) => sum + (season.matches || 0), 0) || matches.length;
  const totalPoints = seasons.reduce((sum, season) => sum + (season.total_points || 0), 0)
    || matches.reduce((sum, match) => sum + (match.points || 0), 0);

  const careerPPM = totalMatches ? totalPoints / totalMatches : 0;
  const peakSeason = seasons.reduce(
    (best, season) => {
      const ppm = season.points_per_match || 0;
      if (ppm > best.points_per_match) {
        return { year: season.year, points_per_match: ppm };
      }
      return best;
    },
    { year: null, points_per_match: 0 }
  );

  const seasonTrend = seasons.map((season, index) => {
    const ppm = season.points_per_match || 0;
    const prev = index > 0 ? (seasons[index - 1].points_per_match || 0) : null;
    return {
      year: season.year,
      ppm,
      delta: prev === null ? null : ppm - prev,
    };
  });

  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = a.match?.date ? new Date(a.match.date) : new Date(0);
    const dateB = b.match?.date ? new Date(b.match.date) : new Date(0);
    return dateB - dateA;
  });

  const signatureMatches = [...matches]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 3);

  const matchPoints = matches.map((match) => match.points || 0).filter((value) => Number.isFinite(value));
  const avgPoints = matchPoints.length ? matchPoints.reduce((sum, value) => sum + value, 0) / matchPoints.length : 0;
  const variance = matchPoints.length
    ? matchPoints.reduce((sum, value) => sum + Math.pow(value - avgPoints, 2), 0) / matchPoints.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const cv = avgPoints ? stdDev / avgPoints : 0;
  const consistencyScore = Math.max(0, Math.min(1, 1 - cv));

  let consistencyLabel = 'Steady';
  if (cv > 0.7) {
    consistencyLabel = 'Volatile';
  } else if (cv > 0.35) {
    consistencyLabel = 'Swingy';
  }

  const eraTotals = seasons.reduce(
    (acc, season) => ({
      runs: acc.runs + (season.runs || 0),
      wickets: acc.wickets + (season.wickets || 0),
      catches: acc.catches + (season.catches || 0),
    }),
    { runs: 0, wickets: 0, catches: 0 }
  );

  return {
    totalMatches,
    totalPoints,
    careerPPM,
    peakSeason,
    seasonTrend,
    signatureMatches,
    consistencyScore,
    consistencyLabel,
    eraTotals,
    recentMatches: sortedMatches.slice(0, 5),
  };
};

const SeasonOverview = ({ seasonStats }) => (
  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm ring-1 ring-neutral-900/5 dark:ring-neutral-700">
    <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-neutral-200 dark:border-neutral-700">
      <h3 className="text-xs sm:text-base font-semibold leading-6 text-neutral-900 dark:text-white">
        Career Overview
      </h3>
    </div>
    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
      <table className="w-full divide-y divide-neutral-200 dark:divide-neutral-700 table-fixed">
        <thead>
          <tr className="bg-neutral-50 dark:bg-neutral-900/50">
            <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Year</th>
            <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Mat</th>
            <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[20%]">Runs (SR)</th>
            <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[20%]">Wkt (Eco)</th>
            <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">C/St</th>
            <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Pts/M</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {seasonStats.map((season) => (
            <tr 
              key={season.year} 
              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm font-medium text-neutral-900 dark:text-white">{season.year}</td>
              <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">{season.matches}</td>
              <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">{season.runs}</span>
                <span className="text-neutral-500 dark:text-neutral-400 text-[9px]"> ({season.strike_rate?.toFixed(1) || 0})</span>
              </td>
              <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">
                <span className="font-medium">{season.wickets}</span>
                <span className="text-neutral-500 dark:text-neutral-400 text-[9px]"> ({season.economy?.toFixed(1) || 0})</span>
              </td>
              <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">{season.catches}</td>
              <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm font-medium">
                <span className={`
                  ${season.points_per_match >= 60 ? 'text-green-600 dark:text-green-400' :
                    season.points_per_match >= 35 ? 'text-blue-600 dark:text-blue-400' :
                    season.points_per_match < 10 ? 'text-red-600 dark:text-red-400' :
                    'text-yellow-600 dark:text-yellow-400'}
                `}>
                  {season.points_per_match?.toFixed(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const LegacyStory = ({ metrics }) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="lg-glass lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40 shadow-lg">
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 font-caption">
            Legacy Strip
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Career PPM</div>
              <div className="text-lg font-number text-neutral-900 dark:text-white">{formatPoints(metrics.careerPPM)}</div>
            </div>
            <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Prime Season</div>
              <div className="text-lg font-number text-neutral-900 dark:text-white">
                {metrics.peakSeason.year || 'N/A'}
              </div>
            </div>
            <div className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Career Points</div>
              <div className="text-lg font-number text-neutral-900 dark:text-white">
                {Math.round(metrics.totalPoints)}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Recent Form
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {metrics.recentMatches.length === 0 && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">No matches yet.</span>
              )}
              {metrics.recentMatches.map((match, index) => (
                <div
                  key={`${match.match?.id || 'match'}-${index}`}
                  className="lg-glass-tertiary lg-rounded-md px-3 py-2 text-center min-w-[64px]"
                >
                  <div className="text-sm font-number text-neutral-900 dark:text-white">
                    {Math.round(match.points || 0)}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {formatDate(match.match?.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg-glass-secondary lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40 shadow-lg">
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 font-caption">
            Consistency Meter
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>{metrics.consistencyLabel}</span>
              <span>{Math.round(metrics.consistencyScore * 100)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-neutral-200/70 dark:bg-neutral-700/70 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
                style={{ width: `${Math.round(metrics.consistencyScore * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="lg-glass-tertiary lg-rounded-md px-2 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Runs</div>
              <div className="text-sm font-number text-neutral-900 dark:text-white">{metrics.eraTotals.runs}</div>
            </div>
            <div className="lg-glass-tertiary lg-rounded-md px-2 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Wickets</div>
              <div className="text-sm font-number text-neutral-900 dark:text-white">{metrics.eraTotals.wickets}</div>
            </div>
            <div className="lg-glass-tertiary lg-rounded-md px-2 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Catches</div>
              <div className="text-sm font-number text-neutral-900 dark:text-white">{metrics.eraTotals.catches}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg-glass-tertiary lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40 shadow-lg">
        <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 font-caption">
          Season Reel
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {metrics.seasonTrend.length === 0 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">No seasons yet.</span>
          )}
          {metrics.seasonTrend.map((season) => (
            <div key={season.year} className="lg-glass lg-rounded-md px-3 py-2 text-center min-w-[72px]">
              <div className="text-sm font-number text-neutral-900 dark:text-white">{formatPoints(season.ppm)}</div>
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{season.year}</div>
              {season.delta !== null && (
                <div className={`mt-1 flex items-center justify-center text-[9px] font-medium ${
                  season.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {season.delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  <span>{formatPoints(Math.abs(season.delta))}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="lg-glass-tertiary lg-rounded-xl p-4 border border-white/20 dark:border-neutral-700/40 shadow-lg">
        <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400 font-caption">
          Signature Moments
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {metrics.signatureMatches.length === 0 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">No match highlights yet.</span>
          )}
          {metrics.signatureMatches.map((match, index) => (
            <div key={`${match.match?.id || 'sig'}-${index}`} className="lg-glass lg-rounded-md px-3 py-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(match.match?.date)}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-neutral-900 dark:text-white">
                {match.for_team ? `${match.for_team} vs ${match.opponent}` : `vs ${match.opponent}`}
              </div>
              <div className="mt-2 text-xl font-number text-neutral-900 dark:text-white">
                {Math.round(match.points || 0)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                points
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Enhanced broadcast-style MatchCard component
const MatchCard = ({ match }) => {
  const squadColor = match.squad_color || '#3B82F6'; // Default to blue
  const textColor = getTextColor(squadColor);
  const darkerColor = getDarkerColor(squadColor);
  const matchDate = formatDate(match.match?.date);
  
  // Determine performance level for visual indicators
  const getPerformanceLevel = (points) => {
    if (points >= 100) return 'exceptional';
    if (points >= 60) return 'great';
    if (points >= 35) return 'good';
    if (points < 10) return 'poor';
    return 'average';
  };
  
  const performanceLevel = getPerformanceLevel(match.totalPoints || match.points);
  const points = match.totalPoints || match.points;
  
  // Custom shadow colors based on squad color
  const shadowColor = getLighterColor(squadColor, 0.5);
  
  return (
    <div 
      className="rounded-xl overflow-hidden shadow-lg dark:shadow-neutral-900/30 relative bg-white dark:bg-neutral-800 mb-4"
      style={{ 
        boxShadow: `0 4px 6px ${shadowColor}, 0 1px 3px ${shadowColor}`
      }}
    >
      {/* Top edge accent bar */}
      <div 
        className="h-1.5 w-full"
        style={{ 
          background: `linear-gradient(90deg, ${squadColor}, ${darkerColor})`
        }}
      ></div>
      
      {/* Card Header */}
      <div className="px-4 pt-3 pb-2 flex justify-between items-center border-b"
           style={{ borderColor: getLighterColor(squadColor, 0.2) }}>
        <div className="flex items-center">
          {/* Team badge - circular with squad color */}
          <div 
            className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-xs font-bold shadow-sm"
            style={{ 
              backgroundColor: squadColor,
              color: textColor,
              boxShadow: `inset 0 0 0 2px ${getLighterColor(squadColor, 0.5)}`
            }}
          >
            {match.squad?.substring(0, 2).toUpperCase() || match.for_team?.substring(0, 2).toUpperCase()}
          </div>
          
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white text-sm sm:text-base">
              {match.for_team}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              vs {match.opponent}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mb-1 justify-end">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            {matchDate}
          </div>
          
          {/* Role badge if available */}
          {match.boost_label && (
            <span 
              className="text-2xs px-2 py-0.5 rounded-full font-medium"
              style={{ 
                backgroundColor: squadColor,
                color: textColor
              }}
            >
              {match.boost_label}
            </span>
          )}
        </div>
      </div>
      
      {/* Main content with stats */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Left section - Stats */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Batting stats */}
          {match.batting && (
            <div className="bg-neutral-50 dark:bg-neutral-700/40 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">BATTING</h4>
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{match.batting.points} pts</span>
              </div>
              
              <div className="text-sm sm:text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                {match.batting.runs}({match.batting.balls})
                {match.batting.not_out && <span className="ml-1">*</span>}
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                {match.batting.fours > 0 && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                    <span>{match.batting.fours}x4</span>
                  </div>
                )}
                {match.batting.sixes > 0 && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                    <span>{match.batting.sixes}x6</span>
                  </div>
                )}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                  <span>SR: {match.batting.strike_rate?.toFixed(1) || '-'}</span>
                  <span className="ml-1">
                    {match.batting.strike_rate >= 150 ? <ArrowUp className="h-3 w-3 text-green-500" /> : 
                     match.batting.strike_rate < 100 ? <ArrowDown className="h-3 w-3 text-red-500" /> : null}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Bowling stats */}
          {match.bowling && (
            <div className="bg-neutral-50 dark:bg-neutral-700/40 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">BOWLING</h4>
                <span className="text-xs font-medium text-right text-neutral-600 dark:text-neutral-400">{match.bowling.points} pts</span>
              </div>
              
              <div className="text-sm sm:text-base font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                {match.bowling.wickets}/{match.bowling.runs} ({match.bowling.overs})
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                {match.bowling.maidens > 0 && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                    <span>{match.bowling.maidens} maiden{match.bowling.maidens > 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                  <span>Econ: {match.bowling.economy?.toFixed(2) || '-'}</span>
                  <span className="ml-1">
                    {match.bowling.economy < 6 ? <ArrowUp className="h-3 w-3 text-green-500" /> : 
                     match.bowling.economy > 9 ? <ArrowDown className="h-3 w-3 text-red-500" /> : null}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Fielding stats */}
          {match.fielding && (
            <div className="bg-neutral-50 dark:bg-neutral-700/40 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400">FIELDING</h4>
                <span className="text-xs font-medium text-right text-neutral-600 dark:text-neutral-400">{match.fielding.points} pts</span>
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                {match.fielding.catches > 0 && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                    <span>{match.fielding.catches} catch{match.fielding.catches > 1 ? 'es' : ''}</span>
                  </div>
                )}
                {match.fielding.stumpings > 0 && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                    <span>{match.fielding.stumpings} stumping{match.fielding.stumpings > 1 ? 's' : ''}</span>
                  </div>
                )}
                {match.fielding.runouts > 0 && (
                  <div className="flex items-center bg-neutral-100 dark:bg-neutral-600/50 px-1.5 py-0.5 rounded">
                    <span>{match.fielding.runouts} run out{match.fielding.runouts > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Right section - Total points */}
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            {/* Performance indicator */}
            {points >= 100 && (
              <div className="mb-2">
                <Trophy className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
              </div>
            )}
            
            {/* Points display */}
            <div 
              className="flex flex-col items-center justify-center rounded-lg py-3 px-6 mb-1"
              style={{ 
                backgroundColor: squadColor,
                color: textColor
              }}
            >
              <div className="text-xl sm:text-2xl font-bold">
                {points}
              </div>
              <div className="text-xs uppercase">points</div>
            </div>
            
            {/* Base and boost points */}
            {match.basePoints && (
              <div className="text-xs text-neutral-600 dark:text-neutral-400 flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span>Base:</span>
                  <span className="font-medium">{match.basePoints}</span>
                </div>
                {match.boostPoints > 0 && (
                  <div className="flex items-center gap-1">
                    <span>Boost:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">+{match.boostPoints}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MatchCards = ({ matches }) => {
  if (matches.length === 0) {
    return (
      <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
        No match history available for this player.
      </div>
    );
  }

  // Sort matches by date, most recent first
  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = a.match?.date ? new Date(a.match.date) : new Date(0);
    const dateB = b.match?.date ? new Date(b.match.date) : new Date(0);
    return dateB - dateA;
  });

  return (
    <div className="mt-4">
      {sortedMatches.map((match, index) => (
        <MatchCard key={`match-${index}`} match={match} />
      ))}
    </div>
  );
};

const MatchHistory = ({ matches, currentSeason, onSeasonChange, seasons }) => {
  const seasonMatches = matches.filter(m => m.match.season.year === currentSeason);
  
  return (
    <div className="mt-6 bg-white dark:bg-neutral-800 rounded-lg shadow-sm ring-1 ring-neutral-900/5 dark:ring-neutral-700">
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-base font-semibold leading-6 text-neutral-900 dark:text-white">
            Match History ({seasonMatches.length})
          </h3>
          <select 
            value={currentSeason}
            onChange={(e) => onSeasonChange(Number(e.target.value))}
            className="rounded-md border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white text-[10px] sm:text-xs py-1"
          >
            {seasons.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
        <table className="w-full divide-y divide-neutral-200 dark:divide-neutral-700 table-fixed">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900/50">
              <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Date</th>
              <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[15%]">Teams</th>
              <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[25%]">Batting</th>
              <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[25%]">Bowling</th>
              <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[10%]">Field</th>
              <th className="px-1 sm:px-4 py-1 sm:py-3 text-left text-[9px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider w-[10%]">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {seasonMatches.map((match, index) => (
              <tr 
                key={index} 
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-900 dark:text-white">
                  <a
                    href={`/matches/${match.match.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  >
                    {new Date(match.match.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  </a>
                </td>
                <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">
                  <div className="font-medium truncate">{match.for_team.split(' ').slice(0, 2).join(' ')}</div>
                  <div className="text-[9px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">vs {match.opponent.split(' ').slice(0, 2).join(' ')}</div>
                </td>
                <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">
                  {match.batting ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{match.batting.runs}({match.batting.balls})</span>
                      <span className="text-[9px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                        {match.batting.fours > 0 && `${match.batting.fours}x4 `}
                        {match.batting.sixes > 0 && `${match.batting.sixes}x6 `}
                        SR: {match.batting.strike_rate?.toFixed(1)}
                      </span>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">
                  {match.bowling ? (
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {match.bowling.wickets}/{match.bowling.runs} ({match.bowling.overs})
                      </span>
                      <span className="text-[9px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                        {match.bowling.maidens > 0 && `${match.bowling.maidens}M `}
                        Econ: {match.bowling.economy?.toFixed(1)}
                      </span>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm text-neutral-700 dark:text-neutral-300">
                  {match.fielding ? (
                    <div className="whitespace-nowrap">
                      {match.fielding.catches > 0 && <span>{match.fielding.catches}c </span>}
                      {match.fielding.stumpings > 0 && <span>{match.fielding.stumpings}st </span>}
                      {match.fielding.runouts > 0 && <span>{match.fielding.runouts}ro</span>}
                    </div>
                  ) : '-'}
                </td>
                <td className="px-1 sm:px-4 py-1 sm:py-3 text-[10px] sm:text-sm font-medium">
                  <span className={`
                    ${match.points >= 60 ? 'text-green-600 dark:text-green-400' :
                      match.points >= 35 ? 'text-blue-600 dark:text-blue-400' :
                      match.points < 10 ? 'text-red-600 dark:text-red-400' :
                      'text-yellow-600 dark:text-yellow-400'}
                  `}>
                    {match.points} {match.points >= 120 && 'HOT'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FantasyPlayerHistory = ({ player, viewMode = 'collector' }) => {
  const [seasonStats, setSeasonStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const legacyMetrics = useMemo(() => buildLegacyMetrics(seasonStats, matches), [seasonStats, matches]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/players/${player.id}/history/`);
        console.log('Player history data:', response.data);
        setSeasonStats(response.data.seasonStats);
        setMatches(response.data.matches);
        // Set current season to most recent
        setCurrentSeason(response.data.seasonStats[0]?.year || null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load player history');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchHistory();
  }, [player.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent dark:border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 text-center py-8">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {viewMode === 'collector' ? (
        <LegacyStory metrics={legacyMetrics} />
      ) : (
        <>
          <SeasonOverview seasonStats={seasonStats} />
          {currentSeason && (
            <MatchHistory 
              matches={matches}
              currentSeason={currentSeason}
              onSeasonChange={setCurrentSeason}
              seasons={seasonStats.map(s => s.year)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default FantasyPlayerHistory;
