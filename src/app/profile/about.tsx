import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    HelperText,
    NumericField,
} from "@/components/settings";
import { usePreferences, useUserProfile } from "@/hooks/useProfileData";
import { BUILD_OPTIONS } from "@/storage/profile";
import {
    cmToFeetInches,
    feetInchesToCm,
    kgToLb,
    lbToKg,
} from "@/storage/units";
import { theme } from "@/theme/tokens";

const CURRENT_YEAR = new Date().getFullYear();
const MIN_BIRTH_YEAR = CURRENT_YEAR - 120;

export default function AboutYouScreen() {
  const profile = useUserProfile();
  const prefs = usePreferences();
  const p = profile.value;

  if (profile.loading || prefs.loading || !p) {
    return (
      <View style={styles.center}>
        {profile.loading || prefs.loading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <ErrorText>{profile.loadError ?? "Couldn’t load profile."}</ErrorText>
        )}
      </View>
    );
  }

  const units = prefs.value?.units ?? "imperial";
  const imperial = units === "imperial";
  const { feet, inches } =
    p.heightCm !== null
      ? cmToFeetInches(p.heightCm)
      : { feet: null, inches: null };

  function commitFeet(nextFeet: number | null) {
    if (nextFeet === null) {
      profile.update({ heightCm: null });
    } else {
      profile.update({ heightCm: feetInchesToCm(nextFeet, inches ?? 0) });
    }
    profile.flush();
  }

  function commitInches(nextInches: number | null) {
    if (feet === null && nextInches === null) {
      profile.update({ heightCm: null });
    } else {
      profile.update({ heightCm: feetInchesToCm(feet ?? 0, nextInches ?? 0) });
    }
    profile.flush();
  }

  function commitBirthYear(year: number | null) {
    const valid =
      year !== null && year >= MIN_BIRTH_YEAR && year <= CURRENT_YEAR;
    profile.update({ birthYear: valid ? year : null });
    profile.flush();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <HelperText>
        All optional. These only improve fit advice and aren’t shown anywhere
        else.
      </HelperText>

      <View style={styles.field}>
        <FieldLabel>Height</FieldLabel>
        {imperial ? (
          <View style={styles.row}>
            <NumericField
              value={feet}
              onCommit={commitFeet}
              unit="ft"
              integer
              maxLength={1}
              placeholder="5"
              style={styles.half}
            />
            <NumericField
              value={inches}
              onCommit={commitInches}
              unit="in"
              integer
              maxLength={2}
              placeholder="10"
              style={styles.half}
            />
          </View>
        ) : (
          <NumericField
            value={p.heightCm !== null ? Math.round(p.heightCm) : null}
            onCommit={(cm) => {
              profile.update({ heightCm: cm });
              profile.flush();
            }}
            unit="cm"
            integer
            maxLength={3}
            placeholder="178"
          />
        )}
      </View>

      <View style={styles.field}>
        <FieldLabel>Weight</FieldLabel>
        <NumericField
          value={
            p.weightKg === null
              ? null
              : imperial
                ? kgToLb(p.weightKg)
                : Math.round(p.weightKg)
          }
          onCommit={(value) => {
            profile.update({
              weightKg:
                value === null ? null : imperial ? lbToKg(value) : value,
            });
            profile.flush();
          }}
          unit={imperial ? "lb" : "kg"}
          integer
          maxLength={3}
          placeholder={imperial ? "175" : "79"}
        />
      </View>

      <View style={styles.field}>
        <FieldLabel>Birth year</FieldLabel>
        <NumericField
          value={p.birthYear}
          onCommit={commitBirthYear}
          integer
          maxLength={4}
          placeholder="1995"
        />
      </View>

      <View style={styles.field}>
        <FieldLabel>Build</FieldLabel>
        <ChipGroup
          mode="single"
          options={BUILD_OPTIONS}
          value={p.build}
          onChange={(build) => profile.update({ build })}
        />
      </View>

      {profile.error ? <ErrorText>{profile.error}</ErrorText> : null}
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
  field: {
    alignItems: "stretch",
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  half: {
    flex: 1,
  },
});
