import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
    ErrorText,
    HelperText,
    PrimaryButton,
    ProfilePage,
} from "@/components/settings";
import {
    useLatestAssessment,
    useLegacyAssessment,
} from "@/hooks/useProfileData";
import { profileStore, type StyleAssessmentRecord } from "@/storage/profile";
import { theme } from "@/theme/tokens";

export default function AssessmentScreen() {
  const latest = useLatestAssessment();
  const legacy = useLegacyAssessment();
  const [running, setRunning] = useState(false);
  const [generated, setGenerated] = useState<StyleAssessmentRecord | null>(null);
  const assessment = latest.data ?? generated;
  const run = async () => {
    setRunning(true);
    try {
      if (!legacy.data) return;
      const profile = {
        id: "legacy-assessment",
        rank: "CURRENT",
        headline: legacy.data.headline,
        read: legacy.data.read,
        pillars: [],
        direction: "",
        activity: "Imported from your existing assessment",
      };
      await profileStore.saveAssessment([profile], [], null);
      setGenerated({
        id: "legacy-assessment",
        profiles: [profile],
        sharedPieces: [],
        inputsHash: null,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Assessment update failed", error);
    } finally {
      setRunning(false);
    }
  };
  return (
    <ProfilePage
      loading={latest.loading || legacy.loading}
      error={latest.error ?? legacy.error}
    >
      <HelperText>
        A synthesis of your written profile, inspo, closet, and outfit photos,
        broken into the distinct style lanes running through your closet.
      </HelperText>
      {!assessment ? (
        <>
          {legacy.data ? (
            <Text style={styles.legacy}>{legacy.data.headline}</Text>
          ) : (
            <Text style={styles.legacy}>
              Add a style description or closet pieces before running an assessment.
            </Text>
          )}
          <PrimaryButton
            label={running ? "Running assessment..." : "Run assessment"}
            onPress={run}
            disabled={running || !legacy.data}
          />
        </>
      ) : (
        <>
          {assessment.profiles.map((profile) => (
            <View key={profile.id} style={styles.card}>
              <Text style={styles.rank}>{profile.rank}</Text>
              <Text style={styles.headline}>{profile.headline}</Text>
              <Text style={styles.body}>{profile.read}</Text>
              {profile.pillars.length > 0 ? (
                <Text style={styles.meta}>
                  Pillars: {profile.pillars.join(" · ")}
                </Text>
              ) : null}
              {profile.direction ? (
                <Text style={styles.meta}>Direction: {profile.direction}</Text>
              ) : null}
            </View>
          ))}
          {assessment.sharedPieces.length > 0 ? (
            <Text style={styles.body}>
              Shared pieces: {assessment.sharedPieces.join(" · ")}
            </Text>
          ) : null}
          <PrimaryButton
            label="Update assessment"
            onPress={run}
            disabled={running || !legacy.data}
          />
        </>
      )}
      {latest.error ? <ErrorText>{latest.error}</ErrorText> : null}
    </ProfilePage>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.backgroundElevated,
  },
  rank: {
    fontFamily: theme.fonts.mono,
    color: theme.colors.accent,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
  },
  headline: {
    color: theme.colors.text,
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    lineHeight: theme.typography.title2.lineHeight,
  },
  body: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
  },
  legacy: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body.fontSize,
  },
});
