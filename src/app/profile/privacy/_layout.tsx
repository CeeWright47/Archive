import { Stack } from "expo-router";

import { BackButton } from "@/components/BackButton";
import { theme } from "@/theme/tokens";

export default function PrivacyLayout() {
  return (
    <Stack
      screenOptions={{
        title: "Where photos are stored",
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerLeft: () => <BackButton />,
        headerTitleStyle: {
          fontFamily: theme.fonts.serif,
          color: theme.colors.text,
        },
      }}
    >
      <Stack.Screen
        name="photos"
        options={{ title: "Where photos are stored" }}
      />
    </Stack>
  );
}
