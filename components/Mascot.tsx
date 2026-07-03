import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  G,
  Text as SvgText,
  Defs,
  Filter,
  FeDropShadow,
} from 'react-native-svg';

interface MascotProps {
  mood: 'happy' | 'sad' | 'thinking';
  size?: number;
}

export function Mascot({ mood, size = 80 }: MascotProps) {
  return (
    <Svg width={size} height={size * 1.3125} viewBox="0 0 160 210">
      <Defs>
        <Filter id="mascot-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <FeDropShadow dx="0" dy="2.5" stdDeviation="1.6" floodColor="#5a3f2a" floodOpacity="0.3" />
        </Filter>
      </Defs>

      {/* Body - robe */}
      <G filter="url(#mascot-shadow)">
        <Rect x="52" y="30" width="56" height="168" rx="24" fill="#2f2a25" />
        <Rect x="52" y="30" width="56" height="20" rx="18" fill="#cba24e" />
      </G>

      {/* Badge */}
      <Circle cx="80" cy="170" r="15" fill="none" stroke="#cba24e" strokeWidth="2.4" />
      <SvgText
        x="80"
        y="177"
        textAnchor="middle"
        fontSize="16"
        fontFamily="Noto Serif TC"
        fontWeight="700"
        fill="#cba24e"
      >
        墨
      </SvgText>

      {/* Eyebrows */}
      {mood === 'happy' ? (
        <>
          <Path d="M62,84 L70,89" stroke="#1f1c18" strokeWidth="2.2" strokeLinecap="round" />
          <Path d="M98,84 L90,89" stroke="#1f1c18" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : mood === 'thinking' ? (
        <>
          <G transform="translate(66, 86) rotate(-12) translate(-66, -86)">
            <Path d="M62,84 L70,89" stroke="#1f1c18" strokeWidth="2.2" strokeLinecap="round" />
          </G>
          <Path d="M98,84 L90,89" stroke="#1f1c18" strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <G transform="translate(66, 86) rotate(16) translate(-66, -86)">
            <Path d="M62,84 L70,89" stroke="#1f1c18" strokeWidth="2.2" strokeLinecap="round" />
          </G>
          <G transform="translate(94, 86) rotate(-16) translate(-94, -86)">
            <Path d="M98,84 L90,89" stroke="#1f1c18" strokeWidth="2.2" strokeLinecap="round" />
          </G>
        </>
      )}

      {/* Eyes - happy (closed eyes with arc) */}
      {mood === 'happy' && (
        <G fill="none" stroke="#1f1c18" strokeWidth="3" strokeLinecap="round">
          <Path d="M63,98 Q70,88 77,98" />
          <Path d="M83,98 Q90,88 97,98" />
        </G>
      )}

      {/* Eyes - thinking (looking up) */}
      {mood === 'thinking' && (
        <>
          <Circle cx="70" cy="94" r="5.4" fill="#f4efe2" />
          <Circle cx="90" cy="94" r="5.4" fill="#f4efe2" />
          <Circle cx="71" cy="91" r="2.6" fill="#1f1c18" />
          <Circle cx="91" cy="91" r="2.6" fill="#1f1c18" />
        </>
      )}

      {/* Eyes - sad (regular open eyes) */}
      {mood === 'sad' && (
        <>
          <Circle cx="70" cy="97" r="4.8" fill="#f4efe2" />
          <Circle cx="90" cy="97" r="4.8" fill="#f4efe2" />
          <Circle cx="70" cy="94" r="2.4" fill="#1f1c18" />
          <Circle cx="90" cy="94" r="2.4" fill="#1f1c18" />
        </>
      )}

      {/* Blush */}
      <Ellipse cx="62" cy="106" rx="5" ry="3.2" fill="#5a6a76" opacity="0.5" />
      <Ellipse cx="98" cy="106" rx="5" ry="3.2" fill="#5a6a76" opacity="0.5" />

      {/* Mouth - happy (open smile) */}
      {mood === 'happy' && (
        <G>
          <Ellipse cx="80" cy="114" rx="6" ry="6.6" fill="#131110" />
          <Ellipse cx="80" cy="117" rx="3.4" ry="2.6" fill="#5a6a76" />
        </G>
      )}

      {/* Mouth - thinking (small smile) */}
      {mood === 'thinking' && (
        <Path d="M73,112 Q80,116 87,112" fill="none" stroke="#cdbf9e" strokeWidth="2.6" strokeLinecap="round" />
      )}

      {/* Mouth - sad (frown) */}
      {mood === 'sad' && (
        <Path d="M73,119 Q80,113 87,119" fill="none" stroke="#cdbf9e" strokeWidth="2.6" strokeLinecap="round" />
      )}

      {/* Sparkle (happy) */}
      {mood === 'happy' && (
        <Path d="M40,50 l2.6,6 6,2.6 -6,2.6 -2.6,6 -2.6,-6 -6,-2.6 6,-2.6 Z" fill="#cba24e" />
      )}

      {/* Thought bubbles (thinking) */}
      {mood === 'thinking' && (
        <G fill="#6a655e">
          <Circle cx="112" cy="50" r="2.8" />
          <Circle cx="120" cy="42" r="2.2" />
          <Circle cx="126" cy="34" r="1.7" />
        </G>
      )}

      {/* Sweat drop (sad) */}
      {mood === 'sad' && (
        <Ellipse cx="106" cy="60" rx="3.8" ry="5.2" fill="#8fb4d6" />
      )}
    </Svg>
  );
}
