import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
    TextField,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";
import { CLIMATE_ZONES } from "@/storage/profile";

export default function ClimateScreen() {
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
            Your climate affects seasonal suggestions and layering advice.
          </HelperText>
          <FieldLabel>Climate</FieldLabel>
          <ChipGroup
            mode="single"
            options={CLIMATE_ZONES}
            value={value.climate.zone}
            onChange={(zone) =>
              prefs.update({ climate: { ...value.climate, zone } })
            }
          />
          <FieldLabel>City</FieldLabel>
          <TextField
            value={value.climate.city ?? ""}
            onChangeText={(city) =>
              prefs.update({
                climate: { ...value.climate, city: city || null },
              })
            }
            placeholder="Optional city"
            autoCapitalize="words"
          />
          {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
        </>
      )}
    </ProfilePage>
  );
}
