import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  UserPlus,
  Clock,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Ticket,
  ArrowRight,
  User,
  IndianRupee,
  CreditCard,
  Banknote,
  Globe,
  Printer,
  ExternalLink,
  Copy,
  ArrowUp,
  ArrowDown,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import type { Patient, Department, Doctor, OpVisit } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type OpVisitWithDetails = OpVisit & {
  patient?: Patient;
  doctor?: Doctor;
  department?: Department;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "booked":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <Ticket className="h-3 w-3 mr-1" />
          Booked
        </Badge>
      );
    case "waiting":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Waiting
        </Badge>
      );
    case "in_consultation":
      return (
        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
          <Stethoscope className="h-3 w-3 mr-1" />
          In Consultation
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function OpPos() {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  
  const [selectedVisit, setSelectedVisit] = useState<OpVisitWithDetails | null>(null);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [tokenData, setTokenData] = useState<{
    tokenNumber: number;
    patientName: string;
    phone: string;
    doctorName: string;
    departmentName: string;
    visitType: string;
    date: string;
    visitId: string;
    orgId: string;
  } | null>(null);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState<string>("active");
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");
  const [visitToCancel, setVisitToCancel] = useState<OpVisitWithDetails | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const tokenPrintRef = useRef<HTMLDivElement>(null);
  
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "",
    departmentId: "",
    doctorId: "",
    visitType: "new",
    paymentMode: "cash",
  });
  
  const [consultForm, setConsultForm] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
  });
  
  const [completeForm, setCompleteForm] = useState({
    consultationFee: "500",
    paymentMode: "cash",
  });

  const [paymentForm, setPaymentForm] = useState({
    consultationFee: "500",
    paymentMode: "cash",
  });

  const { data: orgData } = useQuery<{ organization: { id: string } }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: visits = [], isLoading: visitsLoading, refetch: refetchVisits } = useQuery<OpVisit[]>({
    queryKey: ["/api/op-pos/op-visits", organization?.id, today],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/op-visits?organizationId=${organization?.id}&date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch visits");
      return res.json();
    },
    enabled: !!organization?.id,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { module: "hospitals" }],
    enabled: !!organization?.id,
    queryFn: async () => {
      const res = await fetch(`/api/patients?module=hospitals`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/op-pos/departments", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/departments?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json();
    },
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/op-pos/doctors", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/doctors?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  const { data: nextToken } = useQuery<{ nextToken: number }>({
    queryKey: ["/api/op-pos/next-token", organization?.id, today],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/next-token?organizationId=${organization?.id}&date=${today}`);
      if (!res.ok) throw new Error("Failed to fetch next token");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const visitsWithDetails: OpVisitWithDetails[] = useMemo(() => {
    return visits.map(visit => {
      const enriched = visit as any;
      return {
        ...visit,
        patient: enriched.patient || patients.find(p => p.id === visit.patientId),
        doctor: enriched.doctor || doctors.find(d => d.id === visit.doctorId),
        department: enriched.department || departments.find(dept => dept.id === visit.departmentId),
      };
    });
  }, [visits, patients, doctors, departments]);

  const filteredVisits = useMemo(() => {
    let result = visitsWithDetails;
    if (queueFilter === "active") {
      result = result.filter(v => ["booked", "waiting", "in_consultation"].includes(v.status));
    } else if (queueFilter !== "all") {
      result = result.filter(v => v.status === queueFilter);
    }
    return result;
  }, [visitsWithDetails, queueFilter]);

  const queueStats = useMemo(() => {
    const stats = {
      total: visitsWithDetails.length,
      booked: visitsWithDetails.filter(v => v.status === "booked").length,
      waiting: visitsWithDetails.filter(v => v.status === "waiting").length,
      inConsultation: visitsWithDetails.filter(v => v.status === "in_consultation").length,
      completed: visitsWithDetails.filter(v => v.status === "completed").length,
      cancelled: visitsWithDetails.filter(v => v.status === "cancelled").length,
    };
    return stats;
  }, [visitsWithDetails]);

  // Sort active visits by queuePosition (fallback to tokenNumber)
  const sortedFilteredVisits = useMemo(() => {
    return [...filteredVisits].sort((a, b) => {
      const posA = a.queuePosition ?? a.tokenNumber;
      const posB = b.queuePosition ?? b.tokenNumber;
      return posA - posB;
    });
  }, [filteredVisits]);

  const moveToken = (visit: OpVisitWithDetails, direction: "up" | "down") => {
    const movable = sortedFilteredVisits.filter(v => ["booked", "waiting"].includes(v.status));
    const idx = movable.findIndex(v => v.id === visit.id);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= movable.length - 1) return;
    const swapVisit = movable[direction === "up" ? idx - 1 : idx + 1];
    const posA = visit.queuePosition ?? visit.tokenNumber;
    const posB = swapVisit.queuePosition ?? swapVisit.tokenNumber;
    movePositionMutation.mutate({ id: visit.id, data: { queuePosition: posB } });
    movePositionMutation.mutate({ id: swapVisit.id, data: { queuePosition: posA } });
  };

  const handleCancelToken = (visit: OpVisitWithDetails) => {
    setVisitToCancel(visit);
    setIsCancelConfirmOpen(true);
  };

  const confirmCancelToken = () => {
    if (visitToCancel) {
      updateVisitMutation.mutate({ id: visitToCancel.id, data: { status: "cancelled" } });
    }
    setIsCancelConfirmOpen(false);
    setVisitToCancel(null);
  };

  const createPatientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/patients", data);
      return res.json();
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/op-pos/op-visits", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/next-token"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/op-pos/op-visits/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
      toast({ title: "Success", description: "Status updated!" });
    },
  });

  const completeVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("POST", `/api/op-pos/op-visits/${id}/complete`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
      toast({ title: "Success", description: "Consultation completed!" });
      setIsCompleteOpen(false);
      setSelectedVisit(null);
    },
  });

  const movePositionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/op-pos/op-visits/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
    },
  });

  const resetRegForm = () => {
    setRegForm({
      name: "",
      phone: "",
      age: "",
      gender: "",
      departmentId: "",
      doctorId: "",
      visitType: "new",
      paymentMode: "cash",
    });
    setPhoneSearch("");
  };

  const handlePhoneLookup = () => {
    const phone = regForm.phone.trim();
    if (phone.length >= 10) {
      const patient = patients.find(p => p.phone.includes(phone.slice(-10)));
      if (patient) {
        setRegForm(prev => ({
          ...prev,
          name: `${patient.firstName} ${patient.lastName}`.trim(),
          phone: patient.phone,
          age: patient.dateOfBirth ? String(new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()) : "",
          gender: patient.gender || "",
        }));
        setPhoneSearch(patient.phone);
        toast({ title: "Patient Found", description: `${patient.firstName} ${patient.lastName}` });
      } else {
        toast({ title: "New Patient", description: "Enter patient details" });
      }
    }
  };

  const handleRegister = async () => {
    if (!organization?.id) return;
    
    if (createVisitMutation.isPending || createPatientMutation.isPending) return;

    const effectivePhone = regForm.phone.trim();
    if (!effectivePhone || !regForm.name.trim()) {
      toast({ title: "Missing Info", description: "Please enter phone number and patient name.", variant: "destructive" });
      return;
    }

    try {
      let patientId: string | undefined;
      
      if (effectivePhone.length >= 10) {
        patientId = patients.find(p => p.phone.includes(effectivePhone.slice(-10)))?.id;
      }
      
      if (!patientId) {
        const nameParts = regForm.name.trim().split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";
        
        const newPatient = await createPatientMutation.mutateAsync({
          organizationId: organization.id,
          patientId: `PAT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          firstName,
          lastName,
          phone: effectivePhone,
          gender: regForm.gender || null,
          dateOfBirth: regForm.age ? `${new Date().getFullYear() - parseInt(regForm.age)}-01-01` : null,
          source: "walk_in",
          module: "hospitals",
        });
        patientId = newPatient.id;
      }
      
      const fee = departments.find(d => d.id === regForm.departmentId)?.consultationFee ||
                  doctors.find(d => d.id === regForm.doctorId)?.consultationFee || "500";

      const visit = await createVisitMutation.mutateAsync({
        organizationId: organization.id,
        patientId,
        departmentId: regForm.departmentId || null,
        doctorId: regForm.doctorId || null,
        visitType: regForm.visitType,
        source: "walk_in",
        status: "waiting",
        consultationFee: fee,
        paymentMode: regForm.paymentMode !== "unpaid" ? regForm.paymentMode : null,
        paymentStatus: regForm.paymentMode !== "unpaid" ? "paid" : "unpaid",
      });

      const doctorName = doctors.find(d => d.id === regForm.doctorId)?.name || "Not assigned";
      const departmentName = departments.find(d => d.id === regForm.departmentId)?.name || "General";

      setTokenData({
        tokenNumber: visit.tokenNumber,
        patientName: regForm.name.trim(),
        phone: effectivePhone,
        doctorName,
        departmentName,
        visitType: regForm.visitType === "follow_up" ? "Follow-up" : "New Visit",
        date: new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
        visitId: visit.id,
        orgId: organization.id,
      });

      setIsRegistrationOpen(false);
      resetRegForm();
      setIsTokenDialogOpen(true);
      toast({ title: "Registration Successful", description: `Token #${visit.tokenNumber} assigned` });
    } catch (error: any) {
      toast({ 
        title: "Registration Failed", 
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrintToken = () => {
    if (!tokenData) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    
    const queueUrl = `${window.location.origin}/queue/${tokenData.orgId}/${tokenData.visitId}`;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Token #${tokenData.tokenNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 16px; max-width: 300px; margin: 0 auto; }
          .token-card { border: 2px dashed #333; padding: 20px; text-align: center; }
          .token-number { font-size: 64px; font-weight: 800; color: #0d9488; margin: 12px 0; line-height: 1; }
          .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
          .value { font-size: 14px; font-weight: 600; color: #222; margin-top: 2px; }
          .divider { border-top: 1px dashed #ccc; margin: 12px 0; }
          .header { font-size: 16px; font-weight: 700; color: #333; }
          .sub { font-size: 11px; color: #888; margin-top: 4px; }
          .queue-link { font-size: 10px; color: #0d9488; word-break: break-all; margin-top: 4px; }
          .footer { font-size: 10px; color: #999; margin-top: 16px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="token-card">
          <div class="header">OP Consultation Token</div>
          <div class="sub">${tokenData.date}</div>
          <div class="token-number">${tokenData.tokenNumber}</div>
          <div class="label">Patient</div>
          <div class="value">${tokenData.patientName}</div>
          <div class="label">Phone</div>
          <div class="value">${tokenData.phone}</div>
          <div class="divider"></div>
          <div class="label">Department</div>
          <div class="value">${tokenData.departmentName}</div>
          <div class="label">Doctor</div>
          <div class="value">Dr. ${tokenData.doctorName}</div>
          <div class="label">Visit Type</div>
          <div class="value">${tokenData.visitType}</div>
          <div class="divider"></div>
          <div class="label">Track your queue online</div>
          <div class="queue-link">${queueUrl}</div>
          <div class="footer">Please wait for your token to be called</div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleStatusChange = (visit: OpVisitWithDetails, newStatus: string) => {
    if (newStatus === "in_consultation") {
      setSelectedVisit(visit);
      setConsultForm({
        symptoms: visit.symptoms || "",
        diagnosis: visit.diagnosis || "",
        notes: visit.notes || "",
      });
      setIsConsultationOpen(true);
    } else if (newStatus === "completed") {
      setSelectedVisit(visit);
      setCompleteForm({
        consultationFee: String(Number(visit.consultationFee) || 500),
        paymentMode: "cash",
      });
      setIsCompleteOpen(true);
    } else {
      updateVisitMutation.mutate({ id: visit.id, data: { status: newStatus } });
    }
  };

  const handleSaveConsultation = () => {
    if (!selectedVisit) return;
    updateVisitMutation.mutate({
      id: selectedVisit.id,
      data: {
        status: "in_consultation",
        symptoms: consultForm.symptoms,
        diagnosis: consultForm.diagnosis,
        notes: consultForm.notes,
      },
    });
    setIsConsultationOpen(false);
    setSelectedVisit(null);
  };

  const handleComplete = () => {
    if (!selectedVisit) return;
    completeVisitMutation.mutate({
      id: selectedVisit.id,
      data: {
        consultationFee: completeForm.consultationFee,
        paymentMode: completeForm.paymentMode,
      },
    });
  };

  const collectPaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/op-pos/op-visits/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
      toast({ title: "Payment Collected", description: "Payment has been recorded successfully" });
      setIsPaymentOpen(false);
      setSelectedVisit(null);
    },
  });

  const handleCollectPayment = () => {
    if (!selectedVisit) return;
    collectPaymentMutation.mutate({
      id: selectedVisit.id,
      data: {
        consultationFee: paymentForm.consultationFee,
        paymentMode: paymentForm.paymentMode,
        paymentStatus: paymentForm.paymentMode === "unpaid" ? "unpaid" : "paid",
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">OP POS</h1>
          <p className="text-muted-foreground">Out-Patient Management Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Calendar className="h-4 w-4 mr-2" />
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </Badge>
          <Button onClick={() => refetchVisits()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsRegistrationOpen(true)} data-testid="button-new-op">
            <UserPlus className="h-4 w-4 mr-2" />
            New OP
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover-elevate" onClick={() => setQueueFilter("active")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{queueStats.booked + queueStats.waiting + queueStats.inConsultation}</p>
              <p className="text-xs text-muted-foreground">Active Queue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setQueueFilter("waiting")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{queueStats.waiting}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setQueueFilter("in_consultation")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500/10">
              <Stethoscope className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{queueStats.inConsultation}</p>
              <p className="text-xs text-muted-foreground">In Consultation</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setQueueFilter("completed")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{queueStats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setQueueFilter("all")}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-muted">
              <Ticket className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{queueStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            OP Queue
            <Badge variant="outline" className="ml-2">
              {queueFilter === "all" ? "All" : queueFilter === "active" ? "Active" : queueFilter.replace("_", " ")}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg">
              Next Token: #{nextToken?.nextToken || 1}
            </Badge>
            <div className="flex rounded-md border overflow-hidden">
              <Button
                size="sm"
                variant={viewMode === "list" ? "default" : "ghost"}
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "cards" ? "default" : "ghost"}
                className="rounded-none h-8 px-2"
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visitsLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sortedFilteredVisits.length === 0 ? (
            <div className="text-center p-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No patients in queue</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click "New OP" to register a walk-in patient
              </p>
              <Button onClick={() => setIsRegistrationOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Register Patient
              </Button>
            </div>
          ) : viewMode === "cards" ? (
            /* ── Cards View ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedFilteredVisits.map((visit) => (
                <Card key={visit.id} className="overflow-hidden" data-testid={`op-visit-${visit.id}`}>
                  <div className={`h-1.5 ${
                    visit.status === "in_consultation" ? "bg-purple-500" :
                    visit.status === "waiting" ? "bg-amber-400" :
                    visit.status === "completed" ? "bg-emerald-500" :
                    visit.status === "cancelled" ? "bg-red-400" : "bg-blue-400"
                  }`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-primary/10 shrink-0">
                        <span className="text-[10px] text-muted-foreground">Token</span>
                        <span className="text-2xl font-bold text-primary leading-tight">#{visit.tokenNumber}</span>
                      </div>
                      <div className="flex-1 ml-3 min-w-0">
                        <p className="font-semibold truncate">
                          {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />{visit.patient?.phone}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {getStatusBadge(visit.status)}
                          {visit.paymentStatus === "paid" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0.5" data-testid={`badge-paid-${visit.id}`}>
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                              Paid{visit.paymentMode ? ` · ${visit.paymentMode}` : ""}
                            </Badge>
                          ) : (
                            <Badge
                              className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-amber-500/20"
                              onClick={() => { setSelectedVisit(visit); setPaymentForm({ consultationFee: String(Number(visit.consultationFee) || 500), paymentMode: "cash" }); setIsPaymentOpen(true); }}
                              data-testid={`badge-unpaid-${visit.id}`}
                            >
                              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                              Unpaid
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {(visit.doctor || visit.department) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Stethoscope className="h-3 w-3 shrink-0" />
                        {visit.doctor ? (visit.doctor.name.startsWith("Dr") ? visit.doctor.name : `Dr. ${visit.doctor.name}`) : visit.department?.name}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {visit.status === "booked" && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(visit, "waiting")}>
                          <ArrowRight className="h-3 w-3 mr-1" />Check-in
                        </Button>
                      )}
                      {visit.status === "waiting" && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(visit, "in_consultation")}>
                          <Stethoscope className="h-3 w-3 mr-1" />Start
                        </Button>
                      )}
                      {visit.status === "in_consultation" && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleStatusChange(visit, "completed")}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                        </Button>
                      )}
                      {["booked", "waiting"].includes(visit.status) && visit.paymentStatus !== "paid" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                          setSelectedVisit(visit);
                          setPaymentForm({ consultationFee: String(Number(visit.consultationFee) || 500), paymentMode: "cash" });
                          setIsPaymentOpen(true);
                        }}>
                          <IndianRupee className="h-3 w-3 mr-1" />Pay
                        </Button>
                      )}
                      {["booked", "waiting"].includes(visit.status) && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => moveToken(visit, "up")} title="Move up">
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => moveToken(visit, "down")} title="Move down">
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleCancelToken(visit)} title="Cancel token">
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* ── List View ── */
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {sortedFilteredVisits.map((visit) => {
                  const movable = sortedFilteredVisits.filter(v => ["booked", "waiting"].includes(v.status));
                  const movableIdx = movable.findIndex(v => v.id === visit.id);
                  const canMoveUp = movableIdx > 0;
                  const canMoveDown = movableIdx >= 0 && movableIdx < movable.length - 1;

                  return (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                      data-testid={`op-visit-${visit.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-primary/10">
                          <span className="text-xs text-muted-foreground">Token</span>
                          <span className="text-2xl font-bold text-primary">#{visit.tokenNumber}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown"}
                            </h4>
                            {getStatusBadge(visit.status)}
                            {visit.source === "online" && (
                              <Badge data-testid={`badge-online-${visit.id}`} className="bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-600/20 text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                Online
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {visit.visitType === "new" ? "New" : "Follow-up"}
                            </Badge>
                            {visit.paymentStatus === "paid" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-1.5 py-0.5">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Paid{visit.paymentMode ? ` · ${visit.paymentMode}` : ""}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-1.5 py-0.5 cursor-pointer hover:bg-amber-500/20"
                                onClick={() => { setSelectedVisit(visit); setPaymentForm({ fee: visit.consultationFee || "", mode: "cash" }); setIsPaymentOpen(true); }}>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unpaid
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {visit.patient?.phone}
                            </span>
                            {visit.department && (
                              <span>{visit.department.name}</span>
                            )}
                            {visit.doctor && (
                              <span className="flex items-center gap-1">
                                <Stethoscope className="h-3 w-3" />
                                {visit.doctor.name.startsWith("Dr") ? visit.doctor.name : `Dr. ${visit.doctor.name}`}
                              </span>
                            )}
                            {visit.scheduledTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {visit.scheduledTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {visit.status === "booked" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(visit, "waiting")}
                            data-testid={`button-check-in-${visit.id}`}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Check-in
                          </Button>
                        )}
                        {["booked", "waiting"].includes(visit.status) && visit.paymentStatus !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVisit(visit);
                              setPaymentForm({
                                consultationFee: String(Number(visit.consultationFee) || 500),
                                paymentMode: "cash",
                              });
                              setIsPaymentOpen(true);
                            }}
                            data-testid={`button-collect-payment-${visit.id}`}
                          >
                            <IndianRupee className="h-4 w-4 mr-1" />
                            Collect Payment
                          </Button>
                        )}
                        {["booked", "waiting"].includes(visit.status) && visit.paymentStatus === "paid" && (
                          <Badge data-testid={`status-payment-paid-${visit.id}`} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        )}
                        {visit.status === "waiting" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(visit, "in_consultation")}
                            data-testid={`button-start-consultation-${visit.id}`}
                          >
                            <Stethoscope className="h-4 w-4 mr-1" />
                            Start Consultation
                          </Button>
                        )}
                        {visit.status === "in_consultation" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(visit, "completed")}
                            data-testid={`button-complete-${visit.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {["booked", "waiting"].includes(visit.status) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0"
                              disabled={!canMoveUp}
                              onClick={() => moveToken(visit, "up")}
                              title="Move up in queue"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-8 h-8 p-0"
                              disabled={!canMoveDown}
                              onClick={() => moveToken(visit, "down")}
                              title="Move down in queue"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancelToken(visit)}
                              title="Cancel token"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRegistrationOpen} onOpenChange={setIsRegistrationOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              New OP Registration
            </DialogTitle>
            <DialogDescription>
              Quick registration for walk-in patients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Phone Number *</Label>
                <Input
                  placeholder="Enter phone number"
                  value={regForm.phone}
                  onChange={(e) => {
                    setRegForm({ ...regForm, phone: e.target.value });
                    setPhoneSearch(e.target.value);
                  }}
                  data-testid="input-phone-search"
                />
              </div>
              <Button
                className="mt-6"
                variant="outline"
                onClick={handlePhoneLookup}
                disabled={regForm.phone.length < 10}
                data-testid="button-phone-lookup"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <div>
              <Label>Patient Name *</Label>
              <Input
                placeholder="Full Name"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                data-testid="input-patient-name"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Age</Label>
                <Input
                  placeholder="Age"
                  type="number"
                  value={regForm.age}
                  onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                  data-testid="input-age"
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={regForm.gender} onValueChange={(v) => setRegForm({ ...regForm, gender: v })}>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Department</Label>
              <Select value={regForm.departmentId} onValueChange={(v) => setRegForm({ ...regForm, departmentId: v })}>
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Doctor (Optional)</Label>
              <Select value={regForm.doctorId} onValueChange={(v) => setRegForm({ ...regForm, doctorId: v })}>
                <SelectTrigger data-testid="select-doctor">
                  <SelectValue placeholder="Select Doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors
                    .filter(d => !regForm.departmentId || d.departmentId === regForm.departmentId)
                    .map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.name} {doc.specialization && `(${doc.specialization})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Visit Type</Label>
              <Select value={regForm.visitType} onValueChange={(v) => setRegForm({ ...regForm, visitType: v })}>
                <SelectTrigger data-testid="select-visit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Visit</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" />
                  Consultation Fee
                </Label>
                <span className="text-sm font-semibold">
                  ₹{departments.find(d => d.id === regForm.departmentId)?.consultationFee ||
                     doctors.find(d => d.id === regForm.doctorId)?.consultationFee || "500"}
                </span>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Payment Mode</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "cash", label: "Cash", icon: Banknote },
                    { value: "upi", label: "UPI", icon: CreditCard },
                    { value: "card", label: "Card", icon: CreditCard },
                    { value: "unpaid", label: "Unpaid", icon: AlertCircle },
                  ].map((mode) => (
                    <Button
                      key={mode.value}
                      type="button"
                      variant={regForm.paymentMode === mode.value ? "default" : "outline"}
                      size="sm"
                      className="flex flex-col h-auto py-2 gap-1"
                      onClick={() => setRegForm({ ...regForm, paymentMode: mode.value })}
                      data-testid={`button-reg-payment-${mode.value}`}
                    >
                      <mode.icon className="h-3.5 w-3.5" />
                      <span className="text-xs">{mode.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRegistrationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!regForm.name.trim() || !regForm.phone.trim()}
              data-testid="button-register-op"
            >
              {(createVisitMutation.isPending || createPatientMutation.isPending) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4 mr-2" />
              )}
              {regForm.paymentMode === "unpaid" ? "Register (Unpaid)" : "Register & Collect Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConsultationOpen} onOpenChange={setIsConsultationOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Start Consultation
            </DialogTitle>
            <DialogDescription>
              {selectedVisit?.patient && `Patient: ${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Symptoms / Chief Complaint</Label>
              <Textarea
                placeholder="Enter patient symptoms..."
                value={consultForm.symptoms}
                onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })}
                rows={3}
                data-testid="input-symptoms"
              />
            </div>
            <div>
              <Label>Diagnosis</Label>
              <Textarea
                placeholder="Enter diagnosis..."
                value={consultForm.diagnosis}
                onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
                rows={2}
                data-testid="input-diagnosis"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={consultForm.notes}
                onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })}
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConsultationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConsultation} disabled={updateVisitMutation.isPending}>
              {updateVisitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Consultation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Complete Consultation
            </DialogTitle>
            <DialogDescription>
              {selectedVisit?.patient && `Patient: ${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Consultation Fee</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-10"
                  value={completeForm.consultationFee}
                  onChange={(e) => setCompleteForm({ ...completeForm, consultationFee: e.target.value })}
                  data-testid="input-consultation-fee"
                />
              </div>
            </div>
            <div>
              <Label>Payment Mode</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { value: "cash", label: "Cash", icon: Banknote },
                  { value: "upi", label: "UPI", icon: CreditCard },
                  { value: "card", label: "Card", icon: CreditCard },
                  { value: "unpaid", label: "Unpaid", icon: AlertCircle },
                ].map((mode) => (
                  <Button
                    key={mode.value}
                    variant={completeForm.paymentMode === mode.value ? "default" : "outline"}
                    className="flex flex-col h-auto py-3"
                    onClick={() => setCompleteForm({ ...completeForm, paymentMode: mode.value })}
                    data-testid={`button-payment-${mode.value}`}
                  >
                    <mode.icon className="h-5 w-5 mb-1" />
                    <span className="text-xs">{mode.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={completeVisitMutation.isPending}>
              {completeVisitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete & Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Collect Payment
            </DialogTitle>
            <DialogDescription>
              {selectedVisit?.patient && `Patient: ${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName} | Token #${selectedVisit.tokenNumber}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Consultation Fee</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  className="pl-10"
                  value={paymentForm.consultationFee}
                  onChange={(e) => setPaymentForm({ ...paymentForm, consultationFee: e.target.value })}
                  data-testid="input-payment-fee"
                />
              </div>
            </div>
            <div>
              <Label>Payment Mode</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { value: "cash", label: "Cash", icon: Banknote },
                  { value: "upi", label: "UPI", icon: CreditCard },
                  { value: "card", label: "Card", icon: CreditCard },
                  { value: "unpaid", label: "Unpaid", icon: AlertCircle },
                ].map((mode) => (
                  <Button
                    key={mode.value}
                    variant={paymentForm.paymentMode === mode.value ? "default" : "outline"}
                    className="flex flex-col h-auto py-3"
                    onClick={() => setPaymentForm({ ...paymentForm, paymentMode: mode.value })}
                    data-testid={`button-recv-payment-${mode.value}`}
                  >
                    <mode.icon className="h-5 w-5 mb-1" />
                    <span className="text-xs">{mode.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCollectPayment} disabled={collectPaymentMutation.isPending}>
              {collectPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Collect Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Cancel Token
            </DialogTitle>
            <DialogDescription>
              {visitToCancel && (
                <>
                  Cancel Token #{visitToCancel.tokenNumber} for{" "}
                  <strong>
                    {visitToCancel.patient
                      ? `${visitToCancel.patient.firstName} ${visitToCancel.patient.lastName}`
                      : "this patient"}
                  </strong>
                  ? This cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelConfirmOpen(false)}>
              Keep Token
            </Button>
            <Button variant="destructive" onClick={confirmCancelToken} disabled={updateVisitMutation.isPending}>
              {updateVisitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTokenDialogOpen} onOpenChange={setIsTokenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Token Generated
            </DialogTitle>
            <DialogDescription>
              Registration successful. Print or share the token with the patient.
            </DialogDescription>
          </DialogHeader>
          {tokenData && (
            <div className="space-y-4">
              <div ref={tokenPrintRef} className="border rounded-md p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">{tokenData.date}</p>
                <div className="text-7xl font-extrabold leading-none" data-testid="text-token-number">
                  {tokenData.tokenNumber}
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Token Number</p>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-left text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Patient</p>
                    <p className="font-medium" data-testid="text-token-patient">{tokenData.patientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium" data-testid="text-token-phone">{tokenData.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-medium" data-testid="text-token-department">{tokenData.departmentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Doctor</p>
                    <p className="font-medium" data-testid="text-token-doctor">Dr. {tokenData.doctorName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Visit Type</p>
                    <p className="font-medium" data-testid="text-token-visit-type">{tokenData.visitType}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Track Queue Online</p>
                  <a
                    href={`/queue/${tokenData.orgId}/${tokenData.visitId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline break-all"
                    data-testid="link-queue-tracker"
                  >
                    {window.location.origin}/queue/{tokenData.orgId}/{tokenData.visitId}
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `${window.location.origin}/queue/${tokenData.orgId}/${tokenData.visitId}`;
                    navigator.clipboard.writeText(url);
                    toast({ title: "Copied", description: "Queue tracking link copied to clipboard" });
                  }}
                  data-testid="button-copy-queue-link"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`/queue/${tokenData.orgId}/${tokenData.visitId}`, "_blank");
                  }}
                  data-testid="button-open-queue"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Queue
                </Button>
                <Button onClick={handlePrintToken} data-testid="button-print-token">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Token
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
