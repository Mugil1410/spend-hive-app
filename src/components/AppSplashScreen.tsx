import React, { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { darkColors } from '@/theme/colors';
import { Logo } from './Logo';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Matches android/app/src/main/res/values/colors.xml splashscreen_background, so the hand-off
// from the native splash to this one is seamless.
const BACKGROUND = darkColors.background;
const ACCENT = darkColors.gold;
const INCOME = darkColors.income;

// Rising "growth" line drawn under the logo, in a 200x60 box.
const GROWTH_PATH = 'M4 52 L40 40 L70 46 L104 26 L136 32 L170 12 L196 6';
const GROWTH_LENGTH = 220;
const MIN_VISIBLE_MS = 1400;

// Faint honeycomb behind the logo.
const HEX_CELLS = [
  [-1, -1], [0, -1], [1, -1],
  [-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

interface Props {
  /** The app is ready underneath; the splash fades out once its intro has played. */
  ready: boolean;
  onFinish: () => void;
}

/**
 * Animated launch screen: the hive logo pops in over a faint honeycomb, a growth line draws
 * itself and ends in a coin, then the name appears. Shown once per launch, above the app, and
 * fades out once the stores have loaded.
 */
export function AppSplashScreen({ ready, onFinish }: Props) {
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const [introDone, setIntroDone] = useState(false);

  const logo = useSharedValue(reduceMotion ? 1 : 0);
  const comb = useSharedValue(reduceMotion ? 1 : 0);
  const line = useSharedValue(reduceMotion ? 1 : 0);
  const coin = useSharedValue(reduceMotion ? 1 : 0);
  const title = useSharedValue(reduceMotion ? 1 : 0);
  const exit = useSharedValue(1);

  useEffect(() => {
    if (!reduceMotion) {
      logo.value = withSpring(1, { damping: 12, stiffness: 140 });
      comb.value = withDelay(100, withTiming(1, { duration: 700 }));
      line.value = withDelay(350, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
      coin.value = withDelay(950, withSpring(1, { damping: 9, stiffness: 180 }));
      title.value = withDelay(750, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
    }
    const t = setTimeout(() => setIntroDone(true), reduceMotion ? 300 : MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [reduceMotion, logo, comb, line, coin, title]);

  useEffect(() => {
    if (!ready || !introDone) return;
    exit.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onFinish)();
    });
  }, [ready, introDone, exit, onFinish]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: exit.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, logo.value * 1.5),
    transform: [{ scale: 0.6 + 0.4 * logo.value }, { translateY: (1 - exit.value) * -12 }],
  }));
  const combStyle = useAnimatedStyle(() => ({ opacity: comb.value * 0.5, transform: [{ scale: 0.9 + 0.1 * comb.value }] }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: title.value,
    transform: [{ translateY: (1 - title.value) * 14 }],
  }));
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: GROWTH_LENGTH * (1 - line.value) }));
  const coinProps = useAnimatedProps(() => ({ r: 6 * coin.value, opacity: coin.value }));

  const combSize = Math.min(width * 0.8, 320);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, containerStyle]} pointerEvents="none">
      <Animated.View style={[styles.comb, { width: combSize, height: combSize }, combStyle]}>
        <Svg width={combSize} height={combSize} viewBox="-100 -100 200 200">
          {HEX_CELLS.map(([col, row], i) => (
            <Polygon
              key={i}
              points={hexPoints(col * 44, row * 38, 24)}
              fill="none"
              stroke={ACCENT}
              strokeOpacity={0.12 + (i % 3) * 0.05}
              strokeWidth={1.2}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={logoStyle}>
        <Logo size={96} color={ACCENT} letterColor={BACKGROUND} />
      </Animated.View>

      <Svg width={200} height={60} viewBox="0 0 200 60" style={styles.growth}>
        <AnimatedPath
          d={GROWTH_PATH}
          fill="none"
          stroke={INCOME}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${GROWTH_LENGTH} ${GROWTH_LENGTH}`}
          animatedProps={lineProps}
        />
        <AnimatedCircle cx={196} cy={6} fill={ACCENT} stroke={BACKGROUND} strokeWidth={1.5} animatedProps={coinProps} />
      </Svg>

      <Animated.Text style={[styles.title, titleStyle]}>Spend Hive</Animated.Text>
      <Animated.Text style={[styles.subtitle, titleStyle]}>100% Offline Finance Tracker</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BACKGROUND,
    zIndex: 200,
    elevation: 200,
  },
  comb: { position: 'absolute', alignItems: 'center', justifyContent: 'center', marginTop: -70 },
  growth: { marginTop: 18 },
  title: {
    marginTop: 14,
    color: darkColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 4,
    color: darkColors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
