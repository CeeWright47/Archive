import { StyleSheet, View } from "react-native";

import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    NumericField,
    ProfilePage,
} from "@/components/settings";
import { useUserProfile } from "@/hooks/useProfileData";
import { LETTER_SIZES, SHOE_WIDTHS } from "@/storage/profile";
import { theme } from "@/theme/tokens";

export default function SizesScreen() {
  const profile = useUserProfile();
  const p = profile.value;
  return (
    <ProfilePage
      loading={profile.loading}
      error={profile.loadError}
      saveAction={profile}
    >
      {p && (
        <>
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
          <View style={styles.row}>
            <NumericField
              value={p.sizes.tops.neck}
              onCommit={(neck) =>
                profile.update({
                  sizes: { ...p.sizes, tops: { ...p.sizes.tops, neck } },
                })
              }
              unit="neck"
              placeholder="15.5"
            />
            <NumericField
              value={p.sizes.tops.sleeve}
              onCommit={(sleeve) =>
                profile.update({
                  sizes: { ...p.sizes, tops: { ...p.sizes.tops, sleeve } },
                })
              }
              unit="sleeve"
              placeholder="34"
            />
          </View>
          <FieldLabel>Bottoms</FieldLabel>
          <View style={styles.row}>
            <NumericField
              value={p.sizes.bottoms.waist}
              onCommit={(waist) =>
                profile.update({
                  sizes: { ...p.sizes, bottoms: { ...p.sizes.bottoms, waist } },
                })
              }
              unit="waist"
              integer
            />
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
              unit="inseam"
              integer
            />
          </View>
          <FieldLabel>Shoes</FieldLabel>
          <NumericField
            value={p.sizes.shoes.size}
            onCommit={(size) =>
              profile.update({
                sizes: { ...p.sizes, shoes: { ...p.sizes.shoes, size } },
              })
            }
            placeholder="10.5"
          />
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
});
