/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WeatherEffectBadge, WeatherEffectKind } from '../game/constants';

interface WeatherEffectBadgesProps {
  badges?: WeatherEffectBadge[];
  compact?: boolean;
  showLabels?: boolean;
}

const EffectGlyph: React.FC<{ kind: WeatherEffectKind; isNegative: boolean }> = ({
  kind,
  isNegative,
}) => {
  switch (kind) {
    case 'speed':
      return (
        <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="none" aria-hidden="true">
          {/* Swift wind / shoe dash streaks */}
          <path
            d="M2.5 5.5h5.5M1.5 8.5h7M3.5 11.5h4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {isNegative ? (
            <path
              d="M11.5 4.5v6.5m0 0-2-2m2 2 2-2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M9.5 4.5l3.5 4-3.5 4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      );
    case 'stamina_regen':
      return (
        <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="none" aria-hidden="true">
          {/* Lightning bolt + upward regen spark */}
          <path
            d="M8.8 1.8L4.2 8.4h3.3l-.8 5.8 5.1-6.8H8.4l.4-5.6z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M13.2 2.5v3M11.7 4h3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'stamina_cost':
      return (
        <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="none" aria-hidden="true">
          {/* Sprint endurance bolt + consumption arrow */}
          <path
            d="M6.8 2L3 8h2.8l-.6 5.5L9.8 7H6.9L6.8 2z"
            fill="currentColor"
            opacity="0.9"
          />
          {isNegative ? (
            <path
              d="M12.5 10.5v-6m0 0-1.8 1.8m1.8-1.8 1.8 1.8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M12.5 4.5v6m0 0-1.8-1.8m1.8 1.8 1.8-1.8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      );
    case 'mana_regen':
      return (
        <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0" fill="none" aria-hidden="true">
          {/* 4-point celestial stardust / mana crystal */}
          <path
            d="M8 1.5l1.6 4.9L14.5 8l-4.9 1.6L8 14.5 6.4 9.6 1.5 8l4.9-1.6L8 1.5z"
            fill="currentColor"
            opacity="0.92"
          />
        </svg>
      );
  }
};

export const WeatherEffectBadges: React.FC<WeatherEffectBadgesProps> = ({
  badges,
  compact = false,
  showLabels = false,
}) => {
  if (!badges || badges.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {badges.map((badge) => {
        const isNegativeDelta = badge.delta.startsWith('-');
        const isPenalty = badge.tone === 'caution';
        const toneClasses =
          badge.tone === 'buff'
            ? 'bg-[#7bd88f]/25 text-[#1c6b3a] dark:bg-[#4ebd68]/25 dark:text-[#9ff2b8] border-[#7bd88f]/50'
            : badge.tone === 'caution'
            ? 'bg-[#ffb347]/25 text-[#8c4400] dark:bg-[#ffb347]/22 dark:text-[#ffd28f] border-[#ffb347]/50'
            : 'bg-[#b48cff]/25 text-[#5b35a8] dark:bg-[#9f76ff]/25 dark:text-[#e1ceff] border-[#b48cff]/50';

        // For stamina_cost, "-25%" is a stamina saving (beneficial), while "+20%" is extra strain
        const glyphDownward =
          badge.kind === 'stamina_cost' ? badge.tone === 'caution' : isNegativeDelta || isPenalty;

        return (
          <span
            key={`${badge.kind}-${badge.delta}`}
            title={badge.detail}
            aria-label={badge.detail}
            className={`inline-flex items-center gap-0.5 px-1 py-[1px] rounded-md border text-[9.5px] font-black leading-tight whitespace-nowrap ${toneClasses}`}
          >
            <EffectGlyph kind={badge.kind} isNegative={glyphDownward} />
            <span className="tabular-nums">{badge.delta}</span>
            {showLabels && !compact && (
              <span className="opacity-85 font-extrabold ml-0.5">{badge.label}</span>
            )}
          </span>
        );
      })}
    </span>
  );
};
