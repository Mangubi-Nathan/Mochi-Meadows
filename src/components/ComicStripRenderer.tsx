import React from 'react';
import { ComicCharacterPose, ComicPanel, GazetteComic } from '../game/gazetteData';

interface ComicStripRendererProps {
  comic: GazetteComic;
  compact?: boolean;
}

const BG_THEMES: Record<
  ComicPanel['bg'],
  { skyTop: string; skyBot: string; ground: string; detail: string }
> = {
  meadow: { skyTop: '#a3e4ff', skyBot: '#dcf7ff', ground: '#9ee087', detail: '#7bc966' },
  shore: { skyTop: '#9be0ff', skyBot: '#fff0d6', ground: '#f5dfae', detail: '#5ec7e6' },
  sea: { skyTop: '#1e5b9b', skyBot: '#2983b8', ground: '#38a5c3', detail: '#ff95ad' },
  sky: { skyTop: '#7cc7f7', skyBot: '#e4f6ff', ground: '#ffffff', detail: '#d4ecff' },
  glowdeep: { skyTop: '#16112b', skyBot: '#291f4d', ground: '#34255c', detail: '#52e3c2' },
  moonroad: { skyTop: '#1b1638', skyBot: '#392c6b', ground: '#4a3a7a', detail: '#ffd23f' },
  bakery: { skyTop: '#fff3db', skyBot: '#ffe6c7', ground: '#e2b98a', detail: '#ff9ebb' },
  teahouse: { skyTop: '#2a223b', skyBot: '#463761', ground: '#6e5244', detail: '#ffd23f' },
};

