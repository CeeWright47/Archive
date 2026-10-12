import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { WeatherBadge } from '@/components/WeatherBadge';
import { theme } from '@/theme/tokens';

const BAR_HEIGHT = 48;

export function AppBar({ title }: { title?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Text style={styles.wordmark}>{title ?? "Archive"}</Text>
        <View style={styles.right}>
          <WeatherBadge />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={theme.spacing.sm}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle-outline" size={28} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  row: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  wordmark: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    lineHeight: theme.typography.title2.lineHeight,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.text,
  },
});
