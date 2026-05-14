import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
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
  Phone,
  Link,
  ExternalLink,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Sample, Patient, Test, Bill, TestReport } from "@shared/schema";
import { ReportEntryForm } from "@/components/report-entry-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const getTestReportStatusBadge = (status: string | null) => {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending Entry
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
          No Report
        </Badge>
      );
  }
};

export default function TestReports() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [existingReport, setExistingReport] = useState<TestReport | null>(null);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareReport, setShareReport] = useState<TestReport | null>(null);
  const [sharePatient, setSharePatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "drafts" | "finalized">("pending");

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

  const samplesWithData = samples.map((sample) => ({
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

    if (activeTab === "pending") {
      return matchesSearch && (!sample.report || sample.report.status === "pending");
    } else if (activeTab === "drafts") {
      return matchesSearch && sample.report?.status === "draft";
    } else {
      return matchesSearch && sample.report?.status === "finalized";
    }
  });

  const pendingCount = samplesWithData.filter(
    (s) => !s.report || s.report.status === "pending"
  ).length;
  const draftCount = samplesWithData.filter((s) => s.report?.status === "draft").length;
  const finalizedCount = samplesWithData.filter(
    (s) => s.report?.status === "finalized"
  ).length;

  const handleOpenEntryDialog = (sample: Sample) => {
    const patient = getPatient(sample.patientId);
    const test = getTest(sample.testId);
    const report = getReportForSample(sample.id);

    if (!patient || !test) return;

    setSelectedSample(sample);
    setSelectedPatient(patient);
    setSelectedTest(test);
    setExistingReport(report || null);
    setIsEntryDialogOpen(true);
  };

  const handleReportSaved = () => {
    setIsEntryDialogOpen(false);
  };

  const handleReportFinalized = () => {
    setIsEntryDialogOpen(false);
    setActiveTab("finalized");
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
    onError: (error) => {
      console.error("Failed to track share:", error);
    },
  });

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
    toast({
      title: "Link copied",
      description: "Report link copied to clipboard",
    });
    
    shareTrackMutation.mutate({
      reportId: shareReport.id,
      shareMethod: "link",
    });
  };

  const handleShareWhatsApp = () => {
    if (!shareReport || !sharePatient) return;
    const url = getReportUrl(shareReport.reportNumber);
    const text = `Lab Report for ${sharePatient.firstName} ${sharePatient.lastName}\nReport #: ${shareReport.reportNumber}\n\nView report: ${url}`;
    const whatsappUrl = `https://wa.me/${sharePatient.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    
    shareTrackMutation.mutate({
      reportId: shareReport.id,
      shareMethod: "whatsapp",
      recipientPhone: sharePatient.phone,
    });
    
    toast({
      title: "Opening WhatsApp",
      description: "Sharing report via WhatsApp",
    });
  };

  const handleShareEmail = () => {
    if (!shareReport || !sharePatient) return;
    const url = getReportUrl(shareReport.reportNumber);
    const subject = `Lab Report - ${shareReport.reportNumber}`;
    const body = `Dear ${sharePatient.firstName},\n\nYour lab report is ready.\n\nReport #: ${shareReport.reportNumber}\n\nView your report here: ${url}\n\nBest regards`;
    const mailtoUrl = `mailto:${sharePatient.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    
    shareTrackMutation.mutate({
      reportId: shareReport.id,
      shareMethod: "email",
      recipientEmail: sharePatient.email,
    });
  };

  const handleViewReport = () => {
    if (!shareReport) return;
    window.open(getReportUrl(shareReport.reportNumber), "_blank");
  };

  const handleDownloadPDF = (reportNumber: string) => {
    window.open(`/report/${reportNumber}`, "_blank");
  };

  const isLoading = samplesLoading || reportsLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Test Reports</h1>
          <p className="text-muted-foreground">
            Enter and manage individual test results
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by sample ID, patient name, or test..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-reports"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "pending" | "drafts" | "finalized")}
      >
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            <Edit className="h-4 w-4 mr-2" />
            Drafts ({draftCount})
          </TabsTrigger>
          <TabsTrigger value="finalized" data-testid="tab-finalized">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Finalized ({finalizedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                {activeTab === "pending" && "Samples Pending Report Entry"}
                {activeTab === "drafts" && "Draft Reports"}
                {activeTab === "finalized" && "Finalized Reports"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredSamples.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {activeTab} reports found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sample ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Report #</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSamples.map((sample) => (
                      <TableRow key={sample.id} data-testid={`row-sample-${sample.id}`}>
                        <TableCell className="font-medium">
                          {sample.sampleId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {sample.patient?.firstName} {sample.patient?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {sample.patient?.patientId}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TestTube2 className="h-4 w-4 text-primary" />
                            <span className="text-sm">{sample.test?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTestReportStatusBadge(sample.report?.status || null)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sample.report?.reportNumber || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEntryDialog(sample)}
                              data-testid={`button-edit-${sample.id}`}
                            >
                              {sample.report?.isLocked ? (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </>
                              ) : (
                                <>
                                  <Edit className="h-4 w-4 mr-1" />
                                  {sample.report ? "Edit" : "Enter Results"}
                                </>
                              )}
                            </Button>
                            {sample.report?.status === "finalized" && sample.patient && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Share Report"
                                  onClick={() => handleOpenShareDialog(sample.report!, sample.patient!)}
                                  data-testid={`button-share-${sample.id}`}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Download PDF"
                                  onClick={() => handleDownloadPDF(sample.report!.reportNumber)}
                                  data-testid={`button-download-${sample.id}`}
                                >
                                  <Download className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {existingReport?.isLocked ? "View Report" : "Enter Test Results"}
              {existingReport?.isLocked && (
                <Badge className="bg-amber-500/10 text-amber-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {selectedSample && selectedPatient && selectedTest && (
              <div className="space-y-4 pb-4">
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Patient</p>
                        <p className="font-medium">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPatient.patientId} | {selectedPatient.gender} |{" "}
                          {selectedPatient.dateOfBirth || "Age unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Sample</p>
                        <p className="font-medium">{selectedSample.sampleId}</p>
                        <p className="text-xs text-muted-foreground">
                          Collected:{" "}
                          {selectedSample.collectedAt
                            ? new Date(selectedSample.collectedAt).toLocaleString()
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Test</p>
                        <p className="font-medium">{selectedTest.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedTest.code} | {selectedTest.category}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ReportEntryForm
                  sample={selectedSample}
                  patient={selectedPatient}
                  test={selectedTest}
                  existingReport={existingReport}
                  onSave={handleReportSaved}
                  onFinalize={handleReportFinalized}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Report
            </DialogTitle>
            <DialogDescription>
              Share this report with the patient via WhatsApp, Email, or copy the link.
            </DialogDescription>
          </DialogHeader>

          {shareReport && sharePatient && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm font-medium">
                  {sharePatient.firstName} {sharePatient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Report #: {shareReport.reportNumber}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Share via</Label>
                <div className="grid grid-cols-2 gap-2">
                  {sharePatient.phone && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleShareWhatsApp}
                      data-testid="button-share-whatsapp"
                    >
                      <SiWhatsapp className="h-4 w-4 text-green-500" />
                      WhatsApp
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleShareEmail}
                    data-testid="button-share-email"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Report Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={getReportUrl(shareReport.reportNumber)}
                    readOnly
                    className="text-sm"
                    data-testid="input-share-link"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={handleViewReport}
                  data-testid="button-view-report"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Report
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
