import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ViewSwitcher, useViewMode, InlineEditCell } from "@/components/view-switcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  FileText,
  TestTube2,
  Loader2,
  Send,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Share2,
  User,
  Phone,
  FileCheck,
  Copy,
  Mail,
  Link,
  Edit,
} from "lucide-react";
import type { Sample, Report, Patient, Test, Bill, Organization } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportTemplateField {
  id: string;
  name: string;
  type: "numeric" | "text" | "select" | "boolean";
  unit?: string;
  normalRange?: string;
  options?: string[];
  required?: boolean;
  order: number;
}

interface ReportTemplate {
  fields: ReportTemplateField[];
  layout?: "standard" | "table" | "detailed";
  showReferenceRanges?: boolean;
  showInterpretation?: boolean;
}

const getSampleStatusBadge = (status: string) => {
  switch (status) {
    case "collected":
      return (
        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Collected
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <TestTube2 className="h-3 w-3 mr-1" />
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
    case "reported":
      return (
        <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20">
          <FileText className="h-3 w-3 mr-1" />
          Reported
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getReportStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "generated":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
          <FileText className="h-3 w-3 mr-1" />
          Generated
        </Badge>
      );
    case "delivered":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Delivered
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Reports() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useViewMode("reports");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [resultValue, setResultValue] = useState("");
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [notes, setNotes] = useState("");
  const [resultData, setResultData] = useState<Record<string, string>>({});
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

  const { data: samples = [], isLoading: samplesLoading } = useQuery<Sample[]>({
    queryKey: ["/api/samples"],
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
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

  const { data: orgData } = useQuery<{ organization: Organization }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const updateResultMutation = useMutation({
    mutationFn: async ({ sampleId, data }: { sampleId: string; data: { resultValue: string; isAbnormal: boolean; notes?: string; resultData?: Record<string, string> } }) => {
      return apiRequest("PATCH", `/api/samples/${sampleId}/result`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      setIsResultDialogOpen(false);
      setSelectedSample(null);
      setResultValue("");
      setIsAbnormal(false);
      setNotes("");
      setResultData({});
      setCurrentTemplate(null);
      toast({
        title: "Result saved",
        description: "Sample result has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save result. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (billId: string) => {
      const bill = bills.find((b) => b.id === billId);
      if (!bill) throw new Error("Bill not found");
      
      const billSamples = samples.filter((s) => s.billId === billId && s.status === "completed");
      
      const testResults = billSamples.map((sample) => {
        const test = tests.find((t) => t.id === sample.testId);
        return {
          testName: test?.name || "Unknown Test",
          value: sample.resultValue || "",
          normalRange: test?.normalRange || "",
          unit: test?.unit || "",
          isAbnormal: sample.isAbnormal || false,
        };
      }).filter(r => r.value);

      let aiSummary = "";
      if (testResults.length > 0) {
        try {
          const summaryResponse = await apiRequest("POST", "/api/ai/report-summary", { testResults });
          const summaryData = await summaryResponse.json();
          aiSummary = summaryData.summary || "";
        } catch (error) {
          console.error("Failed to generate AI summary:", error);
        }
      }
      
      return apiRequest("POST", "/api/reports", {
        billId,
        patientId: bill.patientId,
        aiSummary,
        status: "generated",
        generatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      toast({
        title: "Report generated",
        description: "Lab report with AI summary has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOpenResultDialog = async (sample: Sample) => {
    setSelectedSample(sample);
    setResultValue(sample.resultValue || "");
    setIsAbnormal(sample.isAbnormal || false);
    setNotes(sample.notes || "");
    setIsResultDialogOpen(true);
    
    // Load template from test or generate it
    const test = tests.find((t) => t.id === sample.testId);
    if (test?.reportTemplate) {
      setCurrentTemplate(test.reportTemplate as ReportTemplate);
      // Load existing result data if available
      if (sample.resultData) {
        setResultData(sample.resultData as Record<string, string>);
      }
    } else if (test) {
      // Generate template using AI if not available
      setIsLoadingTemplate(true);
      try {
        const response = await apiRequest("POST", "/api/ai/generate-template", {
          testName: test.name,
          category: test.category,
        });
        const template = await response.json();
        setCurrentTemplate(template);
      } catch (error) {
        console.error("Failed to generate template:", error);
        // Use default simple template
        setCurrentTemplate({
          fields: [{
            id: "result",
            name: "Result",
            type: "text",
            required: true,
            order: 1,
          }],
          layout: "standard",
          showReferenceRanges: true,
        });
      } finally {
        setIsLoadingTemplate(false);
      }
    }
  };

  const handleSaveResult = () => {
    if (!selectedSample) return;
    
    // Check if we have template-based results
    if (currentTemplate && currentTemplate.fields.length > 0) {
      const hasRequiredFields = currentTemplate.fields
        .filter((f) => f.required)
        .every((f) => resultData[f.id]?.trim());
      
      if (!hasRequiredFields) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
      
      // Build summary result value from all fields
      const summaryValue = currentTemplate.fields
        .sort((a, b) => a.order - b.order)
        .filter((f) => resultData[f.id])
        .map((f) => `${f.name}: ${resultData[f.id]}${f.unit ? ` ${f.unit}` : ""}`)
        .join("; ");
      
      updateResultMutation.mutate({
        sampleId: selectedSample.id,
        data: { 
          resultValue: summaryValue || resultValue,
          isAbnormal, 
          notes,
          resultData,
        },
      });
    } else {
      if (!resultValue.trim()) {
        toast({
          title: "Error",
          description: "Please enter a result value.",
          variant: "destructive",
        });
        return;
      }
      updateResultMutation.mutate({
        sampleId: selectedSample.id,
        data: { resultValue, isAbnormal, notes },
      });
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setResultData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const renderTemplateField = (field: ReportTemplateField) => {
    const value = resultData[field.id] || "";
    
    switch (field.type) {
      case "numeric":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.name}
              {field.required && <span className="text-destructive">*</span>}
              {field.unit && (
                <span className="text-xs text-muted-foreground">({field.unit})</span>
              )}
            </Label>
            <Input
              id={field.id}
              type="number"
              step="any"
              placeholder={field.normalRange ? `Normal: ${field.normalRange}` : "Enter value"}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              data-testid={`input-field-${field.id}`}
            />
            {field.normalRange && (
              <p className="text-xs text-muted-foreground">
                Reference: {field.normalRange}
              </p>
            )}
          </div>
        );
      
      case "select":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.name}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select value={value} onValueChange={(v) => handleFieldChange(field.id, v)}>
              <SelectTrigger data-testid={`select-field-${field.id}`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "boolean":
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === "true"}
              onCheckedChange={(checked) => handleFieldChange(field.id, String(checked))}
              data-testid={`checkbox-field-${field.id}`}
            />
            <Label htmlFor={field.id}>{field.name}</Label>
          </div>
        );
      
      default: // text
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.name}
              {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              placeholder="Enter value"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              data-testid={`input-field-${field.id}`}
            />
          </div>
        );
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setIsDetailDialogOpen(true);
  };

  const getShareableUrl = (reportId: string) => {
    return `${window.location.origin}/reports/view/${reportId}`;
  };

  const handleCopyLink = (reportId: string) => {
    const url = getShareableUrl(reportId);
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied",
        description: "Report link has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    });
  };

  const handleShareWhatsApp = (report: Report) => {
    const patient = patients.find((p) => p.id === report.patientId);
    const phone = patient?.phone || "";
    const url = getShareableUrl(report.id);
    const orgName = organization?.name || "our diagnostic center";
    const message = encodeURIComponent(
      `Hello ${patient?.firstName || ""},\n\n` +
      `Your lab report (${report.reportNumber}) from *${orgName}* is ready.\n\n` +
      `View your report here: ${url}\n\n` +
      `Thank you for choosing ${orgName}.`
    );
    const phoneNumber = phone.replace(/\D/g, "");
    const formattedPhone = phoneNumber.startsWith("91") ? phoneNumber : `91${phoneNumber}`;
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, "_blank");
  };

  const handleShareEmail = (report: Report) => {
    const patient = patients.find((p) => p.id === report.patientId);
    const email = patient?.email || "";
    const url = getShareableUrl(report.id);
    const orgName = organization?.name || "our diagnostic center";
    const subject = encodeURIComponent(`Your Lab Report ${report.reportNumber} from ${orgName} is Ready`);
    const body = encodeURIComponent(
      `Hello ${patient?.firstName || ""},\n\n` +
      `Your lab report (${report.reportNumber}) from ${orgName} is ready.\n\n` +
      `View your report here: ${url}\n\n` +
      `Thank you for choosing ${orgName}.`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_self");
  };

  const handleDownloadReportPDF = (report: Report) => {
    const patient = patients.find((p) => p.id === report.patientId);
    const reportSamples = samples.filter((s) => s.billId === report.billId);
    
    const primaryColor = organization?.primaryColor || "#2DD4BF";
    const headerColor = organization?.headerColor || "#0D9488";
    const accentColor = organization?.accentColor || "#0F766E";
    const orgName = organization?.name || "Healthcare Center";
    const orgAddress = organization?.address || "";
    const orgPhone = organization?.phone || "";
    const orgEmail = organization?.email || "";
    const showLogo = organization?.showLogo !== false;
    const logoUrl = organization?.logo || "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lab Report ${report.reportNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${headerColor}; padding-bottom: 20px; }
          .header-content { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 10px; }
          .header-logo { max-height: 60px; max-width: 120px; object-fit: contain; }
          .org-name { color: ${headerColor}; margin: 0; font-size: 24px; font-weight: bold; }
          .org-details { color: #666; font-size: 12px; margin-top: 5px; }
          .report-title { color: ${primaryColor}; font-size: 18px; font-weight: bold; margin-top: 15px; }
          .patient-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${accentColor}; }
          .patient-info h3 { color: ${headerColor}; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: ${headerColor}; color: white; }
          .abnormal { color: #d97706; font-weight: bold; }
          .normal { color: #059669; }
          .ai-summary { background: ${primaryColor}15; border: 1px solid ${primaryColor}40; border-radius: 8px; padding: 15px; margin-top: 20px; }
          .ai-summary h4 { color: ${primaryColor}; margin-top: 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid ${accentColor}; color: #666; }
          .footer-brand { color: ${headerColor}; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="header-logo" />` : ""}
            <div>
              <h1 class="org-name">${orgName}</h1>
              <p class="org-details">
                ${orgAddress ? orgAddress + " | " : ""}${orgPhone ? orgPhone : ""}${orgEmail ? " | " + orgEmail : ""}
              </p>
            </div>
          </div>
          <p class="report-title">LAB REPORT: ${report.reportNumber}</p>
          <p style="color: #666; font-size: 12px;">Date: ${report.createdAt ? new Date(report.createdAt).toLocaleDateString("en-IN") : "-"}</p>
        </div>
        
        <div class="patient-info">
          <h3>Patient Information</h3>
          <p><strong>Name:</strong> ${patient?.firstName || ""} ${patient?.lastName || ""}</p>
          <p><strong>Phone:</strong> ${patient?.phone || "-"}</p>
          ${patient?.gender ? `<p><strong>Gender:</strong> ${patient.gender}</p>` : ""}
          ${patient?.dateOfBirth ? `<p><strong>Date of Birth:</strong> ${patient.dateOfBirth}</p>` : ""}
        </div>

        <h3 style="color: ${headerColor};">Test Results</h3>
        <table>
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Result</th>
              <th>Normal Range</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reportSamples.map((sample) => {
              const test = tests.find((t) => t.id === sample.testId);
              return `
                <tr>
                  <td>${test?.name || "-"}</td>
                  <td class="${sample.isAbnormal ? 'abnormal' : ''}">${sample.resultValue || "-"} ${test?.unit || ""}</td>
                  <td>${test?.normalRange || "-"}</td>
                  <td class="${sample.isAbnormal ? 'abnormal' : 'normal'}">${sample.isAbnormal ? "Abnormal" : "Normal"}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        ${report.aiSummary ? `
          <div class="ai-summary">
            <h4>AI-Generated Summary</h4>
            <p>${report.aiSummary}</p>
          </div>
        ` : ""}

        <div class="footer">
          <p>Thank you for choosing <span class="footer-brand">${orgName}</span>!</p>
          <p style="font-size: 11px; color: #999;">This is a computer generated report.</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${report.reportNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report downloaded",
      description: `Saved as report-${report.reportNumber}.html - Open in browser to print as PDF`,
    });
  };

  const handleReviseReport = (report: Report) => {
    setSelectedReport(report);
    setIsDetailDialogOpen(false);
    toast({
      title: "Revise Report",
      description: "You can now update the test results for this report. Go to Samples tab to modify results.",
    });
  };

  const searchLower = searchQuery.toLowerCase();
  
  const filteredSamples = samples.filter((sample) => {
    const patient = patients.find((p) => p.id === sample.patientId);
    const test = tests.find((t) => t.id === sample.testId);
    return (
      sample.sampleId?.toLowerCase().includes(searchLower) ||
      patient?.firstName?.toLowerCase().includes(searchLower) ||
      patient?.lastName?.toLowerCase().includes(searchLower) ||
      test?.name?.toLowerCase().includes(searchLower)
    );
  });

  const filteredReports = reports.filter((report) => {
    const patient = patients.find((p) => p.id === report.patientId);
    return (
      report.reportNumber?.toLowerCase().includes(searchLower) ||
      patient?.firstName?.toLowerCase().includes(searchLower) ||
      patient?.lastName?.toLowerCase().includes(searchLower)
    );
  });

  const completedSamplesByBill = samples
    .filter((s) => s.status === "completed")
    .reduce((acc, sample) => {
      if (sample.billId) {
        if (!acc[sample.billId]) {
          acc[sample.billId] = [];
        }
        acc[sample.billId].push(sample);
      }
      return acc;
    }, {} as Record<string, Sample[]>);

  const readyForReport = Object.entries(completedSamplesByBill).filter(([billId]) => {
    const billSamples = samples.filter((s) => s.billId === billId);
    const allCompleted = billSamples.every((s) => s.status === "completed");
    const hasReport = reports.some((r) => r.billId === billId);
    return allCompleted && !hasReport && billSamples.length > 0;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Reports & Samples</h1>
          <p className="text-muted-foreground">Track sample status and manage lab reports</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by sample ID or report number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-reports"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") === "reports" ? "reports" : "samples"} className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="samples" data-testid="tab-samples">
              <TestTube2 className="h-4 w-4 mr-2" />
              Samples ({samples.length})
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <FileText className="h-4 w-4 mr-2" />
              Reports ({reports.length})
            </TabsTrigger>
          </TabsList>
          <ViewSwitcher pageKey="reports" defaultView="table" onChange={setViewMode} />
        </div>

        <TabsContent value="samples" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Sample Tracking</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {samplesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredSamples.length === 0 ? (
                <div className="text-center py-12">
                  <TestTube2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No samples found</h3>
                  <p className="text-sm text-muted-foreground">
                    Samples will appear here once bills are created
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSamples.map((sample) => {
                    const patient = patients.find((p) => p.id === sample.patientId);
                    const test = tests.find((t) => t.id === sample.testId);
                    return (
                      <Card key={sample.id} className="hover-elevate" data-testid={`card-sample-${sample.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Badge variant="outline" className="font-mono">
                              {sample.sampleId}
                            </Badge>
                            {getSampleStatusBadge(sample.status || "collected")}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {patient?.firstName || "-"} {patient?.lastName || ""}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <TestTube2 className="h-3.5 w-3.5" />
                              <span>{test?.name || "-"}</span>
                            </div>
                          </div>
                          {sample.resultValue && (
                            <div className="text-sm">
                              {sample.isAbnormal ? (
                                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>{sample.resultValue}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">{sample.resultValue}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <span className="text-xs text-muted-foreground">
                              {sample.collectedAt
                                ? new Date(sample.collectedAt).toLocaleDateString()
                                : "-"}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenResultDialog(sample)}
                                disabled={sample.status === "reported"}
                                data-testid={`button-enter-result-${sample.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" data-testid={`button-view-sample-${sample.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-2">
                  {filteredSamples.map((sample) => {
                    const patient = patients.find((p) => p.id === sample.patientId);
                    const test = tests.find((t) => t.id === sample.testId);
                    return (
                      <div
                        key={sample.id}
                        className="bg-muted/50 hover-elevate rounded-lg p-3 flex items-center flex-wrap gap-3"
                        data-testid={`list-sample-${sample.id}`}
                      >
                        <Badge variant="outline" className="font-mono">
                          {sample.sampleId}
                        </Badge>
                        <span className="font-medium min-w-[120px]">
                          {patient?.firstName || "-"} {patient?.lastName || ""}
                        </span>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[100px]">
                          <TestTube2 className="h-3.5 w-3.5" />
                          <span>{test?.name || "-"}</span>
                        </div>
                        {getSampleStatusBadge(sample.status || "collected")}
                        {sample.resultValue && (
                          <span className="text-sm">
                            {sample.isAbnormal ? (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {sample.resultValue}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{sample.resultValue}</span>
                            )}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {sample.collectedAt
                            ? new Date(sample.collectedAt).toLocaleDateString()
                            : "-"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenResultDialog(sample)}
                            disabled={sample.status === "reported"}
                            data-testid={`button-enter-result-${sample.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" data-testid={`button-view-sample-${sample.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Sample ID</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Test</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Collected</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSamples.map((sample) => (
                        <TableRow key={sample.id} className="hover-elevate" data-testid={`row-sample-${sample.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {sample.sampleId}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {patients.find((p) => p.id === sample.patientId)?.firstName || "-"}{" "}
                            {patients.find((p) => p.id === sample.patientId)?.lastName || ""}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TestTube2 className="h-4 w-4 text-muted-foreground" />
                              <span>{tests.find((t) => t.id === sample.testId)?.name || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getSampleStatusBadge(sample.status || "collected")}</TableCell>
                          <TableCell>
                            {sample.isAbnormal ? (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span className="text-sm">{sample.resultValue || "-"}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {sample.resultValue || "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {sample.collectedAt
                              ? new Date(sample.collectedAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleOpenResultDialog(sample)}
                                disabled={sample.status === "reported"}
                                data-testid={`button-enter-result-${sample.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" data-testid={`button-view-sample-${sample.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
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

        <TabsContent value="reports" className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-primary">AI-Powered Reports</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Reports include AI-generated summaries to help patients understand their results in simple language.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Lab Reports</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {reportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No reports found</h3>
                  <p className="text-sm text-muted-foreground">
                    Reports will appear here once samples are processed
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredReports.map((report) => {
                    const patient = patients.find((p) => p.id === report.patientId);
                    return (
                      <Card key={report.id} className="hover-elevate" data-testid={`card-report-${report.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Badge variant="outline" className="font-mono">
                              {report.reportNumber}
                            </Badge>
                            {getReportStatusBadge(report.status || "pending")}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {patient?.firstName || "-"} {patient?.lastName || ""}
                            </p>
                            {report.deliveryMethod && (
                              <Badge variant="secondary" className="capitalize">
                                {report.deliveryMethod}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                            <span className="text-xs text-muted-foreground">
                              {report.generatedAt
                                ? new Date(report.generatedAt).toLocaleDateString()
                                : "-"}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewReport(report)}
                                data-testid={`button-view-report-${report.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyLink(report.id)}
                                data-testid={`button-copy-link-${report.id}`}
                              >
                                <Link className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" data-testid={`button-download-${report.id}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleShareWhatsApp(report)}
                                data-testid={`button-send-${report.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : viewMode === "list" ? (
                <div className="space-y-2">
                  {filteredReports.map((report) => {
                    const patient = patients.find((p) => p.id === report.patientId);
                    return (
                      <div
                        key={report.id}
                        className="bg-muted/50 hover-elevate rounded-lg p-3 flex items-center flex-wrap gap-3"
                        data-testid={`list-report-${report.id}`}
                      >
                        <Badge variant="outline" className="font-mono">
                          {report.reportNumber}
                        </Badge>
                        <span className="font-medium min-w-[120px]">
                          {patient?.firstName || "-"} {patient?.lastName || ""}
                        </span>
                        {getReportStatusBadge(report.status || "pending")}
                        {report.deliveryMethod && (
                          <Badge variant="secondary" className="capitalize">
                            {report.deliveryMethod}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {report.generatedAt
                            ? new Date(report.generatedAt).toLocaleDateString()
                            : "-"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewReport(report)}
                            data-testid={`button-view-report-${report.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(report.id)}
                            data-testid={`button-copy-link-${report.id}`}
                          >
                            <Link className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" data-testid={`button-download-${report.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleShareWhatsApp(report)}
                            data-testid={`button-send-${report.id}`}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Report #</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id} className="hover-elevate" data-testid={`row-report-${report.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {report.reportNumber}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {patients.find((p) => p.id === report.patientId)?.firstName || "-"}{" "}
                            {patients.find((p) => p.id === report.patientId)?.lastName || ""}
                          </TableCell>
                          <TableCell>{getReportStatusBadge(report.status || "pending")}</TableCell>
                          <TableCell>
                            {report.deliveryMethod ? (
                              <Badge variant="secondary" className="capitalize">
                                {report.deliveryMethod}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {report.generatedAt
                              ? new Date(report.generatedAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleViewReport(report)}
                                data-testid={`button-view-report-${report.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleCopyLink(report.id)}
                                data-testid={`button-copy-link-${report.id}`}
                              >
                                <Link className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" data-testid={`button-download-${report.id}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleShareWhatsApp(report)}
                                data-testid={`button-send-${report.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
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

          {readyForReport.length > 0 && (
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-500" />
                  Ready for Report Generation ({readyForReport.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {readyForReport.map(([billId, completedSamples]) => {
                    const bill = bills.find((b) => b.id === billId);
                    const patient = patients.find((p) => p.id === bill?.patientId);
                    return (
                      <div
                        key={billId}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        data-testid={`ready-report-${billId}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-emerald-500/10">
                            <User className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {patient?.firstName} {patient?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {completedSamples.length} test(s) completed •{" "}
                              {completedSamples.map((s) => tests.find((t) => t.id === s.testId)?.name).filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => generateReportMutation.mutate(billId)}
                          disabled={generateReportMutation.isPending}
                          data-testid={`button-generate-report-${billId}`}
                        >
                          {generateReportMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Generate Report
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-primary" />
              Enter Test Result
            </DialogTitle>
            <DialogDescription>
              Record the result for sample {selectedSample?.sampleId}
            </DialogDescription>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Test</p>
                <p className="font-medium">
                  {tests.find((t) => t.id === selectedSample.testId)?.name || "-"}
                </p>
              </div>

              {isLoadingTemplate ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Loading report template...</p>
                </div>
              ) : currentTemplate && currentTemplate.fields.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>AI-generated template with {currentTemplate.fields.length} fields</span>
                  </div>
                  <div className="grid gap-3">
                    {currentTemplate.fields
                      .sort((a, b) => a.order - b.order)
                      .map((field) => renderTemplateField(field))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="result-value">Result Value</Label>
                  <Input
                    id="result-value"
                    placeholder="Enter the test result"
                    value={resultValue}
                    onChange={(e) => setResultValue(e.target.value)}
                    data-testid="input-result-value"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-abnormal"
                  checked={isAbnormal}
                  onCheckedChange={(checked) => setIsAbnormal(checked === true)}
                  data-testid="checkbox-abnormal"
                />
                <Label 
                  htmlFor="is-abnormal" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Mark as Abnormal
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="input-notes"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResultDialogOpen(false)}
              data-testid="button-cancel-result"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveResult}
              disabled={updateResultMutation.isPending || isLoadingTemplate}
              data-testid="button-save-result"
            >
              {updateResultMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Report {selectedReport?.reportNumber}
            </DialogTitle>
            <DialogDescription>
              Lab report details and test results
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 mb-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Patient Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {patients.find((p) => p.id === selectedReport.patientId)?.firstName}{" "}
                      {patients.find((p) => p.id === selectedReport.patientId)?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {patients.find((p) => p.id === selectedReport.patientId)?.phone || "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Test Results</h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Test</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Normal Range</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {samples
                        .filter((s) => s.billId === selectedReport.billId)
                        .map((sample) => {
                          const test = tests.find((t) => t.id === sample.testId);
                          return (
                            <TableRow key={sample.id}>
                              <TableCell>
                                {test?.name || "-"}
                              </TableCell>
                              <TableCell>
                                {sample.isAbnormal ? (
                                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {sample.resultValue || "-"} {test?.unit || ""}
                                  </div>
                                ) : (
                                  <span>{sample.resultValue || "-"} {test?.unit || ""}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {test?.normalRange || "-"}
                              </TableCell>
                              <TableCell>{getSampleStatusBadge(sample.status || "collected")}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedReport.aiSummary && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">AI Summary</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedReport.aiSummary}</p>
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={() => handleReviseReport(selectedReport)}
                  data-testid="button-revise-report"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Revise
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleCopyLink(selectedReport.id)}
                  data-testid="button-copy-report-link"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleShareEmail(selectedReport)}
                  data-testid="button-share-email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleShareWhatsApp(selectedReport)}
                  data-testid="button-share-whatsapp"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button 
                  onClick={() => handleDownloadReportPDF(selectedReport)}
                  data-testid="button-download-pdf"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
