import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { theme } from "@/theme/tokens";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface SliderFieldProps {
  value: number | null;
  onCommit: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Leading unit label, e.g. "$". */
  unit?: string;
  placeholder?: string;
}

// A draggable track synced to a text field — dragging updates the field
// live, and typing an exact value (including one past the track's visual
// max) moves the thumb to match. Built on react-native-gesture-handler
// (already a dependency) rather than the core PanResponder — the screen
// stack's swipe-back gesture is itself gesture-handler-based, and a plain
// PanResponder consistently loses that responder negotiation to it.
export function SliderField({
  value,
  onCommit,
  min = 0,
  max = 500,
  step = 5,
  unit = "$",
  placeholder,
}: SliderFieldProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  // Non-null only while actively dragging — lets the thumb/text track the
  // gesture before the value is committed on release.
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [text, setText] = useState(value === null ? "" : String(value));
  const trackWidthRef = useRef(0);

  useEffect(() => {
    if (dragValue === null) setText(value === null ? "" : String(value));
  }, [value, dragValue]);

  const displayValue = dragValue ?? value ?? min;
  const fraction =
    trackWidth > 0 ? clamp((displayValue - min) / (max - min), 0, 1) : 0;

  function updateFromTouch(x: number) {
    if (trackWidthRef.current <= 0) return;
    const fractionAtX = clamp(x / trackWidthRef.current, 0, 1);
    const raw = min + fractionAtX * (max - min);
    const snapped = clamp(Math.round(raw / step) * step, min, max);
    setDragValue(snapped);
  }

  function commitDrag() {
    setDragValue((current) => {
      if (current !== null) onCommit(current);
      return null;
    });
  }

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      runOnJS(updateFromTouch)(event.x);
    })
    .onUpdate((event) => {
      runOnJS(updateFromTouch)(event.x);
    })
    .onFinalize(() => {
      runOnJS(commitDrag)();
    });

  function handleTextBlur() {
    const trimmed = text.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      setText(value === null ? "" : String(value));
      return;
    }
    onCommit(parsed);
  }

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={pan}>
        <View
          style={styles.track}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            trackWidthRef.current = width;
            setTrackWidth(width);
          }}
        >
          <View style={styles.trackFill} />
          <View
            style={[styles.trackFillActive, { width: `${fraction * 100}%` }]}
          />
          <View
            style={[
              styles.thumb,
              {
                left: `${fraction * 100}%`,
                transform: [{ translateX: -11 }],
              },
            ]}
          />
        </View>
      </GestureDetector>
      <View style={styles.textWrapper}>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={handleTextBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="number-pad"
          inputMode="numeric"
          selectionColor={theme.colors.accent}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.xs },
  track: {
    height: 32,
    justifyContent: "center",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
  },
  trackFillActive: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.accent,
  },
  textWrapper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundElevated,
  },
  unit: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.xxs,
  },
  input: {
    minWidth: 64,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
});
