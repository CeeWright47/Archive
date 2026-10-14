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
import { DropdownField } from "@/components/DropdownField";
import { StarRating } from "@/components/StarRating";
import { COLORS } from "@/storage/colorVocabulary";
import { pieceFitsFor, type PieceFit } from "@/storage/fitVocabulary";
import { MATERIALS } from "@/storage/materialVocabulary";
import {
    PIECE_CATEGORIES,
    imageSourceFor,
    type Piece,
    type PieceCategory,
} from "@/storage/pieces";
import { subcategoriesFor } from "@/storage/subcategories";
import { theme } from "@/theme/tokens";

const MAX_BRAND_SUGGESTIONS = 4;

interface PieceDetailSheetProps {
  piece: Piece | null;
  /** Brands already in the closet, offered as autocomplete. */
  brandOptions: readonly string[];
  onClose: () => void;
  onSave: (piece: Piece) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function PieceDetailSheet({
  piece,
  brandOptions,
  onClose,
  onSave,
  onDelete,
}: PieceDetailSheetProps) {
  const [draft, setDraft] = useState(piece);

  useEffect(() => {
    setDraft(piece);
  }, [piece]);

  if (!piece || !draft) return null;
  const currentPiece = piece;
  const source = imageSourceFor(currentPiece, "full");
  const fitOptions = pieceFitsFor(draft.category);

  // Fit is persisted immediately because chip taps are independent of text edits.
  async function handleFitChange(fit: PieceFit | null) {
    if (!draft) return;
    const previous = draft;
    const next = { ...draft, fit };
    setDraft(next);
    try {
      await onSave(next);
    } catch (error) {
      setDraft(previous);
      Alert.alert(
        "Couldn’t save fit",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  async function handleSave() {
    if (!draft) return;
    try {
      await onSave(draft);
      onClose();
    } catch (error) {
      Alert.alert(
        "Couldn’t save changes",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
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
          <View style={styles.imageWrapper}>
            {source ? (
              <Image source={source} style={styles.image} contentFit="cover" />
            ) : (
              <View style={[styles.image, styles.imageFallback]} />
            )}
          </View>

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
            <Field label="Brand">
              <TextInput
                style={styles.input}
                value={draft.brand ?? ""}
                onChangeText={(brand) => setDraft({ ...draft, brand })}
                placeholder="Not set"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <BrandSuggestions
                query={draft.brand ?? ""}
                options={brandOptions}
                onSelect={(brand) => setDraft({ ...draft, brand })}
              />
            </Field>
            <Field label="Rating">
              <StarRating
                value={draft.rating}
                onChange={(rating) => setDraft({ ...draft, rating })}
              />
            </Field>
            <View style={styles.fieldRow}>
              <Field label="Category" flex>
                <DropdownField
                  title="Category"
                  value={draft.category}
                  options={PIECE_CATEGORIES}
                  onChange={(category) => {
                    const next = (category ??
                      draft.category) as PieceCategory;
                    const sameCategory = next === draft.category;
                    setDraft({
                      ...draft,
                      category: next,
                      subcategory: sameCategory ? draft.subcategory : null,
                      fit:
                        sameCategory || pieceFitsFor(next)
                          ? draft.fit
                          : null,
                    });
                  }}
                />
              </Field>
              <Field label="Type" flex>
                <DropdownField
                  title="Type"
                  value={draft.subcategory}
                  options={subcategoriesFor(draft.category)}
                  clearable
                  onChange={(subcategory) =>
                    setDraft({
                      ...draft,
                      subcategory: subcategory as Piece["subcategory"],
                    })
                  }
                />
              </Field>
            </View>
            <View style={styles.fieldRow}>
              {fitOptions && (
                <Field label="Fit" flex>
                  <DropdownField
                    title="Fit"
                    value={draft.fit}
                    options={fitOptions}
                    clearable
                    onChange={(fit) =>
                      handleFitChange(fit as PieceFit | null)
                    }
                  />
                </Field>
              )}
              <Field label="Color" flex>
                <DropdownField
                  title="Color"
                  value={draft.color || null}
                  options={COLORS}
                  clearable
                  onChange={(color) =>
                    setDraft({ ...draft, color: color ?? "" })
                  }
                />
              </Field>
            </View>
            <Field label="Material">
              <DropdownField
                title="Material"
                value={draft.material || null}
                options={MATERIALS}
                clearable
                onChange={(material) =>
                  setDraft({ ...draft, material: material ?? "" })
                }
              />
            </Field>
          </View>

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
        </ScrollView>
    </BottomSheet>
  );
}

function BrandSuggestions({
  query,
  options,
  onSelect,
}: {
  query: string;
  options: readonly string[];
  onSelect: (brand: string) => void;
}) {
  const typed = query.trim().toLowerCase();
  if (!typed) return null;
  const matches = options
    .filter((option) => {
      const candidate = option.toLowerCase();
      return candidate !== typed && candidate.startsWith(typed);
    })
    .slice(0, MAX_BRAND_SUGGESTIONS);
  if (matches.length === 0) return null;

  return (
    <View style={styles.suggestions}>
      {matches.map((brand) => (
        <Pressable
          key={brand}
          accessibilityRole="button"
          accessibilityLabel={`Use brand ${brand}`}
          onPress={() => onSelect(brand)}
          style={({ pressed }) => [
            styles.suggestion,
            pressed && styles.suggestionPressed,
          ]}
        >
          <Text style={styles.suggestionText}>{brand}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({
  label,
  flex,
  children,
}: {
  label: string;
  flex?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, flex && styles.fieldFlex]}>
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
  // Compact banner — the fields, not the photo, are the point of this
  // sheet, and a full 4:5 image would push most of them below the fold.
  imageWrapper: {
    height: 140,
    borderRadius: theme.radii.lg,
    overflow: "hidden",
    backgroundColor: theme.colors.background,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    backgroundColor: theme.colors.background,
  },
  fields: {
    gap: theme.spacing.sm,
  },
  fieldRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  field: {
    gap: theme.spacing.xxs,
  },
  fieldFlex: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxs,
  },
  suggestion: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs + 2,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  suggestionPressed: {
    opacity: 0.7,
  },
  suggestionText: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
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
