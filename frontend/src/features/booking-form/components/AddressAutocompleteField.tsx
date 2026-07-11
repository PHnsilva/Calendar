import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useAddressSuggestions, type AddressSuggestion } from "../hooks/useAddressSuggestions";
import { buildSuggestionStreetLine } from "../utils/address-selection";

function buildSuggestionMeta(suggestion: AddressSuggestion): string {
  const neighborhood = (suggestion.neighborhood || suggestion.addressLine2 || "").trim();
  return neighborhood;
}

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
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const debugEnabled = false;
  const { suggestions, isLoading, error, debug } = useAddressSuggestions(value, selectedCity, selectedState, Boolean(selectedCity), isFocused);

  const keepSearchOpen = () => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setIsFocused(true);
  };

  useEffect(() => () => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
    }
  }, []);

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

  useLayoutEffect(() => {
    if (!shouldShowPanel) return;

    const updatePanelPosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 12;
      const availableWidth = Math.max(window.innerWidth - viewportPadding * 2, 0);
      const width = Math.min(Math.max(rect.width, 260), availableWidth);
      const left = Math.min(Math.max(rect.left, viewportPadding), Math.max(window.innerWidth - width - viewportPadding, viewportPadding));

      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        left,
        width,
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [shouldShowPanel, suggestions.length, isLoading, error, value]);

  const panel = (
    <div className="booking-address-autocomplete__panel booking-address-autocomplete__panel--portal" role="listbox" style={panelStyle}>
      {isLoading ? <div className="booking-address-autocomplete__status">Buscando enderecos...</div> : null}
      {!isLoading && error ? <div className="booking-address-autocomplete__status booking-address-autocomplete__status--error">{error}</div> : null}
      {!isLoading && !error && suggestions.length === 0 ? (
        <div className="booking-address-autocomplete__status">Nenhum endereco parecido encontrado. Digite rua, bairro e numero manualmente.</div>
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
              <strong>{buildSuggestionStreetLine(suggestion) || suggestion.label || suggestion.formatted || suggestion.addressLine1}</strong>
              {buildSuggestionMeta(suggestion) ? <span>{buildSuggestionMeta(suggestion)}</span> : null}
            </button>
          ))
        : null}
    </div>
  );

  return (
    <div className="booking-address-autocomplete" ref={containerRef}>
      <input
        value={value}
        onChange={(event) => {
          keepSearchOpen();
          onChange(event.target.value);
        }}
        onMouseDown={keepSearchOpen}
        onClick={keepSearchOpen}
        onFocus={keepSearchOpen}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => {
            setIsFocused(false);
            blurTimeoutRef.current = null;
          }, 180);
        }}
        className="booking-form__input"
        placeholder="Digite rua, bairro e numero"
        autoComplete="street-address"
        aria-invalid={Boolean(error)}
      />

      {shouldShowPanel ? createPortal(panel, document.body) : null}
    </div>
  );
}
