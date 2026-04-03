"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  defaultTheme,
  presetThemes,
  type Theme,
  type ThemeColors,
} from "@/lib/themes";

type ThemeCtx = {
  current: Theme;
  setTheme: (key: string) => void;
  setCustom: (colors: ThemeColors) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  current: defaultTheme,
  setTheme: () => {},
  setCustom: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function applyCSS(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--color-bg", colors.bg);
  root.style.setProperty("--color-text-main", colors.textMain);
  root.style.setProperty("--color-text-sub", colors.textSub);
  root.style.setProperty("--color-accent", colors.accent);
}

const STORAGE_KEY = "typelex_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Theme>(defaultTheme);

  // 初始化
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Theme;
        setCurrent(parsed);
        applyCSS(parsed.colors);
        return;
      } catch {}
    }
    applyCSS(defaultTheme.colors);
  }, []);

  const setTheme = useCallback((key: string) => {
    const found = presetThemes.find((t) => t.key === key);
    if (!found) return;
    setCurrent(found);
    applyCSS(found.colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
  }, []);

  const setCustom = useCallback((colors: ThemeColors) => {
    const custom: Theme = { key: "custom", name: "custom", colors };
    setCurrent(custom);
    applyCSS(colors);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  }, []);

  return (
    <ThemeContext.Provider value={{ current, setTheme, setCustom }}>
      {children}
    </ThemeContext.Provider>
  );
}
