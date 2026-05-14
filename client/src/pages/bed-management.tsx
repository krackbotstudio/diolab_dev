import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  BedDouble,
  CheckCircle2,
  XCircle,
  Wrench,
  Clock,
  Sparkles,
  User,
} from "lucide-react";

type Bed = {
  id: string;
  organizationId: string;
  wardId: string;
  bedNumber: string;
  type: string | null;
  status: string;
  currentPatientId: string | null;
  currentAdmissionId: string | null;
  dailyRate: string | null;
  features: string | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
};

type Ward = {
  id: string;
  name: string;
  type: string;
};

const BED_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "electric", label: "Electric" },
  { value: "icu", label: "ICU" },
  { value: "ventilator", label: "Ventilator" },
  { value: "cradle", label: "Cradle" },
  { value: "bariatric", label: "Bariatric" },
];

const BED_STATUSES = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "maintenance", label: "Maintenance" },
  { value: "reserved", label: "Reserved" },
  { value: "housekeeping", label: "Housekeeping" },
];

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
  occupied: "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700",
  maintenance: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
  reserved: "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
  housekeeping: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  available: "text-green-800 dark:text-green-300",
  occupied: "text-red-800 dark:text-red-300",
  maintenance: "text-yellow-800 dark:text-yellow-300",
  reserved: "text-blue-800 dark:text-blue-300",
  housekeeping: "text-orange-800 dark:text-orange-300",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  available: "bg-green-200 text-green-800 dark:bg-green-800/40 dark:text-green-300",
  occupied: "bg-red-200 text-red-800 dark:bg-red-800/40 dark:text-red-300",
  maintenance: "bg-yellow-200 text-yellow-800 dark:bg-yellow-800/40 dark:text-yellow-300",
  reserved: "bg-blue-200 text-blue-800 dark:bg-blue-800/40 dark:text-blue-300",
  housekeeping: "bg-orange-200 text-orange-800 dark:bg-orange-800/40 dark:text-orange-300",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  available: CheckCircle2,
  occupied: XCircle,
  maintenance: Wrench,
  reserved: Clock,
  housekeeping: Sparkles,
};

interface FormData {
  bedNumber: string;
  wardId: string;
  type: string;
  status: string;
  dailyRate: string;
  features: string;
  notes: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  bedNumber: "",
  wardId: "",
  type: "standard",
  status: "available",
  dailyRate: "",
  features: "",
  notes: "",
  isActive: true,
};

