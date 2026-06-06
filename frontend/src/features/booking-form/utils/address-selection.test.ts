import { describe, expect, it } from "vitest";
import {
  buildSuggestionInputValue,
  buildSuggestionStreetLine,
  getSuggestionHouseNumber,
  hasSuggestionHouseNumber,
  shouldShowManualHouseNumber,
} from "./address-selection";
import type { GeoapifyAddressSuggestion } from "../../../types/api";

function suggestion(overrides: Partial<GeoapifyAddressSuggestion>): GeoapifyAddressSuggestion {
  return {
    id: "address-1",
    label: "Rua Joao Pessoa 72, Itabirito - MG",
    placeId: "address-1",
    formatted: "Rua Joao Pessoa 72, Itabirito - MG",
    latitude: -20.25,
    longitude: -43.8,
    lat: -20.25,
    lon: -43.8,
    addressLine1: "Rua Joao Pessoa, 72",
    addressLine2: "Centro - Itabirito - MG",
    street: "Rua Joao Pessoa",
    houseNumber: "",
    neighborhood: "Centro",
    city: "Itabirito",
    state: "MG",
    postcode: "35450045",
    ...overrides,
  };
}

describe("address selection helpers", () => {
  it("extracts the Geoapify housenumber when it exists", () => {
    const item = suggestion({ houseNumber: "72", raw: { housenumber: "72" } });

    expect(getSuggestionHouseNumber(item)).toBe("72");
    expect(hasSuggestionHouseNumber(item)).toBe(true);
    expect(shouldShowManualHouseNumber(item)).toBe(false);
  });

  it("requires a compact manual number when the selected suggestion has no housenumber", () => {
    const item = suggestion({ houseNumber: "", raw: { address_line2: "Centro, Itabirito - MG" } });

    expect(getSuggestionHouseNumber(item)).toBe("");
    expect(shouldShowManualHouseNumber(item)).toBe(true);
  });

  it("builds a clean address label and street line from Geoapify fields", () => {
    const item = suggestion({
      formatted: "Domani, Rua Joao Pessoa 72, Centro, Itabirito - MG",
      addressLine1: "Domani",
      addressLine2: "Rua Joao Pessoa 72, Centro, Itabirito - MG",
      street: "Rua Joao Pessoa",
      houseNumber: "72",
    });

    expect(buildSuggestionInputValue(item)).toContain("Domani");
    expect(buildSuggestionStreetLine(item)).toBe("Rua Joao Pessoa");
  });
});
