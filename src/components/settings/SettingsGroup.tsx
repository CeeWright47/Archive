import { Children, Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme/tokens";

const DIVIDER_INSET = theme.spacing.md;

// Rounded, one-step-lighter card that wraps SettingsRows and draws inset hairline dividers.
export function SettingsGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View style={styles.divider} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.backgroundElevated,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: DIVIDER_INSET,
  },
});
