import { theme } from "@/theme/tokens";
import { Stack } from "expo-router";

export default function PrivacyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        title: "Where photos are stored",
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        headerTitleAlign: "left",
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
