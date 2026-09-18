import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PieceLimitError } from "@/ai";
import { catalogPiecesFromLibrary } from "@/catalog/catalogPieces";
import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    MultilineField,
    NumericField,
    PrimaryButton,
    StoreChip,
    TextField,
} from "@/components/settings";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { BOTTOM_FITS, TOP_FITS } from "@/storage/fitVocabulary";
import {
    LETTER_SIZES,
    profileStore,
    type Preferences,
    type UserProfile,
} from "@/storage/profile";
import { STORE_DEFAULTS, storeDomainFor } from "@/storage/stores";
import { theme } from "@/theme/tokens";

const STEP_COUNT = 6;

export function OnboardingFlow({
  initialProfile,
  initialPreferences,
  onComplete,
}: {
  initialProfile: UserProfile;
  initialPreferences: Preferences;
  onComplete: (profile: UserProfile, preferences: Preferences) => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(initialProfile);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [storeDraft, setStoreDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [cataloguing, setCataloguing] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const profileRef = useRef(profile);
  const preferencesRef = useRef(preferences);

  const updateProfile = (next: UserProfile) => {
    profileRef.current = next;
    setProfile(next);
  };
  const updatePreferences = (next: Preferences) => {
    preferencesRef.current = next;
    setPreferences(next);
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const completed = {
      ...preferencesRef.current,
      onboardingCompleted: true,
    };
    try {
      await Promise.all([
        profileStore.saveUserProfile(profileRef.current),
        profileStore.savePreferences(completed),
      ]);
      onComplete(profileRef.current, completed);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Couldn’t save onboarding.",
      );
    } finally {
      setSaving(false);
    }
  };

  const addPieces = async () => {
    setCataloguing(true);
    setError(null);
    try {
      const created = await catalogPiecesFromLibrary();
      setAddedCount((current) => current + created.length);
      if (created.length > 0) setStep(5);
    } catch (catalogError) {
      if (catalogError instanceof PieceLimitError) {
        setUpgradeOpen(true);
      } else {
        setError(
          catalogError instanceof Error
            ? catalogError.message
            : "Couldn’t add pieces.",
        );
      }
    } finally {
      setCataloguing(false);
    }
  };

  const toggleStore = (name: string) => {
    const stores = preferencesRef.current.stores.includes(name)
      ? preferencesRef.current.stores.filter((store) => store !== name)
      : [...preferencesRef.current.stores, name];
    updatePreferences({ ...preferencesRef.current, stores });
  };

  const addStore = () => {
    const name = storeDraft.trim().replace(/\s+/g, " ");
    setStoreDraft("");
    if (
      !name ||
      preferencesRef.current.stores.some(
        (store) => store.toLowerCase() === name.toLowerCase(),
      )
    ) {
      return;
    }
    updatePreferences({
      ...preferencesRef.current,
      stores: [...preferencesRef.current.stores, name],
    });
  };

  const next = () => setStep((current) => Math.min(current + 1, 5));

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.top, { paddingTop: insets.top + theme.spacing.xs }]}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            disabled={step === 0}
            onPress={() => setStep((current) => Math.max(current - 1, 0))}
            style={[styles.topButton, step === 0 && styles.hidden]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          {step < 5 ? (
            <Pressable
              accessibilityRole="button"
              onPress={finish}
              disabled={saving}
              style={styles.skip}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.topButton} />
          )}
        </View>
        <View style={styles.progress}>
          {Array.from({ length: STEP_COUNT }, (_, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                index <= step && styles.progressDone,
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 ? <WelcomeStep /> : null}
        {step === 1 ? (
          <StyleStep
            value={preferences.styleText ?? ""}
            onChange={(styleText) =>
              updatePreferences({
                ...preferencesRef.current,
                styleText: styleText || null,
              })
            }
          />
        ) : null}
        {step === 2 ? (
          <FitSizesStep
            profile={profile}
            preferences={preferences}
            updateProfile={updateProfile}
            updatePreferences={updatePreferences}
          />
        ) : null}
        {step === 3 ? (
          <StoresStep
            selected={preferences.stores}
            draft={storeDraft}
            onDraftChange={setStoreDraft}
            onToggle={toggleStore}
            onAdd={addStore}
          />
        ) : null}
        {step === 4 ? <PiecesStep addedCount={addedCount} /> : null}
        {step === 5 ? <DoneStep /> : null}
        {error ? <ErrorText>{error}</ErrorText> : null}
      </ScrollView>

      <View
        style={[
          styles.dock,
          { paddingBottom: insets.bottom + theme.spacing.xs },
        ]}
      >
        {step === 4 ? (
          <>
            <PrimaryButton
              label={cataloguing ? "Adding pieces..." : "Add first pieces"}
              onPress={addPieces}
              disabled={cataloguing}
            />
            <Pressable accessibilityRole="button" onPress={next}>
              <Text style={styles.later}>I’ll do this later</Text>
            </Pressable>
          </>
        ) : step === 5 ? (
          <PrimaryButton
            label={saving ? "Finishing..." : "Go to Archive"}
            onPress={finish}
            disabled={saving}
          />
        ) : (
          <PrimaryButton
            label={step === 0 ? "Get started" : "Continue"}
            onPress={next}
          />
        )}
      </View>

      <UpgradeSheet
        visible={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.headingBlock}>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

function WelcomeStep() {
  return (
    <View style={styles.welcome}>
      <Text style={styles.masthead}>
        Archive<Text style={styles.dot}>.</Text>
      </Text>
      <Text style={styles.welcomeBody}>
        A wardrobe that learns what you own, wear, and want next.
      </Text>
    </View>
  );
}

function StyleStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <StepHeading
        title="Your style"
        body="This drives everything else Archive notices and suggests."
      />
      <MultilineField
        value={value}
        onChangeText={onChange}
        placeholder="Earth tones, relaxed tailoring, chunky loafers, no loud logos..."
      />
    </>
  );
}

