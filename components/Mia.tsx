import type { Face, Posture } from '@/lib/types';

const INK = '#211c17';
const SKIN = '#f6c9a0';
const HAIR = '#3a2a1e';

/** Eyes and mouth for each of the five faces. Drawn in a 200x220 box, head centred at (100, 78). */
function FaceMarks({ face }: { face: Face }) {
  const stroke = { stroke: INK, strokeWidth: 4, strokeLinecap: 'round' as const, fill: 'none' };
  switch (face) {
    case 'beaming':
      return (
        <g>
          <path d="M76 76 q8 -9 16 0" {...stroke} />
          <path d="M108 76 q8 -9 16 0" {...stroke} />
          <path d="M82 92 q18 22 36 0 z" fill="#7a2e22" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="70" cy="90" r="7" fill="#f0957a" opacity="0.75" />
          <circle cx="130" cy="90" r="7" fill="#f0957a" opacity="0.75" />
        </g>
      );
    case 'smiling':
      return (
        <g>
          <circle cx="84" cy="77" r="4.5" fill={INK} />
          <circle cx="116" cy="77" r="4.5" fill={INK} />
          <path d="M86 94 q14 12 28 0" {...stroke} />
          <circle cx="70" cy="90" r="6" fill="#f0957a" opacity="0.55" />
          <circle cx="130" cy="90" r="6" fill="#f0957a" opacity="0.55" />
        </g>
      );
    case 'pouting':
      return (
        <g>
          <path d="M74 68 l16 5" {...stroke} />
          <path d="M126 68 l-16 5" {...stroke} />
          <circle cx="84" cy="80" r="4.5" fill={INK} />
          <circle cx="116" cy="80" r="4.5" fill={INK} />
          <path d="M88 100 q12 -10 24 0" {...stroke} />
        </g>
      );
    case 'crying':
      return (
        <g>
          <path d="M76 78 q8 7 16 0" {...stroke} />
          <path d="M108 78 q8 7 16 0" {...stroke} />
          <ellipse cx="100" cy="100" rx="10" ry="8" fill="#7a2e22" stroke={INK} strokeWidth="3.5" />
          <path d="M80 86 q-3 9 0 14 q3 -5 0 -14 z" fill="#8cc4ea" stroke={INK} strokeWidth="2" />
          <path d="M120 86 q-3 9 0 14 q3 -5 0 -14 z" fill="#8cc4ea" stroke={INK} strokeWidth="2" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx="84" cy="78" r="4.5" fill={INK} />
          <circle cx="116" cy="78" r="4.5" fill={INK} />
          <path d="M90 97 h20" {...stroke} />
        </g>
      );
  }
}

const POSTURE: Record<Posture, string> = {
  leaning_in: 'rotate(-7deg) translateX(-6px)',
  at_toy: 'rotate(0deg)',
  turned_away: 'rotate(6deg) translateX(8px)',
};

const FACE_LABEL: Record<Face, string> = {
  beaming: 'beaming',
  smiling: 'smiling',
  neutral: 'calm',
  pouting: 'pouting',
  crying: 'crying',
};

/** Mia, the simulated four-year-old. Face and posture come straight from the engine's view(). */
export function Mia({ face, posture, size = 190 }: { face: Face; posture: Posture; size?: number }) {
  const away = posture === 'turned_away';
  return (
    <svg
      viewBox="0 0 200 220"
      width={size}
      height={(size * 220) / 200}
      role="img"
      aria-label={`Mia, a simulated child, ${away ? 'turned away' : FACE_LABEL[face]}`}
      style={{ overflow: 'visible' }}
    >
      <ellipse cx="100" cy="212" rx="58" ry="7" fill={INK} opacity="0.14" />
      <g
        style={{
          transform: POSTURE[posture],
          transformOrigin: '100px 205px',
          transition: 'transform 480ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* body: yellow shirt, tomato overalls */}
        <path d="M58 150 q-18 6 -20 32 q10 6 20 0 z" fill="#f4b63a" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M142 150 q18 6 20 32 q-10 6 -20 0 z" fill="#f4b63a" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path
          d="M62 138 h76 q10 0 12 12 l6 46 q1 10 -10 10 h-92 q-11 0 -10 -10 l6 -46 q2 -12 12 -12 z"
          fill="#e2553a"
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <rect x="84" y="150" width="32" height="24" rx="6" fill="#fbf3e4" stroke={INK} strokeWidth="3.5" />
        <circle cx="78" cy="146" r="4" fill="#fbf3e4" stroke={INK} strokeWidth="2.5" />
        <circle cx="122" cy="146" r="4" fill="#fbf3e4" stroke={INK} strokeWidth="2.5" />

        {/* head */}
        <circle cx="54" cy="46" r="17" fill={HAIR} stroke={INK} strokeWidth="4" />
        <circle cx="146" cy="46" r="17" fill={HAIR} stroke={INK} strokeWidth="4" />
        <circle cx="100" cy="78" r="52" fill={away ? HAIR : SKIN} stroke={INK} strokeWidth="4" />
        {away ? (
          <path d="M70 60 q30 14 60 0 M76 86 q24 10 48 0" stroke="#5a4333" strokeWidth="4" fill="none" strokeLinecap="round" />
        ) : (
          <>
            <path
              d="M50 70 q4 -44 50 -44 q46 0 50 44 q-22 -22 -50 -20 q-28 -2 -50 20 z"
              fill={HAIR}
              stroke={INK}
              strokeWidth="4"
              strokeLinejoin="round"
            />
            <FaceMarks face={face} />
          </>
        )}
      </g>
    </svg>
  );
}
