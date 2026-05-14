import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  FileText,
  TestTube2,
  Loader2,
  Eye,
  Clock,
  CheckCircle2,
  Edit,
  Share2,
  Download,
  FileCheck,
  Lock,
  User,
  AlertTriangle,
  Copy,
  Mail,
  Link,
  ExternalLink,
  Droplets,
  FlaskConical,
  AlertCircle,
  ChevronRight,
  Calendar,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Sample, Patient, Test, Bill, TestReport } from "@shared/schema";
import { ReportEntryForm } from "@/components/report-entry-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const getSampleStatusBadge = (status: string) => {
  switch (status) {
    case "collected":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Collected
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <FlaskConical className="h-3 w-3 mr-1" />
          Processing
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getReportStatusBadge = (status: string | null | undefined) => {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <Edit className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case "finalized":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Finalized
        </Badge>
      );
    case "revised":
      return (
        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
          <FileCheck className="h-3 w-3 mr-1" />
          Revised
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Not Started
        </Badge>
      );
  }
};

interface SampleWithData extends Sample {
  patient?: Patient;
  test?: Test;
  bill?: Bill;
  report?: TestReport;
}

export default function SamplesReports() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [mainTab, setMainTab] = useState<"samples" | "reports">("samples");
  const [sampleStatusFilter, setSampleStatusFilter] = useState<string>("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("all");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  
  const [selectedSampleDetails, setSelectedSampleDetails] = useState<SampleWithData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [existingReport, setExistingReport] = useState<TestReport | null>(null);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareReport, setShareReport] = useState<TestReport | null>(null);
  const [sharePatient, setSharePatient] = useState<Patient | null>(null);

  type SortField = "sampleId" | "patient" | "test" | "collected" | "status";
  type SortOrder = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("collected");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortOrder === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1 text-primary" /> 
      : <ArrowDown className="h-4 w-4 ml-1 text-primary" />;
  };

  const { data: samples = [], isLoading: samplesLoading } = useQuery<Sample[]>({
    queryKey: ["/api/samples"],
  });

  const { data: testReports = [], isLoading: reportsLoading } = useQuery<TestReport[]>({
    queryKey: ["/api/test-reports"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const { data: bills = [] } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const getPatient = (id: string) => patients.find((p) => p.id === id);
  const getTest = (id: string) => tests.find((t) => t.id === id);
  const getBill = (id: string) => bills.find((b) => b.id === id);
  const getReportForSample = (sampleId: string) =>
    testReports.find((r) => r.sampleId === sampleId);

  const samplesWithData: SampleWithData[] = samples.map((sample) => ({
    ...sample,
    patient: getPatient(sample.patientId),
    test: getTest(sample.testId),
    bill: getBill(sample.billId),
    report: getReportForSample(sample.id),
  }));

  const filteredSamples = samplesWithData.filter((sample) => {
    const matchesSearch =
      !searchQuery ||
      sample.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.patient?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.patient?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.test?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = sampleStatusFilter === "all" || sample.status === sampleStatusFilter;
    const matchesPatient = selectedPatients.length === 0 || selectedPatients.includes(sample.patientId);

    return matchesSearch && matchesStatus && matchesPatient;
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "sampleId":
        comparison = a.sampleId.localeCompare(b.sampleId);
        break;
      case "patient":
        const patientA = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "";
        const patientB = b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : "";
        comparison = patientA.localeCompare(patientB);
        break;
      case "test":
        comparison = (a.test?.name || "").localeCompare(b.test?.name || "");
        break;
      case "collected":
        comparison = new Date(a.collectedAt || 0).getTime() - new Date(b.collectedAt || 0).getTime();
        break;
      case "status":
        comparison = (a.status || "").localeCompare(b.status || "");
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const filteredReports = samplesWithData.filter((sample) => {
    const matchesSearch =
      !searchQuery ||
      sample.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.patient?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.patient?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.test?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.report?.reportNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPatient = selectedPatients.length === 0 || selectedPatients.includes(sample.patientId);

    if (!matchesPatient) return false;
    if (reportStatusFilter === "all") return matchesSearch;
    if (reportStatusFilter === "not_started") return matchesSearch && !sample.report;
    if (reportStatusFilter === "pending") return matchesSearch && sample.report?.status === "pending";
    if (reportStatusFilter === "draft") return matchesSearch && sample.report?.status === "draft";
    if (reportStatusFilter === "finalized") return matchesSearch && sample.report?.status === "finalized";
    return matchesSearch;
  });

  const sampleStats = {
    total: samples.length,
    collected: samples.filter(s => s.status === "collected").length,
    processing: samples.filter(s => s.status === "processing").length,
    completed: samples.filter(s => s.status === "completed").length,
    rejected: samples.filter(s => s.status === "rejected").length,
  };

  const reportStats = {
    total: samples.length,
    notStarted: samplesWithData.filter(s => !s.report).length,
    pending: samplesWithData.filter(s => s.report?.status === "pending").length,
    draft: samplesWithData.filter(s => s.report?.status === "draft").length,
    finalized: samplesWithData.filter(s => s.report?.status === "finalized").length,
  };

  const shareTrackMutation = useMutation({
    mutationFn: async ({ reportId, shareMethod, recipientPhone, recipientEmail }: {
      reportId: string;
      shareMethod: string;
      recipientPhone?: string | null;
      recipientEmail?: string | null;
    }) => {
      return apiRequest("POST", `/api/test-reports/${reportId}/share`, {
        shareMethod,
        recipientPhone,
        recipientEmail,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-reports"] });
    },
  });

  const updateSampleStatusMutation = useMutation({
    mutationFn: async ({ sampleId, status }: { sampleId: string; status: string }) => {
      return apiRequest("PATCH", `/api/samples/${sampleId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      toast({ title: "Sample status updated" });
    },
  });

  const handleOpenSampleDetails = (sample: SampleWithData) => {
    setSelectedSampleDetails(sample);
    setIsDetailsOpen(true);
  };

  const handleOpenReportEntry = (sample: SampleWithData) => {
    if (!sample.patient || !sample.test) return;
    setSelectedSample(sample);
    setSelectedPatient(sample.patient);
    setSelectedTest(sample.test);
    setExistingReport(sample.report || null);
    setIsEntryDialogOpen(true);
  };

  const handleReportSaved = () => {
    setIsEntryDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/test-reports"] });
    queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
  };

  const handleReportFinalized = () => {
    handleReportSaved();
    setReportStatusFilter("finalized");
    setMainTab("reports");
  };

  const handleOpenShareDialog = (report: TestReport, patient: Patient) => {
    setShareReport(report);
    setSharePatient(patient);
    setIsShareDialogOpen(true);
  };

  const getReportUrl = (reportNumber: string) => {
    return `${window.location.origin}/report/${reportNumber}`;
  };

  const handleCopyLink = () => {
    if (!shareReport) return;
    const url = getReportUrl(shareReport.reportNumber);
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: "Report link copied to clipboard" });
    shareTrackMutation.mutate({ reportId: shareReport.id, shareMethod: "link" });
  };

  const handleShareWhatsApp = () => {
    if (!shareReport || !sharePatient) return;
    if (!sharePatient.phone) {
      toast({ 
        title: "Phone number missing", 
        description: "Patient doesn't have a phone number on record",
        variant: "destructive" 
      });
      return;
    }
    const url = getReportUrl(shareReport.reportNumber);
    const text = `Lab Report for ${sharePatient.firstName} ${sharePatient.lastName}\nReport #: ${shareReport.reportNumber}\n\nView report: ${url}`;
    const whatsappUrl = `https://wa.me/${sharePatient.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    shareTrackMutation.mutate({ reportId: shareReport.id, shareMethod: "whatsapp", recipientPhone: sharePatient.phone });
    toast({ title: "Opening WhatsApp", description: "Sharing report via WhatsApp" });
  };

  const handleShareEmail = () => {
    if (!shareReport || !sharePatient) return;
    if (!sharePatient.email) {
      toast({ 
        title: "Email missing", 
        description: "Patient doesn't have an email address on record",
        variant: "destructive" 
      });
      return;
    }
    const url = getReportUrl(shareReport.reportNumber);
    const subject = `Lab Report - ${shareReport.reportNumber}`;
    const body = `Dear ${sharePatient.firstName},\n\nYour lab report is ready.\n\nReport #: ${shareReport.reportNumber}\n\nView your report here: ${url}\n\nBest regards`;
    const mailtoUrl = `mailto:${sharePatient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    shareTrackMutation.mutate({ reportId: shareReport.id, shareMethod: "email", recipientEmail: sharePatient.email });
  };

  const handleViewReport = (reportNumber: string) => {
    window.open(`/report/${reportNumber}`, "_blank");
  };

  const isLoading = samplesLoading || reportsLoading;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: Date | string | null | undefined) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Samples & Reports</h1>
          <p className="text-muted-foreground">
            Manage sample tracking and test report creation
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search samples, patients, or tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "samples" | "reports")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="samples" data-testid="tab-samples" className="gap-2">
            <Droplets className="h-4 w-4" />
            Samples ({sampleStats.total})
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Reports ({reportStats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="samples" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover-elevate" onClick={() => setSampleStatusFilter("collected")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sampleStats.collected}</p>
                    <p className="text-xs text-muted-foreground">Collected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => setSampleStatusFilter("processing")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <FlaskConical className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sampleStats.processing}</p>
                    <p className="text-xs text-muted-foreground">Processing</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => setSampleStatusFilter("completed")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sampleStats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => setSampleStatusFilter("rejected")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{sampleStats.rejected}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Status:</Label>
              <Select value={sampleStatusFilter} onValueChange={setSampleStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-sample-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Samples</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Patient:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[200px] justify-between"
                    data-testid="button-sample-patient-filter"
                  >
                    {selectedPatients.length === 0 
                      ? "All Patients" 
                      : selectedPatients.length === 1
                        ? patients.find(p => p.id === selectedPatients[0])?.firstName + " " + patients.find(p => p.id === selectedPatients[0])?.lastName
                        : `${selectedPatients.length} patients`
                    }
                    <Search className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-2" align="start">
                  <div className="space-y-2">
                    <Input
                      placeholder="Search patients..."
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="h-8"
                      data-testid="input-patient-search"
                    />
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {patients
                          .filter(p => samplesWithData.some(s => s.patientId === p.id))
                          .filter(p => {
                            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                            return fullName.includes(patientSearchQuery.toLowerCase());
                          })
                          .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                          .map((patient) => (
                            <div 
                              key={patient.id} 
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover-elevate cursor-pointer"
                              onClick={() => {
                                if (selectedPatients.includes(patient.id)) {
                                  setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
                                } else {
                                  setSelectedPatients([...selectedPatients, patient.id]);
                                }
                              }}
                              data-testid={`checkbox-patient-${patient.id}`}
                            >
                              <Checkbox 
                                checked={selectedPatients.includes(patient.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPatients([...selectedPatients, patient.id]);
                                  } else {
                                    setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{patient.firstName} {patient.lastName}</span>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                    {selectedPatients.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedPatients([])}
                      >
                        Clear selection
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {(sampleStatusFilter !== "all" || selectedPatients.length > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSampleStatusFilter("all");
                  setSelectedPatients([]);
                }}
                data-testid="button-clear-sample-filters"
              >
                Clear All
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSamples.length === 0 ? (
                <div className="text-center p-12">
                  <Droplets className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-medium mb-1">No samples found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || sampleStatusFilter !== "all" || selectedPatients.length > 0
                      ? "Try adjusting your search or filters"
                      : "Samples will appear here when bills are created"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSort("sampleId")}
                      >
                        <div className="flex items-center">
                          Sample ID {getSortIcon("sampleId")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSort("patient")}
                      >
                        <div className="flex items-center">
                          Patient {getSortIcon("patient")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSort("test")}
                      >
                        <div className="flex items-center">
                          Test {getSortIcon("test")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSort("collected")}
                      >
                        <div className="flex items-center">
                          Collected {getSortIcon("collected")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status {getSortIcon("status")}
                        </div>
                      </TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSamples.map((sample) => (
                      <TableRow key={sample.id} data-testid={`row-sample-${sample.id}`}>
                        <TableCell className="font-mono font-medium">
                          {sample.sampleId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {sample.patient
                                ? `${sample.patient.firstName} ${sample.patient.lastName}`
                                : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TestTube2 className="h-4 w-4 text-muted-foreground" />
                            <span>{sample.test?.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(sample.collectedAt)}
                            <span className="text-muted-foreground ml-1">
                              {formatTime(sample.collectedAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getSampleStatusBadge(sample.status || "collected")}</TableCell>
                        <TableCell>{getReportStatusBadge(sample.report?.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenSampleDetails(sample)}
                              data-testid={`button-view-sample-${sample.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReportEntry(sample)}
                              data-testid={`button-edit-report-${sample.id}`}
                            >
                              {sample.report ? <Edit className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover-elevate" onClick={() => setReportStatusFilter("not_started")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <AlertTriangle className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportStats.notStarted}</p>
                    <p className="text-xs text-muted-foreground">Not Started</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => setReportStatusFilter("draft")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Edit className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportStats.draft}</p>
                    <p className="text-xs text-muted-foreground">Draft</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => setReportStatusFilter("finalized")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportStats.finalized}</p>
                    <p className="text-xs text-muted-foreground">Finalized</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover-elevate" onClick={() => setReportStatusFilter("all")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{reportStats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Status:</Label>
              <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-report-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Patient:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-[200px] justify-between"
                    data-testid="button-report-patient-filter"
                  >
                    {selectedPatients.length === 0 
                      ? "All Patients" 
                      : selectedPatients.length === 1
                        ? patients.find(p => p.id === selectedPatients[0])?.firstName + " " + patients.find(p => p.id === selectedPatients[0])?.lastName
                        : `${selectedPatients.length} patients`
                    }
                    <Search className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-2" align="start">
                  <div className="space-y-2">
                    <Input
                      placeholder="Search patients..."
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="h-8"
                      data-testid="input-report-patient-search"
                    />
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {patients
                          .filter(p => samplesWithData.some(s => s.patientId === p.id))
                          .filter(p => {
                            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                            return fullName.includes(patientSearchQuery.toLowerCase());
                          })
                          .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
                          .map((patient) => (
                            <div 
                              key={patient.id} 
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover-elevate cursor-pointer"
                              onClick={() => {
                                if (selectedPatients.includes(patient.id)) {
                                  setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
                                } else {
                                  setSelectedPatients([...selectedPatients, patient.id]);
                                }
                              }}
                              data-testid={`checkbox-report-patient-${patient.id}`}
                            >
                              <Checkbox 
                                checked={selectedPatients.includes(patient.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPatients([...selectedPatients, patient.id]);
                                  } else {
                                    setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{patient.firstName} {patient.lastName}</span>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                    {selectedPatients.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedPatients([])}
                      >
                        Clear selection
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {(reportStatusFilter !== "all" || selectedPatients.length > 0) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setReportStatusFilter("all");
                  setSelectedPatients([]);
                }}
                data-testid="button-clear-report-filters"
              >
                Clear All
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center p-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-medium mb-1">No reports found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery || reportStatusFilter !== "all" || selectedPatients.length > 0
                      ? "Try adjusting your search or filters"
                      : "Create samples first to start generating reports"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Sample ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((sample) => (
                      <TableRow key={sample.id} data-testid={`row-report-${sample.id}`}>
                        <TableCell className="font-mono font-medium">
                          {sample.report?.reportNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {sample.patient
                                ? `${sample.patient.firstName} ${sample.patient.lastName}`
                                : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TestTube2 className="h-4 w-4 text-muted-foreground" />
                            <span>{sample.test?.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {sample.sampleId}
                        </TableCell>
                        <TableCell>{getReportStatusBadge(sample.report?.status)}</TableCell>
                        <TableCell>{formatDate(sample.report?.createdAt || sample.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenReportEntry(sample)}
                              data-testid={`button-edit-report-${sample.id}`}
                            >
                              {sample.report?.isLocked ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Edit className="h-4 w-4" />
                              )}
                            </Button>
                            {sample.report?.status === "finalized" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewReport(sample.report!.reportNumber)}
                                  data-testid={`button-view-report-${sample.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => sample.patient && handleOpenShareDialog(sample.report!, sample.patient)}
                                  data-testid={`button-share-report-${sample.id}`}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Sample Details</SheetTitle>
            <SheetDescription>
              {selectedSampleDetails?.sampleId}
            </SheetDescription>
          </SheetHeader>
          {selectedSampleDetails && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getSampleStatusBadge(selectedSampleDetails.status || "collected")}</div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-muted-foreground">Patient</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedSampleDetails.patient
                        ? `${selectedSampleDetails.patient.firstName} ${selectedSampleDetails.patient.lastName}`
                        : "-"}
                    </span>
                  </div>
                  {selectedSampleDetails.patient?.phone && (
                    <p className="text-sm text-muted-foreground mt-1">{selectedSampleDetails.patient.phone}</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-muted-foreground">Test</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <TestTube2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedSampleDetails.test?.name || "-"}</span>
                  </div>
                  {selectedSampleDetails.test?.code && (
                    <p className="text-sm text-muted-foreground mt-1">Code: {selectedSampleDetails.test.code}</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-muted-foreground">Collection</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(selectedSampleDetails.collectedAt)} {formatTime(selectedSampleDetails.collectedAt)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-muted-foreground">Report Status</Label>
                  <div className="mt-1">{getReportStatusBadge(selectedSampleDetails.report?.status)}</div>
                  {selectedSampleDetails.report?.reportNumber && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Report #: {selectedSampleDetails.report.reportNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Update Status</Label>
                <Select
                  value={selectedSampleDetails.status || "collected"}
                  onValueChange={(status) => {
                    updateSampleStatusMutation.mutate({ sampleId: selectedSampleDetails.id, status });
                    setSelectedSampleDetails({ ...selectedSampleDetails, status });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collected">Collected</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  handleOpenReportEntry(selectedSampleDetails);
                  setIsDetailsOpen(false);
                }}
              >
                {selectedSampleDetails.report ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Report
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Create Report
                  </>
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {existingReport ? "Edit Test Report" : "Create Test Report"}
            </DialogTitle>
            <DialogDescription>
              {selectedPatient && selectedTest && (
                <>
                  {selectedPatient.firstName} {selectedPatient.lastName} - {selectedTest.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedSample && selectedPatient && selectedTest && (
            <ReportEntryForm
              sample={selectedSample}
              patient={selectedPatient}
              test={selectedTest}
              existingReport={existingReport}
              onSave={handleReportSaved}
              onFinalize={handleReportFinalized}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Report
            </DialogTitle>
            <DialogDescription>
              {sharePatient && (
                <>Share report with {sharePatient.firstName} {sharePatient.lastName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleShareWhatsApp} className="gap-2">
                <SiWhatsapp className="h-4 w-4 text-green-600" />
                WhatsApp
              </Button>
              <Button variant="outline" onClick={handleShareEmail} className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Report Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareReport ? getReportUrl(shareReport.reportNumber) : ""}
                  className="font-mono text-xs"
                />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => shareReport && handleViewReport(shareReport.reportNumber)}
            >
              <ExternalLink className="h-4 w-4" />
              Open Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