function FitSizesStep({
  profile,
  preferences,
  updateProfile,
  updatePreferences,
}: {
  profile: UserProfile;
  preferences: Preferences;
  updateProfile: (profile: UserProfile) => void;
  updatePreferences: (preferences: Preferences) => void;
}) {
  return (
    <>
      <StepHeading
        title="Fit and sizes"
        body="A few useful details make recommendations feel like yours."
      />
      <FieldLabel>Top fit</FieldLabel>
      <ChipGroup
        mode="multi"
        options={TOP_FITS}
        value={preferences.fit.tops}
        onChange={(tops) =>
          updatePreferences({
            ...preferences,
            fit: { ...preferences.fit, tops },
          })
        }
      />
      <FieldLabel>Bottom fit</FieldLabel>
      <ChipGroup
        mode="multi"
        options={BOTTOM_FITS}
        value={preferences.fit.bottoms}
        onChange={(bottoms) =>
          updatePreferences({
            ...preferences,
            fit: { ...preferences.fit, bottoms },
          })
        }
      />
      <FieldLabel>Top size</FieldLabel>
      <ChipGroup
        mode="single"
        options={LETTER_SIZES}
        value={profile.sizes.tops.letter}
        onChange={(letter) =>
          updateProfile({
            ...profile,
            sizes: {
              ...profile.sizes,
              tops: { ...profile.sizes.tops, letter },
            },
          })
        }
      />
      <FieldLabel>Bottom size</FieldLabel>
      <View style={styles.fieldRow}>
        <NumericField
          value={profile.sizes.bottoms.waist}
          onCommit={(waist) =>
            updateProfile({
              ...profile,
              sizes: {
                ...profile.sizes,
                bottoms: { ...profile.sizes.bottoms, waist },
              },
            })
          }
          unit="waist"
          integer
        />
        <NumericField
          value={profile.sizes.bottoms.inseam}
          onCommit={(inseam) =>
            updateProfile({
              ...profile,
              sizes: {
                ...profile.sizes,
                bottoms: { ...profile.sizes.bottoms, inseam },
              },
            })
          }
          unit="inseam"
          integer
        />
      </View>
      <FieldLabel>Shoe size</FieldLabel>
      <NumericField
        value={profile.sizes.shoes.size}
        onCommit={(size) =>
          updateProfile({
            ...profile,
            sizes: {
              ...profile.sizes,
              shoes: { ...profile.sizes.shoes, size },
            },
          })
        }
        placeholder="10.5"
      />
    </>
  );
}

