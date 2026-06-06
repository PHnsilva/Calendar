import { useEffect, useMemo, useState } from "react";
import { useAddressSuggestions, type AddressSuggestion } from "../hooks/useAddressSuggestions";

type AddressAutocompleteFieldProps = {
  value: string;
  selectedCity: string;
  selectedState?: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
};

export default function AddressAutocompleteField({
  value,
  selectedCity,
  selectedState = "MG",
  onChange,
  onSelectSuggestion,
}: AddressAutocompleteFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const debugEnabled = Boolean(import.meta.env.DEV && import.meta.env.MODE !== "test");
  const { suggestions, isLoading, error, debug } = useAddressSuggestions(value, selectedCity, selectedState, Boolean(selectedCity), isFocused);

  const shouldShowPanel = useMemo(() => {
    if (value.trim().length < 3) return false;
    return isFocused || isLoading || suggestions.length > 0 || Boolean(error);
  }, [error, isFocused, isLoading, suggestions.length, value]);

  useEffect(() => {
    if (!debugEnabled) return;
    console.debug("[CalendarMate] Address autocomplete render", {
      inputValue: value,
      selectedCityObject: {
        name: selectedCity,
        state: selectedState,
      },
      selectedCityName: selectedCity,
      selectedCityState: selectedState,
      finalSuggestionsCount: suggestions.length,
      dropdownRenderCondition: shouldShowPanel,
      inputFocused: isFocused,
      loadingBlocksDropdown: isLoading,
      errorBlocksDropdown: Boolean(error),
      rawResultsCount: debug?.rawResultsCount ?? null,
      rawFeaturesCount: debug?.rawFeaturesCount ?? null,
      normalizedSuggestionCount: debug?.normalizedSuggestionCount ?? null,
      filteredSuggestionCount: debug?.filteredSuggestionCount ?? null,
    });
  }, [debug, debugEnabled, error, isFocused, isLoading, selectedCity, selectedState, shouldShowPanel, suggestions.length, value]);

  return (
    <div className="booking-address-autocomplete">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          window.setTimeout(() => setIsFocused(false), 180);
        }}
        className="booking-form__input"
        placeholder={`Digite rua, avenida ou praca; cidade selecionada: ${selectedCity}/${selectedState}`}
        autoComplete="street-address"
        aria-invalid={Boolean(error)}
      />

      {shouldShowPanel ? (
        <div className="booking-address-autocomplete__panel" role="listbox">
          {isLoading ? <div className="booking-address-autocomplete__status">Buscando enderecos...</div> : null}
          {!isLoading && error ? <div className="booking-address-autocomplete__status booking-address-autocomplete__status--error">{error}</div> : null}
          {!isLoading && !error && suggestions.length === 0 ? (
            <div className="booking-address-autocomplete__status">Nenhum endereco encontrado nessa cidade.</div>
          ) : null}
          {!isLoading && !error
            ? suggestions.map((suggestion) => (
                <button
                  key={suggestion.id || suggestion.placeId}
                  type="button"
                  className="booking-address-autocomplete__option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelectSuggestion(suggestion);
                    setIsFocused(false);
                  }}
                >
                  <strong>{suggestion.addressLine1 || suggestion.label || suggestion.formatted}</strong>
                  <span>{suggestion.addressLine2 || suggestion.label || suggestion.formatted}</span>
                </button>
              ))
            : null}
        </div>
      ) : null}
      {debugEnabled ? (
        <small className="booking-address-autocomplete__debug">
          Geoapify debug: raw={debug?.rawResultsCount ?? 0}, normalized={debug?.normalizedSuggestionCount ?? 0}, filtered={debug?.filteredSuggestionCount ?? 0}, state={suggestions.length}, open={shouldShowPanel ? "true" : "false"}
        </small>
      ) : null}
    </div>
  );
}
