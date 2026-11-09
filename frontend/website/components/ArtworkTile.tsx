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
  rounded?: 'none' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const ArtworkTile: React.FC<ArtworkTileProps> = ({
  title,
  subtitle,
  thumbnailUrl,
  accentHex = '#E50914',
  size = 'md',
  isPlaying = false,
  rounded = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const radiusClass =
    rounded === 'none'
      ? 'rounded-none'
      : rounded === 'full'
      ? 'rounded-full'
      : rounded === 'xl'
      ? 'rounded-3xl'
      : rounded === 'lg'
      ? 'rounded-2xl'
      : 'rounded-lg';

  const initials = title
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div
      className={`relative overflow-hidden select-none bg-neutral-900 border shrink-0 aspect-square ${
        isPlaying
          ? 'border-red-500 ring-2 ring-red-500/30'
          : 'border-neutral-800'
      } ${radiusClass} ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${accentHex}25 0%, #171717 80%, #0A0A0A 100%)`,
      }}
    >
      {thumbnailUrl && !imgError ? (
        <img
          src={thumbnailUrl}
          alt={subtitle ? `${title} by ${subtitle}` : title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="relative z-10 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
          {size === 'sm' ? (
            <Music2 className="w-5 h-5 text-red-500" />
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shadow-inner">
                {rounded === 'full' ? (
                  <Radio className="w-5 h-5 text-red-500" />
                ) : (
                  <Disc3 className={`w-5 h-5 text-red-500 ${isPlaying ? 'animate-spin' : ''}`} />
                )}
              </div>
              <span className="font-display font-bold text-xs tracking-wider text-neutral-200 mt-0.5">
                {initials || 'MM'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
