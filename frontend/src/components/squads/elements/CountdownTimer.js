import React, { useState, useEffect } from 'react';

/**
 * Component that displays a countdown timer for the boost selection deadline
 */
const CountdownTimer = ({ onExpire }) => {
  const [timeLeft, setTimeLeft] = useState({});
  const lockDate = new Date('2025-04-19T10:00:00Z'); // April 19, 2025, 10am UTC

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = lockDate - new Date();
      
      if (difference <= 0) {
        if (onExpire) onExpire();
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false
      };
    };

    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpire]);

  if (timeLeft.expired) {
    return (
      <div className="rounded-lg bg-red-100 dark:bg-red-900 px-4 py-2 text-center w-full">
        <div className="text-sm font-bold text-red-700 dark:text-red-300">Lineup Locked</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900 px-4 py-3 w-full">
      <div className="text-xs text-neutral-600 dark:text-neutral-300 mb-1">Boost Picks Lock In:</div>
      <div className="flex space-x-2 text-center justify-center md:justify-start">
        <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.days}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">days</div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.hours}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">hrs</div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.minutes}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">min</div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded px-2 py-1 w-14">
          <div className="text-lg font-bold text-neutral-600 dark:text-neutral-400">{timeLeft.seconds}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">sec</div>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;