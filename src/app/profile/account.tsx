import { Alert, StyleSheet, Text } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import {
    ErrorText,
    FieldLabel,
    HelperText,
    ProfilePage,
    TextField,
} from "@/components/settings";
import { useUserProfile } from "@/hooks/useProfileData";
import { theme } from "@/theme/tokens";

export default function AccountScreen() {
  const { session, signOut } = useAuth();
  const profile = useUserProfile();
  const value = profile.value;
  return (
    <ProfilePage
      loading={profile.loading}
      error={profile.loadError}
      saveAction={profile}
    >
      {value && (
        <>
          <HelperText>
            Your account details are saved securely to your profile.
          </HelperText>
          <FieldLabel>Name</FieldLabel>
          <TextField
            value={value.name ?? ""}
            onChangeText={(name) => profile.update({ name: name || null })}
            placeholder="Your name"
          />
          <FieldLabel>Email</FieldLabel>
          <TextField
            value={session?.user.email ?? ""}
            onChangeText={() => {}}
            editable={false}
          />
          <FieldLabel>Mobile</FieldLabel>
          <TextField
            value={value.mobile ?? ""}
            onChangeText={(mobile) =>
              profile.update({ mobile: mobile || null })
            }
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
          {profile.error ? <ErrorText>{profile.error}</ErrorText> : null}
          <Text style={styles.section}>Security</Text>
          <Text style={styles.placeholder}>
            Password change and Apple sign-in linking will be available soon.
          </Text>
          <Text
            style={styles.signOut}
            onPress={() =>
              Alert.alert("Sign out?", undefined, [
                { text: "Cancel", style: "cancel" },
                { text: "Sign out", style: "destructive", onPress: signOut },
              ])
            }
          >
            Sign out
          </Text>
        </>
      )}
    </ProfilePage>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
    marginTop: theme.spacing.md,
  },
  placeholder: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
  },
  signOut: {
    color: theme.colors.danger,
    fontSize: theme.typography.body.fontSize,
    paddingVertical: theme.spacing.sm,
  },
});