export default function BedManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [selectedWard, setSelectedWard] = useState("all");
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { data: beds = [], isLoading: bedsLoading } = useQuery<Bed[]>({
    queryKey: ["/api/beds"],
  });

  const { data: wards = [], isLoading: wardsLoading } = useQuery<Ward[]>({
    queryKey: ["/api/wards"],
  });

  const isLoading = bedsLoading || wardsLoading;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/beds", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Bed created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create bed.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/beds/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Bed updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update bed.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/beds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      toast({ title: "Bed deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete bed.", variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData(emptyForm);
    setEditingBed(null);
  }

  function openCreateDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(bed: Bed) {
    setEditingBed(bed);
    setFormData({
      bedNumber: bed.bedNumber,
      wardId: bed.wardId,
      type: bed.type || "standard",
      status: bed.status,
      dailyRate: bed.dailyRate || "",
      features: bed.features || "",
      notes: bed.notes || "",
      isActive: bed.isActive ?? true,
    });
    setIsDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      bedNumber: formData.bedNumber,
      wardId: formData.wardId,
      type: formData.type,
      status: formData.status,
      dailyRate: formData.dailyRate || null,
      features: formData.features || null,
      notes: formData.notes || null,
      isActive: formData.isActive,
    };

    if (editingBed) {
      updateMutation.mutate({ id: editingBed.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const wardMap = new Map(wards.map((w) => [w.id, w]));

  const totalBeds = beds.length;
  const availableBeds = beds.filter((b) => b.status === "available").length;
  const occupiedBeds = beds.filter((b) => b.status === "occupied").length;
  const maintenanceBeds = beds.filter((b) => b.status === "maintenance").length;

  const filteredBeds = selectedWard === "all" ? beds : beds.filter((b) => b.wardId === selectedWard);

  const bedsByWard = new Map<string, Bed[]>();
  filteredBeds.forEach((bed) => {
    const existing = bedsByWard.get(bed.wardId) || [];
    existing.push(bed);
    bedsByWard.set(bed.wardId, existing);
  });

  const isFormValid = formData.bedNumber.length > 0 && formData.wardId.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BedDouble className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Bed Management</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-description">
              Manage hospital beds across wards
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-bed">
          <Plus className="h-4 w-4 mr-2" />
          Add Bed
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-beds">{totalBeds}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-available-beds">{availableBeds}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-occupied-beds">{occupiedBeds}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-maintenance-beds">{maintenanceBeds}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedWard} onValueChange={setSelectedWard} data-testid="tabs-ward-filter">
        <TabsList className="flex-wrap" data-testid="tabslist-ward-filter">
          <TabsTrigger value="all" data-testid="tab-ward-all">All Wards</TabsTrigger>
          {wards.map((ward) => (
            <TabsTrigger key={ward.id} value={ward.id} data-testid={`tab-ward-${ward.id}`}>
              {ward.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedWard} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredBeds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <BedDouble className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground" data-testid="text-empty-state">
                {selectedWard === "all" ? "No beds found. Add your first bed." : "No beds in this ward."}
              </p>
              <Button variant="outline" onClick={openCreateDialog} data-testid="button-add-bed-empty">
                <Plus className="h-4 w-4 mr-2" />
                Add Bed
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(bedsByWard.entries()).map(([wardId, wardBeds]) => {
                const ward = wardMap.get(wardId);
                return (
                  <div key={wardId} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold" data-testid={`text-ward-group-${wardId}`}>
                        {ward?.name || "Unknown Ward"}
                      </h3>
                      <Badge variant="secondary" data-testid={`badge-ward-type-${wardId}`}>
                        {ward?.type || ""}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({wardBeds.length} bed{wardBeds.length !== 1 ? "s" : ""})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {wardBeds.map((bed) => {
                        const StatusIcon = STATUS_ICONS[bed.status] || CheckCircle2;
                        return (
                          <Card
                            key={bed.id}
                            className={`cursor-pointer border-2 transition-colors ${STATUS_COLORS[bed.status] || ""} ${!bed.isActive ? "opacity-50" : ""}`}
                            onClick={() => openEditDialog(bed)}
                            data-testid={`card-bed-${bed.id}`}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-base font-bold ${STATUS_TEXT_COLORS[bed.status] || ""}`} data-testid={`text-bed-number-${bed.id}`}>
                                  {bed.bedNumber}
                                </span>
                                <StatusIcon className={`h-4 w-4 ${STATUS_TEXT_COLORS[bed.status] || ""}`} />
                              </div>
                              <Badge
                                variant="secondary"
                                className={STATUS_BADGE_COLORS[bed.status] || ""}
                                data-testid={`badge-bed-status-${bed.id}`}
                              >
                                {BED_STATUSES.find((s) => s.value === bed.status)?.label || bed.status}
                              </Badge>
                              {bed.type && (
                                <p className="text-xs text-muted-foreground" data-testid={`text-bed-type-${bed.id}`}>
                                  {BED_TYPES.find((t) => t.value === bed.type)?.label || bed.type}
                                </p>
                              )}
                              {bed.currentPatientId && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-bed-patient-${bed.id}`}>
                                  <User className="h-3 w-3" />
                                  Patient Assigned
                                </div>
                              )}
                              {bed.dailyRate && (
                                <p className="text-xs font-medium" data-testid={`text-bed-rate-${bed.id}`}>
                                  ₹{bed.dailyRate}/day
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg" data-testid="dialog-bed-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingBed ? "Edit Bed" : "Add New Bed"}
            </DialogTitle>
            <DialogDescription>
              {editingBed ? "Update bed details and status." : "Fill in the details to add a new bed."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bed-number">Bed Number</Label>
                <Input
                  id="bed-number"
                  value={formData.bedNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bedNumber: e.target.value }))}
                  placeholder="e.g. B-101"
                  data-testid="input-bed-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed-ward">Ward</Label>
                <Select
                  value={formData.wardId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, wardId: value }))}
                >
                  <SelectTrigger data-testid="select-bed-ward">
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => (
                      <SelectItem key={w.id} value={w.id} data-testid={`option-ward-${w.id}`}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bed-type">Bed Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger data-testid="select-bed-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BED_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} data-testid={`option-bed-type-${t.value}`}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bed-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger data-testid="select-bed-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {BED_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} data-testid={`option-bed-status-${s.value}`}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bed-rate">Daily Rate</Label>
              <Input
                id="bed-rate"
                value={formData.dailyRate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dailyRate: e.target.value }))}
                placeholder="e.g. 1500"
                data-testid="input-bed-rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bed-features">Features</Label>
              <Input
                id="bed-features"
                value={formData.features}
                onChange={(e) => setFormData((prev) => ({ ...prev, features: e.target.value }))}
                placeholder="e.g. Oxygen, Monitor, AC"
                data-testid="input-bed-features"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bed-notes">Notes</Label>
              <Textarea
                id="bed-notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                className="resize-none"
                data-testid="input-bed-notes"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="bed-active">Active</Label>
              <Switch
                id="bed-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                data-testid="switch-bed-active"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingBed && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    deleteMutation.mutate(editingBed.id);
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  data-testid="button-delete-bed"
                >
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-bed"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-bed"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingBed
                    ? "Update Bed"
                    : "Create Bed"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
