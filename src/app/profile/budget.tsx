import {
    ChipGroup,
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";
import { BUDGET_CATEGORIES, BUDGET_TIERS } from "@/storage/profile";

const RANGES: Record<string, string> = {
  $: "Under $50",
  $$: "$50–150",
  $$$: "$150–300",
  $$$$: "$300+",
};

export default function BudgetScreen() {
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
            Typical spend by category. These ranges help keep suggestions
            realistic.
          </HelperText>
          {BUDGET_CATEGORIES.map((category) => (
            <FieldLabel
              key={category}
            >{`${category} · ${RANGES[value.budget[category] ?? "$"]}`}</FieldLabel>
          ))}
          {BUDGET_CATEGORIES.map((category) => (
            <ChipGroup
              key={category}
              mode="single"
              options={BUDGET_TIERS}
              value={value.budget[category] ?? null}
              onChange={(tier) =>
                prefs.update((prev) => ({
                  ...prev,
                  budget: { ...prev.budget, [category]: tier ?? undefined },
                }))
              }
            />
          ))}
          {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
        </>
      )}
    </ProfilePage>
  );
}
