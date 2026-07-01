import { createContext, useContext, useState, type ReactNode } from "react";

export interface CopilotScope {
  documentId?: string;
  obligationId?: string;
  label?: string; // human-readable description of the current context
}

interface CopilotState {
  open: boolean;
  setOpen: (b: boolean) => void;
  toggle: () => void;
  scope: CopilotScope;
  setScope: (s: CopilotScope) => void;
  /** A prompt requested from elsewhere (e.g. "Explain this obligation" button). */
  pending: string | null;
  ask: (prompt: string) => void;
  clearPending: () => void;
}

const Ctx = createContext<CopilotState | null>(null);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<CopilotScope>({});
  const [pending, setPending] = useState<string | null>(null);

  return (
    <Ctx.Provider
      value={{
        open,
        setOpen,
        toggle: () => setOpen((o) => !o),
        scope,
        setScope,
        pending,
        ask: (prompt) => {
          setPending(prompt);
          setOpen(true);
        },
        clearPending: () => setPending(null),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCopilot() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCopilot must be used within CopilotProvider");
  return c;
}
