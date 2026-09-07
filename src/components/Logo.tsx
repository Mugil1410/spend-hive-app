import React from 'react';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

interface LogoProps {
  size?: number;
  color?: string;
  letterColor?: string;
}

export function Logo({ size = 28, color = '#F5E59F', letterColor = '#262523' }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path
        d="M24 2 L43 13 V35 L24 46 L5 35 V13 Z"
        fill={color}
        fillOpacity={0.12}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M24 11 L36 18 V32 L24 39 L12 32 V18 Z" fill={color} fillOpacity={0.9} />
      <SvgText
        x="24"
        y="30"
        textAnchor="middle"
        fontSize={15}
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        fill={letterColor}
      >
        S
      </SvgText>
    </Svg>
  );
}
