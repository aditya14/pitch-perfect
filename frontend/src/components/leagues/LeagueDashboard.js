import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTextColorForBackground } from '../../utils/colorUtils';
import api from '../../utils/axios';
import MatchCard from '../matches/MatchCard';
import MatchCardMin from '../matches/MatchCardMin';
import LeagueRunningTotal from '../elements/graphs/LeagueRunningTotal';

// Simple Fireworks component using canvas
const Fireworks = ({ color }) => {
  useEffect(() => {
    // Only run on mount
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = 50;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    function randomBetween(a, b) {
      return a + Math.random() * (b - a);
    }

    function createFirework() {
      const x = randomBetween(0.2, 0.8) * canvas.width;
      const y = randomBetween(0.2, 0.5) * canvas.height;
      const count = 32;
      for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        const speed = randomBetween(2, 5);
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
        });
      }
    }

    let fireworkInterval = setInterval(createFirework, 800);
    createFirework();

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, idx) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04; // gravity
        p.alpha -= 0.012;
      });
      particles = particles.filter(p => p.alpha > 0);
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();

    // Resize handler
    function handleResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(fireworkInterval);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.body.removeChild(canvas);
    };
  }, [color]);
  return null;
};

const LeagueDashboard = ({ league }) => {
  const navigate = useNavigate();
  const [recentMatches, setRecentMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [matchTab, setMatchTab] = useState('recent'); // 'recent' or 'upcoming'

  useEffect(() => {
    if (league?.season?.id) {
      fetchMatches();
    }
  }, [league?.season?.id]);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    // Fetch recent/live matches
    let recent = [];
    try {
      let response;
      try {
        response = await api.get(`/seasons/${league.season.id}/matches/recent/`);
        recent = response.data;
      } catch (err) {
        // fallback: filter from all matches
        response = await api.get(`/seasons/${league.season.id}/matches/`);
        const allMatches = response.data;
        recent = allMatches
          .filter(match => match.status === 'COMPLETED' || match.status === 'LIVE')
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 2);
      }
      setRecentMatches(recent);
    } catch (err) {
      setRecentMatches([]);
    }

    // Fetch upcoming matches (needs backend endpoint, fallback to filter)
    try {
      let response;
      try {
        response = await api.get(`/seasons/${league.season.id}/matches/upcoming/`);
        setUpcomingMatches(response.data.slice(0, 3));
      } catch (err) {
        // fallback: filter from all matches
        response = await api.get(`/seasons/${league.season.id}/matches/`);
        const allMatches = response.data;
        const upcoming = allMatches
          .filter(match => match.status === 'SCHEDULED')
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);
        setUpcomingMatches(upcoming);
      }
    } catch (err) {
      setUpcomingMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleSquadClick = (squadId) => {
    navigate(`/squads/${squadId}`);
  };

  // Helper for preview button logic
  const canShowPreview = (match) =>
    match.team_1 && match.team_2 && match.team_1.short_name !== 'TBD' && match.team_2.short_name !== 'TBD';

  // Add this helper
  const isSeasonCompleted = league?.season?.status === 'COMPLETED';
  const firstSquad = league.squads?.length > 0
    ? league.squads.slice().sort((a, b) => b.total_points - a.total_points)[0]
    : null;

  return (
    <div className="space-y-8">
      {/* Fireworks overlay if season is completed and there is a winner */}
      {isSeasonCompleted && firstSquad && (
        <Fireworks color={firstSquad.color || '#FFD700'} />
      )}
      {/* Congratulatory banner */}
      {isSeasonCompleted && firstSquad && (
        <div
          className="flex flex-col sm:flex-row items-center justify-center rounded-lg shadow mb-2 py-3 px-3 sm:py-4 sm:px-6 font-caption text-lg sm:text-xl text-center gap-2 sm:gap-0"
          style={{
            background: `linear-gradient(90deg, ${firstSquad.color}22 0%, #fff 100%)`,
            border: `2px solid ${firstSquad.color || '#FFD700'}`,
            wordBreak: 'break-word',
          }}
        >
          <span style={{ fontSize: 28, marginRight: 5, marginBottom: 4 }}>🎉</span>
          <span>
            Congratulations <span className="font-bold">{firstSquad.name}</span>! Winner of <span className="font-bold">{league.name} {league.season.name}</span>!
          </span>
        </div>
      )}
      {/* League table and recent/upcoming matches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* League Table */}
        <div className="bg-white dark:bg-neutral-950 shadow rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-xl font-caption font-semibold text-neutral-900 dark:text-white">
              Table
            </h2>
          </div>
          <div className="p-1">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
              <thead className="bg-neutral-50 dark:bg-black">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Squad
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-300 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-900">
                {league.squads
                  ?.sort((a, b) => b.total_points - a.total_points)
                  .map((squad, index) => (
                    <tr
                      key={squad.id}
                      onClick={() => handleSquadClick(squad.id)}
                      className={`cursor-pointer ${
                        index === 0
                          ? 'h-16' 
                          : 'hover:bg-neutral-50 dark:hover:bg-black'
                      }`}
                      style={index === 0 ? { backgroundColor: `${squad.color}15` } : {}}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-neutral-900 dark:text-white ${index === 0 ? 'text-md font-semibold' : 'text-sm'}`}>
                        {index === 0 && isSeasonCompleted ? (
                          <span role="img" aria-label="Trophy" title="Winner" style={{ fontSize: 28, verticalAlign: 'middle', color: firstSquad?.color || '#FFD700', filter: 'drop-shadow(0 0 2px #0003)' }}>
                            🏆
                          </span>
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span
                          className="inline-block h-4 w-1 mr-1 rounded-sm"
                          style={{ backgroundColor: squad.color }}
                          ></span>
                          <span className={`font-medium font-caption text-neutral-800 dark:text-neutral-200 ${index === 0 ? 'text-md font-semibold' : 'text-sm'}`}>
                          {squad.name}
                          </span>
                        </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-semibold text-neutral-900 dark:text-white font-number ${index === 0 ? 'text-sm' : 'text-sm'}`}>
                        {squad.total_points}
                        </td>
                      </tr>
                      ))}
                    {(!league.squads || league.squads.length === 0) && (
                      <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        No squads have joined this league yet.
                      </td>
                      </tr>
                    )}
                    </tbody>
                  </table>
                  </div>
                </div>

                {/* Matches Section with pills */}
                  <div className="space-y-4 max-w-[560px]">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <button
                    onClick={() => setMatchTab('recent')}
                    className={`px-2 py-1 text-sm rounded ${
                      matchTab === 'recent' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                        >
                    Live/Recent
                        </button>
                        <button
                    onClick={() => setMatchTab('upcoming')}
                    className={`px-2 py-1 text-sm rounded ${
                      matchTab === 'upcoming' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                        >
                    Upcoming
                        </button>
                      </div>
                    </div>
                    {loadingMatches ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                    <div key={i} className="h-40 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse"></div>
                        ))}
                      </div>
                    ) : matchTab === 'recent' ? (
                      recentMatches.length > 0 ? (
                        <div className="space-y-4">
                    {recentMatches.map(match => (
                      <MatchCard 
                        key={match.id} 
                        match={match} 
                        leagueId={league.id} 
                        compact={true}
                      />
                    ))}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-neutral-800 shadow border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center">
                    <p className="text-neutral-500 dark:text-neutral-400">No recent matches available</p>
                        </div>
                      )
                    ) : (
                      upcomingMatches.length > 0 ? (
                        <div className="space-y-4">
                        {upcomingMatches.map(match => (
                          <MatchCard 
                            key={match.id}
                            match={{
                              ...match,
                              team_1: match.team_1
                                ? { ...match.team_1, name: match.team_1.name || 'TBD', short_name: match.team_1.short_name || 'TBD' }
                                : { name: 'TBD', short_name: 'TBD' },
                              team_2: match.team_2
                                ? { ...match.team_2, name: match.team_2.name || 'TBD', short_name: match.team_2.short_name || 'TBD' }
                                : { name: 'TBD', short_name: 'TBD' }
                            }}
                            leagueId={league.id}
                            compact={true}
                          />
                        ))}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-neutral-800 shadow border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center">
                    <p className="text-neutral-500 dark:text-neutral-400">No upcoming matches available</p>
                        </div>
                      )
                    )}
                  </div>
                      </div>
                      {/* Running Total Graph */}
      <LeagueRunningTotal league={league} />
    </div>
  );
};

export default LeagueDashboard;