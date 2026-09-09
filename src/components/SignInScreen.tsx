import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { spacing, theme, typography } from '@/theme/tokens';

export default function SignInScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result =
      mode === 'sign-in' ? await signInWithEmail(email, password) : await signUpWithEmail(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setError('Apple sign-in did not return a token.');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (authError) {
        setError(authError.message);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Archive</Text>
      <Text style={styles.subtitle}>
        {mode === 'sign-in' ? 'Sign in to your wardrobe' : 'Create your account'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>
          {submitting ? 'Please wait…' : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
        </Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
        <Text style={styles.switchModeText}>
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...typography.largeTitle,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.subheadline,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    ...typography.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundElevated,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.footnote,
    color: theme.colors.danger,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonText: {
    ...typography.headline,
    color: theme.colors.background,
  },
  switchModeText: {
    ...typography.footnote,
    color: theme.colors.accent,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  appleButton: {
    width: '100%',
    height: 44,
  },
});
