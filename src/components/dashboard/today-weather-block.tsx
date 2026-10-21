import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { WeatherIconKind, WeatherSnapshot } from "@/lib/weather/met-norway";

const WEATHER_ICONS: Record<WeatherIconKind, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  cloud: Cloud,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  "cloud-snow": CloudSnow,
  "cloud-hail": CloudHail,
  "cloud-fog": CloudFog,
};

const BRAND_NUMBER = {
  backgroundImage: "linear-gradient(100deg, #5e25cc 0%, #2b59ff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

/** Current date, brand day number and today's weather — `/inicio` top band. */
export function TodayWeatherBlock({
  locale,
  todayISO,
  weather,
}: {
  locale: "es" | "en";
  todayISO: string;
  weather: WeatherSnapshot | null;
}) {
  const lang = locale === "en" ? "en-US" : "es-CR";
  const date = parseISO(todayISO);
  const weekday = date.toLocaleDateString(lang, { weekday: "long" });
  const month = `${date.toLocaleDateString(lang, { month: "long" })} ${date.getFullYear()}`;

  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium capitalize tracking-wide text-foreground/60 dark:text-foreground/45">
        {weekday}
      </p>
      <div className="flex items-center gap-3">
        <p
          className="brand-page-title text-[4.5rem] leading-none tracking-tight sm:text-[5.5rem]"
          style={BRAND_NUMBER}
        >
          {date.getDate()}
        </p>
        {weather ? <ResumenWeather weather={weather} /> : null}
      </div>
      <p className="mt-1 text-lg capitalize text-foreground/70 dark:text-foreground/55">
        {month}
      </p>
    </div>
  );
}

function ResumenWeather({ weather }: { weather: WeatherSnapshot }) {
  const Icon = WEATHER_ICONS[weather.icon];
  const iconTone =
    weather.icon === "sun" || weather.icon === "cloud-sun"
      ? "text-[#eab308]"
      : "text-[#2b59ff] dark:text-[#7aa2ff]";

  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-7 w-7 shrink-0 ${iconTone}`} aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xl font-semibold leading-none text-foreground">
          {weather.temperatureC}°C
        </span>
        <p className="text-xs text-foreground/50">
          Máx {weather.highC}° · Mín {weather.lowC}°
        </p>
      </div>
    </div>
  );
}

function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}
