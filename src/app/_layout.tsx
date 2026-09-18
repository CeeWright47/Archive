import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import SignInScreen from "@/components/SignInScreen";
import { storage } from "@/storage";
import { runMigrations } from "@/storage/migrations";
import { theme } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const [ready, setReady] = useState(false);
  const { session, initializing } = useAuth();

  useEffect(() => {
    runMigrations(storage)
      .catch((error) => console.error("Storage migration failed", error))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && !initializing) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, initializing]);

  if (!ready || initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <SignInScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
