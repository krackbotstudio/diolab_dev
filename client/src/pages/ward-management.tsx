import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  BedDouble,
  Activity,
  Heart,
} from "lucide-react";

type Ward = {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  floor: string | null;
  totalBeds: number;
  description: string | null;
  inCharge: string | null;
  contactExtension: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

const WARD_TYPES = [
  { value: "general", label: "General" },
  { value: "private", label: "Private" },
  { value: "semi_private", label: "Semi Private" },
  { value: "icu", label: "ICU" },
  { value: "nicu", label: "NICU" },
  { value: "picu", label: "PICU" },
  { value: "maternity", label: "Maternity" },
  { value: "surgical", label: "Surgical" },
  { value: "emergency", label: "Emergency" },
  { value: "isolation", label: "Isolation" },
];

const WARD_TYPE_COLORS: Record<string, string> = {
  general: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  private: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  semi_private: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  icu: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  nicu: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  picu: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  maternity: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  surgical: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  emergency: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  isolation: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

interface FormData {
  name: string;
  type: string;
  floor: string;
  totalBeds: number;
  description: string;
  inCharge: string;
  contactExtension: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  name: "",
  type: "general",
  floor: "",
  totalBeds: 0,
  description: "",
  inCharge: "",
  contactExtension: "",
  isActive: true,
};

export default function WardManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { data: wards = [], isLoading } = useQuery<Ward[]>({
    queryKey: ["/api/wards"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/wards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wards"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Ward created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create ward.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/wards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wards"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Ward updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update ward.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/wards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wards"] });
      toast({ title: "Ward deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete ward.", variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData(emptyForm);
    setEditingWard(null);
  }

  function openCreateDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(ward: Ward) {
    setEditingWard(ward);
    setFormData({
      name: ward.name,
      type: ward.type,
      floor: ward.floor || "",
      totalBeds: ward.totalBeds,
      description: ward.description || "",
      inCharge: ward.inCharge || "",
      contactExtension: ward.contactExtension || "",
      isActive: ward.isActive ?? true,
    });
    setIsDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: formData.name,
      type: formData.type,
      floor: formData.floor || null,
      totalBeds: formData.totalBeds,
      description: formData.description || null,
      inCharge: formData.inCharge || null,
      contactExtension: formData.contactExtension || null,
      isActive: formData.isActive,
    };

    if (editingWard) {
      updateMutation.mutate({ id: editingWard.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filteredWards = wards.filter((w) => {
    const q = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.type.toLowerCase().includes(q) ||
      (w.floor && w.floor.toLowerCase().includes(q)) ||
      (w.inCharge && w.inCharge.toLowerCase().includes(q))
    );
  });

  const activeWards = wards.filter((w) => w.isActive);
  const totalBedCapacity = wards.reduce((sum, w) => sum + w.totalBeds, 0);
  const icuWards = wards.filter((w) => ["icu", "nicu", "picu"].includes(w.type));

  const isFormValid = formData.name.length > 0 && formData.type.length > 0 && formData.totalBeds > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Ward Management</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-description">
              Manage hospital wards and bed capacity
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-ward">
          <Plus className="h-4 w-4 mr-2" />
          Add Ward
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wards</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-wards">{wards.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Wards</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-active-wards">{activeWards.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bed Capacity</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-beds">{totalBedCapacity}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ICU Wards</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-icu-wards">{icuWards.length}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>All Wards</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search wards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-wards"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredWards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground" data-testid="text-empty-state">
                {searchQuery ? "No wards match your search" : "No wards yet"}
              </p>
              {!searchQuery && (
                <Button variant="outline" onClick={openCreateDialog} data-testid="button-add-ward-empty">
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first ward
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-ward-list">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Total Beds</TableHead>
                    <TableHead>In-Charge</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWards.map((ward) => (
                    <TableRow key={ward.id} data-testid={`row-ward-${ward.id}`}>
                      <TableCell>
                        <p className="font-medium" data-testid={`text-ward-name-${ward.id}`}>{ward.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={WARD_TYPE_COLORS[ward.type] || ""}
                          data-testid={`badge-ward-type-${ward.id}`}
                        >
                          {WARD_TYPES.find((t) => t.value === ward.type)?.label || ward.type}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-ward-floor-${ward.id}`}>{ward.floor || "-"}</TableCell>
                      <TableCell data-testid={`text-ward-beds-${ward.id}`}>{ward.totalBeds}</TableCell>
                      <TableCell data-testid={`text-ward-incharge-${ward.id}`}>{ward.inCharge || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={ward.isActive ? "default" : "secondary"}
                          className={ward.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : ""}
                          data-testid={`badge-ward-status-${ward.id}`}
                        >
                          {ward.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(ward)}
                            data-testid={`button-edit-ward-${ward.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(ward.id)}
                            data-testid={`button-delete-ward-${ward.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg" data-testid="dialog-ward-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingWard ? "Edit Ward" : "Add New Ward"}
            </DialogTitle>
            <DialogDescription>
              {editingWard ? "Update ward details below." : "Fill in the details to create a new ward."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ward-name">Name</Label>
              <Input
                id="ward-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ward name"
                data-testid="input-ward-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ward-type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger data-testid="select-ward-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WARD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} data-testid={`option-ward-type-${t.value}`}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ward-floor">Floor</Label>
                <Input
                  id="ward-floor"
                  value={formData.floor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, floor: e.target.value }))}
                  placeholder="e.g. Ground, 1st, 2nd"
                  data-testid="input-ward-floor"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ward-beds">Total Beds</Label>
                <Input
                  id="ward-beds"
                  type="number"
                  min={0}
                  value={formData.totalBeds}
                  onChange={(e) => setFormData((prev) => ({ ...prev, totalBeds: parseInt(e.target.value) || 0 }))}
                  placeholder="Number of beds"
                  data-testid="input-ward-beds"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ward-extension">Contact Extension</Label>
                <Input
                  id="ward-extension"
                  value={formData.contactExtension}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactExtension: e.target.value }))}
                  placeholder="e.g. 101"
                  data-testid="input-ward-extension"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ward-incharge">In-Charge</Label>
              <Input
                id="ward-incharge"
                value={formData.inCharge}
                onChange={(e) => setFormData((prev) => ({ ...prev, inCharge: e.target.value }))}
                placeholder="Ward in-charge name"
                data-testid="input-ward-incharge"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ward-description">Description</Label>
              <Input
                id="ward-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                data-testid="input-ward-description"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ward-active">Active</Label>
              <Switch
                id="ward-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                data-testid="switch-ward-active"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-ward"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-ward"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingWard
                    ? "Update Ward"
                    : "Create Ward"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
