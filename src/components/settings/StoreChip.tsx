import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { storeLogos } from "@/storage/storeLogos";
import { theme } from "@/theme/tokens";

const LOGO_SIZE = 20;

interface StoreLogoProps {
  name: string;
  domain: string | null;
  size?: number;
}

// Runtime-fetched logo with a monogram fallback while loading, on failure, or with no domain.
export function StoreLogo({ name, domain, size = LOGO_SIZE }: StoreLogoProps) {
  const [uri, setUri] = useState<string | null>(() =>
    domain ? (storeLogos.peek(domain) ?? null) : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!domain) return;
    let cancelled = false;
    storeLogos.get(domain).then((resolved) => {
      if (!cancelled) setUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const radius = size / 2;

  if (!uri || failed) {
    return (
      <View
        style={[
          styles.monogram,
          { width: size, height: size, borderRadius: radius },
        ]}
        accessibilityElementsHidden
      >
        <Text
          style={[styles.initial, { fontSize: size * 0.55, lineHeight: size }]}
        >
          {name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius }}
      contentFit="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

interface StoreChipProps {
  name: string;
  domain: string | null;
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export function StoreChip({
  name,
  domain,
  selected,
  onPress,
  onLongPress,
}: StoreChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <StoreLogo name={name} domain={domain} />
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monogram: {
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    minHeight: 36,
    paddingLeft: theme.spacing.xs,
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
  },
  chipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  label: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.textMuted,
  },
  labelSelected: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
});
