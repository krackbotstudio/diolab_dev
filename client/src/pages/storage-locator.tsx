import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StorageLocation } from "@shared/schema";
import { Plus, LayoutGrid, Box, ArrowLeft, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Represents a section (shelf/drawer)
type LocationSection = {
  id: string;
  name: string;
  type: "shelf" | "drawer" | "box";
};

export default function StorageLocator() {
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Fetch Storage Locations
  const { data: locations, isLoading } = useQuery<StorageLocation[]>({
    queryKey: ["/api/medlab/storage-locations"],
  });

  // Main View: List of physical units (Cabinets, Racks, etc.)
  if (selectedLocation) {
    return (
      <StorageLocationLayout
        location={selectedLocation}
        onBack={() => setSelectedLocation(null)}
        onLocationUpdate={(updated) => setSelectedLocation(updated)}
      />
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Storage Locator</h2>
          <p className="text-muted-foreground">
            Manage your physical storage layout (Cabinets, Racks, Fridges).
          </p>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Storage Unit
            </Button>
          </DialogTrigger>
          <AddStorageLocationDialog onClose={() => setAddDialogOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50 rounded-t-xl" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {locations?.map((location) => {
            const sections = (location.sections as LocationSection[]) || [];

            return (
              <Card
                key={location.id}
                className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
                onClick={() => setSelectedLocation(location)}
              >
                <div className="h-2 bg-primary/20" />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2">
                      <Box className="h-5 w-5 text-muted-foreground" />
                      {location.name}
                    </CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {location.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Contains {sections.length} sections
                  </div>

                  {/* Miniature Visual Preview */}
                  <div className="mt-4 flex flex-col gap-1 border rounded-md p-1 bg-muted/20">
                    {sections.slice(0, 3).map((sec, idx) => (
                      <div key={idx} className="h-4 bg-background border border-border/50 rounded-sm text-[8px] flex items-center px-1 text-muted-foreground overflow-hidden">
                        {sec.name}
                      </div>
                    ))}
                    {sections.length > 3 && (
                      <div className="h-4 bg-transparent border border-dashed border-border/50 rounded-sm text-[8px] flex items-center justify-center text-muted-foreground">
                        +{sections.length - 3} more
                      </div>
                    )}
                    {sections.length === 0 && (
                      <div className="h-10 border border-dashed rounded-sm flex items-center justify-center text-xs text-muted-foreground">
                        Empty
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {locations?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
              <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No storage units defined</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">
                Create your first cabinet or rack to visually organize your medicines.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Dialog to add a new top-level Location
function AddStorageLocationDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState("cabinet");

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      const res = await fetch("/api/medlab/storage-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, sections: [] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create location");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/storage-locations"] });
      toast({ title: "Storage Unit Created", description: `Successfully created ${name}` });
      setName("");
      setType("cabinet");
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Could not create unit", variant: "destructive" });
    }
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Storage Unit</DialogTitle>
        <DialogDescription>
          Define a physical storage space like a Cabinet, Rack, or Refrigerator.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label>Name / Label</Label>
          <Input
            placeholder="e.g. Cabinet A, Cold Storage 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cabinet">Cabinet</SelectItem>
              <SelectItem value="rack">Shelf/Rack</SelectItem>
              <SelectItem value="refrigeration">Refrigerator/Cold Storage</SelectItem>
              <SelectItem value="drawer_unit">Drawer Unit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={!name.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate({ name, type })}
        >
          {createMutation.isPending ? "Creating..." : "Create Unit"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Component to view a specific Location's Layout visually
function StorageLocationLayout({
  location,
  onBack,
  onLocationUpdate,
}: {
  location: StorageLocation;
  onBack: () => void;
  onLocationUpdate: (location: StorageLocation) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Use local state for sections so UI updates immediately after PATCH
  const [currentLocation, setCurrentLocation] = useState<StorageLocation>(location);
  const sections = (currentLocation.sections as LocationSection[]) || [];

  const updateMutation = useMutation({
    mutationFn: async (newSections: LocationSection[]) => {
      const res = await fetch(`/api/medlab/storage-locations/${currentLocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sections: newSections }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Update failed");
      }
      return res.json() as Promise<StorageLocation>;
    },
    onSuccess: (updated: StorageLocation) => {
      setCurrentLocation(updated);
      onLocationUpdate(updated);
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/storage-locations"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Could not update layout", variant: "destructive" });
    }
  });

  const addSection = () => {
    const newSection: LocationSection = {
      id: `sec-${Date.now()}`,
      name: `Shelf ${sections.length + 1}`,
      type: "shelf"
    };
    updateMutation.mutate([...sections, newSection]);
  };

  const removeSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Remove this section? Any items assigned to it will lose their specific location.")) {
      updateMutation.mutate(sections.filter(s => s.id !== id));
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {currentLocation.name}
            <Badge variant="outline" className="capitalize font-normal text-sm">
              {currentLocation.type.replace('_', ' ')}
            </Badge>
          </h2>
          <p className="text-muted-foreground">
            Visual map of sections within this unit.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

        {/* Left Col: Visual Layout Builder */}
        <div className="md:col-span-2">
          <Card className="border-2 border-muted bg-muted/10 h-full min-h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Physical Layout</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={addSection}
                disabled={updateMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Add Compartment"}
              </Button>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-xl border-muted-foreground/20">
                  <span className="text-muted-foreground">Add shelves or drawers to start building the layout.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-4 bg-background border rounded-lg shadow-inner min-h-[400px]">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="group relative flex items-center justify-center p-6 border-2 border-muted hover:border-primary/50 bg-card rounded-md cursor-pointer transition-all hover:shadow-md h-24"
                    >
                      <span className="font-medium text-lg text-muted-foreground group-hover:text-primary transition-colors">
                        {section.name}
                      </span>

                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => removeSection(section.id, e)}
                          disabled={updateMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Info / Contents Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contents</CardTitle>
              <CardDescription>Items stored in this unit.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground p-4 bg-muted/20 border rounded-md text-center">
                Select a compartment to view or allocate items.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
