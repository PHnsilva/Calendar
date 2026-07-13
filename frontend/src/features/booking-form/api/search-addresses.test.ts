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
    const { normalizeGeoapifySuggestions } = await import("./search-addresses");
    const payload = {
      results: [{
        place_id: "street-1",
        formatted: "Domani, Rua Joao Pessoa 72, Centro, Itabirito - MG, 35450-045, Brasil",
        address_line1: "Domani",
        address_line2: "Rua Joao Pessoa 72, Centro, Itabirito - MG, 35450-045, Brasil",
        street: "Rua Sao Jose",
        housenumber: "72",
        suburb: "Centro",
        city: "Itabirito",
        state_code: "MG",
        postcode: "35450000",
        lat: -20.25,
        lon: -43.8,
      }],
    };

    const suggestions = normalizeGeoapifySuggestions(payload);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.id).toBe("street-1");
    expect(suggestions[0]?.label).toBe("Rua Sao Jose, 72, Centro");
    expect(suggestions[0]?.label).not.toContain("Domani");
    expect(suggestions[0]?.label).not.toContain("Itabirito");
    expect(suggestions[0]?.addressLine1).toBe("Rua Sao Jose, 72");
    expect(suggestions[0]?.addressLine2).toBe("Centro");
    expect(suggestions[0]?.houseNumber).toBe("72");
    expect(suggestions[0]?.city).toBe("Itabirito");
    expect(suggestions[0]?.postcode).toBe("");
    expect(suggestions[0]?.lat).toBe(-20.25);
    expect(suggestions[0]?.lon).toBe(-43.8);
  });

  it("drops city-level postcode suggestions and strips postcode from street suggestions", async () => {
    const { normalizeGeoapifySuggestions } = await import("./search-addresses");
    const payload = {
      results: [
        {
          place_id: "city-postcode",
          formatted: "Itabirito, MG, 35450000, Brasil",
          result_type: "postcode",
          city: "Itabirito",
          state_code: "MG",
          postcode: "35450000",
          lat: -20.25,
          lon: -43.8,
        },
        {
          place_id: "street-without-postcode",
          formatted: "Rua Sao Jose, Centro, Itabirito - MG",
          street: "Rua Sao Jose",
          suburb: "Centro",
          city: "Itabirito",
          state_code: "MG",
          postcode: "35450000",
          lat: -20.26,
          lon: -43.81,
        },
      ],
    };

    const suggestions = normalizeGeoapifySuggestions(payload);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.placeId).toBe("street-without-postcode");
    expect(suggestions[0]?.postcode).toBe("");
  });

  it("uses filter=place when the selected city has place_id and keeps text as only the typed address", async () => {
    const { buildGeoapifyAddressUrl } = await import("./search-addresses");
    const url = new URL(buildGeoapifyAddressUrl("rua", itabiritoContext, "secret-key"));

    expect(url.searchParams.get("text")).toBe("rua");
    expect(url.searchParams.get("text")).not.toContain("Itabirito");
    expect(url.searchParams.get("filter")).toBe("place:city-place-id|countrycode:br");
    expect(url.searchParams.get("limit")).toBe("20");
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
    expect(url.searchParams.get("filter")).toBe("circle:-43.8014,-20.2533,30000");
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

  it("keeps Itabirito results when state is Minas Gerais and regional fields are long names", async () => {
    const { filterSuggestionsBySelectedCity, normalizeGeoapifySuggestions } = await import("./search-addresses");
    const normalized = normalizeGeoapifySuggestions({
      results: [
        {
          place_id: "itabirito-building",
          formatted: "Domani, Rua Joao Pessoa 72, Centro, Itabirito - MG",
          address_line1: "Domani",
          address_line2: "Rua Joao Pessoa 72, Centro, Itabirito - MG",
          city: "Itabirito",
          state: "Minas Gerais",
          county: "Regiao Geografica Intermediaria de Belo Horizonte",
          municipality: "Regiao Geografica Imediata de Santa Barbara - Ouro Preto",
          iso3166_2: "BR-MG",
          postcode: "35450045",
          lat: -20.25,
          lon: -43.8,
        },
      ],
    });

    const filtered = filterSuggestionsBySelectedCity(normalized, itabiritoContext);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.placeId).toBe("itabirito-building");
  });

  it("keeps valid selected-city results without primary city fields when UF matches", async () => {
    const { filterSuggestionsBySelectedCity, normalizeGeoapifySuggestions } = await import("./search-addresses");
    const normalized = normalizeGeoapifySuggestions({
      results: [
        {
          place_id: "valid-without-city",
          formatted: "Rua Sem Cidade 123, Centro, Itabirito - MG",
          address_line2: "Rua Sem Cidade 123, Centro, Itabirito - MG",
          state: "Minas Gerais",
          municipality: "Regiao Geografica Imediata de Santa Barbara - Ouro Preto",
          county: "Regiao Geografica Intermediaria de Belo Horizonte",
          iso3166_2: "BR-MG",
          lat: -20.25,
          lon: -43.8,
        },
      ],
    });

    const filtered = filterSuggestionsBySelectedCity(normalized, itabiritoContext);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.label).toBe("Rua Sem Cidade, 123, Centro");
  });

  it("builds a short street number neighborhood label from formatted building results", async () => {
    const { normalizeGeoapifySuggestions } = await import("./search-addresses");
    const suggestions = normalizeGeoapifySuggestions({
      results: [
        {
          place_id: "building-with-formatted-only",
          formatted: "Domani, Rua Joao Pessoa 72, Centro, Itabirito - MG, 35450-045, Brasil",
          address_line1: "Domani",
          city: "Itabirito",
          state_code: "MG",
          lat: -20.25,
          lon: -43.8,
        },
      ],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.label).toBe("Rua Joao Pessoa, 72, Centro");
    expect(suggestions[0]?.addressLine1).toBe("Rua Joao Pessoa, 72");
    expect(suggestions[0]?.addressLine2).toBe("Centro");
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

  it("falls back to a city circle and expanded street query when place results are sparse", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{
          place_id: "benjamin-simoes",
          formatted: "Rua Benjamin Simoes, Agostinho Rodrigues, Itabirito - MG",
          street: "Rua Benjamin Simoes",
          suburb: "Agostinho Rodrigues",
          city: "Itabirito",
          state_code: "MG",
          postcode: "35450000",
          lat: -20.24,
          lon: -43.8,
        }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })));
    vi.stubGlobal("fetch", fetchMock);

    const { searchAddresses } = await import("./search-addresses");
    const suggestions = await searchAddresses("R. Benjamin Simoes - Agostinho Rodrigues", itabiritoContext);
    const requestedUrls = fetchMock.mock.calls.map((call) => new URL(String(call[0])));

    expect(requestedUrls[0]?.searchParams.get("filter")).toBe("place:city-place-id|countrycode:br");
    expect(requestedUrls[1]?.searchParams.get("filter")).toBe("circle:-43.8014,-20.2533,30000");
    expect(requestedUrls[2]?.searchParams.get("text")).toBe("Rua Benjamin Simoes, Agostinho Rodrigues");
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.label).toBe("Rua Benjamin Simoes, Agostinho Rodrigues");
  });
});