const renderCharacterSVG = (char: ComicCharacterPose, key: string) => {
  const dir = char.facing ?? 1;
  const x = char.x;
  const y = char.y;

  const renderEarsOrBody = () => {
    if (char.species === 'rock') {
      return (
        <ellipse
          cx={0}
          cy={2}
          rx={14}
          ry={10}
          fill={char.color}
          stroke="#3a2640"
          strokeWidth={1.8}
        />
      );
    }
    if (char.species === 'cloud') {
      return (
        <g fill={char.color} stroke="#3a2640" strokeWidth={1.7}>
          <circle cx={-8} cy={2} r={8} />
          <circle cx={8} cy={2} r={8} />
          <circle cx={0} cy={-4} r={10} />
          <ellipse cx={0} cy={4} rx={14} ry={8} stroke="none" fill={char.color} />
        </g>
      );
    }
    if (char.species === 'bee') {
      return (
        <g>
          <ellipse cx={-6} cy={-9} rx={6} ry={4} fill="#ffffff" stroke="#3a2640" strokeWidth={1.3} opacity={0.9} />
          <ellipse cx={6} cy={-9} rx={6} ry={4} fill="#ffffff" stroke="#3a2640" strokeWidth={1.3} opacity={0.9} />
          <ellipse cx={0} cy={0} rx={12} ry={10} fill={char.color} stroke="#3a2640" strokeWidth={1.8} />
          <path d="M-4,-9 L-4,9 M4,-9 L4,9" stroke="#3a2640" strokeWidth={2.2} />
        </g>
      );
    }
    return (
      <g>
        {/* Species Ears */}
        {char.species === 'bunny' && (
          <g fill={char.color} stroke="#3a2640" strokeWidth={1.6}>
            <ellipse cx={-6} cy={-16} rx={3.5} ry={8.5} transform="rotate(-10 -6 -16)" />
            <ellipse cx={6} cy={-16} rx={3.5} ry={8.5} transform="rotate(10 6 -16)" />
          </g>
        )}
        {(char.species === 'cat' || char.species === 'fox') && (
          <g fill={char.color} stroke="#3a2640" strokeWidth={1.6}>
            <polygon points="-11,-6 -9,-18 -2,-10" />
            <polygon points="11,-6 9,-18 2,-10" />
          </g>
        )}
        {(char.species === 'bear' || char.species === 'otter') && (
          <g fill={char.color} stroke="#3a2640" strokeWidth={1.6}>
            <circle cx={-9} cy={-11} r={4.5} />
            <circle cx={9} cy={-11} r={4.5} />
          </g>
        )}
        {char.species === 'axolotl' && (
          <g stroke="#ff7aa8" strokeWidth={2.2} strokeLinecap="round">
            <line x1={-12} y1={-4} x2={-18} y2={-8} />
            <line x1={-13} y1={0} x2={-19} y2={0} />
            <line x1={12} y1={-4} x2={18} y2={-8} />
            <line x1={13} y1={0} x2={19} y2={0} />
          </g>
        )}
        {char.species === 'frog' && (
          <g fill={char.color} stroke="#3a2640" strokeWidth={1.6}>
            <circle cx={-7} cy={-10} r={4.5} />
            <circle cx={7} cy={-10} r={4.5} />
          </g>
        )}

        {/* Mochi Blob Body */}
        <ellipse cx={0} cy={1} rx={13.5} ry={11.5} fill={char.color} stroke="#3a2640" strokeWidth={1.8} />
      </g>
    );
  };

  const renderMoodFace = () => {
    const eyeY = char.species === 'frog' ? -10 : -1;
    const eyeSep = char.species === 'frog' ? 7 : 4.5;
    if (char.mood === 'shocked') {
      return (
        <g>
          <circle cx={-eyeSep} cy={eyeY} r={2.2} fill="#ffffff" stroke="#3a2640" strokeWidth={1.2} />
          <circle cx={eyeSep} cy={eyeY} r={2.2} fill="#ffffff" stroke="#3a2640" strokeWidth={1.2} />
          <circle cx={-eyeSep} cy={eyeY} r={0.8} fill="#3a2640" />
          <circle cx={eyeSep} cy={eyeY} r={0.8} fill="#3a2640" />
          <ellipse cx={dir * 1.5} cy={4.5} rx={2.5} ry={3} fill="#ff7aa8" stroke="#3a2640" strokeWidth={1.2} />
        </g>
      );
    }
    if (char.mood === 'heart') {
      return (
        <g>
          <path d={`M${-eyeSep - 2},${eyeY} Q${-eyeSep},${eyeY - 2.5} ${-eyeSep + 2},${eyeY}`} fill="none" stroke="#3a2640" strokeWidth={1.6} strokeLinecap="round" />
          <path d={`M${eyeSep - 2},${eyeY} Q${eyeSep},${eyeY - 2.5} ${eyeSep + 2},${eyeY}`} fill="none" stroke="#3a2640" strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={-8} cy={3} r={2.2} fill="#ff7aa8" opacity={0.65} />
          <circle cx={8} cy={3} r={2.2} fill="#ff7aa8" opacity={0.65} />
          <path d="M-2,4 Q0,6.5 2,4" fill="none" stroke="#3a2640" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    }
    if (char.mood === 'sleepy') {
      return (
        <g>
          <line x1={-eyeSep - 2} y1={eyeY} x2={-eyeSep + 2} y2={eyeY} stroke="#3a2640" strokeWidth={1.6} strokeLinecap="round" />
          <line x1={eyeSep - 2} y1={eyeY} x2={eyeSep + 2} y2={eyeY} stroke="#3a2640" strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={dir * 1} cy={4} r={1.4} fill="#3a2640" />
          <text x={11} y={-11} fontSize="6" fontWeight="900" fill="#b48cff">z</text>
        </g>
      );
    }
    if (char.mood === 'dizzy') {
      return (
        <g stroke="#3a2640" strokeWidth={1.4} strokeLinecap="round">
          <line x1={-eyeSep - 1.5} y1={eyeY - 1.5} x2={-eyeSep + 1.5} y2={eyeY + 1.5} />
          <line x1={-eyeSep + 1.5} y1={eyeY - 1.5} x2={-eyeSep - 1.5} y2={eyeY + 1.5} />
          <line x1={eyeSep - 1.5} y1={eyeY - 1.5} x2={eyeSep + 1.5} y2={eyeY + 1.5} />
          <line x1={eyeSep + 1.5} y1={eyeY - 1.5} x2={eyeSep - 1.5} y2={eyeY + 1.5} />
          <path d="M-3,4.5 Q0,2.5 3,4.5" fill="none" />
        </g>
      );
    }
    if (char.mood === 'confused') {
      return (
        <g>
          <circle cx={-eyeSep} cy={eyeY} r={1.6} fill="#3a2640" />
          <circle cx={eyeSep} cy={eyeY} r={1.6} fill="#3a2640" />
          <line x1={-2.5} y1={4.5} x2={2.5} y2={3.5} stroke="#3a2640" strokeWidth={1.5} strokeLinecap="round" />
          <text x={12} y={-10} fontSize="7" fontWeight="900" fill="#ff6b6b">?</text>
        </g>
      );
    }
    if (char.mood === 'smug') {
      return (
        <g>
          <line x1={-eyeSep - 2} y1={eyeY - 2} x2={-eyeSep + 2} y2={eyeY - 1} stroke="#3a2640" strokeWidth={1.4} />
          <line x1={eyeSep - 2} y1={eyeY - 1} x2={eyeSep + 2} y2={eyeY - 2} stroke="#3a2640" strokeWidth={1.4} />
          <circle cx={-eyeSep} cy={eyeY + 0.5} r={1.5} fill="#3a2640" />
          <circle cx={eyeSep} cy={eyeY + 0.5} r={1.5} fill="#3a2640" />
          <path d="M-2,4 Q1,6 3,3" fill="none" stroke="#3a2640" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    }
    // happy default
    return (
      <g>
        <circle cx={-eyeSep} cy={eyeY} r={1.7} fill="#3a2640" />
        <circle cx={eyeSep} cy={eyeY} r={1.7} fill="#3a2640" />
        <circle cx={-8} cy={3} r={2} fill="#ff7aa8" opacity={0.5} />
        <circle cx={8} cy={3} r={2} fill="#ff7aa8" opacity={0.5} />
        <path d="M-2.2,3.5 Q0,6 2.2,3.5" fill="none" stroke="#3a2640" strokeWidth={1.4} strokeLinecap="round" />
      </g>
    );
  };

  const renderHat = () => {
    switch (char.hat) {
      case 'chef':
        return (
          <g fill="#ffffff" stroke="#3a2640" strokeWidth={1.4}>
            <ellipse cx={0} cy={-16} rx={9} ry={5} />
            <rect x={-7} y={-13} width={14} height={4} rx={1.5} />
          </g>
        );
      case 'captain':
        return (
          <g stroke="#3a2640" strokeWidth={1.4}>
            <rect x={-9} y={-15} width={18} height={5} rx={2} fill="#2b4570" />
            <rect x={-11} y={-11} width={22} height={2.5} rx={1} fill="#ffd23f" />
          </g>
        );
      case 'crown':
        return (
          <polygon
            points="-7,-11 -5,-19 0,-14 5,-19 7,-11"
            fill="#ffd23f"
            stroke="#3a2640"
            strokeWidth={1.4}
          />
        );
      case 'mushroom':
        return (
          <g stroke="#3a2640" strokeWidth={1.4}>
            <path d="M-12,-9 Q0,-23 12,-9 Z" fill="#c26bff" />
            <circle cx={-4} cy={-14} r={1.8} fill="#ffffff" stroke="none" />
            <circle cx={4} cy={-13} r={1.5} fill="#ffffff" stroke="none" />
          </g>
        );
      case 'seashell':
        return <polygon points="0,-19 -5,-11 5,-11" fill="#ff9ebb" stroke="#3a2640" strokeWidth={1.3} />;
      case 'moon':
        return <path d="M-6,-15 A7,7 0 1,0 6,-15 A5,5 0 1,1 -6,-15 Z" fill="#ffd23f" stroke="#3a2640" strokeWidth={1.2} />;
      case 'leaf':
        return <ellipse cx={2} cy={-14} rx={6} ry={3} fill="#7bd88f" stroke="#3a2640" strokeWidth={1.3} transform="rotate(-15 2 -14)" />;
      case 'bow':
        return (
          <g fill="#ff7aa8" stroke="#3a2640" strokeWidth={1.2}>
            <polygon points="-2,-13 -8,-17 -8,-10" />
            <polygon points="2,-13 8,-17 8,-10" />
            <circle cx={0} cy={-13.5} r={2} />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <g key={key} transform={`translate(${x}, ${y})`}>
      {/* Soft Shadow */}
      <ellipse cx={0} cy={12} rx={11} ry={3.2} fill="rgba(40,20,60,0.18)" />
      {renderEarsOrBody()}
      {renderMoodFace()}
      {renderHat()}
    </g>
  );
};

const renderPropSVG = (prop?: ComicPanel['prop']) => {
  switch (prop) {
    case 'muffin':
      return (
        <g transform="translate(68, 68)">
          <polygon points="-6,4 6,4 8,-4 -8,-4" fill="#d99a5b" stroke="#3a2640" strokeWidth={1.3} />
          <path d="M-9,-4 Q0,-14 9,-4 Z" fill="#ff9ebb" stroke="#3a2640" strokeWidth={1.3} />
        </g>
      );
    case 'muffins_flying':
      return (
        <g>
          {[
            [22, 34],
            [50, 26],
            [78, 38],
          ].map(([mx, my], i) => (
            <g key={i} transform={`translate(${mx}, ${my}) rotate(${(i - 1) * 14})`}>
              <polygon points="-5,3 5,3 6,-3 -6,-3" fill="#d99a5b" stroke="#3a2640" strokeWidth={1.2} />
              <path d="M-7,-3 Q0,-10 7,-3 Z" fill="#ff9ebb" stroke="#3a2640" strokeWidth={1.2} />
            </g>
          ))}
        </g>
      );
    case 'boat':
      return (
        <g transform="translate(56, 74)">
          <path d="M-18,0 L18,0 L12,9 L-12,9 Z" fill="#a8643a" stroke="#3a2640" strokeWidth={1.4} />
          <line x1={0} y1={0} x2={0} y2={-18} stroke="#3a2640" strokeWidth={1.6} />
          <polygon points="0,-17 14,-7 0,-3" fill="#ffffff" stroke="#3a2640" strokeWidth={1.2} />
        </g>
      );
    case 'teacup':
      return (
        <g transform="translate(52, 71)">
          <path d="M-7,-3 L7,-3 L5,5 L-5,5 Z" fill="#ffffff" stroke="#3a2640" strokeWidth={1.3} />
          <path d="M-2,-7 Q0,-11 -2,-14 M2,-7 Q4,-11 2,-14" fill="none" stroke="#d9c6ff" strokeWidth={1.3} />
        </g>
      );
    case 'ice':
      return (
        <g>
          <polygon points="10,74 90,74 82,86 18,86" fill="#ccf4ff" opacity={0.85} stroke="#82d4f5" strokeWidth={1.4} />
          <line x1={26} y1={78} x2={38} y2={82} stroke="#ffffff" strokeWidth={1.4} />
          <line x1={58} y1={77} x2={72} y2={82} stroke="#ffffff" strokeWidth={1.4} />
        </g>
      );
    case 'gem':
      return (
        <g transform="translate(52, 42)">
          <polygon points="0,-8 7,0 0,8 -7,0" fill="#ffd23f" stroke="#3a2640" strokeWidth={1.3} />
        </g>
      );
    case 'lantern':
      return (
        <g transform="translate(76, 56)">
          <rect x={-5} y={-7} width={10} height={13} rx={2.5} fill="#ffd23f" stroke="#3a2640" strokeWidth={1.4} />
          <circle cx={0} cy={0} r={11} fill="rgba(255,210,63,0.22)" />
        </g>
      );
    case 'kite':
      return (
        <g>
          <path d="M40,54 Q54,42 68,26" fill="none" stroke="#3a2640" strokeWidth={1.1} />
          <polygon points="68,16 76,26 68,36 60,26" fill="#ff7aa8" stroke="#3a2640" strokeWidth={1.3} />
        </g>
      );
    case 'note':
      return (
        <g fill="#ff7aa8" fontSize="12" fontWeight="900">
          <text x={20} y={34}>♪</text>
          <text x={74} y={29}>♫</text>
        </g>
      );
    case 'snow':
      return (
        <g fill="#ffffff" opacity={0.9}>
          <circle cx={20} cy={22} r={2} />
          <circle cx={45} cy={18} r={1.8} />
          <circle cx={75} cy={26} r={2.2} />
          <circle cx={85} cy={45} r={1.6} />
        </g>
      );
    case 'honey':
      return (
        <g transform="translate(54, 70)">
          <rect x={-6} y={-6} width={12} height={12} rx={3} fill="#ffb703" stroke="#3a2640" strokeWidth={1.3} />
          <rect x={-5} y={-8} width={10} height={3} rx={1} fill="#ffffff" stroke="#3a2640" strokeWidth={1.1} />
        </g>
      );
    default:
      return null;
  }
};

export const ComicStripRenderer: React.FC<ComicStripRendererProps> = ({ comic, compact = false }) => {
  return (
    <div
      className="rounded-2xl border-2 border-[#3a2640]/85 dark:border-[#b794f4]/60 p-3 sm:p-4 shadow-sm"
      style={{ backgroundColor: comic.accentColor }}
    >
      {/* Strip Title Banner */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2 mb-2.5 border-b border-[#3a2640]/15 text-[#3a2640]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{comic.series}</span>
          <h4 className="text-sm sm:text-base font-black leading-tight">{comic.title}</h4>
        </div>
        <span className="text-[11px] font-bold opacity-75">Art by {comic.author}</span>
      </div>

      {/* Multi-Panel Strip Grid */}
      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
        {comic.panels.map((panel, pIdx) => {
          const theme = BG_THEMES[panel.bg];
          const skyGradId = `sky-${comic.id}-${panel.id}-${pIdx}`;
          return (
            <div
              key={panel.id}
              className="flex flex-col bg-white rounded-xl border-2 border-[#3a2640] overflow-hidden shadow-xs"
            >
              {/* Illustrated Cartoon Frame */}
              <div className="relative aspect-4/3 w-full">
                <svg viewBox="0 0 100 88" className="w-full h-full block">
                  <defs>
                    <linearGradient id={skyGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.skyTop} />
                      <stop offset="100%" stopColor={theme.skyBot} />
                    </linearGradient>
                  </defs>
                  {/* Sky */}
                  <rect x={0} y={0} width={100} height={88} fill={`url(#${skyGradId})`} />

                  {/* Ambient Biome Silhouettes */}
                  {(panel.bg === 'moonroad' || panel.bg === 'glowdeep') && (
                    <g fill="#ffffff" opacity={0.7}>
                      <circle cx={14} cy={14} r={1.1} />
                      <circle cx={82} cy={12} r={1.3} />
                      <circle cx={60} cy={18} r={0.9} />
                      {panel.bg === 'moonroad' && <circle cx={84} cy={18} r={7} fill="#fff3b0" opacity={0.9} />}
                    </g>
                  )}
                  {panel.bg === 'sky' && (
                    <g fill="#ffffff" opacity={0.85}>
                      <ellipse cx={22} cy={22} rx={12} ry={5} />
                      <ellipse cx={78} cy={18} rx={10} ry={4.5} />
                    </g>
                  )}

                  {/* Ground / Floor */}
                  <path
                    d="M0,62 Q28,57 54,62 T100,60 L100,88 L0,88 Z"
                    fill={theme.ground}
                  />
                  <path
                    d="M0,62 Q28,57 54,62 T100,60"
                    fill="none"
                    stroke={theme.detail}
                    strokeWidth={1.6}
                  />

                  {/* Props & Characters */}
                  {renderPropSVG(panel.prop)}
                  {panel.characters.map((ch, cIdx) => renderCharacterSVG(ch, `${ch.name}-${cIdx}`))}

                  {/* Sound Effect Comic Starburst */}
                  {panel.sfx && (
                    <g transform="translate(76, 20) rotate(-8)">
                      <polygon
                        points="0,-10 4,-4 12,-6 7,0 13,5 4,5 2,11 -3,5 -12,7 -7,0 -11,-6 -3,-4"
                        fill="#ffd23f"
                        stroke="#3a2640"
                        strokeWidth={1.1}
                      />
                      <text
                        x={0}
                        y={2.5}
                        textAnchor="middle"
                        fontSize="6.5"
                        fontWeight="900"
                        fill="#3a2640"
                      >
                        {panel.sfx}
                      </text>
                    </g>
                  )}
                </svg>

                {/* Caption Pill on top left if present */}
                {panel.caption && (
                  <div className="absolute top-1.5 left-1.5 bg-[#fff8dc] border border-[#3a2640] text-[#3a2640] px-1.5 py-0.5 rounded text-[9px] font-black leading-tight shadow-xs">
                    {panel.caption}
                  </div>
                )}
              </div>

              {/* Speech Bubble Box */}
              {panel.speech && (
                <div className="bg-[#fffef8] border-t-2 border-[#3a2640] px-2.5 py-2 text-[11px] sm:text-xs font-extrabold text-[#2b1c30] leading-snug min-h-[46px] flex items-center">
                  <span>“{panel.speech}”</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
