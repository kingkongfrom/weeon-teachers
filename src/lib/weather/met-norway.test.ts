import { describe, expect, it } from "vitest";

import { parseMetNorway, weatherSymbol } from "@/lib/weather/met-norway";

describe("weatherSymbol", () => {
  it("maps clear and cloudy day/night codes", () => {
    expect(weatherSymbol("clearsky_day")).toEqual({ label: "Despejado", icon: "sun" });
    expect(weatherSymbol("clearsky_night")).toEqual({ label: "Despejado", icon: "moon" });
    expect(weatherSymbol("partlycloudy_day").icon).toBe("cloud-sun");
    expect(weatherSymbol("partlycloudy_night").icon).toBe("cloud-moon");
    expect(weatherSymbol("cloudy").icon).toBe("cloud");
  });

  it("maps rain, thunder, sleet and snow", () => {
    expect(weatherSymbol("lightrain").icon).toBe("cloud-drizzle");
    expect(weatherSymbol("heavyrainandthunder").icon).toBe("cloud-lightning");
    expect(weatherSymbol("sleet").icon).toBe("cloud-hail");
    expect(weatherSymbol("heavysnow").icon).toBe("cloud-snow");
  });

  it("falls back for unknown codes", () => {
    expect(weatherSymbol("nonsense")).toEqual({ label: "Clima", icon: "cloud" });
  });
});

describe("parseMetNorway", () => {
  const payload = {
    properties: {
      meta: { updated_at: "2026-10-21T12:00:00Z" },
      timeseries: [
        {
          time: "2026-10-21T12:00:00Z",
          data: {
            instant: { details: { air_temperature: 22.4 } },
            next_1_hours: {
              summary: { symbol_code: "partlycloudy_day" },
              details: { probability_of_precipitation: 35.4 },
            },
            next_6_hours: {
              summary: { symbol_code: "rain" },
              details: { precipitation_amount: 1.9 },
            },
          },
        },
        {
          time: "2026-10-21T15:00:00Z",
          data: { instant: { details: { air_temperature: 26.1 } } },
        },
        {
          time: "2026-10-21T18:00:00Z",
          data: { instant: { details: { air_temperature: 18.2 } } },
        },
      ],
    },
  };

  it("reads current temperature, daily range, symbol and rain chance", () => {
    const snapshot = parseMetNorway(payload);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.temperatureC).toBe(22);
    expect(snapshot?.highC).toBe(26);
    expect(snapshot?.lowC).toBe(18);
    expect(snapshot?.symbolCode).toBe("partlycloudy_day");
    expect(snapshot?.label).toBe("Parcialmente nublado");
    expect(snapshot?.icon).toBe("cloud-sun");
    expect(snapshot?.precipitationProbability).toBe(35);
    expect(snapshot?.precipitationAmountMm).toBe(1.9);
    expect(snapshot?.updatedAt).toBe("2026-10-21T12:00:00Z");
  });

  it("returns null for payloads without a usable timeseries", () => {
    expect(parseMetNorway(null)).toBeNull();
    expect(parseMetNorway({})).toBeNull();
    expect(parseMetNorway({ properties: { timeseries: [] } })).toBeNull();
    expect(
      parseMetNorway({
        properties: { timeseries: [{ data: { instant: { details: {} } } }] },
      }),
    ).toBeNull();
  });

  it("leaves rain chance empty when the provider omits it", () => {
    const snapshot = parseMetNorway({
      properties: {
        timeseries: [
          {
            data: {
              instant: { details: { air_temperature: 20 } },
              next_6_hours: { summary: { symbol_code: "rain" } },
            },
          },
        ],
      },
    });
    expect(snapshot?.precipitationProbability).toBeNull();
    expect(snapshot?.precipitationAmountMm).toBeNull();
    expect(snapshot?.icon).toBe("cloud-rain");
  });
});
