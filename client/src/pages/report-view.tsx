import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TestTube2,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Building2,
  Printer,
  QrCode,
} from "lucide-react";

interface PublicReportData {
  report: {
    id: string;
    reportNumber: string;
    status: string;
    generatedAt: string;
    aiSummary: string | null;
  };
  patient: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    gender: string | null;
    dateOfBirth: string | null;
  };
  organization: {
    name: string;
    logo: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    reportHeader: string | null;
    reportFooter: string | null;
    showLogo: boolean;
    showQRCode: boolean;
  };
  testResults: Array<{
    testName: string;
    resultValue: string | null;
    normalRange: string | null;
    unit: string | null;
    isAbnormal: boolean;
  }>;
}

const getSampleStatusBadge = (isAbnormal: boolean) => {
  if (isAbnormal) {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Abnormal
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Normal
    </Badge>
  );
};

export default function ReportView() {
  const [match, params] = useRoute("/reports/view/:id");
  const reportId = params?.id;

  const { data, isLoading, isError, error } = useQuery<PublicReportData>({
    queryKey: ["/api/reports/public", reportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/public/${reportId}`);
      if (!res.ok) {
        throw new Error("Report not found");
      }
      return res.json();
    },
    enabled: !!reportId,
  });

  const { data: qrData } = useQuery<{ qrCode: string; url: string }>({
    queryKey: ["/api/reports", reportId, "qrcode"],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${reportId}/qrcode`);
      if (!res.ok) throw new Error("Failed to get QR code");
      return res.json();
    },
    enabled: !!reportId && !!data,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Report Not Found</h2>
              <p className="text-muted-foreground">
                The report you are looking for does not exist or has been removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { report, patient, organization, testResults } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {organization.reportHeader && (
          <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-center text-muted-foreground">{organization.reportHeader}</p>
          </div>
        )}

        <div className="mb-8" data-testid="section-report-header">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {organization.showLogo !== false && organization.logo ? (
                <img 
                  src={organization.logo} 
                  alt={organization.name} 
                  className="h-16 w-auto object-contain"
                  data-testid="img-organization-logo"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-organization-name">{organization.name}</h1>
                {organization.address && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1" data-testid="text-organization-address">
                    <MapPin className="h-3.5 w-3.5" />
                    {organization.address}{organization.city && `, ${organization.city}`}{organization.state && `, ${organization.state}`}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {organization.phone && (
                    <span className="flex items-center gap-1" data-testid="text-organization-phone">
                      <Phone className="h-3.5 w-3.5" />
                      {organization.phone}
                    </span>
                  )}
                  {organization.email && (
                    <span className="flex items-center gap-1" data-testid="text-organization-email">
                      <Mail className="h-3.5 w-3.5" />
                      {organization.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {organization.showQRCode !== false && qrData?.qrCode && (
              <div className="flex flex-col items-center print:block" data-testid="section-qr-code">
                <img 
                  src={qrData.qrCode} 
                  alt="Report QR Code" 
                  className="w-24 h-24"
                  data-testid="img-report-qr-code"
                />
                <p className="text-xs text-muted-foreground mt-1">Scan to verify</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4 print:hidden">
            <Button onClick={handlePrint} variant="outline" data-testid="button-print-report">
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Lab Report
              </div>
              <Badge variant="outline" className="font-mono text-base">
                {report.reportNumber}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Patient Information</span>
                </div>
                <div className="pl-8 space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                  </div>
                  {patient.gender && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium capitalize">{patient.gender}</p>
                    </div>
                  )}
                  {patient.dateOfBirth && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Report Details</span>
                </div>
                <div className="pl-8 space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Report Number</p>
                    <p className="font-medium font-mono">{report.reportNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 mt-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {report.status === "generated" ? "Generated" : report.status}
                    </Badge>
                  </div>
                  {report.generatedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Generated On</p>
                      <p className="font-medium">{new Date(report.generatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TestTube2 className="h-5 w-5 text-primary" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Test Name</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Normal Range</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.map((result, index) => (
                    <TableRow key={index} data-testid={`row-result-${index}`}>
                      <TableCell className="font-medium">
                        {result.testName}
                      </TableCell>
                      <TableCell>
                        {result.isAbnormal ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {result.resultValue || "-"} {result.unit || ""}
                          </span>
                        ) : (
                          <span>{result.resultValue || "-"} {result.unit || ""}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {result.normalRange || "-"}
                      </TableCell>
                      <TableCell>
                        {getSampleStatusBadge(result.isAbnormal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {report.aiSummary && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Sparkles className="h-5 w-5" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.aiSummary}</p>
            </CardContent>
          </Card>
        )}

        {organization.reportFooter && (
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-center text-muted-foreground">{organization.reportFooter}</p>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>This is a computer-generated report. For any queries, please contact {organization.name}.</p>
          {organization.phone && <p>Phone: {organization.phone}</p>}
        </div>
      </div>
    </div>
  );
}
