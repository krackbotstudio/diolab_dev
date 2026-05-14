import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Brain,
  Plus,
  Clock,
  AlertTriangle,
} from "lucide-react";

type Admission = {
  id: string;
  admissionNumber: string;
  patientId: string;
  bedId: string | null;
  wardId: string | null;
  doctorId: string | null;
  admissionType: string;
  status: string;
  admissionDate: Date | null;
  diagnosis: string | null;
};

type IcuMonitoring = {
  id: string;
  organizationId: string;
  admissionId: string;
  patientId: string;
  heartRate: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  temperature: string | null;
  spO2: number | null;
  respiratoryRate: number | null;
  bloodSugar: string | null;
  gcsScore: number | null;
  ventilatorMode: string | null;
  fiO2: number | null;
  peep: number | null;
  tidalVolume: number | null;
  oxygenFlow: string | null;
  urineOutput: number | null;
  intakeVolume: number | null;
  outputVolume: number | null;
  painScore: number | null;
  consciousness: string | null;
  pupilReaction: string | null;
  ivFluids: string | null;
  notes: string | null;
  recordedBy: string | null;
  recordedAt: Date | null;
};

type Bed = {
  id: string;
  wardId: string;
  bedNumber: string;
  status: string;
  bedType: string | null;
};

function isCriticalHR(hr: number | null) {
  return hr !== null && (hr < 50 || hr > 120);
}

function isCriticalSpO2(spo2: number | null) {
  return spo2 !== null && spo2 < 90;
}

function isCriticalBP(sbp: number | null) {
  return sbp !== null && (sbp < 80 || sbp > 180);
}

function isCriticalTemp(temp: string | null) {
  if (!temp) return false;
  const t = parseFloat(temp);
  return !isNaN(t) && (t < 35 || t > 39);
}

function isCriticalRR(rr: number | null) {
  return rr !== null && (rr < 8 || rr > 30);
}

function hasAnyCritical(record: IcuMonitoring | null | undefined) {
  if (!record) return false;
  return (
    isCriticalHR(record.heartRate) ||
    isCriticalSpO2(record.spO2) ||
    isCriticalBP(record.systolicBp) ||
    isCriticalTemp(record.temperature) ||
    isCriticalRR(record.respiratoryRate)
  );
}

function VitalBox({
  label,
  value,
  unit,
  icon: Icon,
  critical,
  testId,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon: any;
  critical: boolean;
  testId: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md p-2 border ${
        critical
          ? "border-red-500 bg-red-50 dark:bg-red-950/30"
          : "border-green-500 bg-green-50 dark:bg-green-950/30"
      }`}
      data-testid={testId}
    >
      <Icon className={`h-4 w-4 ${critical ? "text-red-600" : "text-green-600"}`} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-semibold ${critical ? "text-red-700 dark:text-red-400" : ""}`}>
          {value ?? "--"} {unit && value != null ? unit : ""}
        </p>
      </div>
    </div>
  );
}

