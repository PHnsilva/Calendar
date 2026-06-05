import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeoapifyCityContext } from "../../../types/api";

function present<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}

const itabiritoContext: GeoapifyCityContext = {
  name: "Itabirito",
  state: "MG",
  placeId: "city-place-id",
  latitude: -20.2533,
  longitude: -43.8014,
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_GEOAPIFY_PUBLIC_KEY", "public-test-key");
  vi.unstubAllGlobals();
});

describe("Geoapify address autocomplete", () => {
  it("parses format=json data.results into normalized suggestions", async () => {
    const { extractGeoapifyResults, toSuggestion } = await import("./search-addresses");
    const payload = {
      results: [{
        place_id: "street-1",
        formatted: "Rua Sao Jose, Itabirito - MG, Brasil",
        street: "Rua Sao Jose",
        suburb: "Centro",
        city: "Itabirito",
        state_code: "MG",
        postcode: "35450000",
        lat: -20.25,
        lon: -43.8,
      }],
    };

    const suggestions = extractGeoapifyResults(payload)
      .map(toSuggestion)
      .filter(present);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.id).toBe("street-1");
    expect(suggestions[0]?.label).toContain("Rua Sao Jose");
    expect(suggestions[0]?.city).toBe("Itabirito");
    expect(suggestions[0]?.lat).toBe(-20.25);
    expect(suggestions[0]?.lon).toBe(-43.8);
  });

  it("uses filter=place when the selected city has place_id and keeps text as only the typed address", async () => {
    const { buildGeoapifyAddressUrl } = await import("./search-addresses");
    const url = new URL(buildGeoapifyAddressUrl("rua", itabiritoContext, "secret-key"));

    expect(url.searchParams.get("text")).toBe("rua");
    expect(url.searchParams.get("text")).not.toContain("Itabirito");
    expect(url.searchParams.get("filter")).toBe("place:city-place-id|countrycode:br");
  });

  it("uses a circle filter when the selected city has coordinates but no place_id", async () => {
    const { buildGeoapifyAddressUrl } = await import("./search-addresses");
    const url = new URL(buildGeoapifyAddressUrl("avenida", {
      name: "Itabirito",
      state: "MG",
      latitude: -20.2533,
      longitude: -43.8014,
    }, "secret-key"));

    expect(url.searchParams.get("text")).toBe("avenida");
    expect(url.searchParams.get("filter")).toBe("circle:-43.8014,-20.2533,15000");
  });

  it("filters suggestions outside the selected city after Geoapify returns results", async () => {
    const { extractGeoapifyResults, filterSuggestionsBySelectedCity, toSuggestion } = await import("./search-addresses");
    const normalized = extractGeoapifyResults({
      results: [
        {
          place_id: "valid",
          formatted: "Rua Sao Jose, Itabirito - MG",
          street: "Rua Sao Jose",
          city: "Itabirito",
          state_code: "MG",
          lat: -20.25,
          lon: -43.8,
        },
        {
          place_id: "outside",
          formatted: "Rua Itabirito, Manaus - AM",
          street: "Rua Itabirito",
          city: "Manaus",
          state_code: "AM",
          lat: -3.1,
          lon: -60,
        },
      ],
    }).map(toSuggestion).filter(present);

    const filtered = filterSuggestionsBySelectedCity(normalized, itabiritoContext);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.placeId).toBe("valid");
  });

  it("searches with a city place filter and parses data.results from mocked fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [{
        place_id: "result-1",
        formatted: "Rua Sao Jose, Itabirito - MG",
        street: "Rua Sao Jose",
        city: "Itabirito",
        state_code: "MG",
        postcode: "35450000",
        lat: -20.25,
        lon: -43.8,
      }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { searchAddresses } = await import("./search-addresses");
    const suggestions = await searchAddresses("rua", itabiritoContext);
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(requestedUrl.searchParams.get("text")).toBe("rua");
    expect(requestedUrl.searchParams.get("filter")).toBe("place:city-place-id|countrycode:br");
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.city).toBe("Itabirito");
  });
});
