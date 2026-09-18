import { useRouter, type Href } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

import {
    ErrorText,
    SectionHeader,
    SettingsGroup,
    SettingsRow,
} from "@/components/settings";
import {
    useLatestAssessment,
    useLegacyAssessment,
    usePreferences,
    useUserProfile,
} from "@/hooks/useProfileData";
import {
    aboutSummary,
    accountSummary,
    assessmentSummary,
    budgetSummary,
    climateSummary,
    colorsSummary,
    countSummary,
    fitSummary,
    sizesSummary,
    styleTextSummary,
} from "@/storage/profileSummaries";
import type { Units } from "@/storage/units";
import { theme } from "@/theme/tokens";

const UNIT_OPTIONS: { value: Units; label: string }[] = [
  { value: "imperial", label: "Imperial" },
  { value: "metric", label: "Metric" },
];

export default function ProfileIndexScreen() {
  const router = useRouter();
  // Several sub-pages aren't built yet, so their paths aren't in the generated route types.
  const go = (path: string) => () => router.push(path as Href);
  const profile = useUserProfile();
  const prefs = usePreferences();
  const assessment = useLatestAssessment();
  const legacy = useLegacyAssessment();

  const loading = profile.loading || prefs.loading;
  const p = profile.value;
  const s = prefs.value;

  if (loading || !p || !s) {
    return (
      <View style={styles.center}>
        {loading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <ErrorText>
            {profile.loadError ?? prefs.loadError ?? "Couldn’t load profile."}
          </ErrorText>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SectionHeader title="You" />
      <SettingsGroup>
        <SettingsRow
          label="Account"
          description="Name, email, mobile"
          summary={accountSummary(p)}
          onPress={go("/profile/account")}
        />
        <SettingsRow
          label="About you"
          description="Height, weight, build"
          summary={aboutSummary(p, s)}
          onPress={go("/profile/about")}
        />
        <SettingsRow
          label="Sizes"
          description="Tops, bottoms, shoes, outerwear"
          summary={sizesSummary(p)}
          onPress={go("/profile/sizes")}
        />
      </SettingsGroup>

      <SectionHeader title="Style" />
      <SettingsGroup>
        <SettingsRow
          label="My Style"
          description="In your own words"
          summary={styleTextSummary(s)}
          onPress={go("/profile/style")}
        />
        <SettingsRow
          label="Fit preferences"
          description="Per category, cuffing, length"
          summary={fitSummary(s)}
          onPress={go("/profile/fit")}
        />
        <SettingsRow
          label="Colors"
          description="Worn most and avoided"
          summary={colorsSummary(s)}
          onPress={go("/profile/colors")}
        />
        <SettingsRow
          label="Occasions"
          description="What you dress for"
          summary={countSummary(s.occasions)}
          onPress={go("/profile/occasions")}
        />
        <SettingsRow
          label="Style assessment"
          description="Your style profiles"
          summary={assessmentSummary(assessment.data, legacy.data)}
          onPress={go("/profile/assessment")}
        />
      </SettingsGroup>

      <SectionHeader title="Shopping" />
      <SettingsGroup>
        <SettingsRow
          label="Stores"
          description="Where you shop"
          summary={countSummary(s.stores)}
          onPress={go("/profile/stores")}
        />
        <SettingsRow
          label="Budget"
          description="Typical spend per category"
          summary={budgetSummary(s)}
          onPress={go("/profile/budget")}
        />
      </SettingsGroup>

      <SectionHeader title="App" />
      <SettingsGroup>
        <SettingsRow
          label="Auto-tag outfits"
          accessory={
            <Switch
              value={s.autoTag}
              onValueChange={(autoTag) => prefs.update({ autoTag })}
              trackColor={{
                true: theme.colors.accent,
                false: theme.colors.border,
              }}
              thumbColor={theme.colors.text}
            />
          }
        />
        <SettingsRow
          label="Run assessment automatically"
          accessory={
            <Switch
              value={s.autoAssess}
              onValueChange={(autoAssess) => prefs.update({ autoAssess })}
              trackColor={{
                true: theme.colors.accent,
                false: theme.colors.border,
              }}
              thumbColor={theme.colors.text}
            />
          }
        />
        <SettingsRow
          label="Units"
          accessory={
            <UnitsPicker
              value={s.units}
              onChange={(units) => prefs.update({ units })}
            />
          }
        />
        <SettingsRow
          label="Climate"
          description="Affects seasonal suggestions"
          summary={climateSummary(s)}
          onPress={go("/profile/climate")}
        />
      </SettingsGroup>

      <SectionHeader title="Privacy" />
      <SettingsGroup>
        <SettingsRow
          label="Where photos are stored"
          onPress={go("/profile/privacy/photos")}
        />
        <SettingsRow
          label="Delete my account"
          description="Available soon"
          destructive
          disabled
        />
      </SettingsGroup>

      {prefs.error ? (
        <View style={styles.inlineError}>
          <ErrorText>{prefs.error}</ErrorText>
        </View>
      ) : null}
    </ScrollView>
  );
}

function UnitsPicker({
  value,
  onChange,
}: {
  value: Units;
  onChange: (units: Units) => void;
}) {
  return (
    <View style={styles.segmented}>
      {UNIT_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentLabel, active && styles.segmentLabelActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: theme.spacing.xxxl,
  },
  center: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  inlineError: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  segment: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs + 2,
  },
  segmentActive: {
    backgroundColor: theme.colors.accent,
  },
  segmentLabel: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  segmentLabelActive: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
});
