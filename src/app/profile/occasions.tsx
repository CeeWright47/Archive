import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
    TextField,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";
import { useState } from "react";

const OCCASIONS = [
  "Work",
  "Gym",
  "Going out",
  "Date night",
  "Weekend",
  "Travel",
  "Formal events",
  "Church",
] as const;

export default function OccasionsScreen() {
  const prefs = usePreferences();
  const [draft, setDraft] = useState("");
  const value = prefs.value;
  if (!value)
    return (
      <ProfilePage
        loading={prefs.loading}
        error={prefs.loadError}
        saveAction={prefs}
      >
        {null}
      </ProfilePage>
    );
  const options = [
    ...value.occasions,
    ...OCCASIONS.filter((item) => !value.occasions.includes(item)),
  ];
  const add = () => {
    const item = draft.trim();
    setDraft("");
    if (item && !options.includes(item))
      prefs.update((prev) => ({
        ...prev,
        occasions: [...prev.occasions, item],
      }));
  };
  return (
    <ProfilePage
      loading={prefs.loading}
      error={prefs.loadError}
      saveAction={prefs}
    >
      <HelperText>
        Select the situations you actually dress for. Selected chips sort to the
        front.
      </HelperText>
      <ChipGroup
        mode="multi"
        options={options}
        value={value.occasions}
        onChange={(occasions) => prefs.update({ occasions })}
      />
      <FieldLabel>Add an occasion</FieldLabel>
      <TextField
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        onBlur={add}
        placeholder="e.g. Concerts"
        returnKeyType="done"
      />
      {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
    </ProfilePage>
  );
}
