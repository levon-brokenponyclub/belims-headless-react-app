import React, { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  label = "Hurry up! Offer ends in",
  onComplete,
}) => {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = targetDate.getTime() - new Date().getTime();

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      // Check if countdown is complete
      if (
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0
      ) {
        if (onComplete) onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number): string => {
    return num.toString().padStart(2, "0");
  };

  return (
    <div className="inline-flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
      <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
        {label}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-900">
            {formatNumber(timeLeft.days)}
          </span>
          <span className="text-xs text-gray-600">Days</span>
        </div>

        <span className="text-2xl font-bold text-gray-400">:</span>

        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-900">
            {formatNumber(timeLeft.hours)}
          </span>
          <span className="text-xs text-gray-600">Hours</span>
        </div>

        <span className="text-2xl font-bold text-gray-400">:</span>

        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-900">
            {formatNumber(timeLeft.minutes)}
          </span>
          <span className="text-xs text-gray-600">Minutes</span>
        </div>

        <span className="text-2xl font-bold text-gray-400">:</span>

        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-900">
            {formatNumber(timeLeft.seconds)}
          </span>
          <span className="text-xs text-gray-600">Seconds</span>
        </div>
      </div>
    </div>
  );
};
