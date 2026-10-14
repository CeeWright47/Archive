import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { PiecePicker } from "@/components/outfits/PiecePicker";
import { StarRating } from "@/components/StarRating";
import { formatDate, normalizeDateString } from "@/storage/dates";
import { images } from "@/storage/images";
import type { Outfit } from "@/storage/outfits";
import type { Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

interface OutfitDetailSheetProps {
  outfit: Outfit | null;
  pieces: Piece[];
  startInEditMode?: boolean;
  onClose: () => void;
  onSave: (outfit: Outfit) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  /**
   * Returns closet piece ids the AI sees in the outfit's cover photo. Omitted
   * for free accounts, which tag manually.
   */
  onSuggestPieces?: (outfit: Outfit) => Promise<string[]>;
}

export function OutfitDetailSheet({
  outfit,
  pieces,
  startInEditMode = false,
  onClose,
  onSave,
  onDelete,
  onSuggestPieces,
}: OutfitDetailSheetProps) {
  const [editing, setEditing] = useState(startInEditMode);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(outfit);
  const [pickingPieces, setPickingPieces] = useState(false);
  // AI suggestions are pre-selected in the draft but stay marked until the
  // person saves; nothing is written without that Save.
  const [suggestedIds, setSuggestedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [suggesting, setSuggesting] = useState(false);
  const suggestionFor = useRef<string | null>(null);

  async function suggestPieces(target: Outfit) {
    if (!onSuggestPieces) return;
    suggestionFor.current = target.id;
    setSuggesting(true);
    let ids: string[] = [];
    try {
      ids = await onSuggestPieces(target);
    } catch (error) {
      // Suggestions are optional; manual tagging carries on regardless.
      console.warn("[outfits] piece suggestions failed", error);
    }
    if (suggestionFor.current !== target.id) return;
    setSuggesting(false);
    if (ids.length === 0) return;
    setDraft((current) => {
      if (!current || current.id !== target.id) return current;
      const added = ids.filter((id) => !current.pieceIds.includes(id));
      setSuggestedIds(new Set(added));
      return { ...current, pieceIds: [...current.pieceIds, ...added] };
    });
  }

  useEffect(() => {
    setDraft(outfit);
    setEditing(startInEditMode);
    setConfirmingDelete(false);
    setPickingPieces(false);
    setSuggestedIds(new Set());
    setSuggesting(false);
    suggestionFor.current = null;
    // A freshly logged outfit opens in edit mode with nothing tagged yet.
    if (outfit && startInEditMode && outfit.pieceIds.length === 0) {
      suggestPieces(outfit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfit, startInEditMode]);

  if (!outfit || !draft) return null;
  const currentOutfit = outfit;
  const linkedPieces = pieces.filter((piece) =>
    currentOutfit.pieceIds.includes(piece.id),
  );

  function togglePiece(id: string) {
    if (!draft) return;
    const removing = draft.pieceIds.includes(id);
    const pieceIds = removing
      ? draft.pieceIds.filter((pieceId) => pieceId !== id)
      : [...draft.pieceIds, id];
    setDraft({ ...draft, pieceIds });
    if (removing && suggestedIds.has(id)) {
      setSuggestedIds(
        new Set([...suggestedIds].filter((pieceId) => pieceId !== id)),
      );
    }
  }

  async function handleSave() {
    if (!draft) return;
    try {
      await onSave({
        ...draft,
        dateWorn: normalizeDateString(draft.dateWorn),
        occasion: draft.occasion.trim(),
        note: draft.note.trim(),
      });
      setSuggestedIds(new Set());
      setEditing(false);
    } catch (error) {
      Alert.alert(
        "Couldn’t save changes",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  if (pickingPieces) {
    return (
      <BottomSheet onClose={onClose}>
        <PiecePicker
          pieces={pieces}
          selectedIds={draft.pieceIds}
          suggestedIds={suggestedIds}
          onToggle={togglePiece}
          onDone={() => setPickingPieces(false)}
        />
      </BottomSheet>
    );
  }

  const draftPieces = draft.pieceIds
    .map((id) => pieces.find((piece) => piece.id === id))
    .filter((piece): piece is Piece => piece !== undefined);

  return (
    <BottomSheet onClose={onClose}>
      <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <PhotoCarousel imageIds={currentOutfit.imageIds} />

          {editing ? (
            <View style={styles.fields}>
              <Field label="Rating">
                <StarRating
                  value={draft.rating}
                  onChange={(rating) => setDraft({ ...draft, rating })}
                />
              </Field>
              <Field label="Date worn">
                <TextInput
                  style={styles.input}
                  value={draft.dateWorn}
                  onChangeText={(dateWorn) => setDraft({ ...draft, dateWorn })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Field>
              <Field label="Occasion">
                <TextInput
                  style={styles.input}
                  value={draft.occasion}
                  onChangeText={(occasion) => setDraft({ ...draft, occasion })}
                  placeholder="Where did you wear it?"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Field>
              <Field label="Notes">
                <TextInput
                  style={[styles.input, styles.noteInput]}
                  value={draft.note}
                  onChangeText={(note) => setDraft({ ...draft, note })}
                  placeholder="How did it feel?"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </Field>
              <Field label="Pieces">
                {suggesting ? (
                  <View style={styles.suggestingRow}>
                    <ActivityIndicator color={theme.colors.accent} />
                    <Text style={styles.mutedValue}>
                      Finding pieces in your photo…
                    </Text>
                  </View>
                ) : null}
                {draftPieces.length > 0 ? (
                  <View style={styles.pieceList}>
                    {draftPieces.map((piece) => {
                      const suggested = suggestedIds.has(piece.id);
                      return (
                        <Pressable
                          key={piece.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${piece.name}${suggested ? ", suggested" : ""}`}
                          onPress={() => togglePiece(piece.id)}
                          style={[
                            styles.pieceChip,
                            suggested
                              ? styles.pieceChipSuggested
                              : styles.pieceChipSelected,
                          ]}
                        >
                          {suggested ? (
                            <Text style={styles.suggestedTag}>SUGGESTED</Text>
                          ) : null}
                          <Text
                            style={[
                              styles.pieceChipText,
                              !suggested && styles.pieceChipTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {piece.name}
                          </Text>
                          <Ionicons
                            name="close"
                            size={theme.spacing.md}
                            color={
                              suggested
                                ? theme.colors.text
                                : theme.colors.background
                            }
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : !suggesting ? (
                  <Text style={styles.mutedValue}>No pieces tagged</Text>
                ) : null}
                {suggestedIds.size > 0 ? (
                  <Text style={styles.helper}>
                    Suggested from your photo. Tap one to remove it; Save keeps
                    the rest.
                  </Text>
                ) : null}
                <View style={styles.pieceActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPickingPieces(true)}
                    hitSlop={theme.spacing.xs}
                  >
                    <Text style={styles.link}>
                      {draftPieces.length > 0 ? "Edit pieces" : "Tag pieces"}
                    </Text>
                  </Pressable>
                  {onSuggestPieces &&
                  !suggesting &&
                  draft.pieceIds.length === 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => suggestPieces(currentOutfit)}
                      hitSlop={theme.spacing.xs}
                    >
                      <Text style={styles.link}>Suggest from photo</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Field>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: draft.inInspo }}
                onPress={() => setDraft({ ...draft, inInspo: !draft.inInspo })}
                style={styles.checkboxRow}
              >
                <Ionicons
                  name={draft.inInspo ? "checkbox" : "square-outline"}
                  size={theme.spacing.lg}
                  color={
                    draft.inInspo ? theme.colors.accent : theme.colors.textMuted
                  }
                />
                <Text style={styles.value}>Add to inspiration</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.fields}>
              <Text style={styles.date}>
                {formatDate(currentOutfit.dateWorn)}
              </Text>
              <Text style={styles.title}>
                {currentOutfit.occasion || "Everyday outfit"}
              </Text>
              <StarRating value={currentOutfit.rating} />
              <Field label="Notes">
                <Text
                  style={currentOutfit.note ? styles.value : styles.mutedValue}
                >
                  {currentOutfit.note || "No notes"}
                </Text>
              </Field>
              <Field label="Pieces">
                <Text
                  style={
                    linkedPieces.length > 0 ? styles.value : styles.mutedValue
                  }
                >
                  {linkedPieces.length > 0
                    ? linkedPieces.map((piece) => piece.name).join(", ")
                    : "No pieces linked"}
                </Text>
              </Field>
              {currentOutfit.inInspo ? (
                <View style={styles.inspoRow}>
                  <Ionicons
                    name="bookmark"
                    size={theme.spacing.md}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.inspoLabel}>In inspiration</Text>
                </View>
              ) : null}
            </View>
          )}

          {confirmingDelete ? (
            <View style={styles.confirmation}>
              <Text style={styles.confirmationText}>
                Delete this outfit? This cannot be undone.
              </Text>
              <View style={styles.actions}>
                <ActionButton
                  label="Cancel"
                  icon="close"
                  onPress={() => setConfirmingDelete(false)}
                />
                <ActionButton
                  label="Delete"
                  icon="trash-outline"
                  onPress={() => onDelete(currentOutfit.id)}
                  destructive
                />
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <ActionButton
                label={editing ? "Save" : "Edit"}
                icon={editing ? "checkmark" : "pencil"}
                onPress={editing ? handleSave : () => setEditing(true)}
                primary
              />
              <ActionButton
                label="Delete"
                icon="trash-outline"
                onPress={() => setConfirmingDelete(true)}
                destructive
              />
            </View>
          )}
        </ScrollView>
    </BottomSheet>
  );
}

// Full sheet width at each photo's own shape, capped at half the screen
// height (fitted, not cropped, past that). Several photos swipe.
function PhotoCarousel({ imageIds }: { imageIds: string[] }) {
  const { height: screenHeight } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const maxHeight = screenHeight * 0.5;

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={imageIds.length > 1}
          onMomentumScrollEnd={(event) =>
            setPage(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {imageIds.map((imageId) => {
            const source = images.source(imageId, "full");
            const ratio = ratios[imageId] ?? 3 / 4;
            const height = Math.min(width / ratio, maxHeight);
            return source ? (
              <Image
                key={imageId}
                source={source}
                style={[styles.image, { width, height }]}
                contentFit="contain"
                onLoad={(event) => {
                  const { width: w, height: h } = event.source;
                  if (w > 0 && h > 0 && ratios[imageId] !== w / h) {
                    setRatios((current) => ({ ...current, [imageId]: w / h }));
                  }
                }}
              />
            ) : (
              <View
                key={imageId}
                style={[styles.image, styles.imageFallback, { width, height }]}
              />
            );
          })}
        </ScrollView>
      ) : null}
      {imageIds.length > 1 ? (
        <View style={styles.dots}>
          {imageIds.map((imageId, index) => (
            <View
              key={imageId}
              style={[styles.dot, index === page && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  primary,
  destructive,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.actionButton,
        primary && styles.actionButtonPrimary,
        destructive && styles.actionButtonDestructive,
      ]}
    >
      <Ionicons
        name={icon}
        size={theme.spacing.md + theme.spacing.xxs}
        color={
          primary
            ? theme.colors.background
            : destructive
              ? theme.colors.danger
              : theme.colors.text
        }
      />
      <Text
        style={[
          styles.actionLabel,
          primary && styles.actionLabelPrimary,
          destructive && styles.actionLabelDestructive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  image: {
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.background,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.xxs + 2,
    marginTop: theme.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
  },
  suggestingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  pieceActions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xxs,
  },
  link: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.accent,
    fontWeight: theme.typography.headline.fontWeight,
  },
  helper: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
  },
  suggestedTag: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
  },
  imageFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  fields: {
    gap: theme.spacing.sm,
  },
  date: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.accent,
  },
  title: {
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
    fontFamily: theme.fonts.serif,
  },
  field: {
    gap: theme.spacing.xxs,
  },
  fieldLabel: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  mutedValue: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  input: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  noteInput: {
    minHeight: theme.spacing.xxxl,
  },
  pieceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  pieceChip: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  pieceChipSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  // Pre-selected by the AI but not yet confirmed: outlined, not filled.
  pieceChipSuggested: {
    borderColor: theme.colors.accent,
    borderStyle: "dashed",
  },
  pieceChipText: {
    flexShrink: 1,
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.text,
  },
  pieceChipTextSelected: {
    color: theme.colors.background,
    fontWeight: theme.typography.headline.fontWeight,
  },
  checkboxRow: {
    minHeight: theme.spacing.xxl,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  inspoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs,
  },
  inspoLabel: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.accent,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  confirmation: {
    gap: theme.spacing.sm,
  },
  confirmationText: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  actionButtonDestructive: {
    borderColor: theme.colors.danger,
  },
  actionLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
  actionLabelPrimary: {
    color: theme.colors.background,
  },
  actionLabelDestructive: {
    color: theme.colors.danger,
  },
});
