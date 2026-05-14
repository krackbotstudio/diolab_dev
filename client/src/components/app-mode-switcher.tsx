import { useAppMode, AppMode } from "@/contexts/app-mode-context";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TestTube2, Stethoscope, ChevronDown, Check, Pill } from "lucide-react";

const modes: { value: AppMode; moduleId: string; label: string; icon: typeof TestTube2; description: string }[] = [
  {
    value: "diagnostics",
    moduleId: "dialab",
    label: "Dialab",
    icon: TestTube2,
    description: "Lab tests, billing & reports",
  },
  {
    value: "hospitals",
    moduleId: "doclab",
    label: "Doclab",
    icon: Stethoscope,
    description: "OP consultations & queue",
  },
  {
    value: "medlab",
    moduleId: "medlab",
    label: "Medlab",
    icon: Pill,
    description: "Pharmacy, medicines & sales",
  },
];

export function AppModeSwitcher() {
  const { mode, setMode, subscribedModules } = useAppMode();
  const [, setLocation] = useLocation();

  const availableModes = modes.filter((m) => subscribedModules.includes(m.moduleId));
  const currentMode = availableModes.find((m) => m.value === mode) || availableModes[0] || modes[0];
  const Icon = currentMode.icon;

  if (availableModes.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium" data-testid="text-current-module">
        <Icon className="h-4 w-4 text-primary" />
        <span>{currentMode.label}</span>
      </div>
    );
  }

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    setLocation("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 min-w-[140px] justify-between"
          data-testid="button-mode-switcher"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <span>{currentMode.label}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {availableModes.map((m) => {
          const ModeIcon = m.icon;
          const isActive = mode === m.value;
          return (
            <DropdownMenuItem
              key={m.value}
              onClick={() => handleModeChange(m.value)}
              className="flex items-start gap-3 py-3 cursor-pointer"
              data-testid={`menu-item-mode-${m.value}`}
            >
              <ModeIcon className={`h-5 w-5 mt-0.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isActive ? "text-primary" : ""}`}>
                    {m.label}
                  </span>
                  {isActive && <Check className="h-4 w-4 text-primary" />}
                </div>
                <span className="text-xs text-muted-foreground">{m.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
