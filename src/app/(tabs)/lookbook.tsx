import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { ai } from "@/ai";
import { prepareAiImage } from "@/ai/image";
import { AddInspirationButton } from "@/components/lookbook/AddInspirationButton";
import { AddOutfitButton } from "@/components/outfits/AddOutfitButton";
import { OutfitCard } from "@/components/outfits/OutfitCard";
import { OutfitDetailSheet } from "@/components/outfits/OutfitDetailSheet";
import { PageTitle } from "@/components/PageTitle";
import { pickImage, type PickedImage } from "@/media/pickImage";
import { images } from "@/storage/images";
import { imageUriForInspo, inspo, type InspoImage } from "@/storage/inspo";
import {
    generateOutfitId,
    generateOutfitImageId,
    outfits,
    type Outfit,
} from "@/storage/outfits";
import { pieces, type Piece } from "@/storage/pieces";
import { theme } from "@/theme/tokens";

type LookbookTab = "inspiration" | "myStyle";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LookbookScreen() {
  const [activeTab, setActiveTab] = useState<LookbookTab>("inspiration");

  const [allInspo, setAllInspo] = useState<InspoImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingInspo, setAddingInspo] = useState(false);

  const [allOutfits, setAllOutfits] = useState<Outfit[]>([]);
  const [allPieces, setAllPieces] = useState<Piece[]>([]);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [newOutfitId, setNewOutfitId] = useState<string | null>(null);
  const [addingOutfit, setAddingOutfit] = useState(false);
  const [choosingSource, setChoosingSource] = useState(false);

  async function load() {
    try {
      setError(null);
      const [storedInspo, storedOutfits, storedPieces] = await Promise.all([
        inspo.list(),
        outfits.list(),
        pieces.list(),
      ]);
      setAllInspo(storedInspo);
      setAllOutfits(storedOutfits);
      setAllPieces(storedPieces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t load lookbook.");
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleAddInspiration() {
    setAddingInspo(true);
    try {
      const picked = await pickImage.manyFromLibrary();
      if (picked.length === 0) return;

      const added: InspoImage[] = [];
      for (const asset of picked) {
        const image = await prepareAiImage(asset.uri);
        const result = await ai.distillInspiration(image);
        added.push(await inspo.add(asset.uri, result.vibe, image));
      }
      setAllInspo((current) => [...added, ...current]);
    } catch (error) {
      Alert.alert(
        "Couldn’t add inspiration",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAddingInspo(false);
    }
  }

  const savePickedOutfitImages = useCallback(async (picked: PickedImage[]) => {
    if (picked.length === 0) return;
    setAddingOutfit(true);
    try {
      const selected = picked.slice(0, 3);
      const imageIds: string[] = [];
      for (const asset of selected) {
        const imageId = generateOutfitImageId();
        await images.saveFromUri(imageId, asset.uri);
        imageIds.push(imageId);
      }

      const outfit: Outfit = {
        id: generateOutfitId(),
        userId: null,
        sourceType: "self-photo",
        imageIds,
        dateWorn: today(),
        pieceIds: [],
        profileTag: null,
        occasion: "",
        note: "",
        inInspo: false,
        added: Date.now(),
      };
      await outfits.save(outfit);
      setAllOutfits((current) => [...current, outfit]);
      setNewOutfitId(outfit.id);
      setSelectedOutfitId(outfit.id);
    } catch (error) {
      Alert.alert(
        "Couldn’t add outfit",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setAddingOutfit(false);
    }
  }, []);

  const handlePickOutfitSource = useCallback(
    async (source: "camera" | "library") => {
      setChoosingSource(false);
      try {
        const picked =
          source === "camera"
            ? await pickImage.fromCamera()
            : await pickImage.manyFromLibrary();
        await savePickedOutfitImages(
          Array.isArray(picked) ? picked : picked ? [picked] : [],
        );
      } catch (error) {
        Alert.alert(
          "Couldn’t open photos",
          error instanceof Error ? error.message : "Please try again.",
        );
      }
    },
    [savePickedOutfitImages],
  );

  const handleSaveOutfit = useCallback(async (updated: Outfit) => {
    await outfits.save(updated);
    setAllOutfits((current) =>
      current.map((outfit) => (outfit.id === updated.id ? updated : outfit)),
    );
    setNewOutfitId(null);
  }, []);

  const handleDeleteOutfit = useCallback(async (id: string) => {
    await outfits.remove(id);
    setAllOutfits((current) => current.filter((outfit) => outfit.id !== id));
    setSelectedOutfitId(null);
    setNewOutfitId(null);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyBody}>{error}</Text>
      </View>
    );
  }

  const sortedOutfits = [...allOutfits].sort((a, b) => b.added - a.added);
  const selectedOutfit =
    allOutfits.find((outfit) => outfit.id === selectedOutfitId) ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <PageTitle>Lookbook</PageTitle>
      </View>
      <View style={styles.tabBar}>
        <TabButton
          label="Inspiration"
          active={activeTab === "inspiration"}
          onPress={() => setActiveTab("inspiration")}
        />
        <TabButton
          label="My Style"
          active={activeTab === "myStyle"}
          onPress={() => setActiveTab("myStyle")}
        />
      </View>

      {activeTab === "inspiration" ? (
        <>
          <FlatList
            data={allInspo}
            keyExtractor={(entry) => entry.id}
            numColumns={2}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.accent}
              />
            }
            renderItem={({ item }) => <InspoCard entry={item} />}
            ListEmptyComponent={
              <Text style={styles.emptyBody}>No inspiration images yet.</Text>
            }
          />
          <AddInspirationButton
            onPress={handleAddInspiration}
            loading={addingInspo}
          />
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>
            A photographic record of what you’ve actually worn.
          </Text>
          <FlatList
            data={sortedOutfits}
            keyExtractor={(outfit) => outfit.id}
            numColumns={2}
            columnWrapperStyle={styles.column}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.accent}
              />
            }
            renderItem={({ item }) => (
              <OutfitCard
                outfit={item}
                onPress={() => setSelectedOutfitId(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyHeading}>Nothing logged yet</Text>
                <Text style={styles.emptyBody}>
                  Add your first outfit to get started.
                </Text>
              </View>
            }
          />

          <AddOutfitButton
            onPress={() => setChoosingSource(true)}
            loading={addingOutfit}
          />

          <Modal
            visible={choosingSource}
            animationType="fade"
            transparent
            onRequestClose={() => setChoosingSource(false)}
          >
            <View style={styles.sourceModal}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close photo source chooser"
                style={styles.sourceBackdrop}
                onPress={() => setChoosingSource(false)}
              />
              <View style={styles.sourceSheet}>
                <Text style={styles.sourceHeading}>Add outfit</Text>
                <Text style={styles.sourceBody}>
                  Choose where to get your photo.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.sourcePrimaryButton}
                  onPress={() => handlePickOutfitSource("camera")}
                >
                  <Text style={styles.sourcePrimaryLabel}>Take photo</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.sourceSecondaryButton}
                  onPress={() => handlePickOutfitSource("library")}
                >
                  <Text style={styles.sourceSecondaryLabel}>Photo library</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <OutfitDetailSheet
            outfit={selectedOutfit}
            pieces={allPieces}
            startInEditMode={selectedOutfitId === newOutfitId}
            onClose={() => {
              setSelectedOutfitId(null);
              setNewOutfitId(null);
            }}
            onSave={handleSaveOutfit}
            onDelete={handleDeleteOutfit}
          />
        </>
      )}
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function InspoCard({ entry }: { entry: InspoImage }) {
  const uri = imageUriForInspo(entry);
  return (
    <View style={styles.inspoCard}>
      <View style={styles.inspoImageWrapper}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.inspoImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.inspoImage, styles.inspoImageFallback]} />
        )}
      </View>
      {entry.vibe.length > 0 && (
        <Text style={styles.inspoVibe} numberOfLines={3}>
          {entry.vibe}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  titleRow: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  tabBar: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundElevated,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tabLabel: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.headline.fontWeight,
  },
  tabLabelActive: {
    color: theme.colors.background,
  },
  subtitle: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.md,
    flexGrow: 1,
  },
  column: {
    gap: theme.spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyHeading: {
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  inspoCard: {
    width: "47%",
    gap: theme.spacing.xxs,
  },
  inspoImageWrapper: {
    borderRadius: theme.radii.md,
    overflow: "hidden",
    backgroundColor: theme.colors.backgroundElevated,
  },
  inspoImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  inspoImageFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  inspoVibe: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
  },
  sourceModal: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sourceBackdrop: {
    position: "absolute",
    top: theme.spacing.none,
    right: theme.spacing.none,
    bottom: theme.spacing.none,
    left: theme.spacing.none,
  },
  sourceSheet: {
    backgroundColor: theme.colors.backgroundElevated,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sourceHeading: {
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
  },
  sourceBody: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  sourcePrimaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.accent,
  },
  sourcePrimaryLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.background,
  },
  sourceSecondaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  sourceSecondaryLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
});
