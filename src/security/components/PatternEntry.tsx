import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';

const SIZE = 264;
const CELL = SIZE / 3;
const HIT_RADIUS = CELL * 0.32;

function center(index: number) {
  return { x: (index % 3) * CELL + CELL / 2, y: Math.floor(index / 3) * CELL + CELL / 2 };
}

function hitTest(x: number, y: number): number | null {
  for (let i = 0; i < 9; i++) {
    const c = center(i);
    if (Math.hypot(c.x - x, c.y - y) <= HIT_RADIUS) return i;
  }
  return null;
}

/** The dot passed over when jumping between two dots in a straight line (e.g. 0 -> 2 passes 1). */
function between(a: number, b: number): number | null {
  const [ra, ca, rb, cb] = [Math.floor(a / 3), a % 3, Math.floor(b / 3), b % 3];
  if ((ra + rb) % 2 !== 0 || (ca + cb) % 2 !== 0) return null;
  return ((ra + rb) / 2) * 3 + (ca + cb) / 2;
}

interface Props {
  disabled?: boolean;
  /** Called on release with the dots as "0-4-8-…". */
  onSubmit: (pattern: string) => void;
  /** Shows the last drawn pattern in the error color until the next touch. */
  error?: boolean;
  resetKey?: number;
}

export function PatternEntry({ disabled, onSubmit, error, resetKey }: Props) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number[]>([]);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const selectedRef = useRef<number[]>([]);
  const propsRef = useRef({ disabled, onSubmit });
  propsRef.current = { disabled, onSubmit };

  useEffect(() => {
    selectedRef.current = [];
    setSelected([]);
  }, [resetKey]);

  const responder = useMemo(() => {
    function track(e: GestureResponderEvent) {
      const { locationX: x, locationY: y } = e.nativeEvent;
      setFinger({ x, y });
      const hit = hitTest(x, y);
      const list = selectedRef.current;
      if (hit == null || list.includes(hit)) return;
      const last = list[list.length - 1];
      const mid = last == null ? null : between(last, hit);
      const next = mid != null && !list.includes(mid) ? [...list, mid, hit] : [...list, hit];
      selectedRef.current = next;
      setSelected(next);
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !propsRef.current.disabled,
      onMoveShouldSetPanResponder: () => !propsRef.current.disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        selectedRef.current = [];
        setSelected([]);
        track(e);
      },
      onPanResponderMove: track,
      onPanResponderRelease: () => {
        setFinger(null);
        const list = selectedRef.current;
        if (list.length > 0) propsRef.current.onSubmit(list.join('-'));
      },
      onPanResponderTerminate: () => setFinger(null),
    });
  }, []);

  const stroke = error ? colors.expense : colors.gold;
  const last = selected[selected.length - 1];

  return (
    <View style={[styles.box, disabled && { opacity: 0.4 }]} {...responder.panHandlers} accessibilityLabel="Pattern grid">
      <Svg width={SIZE} height={SIZE} pointerEvents="none">
        {selected.slice(1).map((dot, i) => {
          const a = center(selected[i]);
          const b = center(dot);
          return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={4} strokeLinecap="round" />;
        })}
        {finger && last != null && (
          <Line
            x1={center(last).x}
            y1={center(last).y}
            x2={finger.x}
            y2={finger.y}
            stroke={stroke}
            strokeOpacity={0.5}
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        {Array.from({ length: 9 }).map((_, i) => {
          const c = center(i);
          const on = selected.includes(i);
          return (
            <React.Fragment key={i}>
              {on && <Circle cx={c.x} cy={c.y} r={20} fill={stroke} fillOpacity={0.18} />}
              <Circle cx={c.x} cy={c.y} r={on ? 9 : 7} fill={on ? stroke : colors.textSecondary} />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE },
});
