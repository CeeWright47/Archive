import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ai, AssessmentLimitError } from "@/ai";
import { prepareAiImage } from "@/ai/image";
import { ArchiveLoadingScreen } from "@/components/ArchiveLoadingScreen";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import {
    ErrorText,
    HelperText,
    PrimaryButton,
    ProfilePage,
} from "@/components/settings";
import {
    useLatestAssessment,
    usePreferences,
    useUserProfile,
} from "@/hooks/useProfileData";
import { images } from "@/storage/images";
import { outfits } from "@/storage/outfits";
import type { StyleAssessmentRecord } from "@/storage/profile";
import { theme } from "@/theme/tokens";

export default function AssessmentScreen() {
  const insets = useSafeAreaInsets();
  const latest = useLatestAssessment();
  const profile = useUserProfile();
  const prefs = usePreferences();
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(
    null,
  );
  const [generated, setGenerated] = useState<StyleAssessmentRecord | null>(
    null,
  );
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const assessment = generated ?? latest.data;
  const stale = Boolean(
    assessment?.inputsHash &&
    currentHash &&
    assessment.inputsHash !== currentHash,
  );

  useEffect(() => {
    if (!assessment) return;
    outfits
      .list()
      .then((stored) =>
        ai.assessmentInputsHash(stored.map((outfit) => outfit.id)),
      )
      .then((result) => setCurrentHash(result.inputs_hash))
      .catch(() => setCurrentHash(null));
  }, [assessment?.id]);

  const run = async () => {
    if (assessment && profile.value?.plan === "free") {
      setUpgradeOpen(true);
      return;
    }
    setRunning(true);
    setRunError(null);
    try {
      const storedOutfits = await outfits.list();
      const sample = [...storedOutfits]
        .sort((a, b) => b.added - a.added)
        .slice(0, 8);
      const outfitImages: string[] = [];
      for (const outfit of sample) {
        const uri = outfit.imageIds[0] ? images.read(outfit.imageIds[0]) : null;
        if (uri) outfitImages.push(await prepareAiImage(uri));
      }
      const result = await ai.runStyleAssessment({
        outfitIds: storedOutfits.map((outfit) => outfit.id),
        outfitImages,
      });
      setGenerated({
        id: result.id,
        profiles: result.profiles,
        sharedPieces: result.shared_pieces,
        inputsHash: result.inputs_hash,
        createdAt: result.created_at,
      });
      setExpandedProfileId(null);
      setCurrentHash(result.inputs_hash);
      if (
        profile.value?.plan === "free" &&
        prefs.value &&
        !prefs.value.assessmentPaywallShown
      ) {
        prefs.update({ assessmentPaywallShown: true });
        await prefs.save();
        setUpgradeOpen(true);
      }
    } catch (error) {
      if (error instanceof AssessmentLimitError) {
        setUpgradeOpen(true);
        return;
      }
      setRunError(
        error instanceof Error ? error.message : "Assessment failed.",
      );
    } finally {
      setRunning(false);
    }
  };

  if (running) return <ArchiveLoadingScreen showTip={false} />;

  return (
    <View style={styles.screen}>
      <ProfilePage loading={latest.loading} error={latest.error}>
        <HelperText>
          A synthesis of your written profile, inspo, closet, and outfit photos,
          broken into the distinct style lanes running through your closet.
        </HelperText>
        {stale && !running ? (
          <Text style={styles.stale}>
            Your profile, inspo, closet, or outfits changed since this
            assessment.
          </Text>
        ) : null}
        {!assessment ? (
          <Text style={styles.legacy}>
            Add a style description and closet pieces before running an
            assessment.
          </Text>
        ) : (
          <>
            <View style={styles.profileList}>
              {assessment.profiles.map((profile) => {
                const expanded = expandedProfileId === profile.id;
                return (
                  <View key={profile.id} style={styles.card}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      onPress={() =>
                        setExpandedProfileId(expanded ? null : profile.id)
                      }
                      style={styles.cardHeader}
                    >
                      <View style={styles.cardTitle}>
                        <View style={styles.cardMeta}>
                          <Text style={styles.rank}>{profile.rank}</Text>
                          <Text style={styles.activity}>
                            {profile.activity}
                          </Text>
                        </View>
                        <Text style={styles.headline}>{profile.headline}</Text>
                      </View>
                      <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                    {expanded ? (
                      <View style={styles.cardContent}>
                        <Text style={styles.body}>{profile.read}</Text>
                        {profile.pillars.length > 0 ? (
                          <Text style={styles.meta}>
                            Pillars: {profile.pillars.join(" · ")}
                          </Text>
                        ) : null}
                        {profile.direction ? (
                          <Text style={styles.meta}>
                            Direction: {profile.direction}
                          </Text>
                        ) : null}
                        {profile.activity === "dormant" ? (
                          <Text style={styles.meta}>
                            Dormant: owned, but hasn’t shown up in your
                            logged outfits yet.
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
            {assessment.sharedPieces.length > 0 ? (
              <View style={styles.shared}>
                <Text style={styles.rank}>CONNECTIVE TISSUE</Text>
                <Text style={styles.body}>
                  {assessment.sharedPieces.join(" · ")}
                </Text>
              </View>
            ) : null}
          </>
        )}
        {runError ? <ErrorText>{runError}</ErrorText> : null}
        <View style={{ height: 64 + insets.bottom }} />
      </ProfilePage>
      {!latest.loading && !latest.error ? (
        <View
          style={[
            styles.dock,
            { paddingBottom: insets.bottom + theme.spacing.xs },
          ]}
        >
          <PrimaryButton
            label={
              running
                ? "Running assessment..."
                : assessment
                  ? "Update assessment"
                  : "Run assessment"
            }
            onPress={run}
            disabled={running}
          />
        </View>
      ) : null}
      <UpgradeSheet
        visible={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileList: {
    gap: theme.spacing.xs,
  },
  card: {
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
    overflow: "hidden",
  },
  cardHeader: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  cardTitle: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  cardContent: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  rank: {
    fontFamily: theme.fonts.mono,
    color: theme.colors.accent,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
    textTransform: "uppercase",
  },
  headline: {
    color: theme.colors.text,
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
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
  activity: {
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    textTransform: "uppercase",
  },
  shared: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
  },
  stale: {
    color: theme.colors.accent,
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
  },
  legacy: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body.fontSize,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});
