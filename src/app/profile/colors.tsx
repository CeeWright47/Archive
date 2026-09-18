import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
    TextField,
    type TriState,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";
import type { ColorPreferences } from "@/storage/profile";
import { theme } from "@/theme/tokens";

const DEFAULT_COLORS = [
  "Black",
  "White",
  "Cream",
  "Grey",
  "Charcoal",
  "Navy",
  "Blue",
  "Denim",
  "Brown",
  "Tan",
  "Camel",
  "Beige",
  "Olive",
  "Green",
  "Burgundy",
  "Red",
  "Pink",
  "Yellow",
  "Orange",
  "Purple",
] as const;

function stateFor(color: string, colors: ColorPreferences): TriState {
  if (colors.worn.includes(color)) return "worn";
  if (colors.avoid.includes(color)) return "avoid";
  return "neutral";
}

function withState(
  colors: ColorPreferences,
  color: string,
  next: TriState,
): ColorPreferences {
  const worn = colors.worn.filter((c) => c !== color);
  const avoid = colors.avoid.filter((c) => c !== color);
  if (next === "worn") worn.push(color);
  if (next === "avoid") avoid.push(color);
  return { worn, avoid };
}

function normalizeName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export default function ColorsScreen() {
  const prefs = usePreferences();
  const [draft, setDraft] = useState("");
  const s = prefs.value;

  if (prefs.loading || !s) {
    return (
      <ProfilePage loading={prefs.loading} error={prefs.loadError}>
        {null}
      </ProfilePage>
    );
  }

  const defaults: readonly string[] = DEFAULT_COLORS;
  const custom = [...s.colors.worn, ...s.colors.avoid].filter(
    (c) => !defaults.includes(c),
  );
  const options = [...defaults, ...custom];
  const value = Object.fromEntries(
    options.map((c) => [c, stateFor(c, s.colors)]),
  );

  function cycle(color: string, next: TriState) {
    prefs.update((prev) => ({
      ...prev,
      colors: withState(prev.colors, color, next),
    }));
  }

  function removeCustom(color: string) {
    if (defaults.includes(color)) return;
    prefs.update((prev) => ({
      ...prev,
      colors: withState(prev.colors, color, "neutral"),
    }));
  }

  function addCustom() {
    const name = normalizeName(draft);
    setDraft("");
    if (!name || options.some((c) => c.toLowerCase() === name.toLowerCase()))
      return;
    prefs.update((prev) => ({
      ...prev,
      colors: withState(prev.colors, name, "worn"),
    }));
  }

  return (
    <ProfilePage
      loading={prefs.loading}
      error={prefs.loadError}
      saveAction={prefs}
    >
      <HelperText>Tap once for worn most, twice to avoid.</HelperText>

      <ChipGroup
        mode="tristate"
        options={options}
        value={value}
        onChange={cycle}
        onLongPress={removeCustom}
      />

      <View style={styles.field}>
        <FieldLabel>Add a color</FieldLabel>
        <TextField
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addCustom}
          onBlur={addCustom}
          placeholder="e.g. Forest green"
          autoCapitalize="words"
          returnKeyType="done"
        />
        <View style={styles.helperSpacing}>
          <HelperText>
            Custom colors are added as worn most. Long-press one to remove it.
          </HelperText>
        </View>
      </View>

      {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
    </ProfilePage>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: "stretch",
  },
  helperSpacing: {
    marginTop: theme.spacing.xs,
  },
});
