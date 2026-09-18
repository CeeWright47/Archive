import { Stack } from "expo-router";

import { theme } from "@/theme/tokens";

export default function OutfitDetailLayout() {
  return (
    <Stack
      screenOptions={{
        title: "Lookbook",
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerBackButtonDisplayMode: "minimal",
        headerTitleStyle: {
          fontFamily: theme.fonts.serif,
          fontSize: theme.typography.title3.fontSize,
          fontWeight: theme.typography.title3.fontWeight,
          color: theme.colors.text,
        },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
