import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
  Loader2,
  Download,
  Share2,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, useMemo } from "react";
import {
  getTemplateByCode,
  getReferenceRangeText,
  type ReportTemplate,
} from "@shared/report-templates";
import logoSymbol from "@assets/diolab_-_logo_-_color_-_symbol_1769252295192.png";
import { useToast } from "@/hooks/use-toast";

interface ResultValue {
  value: string | number;
  status: "normal" | "low" | "high" | "borderline";
}

export default function TestReportView() {
  const { reportNumber } = useParams<{ reportNumber: string }>();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/test-reports/public", reportNumber],
    enabled: !!reportNumber,
  });

  const publicReportUrl = useMemo(() => {
    if (typeof window !== "undefined" && reportNumber) {
      return `${window.location.origin}/report/${reportNumber}`;
    }
    return "";
  }, [reportNumber]);

  useEffect(() => {
    if (publicReportUrl && data?.organization?.showQRCode !== false) {
      QRCode.toDataURL(publicReportUrl, {
        width: 100,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [publicReportUrl, data?.organization?.showQRCode]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lab Report - ${data?.test?.name}`,
          text: `Lab report for ${data?.patient?.firstName} ${data?.patient?.lastName}`,
          url: publicReportUrl,
        });
      } catch (err) {
        navigator.clipboard.writeText(publicReportUrl);
        toast({
          title: "Link copied",
          description: "Report link copied to clipboard",
        });
      }
    } else {
      navigator.clipboard.writeText(publicReportUrl);
      toast({
        title: "Link copied",
        description: "Report link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Report Not Found</h2>
            <p className="text-muted-foreground" data-testid="text-error-message">
              The report you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { report, patient, test, sample, organization } = data;
  const template =
    (test.reportTemplate as ReportTemplate) || getTemplateByCode(test.code);
  const resultData = (report.resultData || {}) as Record<string, ResultValue>;
  const patientGender = (patient.gender?.toLowerCase() as "male" | "female" | "other") || "male";

  const calculateAge = () => {
    if (!patient.dateOfBirth) return null;
    const dob = new Date(patient.dateOfBirth);
    const now = new Date();
    return Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "low":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 print:bg-blue-100 print:text-blue-800">
            <ArrowDown className="h-3 w-3 mr-1" />
            Low
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 print:bg-red-100 print:text-red-800">
            <ArrowUp className="h-3 w-3 mr-1" />
            High
          </Badge>
        );
      case "borderline":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 print:bg-amber-100 print:text-amber-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Borderline
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-white print:bg-white">
      <div className="print:hidden bg-muted p-4 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-medium" data-testid="text-report-label">Lab Report</span>
            <Badge variant="outline" data-testid="text-report-number">{report.reportNumber}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share-report">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button size="sm" onClick={handlePrint} data-testid="button-print-report">
              <Download className="h-4 w-4 mr-2" />
              Print / Download PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 print:p-0 print:max-w-none text-black dark:text-black">
        <div className="bg-white dark:bg-white print:shadow-none" data-testid="report-container">
          <div
            className="p-6 print:p-4"
            style={{ backgroundColor: organization.headerColor || organization.primaryColor || '#2DD4BF' }}
            data-testid="report-header"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {organization.showLogo !== false && (
                  <img
                    src={organization.logo || logoSymbol}
                    alt={organization.name}
                    className="h-16 w-16 object-contain bg-white rounded p-1"
                    data-testid="org-logo"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-white">{organization.name}</h1>
                  {organization.reportHeader && (
                    <p className="text-sm text-white/80">{organization.reportHeader}</p>
                  )}
                  <p className="text-sm text-white/80 mt-1">
                    {organization.address && `${organization.address}, `}
                    {organization.city && `${organization.city}, `}
                    {organization.state && `${organization.state} `}
                    {organization.pincode && organization.pincode}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-white/80">
                {organization.phone && <p>Tel: {organization.phone}</p>}
                {organization.email && <p>Email: {organization.email}</p>}
              </div>
            </div>
          </div>

          <div className="p-6 print:p-4 space-y-6">
            <div className="grid grid-cols-3 gap-4 text-sm border-b pb-4" data-testid="patient-info">
              <div>
                <p className="font-semibold text-lg" data-testid="patient-name">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-muted-foreground">
                  Age: {calculateAge() || "-"} Years | Sex: {patient.gender || "-"}
                </p>
                <p className="text-muted-foreground">PID: {patient.patientId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Sample Collected At:</p>
                <p className="font-medium">
                  {sample?.collectedAt
                    ? new Date(sample.collectedAt).toLocaleString()
                    : "-"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sample ID: {sample?.sampleId || "-"}
                </p>
              </div>
              <div className="text-right">
                {organization.showQRCode !== false && qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="ml-auto h-20 w-20 print:h-16 print:w-16"
                    data-testid="report-qr"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Report #: {report.reportNumber}
                </p>
                <p className="text-xs text-muted-foreground">
                  Reported: {report.finalizedAt ? new Date(report.finalizedAt).toLocaleString() : "-"}
                </p>
              </div>
            </div>

            <div className="text-center border-b pb-4" data-testid="test-name">
              <h2 className="text-xl font-bold">{test.name}</h2>
              {template?.sampleType && (
                <p className="text-sm text-muted-foreground">
                  Primary Sample Type: {template.sampleType}
                </p>
              )}
            </div>

            {template?.sections?.map((section) => (
              <div key={section.name} className="page-break-inside-avoid" data-testid={`section-${section.name}`}>
                <h3 className="font-bold text-sm uppercase tracking-wide mb-2 bg-muted dark:bg-gray-100 p-2">
                  {section.name}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 dark:bg-gray-50">
                      <TableHead className="w-[35%] font-semibold">Investigation</TableHead>
                      <TableHead className="w-[15%] font-semibold">Result</TableHead>
                      <TableHead className="w-[15%] font-semibold">Status</TableHead>
                      <TableHead className="w-[25%] font-semibold">Reference Value</TableHead>
                      <TableHead className="w-[10%] font-semibold">Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.fields.map((field) => {
                      const result = resultData[field.name] || { value: "-", status: "normal" };
                      const refText = getReferenceRangeText(field, patientGender);
                      const valueClass =
                        result.status === "high"
                          ? "text-red-600 font-semibold"
                          : result.status === "low"
                          ? "text-blue-600 font-semibold"
                          : result.status === "borderline"
                          ? "text-amber-600 font-semibold"
                          : "";

                      return (
                        <TableRow key={field.name} data-testid={`result-${field.name}`}>
                          <TableCell className="font-medium">{field.label}</TableCell>
                          <TableCell className={valueClass}>{String(result.value)}</TableCell>
                          <TableCell>{getStatusBadge(result.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {refText}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {field.unit}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}

            {report.instrumentUsed && (
              <p className="text-sm text-muted-foreground" data-testid="instrument-info">
                <strong>Instruments:</strong> {report.instrumentUsed}
              </p>
            )}

            {report.interpretation && (
              <div className="border-t pt-4" data-testid="interpretation">
                <p className="font-semibold mb-1">Interpretation:</p>
                <p className="text-sm">{report.interpretation}</p>
              </div>
            )}

            {report.aiSummary && (
              <div 
                className="rounded-lg p-4 border"
                style={{ 
                  backgroundColor: `${organization.primaryColor || '#2DD4BF'}15`,
                  borderColor: `${organization.primaryColor || '#2DD4BF'}40`
                }}
                data-testid="ai-summary"
              >
                <p className="font-semibold mb-1 flex items-center gap-1" style={{ color: organization.primaryColor || '#2DD4BF' }}>
                  <CheckCircle2 className="h-4 w-4" style={{ color: organization.primaryColor || '#2DD4BF' }} />
                  Patient-Friendly Summary
                </p>
                <p className="text-sm">{report.aiSummary}</p>
              </div>
            )}

            <div className="border-t pt-6 mt-8 print:mt-12" data-testid="signatures-section">
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <div className="border-t border-gray-400 pt-2 mt-12 print:mt-16">
                    <p className="font-semibold">Medical Lab Technician</p>
                    <p className="text-sm text-muted-foreground">(DMLT, BMLT)</p>
                  </div>
                </div>
                <div>
                  <div className="border-t border-gray-400 pt-2 mt-12 print:mt-16">
                    <p className="font-semibold">Pathologist</p>
                    <p className="text-sm text-muted-foreground">(MD, Pathology)</p>
                  </div>
                </div>
                <div>
                  <div className="border-t border-gray-400 pt-2 mt-12 print:mt-16">
                    <p className="font-semibold">Senior Pathologist</p>
                    <p className="text-sm text-muted-foreground">(MD, Pathology)</p>
                  </div>
                </div>
              </div>
            </div>

            {organization.reportFooter && (
              <div
                className="text-center text-xs text-muted-foreground border-t pt-4 mt-6"
                data-testid="report-footer"
              >
                {organization.reportFooter}
              </div>
            )}

            <div className="text-center text-xs text-muted-foreground pt-4 print:fixed print:bottom-0 print:left-0 print:right-0 print:p-4 print:bg-white">
              <p>****End of Report****</p>
              <p className="mt-1">
                Generated on: {new Date().toLocaleString()} | Version: {report.version || 1}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
