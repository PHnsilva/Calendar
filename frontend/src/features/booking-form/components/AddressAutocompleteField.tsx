import { useMemo, useState } from "react";
import { useAddressSuggestions, type AddressSuggestion } from "../hooks/useAddressSuggestions";

type AddressAutocompleteFieldProps = {
  value: string;
  selectedCity: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
};

export default function AddressAutocompleteField({
  value,
  selectedCity,
  onChange,
  onSelectSuggestion,
}: AddressAutocompleteFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { suggestions, isLoading, error, isEnabled } = useAddressSuggestions(value, selectedCity, isFocused);

  const shouldShowPanel = useMemo(() => {
    if (!isEnabled) return false;
    if (value.trim().length < 3) return false;
    return isFocused || isLoading || suggestions.length > 0 || Boolean(error);
  }, [error, isEnabled, isFocused, isLoading, suggestions.length, value]);

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
        placeholder={`Digite o endereço em ${selectedCity}`}
        autoComplete="street-address"
        aria-invalid={Boolean(error)}
      />

      {shouldShowPanel ? (
        <div className="booking-address-autocomplete__panel" role="listbox">
          {isLoading ? <div className="booking-address-autocomplete__status">Buscando endereços...</div> : null}
          {!isLoading && error ? <div className="booking-address-autocomplete__status booking-address-autocomplete__status--error">{error}</div> : null}
          {!isLoading && !error && suggestions.length === 0 ? (
            <div className="booking-address-autocomplete__status">Nenhum endereço encontrado nessa região.</div>
          ) : null}
          {!isLoading && !error
            ? suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  className="booking-address-autocomplete__option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelectSuggestion(suggestion);
                    setIsFocused(false);
                  }}
                >
                  <strong>{suggestion.addressLine1 || suggestion.formatted}</strong>
                  <span>{suggestion.addressLine2 || suggestion.formatted}</span>
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
