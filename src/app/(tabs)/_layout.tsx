import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppBar } from "@/components/AppBar";
import { theme } from "@/theme/tokens";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "shirt-outline",
  outfits: "albums-outline",
  scan: "camera-outline",
  insights: "bar-chart-outline",
  lookbook: "book-outline",
};

const TAB_ICON_SIZE = theme.spacing.lg; // 24pt
const TAB_BAR_CONTENT_HEIGHT = theme.spacing.xxxl; // 64pt, room for icon + label

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppBar />
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.accent,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: theme.spacing.xs,
          },
          tabBarIcon: ({ color }) => (
            <Ionicons
              name={TAB_ICONS[route.name]}
              size={TAB_ICON_SIZE}
              color={color}
            />
          ),
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Wardrobe" }} />
        <Tabs.Screen name="outfits" options={{ title: "Outfits" }} />
        <Tabs.Screen name="scan" options={{ title: "Scan" }} />
        <Tabs.Screen name="insights" options={{ title: "Insights" }} />
        <Tabs.Screen name="lookbook" options={{ title: "Lookbook" }} />
      </Tabs>
    </View>
  );
}