function StoresStep({
  selected,
  draft,
  onDraftChange,
  onToggle,
  onAdd,
}: {
  selected: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onToggle: (name: string) => void;
  onAdd: () => void;
}) {
  const defaults = STORE_DEFAULTS.map((store) => store.name);
  const custom = selected.filter((name) => !defaults.includes(name));
  return (
    <>
      <StepHeading
        title="Where you shop"
        body="Choose the stores Archive should keep in mind."
      />
      <View style={styles.storeChips}>
        {[...selected, ...defaults.filter((name) => !selected.includes(name))]
          .filter((name, index, all) => all.indexOf(name) === index)
          .map((name) => (
            <StoreChip
              key={name}
              name={name}
              domain={storeDomainFor(name)}
              selected={selected.includes(name)}
              onPress={() => onToggle(name)}
            />
          ))}
        {custom.length === 0 ? null : null}
      </View>
      <FieldLabel>Add a store</FieldLabel>
      <TextField
        value={draft}
        onChangeText={onDraftChange}
        onSubmitEditing={onAdd}
        onBlur={onAdd}
        placeholder="e.g. Buck Mason"
        autoCapitalize="words"
        returnKeyType="done"
        style={styles.storeField}
      />
    </>
  );
}

function PiecesStep({ addedCount }: { addedCount: number }) {
  return (
    <View style={styles.centerStep}>
      <Ionicons name="shirt-outline" size={48} color={theme.colors.accent} />
      <StepHeading
        title="Add your first pieces"
        body="Your free Archive includes 50 catalogued pieces. Start with a few clear photos, or come back later."
      />
      {addedCount > 0 ? (
        <Text style={styles.added}>{addedCount} added</Text>
      ) : null}
    </View>
  );
}

function DoneStep() {
  return (
    <View style={styles.centerStep}>
      <Ionicons
        name="checkmark-circle-outline"
        size={52}
        color={theme.colors.accent}
      />
      <StepHeading
        title="You’re set"
        body="Your assessment gets sharper as your closet fills. Add outfit photos in Lookbook so Archive can learn what you actually wear."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  top: { paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm },
  topRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: { opacity: 0 },
  skip: { paddingHorizontal: theme.spacing.xs, paddingVertical: 10 },
  skipText: {
    fontSize: theme.typography.subheadline.fontSize,
    color: theme.colors.textMuted,
  },
  progress: { flexDirection: "row", gap: theme.spacing.xxs },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
  },
  progressDone: { backgroundColor: theme.colors.accent },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    paddingBottom: 140,
    gap: theme.spacing.md,
  },
  welcome: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  masthead: {
    fontFamily: theme.fonts.serif,
    fontSize: 58,
    lineHeight: 66,
    fontWeight: "400",
    color: theme.colors.text,
  },
  dot: { color: theme.colors.accent },
  welcomeBody: {
    maxWidth: 320,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  headingBlock: { gap: theme.spacing.xs },
  heading: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title1.fontSize,
    lineHeight: theme.typography.title1.lineHeight,
    fontWeight: "400",
    color: theme.colors.text,
  },
  body: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  fieldRow: { flexDirection: "row", gap: theme.spacing.xs },
  storeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  storeField: { flexGrow: 0 },
  centerStep: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  added: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  later: {
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.headline.fontSize,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
    textAlign: "center",
  },
});
