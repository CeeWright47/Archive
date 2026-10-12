import {
    ChipGroup,
    CityTypeahead,
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
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
            Optional — your city powers the weather shown in the app bar and
            sharpens seasonal suggestions. Search for it or use your current
            location.
          </HelperText>
          <FieldLabel>City</FieldLabel>
          <CityTypeahead
            value={{
              city: value.climate.city,
              lat: value.climate.lat,
              lon: value.climate.lon,
            }}
            onChange={(next) =>
              prefs.update({ climate: { ...value.climate, ...next } })
            }
          />
          <FieldLabel>Climate</FieldLabel>
          <ChipGroup
            mode="single"
            options={CLIMATE_ZONES}
            value={value.climate.zone}
            onChange={(zone) =>
              prefs.update({ climate: { ...value.climate, zone } })
            }
          />
          {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
        </>
      )}
    </ProfilePage>
  );
}
