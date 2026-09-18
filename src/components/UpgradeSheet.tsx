import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/settings";
import { theme } from "@/theme/tokens";

type PurchasePlan = "monthly" | "annual" | "lifetime";

const UNLOCKS = [
  "Unlimited pieces",
  "Unlimited assessment re-runs",
  "Insights suggestions",
] as const;

export function UpgradeSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PurchasePlan>("annual");

  useEffect(() => {
    if (visible) setSelected("annual");
  }, [visible]);

  const purchase = () => {
    Alert.alert(
      "Purchases coming soon",
      "RevenueCat will be connected in the next pass.",
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close upgrade"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>ARCHIVE PRO</Text>
              <Text style={styles.title}>Your closet, without limits.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={12}
              style={styles.close}
            >
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <View style={styles.unlocks}>
            {UNLOCKS.map((unlock) => (
              <View key={unlock} style={styles.unlockRow}>
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.accent}
                />
                <Text style={styles.unlockText}>{unlock}</Text>
              </View>
            ))}
          </View>

          <View style={styles.plans}>
            <PlanOption
              selected={selected === "monthly"}
              title="Monthly"
              price="$7.99"
              onPress={() => setSelected("monthly")}
            />
            <PlanOption
              selected={selected === "annual"}
              title="Annual"
              price="$49.99"
              detail="$4.17/mo · 7-day trial"
              badge="Save 48%"
              onPress={() => setSelected("annual")}
            />
            <PlanOption
              selected={selected === "lifetime"}
              title="Lifetime"
              price="$79"
              detail="Pay once, keep forever."
              onPress={() => setSelected("lifetime")}
            />
          </View>

          <PrimaryButton
            label={selected === "lifetime" ? "Choose lifetime" : "Start trial"}
            onPress={purchase}
          />
        </View>
      </View>
    </Modal>
  );
}

function PlanOption({
  selected,
  title,
  price,
  detail,
  badge,
  onPress,
}: {
  selected: boolean;
  title: string;
  price: string;
  detail?: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}
    >
      <View style={styles.planCopy}>
        <View style={styles.planTitleRow}>
          <Text style={styles.planTitle}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        {detail ? <Text style={styles.planDetail}>{detail}</Text> : null}
      </View>
      <Text style={styles.price}>{price}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  sheet: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md,
  },
  eyebrow: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption1.fontSize,
    letterSpacing: theme.tracking.caption,
    color: theme.colors.accent,
  },
  title: {
    marginTop: theme.spacing.xxs,
    fontFamily: theme.fonts.serif,
    fontSize: theme.typography.title1.fontSize,
    lineHeight: theme.typography.title1.lineHeight,
    color: theme.colors.text,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  unlocks: { gap: theme.spacing.xs },
  unlockRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  unlockText: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  plans: { gap: theme.spacing.xs },
  plan: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.backgroundElevated,
  },
  planSelected: { borderColor: theme.colors.accent },
  planCopy: { flex: 1, gap: 2 },
  planTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planTitle: {
    fontSize: theme.typography.headline.fontSize,
    lineHeight: theme.typography.headline.lineHeight,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
  planDetail: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.pill,
    overflow: "hidden",
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption2.fontSize,
    color: theme.colors.background,
    backgroundColor: theme.colors.accent,
  },
  price: {
    fontSize: theme.typography.headline.fontSize,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
  },
});
