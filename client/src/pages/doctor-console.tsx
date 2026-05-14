import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Clock,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  Loader2,
  RefreshCw,
  Ticket,
  User,
  Pill,
  Plus,
  Trash2,
  FileText,
  AlertCircle,
  IndianRupee,
  Sparkles,
  Info,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Eye,
  Printer,
  MessageSquare,
  Mic,
  Square,
  Brain,
  Pencil,
  Check,
  X,
  FlaskConical,
  Heart,
  Activity,
  Globe,
  Video,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import type { Patient, Department, Doctor, OpVisit, Prescription, Organization } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface MedicineSuggestion {
  medicineName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  description: string;
  usage: string;
  category: string;
}

type OpVisitWithDetails = OpVisit & {
  patient?: Patient;
  doctor?: Doctor;
  department?: Department;
};

export default function DoctorConsole() {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  
  const [selectedVisit, setSelectedVisit] = useState<OpVisitWithDetails | null>(null);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  
  const [consultForm, setConsultForm] = useState({
    symptoms: "",
    diagnosis: "",
    notes: "",
  });
  
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicineName: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
    quantity: "",
  });
  
  type PrescriptionFormData = {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    quantity: string;
  };
  
  const [prescriptions, setPrescriptions] = useState<PrescriptionFormData[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<MedicineSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiTreatmentPlan, setAiTreatmentPlan] = useState("");
  const [showAiResults, setShowAiResults] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<{ index: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [vitalsForm, setVitalsForm] = useState({
    height: "",
    weight: "",
    bloodPressure: "",
    pulse: "",
    temperature: "",
    spO2: "",
  });
  const [showVitals, setShowVitals] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [prescriptionLanguage, setPrescriptionLanguage] = useState("");
  const [translatedPrescriptions, setTranslatedPrescriptions] = useState<Array<{
    medicineName: string;
    translatedMedicineName: string;
    translatedDosage: string;
    translatedFrequency: string;
    translatedDuration: string;
    translatedInstructions: string;
  }>>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [referralForm, setReferralForm] = useState({
    referredDoctorId: "",
    reason: "",
    priority: "normal",
    clinicalNotes: "",
  });

  useEffect(() => {
    if (!isConsultationOpen) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  }, [isConsultationOpen]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const [consultationStartTime, setConsultationStartTime] = useState<number | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  useEffect(() => {
    if (!consultationStartTime) { setElapsedMinutes(0); return; }
    const tick = () => setElapsedMinutes(Math.floor((Date.now() - consultationStartTime) / 60000));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [consultationStartTime]);

  const [isPrescriptionViewOpen, setIsPrescriptionViewOpen] = useState(false);
  const [visitToCancel, setVisitToCancel] = useState<OpVisitWithDetails | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [viewingVisit, setViewingVisit] = useState<OpVisitWithDetails | null>(null);

  const { data: orgData } = useQuery<{ organization: Organization }>({
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
    queryKey: ["/api/patients"],
    enabled: !!organization?.id,
  });

  type VideoConsultation = OpVisit & {
    doctorName?: string | null;
    patientName?: string | null;
    patientPhone?: string | null;
  };

  const { data: videoConsultations = [] } = useQuery<VideoConsultation[]>({
    queryKey: ["/api/op-pos/video-consultations", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/video-consultations?organizationId=${organization?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!organization?.id,
    refetchInterval: 30000,
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

  const visitsWithDetails: OpVisitWithDetails[] = useMemo(() => {
    return visits.map(visit => ({
      ...visit,
      patient: (visit as any).patient || patients.find(p => p.id === visit.patientId),
      doctor: (visit as any).doctor || doctors.find(d => d.id === visit.doctorId),
      department: (visit as any).department || departments.find(dept => dept.id === visit.departmentId),
    }));
  }, [visits, patients, doctors, departments]);

  const activeVisits = useMemo(() => {
    return visitsWithDetails.filter(v => ["waiting", "in_consultation"].includes(v.status));
  }, [visitsWithDetails]);

  const completedVisits = useMemo(() => {
    return visitsWithDetails.filter(v => v.status === "completed");
  }, [visitsWithDetails]);

  const sortedActiveVisits = useMemo(() => {
    return [...activeVisits].sort((a, b) => {
      const posA = a.queuePosition ?? a.tokenNumber;
      const posB = b.queuePosition ?? b.tokenNumber;
      return posA - posB;
    });
  }, [activeVisits]);

  const moveToken = (visit: OpVisitWithDetails, direction: "up" | "down") => {
    const movable = sortedActiveVisits.filter(v => v.status === "waiting");
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

  const updateVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/op-pos/op-visits/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
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

  const completeVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("POST", `/api/op-pos/op-visits/${id}/complete`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
      toast({ title: "Success", description: "Consultation completed!" });
      setIsConsultationOpen(false);
      setSelectedVisit(null);
      setPrescriptions([]);
    },
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/op-pos/prescriptions", data);
      return res.json();
    },
  });

  const saveVitalsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/op-pos/patient-vitals", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Vitals Saved", description: "Patient vitals recorded successfully." });
    },
  });

  const translateMutation = useMutation({
    mutationFn: async (data: { medicines: any[]; targetLanguage: string }) => {
      const res = await apiRequest("POST", "/api/op-pos/prescriptions/translate", data);
      return res.json();
    },
  });

  const createReferralMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/op-pos/doctor-referrals", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Referral Sent", description: "Doctor referral created successfully." });
      setShowReferralDialog(false);
      setReferralForm({ referredDoctorId: "", reason: "", priority: "normal", clinicalNotes: "" });
    },
  });

  const sendToPharmacyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVisit || !organization?.id) throw new Error("Missing data");
      const patient = selectedVisit.patient;
      const doctor = doctors.find((d) => d.id === selectedVisit.doctorId);
      const res = await apiRequest("POST", "/api/medlab/referrals", {
        organizationId: organization.id,
        sourceModule: "doclab",
        targetModule: "medlab",
        patientId: patient?.id ?? null,
        patientName: `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim() || "Unknown",
        patientPhone: patient?.phone ?? null,
        opVisitId: selectedVisit.id,
        doctorName: doctor ? (doctor.name.startsWith("Dr") ? doctor.name : `Dr. ${doctor.name}`) : null,
        referralType: "prescription",
        items: prescriptions.map((rx) => ({
          medicineName: rx.medicineName,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instructions: rx.instructions,
          quantity: rx.quantity ? parseInt(String(rx.quantity)) : null,
        })),
        notes: consultForm.notes || null,
        status: "sent",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sent to Pharmacy", description: "Prescription referral sent to pharmacy successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send prescription to pharmacy.", variant: "destructive" });
    },
  });

  const sendReferralMutation = useMutation({
    mutationFn: async (data: { targetModule: string; referralType: string }) => {
      if (!viewingVisit || !organization?.id) throw new Error("Missing data");
      const patient = viewingVisit.patient;
      const items = data.referralType === "prescription" 
        ? viewingPrescriptions.map(rx => ({
            medicineName: rx.medicineName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions,
            quantity: rx.quantity,
          }))
        : [{ testName: viewingVisit.diagnosis || "Lab test", notes: viewingVisit.notes }];
      
      const res = await apiRequest("POST", "/api/medlab/referrals", {
        organizationId: organization.id,
        referralNumber: `REF-${Date.now()}`,
        sourceModule: "doclab",
        targetModule: data.targetModule,
        patientId: patient?.id || null,
        patientName: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim(),
        patientPhone: patient?.phone || null,
        opVisitId: viewingVisit.id,
        doctorName: viewingVisit.doctor?.name ? `Dr. ${viewingVisit.doctor.name}` : null,
        referralType: data.referralType,
        items,
        notes: viewingVisit.notes || null,
        status: "sent",
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      const target = variables.targetModule === "medlab" ? "Pharmacy" : "Lab";
      toast({ title: "Sent!", description: `Prescription sent to ${target} successfully.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send referral.", variant: "destructive" });
    },
  });

  const { data: viewingPrescriptions = [], isLoading: prescriptionsLoading } = useQuery<Prescription[]>({
    queryKey: ["/api/op-pos/op-visits", viewingVisit?.id, "prescriptions"],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/op-visits/${viewingVisit?.id}/prescriptions`);
      if (!res.ok) throw new Error("Failed to fetch prescriptions");
      return res.json();
    },
    enabled: !!viewingVisit?.id,
  });

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = (heightCm: string, weightKg: string): string => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) return "";
    const heightM = h / 100;
    return (w / (heightM * heightM)).toFixed(1);
  };

  const openPrescriptionView = (visit: OpVisitWithDetails) => {
    setViewingVisit(visit);
    setIsPrescriptionViewOpen(true);
  };

  const generatePrescriptionPDF = () => {
    if (!viewingVisit || !organization) return;
    const patient = viewingVisit.patient;
    const doctor = viewingVisit.doctor;
    const rxList = viewingPrescriptions;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription - ${patient?.firstName || ''} ${patient?.lastName || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #1a1a1a; }
          .header p { margin: 5px 0; color: #666; }
          .patient-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .patient-info div { margin-bottom: 10px; }
          .rx-symbol { font-size: 24px; font-weight: bold; margin: 20px 0; }
          .prescription-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .prescription-table th, .prescription-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .prescription-table th { background: #f5f5f5; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
          .signature { margin-top: 60px; text-align: right; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${organization.name}</h1>
          <p>${organization.address || ''}</p>
          <p>Phone: ${organization.phone || ''}</p>
        </div>
        <div class="patient-info">
          <div>
            <strong>Patient:</strong> ${patient?.firstName || ''} ${patient?.lastName || ''}<br/>
            <strong>Age/Gender:</strong> ${patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : '-'} / ${patient?.gender || '-'}<br/>
            <strong>Phone:</strong> ${patient?.phone || '-'}
          </div>
          <div>
            <strong>Date:</strong> ${viewingVisit.createdAt ? new Date(viewingVisit.createdAt).toLocaleDateString() : ''}<br/>
            <strong>Token:</strong> #${viewingVisit.tokenNumber}<br/>
            <strong>Doctor:</strong> ${doctor?.name ? 'Dr. ' + doctor.name : '-'}<br/>
            ${doctor?.specialization ? '<strong>Specialization:</strong> ' + doctor.specialization : ''}
          </div>
        </div>
        ${viewingVisit.symptoms ? '<p><strong>Symptoms:</strong> ' + viewingVisit.symptoms + '</p>' : ''}
        ${viewingVisit.diagnosis ? '<p><strong>Diagnosis:</strong> ' + viewingVisit.diagnosis + '</p>' : ''}
        <div class="rx-symbol">&#8478;</div>
        ${rxList.length > 0 ? '<table class="prescription-table"><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead><tbody>' + rxList.map((p, i) => '<tr><td>' + (i + 1) + '</td><td>' + p.medicineName + '</td><td>' + (p.dosage || '-') + '</td><td>' + (p.frequency || '-') + '</td><td>' + (p.duration || '-') + '</td><td>' + (p.instructions || '-') + '</td></tr>').join('') + '</tbody></table>' : '<p>No prescriptions</p>'}
        ${viewingVisit.notes ? '<p><strong>Notes:</strong> ' + viewingVisit.notes + '</p>' : ''}
        <div class="signature">
          <p>_______________________</p>
          <p>${doctor?.name ? 'Dr. ' + doctor.name : 'Doctor Signature'}</p>
          ${doctor?.specialization ? '<p>' + doctor.specialization + '</p>' : ''}
        </div>
        <div class="footer">
          <p style="text-align: center; color: #666; font-size: 12px;">
            This is a computer generated prescription from ${organization.name}
          </p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const shareWhatsApp = () => {
    if (!viewingVisit || !organization) return;
    const patient = viewingVisit.patient;
    const rxList = viewingPrescriptions;

    const prescriptionText = rxList.map((p, i) =>
      `${i + 1}. ${p.medicineName} - ${p.dosage || ''} ${p.frequency || ''} ${p.duration || ''} ${p.instructions ? '(' + p.instructions + ')' : ''}`
    ).join('\n') || 'No prescriptions';

    const message = `Prescription from ${organization.name}\n` +
      `Patient: ${patient?.firstName || ''} ${patient?.lastName || ''}\n` +
      `Doctor: ${viewingVisit.doctor?.name ? 'Dr. ' + viewingVisit.doctor.name : '-'}\n` +
      `Date: ${viewingVisit.createdAt ? new Date(viewingVisit.createdAt).toLocaleDateString() : ''}\n` +
      `Token: #${viewingVisit.tokenNumber}\n\n` +
      `${viewingVisit.symptoms ? 'Symptoms: ' + viewingVisit.symptoms + '\n' : ''}` +
      `${viewingVisit.diagnosis ? 'Diagnosis: ' + viewingVisit.diagnosis + '\n' : ''}\n` +
      `Medicines:\n${prescriptionText}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const openConsultation = (visit: OpVisitWithDetails) => {
    // Prevent opening if another patient is already in consultation
    const alreadyActive = visitsWithDetails.find(
      v => v.status === "in_consultation" && v.id !== visit.id
    );
    if (alreadyActive) {
      const name = alreadyActive.patient
        ? `${alreadyActive.patient.firstName} ${alreadyActive.patient.lastName}`
        : `Token #${alreadyActive.tokenNumber}`;
      toast({
        title: "Consultation already in progress",
        description: `${name} is currently in consultation. Complete or cancel that consultation first.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedVisit(visit);
    setConsultForm({
      symptoms: visit.symptoms || "",
      diagnosis: visit.diagnosis || "",
      notes: visit.notes || "",
    });
    setConsultationStartTime(Date.now());
    setPrescriptions([]);
    setAiSuggestions([]);
    setShowSuggestions(false);
    setAiTranscript("");
    setAiSummary("");
    setAiTreatmentPlan("");
    setShowAiResults(false);
    setIsRecording(false);
    setIsAnalyzing(false);
    setRecordingDuration(0);
    setEditingPrescription(null);
    setVitalsForm({ height: "", weight: "", bloodPressure: "", pulse: "", temperature: "", spO2: "" });
    setShowVitals(false);
    setFollowUpDate("");
    setPrescriptionLanguage("");
    setTranslatedPrescriptions([]);
    setIsConsultationOpen(true);

    if (visit.status === "waiting") {
      updateVisitMutation.mutate({
        id: visit.id,
        data: { status: "in_consultation", consultationStartedAt: new Date().toISOString() },
      });
    }
  };

  const handleCancelConsultation = () => {
    // Reset patient back to waiting when doctor cancels without completing
    if (selectedVisit && selectedVisit.status === "in_consultation") {
      updateVisitMutation.mutate({
        id: selectedVisit.id,
        data: { status: "waiting", consultationStartedAt: null },
      });
    }
    setIsConsultationOpen(false);
    setSelectedVisit(null);
    setConsultationStartTime(null);
  };

  const fetchAiSuggestions = useCallback(async () => {
    if (!consultForm.symptoms.trim()) {
      toast({ title: "Enter symptoms first", description: "Please enter the patient's symptoms before requesting AI suggestions", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    setShowSuggestions(true);
    try {
      const res = await apiRequest("POST", "/api/ai/suggest-medicines", {
        symptoms: consultForm.symptoms,
        diagnosis: consultForm.diagnosis || undefined,
        searchQuery: prescriptionForm.medicineName || undefined,
      });
      const data = await res.json();
      setAiSuggestions(data.medicines || []);
    } catch (err) {
      console.error("AI suggestion error:", err);
      toast({ title: "AI Error", description: "Could not fetch medicine suggestions. Please try again.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }, [consultForm.symptoms, consultForm.diagnosis, prescriptionForm.medicineName]);

  const selectSuggestion = (suggestion: MedicineSuggestion) => {
    setPrescriptionForm({
      ...prescriptionForm,
      medicineName: suggestion.medicineName,
      dosage: suggestion.dosage,
      frequency: suggestion.frequency,
      duration: suggestion.duration,
      instructions: suggestion.usage,
    });
    setShowSuggestions(false);
  };

  const addSuggestionDirectly = (suggestion: MedicineSuggestion) => {
    if (!suggestion.medicineName) return;
    setPrescriptions([...prescriptions, {
      medicineName: suggestion.medicineName,
      dosage: suggestion.dosage || "",
      frequency: suggestion.frequency || "",
      duration: suggestion.duration || "",
      instructions: suggestion.usage || "",
      quantity: "",
    }]);
    toast({ title: "Medicine Added", description: `${suggestion.medicineName} added to prescription` });
  };

  const addPrescription = () => {
    if (!prescriptionForm.medicineName) {
      toast({ title: "Error", description: "Medicine name is required", variant: "destructive" });
      return;
    }
    
    setPrescriptions([...prescriptions, { ...prescriptionForm }]);
    setPrescriptionForm({
      medicineName: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      quantity: "",
    });
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const startEditPrescription = (index: number, field: string) => {
    const rx = prescriptions[index];
    setEditingPrescription({ index, field });
    setEditValue((rx as any)[field] || "");
  };

  const saveEditPrescription = () => {
    if (!editingPrescription) return;
    const { index, field } = editingPrescription;
    if (field === "medicineName" && !editValue.trim()) {
      cancelEditPrescription();
      return;
    }
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: editValue };
    setPrescriptions(updated);
    setEditingPrescription(null);
    setEditValue("");
  };

  const cancelEditPrescription = () => {
    setEditingPrescription(null);
    setEditValue("");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      toast({ title: "Recording Started", description: "AI is listening to the consultation..." });
    } catch (err) {
      console.error("Microphone access error:", err);
      toast({ title: "Microphone Error", description: "Could not access your microphone. Please allow microphone access and try again.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    return new Promise<Blob>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        resolve(new Blob());
        return;
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        resolve(audioBlob);
      };

      mediaRecorder.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    });
  };

  const handleStopAndAnalyze = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob.size === 0) {
      toast({ title: "No Audio", description: "No audio was recorded. Please try again.", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64Data = dataUrl.split(",")[1] || "";
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const patient = selectedVisit?.patient;
      const patientAge = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined;

      const res = await apiRequest("POST", "/api/ai/consultation-listen", {
        audio: base64,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
        patientAge,
        patientGender: patient?.gender || undefined,
        existingSymptoms: consultForm.symptoms || undefined,
        existingDiagnosis: consultForm.diagnosis || undefined,
      });

      const data = await res.json();

      setAiTranscript(data.transcript || "");
      setAiSummary(data.summary || "");
      setAiTreatmentPlan(data.treatmentPlan || "");
      setShowAiResults(true);

      if (data.symptoms) {
        setConsultForm((prev) => ({
          ...prev,
          symptoms: prev.symptoms ? `${prev.symptoms}\n${data.symptoms}` : data.symptoms,
        }));
      }
      if (data.diagnosis) {
        setConsultForm((prev) => ({
          ...prev,
          diagnosis: prev.diagnosis ? `${prev.diagnosis}\n${data.diagnosis}` : data.diagnosis,
        }));
      }
      if (data.notes) {
        setConsultForm((prev) => ({
          ...prev,
          notes: prev.notes ? `${prev.notes}\n${data.notes}` : data.notes,
        }));
      }

      if (data.medicines && data.medicines.length > 0) {
        setAiSuggestions(data.medicines);
        setShowSuggestions(true);
      }

      toast({ title: "AI Analysis Complete", description: "Consultation analyzed. Review the suggestions below." });
    } catch (err: any) {
      console.error("Consultation analysis error:", err?.message || err);
      toast({ title: "Analysis Failed", description: err?.message || "Could not analyze the consultation. Please try again.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleComplete = async () => {
    if (!selectedVisit || !organization?.id) return;
    
    await updateVisitMutation.mutateAsync({
      id: selectedVisit.id,
      data: {
        symptoms: consultForm.symptoms,
        diagnosis: consultForm.diagnosis,
        notes: consultForm.notes,
      },
    });
    
    for (const prescription of prescriptions) {
      await createPrescriptionMutation.mutateAsync({
        opVisitId: selectedVisit.id,
        organizationId: organization.id,
        medicineName: prescription.medicineName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions,
        quantity: prescription.quantity ? parseInt(prescription.quantity as unknown as string) : null,
        followUpDate: followUpDate || null,
        language: prescriptionLanguage || null,
      });
    }
    
    await completeVisitMutation.mutateAsync({
      id: selectedVisit.id,
      data: {},
    });
  };

  // ── Full-page consultation workspace ────────────────────────────────────────
  if (isConsultationOpen && selectedVisit) {
    const consultationPatient = selectedVisit.patient;
    const consultationAge = consultationPatient?.dateOfBirth ? calculateAge(consultationPatient.dateOfBirth) : null;

    return (
      <div className="flex flex-col h-full">
        {/* ── Header bar ─────────────────────────────────────────────────────── */}
        <div className="border-b bg-background px-4 py-3 flex items-center gap-3 flex-shrink-0 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelConsultation}
            className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Queue
          </Button>
          <div className="h-5 w-px bg-border shrink-0" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold truncate text-sm">
                {consultationPatient
                  ? `${consultationPatient.firstName} ${consultationPatient.lastName}`
                  : "Unknown Patient"}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {consultationPatient?.phone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="h-3 w-3" />
                    {consultationPatient.phone}
                  </span>
                )}
                {consultationAge !== null && <span>{consultationAge}y</span>}
                {consultationPatient?.gender && (
                  <span>
                    {consultationPatient.gender === "male"
                      ? "Male"
                      : consultationPatient.gender === "female"
                      ? "Female"
                      : "Other"}
                  </span>
                )}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0">
              <Ticket className="h-3 w-3 mr-1" />#{selectedVisit.tokenNumber}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
              <Stethoscope className="h-3 w-3 mr-1" />
              In Consultation
              {elapsedMinutes > 0 && <span className="ml-1 opacity-70">· {elapsedMinutes}m</span>}
            </Badge>
            {selectedVisit.doctor && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                Dr. {selectedVisit.doctor.name}
              </span>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>

        {/* ── Two-column body ──────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left sidebar: AI Listener + Vitals ──────────────────────────── */}
          <div className="w-72 xl:w-80 flex-shrink-0 border-r overflow-y-auto p-4 space-y-4 bg-muted/10">

            {/* AI Consultation Listener */}
            <Card className={`border-2 ${isRecording ? "border-red-500 bg-red-500/5" : isAnalyzing ? "border-primary bg-primary/5" : "border-dashed"}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${isRecording ? "bg-red-500/10 animate-pulse" : isAnalyzing ? "bg-primary/10" : "bg-muted"}`}>
                      {isRecording ? (
                        <Mic className="h-4 w-4 text-red-500" />
                      ) : isAnalyzing ? (
                        <Brain className="h-4 w-4 text-primary animate-pulse" />
                      ) : (
                        <Mic className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        {isRecording ? "Listening..." : isAnalyzing ? "Analyzing..." : "AI Listener"}
                      </p>
                      {isRecording && (
                        <p className="text-xs text-red-500">{formatDuration(recordingDuration)}</p>
                      )}
                    </div>
                  </div>
                  {isRecording ? (
                    <Button variant="destructive" size="sm" onClick={handleStopAndAnalyze} data-testid="button-stop-recording">
                      <Square className="h-3 w-3 mr-1 fill-current" />
                      Stop
                    </Button>
                  ) : isAnalyzing ? (
                    <Button variant="outline" size="sm" disabled>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ...
                    </Button>
                  ) : (
                    <Button size="sm" onClick={startRecording} data-testid="button-start-recording">
                      <Mic className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
                {!isRecording && !isAnalyzing && (
                  <p className="text-xs text-muted-foreground">
                    Record the consultation and AI will auto-fill symptoms, diagnosis, and suggest medicines.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* AI Results */}
            {showAiResults && aiTranscript && (
              <Card>
                <CardHeader className="p-3 pb-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      AI Analysis
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setShowAiResults(false)}
                      data-testid="button-hide-ai-results"
                    >
                      Hide
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1 space-y-2">
                  <div className="p-2 rounded-md bg-muted/50 border">
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Transcript
                    </p>
                    <p className="text-xs max-h-[80px] overflow-y-auto" data-testid="text-ai-transcript">
                      {aiTranscript}
                    </p>
                  </div>
                  {aiSummary && (
                    <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                        <Brain className="h-3 w-3" /> Summary
                      </p>
                      <p className="text-xs" data-testid="text-ai-summary">{aiSummary}</p>
                    </div>
                  )}
                  {aiTreatmentPlan && (
                    <div className="p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" /> Treatment Plan
                      </p>
                      <p className="text-xs" data-testid="text-ai-treatment">{aiTreatmentPlan}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Patient Vitals */}
            <Card>
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Patient Vitals
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => setShowVitals(!showVitals)}
                    data-testid="button-toggle-vitals"
                  >
                    {showVitals ? "Hide" : "Record"}
                  </Button>
                </div>
              </CardHeader>
              {showVitals && (
                <CardContent className="p-3 pt-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Height (cm)</Label>
                      <Input
                        type="number"
                        placeholder="170"
                        value={vitalsForm.height}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, height: e.target.value })}
                        className="h-8 text-sm"
                        data-testid="input-vital-height"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
                      <Input
                        type="number"
                        placeholder="70"
                        value={vitalsForm.weight}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                        className="h-8 text-sm"
                        data-testid="input-vital-weight"
                      />
                    </div>
                    {vitalsForm.height && vitalsForm.weight && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">BMI</Label>
                        <Input
                          readOnly
                          value={calculateBMI(vitalsForm.height, vitalsForm.weight)}
                          className="h-8 text-sm bg-muted"
                          data-testid="input-vital-bmi"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">BP</Label>
                      <Input
                        placeholder="120/80"
                        value={vitalsForm.bloodPressure}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressure: e.target.value })}
                        className="h-8 text-sm"
                        data-testid="input-vital-bp"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Pulse (bpm)</Label>
                      <Input
                        type="number"
                        placeholder="72"
                        value={vitalsForm.pulse}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                        className="h-8 text-sm"
                        data-testid="input-vital-pulse"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Temp (°F)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="98.6"
                        value={vitalsForm.temperature}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                        className="h-8 text-sm"
                        data-testid="input-vital-temp"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">SpO2 (%)</Label>
                      <Input
                        type="number"
                        placeholder="98"
                        value={vitalsForm.spO2}
                        onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: e.target.value })}
                        className="h-8 text-sm"
                        data-testid="input-vital-spo2"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (!selectedVisit?.patient?.id || !organization?.id) return;
                      const bmi = calculateBMI(vitalsForm.height, vitalsForm.weight);
                      saveVitalsMutation.mutate({
                        organizationId: organization.id,
                        patientId: selectedVisit.patient.id,
                        opVisitId: selectedVisit.id,
                        height: vitalsForm.height || null,
                        weight: vitalsForm.weight || null,
                        bmi: bmi || null,
                        bloodPressure: vitalsForm.bloodPressure || null,
                        pulse: vitalsForm.pulse ? parseInt(vitalsForm.pulse) : null,
                        temperature: vitalsForm.temperature || null,
                        spO2: vitalsForm.spO2 ? parseInt(vitalsForm.spO2) : null,
                      });
                    }}
                    disabled={saveVitalsMutation.isPending}
                    data-testid="button-save-vitals"
                  >
                    {saveVitalsMutation.isPending ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <Heart className="h-3 w-3 mr-1.5" />
                    )}
                    Save Vitals
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>

          {/* ── Main consultation area ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Symptoms + Diagnosis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block font-medium">Symptoms / Chief Complaint</Label>
                <Textarea
                  placeholder="Enter patient symptoms or use AI Listener..."
                  value={consultForm.symptoms}
                  onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })}
                  rows={4}
                  data-testid="input-consult-symptoms"
                />
              </div>
              <div>
                <Label className="mb-1.5 block font-medium">Diagnosis</Label>
                <Textarea
                  placeholder="Enter diagnosis..."
                  value={consultForm.diagnosis}
                  onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
                  rows={4}
                  data-testid="input-consult-diagnosis"
                />
              </div>
            </div>

            <Separator />

            {/* Prescription */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Prescription
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAiSuggestions}
                  disabled={aiLoading}
                  data-testid="button-ai-suggest-medicines"
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  AI Suggest
                </Button>
              </div>

              {showSuggestions && (
                <div className="mb-4 border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 border-b flex-wrap">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      AI Medicine Suggestions
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(false)} data-testid="button-close-suggestions">
                      Close
                    </Button>
                  </div>
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Analyzing symptoms and finding medicines...</span>
                    </div>
                  ) : aiSuggestions.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No suggestions found. Try adding more details to the symptoms.
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto">
                      <div className="divide-y">
                        {aiSuggestions.map((suggestion, idx) => (
                          <div key={idx} className="p-3 hover-elevate cursor-pointer" data-testid={`suggestion-medicine-${idx}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{suggestion.medicineName}</span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{suggestion.category}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{suggestion.genericName}</p>
                                <p className="text-xs mt-1">{suggestion.description}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                  <span>Dosage: <strong className="text-foreground">{suggestion.dosage}</strong></span>
                                  <span>Freq: <strong className="text-foreground">{suggestion.frequency}</strong></span>
                                  <span>Duration: <strong className="text-foreground">{suggestion.duration}</strong></span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  {suggestion.usage}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                <Button size="sm" variant="outline" onClick={() => selectSuggestion(suggestion)} data-testid={`button-fill-suggestion-${idx}`}>Fill</Button>
                                <Button size="sm" onClick={() => addSuggestionDirectly(suggestion)} data-testid={`button-add-suggestion-${idx}`}>
                                  <Plus className="h-3 w-3 mr-1" />Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border bg-muted/20 p-3 mb-3 space-y-2">
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Medicine Name</Label>
                    <Input
                      placeholder="e.g. Dolo 650"
                      value={prescriptionForm.medicineName}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medicineName: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") addPrescription(); }}
                      data-testid="input-medicine-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Dosage</Label>
                    <Input
                      placeholder="650mg"
                      value={prescriptionForm.dosage}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") addPrescription(); }}
                      data-testid="input-dosage"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Frequency</Label>
                    <Input
                      placeholder="1-0-1"
                      value={prescriptionForm.frequency}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") addPrescription(); }}
                      data-testid="input-frequency"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <Input
                      placeholder="5 days"
                      value={prescriptionForm.duration}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") addPrescription(); }}
                      data-testid="input-duration"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addPrescription} className="w-full" data-testid="button-add-medicine">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Instructions <span className="text-muted-foreground/60">(optional)</span></Label>
                  <Input
                    placeholder="e.g. After food, with warm water"
                    value={prescriptionForm.instructions}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") addPrescription(); }}
                    data-testid="input-instructions"
                  />
                </div>
              </div>

              {prescriptions.length > 0 && (
                <div className="space-y-2">
                  {prescriptions.map((rx, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                      data-testid={`prescription-row-${index}`}
                    >
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingPrescription?.index === index && editingPrescription?.field === "medicineName" ? (
                            <div className="flex items-center gap-1">
                              <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveEditPrescription(); if (e.key === "Escape") cancelEditPrescription(); }}
                                onBlur={saveEditPrescription} className="h-7 text-sm font-semibold w-40" autoFocus data-testid={`edit-medicineName-${index}`} />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onMouseDown={(e) => { e.preventDefault(); saveEditPrescription(); }}><Check className="h-3 w-3 text-emerald-500" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onMouseDown={(e) => { e.preventDefault(); cancelEditPrescription(); }}><X className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          ) : (
                            <span
                              className="font-semibold text-sm text-primary cursor-pointer hover:underline flex items-center gap-1 group"
                              onClick={() => startEditPrescription(index, "medicineName")}
                              data-testid={`cell-medicineName-${index}`}
                            >
                              {rx.medicineName}
                              <Pencil className="h-3 w-3 text-muted-foreground invisible group-hover:visible" />
                            </span>
                          )}
                          {(["dosage", "frequency", "duration"] as const).map((field) => (
                            rx[field] ? (
                              editingPrescription?.index === index && editingPrescription?.field === field ? (
                                <div key={field} className="flex items-center gap-1">
                                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveEditPrescription(); if (e.key === "Escape") cancelEditPrescription(); }}
                                    onBlur={saveEditPrescription} className="h-6 text-xs w-20" autoFocus data-testid={`edit-${field}-${index}`} />
                                  <Button size="icon" variant="ghost" className="h-5 w-5" onMouseDown={(e) => { e.preventDefault(); saveEditPrescription(); }}><Check className="h-3 w-3 text-emerald-500" /></Button>
                                </div>
                              ) : (
                                <Badge
                                  key={field}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-muted"
                                  onClick={() => startEditPrescription(index, field)}
                                  data-testid={`cell-${field}-${index}`}
                                >
                                  {rx[field]}
                                </Badge>
                              )
                            ) : (
                              <Badge
                                key={field}
                                variant="outline"
                                className="text-xs text-muted-foreground cursor-pointer hover:bg-muted border-dashed"
                                onClick={() => startEditPrescription(index, field)}
                                data-testid={`cell-${field}-${index}`}
                              >
                                + {field === "dosage" ? "dose" : field === "frequency" ? "freq" : "dur"}
                              </Badge>
                            )
                          ))}
                        </div>
                        {(rx.instructions || (editingPrescription?.index === index && editingPrescription?.field === "instructions")) && (
                          <div className="text-xs text-muted-foreground">
                            {editingPrescription?.index === index && editingPrescription?.field === "instructions" ? (
                              <div className="flex items-center gap-1">
                                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveEditPrescription(); if (e.key === "Escape") cancelEditPrescription(); }}
                                  onBlur={saveEditPrescription} className="h-6 text-xs" autoFocus data-testid={`edit-instructions-${index}`} />
                                <Button size="icon" variant="ghost" className="h-5 w-5" onMouseDown={(e) => { e.preventDefault(); saveEditPrescription(); }}><Check className="h-3 w-3 text-emerald-500" /></Button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer hover:text-foreground flex items-center gap-1 group"
                                onClick={() => startEditPrescription(index, "instructions")}
                                data-testid={`cell-instructions-${index}`}
                              >
                                {rx.instructions}
                                <Pencil className="h-3 w-3 invisible group-hover:visible" />
                              </span>
                            )}
                          </div>
                        )}
                        {!rx.instructions && !(editingPrescription?.index === index && editingPrescription?.field === "instructions") && (
                          <span
                            className="text-xs text-muted-foreground/50 cursor-pointer hover:text-muted-foreground"
                            onClick={() => startEditPrescription(index, "instructions")}
                          >
                            + add instructions
                          </span>
                        )}
                        {translatedPrescriptions[index] && (
                          <div className="mt-2 pt-2 border-t border-dashed space-y-0.5">
                            <div className="flex items-center gap-1 mb-1">
                              <Globe className="h-3 w-3 text-blue-500" />
                              <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">{prescriptionLanguage}</span>
                            </div>
                            <p className="text-xs font-medium">{translatedPrescriptions[index].translatedMedicineName}</p>
                            <div className="flex flex-wrap gap-1">
                              {translatedPrescriptions[index].translatedDosage && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{translatedPrescriptions[index].translatedDosage}</Badge>
                              )}
                              {translatedPrescriptions[index].translatedFrequency && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{translatedPrescriptions[index].translatedFrequency}</Badge>
                              )}
                              {translatedPrescriptions[index].translatedDuration && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{translatedPrescriptions[index].translatedDuration}</Badge>
                              )}
                            </div>
                            {translatedPrescriptions[index].translatedInstructions && (
                              <p className="text-[11px] text-muted-foreground">{translatedPrescriptions[index].translatedInstructions}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removePrescription(index)}
                        data-testid={`button-remove-prescription-${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {prescriptions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Follow-up Date
                  </Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    className="mt-1"
                    data-testid="input-follow-up-date"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Translate Prescription
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Select value={prescriptionLanguage} onValueChange={(val) => { setPrescriptionLanguage(val); setTranslatedPrescriptions([]); }}>
                      <SelectTrigger data-testid="select-prescription-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hindi">Hindi</SelectItem>
                        <SelectItem value="telugu">Telugu</SelectItem>
                        <SelectItem value="tamil">Tamil</SelectItem>
                        <SelectItem value="kannada">Kannada</SelectItem>
                        <SelectItem value="malayalam">Malayalam</SelectItem>
                        <SelectItem value="bengali">Bengali</SelectItem>
                        <SelectItem value="marathi">Marathi</SelectItem>
                        <SelectItem value="gujarati">Gujarati</SelectItem>
                        <SelectItem value="punjabi">Punjabi</SelectItem>
                        <SelectItem value="odia">Odia</SelectItem>
                        <SelectItem value="urdu">Urdu</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        if (!prescriptionLanguage || prescriptions.length === 0) return;
                        setIsTranslating(true);
                        try {
                          const result = await translateMutation.mutateAsync({
                            medicines: prescriptions.map(p => ({
                              medicineName: p.medicineName,
                              dosage: p.dosage,
                              frequency: p.frequency,
                              duration: p.duration,
                              instructions: p.instructions,
                            })),
                            targetLanguage: prescriptionLanguage,
                          });
                          if (result.translations) {
                            setTranslatedPrescriptions(result.translations);
                            toast({ title: "Translated", description: `Prescription translated to ${prescriptionLanguage}` });
                          }
                        } catch (err) {
                          toast({ title: "Error", description: "Translation failed. Please try again.", variant: "destructive" });
                        } finally {
                          setIsTranslating(false);
                        }
                      }}
                      disabled={!prescriptionLanguage || isTranslating || prescriptions.length === 0}
                      data-testid="button-translate-prescription"
                    >
                      {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <Label>Clinical Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={consultForm.notes}
                onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })}
                rows={2}
                data-testid="input-consult-notes"
              />
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Status</Label>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                <Badge
                  className={
                    selectedVisit.paymentStatus === "paid"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }
                >
                  {selectedVisit.paymentStatus === "paid" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                  )}
                  {selectedVisit.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                </Badge>
                {selectedVisit.paymentMode && selectedVisit.paymentStatus === "paid" && (
                  <span className="text-sm text-muted-foreground capitalize">{selectedVisit.paymentMode}</span>
                )}
                {selectedVisit.consultationFee && (
                  <span className="text-sm font-medium flex items-center gap-0.5">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {Number(selectedVisit.consultationFee).toFixed(0)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">Collected at OP Reception</span>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setShowReferralDialog(true)} data-testid="button-refer-doctor">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Refer to Doctor
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendToPharmacyMutation.mutate()}
                  disabled={sendToPharmacyMutation.isPending || prescriptions.length === 0}
                  data-testid="button-send-to-pharmacy"
                >
                  {sendToPharmacyMutation.isPending
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Pill className="h-4 w-4 mr-2" />}
                  Send to Pharmacy
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCancelConsultation}>
                  Cancel
                </Button>
                <Button onClick={handleComplete} disabled={completeVisitMutation.isPending}>
                  {completeVisitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Consultation
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Referral dialog (portal — renders over the workspace) */}
        <Dialog open={showReferralDialog} onOpenChange={setShowReferralDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Refer to Another Doctor
              </DialogTitle>
              <DialogDescription>
                Refer this patient to another doctor within your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Refer To</Label>
                <Select value={referralForm.referredDoctorId} onValueChange={(v) => setReferralForm({ ...referralForm, referredDoctorId: v })}>
                  <SelectTrigger data-testid="select-referral-doctor">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.filter(d => d.id !== selectedVisit?.doctorId).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        Dr. {d.name} {d.specialization ? `(${d.specialization})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason for Referral</Label>
                <Textarea
                  placeholder="Why is this referral needed?"
                  value={referralForm.reason}
                  onChange={(e) => setReferralForm({ ...referralForm, reason: e.target.value })}
                  rows={2}
                  data-testid="input-referral-reason"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {["normal", "urgent", "emergency"].map((p) => (
                    <Button
                      key={p}
                      variant={referralForm.priority === p ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReferralForm({ ...referralForm, priority: p })}
                      data-testid={`button-priority-${p}`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Clinical Notes</Label>
                <Textarea
                  placeholder="Any clinical notes for the receiving doctor..."
                  value={referralForm.clinicalNotes}
                  onChange={(e) => setReferralForm({ ...referralForm, clinicalNotes: e.target.value })}
                  rows={2}
                  data-testid="input-referral-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReferralDialog(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!selectedVisit || !organization?.id) return;
                  createReferralMutation.mutate({
                    organizationId: organization.id,
                    opVisitId: selectedVisit.id,
                    patientId: selectedVisit.patient?.id || null,
                    referringDoctorId: selectedVisit.doctorId || null,
                    referredDoctorId: referralForm.referredDoctorId || null,
                    reason: referralForm.reason,
                    priority: referralForm.priority,
                    clinicalNotes: referralForm.clinicalNotes,
                    status: "pending",
                  });
                }}
                disabled={createReferralMutation.isPending || !referralForm.referredDoctorId}
                data-testid="button-confirm-referral"
              >
                {createReferralMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Referral
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  // ── End consultation workspace ───────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Doctor Console
          </h1>
          <p className="text-muted-foreground">Manage patient consultations</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Calendar className="h-4 w-4 mr-2" />
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </Badge>
          <Button onClick={() => refetchVisits()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeVisits.filter(v => v.status === "waiting").length}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500/10">
              <Stethoscope className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeVisits.filter(v => v.status === "in_consultation").length}</p>
              <p className="text-xs text-muted-foreground">In Consultation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedVisits.length}</p>
              <p className="text-xs text-muted-foreground">Completed Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {videoConsultations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Consultations
            </CardTitle>
            <CardDescription>Upcoming and scheduled video consultations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {videoConsultations
                .filter((vc) => vc.status !== "completed" && vc.status !== "cancelled")
                .slice(0, 6)
                .map((vc) => (
                <Card key={vc.id} className="hover-elevate" data-testid={`card-video-consultation-${vc.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate" data-testid={`text-vc-patient-${vc.id}`}>
                        {vc.patientName || "Patient"}
                      </span>
                      <Badge
                        variant={vc.status === "booked" ? "default" : vc.status === "in_consultation" ? "outline" : "secondary"}
                      >
                        {vc.status === "booked" ? "Scheduled" : vc.status === "in_consultation" ? "In Progress" : vc.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {vc.scheduledDate
                          ? new Date(vc.scheduledDate + "T00:00:00").toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })
                          : "No date"}
                      </span>
                      {vc.scheduledTime && (
                        <>
                          <Clock className="h-3.5 w-3.5 shrink-0 ml-1" />
                          <span>{vc.scheduledTime}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{vc.doctorName || "Doctor"}</span>
                    </div>
                    {vc.meetingRoomId && (
                      <Link href={`/video-room/${vc.meetingRoomId}`}>
                        <Button size="sm" className="w-full gap-1.5 mt-1" data-testid={`button-join-vc-${vc.id}`}>
                          <Video className="h-3.5 w-3.5" />
                          Join Video Call
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patient Queue
            </CardTitle>
            <CardDescription>Waiting and in-consultation patients</CardDescription>
          </CardHeader>
          <CardContent>
            {visitsLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeVisits.length === 0 ? (
              <div className="text-center p-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-1">No patients waiting</h3>
                <p className="text-sm text-muted-foreground">
                  Patients will appear here when they join the queue
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {sortedActiveVisits.map((visit) => {
                    const waitingList = sortedActiveVisits.filter(v => v.status === "waiting");
                    const waitIdx = waitingList.findIndex(v => v.id === visit.id);
                    const canMoveUp = waitIdx > 0;
                    const canMoveDown = waitIdx >= 0 && waitIdx < waitingList.length - 1;
                    // Estimated wait time based on per-doctor consultation duration (from localStorage)
                    const storedDurations: Record<string, number> = (() => {
                      try { return JSON.parse(localStorage.getItem("consultationDurations") || "{}"); } catch { return {}; }
                    })();
                    const slotMins = (visit.doctorId && storedDurations[visit.doctorId]) || 10;
                    const patientsAhead = waitIdx; // waiting patients before this one
                    const estimatedWaitMins = patientsAhead * slotMins;

                    return (
                      <div
                        key={visit.id}
                        className={`flex items-center justify-between p-4 rounded-lg border hover-elevate ${
                          visit.status === "in_consultation" ? "border-purple-500 bg-purple-500/5" : ""
                        }`}
                        data-testid={`doctor-visit-${visit.id}`}
                      >
                        <div
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => openConsultation(visit)}
                        >
                          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                            <span className="text-lg font-bold text-primary">#{visit.tokenNumber}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown"}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {visit.patient?.phone}
                              </span>
                              {visit.patient?.gender && (
                                <span>{visit.patient.gender === "male" ? "M" : visit.patient.gender === "female" ? "F" : "O"}</span>
                              )}
                              {visit.status === "waiting" && waitIdx >= 0 && (
                                <span className="flex items-center gap-1 text-amber-600">
                                  <Clock className="h-3 w-3" />
                                  ~{estimatedWaitMins === 0 ? "Next" : `${estimatedWaitMins}m wait`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {visit.status === "waiting" ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Clock className="h-3 w-3 mr-1" />
                              Waiting
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                              <Stethoscope className="h-3 w-3 mr-1" />
                              In Consultation
                            </Badge>
                          )}
                          {visit.status === "waiting" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-8 h-8 p-0 ml-1"
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
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleCancelToken(visit)}
                            title="Cancel token"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Completed Today
            </CardTitle>
            <CardDescription>Consultations completed today</CardDescription>
          </CardHeader>
          <CardContent>
            {completedVisits.length === 0 ? (
              <div className="text-center p-12">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-1">No completed consultations</h3>
                <p className="text-sm text-muted-foreground">
                  Completed consultations will appear here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {completedVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium text-muted-foreground">#{visit.tokenNumber}</span>
                        <span className="font-medium truncate">
                          {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-emerald-600">
                          {visit.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPrescriptionView(visit)}
                          data-testid={`button-view-prescription-${visit.id}`}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

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

      <Dialog open={isPrescriptionViewOpen} onOpenChange={setIsPrescriptionViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescription Details
            </DialogTitle>
            <DialogDescription>
              {viewingVisit?.patient && (
                <span className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">{viewingVisit.patient.firstName} {viewingVisit.patient.lastName}</span>
                  <Badge variant="outline">Token #{viewingVisit.tokenNumber}</Badge>
                  <span>{viewingVisit.createdAt ? new Date(viewingVisit.createdAt).toLocaleDateString() : ''}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {viewingVisit?.symptoms && (
              <div>
                <Label className="text-muted-foreground">Symptoms</Label>
                <p className="mt-1" data-testid="text-view-symptoms">{viewingVisit.symptoms}</p>
              </div>
            )}
            {viewingVisit?.diagnosis && (
              <div>
                <Label className="text-muted-foreground">Diagnosis</Label>
                <p className="mt-1" data-testid="text-view-diagnosis">{viewingVisit.diagnosis}</p>
              </div>
            )}

            <Separator />

            <div>
              <Label className="text-base flex items-center gap-2 mb-3">
                <Pill className="h-4 w-4" />
                Prescription
              </Label>
              {prescriptionsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : viewingPrescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No prescriptions for this visit</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Instructions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingPrescriptions.map((rx, index) => (
                      <TableRow key={rx.id} data-testid={`row-prescription-${rx.id}`}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{rx.medicineName}</TableCell>
                        <TableCell>{rx.dosage || "-"}</TableCell>
                        <TableCell>{rx.frequency || "-"}</TableCell>
                        <TableCell>{rx.duration || "-"}</TableCell>
                        <TableCell>{rx.instructions || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {viewingVisit?.notes && (
              <div>
                <Label className="text-muted-foreground">Clinical Notes</Label>
                <p className="mt-1 text-sm" data-testid="text-view-notes">{viewingVisit.notes}</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={generatePrescriptionPDF}
              data-testid="button-print-prescription"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={shareWhatsApp}
              data-testid="button-share-whatsapp"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Share WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => sendReferralMutation.mutate({ targetModule: "medlab", referralType: "prescription" })}
              disabled={sendReferralMutation.isPending || viewingPrescriptions.length === 0}
              data-testid="button-send-to-pharmacy"
            >
              {sendReferralMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pill className="h-4 w-4 mr-2" />}
              Send to Pharmacy
            </Button>
            <Button
              variant="outline"
              onClick={() => sendReferralMutation.mutate({ targetModule: "dialab", referralType: "lab_test" })}
              disabled={sendReferralMutation.isPending}
              data-testid="button-send-to-lab"
            >
              {sendReferralMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
              Send to Lab
            </Button>
            <Button
              onClick={() => setIsPrescriptionViewOpen(false)}
              data-testid="button-close-prescription"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
