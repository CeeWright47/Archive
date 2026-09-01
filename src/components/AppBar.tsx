import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/theme/tokens';

const BAR_HEIGHT = 48;

export function AppBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <Text style={styles.wordmark}>Archive</Text>
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
  wordmark: {
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title2.fontSize,
    lineHeight: theme.typography.title2.lineHeight,
    fontWeight: theme.typography.title2.fontWeight,
    color: theme.colors.text,
  },
});
