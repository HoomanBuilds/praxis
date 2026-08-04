import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type UIMode = "business" | "engineering";

interface UIModeState {
  mode: UIMode;
  isBusiness: boolean;
  setMode: (mode: UIMode) => void;
  toggleAdvanced: (enabled: boolean) => void;
}

const STORAGE_KEY = "praxis_ui_mode";
const Ctx = createContext<UIModeState | null>(null);

function loadInitialMode(): UIMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "engineering" ? "engineering" : "business";
  } catch {
    return "business";
  }
}

export function UIModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UIMode>(loadInitialMode);

  const setMode = (next: UIMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // no-op
    }
  };

  const value = useMemo<UIModeState>(
    () => ({
      mode,
      isBusiness: mode === "business",
      setMode,
      toggleAdvanced: (enabled: boolean) => setMode(enabled ? "engineering" : "business"),
    }),
    [mode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUIMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUIMode must be used within UIModeProvider");
  return ctx;
}
