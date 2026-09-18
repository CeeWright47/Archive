import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { ArchiveLoadingScreen } from "@/components/ArchiveLoadingScreen";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import SignInScreen from "@/components/SignInScreen";
import { storage } from "@/storage";
import { runMigrations } from "@/storage/migrations";
import { pieces } from "@/storage/pieces";
import {
    profileStore,
    type Preferences,
    type UserProfile,
} from "@/storage/profile";
import { theme } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

const MINIMUM_LOADING_MS = 800;

interface BootstrapData {
  userId: string;
  profile: UserProfile;
  preferences: Preferences;
}

function RootNavigator() {
  const [migrationsReady, setMigrationsReady] = useState(false);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [loadingVisible, setLoadingVisible] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const { session, initializing } = useAuth();
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const requestId = useRef(0);
  const bootstrappedFor = useRef<string | null>(null);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    runMigrations(storage)
      .catch((error) => console.error("Storage migration failed", error))
      .finally(() => {
        setProgress(0.2);
        setMigrationsReady(true);
      });
  }, []);

  useEffect(() => {
    if (!migrationsReady || initializing) return;
    const userId = session?.user.id ?? "signed-out";
    if (bootstrappedFor.current === userId) return;

    const currentRequest = ++requestId.current;
    const startedAt = Date.now();
    setLoadingVisible(true);
    loadingOpacity.setValue(1);
    setBootstrapError(null);

    const complete = async () => {
      const remaining = MINIMUM_LOADING_MS - (Date.now() - startedAt);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      if (requestId.current !== currentRequest) return;
      bootstrappedFor.current = userId;
      Animated.timing(loadingOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        if (requestId.current === currentRequest) setLoadingVisible(false);
      }, 220);
    };

    if (!session) {
      setProgress(1);
      setBootstrap(null);
      void complete();
      return;
    }

    setProgress(0.35);
    Promise.all([profileStore.getUserProfile(), profileStore.getPreferences()])
      .then(async ([profile, preferences]) => {
        if (requestId.current !== currentRequest) return;
        setProgress(0.7);
        await pieces.list();
        if (requestId.current !== currentRequest) return;
        setProgress(1);
        setBootstrap({ userId: session.user.id, profile, preferences });
      })
      .catch((error) => {
        if (requestId.current !== currentRequest) return;
        setBootstrapError(
          error instanceof Error ? error.message : "Couldn’t load Archive.",
        );
      })
      .finally(() => void complete());

    return () => {
      requestId.current += 1;
    };
  }, [initializing, loadingOpacity, migrationsReady, session]);

  let content = <View style={styles.blank} />;

  if (!session) {
    content = (
      <>
        <StatusBar style="light" />
        <SignInScreen />
      </>
    );
  } else if (bootstrapError) {
    content = (
      <View style={styles.error}>
        <Text style={styles.errorText}>{bootstrapError}</Text>
      </View>
    );
  } else if (bootstrap?.userId === session.user.id) {
    const showOnboarding =
      !bootstrap.preferences.onboardingCompleted &&
      !bootstrap.preferences.styleText?.trim();
    content = showOnboarding ? (
      <OnboardingFlow
        initialProfile={bootstrap.profile}
        initialPreferences={bootstrap.preferences}
        onComplete={(profile, preferences) =>
          setBootstrap({ userId: session.user.id, profile, preferences })
        }
      />
    ) : (
      <>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="outfits" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack>
      </>
    );
  }

  return (
    <View style={styles.root}>
      {content}
      {loadingVisible ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: loadingOpacity, pointerEvents: "auto" },
          ]}
        >
          <ArchiveLoadingScreen progress={progress} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  blank: { flex: 1, backgroundColor: theme.colors.background },
  error: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.body.fontSize,
    textAlign: "center",
  },
});
