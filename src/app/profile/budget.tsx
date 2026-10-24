import { StyleSheet, View } from "react-native";

import {
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
    SliderField,
} from "@/components/settings";
import { usePreferences } from "@/hooks/useProfileData";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/storage/profile";
import { theme } from "@/theme/tokens";

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
            Typical spend by category. Drag the slider or type an exact
            amount — these keep suggestions realistic.
          </HelperText>
          {BUDGET_CATEGORIES.map((category: BudgetCategory) => (
            <View key={category} style={styles.field}>
              <FieldLabel>{category}</FieldLabel>
              <SliderField
                value={value.budget[category] ?? null}
                onCommit={(amount) =>
                  prefs.update((prev) => ({
                    ...prev,
                    budget: {
                      ...prev.budget,
                      [category]: amount ?? undefined,
                    },
                  }))
                }
                min={0}
                max={500}
                step={5}
                placeholder="0"
              />
            </View>
          ))}
          {prefs.error ? <ErrorText>{prefs.error}</ErrorText> : null}
        </>
      )}
    </ProfilePage>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.xs },
});
