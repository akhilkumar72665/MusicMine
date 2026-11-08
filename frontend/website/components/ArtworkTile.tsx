import React, { useState } from 'react';
import { Disc3, Music2, Radio } from 'lucide-react';
import { DataSourceBadge } from '../../../shared/types/music';

interface ArtworkTileProps {
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  accentHex?: string;
  sourceType?: DataSourceBadge;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isPlaying?: boolean;
  rounded?: 'md' | 'lg' | 'full';
  className?: string;
}

export const ArtworkTile: React.FC<ArtworkTileProps> = ({
  title,
  subtitle,
  thumbnailUrl,
  accentHex = '#BC0202',
  size = 'md',
  isPlaying = false,
  rounded = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const radiusClass =
    rounded === 'full' ? 'rounded-full' : rounded === 'lg' ? 'rounded-xl' : 'rounded-lg';

  const initials = title
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div
      className={`relative overflow-hidden select-none bg-[#0A0A0A] border shrink-0 mm-float-thumb ${
        isPlaying
          ? 'border-[#FF0000] mm-float-playing'
          : size === 'xl'
          ? 'border-neutral-800/80 mm-float-playing'
          : 'border-neutral-800/80'
      } ${radiusClass} ${className}`}
      style={{
        background: `radial-gradient(circle at 22% 22%, ${accentHex}55 0%, #83000028 45%, #050505 100%)`,
      }}
    >
      {/* Decorative geometric vinyl grooves SVG */}
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 w-full h-full opacity-35 pointer-events-none"
        aria-hidden="true"
      >
        <circle cx="95" cy="25" r="46" fill="none" stroke={accentHex} strokeWidth="1.2" strokeDasharray="4 4" />
        <circle cx="95" cy="25" r="30" fill="none" stroke="#FFFFFF" strokeWidth="0.6" strokeOpacity="0.4" />
        <circle cx="20" cy="100" r="38" fill="none" stroke="#830000" strokeWidth="1.5" />
        <path
          d="M 10 65 Q 40 45, 70 65 T 115 60"
          fill="none"
          stroke={accentHex}
          strokeWidth="1.5"
          strokeOpacity="0.65"
        />
      </svg>

      {thumbnailUrl && !imgError ? (
        <img
          src={thumbnailUrl}
          alt={subtitle ? `${title} by ${subtitle}` : title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="relative z-10 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-2 text-center">
          {size === 'sm' ? (
            <Music2 className="w-4 h-4 text-[#FF0000]" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-black/70 border border-[#830000]/60 flex items-center justify-center shadow-inner">
                {rounded === 'full' ? (
                  <Radio className="w-4 h-4 text-[#FF0000]" />
                ) : (
                  <Disc3 className={`w-5 h-5 text-[#FF0000] ${isPlaying ? 'animate-spin' : ''}`} />
                )}
              </div>
              {size !== 'md' && (
                <span className="font-display font-bold text-xs tracking-wider text-white/90 mt-0.5">
                  {initials || 'MM'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subtle dark scrim for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none z-20" />
    </div>
  );
};
