import {
    ErrorText,
    FieldLabel,
    HelperText,
    MultilineField,
    ProfilePage,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";

export default function StyleScreen() {
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
            Describe your style in your own words. This is one input to your
            style profiles alongside your closet, inspo, and outfits.
          </HelperText>
          <FieldLabel>My style</FieldLabel>
          <MultilineField
            value={value.styleText ?? ""}
            onChangeText={(styleText) => prefs.update({ styleText })}
            placeholder="A few words about how you like to dress..."
          />
          {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
        </>
      )}
    </ProfilePage>
  );
}
