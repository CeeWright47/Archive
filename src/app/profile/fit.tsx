import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";
import {
    BOTTOM_FITS,
    CUFFING_OPTIONS,
    LENGTH_OPTIONS,
    OUTERWEAR_FITS,
    TOP_FITS,
} from "@/storage/fitVocabulary";

export default function FitScreen() {
  const prefs = usePreferences();
  const value = prefs.value;
  return (
    <ProfilePage
      loading={prefs.loading}
      error={prefs.loadError}
      saveAction={prefs}
    >
      {value && (
        <>
          <HelperText>
            Choose what feels best by category. These preferences guide outfit
            suggestions.
          </HelperText>
          <FieldLabel>Tops</FieldLabel>
          <ChipGroup
            mode="multi"
            options={TOP_FITS}
            value={value.fit.tops}
            onChange={(tops) => prefs.update({ fit: { ...value.fit, tops } })}
          />
          <FieldLabel>Bottoms</FieldLabel>
          <ChipGroup
            mode="multi"
            options={BOTTOM_FITS}
            value={value.fit.bottoms}
            onChange={(bottoms) =>
              prefs.update({ fit: { ...value.fit, bottoms } })
            }
          />
          <FieldLabel>Outerwear</FieldLabel>
          <ChipGroup
            mode="multi"
            options={OUTERWEAR_FITS}
            value={value.fit.outerwear}
            onChange={(outerwear) =>
              prefs.update({ fit: { ...value.fit, outerwear } })
            }
          />
          <FieldLabel>Cuffing</FieldLabel>
          <ChipGroup
            mode="single"
            options={CUFFING_OPTIONS}
            value={value.fit.cuffing}
            onChange={(cuffing) =>
              prefs.update({ fit: { ...value.fit, cuffing } })
            }
          />
          <FieldLabel>Length</FieldLabel>
          <ChipGroup
            mode="single"
            options={LENGTH_OPTIONS}
            value={value.fit.length}
            onChange={(length) =>
              prefs.update({ fit: { ...value.fit, length } })
            }
          />
          {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
        </>
      )}
    </ProfilePage>
  );
}
