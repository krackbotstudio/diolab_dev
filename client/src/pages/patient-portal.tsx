import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  User,
  Phone,
  Calendar,
  Stethoscope,
  Pill,
  FileText,
  Printer,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CalendarPlus,
  Building2,
} from "lucide-react";
import type { Organization, Patient, OpVisit, Doctor, Prescription } from "@shared/schema";
import logoSymbol from "@assets/diolab_-_logo_-_color_-_symbol_1769252295192.png";

interface PatientPortalData {
  patient: Patient;
  organization: Organization;
  visits: (OpVisit & {
    doctor?: Doctor;
    prescriptions?: Prescription[];
  })[];
}

export default function PatientPortal() {
  const [, params] = useRoute("/patient/:orgId");
  const orgId = params?.orgId;

  const [isVerified, setIsVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [patientData, setPatientData] = useState<PatientPortalData | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<OpVisit & { doctor?: Doctor; prescriptions?: Prescription[] } | null>(null);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);

  const { data: org, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["/api/public/org", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const res = await fetch(`/api/public/org/${orgId}/info`);
      if (!res.ok) throw new Error("Organization not found");
      return res.json();
    },
  });

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
    } catch (error) {
      setVerifyError("Something went wrong. Please try again.");
    }
    setIsVerifying(false);
  };

  const viewPrescription = (visit: OpVisit & { doctor?: Doctor; prescriptions?: Prescription[] }) => {
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

  const generatePrescriptionHTML = (
    visit: OpVisit & { doctor?: Doctor; prescriptions?: Prescription[] },
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
        
        <div class="rx-symbol">℞</div>
        
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

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Organization Not Found</h2>
            <p className="text-muted-foreground">
              The organization you're looking for doesn't exist or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            {org.logo ? (
              <img src={org.logo} alt={org.name} className="h-10 w-10 object-contain" />
            ) : (
              <img src={logoSymbol} alt="Diolab" className="h-10 w-10" />
            )}
            <span className="font-semibold text-lg">{org.name}</span>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Patient Portal</CardTitle>
              <CardDescription>
                Enter your registered phone number to view your consultations and prescriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    data-testid="input-verify-phone"
                  />
                </div>
                {verifyError && (
                  <p className="text-sm text-destructive">{verifyError}</p>
                )}
              </div>
              <Button 
                className="w-full" 
                onClick={handleVerify}
                disabled={isVerifying}
                data-testid="button-verify-phone"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Continue
                  </>
                )}
              </Button>
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = `/book/${orgId}/consultation`}
                  data-testid="button-book-consultation"
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Book New Consultation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {patientData?.organization.logo ? (
              <img src={patientData.organization.logo} alt={patientData.organization.name} className="h-10 w-10 object-contain" />
            ) : (
              <img src={logoSymbol} alt="Diolab" className="h-10 w-10" />
            )}
            <span className="font-semibold text-lg">{patientData?.organization.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <User className="h-3 w-3 mr-1" />
              {patientData?.patient.firstName} {patientData?.patient.lastName}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Health Records</h1>
            <p className="text-muted-foreground">View your consultations and prescriptions</p>
          </div>
          <Button 
            onClick={() => window.location.href = `/book/${orgId}/consultation`}
            data-testid="button-book-new-consultation"
          >
            <CalendarPlus className="h-4 w-4 mr-2" />
            Book Consultation
          </Button>
        </div>

        <Tabs defaultValue="consultations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="consultations" data-testid="tab-consultations">
              <Stethoscope className="h-4 w-4 mr-2" />
              Consultations
            </TabsTrigger>
            <TabsTrigger value="prescriptions" data-testid="tab-prescriptions">
              <Pill className="h-4 w-4 mr-2" />
              Prescriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="space-y-4">
            {!patientData?.visits || patientData.visits.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-medium mb-1">No consultations yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Book your first consultation to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {patientData.visits.map((visit) => (
                  <Card key={visit.id} data-testid={`card-visit-${visit.id}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Token #{visit.tokenNumber}</Badge>
                            <Badge variant={visit.status === "completed" ? "default" : "secondary"}>
                              {visit.status === "completed" ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</>
                              ) : visit.status === "in_consultation" ? (
                                <><Clock className="h-3 w-3 mr-1" /> In Progress</>
                              ) : (
                                <><Clock className="h-3 w-3 mr-1" /> {visit.status}</>
                              )}
                            </Badge>
                          </div>
                          <p className="font-medium">
                            {visit.doctor ? `Dr. ${visit.doctor.name}` : "Doctor"}
                            {visit.doctor?.specialization && (
                              <span className="text-muted-foreground font-normal"> - {visit.doctor.specialization}</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {visit.createdAt ? new Date(visit.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }) : "-"}
                          </p>
                          {visit.diagnosis && (
                            <p className="text-sm"><strong>Diagnosis:</strong> {visit.diagnosis}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {visit.prescriptions && visit.prescriptions.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewPrescription(visit)}
                              data-testid={`button-view-prescription-${visit.id}`}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Prescription
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4">
            {!patientData?.visits || patientData.visits.every(v => !v.prescriptions || v.prescriptions.length === 0) ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Pill className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-medium mb-1">No prescriptions yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Your prescriptions will appear here after your consultation
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {patientData.visits.filter(v => v.prescriptions && v.prescriptions.length > 0).map((visit) => (
                  <Card key={visit.id} data-testid={`card-prescription-${visit.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {visit.doctor ? `Dr. ${visit.doctor.name}` : "Doctor"}
                          </CardTitle>
                          <CardDescription>
                            {visit.createdAt ? new Date(visit.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }) : "-"}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewPrescription(visit)}
                            data-testid={`button-view-full-prescription-${visit.id}`}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Medicine</TableHead>
                            <TableHead>Dosage</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visit.prescriptions?.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.medicineName}</TableCell>
                              <TableCell>{p.dosage || "-"}</TableCell>
                              <TableCell>{p.frequency || "-"}</TableCell>
                              <TableCell>{p.duration || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescription Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedVisit && patientData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p><strong>Date:</strong> {selectedVisit.createdAt ? new Date(selectedVisit.createdAt).toLocaleDateString() : "-"}</p>
                  <p><strong>Doctor:</strong> {selectedVisit.doctor ? `Dr. ${selectedVisit.doctor.name}` : "-"}</p>
                </div>
                <Badge variant="outline">Token #{selectedVisit.tokenNumber}</Badge>
              </div>

              {selectedVisit.diagnosis && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Diagnosis:</strong> {selectedVisit.diagnosis}</p>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Medicines
                </h4>
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
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{p.medicineName}</TableCell>
                        <TableCell>{p.dosage || "-"}</TableCell>
                        <TableCell>{p.frequency || "-"}</TableCell>
                        <TableCell>{p.duration || "-"}</TableCell>
                        <TableCell>{p.instructions || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2 pt-4">
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
