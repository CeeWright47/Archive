import { StyleSheet, Text, View } from "react-native";

import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    NumericField,
    ProfilePage,
} from "@/components/settings";
import { useUserProfile } from "@/hooks/useProfileData";
import { GENDER_OPTIONS, LETTER_SIZES, SHOE_WIDTHS } from "@/storage/profile";
import { theme } from "@/theme/tokens";

export default function SizesScreen() {
  const profile = useUserProfile();
  const p = profile.value;
  const isFemale = p?.gender === "Female";
  return (
    <ProfilePage
      loading={profile.loading}
      error={profile.loadError}
      saveAction={profile}
    >
      {p && (
        <>
          <FieldLabel>Gender</FieldLabel>
          <ChipGroup
            mode="single"
            options={GENDER_OPTIONS}
            value={p.gender}
            onChange={(gender) => profile.update({ gender })}
          />
          <FieldLabel>Tops</FieldLabel>
          <ChipGroup
            mode="single"
            options={LETTER_SIZES}
            value={p.sizes.tops.letter}
            onChange={(letter) =>
              profile.update({
                sizes: { ...p.sizes, tops: { ...p.sizes.tops, letter } },
              })
            }
          />
          <FieldLabel>Bottoms</FieldLabel>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.miniLabel}>Waist</Text>
              <NumericField
                value={p.sizes.bottoms.waist}
                onCommit={(waist) =>
                  profile.update({
                    sizes: {
                      ...p.sizes,
                      bottoms: { ...p.sizes.bottoms, waist },
                    },
                  })
                }
                integer
              />
            </View>
            <View style={styles.half}>
              <Text style={styles.miniLabel}>Inseam</Text>
              <NumericField
                value={p.sizes.bottoms.inseam}
                onCommit={(inseam) =>
                  profile.update({
                    sizes: {
                      ...p.sizes,
                      bottoms: { ...p.sizes.bottoms, inseam },
                    },
                  })
                }
                integer
              />
            </View>
          </View>
          {isFemale && (
            <>
              <FieldLabel>Dress</FieldLabel>
              <NumericField
                value={p.sizes.dresses.size}
                onCommit={(size) =>
                  profile.update({ sizes: { ...p.sizes, dresses: { size } } })
                }
                placeholder="6"
                integer
              />
            </>
          )}
          <FieldLabel>Shoes</FieldLabel>
          <View style={styles.row}>
            <NumericField
              value={p.sizes.shoes.size}
              onCommit={(size) =>
                profile.update({
                  sizes: { ...p.sizes, shoes: { ...p.sizes.shoes, size } },
                })
              }
              unit={isFemale ? "women's" : undefined}
              placeholder="10.5"
              style={styles.half}
            />
            {isFemale && (
              <NumericField
                value={p.sizes.shoes.sizeMens}
                onCommit={(sizeMens) =>
                  profile.update({
                    sizes: {
                      ...p.sizes,
                      shoes: { ...p.sizes.shoes, sizeMens },
                    },
                  })
                }
                unit="men's"
                placeholder="8.5"
                style={styles.half}
              />
            )}
          </View>
          <ChipGroup
            mode="single"
            options={SHOE_WIDTHS}
            value={p.sizes.shoes.width}
            onChange={(width) =>
              profile.update({
                sizes: { ...p.sizes, shoes: { ...p.sizes.shoes, width } },
              })
            }
          />
          <FieldLabel>Outerwear</FieldLabel>
          <ChipGroup
            mode="single"
            options={LETTER_SIZES}
            value={p.sizes.outerwear.letter}
            onChange={(letter) =>
              profile.update({ sizes: { ...p.sizes, outerwear: { letter } } })
            }
          />
          {profile.error ? <ErrorText>{profile.error}</ErrorText> : null}
        </>
      )}
    </ProfilePage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: theme.spacing.xs },
  half: { flex: 1 },
  miniLabel: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xxs,
    marginLeft: theme.spacing.xxs,
  },
});
