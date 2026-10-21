export type WeatherIconKind =
  | "sun"
  | "moon"
  | "cloud-sun"
  | "cloud-moon"
  | "cloud"
  | "cloud-drizzle"
  | "cloud-rain"
  | "cloud-lightning"
  | "cloud-snow"
  | "cloud-hail"
  | "cloud-fog";

export type WeatherSnapshot = {
  temperatureC: number;
  highC: number;
  lowC: number;
  symbolCode: string;
  label: string;
  icon: WeatherIconKind;
  precipitationProbability: number | null;
  precipitationAmountMm: number | null;
  updatedAt: string;
};

type WeatherSymbol = { label: string; icon: WeatherIconKind };

const WEATHER_USER_AGENT =
  "WeeonSchool/1.0 (+https://app.weeon.school; ops@weeon.school)";

/** MET Norway `symbol_code` → Spanish label + icon kind. */
export function weatherSymbol(code: string): WeatherSymbol {
  const night = code.endsWith("_night");
  const base = code.replace(/_(day|night|polartwilight)$/, "");

  switch (base) {
    case "clearsky":
      return { label: "Despejado", icon: night ? "moon" : "sun" };
    case "fair":
      return { label: "Mayormente despejado", icon: night ? "moon" : "sun" };
    case "partlycloudy":
      return {
        label: "Parcialmente nublado",
        icon: night ? "cloud-moon" : "cloud-sun",
      };
    case "cloudy":
      return { label: "Nublado", icon: "cloud" };
    case "fog":
      return { label: "Niebla", icon: "cloud-fog" };
    case "lightrain":
      return { label: "Lluvia ligera", icon: "cloud-drizzle" };
    case "rain":
      return { label: "Lluvia", icon: "cloud-rain" };
    case "heavyrain":
      return { label: "Lluvia fuerte", icon: "cloud-rain" };
    case "lightrainshowers":
      return { label: "Chubascos ligeros", icon: "cloud-drizzle" };
    case "rainshowers":
      return { label: "Chubascos", icon: "cloud-rain" };
    case "heavyrainshowers":
      return { label: "Chubascos fuertes", icon: "cloud-rain" };
    case "lightrainandthunder":
    case "rainandthunder":
      return { label: "Tormenta", icon: "cloud-lightning" };
    case "heavyrainandthunder":
      return { label: "Tormenta fuerte", icon: "cloud-lightning" };
    case "lightrainshowersandthunder":
    case "rainshowersandthunder":
    case "heavyrainshowersandthunder":
      return { label: "Tormenta con chubascos", icon: "cloud-lightning" };
    case "lightsleet":
    case "sleet":
    case "heavysleet":
    case "lightsleetshowers":
    case "sleetshowers":
    case "heavysleetshowers":
      return { label: "Aguanieve", icon: "cloud-hail" };
    case "lightsnow":
    case "snow":
    case "heavysnow":
    case "lightsnowshowers":
    case "snowshowers":
    case "heavysnowshowers":
      return { label: "Nieve", icon: "cloud-snow" };
    default:
      return { label: "Clima", icon: "cloud" };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type ForecastSlice = {
  summary?: { symbol_code?: unknown };
  details?: Record<string, unknown>;
};

function readForecastSlice(value: unknown): ForecastSlice | null {
  return asRecord(value) as ForecastSlice | null;
}

function firstSymbolCode(entry: Record<string, unknown>): string | null {
  for (const key of ["next_1_hours", "next_6_hours", "next_12_hours"]) {
    const slice = readForecastSlice(entry[key]);
    const code = slice?.summary?.symbol_code;
    if (typeof code === "string" && code.trim()) return code.trim();
  }
  return null;
}

function firstProbability(entry: Record<string, unknown>): number | null {
  for (const key of ["next_1_hours", "next_6_hours", "next_12_hours"]) {
    const slice = readForecastSlice(entry[key]);
    const probability = readNumber(slice?.details?.probability_of_precipitation);
    if (probability !== null) {
      return Math.max(0, Math.min(100, Math.round(probability)));
    }
  }
  return null;
}

function firstPrecipitationAmount(entry: Record<string, unknown>): number | null {
  for (const key of ["next_6_hours", "next_1_hours", "next_12_hours"]) {
    const slice = readForecastSlice(entry[key]);
    const amount = readNumber(slice?.details?.precipitation_amount);
    if (amount !== null) return Math.round(amount * 10) / 10;
  }
  return null;
}

/**
 * Parse the MET Norway `locationforecast/2.0/compact` payload into the small
 * shape the Resumen needs: current temperature, today's range, symbol and rain
 * probability. Returns null when the payload has no usable timeseries.
 */
export function parseMetNorway(
  payload: unknown,
  now: Date = new Date(),
): WeatherSnapshot | null {
  const root = asRecord(payload);
  const properties = asRecord(root?.properties);
  const series = properties?.timeseries;
  if (!Array.isArray(series) || series.length === 0) return null;

  const entries = series
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null);

  const temperatures: number[] = [];
  for (const entry of entries.slice(0, 24)) {
    const instant = asRecord(entry.data);
    const details = asRecord(instant?.instant);
    const reading = asRecord(details?.details);
    const temperature = readNumber(reading?.air_temperature);
    if (temperature !== null) temperatures.push(temperature);
  }

  if (temperatures.length === 0) return null;

  const current = entries[0];
  const data = asRecord(current.data);
  const instant = asRecord(data?.instant);
  const instantDetails = asRecord(instant?.details);
  const currentTemperature =
    readNumber(instantDetails?.air_temperature) ?? temperatures[0];

  const symbolCode = firstSymbolCode(data ?? {}) ?? "cloudy";
  const symbol = weatherSymbol(symbolCode);
  const meta = asRecord(properties?.meta);
  const updatedAt =
    typeof meta?.updated_at === "string" ? meta.updated_at : now.toISOString();

  return {
    temperatureC: Math.round(currentTemperature),
    highC: Math.round(Math.max(...temperatures)),
    lowC: Math.round(Math.min(...temperatures)),
    symbolCode,
    label: symbol.label,
    icon: symbol.icon,
    precipitationProbability: firstProbability(data ?? {}),
    precipitationAmountMm: firstPrecipitationAmount(data ?? {}),
    updatedAt,
  };
}

/** Fetch current conditions from MET Norway (free, no API key). */
export async function fetchMetNorwayWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot | null> {
  const url =
    "https://api.met.no/weatherapi/locationforecast/2.0/compact" +
    `?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": WEATHER_USER_AGENT,
      },
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 1800 },
    });
    if (!response.ok) return null;
    return parseMetNorway(await response.json());
  } catch {
    return null;
  }
}