function PatientCard({
  admission,
  onRecordVitals,
  onViewHistory,
}: {
  admission: Admission;
  onRecordVitals: (admission: Admission) => void;
  onViewHistory: (admission: Admission) => void;
}) {
  const { data: latestRecord, isLoading } = useQuery<IcuMonitoring | null>({
    queryKey: ["/api/icu/latest", admission.id],
  });

  const critical = hasAnyCritical(latestRecord);
  const onVentilator =
    latestRecord?.ventilatorMode && latestRecord.ventilatorMode !== "none";

  return (
    <Card
      className={`cursor-pointer transition-colors ${
        critical ? "border-red-500 border-2" : ""
      }`}
      onClick={() => onRecordVitals(admission)}
      data-testid={`card-patient-${admission.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base" data-testid={`text-patient-id-${admission.id}`}>
              {admission.patientId}
            </CardTitle>
            <CardDescription data-testid={`text-admission-number-${admission.id}`}>
              {admission.admissionNumber}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {critical && (
              <Badge variant="destructive" data-testid={`badge-critical-${admission.id}`}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critical
              </Badge>
            )}
            {onVentilator && (
              <Badge variant="secondary" data-testid={`badge-ventilator-${admission.id}`}>
                <Wind className="h-3 w-3 mr-1" />
                {latestRecord?.ventilatorMode?.toUpperCase()}
              </Badge>
            )}
            {latestRecord?.consciousness && (
              <Badge
                variant="outline"
                data-testid={`badge-consciousness-${admission.id}`}
              >
                <Brain className="h-3 w-3 mr-1" />
                {latestRecord.consciousness}
              </Badge>
            )}
          </div>
        </div>
        {admission.admissionDate && (
          <p className="text-xs text-muted-foreground" data-testid={`text-admission-date-${admission.id}`}>
            <Clock className="h-3 w-3 inline mr-1" />
            {new Date(admission.admissionDate).toLocaleDateString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : latestRecord ? (
          <div className="grid grid-cols-2 gap-2">
            <VitalBox
              label="Heart Rate"
              value={latestRecord.heartRate}
              unit="bpm"
              icon={Heart}
              critical={isCriticalHR(latestRecord.heartRate)}
              testId={`vital-hr-${admission.id}`}
            />
            <VitalBox
              label="Blood Pressure"
              value={
                latestRecord.systolicBp != null && latestRecord.diastolicBp != null
                  ? `${latestRecord.systolicBp}/${latestRecord.diastolicBp}`
                  : latestRecord.systolicBp
              }
              unit="mmHg"
              icon={Activity}
              critical={isCriticalBP(latestRecord.systolicBp)}
              testId={`vital-bp-${admission.id}`}
            />
            <VitalBox
              label="SpO2"
              value={latestRecord.spO2}
              unit="%"
              icon={Droplets}
              critical={isCriticalSpO2(latestRecord.spO2)}
              testId={`vital-spo2-${admission.id}`}
            />
            <VitalBox
              label="Temperature"
              value={latestRecord.temperature}
              unit="°C"
              icon={Thermometer}
              critical={isCriticalTemp(latestRecord.temperature)}
              testId={`vital-temp-${admission.id}`}
            />
            <VitalBox
              label="Resp. Rate"
              value={latestRecord.respiratoryRate}
              unit="/min"
              icon={Wind}
              critical={isCriticalRR(latestRecord.respiratoryRate)}
              testId={`vital-rr-${admission.id}`}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No vitals recorded yet
          </p>
        )}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onRecordVitals(admission);
            }}
            data-testid={`button-record-vitals-${admission.id}`}
          >
            <Plus className="h-3 w-3 mr-1" />
            Record Vitals
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onViewHistory(admission);
            }}
            data-testid={`button-view-history-${admission.id}`}
          >
            <Clock className="h-3 w-3 mr-1" />
            View History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryDialog({
  admission,
  open,
  onOpenChange,
}: {
  admission: Admission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: records = [], isLoading } = useQuery<IcuMonitoring[]>({
    queryKey: ["/api/icu/records", admission?.id],
    enabled: !!admission && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-history-title">
            Vitals History - {admission?.patientId}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No records found</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <Card key={record.id} data-testid={`card-history-record-${record.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {record.recordedAt
                        ? new Date(record.recordedAt).toLocaleString()
                        : "Unknown time"}
                    </p>
                    {record.recordedBy && (
                      <Badge variant="outline" className="text-xs">
                        {record.recordedBy}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">HR:</span>{" "}
                      <span className={isCriticalHR(record.heartRate) ? "text-red-600 font-semibold" : ""}>
                        {record.heartRate ?? "--"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">BP:</span>{" "}
                      <span className={isCriticalBP(record.systolicBp) ? "text-red-600 font-semibold" : ""}>
                        {record.systolicBp ?? "--"}/{record.diastolicBp ?? "--"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SpO2:</span>{" "}
                      <span className={isCriticalSpO2(record.spO2) ? "text-red-600 font-semibold" : ""}>
                        {record.spO2 ?? "--"}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temp:</span>{" "}
                      <span className={isCriticalTemp(record.temperature) ? "text-red-600 font-semibold" : ""}>
                        {record.temperature ?? "--"}°C
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RR:</span>{" "}
                      <span className={isCriticalRR(record.respiratoryRate) ? "text-red-600 font-semibold" : ""}>
                        {record.respiratoryRate ?? "--"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GCS:</span>{" "}
                      {record.gcsScore ?? "--"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ventilator:</span>{" "}
                      {record.ventilatorMode || "none"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Consciousness:</span>{" "}
                      {record.consciousness || "--"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pain:</span>{" "}
                      {record.painScore ?? "--"}/10
                    </div>
                  </div>
                  {record.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {record.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function IcuDashboard() {
  const { toast } = useToast();
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [historyAdmission, setHistoryAdmission] = useState<Admission | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    heartRate: "",
    systolicBp: "",
    diastolicBp: "",
    temperature: "",
    spO2: "",
    respiratoryRate: "",
    bloodSugar: "",
    gcsScore: "",
    ventilatorMode: "none",
    fiO2: "",
    peep: "",
    tidalVolume: "",
    oxygenFlow: "",
    urineOutput: "",
    intakeVolume: "",
    outputVolume: "",
    painScore: "",
    consciousness: "alert",
    pupilReaction: "",
    ivFluids: "",
    notes: "",
    recordedBy: "",
  });

  const { data: admissions = [], isLoading: admissionsLoading } = useQuery<Admission[]>({
    queryKey: ["/api/icu/patients"],
  });

  const { data: beds = [] } = useQuery<Bed[]>({
    queryKey: ["/api/beds"],
  });

  const recordVitalsMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/icu/records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/icu/patients"] });
      if (selectedAdmission) {
        queryClient.invalidateQueries({
          queryKey: ["/api/icu/latest", selectedAdmission.id],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/icu/records", selectedAdmission.id],
        });
      }
      toast({ title: "Vitals recorded successfully" });
      setRecordDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error recording vitals",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function resetForm() {
    setFormData({
      heartRate: "",
      systolicBp: "",
      diastolicBp: "",
      temperature: "",
      spO2: "",
      respiratoryRate: "",
      bloodSugar: "",
      gcsScore: "",
      ventilatorMode: "none",
      fiO2: "",
      peep: "",
      tidalVolume: "",
      oxygenFlow: "",
      urineOutput: "",
      intakeVolume: "",
      outputVolume: "",
      painScore: "",
      consciousness: "alert",
      pupilReaction: "",
      ivFluids: "",
      notes: "",
      recordedBy: "",
    });
  }

  function handleRecordVitals(admission: Admission) {
    setSelectedAdmission(admission);
    resetForm();
    setRecordDialogOpen(true);
  }

  function handleViewHistory(admission: Admission) {
    setHistoryAdmission(admission);
    setHistoryDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAdmission) return;

    const payload: any = {
      admissionId: selectedAdmission.id,
      patientId: selectedAdmission.patientId,
      heartRate: formData.heartRate ? Number(formData.heartRate) : null,
      systolicBp: formData.systolicBp ? Number(formData.systolicBp) : null,
      diastolicBp: formData.diastolicBp ? Number(formData.diastolicBp) : null,
      temperature: formData.temperature || null,
      spO2: formData.spO2 ? Number(formData.spO2) : null,
      respiratoryRate: formData.respiratoryRate ? Number(formData.respiratoryRate) : null,
      bloodSugar: formData.bloodSugar || null,
      gcsScore: formData.gcsScore ? Number(formData.gcsScore) : null,
      ventilatorMode: formData.ventilatorMode || null,
      fiO2: formData.fiO2 ? Number(formData.fiO2) : null,
      peep: formData.peep ? Number(formData.peep) : null,
      tidalVolume: formData.tidalVolume ? Number(formData.tidalVolume) : null,
      oxygenFlow: formData.oxygenFlow || null,
      urineOutput: formData.urineOutput ? Number(formData.urineOutput) : null,
      intakeVolume: formData.intakeVolume ? Number(formData.intakeVolume) : null,
      outputVolume: formData.outputVolume ? Number(formData.outputVolume) : null,
      painScore: formData.painScore ? Number(formData.painScore) : null,
      consciousness: formData.consciousness || null,
      pupilReaction: formData.pupilReaction || null,
      ivFluids: formData.ivFluids || null,
      notes: formData.notes || null,
      recordedBy: formData.recordedBy || null,
    };

    recordVitalsMutation.mutate(payload);
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  const latestRecordsQueries = admissions.map((admission) => ({
    queryKey: ["/api/icu/latest", admission.id],
  }));

  const ventilatorCount = admissions.reduce((count, admission) => {
    const cached = queryClient.getQueryData<IcuMonitoring | null>([
      "/api/icu/latest",
      admission.id,
    ]);
    if (cached?.ventilatorMode && cached.ventilatorMode !== "none") {
      return count + 1;
    }
    return count;
  }, 0);

  const criticalCount = admissions.reduce((count, admission) => {
    const cached = queryClient.getQueryData<IcuMonitoring | null>([
      "/api/icu/latest",
      admission.id,
    ]);
    if (hasAnyCritical(cached)) {
      return count + 1;
    }
    return count;
  }, 0);

  const icuBeds = beds.filter(
    (b) => b.bedType === "icu" || b.bedType === "ICU"
  );
  const availableIcuBeds = icuBeds.filter((b) => b.status === "available").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="p-2 rounded-lg bg-primary/10">
          <Activity className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            ICU Dashboard
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-page-description">
            Real-time ICU patient monitoring and vitals tracking
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-patients">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ICU Patients</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-patients">
              {admissionsLoading ? <Skeleton className="h-8 w-12" /> : admissions.length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-ventilator-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Ventilator</CardTitle>
            <Wind className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ventilator-count">
              {admissionsLoading ? <Skeleton className="h-8 w-12" /> : ventilatorCount}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-critical-count">
              {admissionsLoading ? <Skeleton className="h-8 w-12" /> : criticalCount}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-available-beds">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available ICU Beds</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available-beds">
              {admissionsLoading ? <Skeleton className="h-8 w-12" /> : availableIcuBeds}
            </div>
          </CardContent>
        </Card>
      </div>

      {admissionsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={j} className="h-14" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : admissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Activity className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No ICU patients currently admitted</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {admissions.map((admission) => (
            <PatientCard
              key={admission.id}
              admission={admission}
              onRecordVitals={handleRecordVitals}
              onViewHistory={handleViewHistory}
            />
          ))}
        </div>
      )}

      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-record-vitals-title">
              Record Vitals - {selectedAdmission?.patientId}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  value={formData.heartRate}
                  onChange={(e) => updateField("heartRate", e.target.value)}
                  data-testid="input-heart-rate"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="systolicBp">Systolic BP (mmHg)</Label>
                <Input
                  id="systolicBp"
                  type="number"
                  value={formData.systolicBp}
                  onChange={(e) => updateField("systolicBp", e.target.value)}
                  data-testid="input-systolic-bp"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="diastolicBp">Diastolic BP (mmHg)</Label>
                <Input
                  id="diastolicBp"
                  type="number"
                  value={formData.diastolicBp}
                  onChange={(e) => updateField("diastolicBp", e.target.value)}
                  data-testid="input-diastolic-bp"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => updateField("temperature", e.target.value)}
                  data-testid="input-temperature"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="spO2">SpO2 (%)</Label>
                <Input
                  id="spO2"
                  type="number"
                  value={formData.spO2}
                  onChange={(e) => updateField("spO2", e.target.value)}
                  data-testid="input-spo2"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="respiratoryRate">Respiratory Rate (/min)</Label>
                <Input
                  id="respiratoryRate"
                  type="number"
                  value={formData.respiratoryRate}
                  onChange={(e) => updateField("respiratoryRate", e.target.value)}
                  data-testid="input-respiratory-rate"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bloodSugar">Blood Sugar (mg/dL)</Label>
                <Input
                  id="bloodSugar"
                  type="number"
                  value={formData.bloodSugar}
                  onChange={(e) => updateField("bloodSugar", e.target.value)}
                  data-testid="input-blood-sugar"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gcsScore">GCS Score (3-15)</Label>
                <Input
                  id="gcsScore"
                  type="number"
                  min={3}
                  max={15}
                  value={formData.gcsScore}
                  onChange={(e) => updateField("gcsScore", e.target.value)}
                  data-testid="input-gcs-score"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ventilatorMode">Ventilator Mode</Label>
              <Select
                value={formData.ventilatorMode}
                onValueChange={(value) => updateField("ventilatorMode", value)}
              >
                <SelectTrigger data-testid="select-ventilator-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="cpap">CPAP</SelectItem>
                  <SelectItem value="bipap">BiPAP</SelectItem>
                  <SelectItem value="simv">SIMV</SelectItem>
                  <SelectItem value="ac">AC</SelectItem>
                  <SelectItem value="ps">PS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fiO2">FiO2 (%)</Label>
                <Input
                  id="fiO2"
                  type="number"
                  value={formData.fiO2}
                  onChange={(e) => updateField("fiO2", e.target.value)}
                  data-testid="input-fio2"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="peep">PEEP (cmH2O)</Label>
                <Input
                  id="peep"
                  type="number"
                  value={formData.peep}
                  onChange={(e) => updateField("peep", e.target.value)}
                  data-testid="input-peep"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tidalVolume">Tidal Volume (mL)</Label>
                <Input
                  id="tidalVolume"
                  type="number"
                  value={formData.tidalVolume}
                  onChange={(e) => updateField("tidalVolume", e.target.value)}
                  data-testid="input-tidal-volume"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="oxygenFlow">Oxygen Flow (L/min)</Label>
                <Input
                  id="oxygenFlow"
                  type="number"
                  value={formData.oxygenFlow}
                  onChange={(e) => updateField("oxygenFlow", e.target.value)}
                  data-testid="input-oxygen-flow"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="urineOutput">Urine Output (mL)</Label>
                <Input
                  id="urineOutput"
                  type="number"
                  value={formData.urineOutput}
                  onChange={(e) => updateField("urineOutput", e.target.value)}
                  data-testid="input-urine-output"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intakeVolume">Intake Volume (mL)</Label>
                <Input
                  id="intakeVolume"
                  type="number"
                  value={formData.intakeVolume}
                  onChange={(e) => updateField("intakeVolume", e.target.value)}
                  data-testid="input-intake-volume"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="outputVolume">Output Volume (mL)</Label>
                <Input
                  id="outputVolume"
                  type="number"
                  value={formData.outputVolume}
                  onChange={(e) => updateField("outputVolume", e.target.value)}
                  data-testid="input-output-volume"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="painScore">Pain Score (0-10)</Label>
                <Input
                  id="painScore"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.painScore}
                  onChange={(e) => updateField("painScore", e.target.value)}
                  data-testid="input-pain-score"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="consciousness">Consciousness Level</Label>
              <Select
                value={formData.consciousness}
                onValueChange={(value) => updateField("consciousness", value)}
              >
                <SelectTrigger data-testid="select-consciousness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="verbal">Verbal</SelectItem>
                  <SelectItem value="pain">Pain</SelectItem>
                  <SelectItem value="unresponsive">Unresponsive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pupilReaction">Pupil Reaction</Label>
                <Input
                  id="pupilReaction"
                  value={formData.pupilReaction}
                  onChange={(e) => updateField("pupilReaction", e.target.value)}
                  data-testid="input-pupil-reaction"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ivFluids">IV Fluids</Label>
                <Input
                  id="ivFluids"
                  value={formData.ivFluids}
                  onChange={(e) => updateField("ivFluids", e.target.value)}
                  data-testid="input-iv-fluids"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                data-testid="input-notes"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="recordedBy">Recorded By</Label>
              <Input
                id="recordedBy"
                value={formData.recordedBy}
                onChange={(e) => updateField("recordedBy", e.target.value)}
                data-testid="input-recorded-by"
              />
            </div>

            <div className="flex justify-end gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecordDialogOpen(false)}
                data-testid="button-cancel-record"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordVitalsMutation.isPending}
                data-testid="button-submit-vitals"
              >
                {recordVitalsMutation.isPending ? "Saving..." : "Save Vitals"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <HistoryDialog
        admission={historyAdmission}
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />
    </div>
  );
}