import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState, type ReactNode } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
}

export function OutfitDetailSheet({
  outfit,
  pieces,
  startInEditMode = false,
  onClose,
  onSave,
  onDelete,
}: OutfitDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(startInEditMode);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(outfit);

  useEffect(() => {
    setDraft(outfit);
    setEditing(startInEditMode);
    setConfirmingDelete(false);
  }, [outfit, startInEditMode]);

  if (!outfit || !draft) return null;
  const currentOutfit = outfit;
  const linkedPieces = pieces.filter((piece) =>
    currentOutfit.pieceIds.includes(piece.id),
  );

  function togglePiece(id: string) {
    if (!draft) return;
    const pieceIds = draft.pieceIds.includes(id)
      ? draft.pieceIds.filter((pieceId) => pieceId !== id)
      : [...draft.pieceIds, id];
    setDraft({ ...draft, pieceIds });
  }

  function handleSave() {
    if (!draft) return;
    onSave({
      ...draft,
      dateWorn: draft.dateWorn.trim(),
      occasion: draft.occasion.trim(),
      note: draft.note.trim(),
    });
    setEditing(false);
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + theme.spacing.md },
        ]}
      >
        <View style={styles.handle} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photos}
          >
            {currentOutfit.imageIds.map((imageId) => {
              const uri = images.read(imageId);
              return uri ? (
                <Image
                  key={imageId}
                  source={{ uri }}
                  style={styles.image}
                  contentFit="cover"
                />
              ) : (
                <View
                  key={imageId}
                  style={[styles.image, styles.imageFallback]}
                />
              );
            })}
          </ScrollView>

          {editing ? (
            <View style={styles.fields}>
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
                {pieces.length > 0 ? (
                  <View style={styles.pieceList}>
                    {pieces.map((piece) => {
                      const selected = draft.pieceIds.includes(piece.id);
                      return (
                        <Pressable
                          key={piece.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          onPress={() => togglePiece(piece.id)}
                          style={[
                            styles.pieceChip,
                            selected && styles.pieceChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pieceChipText,
                              selected && styles.pieceChipTextSelected,
                            ]}
                          >
                            {piece.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.mutedValue}>No wardrobe pieces yet</Text>
                )}
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
              <Text style={styles.date}>{currentOutfit.dateWorn}</Text>
              <Text style={styles.title}>
                {currentOutfit.occasion || "Everyday outfit"}
              </Text>
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
      </View>
    </Modal>
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: theme.colors.backgroundElevated,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingTop: theme.spacing.xs,
  },
  handle: {
    alignSelf: "center",
    width: theme.spacing.xl,
    height: theme.spacing.xxs,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  content: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  photos: {
    gap: theme.spacing.sm,
  },
  image: {
    width: 240,
    aspectRatio: 3 / 4,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.background,
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
  pieceChipText: {
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
