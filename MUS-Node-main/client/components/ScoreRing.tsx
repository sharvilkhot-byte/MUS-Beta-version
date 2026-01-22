import React from 'react';

interface ScoreRingProps {
  score: number; // Score out of 10
  size?: number;
  strokeWidth?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 74,
  strokeWidth = 8,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  // Cap score between 0 and 10 to prevent weird SVG behavior
  const cappedScore = Math.max(0, Math.min(10, score));
  const offset = circumference - (cappedScore / 10) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 9) return { main: '#16a34a', grad: 'url(#gradient-green)' }; // green-600
    if (s >= 7) return { main: '#ca8a04', grad: 'url(#gradient-yellow)' }; // yellow-600
    if (s >= 5) return { main: '#f97316', grad: 'url(#gradient-orange)' }; // orange-500
    return { main: '#dc2626', grad: 'url(#gradient-red)' }; // red-600
  };
  
  const {main: color, grad: gradient} = getScoreColor(cappedScore);
  const scoreText = score % 1 === 0 ? score.toFixed(0) : score.toFixed(1);

  const angle = Math.PI - (cappedScore / 10) * Math.PI;
  const indicatorX = size / 2 + radius * Math.cos(angle);
  const indicatorY = size / 2 - radius * Math.sin(angle);

  return (
    <div className="relative" style={{ width: size, height: size / 2 + strokeWidth }}>
      <svg
        width={size}
        height={size / 2 + strokeWidth}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        className="absolute top-0 left-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="gradient-yellow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
           <linearGradient id="gradient-orange" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#e5e7eb" // gray-200
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={gradient}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-out',
          }}
        />
        {/* Indicator */}
        <g style={{ transition: 'transform 0.5s ease-out', transform: `translate(${indicatorX}px, ${indicatorY}px)` }}>
          <circle 
            r={strokeWidth / 2}
            fill={color}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
          />
        </g>
      </svg>
      <div
        className="absolute w-full text-center flex items-baseline justify-center"
        style={{ color, top: '40%', transform: 'translateY(-50%)' }}
      >
        <span className="font-bold text-xl leading-none">{scoreText}</span>
        <span className="text-xs font-semibold leading-none">/10</span>
      </div>
    </div>
  );
};
