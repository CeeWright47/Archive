import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { theme } from "@/theme/tokens";
import { searchCities, type CityResult } from "@/weather/geocode";

const SEARCH_DEBOUNCE_MS = 300;

export interface CityValue {
  city: string | null;
  lat: number | null;
  lon: number | null;
}

interface CityTypeaheadProps {
  value: CityValue;
  onChange: (value: CityValue) => void;
}

// Free-text city search (Open-Meteo geocoding, no API key) plus an optional
// "use my current location" shortcut via expo-location + the device's own
// reverse geocoder. Selecting either stores {city, lat, lon} together so
// weather lookups elsewhere always have coordinates to work with.
export function CityTypeahead({ value, onChange }: CityTypeaheadProps) {
  const [query, setQuery] = useState(value.city ?? "");
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setQuery(value.city ?? "");
  }, [value.city]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleQueryChange(next: string) {
    setQuery(next);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = next.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const thisRequest = ++requestId.current;
      setSearching(true);
      try {
        const matches = await searchCities(trimmed);
        if (requestId.current === thisRequest) setResults(matches);
      } catch {
        if (requestId.current === thisRequest) setResults([]);
      } finally {
        if (requestId.current === thisRequest) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  function handleSelect(result: CityResult) {
    requestId.current += 1;
    setResults([]);
    setQuery(result.label);
    onChange({ city: result.label, lat: result.lat, lon: result.lon });
  }

  function handleClear() {
    requestId.current += 1;
    setQuery("");
    setResults([]);
    setError(null);
    onChange({ city: null, lat: null, lon: null });
  }

  async function handleUseLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError("Location permission was not granted.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const label =
        [place?.city ?? place?.subregion ?? place?.district, place?.region]
          .filter(Boolean)
          .join(", ") || "Current location";
      setResults([]);
      setQuery(label);
      onChange({
        city: label,
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn’t get your location.",
      );
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search for a city"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={theme.colors.accent}
          style={styles.input}
          accessibilityLabel="Search for a city"
        />
        {searching ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear city"
            hitSlop={theme.spacing.xs}
            onPress={handleClear}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {results.length > 0 && (
        <View style={styles.results}>
          {results.map((result) => (
            <Pressable
              key={result.id}
              accessibilityRole="button"
              accessibilityLabel={result.label}
              onPress={() => handleSelect(result)}
              style={({ pressed }) => [
                styles.resultRow,
                pressed && styles.resultRowPressed,
              ]}
            >
              <Text style={styles.resultLabel}>{result.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use my current location"
        disabled={locating}
        onPress={handleUseLocation}
        style={styles.locationButton}
      >
        {locating ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <Ionicons
            name="locate-outline"
            size={16}
            color={theme.colors.accent}
          />
        )}
        <Text style={styles.locationLabel}>Use my current location</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.xs },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundElevated,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  results: {
    borderRadius: theme.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundElevated,
    overflow: "hidden",
  },
  resultRow: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  resultRowPressed: {
    backgroundColor: theme.colors.background,
  },
  resultLabel: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    color: theme.colors.text,
  },
  locationButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xxs,
    minHeight: 36,
    paddingHorizontal: theme.spacing.xs,
  },
  locationLabel: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.accent,
    fontWeight: theme.typography.headline.fontWeight,
  },
  error: {
    fontSize: theme.typography.footnote.fontSize,
    lineHeight: theme.typography.footnote.lineHeight,
    color: theme.colors.danger,
  },
});
