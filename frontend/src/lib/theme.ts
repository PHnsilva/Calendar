export type ThemeMode = "light";

export const THEME_STORAGE_KEY = "calendar.theme";
export const DEFAULT_THEME: ThemeMode = "light";

export function resolveInitialTheme(): ThemeMode {
  return DEFAULT_THEME;
}

export function applyTheme(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = DEFAULT_THEME;
  document.documentElement.style.colorScheme = DEFAULT_THEME;

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  }
}
