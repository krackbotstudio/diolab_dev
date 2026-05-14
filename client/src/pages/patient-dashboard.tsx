import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  User, Heart, Activity, Pill, Calendar, FileText, ArrowLeft,
  TrendingUp, TrendingDown, Minus, Loader2, Stethoscope, Weight,
  Thermometer, Clock,
} from "lucide-react";
import type { Patient, PatientVital, OpVisit, Prescription } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function calculateAge(dob: string) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getBmiCategory(bmi: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (bmi < 18.5) return { label: "Underweight", variant: "outline" };
  if (bmi < 25) return { label: "Normal", variant: "default" };
  if (bmi < 30) return { label: "Overweight", variant: "secondary" };
  return { label: "Obese", variant: "destructive" };
}

function getBmiCategoryColor(bmi: number): string {
  if (bmi < 18.5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  if (bmi < 25) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (bmi < 30) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "booked": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "waiting": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "in_consultation": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CaseSheetData {
  vitals: PatientVital[];
  visits: OpVisit[];
  prescriptions: Prescription[];
  totalVisits: number;
  lastVisit: OpVisit | null;
  latestVitals: PatientVital | null;
}

export default function PatientDashboard() {
  const { toast } = useToast();
  const [, params] = useRoute("/patient-dashboard/:patientId");
  const patientId = params?.patientId;
  const [activeTab, setActiveTab] = useState("overview");

  const { data: orgData } = useQuery<{ organization: { id: string } }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: patients = [], isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    enabled: !!organization?.id,
  });

  const patient = useMemo(() => {
    return patients.find(p => p.id === patientId);
  }, [patients, patientId]);

  const { data: caseSheet, isLoading: caseSheetLoading } = useQuery<CaseSheetData>({
    queryKey: ["/api/op-pos/patient-case-sheet", patientId, organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/patient-case-sheet?patientId=${patientId}&organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch case sheet");
      return res.json();
    },
    enabled: !!patientId && !!organization?.id,
  });

  const vitals = caseSheet?.vitals || [];
  const visits = caseSheet?.visits || [];
  const prescriptions = caseSheet?.prescriptions || [];
  const latestVitals = caseSheet?.latestVitals;
  const totalVisits = caseSheet?.totalVisits || 0;

  const bmiTrend = useMemo(() => {
    return vitals
      .filter(v => v.bmi)
      .map((v, index, arr) => {
        const bmiVal = Number(v.bmi);
        let trend: "up" | "down" | "same" = "same";
        if (index < arr.length - 1) {
          const prevBmi = Number(arr[index + 1].bmi);
          if (bmiVal > prevBmi) trend = "up";
          else if (bmiVal < prevBmi) trend = "down";
        }
        return { ...v, bmiVal, trend };
      });
  }, [vitals]);

  const recentConsultations = useMemo(() => {
    return visits.slice(0, 5);
  }, [visits]);

  const prescriptionsByVisit = useMemo(() => {
    const grouped: Record<string, { visit: OpVisit | null; prescriptions: Prescription[]; date: string }> = {};
    for (const rx of prescriptions) {
      const key = rx.opVisitId;
      if (!grouped[key]) {
        const visit = visits.find(v => v.id === key) || null;
        grouped[key] = {
          visit,
          prescriptions: [],
          date: visit?.createdAt ? formatDate(visit.createdAt) : "-",
        };
      }
      grouped[key].prescriptions.push(rx);
    }
    return Object.values(grouped);
  }, [prescriptions, visits]);

  const isLoading = patientsLoading || caseSheetLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8" data-testid="loading-state">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 space-y-4" data-testid="patient-not-found">
        <Link href="/patients">
          <Button variant="ghost" data-testid="button-back-patients">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold" data-testid="text-not-found">Patient Not Found</h2>
            <p className="text-muted-foreground mt-2">The patient you are looking for does not exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestBmi = latestVitals?.bmi ? Number(latestVitals.bmi) : null;
  const latestBp = latestVitals?.bloodPressure || null;
  const latestSpO2 = latestVitals?.spO2 ?? null;

  return (
    <div className="p-6 space-y-6" data-testid="patient-dashboard">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/patients">
            <Button variant="ghost" data-testid="button-back-patients">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold" data-testid="text-patient-name">
                {patient.firstName} {patient.lastName}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                {patient.dateOfBirth && (
                  <span data-testid="text-patient-age">{calculateAge(patient.dateOfBirth)} yrs</span>
                )}
                {patient.gender && (
                  <span data-testid="text-patient-gender" className="capitalize">{patient.gender}</span>
                )}
                {patient.bloodGroup && (
                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-blood-group">
                    {patient.bloodGroup}
                  </Badge>
                )}
                {patient.phone && (
                  <span data-testid="text-patient-phone">{patient.phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card data-testid="card-total-visits">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-visits">{totalVisits}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-latest-bmi">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest BMI</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-latest-bmi">
              {latestBmi ? latestBmi.toFixed(1) : "-"}
            </div>
            {latestBmi && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${getBmiCategoryColor(latestBmi)}`} data-testid="badge-bmi-category">
                {getBmiCategory(latestBmi).label}
              </span>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-latest-bp">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest BP</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-latest-bp">{latestBp || "-"}</div>
          </CardContent>
        </Card>
        <Card data-testid="card-latest-spo2">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest SpO2</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-latest-spo2">
              {latestSpO2 !== null ? `${latestSpO2}%` : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-patient-dashboard">
        <TabsList data-testid="tabslist-patient-dashboard">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals" data-testid="tab-vitals">Vitals History</TabsTrigger>
          <TabsTrigger value="consultations" data-testid="tab-consultations">Consultations</TabsTrigger>
          <TabsTrigger value="prescriptions" data-testid="tab-prescriptions">Prescriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4" data-testid="tabcontent-overview">
          {latestVitals ? (
            <Card data-testid="card-latest-vitals">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
                <CardTitle className="text-base">Latest Vitals</CardTitle>
                <span className="text-xs text-muted-foreground" data-testid="text-vitals-date">
                  {formatDateTime(latestVitals.recordedAt)}
                </span>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Height</span>
                    <p className="font-medium" data-testid="text-vital-height">{latestVitals.height ? `${latestVitals.height} cm` : "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Weight</span>
                    <p className="font-medium" data-testid="text-vital-weight">{latestVitals.weight ? `${latestVitals.weight} kg` : "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">BMI</span>
                    <div className="flex items-center gap-2">
                      <p className="font-medium" data-testid="text-vital-bmi">{latestVitals.bmi ? Number(latestVitals.bmi).toFixed(1) : "-"}</p>
                      {latestVitals.bmi && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${getBmiCategoryColor(Number(latestVitals.bmi))}`}>
                          {getBmiCategory(Number(latestVitals.bmi)).label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Blood Pressure</span>
                    <p className="font-medium" data-testid="text-vital-bp">{latestVitals.bloodPressure || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Pulse</span>
                    <p className="font-medium" data-testid="text-vital-pulse">{latestVitals.pulse ? `${latestVitals.pulse} bpm` : "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Temperature</span>
                    <p className="font-medium" data-testid="text-vital-temp">{latestVitals.temperature ? `${latestVitals.temperature} °F` : "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">SpO2</span>
                    <p className="font-medium" data-testid="text-vital-spo2">{latestVitals.spO2 !== null && latestVitals.spO2 !== undefined ? `${latestVitals.spO2}%` : "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="empty-vitals">
                <Thermometer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No vitals recorded yet.
              </CardContent>
            </Card>
          )}

          {bmiTrend.length > 0 && (
            <Card data-testid="card-bmi-trend">
              <CardHeader>
                <CardTitle className="text-base">BMI Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bmiTrend.map((entry, idx) => (
                    <div key={entry.id} className="flex items-center justify-between gap-4" data-testid={`bmi-trend-row-${idx}`}>
                      <span className="text-sm text-muted-foreground">{formatDate(entry.recordedAt)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.bmiVal.toFixed(1)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${getBmiCategoryColor(entry.bmiVal)}`}>
                          {getBmiCategory(entry.bmiVal).label}
                        </span>
                        {entry.trend === "up" && <TrendingUp className="h-4 w-4 text-red-500" />}
                        {entry.trend === "down" && <TrendingDown className="h-4 w-4 text-green-500" />}
                        {entry.trend === "same" && <Minus className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-recent-consultations">
            <CardHeader>
              <CardTitle className="text-base">Recent Consultations</CardTitle>
            </CardHeader>
            <CardContent>
              {recentConsultations.length > 0 ? (
                <div className="space-y-3">
                  {recentConsultations.map((visit, idx) => (
                    <div key={visit.id} className="flex items-start justify-between gap-4 pb-3 border-b last:border-b-0 last:pb-0" data-testid={`recent-consultation-${idx}`}>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Token #{visit.tokenNumber}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-md ${getStatusBadgeClass(visit.status)}`} data-testid={`status-badge-${idx}`}>
                            {visit.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        {visit.symptoms && (
                          <p className="text-sm text-muted-foreground truncate" data-testid={`consultation-symptoms-${idx}`}>
                            {visit.symptoms}
                          </p>
                        )}
                        {visit.diagnosis && (
                          <p className="text-sm" data-testid={`consultation-diagnosis-${idx}`}>
                            {visit.diagnosis}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`consultation-date-${idx}`}>
                        {formatDate(visit.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4" data-testid="empty-recent-consultations">
                  <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No consultations recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitals" className="mt-4" data-testid="tabcontent-vitals">
          {vitals.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table data-testid="table-vitals">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Height (cm)</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>BMI</TableHead>
                        <TableHead>Blood Pressure</TableHead>
                        <TableHead>Pulse</TableHead>
                        <TableHead>Temperature</TableHead>
                        <TableHead>SpO2</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vitals.map((v, idx) => {
                        const bmiVal = v.bmi ? Number(v.bmi) : null;
                        return (
                          <TableRow key={v.id} data-testid={`vitals-row-${idx}`}>
                            <TableCell className="whitespace-nowrap">{formatDate(v.recordedAt)}</TableCell>
                            <TableCell>{v.height || "-"}</TableCell>
                            <TableCell>{v.weight || "-"}</TableCell>
                            <TableCell>
                              {bmiVal ? (
                                <div className="flex items-center gap-2">
                                  <span>{bmiVal.toFixed(1)}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-md ${getBmiCategoryColor(bmiVal)}`} data-testid={`bmi-badge-${idx}`}>
                                    {getBmiCategory(bmiVal).label}
                                  </span>
                                </div>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{v.bloodPressure || "-"}</TableCell>
                            <TableCell>{v.pulse || "-"}</TableCell>
                            <TableCell>{v.temperature || "-"}</TableCell>
                            <TableCell>{v.spO2 !== null && v.spO2 !== undefined ? `${v.spO2}%` : "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="empty-vitals-history">
                <Thermometer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No vitals records found.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="consultations" className="mt-4" data-testid="tabcontent-consultations">
          {visits.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <Table data-testid="table-consultations">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Token #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Symptoms</TableHead>
                        <TableHead>Diagnosis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.map((visit, idx) => (
                        <TableRow key={visit.id} data-testid={`consultation-row-${idx}`}>
                          <TableCell className="whitespace-nowrap">{formatDate(visit.createdAt)}</TableCell>
                          <TableCell>#{visit.tokenNumber}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md ${getStatusBadgeClass(visit.status)}`} data-testid={`consultation-status-${idx}`}>
                              {visit.status.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize">{visit.visitType?.replace(/_/g, " ") || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{visit.symptoms || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{visit.diagnosis || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="empty-consultations">
                <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No consultation records found.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4 space-y-4" data-testid="tabcontent-prescriptions">
          {prescriptionsByVisit.length > 0 ? (
            prescriptionsByVisit.map((group, groupIdx) => (
              <Card key={groupIdx} data-testid={`prescription-group-${groupIdx}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {group.date}
                  </CardTitle>
                  {group.visit && (
                    <span className="text-xs text-muted-foreground">Token #{group.visit.tokenNumber}</span>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {group.prescriptions.map((rx, rxIdx) => (
                      <div key={rx.id} className="space-y-1 pb-3 border-b last:border-b-0 last:pb-0" data-testid={`prescription-item-${groupIdx}-${rxIdx}`}>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="space-y-0.5">
                            <p className="font-medium flex items-center gap-2" data-testid={`prescription-medicine-${groupIdx}-${rxIdx}`}>
                              <Pill className="h-3.5 w-3.5 text-primary" />
                              {rx.medicineName}
                            </p>
                            {rx.translatedMedicineName && (
                              <p className="text-xs text-muted-foreground ml-5">{rx.translatedMedicineName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground ml-5 flex-wrap">
                          {rx.dosage && (
                            <span data-testid={`prescription-dosage-${groupIdx}-${rxIdx}`}>
                              {rx.dosage}
                              {rx.translatedDosage && <span className="block text-xs">{rx.translatedDosage}</span>}
                            </span>
                          )}
                          {rx.frequency && (
                            <span data-testid={`prescription-frequency-${groupIdx}-${rxIdx}`}>
                              {rx.frequency}
                              {rx.translatedFrequency && <span className="block text-xs">{rx.translatedFrequency}</span>}
                            </span>
                          )}
                          {rx.duration && (
                            <span data-testid={`prescription-duration-${groupIdx}-${rxIdx}`}>
                              {rx.duration}
                              {rx.translatedDuration && <span className="block text-xs">{rx.translatedDuration}</span>}
                            </span>
                          )}
                        </div>
                        {rx.instructions && (
                          <p className="text-sm ml-5" data-testid={`prescription-instructions-${groupIdx}-${rxIdx}`}>
                            {rx.instructions}
                            {rx.translatedInstructions && (
                              <span className="block text-xs text-muted-foreground">{rx.translatedInstructions}</span>
                            )}
                          </p>
                        )}
                        {rx.followUpDate && (
                          <p className="text-xs text-muted-foreground ml-5 flex items-center gap-1" data-testid={`prescription-followup-${groupIdx}-${rxIdx}`}>
                            <Clock className="h-3 w-3" />
                            Follow-up: {formatDate(rx.followUpDate)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground" data-testid="empty-prescriptions">
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No prescriptions found.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
