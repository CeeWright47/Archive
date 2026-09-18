import { useRouter } from "expo-router";

import { ArchiveLoadingScreen } from "@/components/ArchiveLoadingScreen";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { usePreferences, useUserProfile } from "@/hooks/useProfileData";

export default function OnboardingScreen() {
  const router = useRouter();
  const profile = useUserProfile();
  const preferences = usePreferences();

  if (
    profile.loading ||
    preferences.loading ||
    !profile.value ||
    !preferences.value
  ) {
    return <ArchiveLoadingScreen showTip={false} />;
  }

  return (
    <OnboardingFlow
      initialProfile={profile.value}
      initialPreferences={preferences.value}
      onComplete={() => router.replace("/profile")}
    />
  );
}
