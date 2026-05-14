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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  ClipboardList,
  Users,
  LogOut,
  Activity,
  ArrowRightLeft,
  Search,
} from "lucide-react";

type Admission = {
  id: string;
  admissionNumber: string;
  organizationId: string;
  patientId: string;
  bedId: string | null;
  wardId: string | null;
  doctorId: string | null;
  admissionType: string;
  status: string;
  admissionDate: Date | null;
  dischargeDate: Date | null;
  diagnosis: string | null;
  chiefComplaint: string | null;
  treatmentPlan: string | null;
  surgeryRequired: boolean | null;
  surgeryNotes: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  dischargeSummary: string | null;
  dischargeNotes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type Ward = {
  id: string;
  name: string;
  type: string;
};

type Bed = {
  id: string;
  wardId: string;
  bedNumber: string;
  status: string;
};

type Patient = {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
};

const STATUS_COLORS: Record<string, string> = {
  admitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  discharged: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  transferred: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  deceased: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  absconded: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const ADMISSION_TYPES = [
  { value: "regular", label: "Regular" },
  { value: "emergency", label: "Emergency" },
  { value: "icu", label: "ICU" },
  { value: "daycare", label: "Daycare" },
];

export default function Admissions() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [admitDialogOpen, setAdmitDialogOpen] = useState(false);
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [patientSearch, setPatientSearch] = useState("");

  const [formData, setFormData] = useState({
    patientId: "",
    wardId: "",
    bedId: "",
    doctorId: "",
    admissionType: "regular",
    diagnosis: "",
    chiefComplaint: "",
    treatmentPlan: "",
    surgeryRequired: false,
    surgeryNotes: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const [dischargeData, setDischargeData] = useState({
    dischargeSummary: "",
    dischargeNotes: "",
  });

  const [transferData, setTransferData] = useState({
    wardId: "",
    bedId: "",
  });

  const { data: admissions = [], isLoading } = useQuery<Admission[]>({
    queryKey: ["/api/admissions"],
  });

  const { data: wards = [] } = useQuery<Ward[]>({
    queryKey: ["/api/wards"],
  });

  const { data: allBeds = [] } = useQuery<Bed[]>({
    queryKey: ["/api/beds"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const admitMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admissions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      toast({ title: "Patient admitted successfully" });
      setAdmitDialogOpen(false);
      resetAdmitForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to admit patient", description: error.message, variant: "destructive" });
    },
  });

  const dischargeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/admissions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      toast({ title: "Patient discharged successfully" });
      setDischargeDialogOpen(false);
      setSelectedAdmission(null);
      setDischargeData({ dischargeSummary: "", dischargeNotes: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to discharge patient", description: error.message, variant: "destructive" });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/admissions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/beds"] });
      toast({ title: "Patient transferred successfully" });
      setTransferDialogOpen(false);
      setSelectedAdmission(null);
      setTransferData({ wardId: "", bedId: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to transfer patient", description: error.message, variant: "destructive" });
    },
  });

  function resetAdmitForm() {
    setFormData({
      patientId: "",
      wardId: "",
      bedId: "",
      doctorId: "",
      admissionType: "regular",
      diagnosis: "",
      chiefComplaint: "",
      treatmentPlan: "",
      surgeryRequired: false,
      surgeryNotes: "",
      insuranceProvider: "",
      insurancePolicyNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    });
    setPatientSearch("");
  }

  function handleAdmitSubmit() {
    admitMutation.mutate({
      patientId: formData.patientId,
      wardId: formData.wardId || null,
      bedId: formData.bedId || null,
      doctorId: formData.doctorId || null,
      admissionType: formData.admissionType,
      diagnosis: formData.diagnosis || null,
      chiefComplaint: formData.chiefComplaint || null,
      treatmentPlan: formData.treatmentPlan || null,
      surgeryRequired: formData.surgeryRequired,
      surgeryNotes: formData.surgeryNotes || null,
      insuranceProvider: formData.insuranceProvider || null,
      insurancePolicyNumber: formData.insurancePolicyNumber || null,
      emergencyContactName: formData.emergencyContactName || null,
      emergencyContactPhone: formData.emergencyContactPhone || null,
    });
  }

  function handleDischargeSubmit() {
    if (!selectedAdmission) return;
    dischargeMutation.mutate({
      id: selectedAdmission.id,
      data: {
        status: "discharged",
        dischargeSummary: dischargeData.dischargeSummary || null,
        dischargeNotes: dischargeData.dischargeNotes || null,
        dischargeDate: new Date().toISOString(),
      },
    });
  }

  function handleTransferSubmit() {
    if (!selectedAdmission) return;
    transferMutation.mutate({
      id: selectedAdmission.id,
      data: {
        status: "transferred",
        wardId: transferData.wardId || null,
        bedId: transferData.bedId || null,
      },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalAdmissions = admissions.length;
  const currentlyAdmitted = admissions.filter((a) => a.status === "admitted").length;
  const dischargedToday = admissions.filter((a) => {
    if (!a.dischargeDate) return false;
    const d = new Date(a.dischargeDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;
  const icuPatients = admissions.filter((a) => a.admissionType === "icu" && a.status === "admitted").length;

  const filteredAdmissions = admissions.filter((a) => {
    if (activeTab === "all") return true;
    return a.status === activeTab;
  });

  const availableBedsForWard = (wardId: string) =>
    allBeds.filter((b) => b.wardId === wardId && b.status === "available");

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch) return true;
    const q = patientSearch.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.patientId.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  const getWardName = (wardId: string | null) => {
    if (!wardId) return "-";
    return wards.find((w) => w.id === wardId)?.name || wardId;
  };

  const getBedNumber = (bedId: string | null) => {
    if (!bedId) return "-";
    return allBeds.find((b) => b.id === bedId)?.bedNumber || bedId;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Inpatient Admissions</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-description">
              Manage hospital patient admissions
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetAdmitForm();
            setAdmitDialogOpen(true);
          }}
          data-testid="button-admit-patient"
        >
          <Plus className="h-4 w-4 mr-2" />
          Admit Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admissions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-admissions">{totalAdmissions}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Admitted</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-currently-admitted">{currentlyAdmitted}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discharged Today</CardTitle>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-discharged-today">{dischargedToday}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ICU Patients</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-icu-patients">{icuPatients}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-filter">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="admitted" data-testid="tab-admitted">Admitted</TabsTrigger>
          <TabsTrigger value="discharged" data-testid="tab-discharged">Discharged</TabsTrigger>
          <TabsTrigger value="transferred" data-testid="tab-transferred">Transferred</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAdmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground" data-testid="text-no-admissions">No admissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-admissions">
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Ward</TableHead>
                    <TableHead>Bed</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admitted Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmissions.map((admission) => (
                    <TableRow key={admission.id} data-testid={`row-admission-${admission.id}`}>
                      <TableCell className="font-medium" data-testid={`text-admission-number-${admission.id}`}>
                        {admission.admissionNumber}
                      </TableCell>
                      <TableCell data-testid={`text-admission-patient-${admission.id}`}>
                        {admission.patientId}
                      </TableCell>
                      <TableCell data-testid={`text-admission-ward-${admission.id}`}>
                        {getWardName(admission.wardId)}
                      </TableCell>
                      <TableCell data-testid={`text-admission-bed-${admission.id}`}>
                        {getBedNumber(admission.bedId)}
                      </TableCell>
                      <TableCell data-testid={`text-admission-doctor-${admission.id}`}>
                        {admission.doctorId || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-admission-type-${admission.id}`}>
                          {ADMISSION_TYPES.find((t) => t.value === admission.admissionType)?.label || admission.admissionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[admission.status] || ""}
                          data-testid={`badge-admission-status-${admission.id}`}
                        >
                          {admission.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-admission-date-${admission.id}`}>
                        {admission.admissionDate
                          ? new Date(admission.admissionDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {admission.status === "admitted" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAdmission(admission);
                                  setDischargeData({ dischargeSummary: "", dischargeNotes: "" });
                                  setDischargeDialogOpen(true);
                                }}
                                data-testid={`button-discharge-${admission.id}`}
                              >
                                <LogOut className="h-3 w-3 mr-1" />
                                Discharge
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAdmission(admission);
                                  setTransferData({ wardId: "", bedId: "" });
                                  setTransferDialogOpen(true);
                                }}
                                data-testid={`button-transfer-${admission.id}`}
                              >
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                Transfer
                              </Button>
                            </>
                          )}
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
        open={admitDialogOpen}
        onOpenChange={(open) => {
          setAdmitDialogOpen(open);
          if (!open) resetAdmitForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-admit-dialog-title">Admit Patient</DialogTitle>
            <DialogDescription>Fill in the details to admit a new patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="patientSearch"
                    placeholder="Search patients by name, ID, or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-patient-search"
                  />
                </div>
                {patientSearch && filteredPatients.length > 0 && !formData.patientId && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredPatients.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover-elevate"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, patientId: p.id }));
                          setPatientSearch(`${p.firstName} ${p.lastName} (${p.patientId})`);
                        }}
                        data-testid={`button-select-patient-${p.id}`}
                      >
                        <span className="font-medium">{p.firstName} {p.lastName}</span>
                        <span className="text-muted-foreground ml-2">{p.patientId}</span>
                        <span className="text-muted-foreground ml-2">{p.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {formData.patientId && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" data-testid="badge-selected-patient">
                      {patients.find((p) => p.id === formData.patientId)?.firstName}{" "}
                      {patients.find((p) => p.id === formData.patientId)?.lastName}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, patientId: "" }));
                        setPatientSearch("");
                      }}
                      data-testid="button-clear-patient"
                    >
                      Clear
                    </Button>
                  </div>
                )}
                <Input
                  id="patientId"
                  placeholder="Or enter patient UUID directly"
                  value={formData.patientId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, patientId: e.target.value }))}
                  data-testid="input-patient-id"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wardId">Ward</Label>
                <Select
                  value={formData.wardId}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, wardId: val, bedId: "" }))
                  }
                >
                  <SelectTrigger data-testid="select-ward">
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

              <div className="space-y-2">
                <Label htmlFor="bedId">Bed</Label>
                <Select
                  value={formData.bedId}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, bedId: val }))
                  }
                  disabled={!formData.wardId}
                >
                  <SelectTrigger data-testid="select-bed">
                    <SelectValue placeholder={formData.wardId ? "Select bed" : "Select ward first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBedsForWard(formData.wardId).map((b) => (
                      <SelectItem key={b.id} value={b.id} data-testid={`option-bed-${b.id}`}>
                        {b.bedNumber}
                      </SelectItem>
                    ))}
                    {formData.wardId && availableBedsForWard(formData.wardId).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No available beds</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="doctorId">Doctor ID</Label>
                <Input
                  id="doctorId"
                  placeholder="Enter doctor ID"
                  value={formData.doctorId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, doctorId: e.target.value }))}
                  data-testid="input-doctor-id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admissionType">Admission Type</Label>
                <Select
                  value={formData.admissionType}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, admissionType: val }))
                  }
                >
                  <SelectTrigger data-testid="select-admission-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMISSION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} data-testid={`option-type-${t.value}`}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                placeholder="Enter diagnosis"
                value={formData.diagnosis}
                onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                data-testid="input-diagnosis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Textarea
                id="chiefComplaint"
                placeholder="Enter chief complaint"
                value={formData.chiefComplaint}
                onChange={(e) => setFormData((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                data-testid="input-chief-complaint"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatmentPlan">Treatment Plan</Label>
              <Textarea
                id="treatmentPlan"
                placeholder="Enter treatment plan"
                value={formData.treatmentPlan}
                onChange={(e) => setFormData((prev) => ({ ...prev, treatmentPlan: e.target.value }))}
                data-testid="input-treatment-plan"
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="surgeryRequired"
                checked={formData.surgeryRequired}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, surgeryRequired: checked }))
                }
                data-testid="switch-surgery-required"
              />
              <Label htmlFor="surgeryRequired">Surgery Required</Label>
            </div>

            {formData.surgeryRequired && (
              <div className="space-y-2">
                <Label htmlFor="surgeryNotes">Surgery Notes</Label>
                <Textarea
                  id="surgeryNotes"
                  placeholder="Enter surgery notes"
                  value={formData.surgeryNotes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, surgeryNotes: e.target.value }))}
                  data-testid="input-surgery-notes"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  placeholder="Enter provider"
                  value={formData.insuranceProvider}
                  onChange={(e) => setFormData((prev) => ({ ...prev, insuranceProvider: e.target.value }))}
                  data-testid="input-insurance-provider"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insurancePolicyNumber">Policy Number</Label>
                <Input
                  id="insurancePolicyNumber"
                  placeholder="Enter policy number"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, insurancePolicyNumber: e.target.value }))}
                  data-testid="input-insurance-policy"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  placeholder="Enter name"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                  data-testid="input-emergency-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  placeholder="Enter phone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emergencyContactPhone: e.target.value }))}
                  data-testid="input-emergency-phone"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setAdmitDialogOpen(false)}
                data-testid="button-cancel-admit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdmitSubmit}
                disabled={!formData.patientId || admitMutation.isPending}
                data-testid="button-submit-admit"
              >
                {admitMutation.isPending ? "Admitting..." : "Admit Patient"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dischargeDialogOpen}
        onOpenChange={(open) => {
          setDischargeDialogOpen(open);
          if (!open) {
            setSelectedAdmission(null);
            setDischargeData({ dischargeSummary: "", dischargeNotes: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-discharge-dialog-title">Discharge Patient</DialogTitle>
            <DialogDescription>
              Discharge patient from admission {selectedAdmission?.admissionNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dischargeSummary">Discharge Summary</Label>
              <Textarea
                id="dischargeSummary"
                placeholder="Enter discharge summary"
                value={dischargeData.dischargeSummary}
                onChange={(e) => setDischargeData((prev) => ({ ...prev, dischargeSummary: e.target.value }))}
                data-testid="input-discharge-summary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dischargeNotes">Discharge Notes</Label>
              <Textarea
                id="dischargeNotes"
                placeholder="Enter discharge notes"
                value={dischargeData.dischargeNotes}
                onChange={(e) => setDischargeData((prev) => ({ ...prev, dischargeNotes: e.target.value }))}
                data-testid="input-discharge-notes"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDischargeDialogOpen(false)}
                data-testid="button-cancel-discharge"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDischargeSubmit}
                disabled={dischargeMutation.isPending}
                data-testid="button-submit-discharge"
              >
                {dischargeMutation.isPending ? "Discharging..." : "Confirm Discharge"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={transferDialogOpen}
        onOpenChange={(open) => {
          setTransferDialogOpen(open);
          if (!open) {
            setSelectedAdmission(null);
            setTransferData({ wardId: "", bedId: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-transfer-dialog-title">Transfer Patient</DialogTitle>
            <DialogDescription>
              Transfer patient from admission {selectedAdmission?.admissionNumber} to a new ward/bed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transferWardId">New Ward</Label>
              <Select
                value={transferData.wardId}
                onValueChange={(val) =>
                  setTransferData((prev) => ({ ...prev, wardId: val, bedId: "" }))
                }
              >
                <SelectTrigger data-testid="select-transfer-ward">
                  <SelectValue placeholder="Select new ward" />
                </SelectTrigger>
                <SelectContent>
                  {wards.map((w) => (
                    <SelectItem key={w.id} value={w.id} data-testid={`option-transfer-ward-${w.id}`}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferBedId">New Bed</Label>
              <Select
                value={transferData.bedId}
                onValueChange={(val) =>
                  setTransferData((prev) => ({ ...prev, bedId: val }))
                }
                disabled={!transferData.wardId}
              >
                <SelectTrigger data-testid="select-transfer-bed">
                  <SelectValue placeholder={transferData.wardId ? "Select new bed" : "Select ward first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableBedsForWard(transferData.wardId).map((b) => (
                    <SelectItem key={b.id} value={b.id} data-testid={`option-transfer-bed-${b.id}`}>
                      {b.bedNumber}
                    </SelectItem>
                  ))}
                  {transferData.wardId && availableBedsForWard(transferData.wardId).length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No available beds</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setTransferDialogOpen(false)}
                data-testid="button-cancel-transfer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferSubmit}
                disabled={!transferData.wardId || !transferData.bedId || transferMutation.isPending}
                data-testid="button-submit-transfer"
              >
                {transferMutation.isPending ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}