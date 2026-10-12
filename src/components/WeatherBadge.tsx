import { Ionicons } from "@expo/vector-icons";
import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { profileStore } from "@/storage/profile";
import { theme } from "@/theme/tokens";
import {
    getCurrentWeather,
    type CurrentWeather,
    type WeatherIcon,
} from "@/weather/getWeather";

const ICON_NAME: Record<WeatherIcon, keyof typeof Ionicons.glyphMap> = {
  sunny: "sunny-outline",
  "partly-cloudy": "partly-sunny-outline",
  cloudy: "cloud-outline",
  rain: "rainy-outline",
  snow: "snow-outline",
  storm: "thunderstorm-outline",
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const weatherCache = new Map<
  string,
  { data: CurrentWeather; fetchedAt: number }
>();

// Only renders once the user has a city set (manually or via location) —
// absent otherwise, not just hidden. Preferences live in a different stack
// (profile/climate) from this always-mounted app bar, so re-check on every
// tab change rather than only on first mount.
export function WeatherBadge() {
  const pathname = usePathname();
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    let cancelled = false;
    profileStore
      .getPreferences()
      .then(async (prefs) => {
        const { lat, lon } = prefs.climate;
        if (lat === null || lon === null) {
          if (!cancelled) setWeather(null);
          return;
        }
        const key = `${lat.toFixed(2)},${lon.toFixed(2)},${prefs.units}`;
        const cached = weatherCache.get(key);
        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
          if (!cancelled) setWeather(cached.data);
          return;
        }
        const data = await getCurrentWeather(lat, lon, prefs.units);
        weatherCache.set(key, { data, fetchedAt: Date.now() });
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!weather) return null;

  return (
    <View style={styles.container}>
      <Ionicons
        name={ICON_NAME[weather.icon]}
        size={16}
        color={theme.colors.textMuted}
      />
      <Text style={styles.temp}>{weather.temperature}°</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs,
  },
  temp: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.textMuted,
  },
});
