// Open-Meteo's forecast API — free, no API key required.
// https://open-meteo.com/en/docs

export type WeatherIcon =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "snow"
  | "storm";

export interface CurrentWeather {
  temperature: number;
  icon: WeatherIcon;
}

// WMO weather interpretation codes, collapsed to the handful of icons we show.
const ICON_BY_CODE: Record<number, WeatherIcon> = {
  0: "sunny",
  1: "partly-cloudy",
  2: "cloudy",
  3: "cloudy",
  45: "cloudy",
  48: "cloudy",
  51: "rain",
  53: "rain",
  55: "rain",
  56: "rain",
  57: "rain",
  61: "rain",
  63: "rain",
  65: "rain",
  66: "rain",
  67: "rain",
  71: "snow",
  73: "snow",
  75: "snow",
  77: "snow",
  80: "rain",
  81: "rain",
  82: "rain",
  85: "snow",
  86: "snow",
  95: "storm",
  96: "storm",
  99: "storm",
};

export async function getCurrentWeather(
  lat: number,
  lon: number,
  units: "imperial" | "metric",
): Promise<CurrentWeather> {
  const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather lookup failed.");
  const data = await response.json();
  const temperature = data?.current?.temperature_2m;
  const code = data?.current?.weather_code;
  if (typeof temperature !== "number") {
    throw new Error("Weather lookup returned no data.");
  }
  return {
    temperature: Math.round(temperature),
    icon: ICON_BY_CODE[code] ?? "cloudy",
  };
}
