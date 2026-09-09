import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { settings, type ProfileSettings } from '@/storage/settings';
import { theme } from '@/theme/tokens';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [data, setData] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    settings
      .getProfileSettings()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Couldn’t load profile.'),
      )
      .finally(() => setLoading(false));
  }, []);

  function handleSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>
      {session?.user.email && <Text style={styles.email}>{session.user.email}</Text>}

      {loading && <ActivityIndicator color={theme.colors.accent} style={styles.loader} />}
      {error && <Text style={styles.emptyBody}>{error}</Text>}

      {data?.styleProfile && (
        <Section title="Style Profile">
          <Text style={styles.body}>{data.styleProfile}</Text>
        </Section>
      )}

      {data?.styleAssessment && (
        <Section title="Style Assessment">
          {data.styleAssessment.headline.length > 0 && (
            <Text style={styles.headline}>{data.styleAssessment.headline}</Text>
          )}
          <Text style={styles.body}>{data.styleAssessment.read}</Text>
        </Section>
      )}

      {data?.closetGaps && (
        <Section title="Closet Gaps">
          <Text style={styles.body}>{data.closetGaps.verdict}</Text>
          <View style={styles.gapList}>
            {data.closetGaps.items.map((item, index) => (
              <View key={`${item.item}-${index}`} style={styles.gapCard}>
                <View style={styles.gapHeader}>
                  <Text style={styles.gapItem} numberOfLines={2}>
                    {item.item}
                  </Text>
                  {item.owned && <Text style={styles.gapOwned}>Owned</Text>}
                </View>
                <Text style={styles.gapWhy}>{item.why}</Text>
                <Text style={styles.gapPrice}>{item.price}</Text>
              </View>
            ))}
          </View>
          {data.closetGaps.stopBuying.length > 0 && (
            <Text style={styles.stopBuying}>Stop buying: {data.closetGaps.stopBuying}</Text>
          )}
        </Section>
      )}

      <Pressable accessibilityRole="button" onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutLabel}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.title1.fontSize,
    lineHeight: theme.typography.title1.lineHeight,
    fontWeight: theme.typography.title1.fontWeight,
    color: theme.colors.text,
  },
  email: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  loader: {
    marginTop: theme.spacing.md,
  },
  emptyBody: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.textMuted,
  },
  section: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.title3.fontSize,
    lineHeight: theme.typography.title3.lineHeight,
    fontWeight: theme.typography.title3.fontWeight,
    color: theme.colors.text,
  },
  headline: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.accent,
  },
  body: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  gapList: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxs,
  },
  gapCard: {
    gap: theme.spacing.xxs,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  gapItem: {
    flex: 1,
    fontSize: theme.typography.subheadline.fontSize,
    lineHeight: theme.typography.subheadline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
  gapOwned: {
    fontSize: theme.typography.caption2.fontSize,
    lineHeight: theme.typography.caption2.lineHeight,
    color: theme.colors.accent,
  },
  gapWhy: {
    fontSize: theme.typography.caption1.fontSize,
    lineHeight: theme.typography.caption1.lineHeight,
    color: theme.colors.textMuted,
  },
  gapPrice: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.text,
  },
  stopBuying: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xxs,
  },
  signOutButton: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.danger,
  },
  signOutLabel: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.danger,
  },
});
