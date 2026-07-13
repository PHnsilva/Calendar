// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { AddressSuggestion } from "../hooks/useAddressSuggestions";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_GEOAPIFY_PUBLIC_KEY", "public-test-key");
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
});

describe("AddressAutocompleteField", () => {
  it("does not resolve city context until the user actually starts typing an address", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { default: AddressAutocompleteField } = await import("./AddressAutocompleteField");

    function Harness() {
      const [value, setValue] = useState("");
      return (
        <AddressAutocompleteField
          value={value}
          selectedCity="Itabirito"
          selectedState="MG"
          onChange={setValue}
          onSelectSuggestion={() => {}}
        />
      );
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );

    expect(fetchMock).not.toHaveBeenCalled();

    const input = screen.getByRole("textbox");
    await userEvent.click(input);
    await userEvent.type(input, "ru");

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("renders valid suggestions from the selected city and selects one", async () => {
    const selected: AddressSuggestion[] = [];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [{
          place_id: "city-place-id",
          city: "Itabirito",
          state_code: "MG",
          lat: -20.2533,
          lon: -43.8014,
        }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [
          {
            place_id: "valid-address",
            formatted: "Rua Sao Jose, Itabirito - MG",
            street: "Rua Sao Jose",
            suburb: "Centro",
            city: "Itabirito",
            state_code: "MG",
            postcode: "35450000",
            lat: -20.25,
            lon: -43.8,
          },
          {
            place_id: "outside-address",
            formatted: "Rua Itabirito, Manaus - AM",
            street: "Rua Itabirito",
            city: "Manaus",
            state_code: "AM",
            lat: -3.1,
            lon: -60,
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        results: [
          {
            place_id: "benjamin-address",
            formatted: "Rua Benjamin Simoes, Agostinho Rodrigues, Itabirito - MG",
            street: "Rua Benjamin Simoes",
            suburb: "Agostinho Rodrigues",
            city: "Itabirito",
            state_code: "MG",
            postcode: "35450000",
            lat: -20.24,
            lon: -43.8,
          },
        ],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const { default: AddressAutocompleteField } = await import("./AddressAutocompleteField");

    function Harness() {
      const [value, setValue] = useState("");
      return (
        <AddressAutocompleteField
          value={value}
          selectedCity="Itabirito"
          selectedState="MG"
          onChange={setValue}
          onSelectSuggestion={(suggestion) => {
            selected.push(suggestion);
            setValue(suggestion.formatted);
          }}
        />
      );
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;

    await userEvent.click(input);
    await userEvent.type(input, "rua");

    const listbox = await screen.findByRole("listbox");
    const option = await screen.findByRole("button", { name: /Rua Sao Jose/i });
    expect(listbox).toBeTruthy();
    expect(listbox.parentElement).toBe(document.body);
    expect(screen.queryByText(/Manaus/i)).toBeNull();
    expect(screen.queryByText(/CEP/i)).toBeNull();
    expect(screen.queryByText(/35450000/i)).toBeNull();

    fireEvent.blur(input);
    fireEvent.mouseDown(option);

    await waitFor(() => {
      expect(input.value).toBe("Rua Sao Jose, Centro");
    });
    expect(selected).toHaveLength(1);
    expect(selected[0]?.city).toBe("Itabirito");

    await userEvent.clear(input);
    await userEvent.type(input, "beni");

    const nextOption = await screen.findByRole("button", { name: /Rua Benjamin Simoes/i });
    expect(nextOption).toBeTruthy();
  });
});
