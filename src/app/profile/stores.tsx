import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import {
    ErrorText,
    FieldLabel,
    HelperText,
    StoreChip,
    TextField,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";
import { STORE_DEFAULTS, storeDomainFor } from "@/storage/stores";
import { theme } from "@/theme/tokens";

function normalizeName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export default function StoresScreen() {
  const prefs = usePreferences();
  const [draft, setDraft] = useState("");
  const s = prefs.value;

  if (prefs.loading || !s) {
    return (
      <View style={styles.center}>
        {prefs.loading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <ErrorText>
            {prefs.loadError ?? "Couldn’t load preferences."}
          </ErrorText>
        )}
      </View>
    );
  }

  const defaultNames = STORE_DEFAULTS.map((d) => d.name);
  const custom = s.stores.filter((name) => !defaultNames.includes(name));
  const all = [...defaultNames, ...custom];
  // Selected chips sort to the front, preserving the user's selection order.
  const ordered = [
    ...s.stores,
    ...all.filter((name) => !s.stores.includes(name)),
  ];

  function toggle(name: string) {
    prefs.update((prev) => ({
      ...prev,
      stores: prev.stores.includes(name)
        ? prev.stores.filter((n) => n !== name)
        : [...prev.stores, name],
    }));
  }

  function removeCustom(name: string) {
    if (defaultNames.includes(name)) return;
    prefs.update((prev) => ({
      ...prev,
      stores: prev.stores.filter((n) => n !== name),
    }));
  }

  function addCustom() {
    const name = normalizeName(draft);
    setDraft("");
    if (!name || all.some((n) => n.toLowerCase() === name.toLowerCase()))
      return;
    prefs.update((prev) => ({ ...prev, stores: [...prev.stores, name] }));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <HelperText>
        Where you actually shop. This steers suggestions toward what you can
        buy.
      </HelperText>

      <View style={styles.chips}>
        {ordered.map((name) => (
          <StoreChip
            key={name}
            name={name}
            domain={storeDomainFor(name)}
            selected={s.stores.includes(name)}
            onPress={() => toggle(name)}
            onLongPress={
              defaultNames.includes(name) ? undefined : () => removeCustom(name)
            }
          />
        ))}
      </View>

      <View style={styles.field}>
        <FieldLabel>Add a store</FieldLabel>
        <TextField
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addCustom}
          onBlur={addCustom}
          placeholder="e.g. Buck Mason"
          autoCapitalize="words"
          returnKeyType="done"
        />
        <View style={styles.helperSpacing}>
          <HelperText>
            Custom stores are added as selected. Long-press one to remove it.
          </HelperText>
        </View>
      </View>

      {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.lg,
    alignItems: "stretch",
  },
  center: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    alignItems: "flex-start",
  },
  field: {
    alignItems: "stretch",
  },
  helperSpacing: {
    marginTop: theme.spacing.xs,
  },
});
