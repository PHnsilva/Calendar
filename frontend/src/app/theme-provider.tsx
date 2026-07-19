import {
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  applyTheme,
} from "../lib/theme";
import { ThemeContext, type ThemeContextValue } from './theme-context';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    applyTheme();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: DEFAULT_THEME,
      setTheme: () => applyTheme(),
      toggleTheme: () => applyTheme(),
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
