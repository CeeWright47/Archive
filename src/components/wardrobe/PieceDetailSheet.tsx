import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState, type ReactNode } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { BottomSheet } from "@/components/BottomSheet";
import { ChipGroup } from "@/components/settings";
import { pieceFitsFor, type PieceFit } from "@/storage/fitVocabulary";
import {
    PIECE_CATEGORIES,
    imageUriFor,
    type Piece,
    type PieceCategory,
} from "@/storage/pieces";
import { subcategoriesFor } from "@/storage/subcategories";
import { theme } from "@/theme/tokens";
import { CategoryChips } from "./CategoryChips";

interface PieceDetailSheetProps {
  piece: Piece | null;
  startInEditMode?: boolean;
  onClose: () => void;
  onSave: (piece: Piece) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function PieceDetailSheet({
  piece,
  startInEditMode = false,
  onClose,
  onSave,
  onDelete,
}: PieceDetailSheetProps) {
  const [editing, setEditing] = useState(startInEditMode);
  const [draft, setDraft] = useState(piece);

  useEffect(() => {
    setDraft(piece);
    setEditing(startInEditMode);
  }, [piece, startInEditMode]);

  if (!piece || !draft) return null;
  const currentPiece = piece;
  const uri = imageUriFor(currentPiece);
  const fitOptions = pieceFitsFor(draft.category);

  // Fit is persisted immediately because chip taps are independent of text edits.
  function handleFitChange(fit: PieceFit | null) {
    if (!draft) return;
    const next = { ...draft, fit };
    setDraft(next);
    onSave(next);
  }

  function handleSave() {
    if (!draft) return;
    onSave(draft);
    setEditing(false);
  }

  function handleDelete() {
    Alert.alert("Delete this piece?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(currentPiece.id),
      },
    ]);
  }

  return (
    <BottomSheet onClose={onClose}>
      <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {!editing && (
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {piece.name}
              </Text>
            </View>
          )}

          <View style={styles.imageWrapper}>
            {uri ? (
              <Image source={{ uri }} style={styles.image} contentFit="cover" />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}
          </View>

          {editing ? (
            <View style={styles.fields}>
              <Field label="Name">
                <TextInput
                  style={styles.input}
                  value={draft.name}
                  onChangeText={(name) => setDraft({ ...draft, name })}
                  placeholder="Piece name"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Field>
              <Field label="Category">
                <CategoryChips
                  categories={PIECE_CATEGORIES}
                  selected={draft.category}
                  onSelect={(category) => {
                    const next = (category ?? draft.category) as PieceCategory;
                    const sameCategory = next === draft.category;
                    setDraft({
                      ...draft,
                      category: next,
                      subcategory: sameCategory ? draft.subcategory : null,
                      fit:
                        sameCategory || pieceFitsFor(next) ? draft.fit : null,
                    });
                  }}
                />
              </Field>
              <Field label="Type">
                <CategoryChips
                  categories={subcategoriesFor(draft.category)}
                  selected={draft.subcategory}
                  onSelect={(subcategory) =>
                    setDraft({ ...draft, subcategory })
                  }
                />
              </Field>
              {fitOptions && (
                <Field label="Fit">
                  <ChipGroup
                    mode="single"
                    options={fitOptions}
                    value={draft.fit as PieceFit | null}
                    onChange={handleFitChange}
                  />
                </Field>
              )}
              <Field label="Color">
                <TextInput
                  style={styles.input}
                  value={draft.color}
                  onChangeText={(color) => setDraft({ ...draft, color })}
                  placeholder="Color"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Field>
              <Field label="Material">
                <TextInput
                  style={styles.input}
                  value={draft.material}
                  onChangeText={(material) => setDraft({ ...draft, material })}
                  placeholder="Material"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </Field>
            </View>
          ) : null}

          {editing && (
            <View style={styles.actions}>
              <ActionButton
                label="Save"
                icon="checkmark"
                onPress={handleSave}
                primary
              />
              <ActionButton
                label="Delete"
                icon="trash-outline"
                onPress={handleDelete}
                destructive
              />
            </View>
          )}
        </ScrollView>
    </BottomSheet>
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
        size={18}
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
  titleRow: {
    paddingTop: theme.spacing.xs,
    paddingRight: theme.spacing.xxl,
  },
  title: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    color: theme.colors.text,
  },
  imageWrapper: {
    borderRadius: theme.radii.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  image: {
    width: "100%",
    aspectRatio: 4 / 5,
  },
  imageFallback: {
    backgroundColor: theme.colors.background,
  },
  fields: {
    gap: theme.spacing.sm,
  },
  field: {
    gap: theme.spacing.xxs,
  },
  fieldLabel: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
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
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
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
