import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Phone,
  User,
  Stethoscope,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  ClipboardList,
  FileText,
  Printer,
  Share2,
  RefreshCw,
  Pill,
  Video,
} from "lucide-react";
import type { Organization, Patient, OpVisit, Doctor as DoctorSchema, Prescription } from "@shared/schema";

type OrgInfo = {
  id: string;
  name: string;
  logo: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
};

type Department = {
  id: string;
  name: string;
  description: string | null;
};

type Doctor = {
  id: string;
  name: string;
  specialization: string | null;
  qualification: string | null;
  consultationFee: string;
  departmentId: string | null;
  isAvailable: boolean;
};

type FormData = {
  patientName: string;
  patientAge: number | undefined;
  patientGender: string;
  patientPhone: string;
  patientEmail: string;
  symptoms: string;
  departmentId: string;
  doctorId: string;
  preferredDate: Date | undefined;
  preferredTimeSlot: string;
  consultationType: "in_person" | "video";
};

type QueueStatus = {
  tokenNumber: number;
  status: string;
  queuePosition: number;
  estimatedWaitMinutes: number;
  doctor: { name: string; specialization: string | null } | null;
  currentlyServing: number | null;
  scheduledTime: string | null;
  symptoms: string | null;
};

interface PatientPortalData {
  patient: Patient;
  organization: Organization;
  visits: (OpVisit & {
    doctor?: DoctorSchema;
    prescriptions?: Prescription[];
  })[];
}

const TIME_SLOTS = [
  { start: "09:00", end: "09:30", label: "9:00 AM - 9:30 AM" },
  { start: "09:30", end: "10:00", label: "9:30 AM - 10:00 AM" },
  { start: "10:00", end: "10:30", label: "10:00 AM - 10:30 AM" },
  { start: "10:30", end: "11:00", label: "10:30 AM - 11:00 AM" },
  { start: "11:00", end: "11:30", label: "11:00 AM - 11:30 AM" },
  { start: "11:30", end: "12:00", label: "11:30 AM - 12:00 PM" },
  { start: "14:00", end: "14:30", label: "2:00 PM - 2:30 PM" },
  { start: "14:30", end: "15:00", label: "2:30 PM - 3:00 PM" },
  { start: "15:00", end: "15:30", label: "3:00 PM - 3:30 PM" },
  { start: "15:30", end: "16:00", label: "3:30 PM - 4:00 PM" },
  { start: "16:00", end: "16:30", label: "4:00 PM - 4:30 PM" },
  { start: "16:30", end: "17:00", label: "4:30 PM - 5:00 PM" },
];

const STEPS = [
  { id: 1, name: "Doctor", icon: Stethoscope },
  { id: 2, name: "Details", icon: User },
  { id: 3, name: "Schedule", icon: CalendarIcon },
  { id: 4, name: "Confirm", icon: CheckCircle2 },
];

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

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; label: string; description: string }> = {
    booked: {
      color: "bg-blue-100 text-blue-800",
      label: "Booked",
      description: "Your appointment is confirmed. Please arrive on time.",
    },
    waiting: {
      color: "bg-amber-100 text-amber-800",
      label: "Waiting",
      description: "You're in the queue. Please wait for your turn.",
    },
    in_consultation: {
      color: "bg-green-100 text-green-800",
      label: "In Consultation",
      description: "The doctor is seeing you now.",
    },
    completed: {
      color: "bg-gray-100 text-gray-800",
      label: "Completed",
      description: "Your consultation has been completed.",
    },
    cancelled: {
      color: "bg-red-100 text-red-800",
      label: "Cancelled",
      description: "This appointment has been cancelled.",
    },
  };
  return configs[status] || { color: "bg-gray-100 text-gray-800", label: status, description: "" };
};

