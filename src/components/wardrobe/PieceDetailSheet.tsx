import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState, type ReactNode } from "react";
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    PIECE_CATEGORIES,
    imageUriFor,
    type Piece,
    type PieceCategory,
} from "@/storage/pieces";
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
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(startInEditMode);
  const [draft, setDraft] = useState(piece);

  useEffect(() => {
    setDraft(piece);
    setEditing(startInEditMode);
  }, [piece, startInEditMode]);

  if (!piece || !draft) return null;
  const currentPiece = piece;
  const uri = imageUriFor(currentPiece);

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
                  onSelect={(category) =>
                    setDraft({
                      ...draft,
                      category: (category ?? draft.category) as PieceCategory,
                    })
                  }
                />
              </Field>
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
          ) : (
            <View style={styles.fields}>
              <Text style={styles.category}>
                {piece.category.toUpperCase()}
              </Text>
              <Text style={styles.name}>{piece.name}</Text>
              <Field label="Color">
                <Text style={styles.value}>{piece.color || "—"}</Text>
              </Field>
              <Field label="Material">
                <Text style={styles.value}>{piece.material || "—"}</Text>
              </Field>
            </View>
          )}

          <View style={styles.actions}>
            {editing ? (
              <ActionButton
                label="Save"
                icon="checkmark"
                onPress={handleSave}
                primary
              />
            ) : (
              <ActionButton
                label="Edit"
                icon="pencil"
                onPress={() => setEditing(true)}
                primary
              />
            )}
            <ActionButton
              label="Delete"
              icon="trash-outline"
              onPress={handleDelete}
              destructive
            />
          </View>
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    maxHeight: "85%",
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
  category: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.accent,
    fontWeight: theme.typography.headline.fontWeight,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
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
