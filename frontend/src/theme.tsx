import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Button } from "@patternfly/react-core";
import { MoonIcon, SunIcon } from "@patternfly/react-icons";

export type Theme = "dark" | "light";
const KEY = "aic-theme";

function initialTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark"; // dark by default
  } catch {
    return "dark";
  }
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("pf-v6-theme-dark", theme === "dark");
}

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => apply(theme), [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable: theme just won't persist */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button variant="plain" aria-label={label} title={label} onClick={toggle}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