const generatePrescriptionHTML = (
  visit: OpVisit & { doctor?: DoctorSchema; prescriptions?: Prescription[] },
  data: PatientPortalData
) => {
  const prescriptions = visit.prescriptions || [];
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Prescription - ${data.patient.firstName} ${data.patient.lastName}</title>
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
        <h1>${data.organization.name}</h1>
        <p>${data.organization.address || ''}</p>
        <p>Phone: ${data.organization.phone || ''}</p>
      </div>
      
      <div class="patient-info">
        <div>
          <strong>Patient:</strong> ${data.patient.firstName} ${data.patient.lastName}<br/>
          <strong>Age/Gender:</strong> ${data.patient.dateOfBirth ? calculateAge(data.patient.dateOfBirth) : '-'} / ${data.patient.gender || '-'}<br/>
          <strong>Phone:</strong> ${data.patient.phone || '-'}
        </div>
        <div>
          <strong>Date:</strong> ${visit.createdAt ? new Date(visit.createdAt).toLocaleDateString() : ''}<br/>
          <strong>Token:</strong> #${visit.tokenNumber}<br/>
          <strong>Doctor:</strong> ${visit.doctor?.name ? `Dr. ${visit.doctor.name}` : '-'}
        </div>
      </div>

      ${visit.symptoms ? `<p><strong>Symptoms:</strong> ${visit.symptoms}</p>` : ''}
      ${visit.diagnosis ? `<p><strong>Diagnosis:</strong> ${visit.diagnosis}</p>` : ''}
      
      <div class="rx-symbol">${String.fromCharCode(8478)}</div>
      
      ${prescriptions.length > 0 ? `
      <table class="prescription-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Medicine</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Duration</th>
            <th>Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${prescriptions.map((p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.medicineName}</td>
              <td>${p.dosage || '-'}</td>
              <td>${p.frequency || '-'}</td>
              <td>${p.duration || '-'}</td>
              <td>${p.instructions || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p>No prescriptions</p>'}

      ${visit.notes ? `<p><strong>Notes:</strong> ${visit.notes}</p>` : ''}
      
      <div class="signature">
        <p>_______________________</p>
        <p>${visit.doctor?.name ? `Dr. ${visit.doctor.name}` : 'Doctor Signature'}</p>
        ${visit.doctor?.qualification ? `<p>${visit.doctor.qualification}</p>` : ''}
      </div>
      
      <div class="footer">
        <p style="text-align: center; color: #666; font-size: 12px;">
          This is a computer generated prescription from ${data.organization.name}
        </p>
      </div>
    </body>
    </html>
  `;
};

export default function PublicConsultationBooking() {
  const { orgId } = useParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"book" | "visits" | "queue" | "profile">("book");
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    tokenNumber: number;
    visitId: string;
    queuePosition: number;
    meetingRoomId?: string;
  } | null>(null);

  const [phone, setPhone] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [patientData, setPatientData] = useState<PatientPortalData | null>(null);

  const [queueVisitId, setQueueVisitId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [selectedVisit, setSelectedVisit] = useState<OpVisit & { doctor?: DoctorSchema; prescriptions?: Prescription[] } | null>(null);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    patientName: "",
    patientAge: undefined,
    patientGender: "",
    patientPhone: "",
    patientEmail: "",
    symptoms: "",
    departmentId: "",
    doctorId: "",
    preferredDate: undefined,
    preferredTimeSlot: "",
    consultationType: "in_person",
  });

  const { data: orgInfo, isLoading: isLoadingOrg, isError: isOrgError } = useQuery<OrgInfo>({
    queryKey: ["/api/public/org", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/public/org/${orgId}`);
      if (!res.ok) throw new Error("Organization not found");
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/op-pos/departments", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/departments?organizationId=${orgId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/op-pos/doctors", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/doctors?organizationId=${orgId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: queueStatus, isLoading: isQueueLoading, isError: isQueueError, refetch: refetchQueue } = useQuery<QueueStatus>({
    queryKey: ["/api/public/queue", queueVisitId],
    queryFn: async () => {
      const res = await fetch(`/api/public/queue/${queueVisitId}`);
      if (!res.ok) throw new Error("Failed to fetch queue status");
      return res.json();
    },
    enabled: !!queueVisitId && activeTab === "queue",
    refetchInterval: autoRefresh ? 10000 : false,
  });

  useEffect(() => {
    if (queueStatus?.status === "completed" || queueStatus?.status === "cancelled") {
      setAutoRefresh(false);
    }
  }, [queueStatus?.status]);

  const filteredDoctors = formData.departmentId
    ? doctors.filter((d) => d.departmentId === formData.departmentId && d.isAvailable)
    : doctors.filter((d) => d.isAvailable);

  const selectedDoctor = doctors.find((d) => d.id === formData.doctorId);
  const selectedDepartment = departments.find((d) => d.id === formData.departmentId);

  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/public/book-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to book consultation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setBookingResult(data);
      setBookingComplete(true);
      setQueueVisitId(data.visitId);
      toast({ title: "Booking confirmed!", description: `Token #${data.tokenNumber}` });
    },
    onError: (error: any) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  const handleNext = () => {
    if (currentStep === 1 && !formData.doctorId) {
      toast({ title: "Please select a doctor", variant: "destructive" });
      return;
    }
    if (currentStep === 2) {
      if (!formData.patientName || !formData.patientPhone || !formData.patientGender) {
        toast({ title: "Please fill all required fields", variant: "destructive" });
        return;
      }
    }
    if (currentStep === 3) {
      if (!formData.preferredDate || !formData.preferredTimeSlot) {
        toast({ title: "Please select date and time", variant: "destructive" });
        return;
      }
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    bookingMutation.mutate({
      organizationId: orgId,
      patientName: formData.patientName,
      patientAge: formData.patientAge,
      patientGender: formData.patientGender,
      patientPhone: formData.patientPhone,
      patientEmail: formData.patientEmail,
      symptoms: formData.symptoms,
      doctorId: formData.doctorId,
      departmentId: formData.departmentId || null,
      preferredDate: formData.preferredDate ? format(formData.preferredDate, "yyyy-MM-dd") : null,
      preferredTimeSlot: formData.preferredTimeSlot,
      consultationType: formData.consultationType,
    });
  };

  const handleTrackQueue = () => {
    if (bookingResult) {
      setQueueVisitId(bookingResult.visitId);
      setAutoRefresh(true);
      setActiveTab("queue");
    }
  };

  const handleVerify = async () => {
    if (!phone || phone.length < 10) {
      setVerifyError("Please enter a valid phone number");
      return;
    }

    setIsVerifying(true);
    setVerifyError("");

    try {
      const res = await fetch(`/api/public/patient-portal/${orgId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const data = await res.json();
        setVerifyError(data.error || "Verification failed");
        setIsVerifying(false);
        return;
      }

      const data = await res.json();
      setPatientData(data);
      setIsVerified(true);
    } catch {
      setVerifyError("Something went wrong. Please try again.");
    }
    setIsVerifying(false);
  };

  const viewPrescription = (visit: OpVisit & { doctor?: DoctorSchema; prescriptions?: Prescription[] }) => {
    setSelectedVisit(visit);
    setPrescriptionDialogOpen(true);
  };

  const printPrescription = () => {
    if (!selectedVisit || !patientData) return;
    const printContent = generatePrescriptionHTML(selectedVisit, patientData);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const sharePrescription = () => {
    if (!selectedVisit || !patientData) return;
    const prescriptionText = selectedVisit.prescriptions?.map((p, i) =>
      `${i + 1}. ${p.medicineName} - ${p.dosage || ''} ${p.frequency || ''} ${p.duration || ''}`
    ).join('\n') || '';

    const message = `Prescription from ${patientData.organization.name}\n` +
      `Patient: ${patientData.patient.firstName} ${patientData.patient.lastName}\n` +
      `Date: ${selectedVisit.createdAt ? new Date(selectedVisit.createdAt).toLocaleDateString() : ''}\n\n` +
      `Diagnosis: ${selectedVisit.diagnosis || 'N/A'}\n\n` +
      `Medicines:\n${prescriptionText}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (isLoadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cyan-50/30 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isOrgError || !orgInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-cyan-50/30 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
            <p className="text-muted-foreground">
              The booking page you're looking for doesn't exist or is not available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logoUrl = orgInfo.logo
    ? orgInfo.logo.startsWith("/objects") ? orgInfo.logo : `/objects/${orgInfo.logo}`
    : null;

  const renderPhoneVerification = (context: string) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <div className="mx-auto p-3 rounded-full bg-muted w-fit mb-3">
            <Phone className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg" data-testid={`text-verify-title-${context}`}>Verify Your Phone</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your registered phone number to continue
          </p>
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            placeholder="+91 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            data-testid={`input-verify-phone-${context}`}
          />
          {verifyError && (
            <p className="text-sm text-destructive" data-testid={`text-verify-error-${context}`}>{verifyError}</p>
          )}
        </div>
        <Button
          className="w-full"
          onClick={handleVerify}
          disabled={isVerifying}
          data-testid={`button-verify-phone-${context}`}
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </div>
  );

  const renderBookTab = () => {
    if (bookingComplete && bookingResult) {
      if (formData.consultationType === "video") {
        return (
          <div className="px-4 py-6">
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-6">
                <Video className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold" data-testid="text-booking-confirmed">Video Consultation Scheduled!</h2>
                <p className="text-sm text-muted-foreground">Your video consultation has been scheduled</p>
              </div>

              <Card className="shadow-sm mb-6">
                <CardContent className="pt-6">
                  <div className="text-center p-6 bg-muted/30 rounded-md mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Your Token Number</p>
                    <p className="text-5xl font-bold" data-testid="text-token-number">#{bookingResult.tokenNumber}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b gap-2">
                      <span className="text-muted-foreground text-sm">Doctor</span>
                      <span className="font-medium text-sm">{selectedDoctor?.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b gap-2">
                      <span className="text-muted-foreground text-sm">Date</span>
                      <span className="font-medium text-sm">
                        {formData.preferredDate && format(formData.preferredDate, "dd MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b gap-2">
                      <span className="text-muted-foreground text-sm">Time Slot</span>
                      <span className="font-medium text-sm">
                        {TIME_SLOTS.find((s) => s.start === formData.preferredTimeSlot)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b gap-2">
                      <span className="text-muted-foreground text-sm">Consultation Fee</span>
                      <span className="font-medium text-sm">{String.fromCharCode(8377)}{Number(selectedDoctor?.consultationFee || 0).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 gap-2">
                      <span className="text-muted-foreground text-sm">Payment Status</span>
                      <Badge variant="outline" className="text-xs" data-testid="badge-payment-status">Payment Pending</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="p-3 bg-muted/30 rounded-md mb-4 text-sm text-muted-foreground" data-testid="text-video-note">
                <p>You will be able to join the video call at your scheduled time. Please keep the meeting link safe.</p>
              </div>

              {bookingResult.meetingRoomId && (
                <Button
                  className="w-full mb-3"
                  onClick={() => window.open(`/video-room/${bookingResult.meetingRoomId}`, "_blank")}
                  data-testid="button-join-video"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Video Call
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={handleTrackQueue}
                data-testid="button-track-queue"
              >
                Track Your Queue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="px-4 py-6">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold" data-testid="text-booking-confirmed">Booking Confirmed!</h2>
              <p className="text-sm text-muted-foreground">Your consultation has been scheduled</p>
            </div>

            <Card className="shadow-sm mb-6">
              <CardContent className="pt-6">
                <div className="text-center p-6 bg-muted/30 rounded-md mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Your Token Number</p>
                  <p className="text-5xl font-bold" data-testid="text-token-number">#{bookingResult.tokenNumber}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Queue Position: {bookingResult.queuePosition}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b gap-2">
                    <span className="text-muted-foreground text-sm">Doctor</span>
                    <span className="font-medium text-sm">{selectedDoctor?.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b gap-2">
                    <span className="text-muted-foreground text-sm">Date</span>
                    <span className="font-medium text-sm">
                      {formData.preferredDate && format(formData.preferredDate, "dd MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b gap-2">
                    <span className="text-muted-foreground text-sm">Time Slot</span>
                    <span className="font-medium text-sm">
                      {TIME_SLOTS.find((s) => s.start === formData.preferredTimeSlot)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 gap-2">
                    <span className="text-muted-foreground text-sm">Consultation Fee</span>
                    <span className="font-medium text-sm">{String.fromCharCode(8377)}{Number(selectedDoctor?.consultationFee || 0).toFixed(0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={handleTrackQueue}
              data-testid="button-track-queue"
            >
              Track Your Queue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-center gap-1 mb-6">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors",
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep > step.id
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}
                  data-testid={`step-indicator-${step.id}`}
                >
                  <step.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.name}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-6 h-0.5 mx-0.5",
                      currentStep > step.id ? "bg-green-400" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-0.5">Select Doctor</h2>
                    <p className="text-muted-foreground text-sm">
                      Choose a department and doctor for your consultation
                    </p>
                  </div>

                  <div>
                    <Label className="mb-2 block">Consultation Type</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Card
                        className={cn(
                          "cursor-pointer transition-all hover-elevate",
                          formData.consultationType === "in_person"
                            ? "border-primary ring-1 ring-primary/20"
                            : ""
                        )}
                        onClick={() => setFormData({ ...formData, consultationType: "in_person" })}
                        data-testid="card-consultation-in-person"
                      >
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-md flex-shrink-0",
                            formData.consultationType === "in_person"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <Stethoscope className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">In-Person Visit</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Visit the clinic for face-to-face consultation</p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card
                        className={cn(
                          "cursor-pointer transition-all hover-elevate",
                          formData.consultationType === "video"
                            ? "border-primary ring-1 ring-primary/20"
                            : ""
                        )}
                        onClick={() => setFormData({ ...formData, consultationType: "video" })}
                        data-testid="card-consultation-video"
                      >
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-md flex-shrink-0",
                            formData.consultationType === "video"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <Video className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">Video Consultation</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Consult with doctor from home via video call</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    {formData.consultationType === "video" && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Online payment required
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Department (Optional)</Label>
                    <Select
                      value={formData.departmentId || "all"}
                      onValueChange={(val) =>
                        setFormData({ ...formData, departmentId: val === "all" ? "" : val, doctorId: "" })
                      }
                    >
                      <SelectTrigger data-testid="select-department">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-2 block">Available Doctors</Label>
                    {filteredDoctors.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No doctors available at the moment</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredDoctors.map((doctor) => (
                          <div
                            key={doctor.id}
                            onClick={() => setFormData({ ...formData, doctorId: doctor.id })}
                            className={cn(
                              "p-3 border rounded-md cursor-pointer transition-all hover-elevate",
                              formData.doctorId === doctor.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                : ""
                            )}
                            data-testid={`card-doctor-${doctor.id}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                                  formData.doctorId === doctor.id ? "border-primary" : "border-muted-foreground/30"
                                )}>
                                  {formData.doctorId === doctor.id && (
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">{doctor.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {doctor.specialization || "General Physician"}
                                  </p>
                                  {doctor.qualification && (
                                    <p className="text-xs text-muted-foreground">{doctor.qualification}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold">
                                  {String.fromCharCode(8377)}{Number(doctor.consultationFee).toFixed(0)}
                                </p>
                                <p className="text-xs text-muted-foreground">Fee</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-0.5">Your Details</h2>
                    <p className="text-muted-foreground text-sm">
                      Enter your information for the consultation
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="patientName">Full Name *</Label>
                      <Input
                        id="patientName"
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                        placeholder="Enter your full name"
                        data-testid="input-patient-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="patientPhone">Phone Number *</Label>
                      <Input
                        id="patientPhone"
                        value={formData.patientPhone}
                        onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                        placeholder="Enter phone number"
                        data-testid="input-patient-phone"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="patientAge">Age</Label>
                        <Input
                          id="patientAge"
                          type="number"
                          value={formData.patientAge || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, patientAge: e.target.value ? parseInt(e.target.value) : undefined })
                          }
                          placeholder="Age"
                          data-testid="input-patient-age"
                        />
                      </div>
                      <div>
                        <Label>Gender *</Label>
                        <Select
                          value={formData.patientGender}
                          onValueChange={(val) => setFormData({ ...formData, patientGender: val })}
                        >
                          <SelectTrigger data-testid="select-patient-gender">
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
                      <Label htmlFor="patientEmail">Email (Optional)</Label>
                      <Input
                        id="patientEmail"
                        type="email"
                        value={formData.patientEmail}
                        onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                        placeholder="Email address"
                        data-testid="input-patient-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="symptoms">Symptoms / Reason for Visit</Label>
                      <Textarea
                        id="symptoms"
                        value={formData.symptoms}
                        onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                        placeholder="Describe your symptoms..."
                        rows={3}
                        data-testid="input-symptoms"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-0.5">Schedule Appointment</h2>
                    <p className="text-muted-foreground text-sm">
                      Select your preferred date and time
                    </p>
                  </div>

                  <div>
                    <Label className="mb-2 block">Select Date</Label>
                    <Calendar
                      mode="single"
                      selected={formData.preferredDate}
                      onSelect={(date) => setFormData({ ...formData, preferredDate: date })}
                      disabled={(date) =>
                        isBefore(date, startOfDay(new Date())) ||
                        isBefore(addDays(new Date(), 30), date)
                      }
                      className="rounded-md border mx-auto"
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">Select Time Slot</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {TIME_SLOTS.map((slot) => (
                        <Button
                          key={slot.start}
                          variant={formData.preferredTimeSlot === slot.start ? "default" : "outline"}
                          className="justify-start text-xs"
                          size="sm"
                          onClick={() => setFormData({ ...formData, preferredTimeSlot: slot.start })}
                          data-testid={`button-slot-${slot.start}`}
                        >
                          <Clock className="h-3 w-3 mr-1.5" />
                          {slot.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold mb-0.5">Confirm Booking</h2>
                    <p className="text-muted-foreground text-sm">
                      Review your booking details
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-muted/30 rounded-md space-y-1.5">
                      <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Doctor Details</span>
                      </div>
                      <p className="text-sm"><span className="text-muted-foreground">Doctor:</span> {selectedDoctor?.name}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Specialization:</span> {selectedDoctor?.specialization || "General"}</p>
                      {selectedDepartment && (
                        <p className="text-sm"><span className="text-muted-foreground">Department:</span> {selectedDepartment.name}</p>
                      )}
                      <p className="text-sm">
                        <span className="text-muted-foreground">Consultation Type:</span>{" "}
                        {formData.consultationType === "video" ? "Video Consultation" : "In-Person Visit"}
                      </p>
                      <p className="text-sm font-medium">
                        Fee: {String.fromCharCode(8377)}{Number(selectedDoctor?.consultationFee || 0).toFixed(0)}
                      </p>
                    </div>

                    <div className="p-3 bg-muted/30 rounded-md space-y-1.5">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Patient Details</span>
                      </div>
                      <p className="text-sm"><span className="text-muted-foreground">Name:</span> {formData.patientName}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {formData.patientPhone}</p>
                      {formData.patientAge && (
                        <p className="text-sm"><span className="text-muted-foreground">Age:</span> {formData.patientAge} years</p>
                      )}
                      <p className="text-sm"><span className="text-muted-foreground">Gender:</span> {formData.patientGender}</p>
                      {formData.symptoms && (
                        <p className="text-sm"><span className="text-muted-foreground">Symptoms:</span> {formData.symptoms}</p>
                      )}
                    </div>

                    <div className="p-3 bg-muted/30 rounded-md space-y-1.5">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Schedule</span>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Date:</span>{" "}
                        {formData.preferredDate && format(formData.preferredDate, "EEEE, dd MMMM yyyy")}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Time:</span>{" "}
                        {TIME_SLOTS.find((s) => s.start === formData.preferredTimeSlot)?.label}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-between gap-2 border-t pt-4">
              {currentStep > 1 ? (
                <Button variant="outline" onClick={handleBack} data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}
              {currentStep < 4 ? (
                <Button onClick={handleNext} data-testid="button-next">
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={bookingMutation.isPending}
                  data-testid="button-confirm-booking"
                >
                  {bookingMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  };

  const renderVisitsTab = () => {
    if (!isVerified) {
      return renderPhoneVerification("visits");
    }

    const visits = patientData?.visits || [];

    return (
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-visits-title">My Consultations</h2>
            <p className="text-sm text-muted-foreground">View your consultation history and prescriptions</p>
          </div>

          {visits.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <h3 className="font-medium mb-1 text-sm">No consultations yet</h3>
              <p className="text-xs text-muted-foreground">Book your first consultation to get started</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setActiveTab("book")}
                data-testid="button-book-first"
              >
                Book Consultation
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => (
                <Card key={visit.id} className="shadow-sm" data-testid={`card-visit-${visit.id}`}>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            {visit.doctor ? `Dr. ${visit.doctor.name}` : "Doctor"}
                          </p>
                          {visit.doctor?.specialization && (
                            <p className="text-xs text-muted-foreground">{visit.doctor.specialization}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                          <Badge variant="outline" className="text-xs">Token #{visit.tokenNumber}</Badge>
                          <Badge className={cn("text-xs no-default-hover-elevate no-default-active-elevate", getStatusConfig(visit.status || "").color)}>
                            {getStatusConfig(visit.status || "").label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {visit.createdAt ? new Date(visit.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }) : "-"}
                        </p>
                        {visit.prescriptions && visit.prescriptions.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewPrescription(visit)}
                            data-testid={`button-view-prescription-${visit.id}`}
                          >
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            View Prescription
                          </Button>
                        )}
                      </div>
                      {visit.diagnosis && (
                        <p className="text-xs text-muted-foreground"><span className="font-medium">Diagnosis:</span> {visit.diagnosis}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQueueTab = () => {
    if (!queueVisitId && !isVerified) {
      return renderPhoneVerification("queue");
    }

    if (!queueVisitId && isVerified) {
      const activeVisits = patientData?.visits?.filter(
        (v) => v.status === "booked" || v.status === "waiting" || v.status === "in_consultation"
      ) || [];

      if (activeVisits.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-medium mb-1 text-sm">No Active Queue</h3>
            <p className="text-xs text-muted-foreground text-center">
              You don't have any active consultations in the queue
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setActiveTab("book")}
              data-testid="button-book-from-queue"
            >
              Book Consultation
            </Button>
          </div>
        );
      }

      return (
        <div className="px-4 py-4">
          <div className="max-w-lg mx-auto space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Active Visits</h2>
              <p className="text-sm text-muted-foreground">Select a visit to track</p>
            </div>
            <div className="space-y-2">
              {activeVisits.map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => {
                    setQueueVisitId(visit.id);
                    setAutoRefresh(true);
                  }}
                  className="p-3 border rounded-md cursor-pointer hover-elevate"
                  data-testid={`card-queue-visit-${visit.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">Token #{visit.tokenNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {visit.doctor ? `Dr. ${visit.doctor.name}` : "Doctor"}
                      </p>
                    </div>
                    <Badge className={cn("text-xs no-default-hover-elevate no-default-active-elevate", getStatusConfig(visit.status || "").color)}>
                      {getStatusConfig(visit.status || "").label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (isQueueLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (isQueueError || !queueStatus) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h3 className="font-medium mb-1 text-sm">Unable to Load Queue Status</h3>
          <p className="text-xs text-muted-foreground text-center mb-4">
            We couldn't find your booking information.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchQueue()}
            data-testid="button-retry-queue"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    const statusConfig = getStatusConfig(queueStatus.status);

    return (
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          <Card className="shadow-sm overflow-visible">
            <div className={cn("p-6 text-center rounded-t-md", statusConfig.color)}>
              <p className="text-sm font-medium mb-1">Your Token Number</p>
              <p className="text-5xl font-bold" data-testid="text-queue-token">#{queueStatus.tokenNumber}</p>
            </div>

            <CardContent className="pt-4 space-y-4">
              <div className="text-center">
                <Badge className={cn("no-default-hover-elevate no-default-active-elevate", statusConfig.color)} data-testid="badge-queue-status">
                  {statusConfig.label}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">{statusConfig.description}</p>
              </div>

              {(queueStatus.status === "booked" || queueStatus.status === "waiting") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/30 rounded-md">
                    <Users className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                    <p className="text-2xl font-bold" data-testid="text-queue-position">{queueStatus.queuePosition}</p>
                    <p className="text-xs text-muted-foreground">People ahead</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-md">
                    <Clock className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                    <p className="text-2xl font-bold" data-testid="text-wait-time">~{queueStatus.estimatedWaitMinutes}</p>
                    <p className="text-xs text-muted-foreground">Minutes wait</p>
                  </div>
                </div>
              )}

              {queueStatus.doctor && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm" data-testid="text-queue-doctor">{queueStatus.doctor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {queueStatus.doctor.specialization || "General Physician"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {queueStatus.scheduledTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Scheduled:</span>
                  <span className="font-medium">{queueStatus.scheduledTime}</span>
                </div>
              )}

              {queueStatus.status === "completed" && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="font-semibold">Consultation Completed</h3>
                  <p className="text-sm text-muted-foreground mt-1">Thank you for visiting. Take care!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchQueue()}
              data-testid="button-refresh-queue"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={cn("w-2 h-2 rounded-full", autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfileTab = () => {
    if (!isVerified) {
      return renderPhoneVerification("profile");
    }

    const patient = patientData?.patient;
    if (!patient) return null;

    return (
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="text-center py-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-3">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold" data-testid="text-profile-name">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">Patient ID: {patient.patientId}</p>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 py-2 border-b">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </span>
                <span className="text-sm font-medium" data-testid="text-profile-phone">{patient.phone}</span>
              </div>
              {patient.email && (
                <div className="flex items-center justify-between gap-2 py-2 border-b">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium" data-testid="text-profile-email">{patient.email}</span>
                </div>
              )}
              {patient.gender && (
                <div className="flex items-center justify-between gap-2 py-2 border-b">
                  <span className="text-sm text-muted-foreground">Gender</span>
                  <span className="text-sm font-medium capitalize" data-testid="text-profile-gender">{patient.gender}</span>
                </div>
              )}
              {patient.dateOfBirth && (
                <div className="flex items-center justify-between gap-2 py-2 border-b">
                  <span className="text-sm text-muted-foreground">Age</span>
                  <span className="text-sm font-medium" data-testid="text-profile-age">{calculateAge(patient.dateOfBirth)} years</span>
                </div>
              )}
              {patient.bloodGroup && (
                <div className="flex items-center justify-between gap-2 py-2 border-b">
                  <span className="text-sm text-muted-foreground">Blood Group</span>
                  <span className="text-sm font-medium" data-testid="text-profile-blood">{patient.bloodGroup}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-center justify-between gap-2 py-2">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-sm font-medium text-right max-w-[60%]" data-testid="text-profile-address">{patient.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Total Consultations</p>
                  <p className="text-xs text-muted-foreground">All time visits</p>
                </div>
                <span className="text-2xl font-bold" data-testid="text-total-visits">
                  {patientData?.visits?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const bottomNavItems = [
    { id: "book" as const, label: "Book", icon: Stethoscope },
    { id: "visits" as const, label: "My Visits", icon: ClipboardList },
    { id: "queue" as const, label: "Queue", icon: Users },
    { id: "profile" as const, label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/30 to-white flex flex-col">
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={orgInfo.name}
              className="h-9 w-9 object-contain rounded-md"
              data-testid="img-org-logo"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate" data-testid="text-org-name">{orgInfo.name}</h1>
            {orgInfo.city && (
              <p className="text-xs text-muted-foreground truncate">{orgInfo.city}</p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">
        {activeTab === "book" && renderBookTab()}
        {activeTab === "visits" && renderVisitsTab()}
        {activeTab === "queue" && renderQueueTab()}
        {activeTab === "profile" && renderProfileTab()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t" data-testid="nav-bottom">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 rounded-md transition-colors",
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              )}
              data-testid={`nav-tab-${item.id}`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescription Details
            </DialogTitle>
          </DialogHeader>

          {selectedVisit && patientData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                <div>
                  <p><span className="text-muted-foreground">Date:</span> {selectedVisit.createdAt ? new Date(selectedVisit.createdAt).toLocaleDateString() : "-"}</p>
                  <p><span className="text-muted-foreground">Doctor:</span> {selectedVisit.doctor ? `Dr. ${selectedVisit.doctor.name}` : "-"}</p>
                </div>
                <Badge variant="outline">Token #{selectedVisit.tokenNumber}</Badge>
              </div>

              {selectedVisit.diagnosis && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-sm"><span className="font-medium">Diagnosis:</span> {selectedVisit.diagnosis}</p>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <Pill className="h-4 w-4" />
                  Medicines
                </h4>
                <div className="overflow-x-auto">
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
                      {selectedVisit.prescriptions?.map((p, i) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{i + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{p.medicineName}</TableCell>
                          <TableCell className="text-sm">{p.dosage || "-"}</TableCell>
                          <TableCell className="text-sm">{p.frequency || "-"}</TableCell>
                          <TableCell className="text-sm">{p.duration || "-"}</TableCell>
                          <TableCell className="text-sm">{p.instructions || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex gap-2 pt-2 flex-wrap">
                <Button onClick={printPrescription} data-testid="button-print-prescription">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={sharePrescription} data-testid="button-share-prescription">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share via WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
