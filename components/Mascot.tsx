import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Line,
  G,
} from 'react-native-svg';

interface MascotProps {
  mood: 'happy' | 'sad';
  size?: number;
}

export function Mascot({ mood, size = 120 }: MascotProps) {
  const happy = mood === 'happy';

  return (
    <Svg width={size} height={(size * 130) / 100} viewBox="0 0 100 130">
      {/* ── Hair base (dark cap over top of head) ── */}
      <Circle cx="50" cy="44" r="27" fill="#2C1810" />

      {/* ── Face ── */}
      <Circle cx="50" cy="48" r="24" fill="#FDDBB4" />

      {/* ── Topknot stem ── */}
      <Rect x="47" y="19" width="6" height="12" rx="3" fill="#2C1810" />

      {/* ── Topknot bun ── */}
      <Ellipse cx="50" cy="16" rx="8" ry="9" fill="#2C1810" />

      {/* ── Ears ── */}
      <Ellipse cx="26" cy="48" rx="5" ry="7" fill="#FDDBB4" />
      <Ellipse cx="74" cy="48" rx="5" ry="7" fill="#FDDBB4" />

      {/* ── Eyes ── */}
      <Circle cx="41" cy="45" r="4" fill="#2C1810" />
      <Circle cx="59" cy="45" r="4" fill="#2C1810" />
      <Circle cx="42.5" cy="43.5" r="1.5" fill="white" />
      <Circle cx="60.5" cy="43.5" r="1.5" fill="white" />

      {/* ── Sad eyebrows (angled inward) ── */}
      {!happy && (
        <G>
          <Path
            d="M 36 38 L 46 41"
            stroke="#2C1810"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M 54 41 L 64 38"
            stroke="#2C1810"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </G>
      )}

      {/* ── Happy blush ── */}
      {happy && (
        <G>
          <Ellipse cx="33" cy="52" rx="7" ry="4" fill="#F9A8A8" opacity="0.65" />
          <Ellipse cx="67" cy="52" rx="7" ry="4" fill="#F9A8A8" opacity="0.65" />
        </G>
      )}

      {/* ── Mouth ── */}
      {happy ? (
        <Path
          d="M 40 57 Q 50 66 60 57"
          fill="none"
          stroke="#2C1810"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <Path
          d="M 40 62 Q 50 54 60 62"
          fill="none"
          stroke="#2C1810"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {/* ── Sad tear ── */}
      {!happy && (
        <Path
          d="M 38 52 Q 36 57 38 60 Q 40 57 38 52 Z"
          fill="#93C5FD"
          opacity="0.9"
        />
      )}

      {/* ── Body (amber scholar robe) ── */}
      <Path d="M 20 75 L 80 75 L 86 130 L 14 130 Z" fill="#F59E0B" />

      {/* ── Collar V-detail ── */}
      <Path
        d="M 38 75 L 50 88 L 62 75"
        fill="none"
        stroke="#B45309"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Left sleeve / arm ── */}
      <Path
        d="M 20 80 Q 5 90 10 106"
        stroke="#F59E0B"
        fill="none"
        strokeWidth="18"
        strokeLinecap="round"
      />

      {/* ── Right sleeve / arm ── */}
      <Path
        d="M 80 80 Q 95 90 90 106"
        stroke="#F59E0B"
        fill="none"
        strokeWidth="18"
        strokeLinecap="round"
      />

      {/* ── Scroll in right hand ── */}
      <Rect
        x="82"
        y="98"
        width="14"
        height="20"
        rx="1"
        fill="#FEF3C7"
        stroke="#92400E"
        strokeWidth="0.8"
      />
      {/* Scroll roller top */}
      <Rect x="80" y="95" width="18" height="6" rx="3" fill="#92400E" />
      {/* Scroll roller bottom */}
      <Rect x="80" y="114" width="18" height="6" rx="3" fill="#92400E" />
      {/* Scroll lines (text) */}
      <Line x1="85" y1="102" x2="93" y2="102" stroke="#92400E" strokeWidth="1" opacity="0.5" />
      <Line x1="85" y1="106" x2="93" y2="106" stroke="#92400E" strokeWidth="1" opacity="0.5" />
      <Line x1="85" y1="110" x2="93" y2="110" stroke="#92400E" strokeWidth="1" opacity="0.5" />
    </Svg>
  );
}
