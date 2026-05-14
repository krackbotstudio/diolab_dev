import { useState, useEffect } from "react";
import { LayoutGrid, List, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ViewMode = "table" | "grid" | "list";

interface ViewSwitcherProps {
  pageKey: string;
  defaultView?: ViewMode;
  onChange?: (mode: ViewMode) => void;
}

export function useViewMode(pageKey: string, defaultView: ViewMode = "table"): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(`diolab-view-${pageKey}`);
    return (stored as ViewMode) || defaultView;
  });

  const setMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(`diolab-view-${pageKey}`, mode);
  };

  return [viewMode, setMode];
}

export function ViewSwitcher({ pageKey, defaultView = "table", onChange }: ViewSwitcherProps) {
  const [viewMode, setViewMode] = useViewMode(pageKey, defaultView);

  useEffect(() => {
    onChange?.(viewMode);
  }, [viewMode, onChange]);

  const modes: { mode: ViewMode; icon: typeof Table2; label: string }[] = [
    { mode: "table", icon: Table2, label: "Table" },
    { mode: "grid", icon: LayoutGrid, label: "Grid" },
    { mode: "list", icon: List, label: "List" },
  ];

  return (
    <div className="flex items-center rounded-lg border bg-muted/50 p-0.5" data-testid="view-switcher">
      {modes.map(({ mode, icon: Icon, label }) => (
        <Button
          key={mode}
          variant={viewMode === mode ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setViewMode(mode);
            onChange?.(mode);
          }}
          className={viewMode === mode ? "" : "text-muted-foreground"}
          data-testid={`button-view-${mode}`}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">{label}</span>
        </Button>
      ))}
    </div>
  );
}

interface InlineEditCellProps {
  value: string;
  onSave: (value: string) => void;
  type?: "text" | "number" | "tel" | "email";
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function InlineEditCell({ value, onSave, type = "text", placeholder, className = "", editable = true }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  if (!editable) {
    return <span className={className}>{value || placeholder || "—"}</span>;
  }

  if (!editing) {
    return (
      <span
        className={`cursor-pointer hover:bg-muted/80 rounded px-1 py-0.5 -mx-1 transition-colors ${className}`}
        onClick={() => {
          setEditValue(value);
          setEditing(true);
        }}
        title="Click to edit"
        data-testid="inline-edit-cell"
      >
        {value || <span className="text-muted-foreground italic">{placeholder || "Click to edit"}</span>}
      </span>
    );
  }

  return (
    <input
      type={type}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={() => {
        if (editValue !== value) {
          onSave(editValue);
        }
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (editValue !== value) {
            onSave(editValue);
          }
          setEditing(false);
        }
        if (e.key === "Escape") {
          setEditValue(value);
          setEditing(false);
        }
      }}
      autoFocus
      className="bg-background border rounded px-1.5 py-0.5 text-sm w-full min-w-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
      placeholder={placeholder}
      data-testid="inline-edit-input"
    />
  );
}
