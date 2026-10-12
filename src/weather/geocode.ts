// Open-Meteo's geocoding API — free, no API key required.
// https://open-meteo.com/en/docs/geocoding-api

export interface CityResult {
  id: number;
  label: string;
  lat: number;
  lon: number;
}

interface GeocodeApiResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export async function searchCities(query: string): Promise<CityResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("City search failed.");
  const data = await response.json();
  const results: GeocodeApiResult[] = Array.isArray(data?.results)
    ? data.results
    : [];
  return results.map((result) => ({
    id: result.id,
    label: [result.name, result.admin1, result.country]
      .filter(Boolean)
      .join(", "),
    lat: result.latitude,
    lon: result.longitude,
  }));
}
