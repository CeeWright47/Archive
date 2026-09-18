import { Stack } from "expo-router";

import { SavedIndicator } from "@/components/settings";
import { SaveStatusProvider } from "@/hooks/useAutosave";
import { theme } from "@/theme/tokens";

const SCREEN_TITLES: Record<string, string> = {
  index: "Profile",
  account: "Account",
  about: "About you",
  sizes: "Sizes",
  style: "My Style",
  fit: "Fit preferences",
  colors: "Colors",
  occasions: "Occasions",
  assessment: "Style assessment",
  stores: "Stores",
  budget: "Budget",
  climate: "Climate",
  "privacy/photos": "Where photos are stored",
};

export default function ProfileLayout() {
  return (
    <SaveStatusProvider>
      <Stack
        screenOptions={({ route }) => ({
          title: SCREEN_TITLES[route.name] ?? "Profile",
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.text,
          headerTitleAlign: "left",
          headerBackButtonDisplayMode: "minimal",
          headerTitleStyle: {
            fontFamily: theme.fonts.serif,
            fontSize: theme.typography.title3.fontSize,
            fontWeight: theme.typography.title3.fontWeight,
            color: theme.colors.text,
          },
          headerRight: () => <SavedIndicator />,
          contentStyle: { backgroundColor: theme.colors.background },
        })}
      />
    </SaveStatusProvider>
  );
}
