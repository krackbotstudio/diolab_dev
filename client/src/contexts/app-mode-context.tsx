import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppMode = "diagnostics" | "hospitals" | "medlab";

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  subscribedModules: string[];
  isModuleSubscribed: (moduleId: string) => boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const MODULE_TO_MODE: Record<string, AppMode> = {
  dialab: "diagnostics",
  doclab: "hospitals",
  medlab: "medlab",
};

export function AppModeProvider({ children, subscribedModules = ["dialab"] }: { children: ReactNode; subscribedModules?: string[] }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    const stored = localStorage.getItem("diolab-app-mode");
    if (stored && subscribedModules.some(m => MODULE_TO_MODE[m] === stored)) {
      return stored as AppMode;
    }
    const firstModule = subscribedModules[0] || "dialab";
    return MODULE_TO_MODE[firstModule] || "diagnostics";
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem("diolab-app-mode", newMode);
  };

  useEffect(() => {
    const currentModuleId = Object.entries(MODULE_TO_MODE).find(([, m]) => m === mode)?.[0];
    if (currentModuleId && !subscribedModules.includes(currentModuleId)) {
      const firstModule = subscribedModules[0] || "dialab";
      setMode(MODULE_TO_MODE[firstModule] || "diagnostics");
    }
  }, [subscribedModules]);

  useEffect(() => {
    localStorage.setItem("diolab-app-mode", mode);
  }, [mode]);

  const isModuleSubscribed = (moduleId: string) => subscribedModules.includes(moduleId);

  return (
    <AppModeContext.Provider value={{ mode, setMode, subscribedModules, isModuleSubscribed }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
}
