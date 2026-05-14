import { useState, useEffect, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Minus,
  Sparkles,
  Lock,
  FileCheck,
} from "lucide-react";
import type { Sample, Patient, Test, TestReport } from "@shared/schema";
import {
  REPORT_TEMPLATES,
  getTemplateByCode,
  calculateValueStatus,
  getReferenceRangeText,
  type ReportTemplate,
  type ReportField,
} from "@shared/report-templates";

interface ReportEntryFormProps {
  sample: Sample;
  patient: Patient;
  test: Test;
  existingReport?: TestReport | null;
  onSave?: (report: TestReport) => void;
  onFinalize?: (report: TestReport) => void;
}

interface ResultValue {
  value: string | number;
  status: "normal" | "low" | "high" | "borderline";
}

export function ReportEntryForm({
  sample,
  patient,
  test,
  existingReport,
  onSave,
  onFinalize,
}: ReportEntryFormProps) {
  const { toast } = useToast();
  const [resultData, setResultData] = useState<Record<string, ResultValue>>({});
  const [interpretation, setInterpretation] = useState("");
  const [instrumentUsed, setInstrumentUsed] = useState("");
  const [methodology, setMethodology] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const template = useMemo(() => {
    if (test.reportTemplate) {
      return test.reportTemplate as unknown as ReportTemplate;
    }
    return getTemplateByCode(test.code);
  }, [test]);

  const patientGender = (patient.gender?.toLowerCase() as "male" | "female" | "other") || "male";

  useEffect(() => {
    if (existingReport?.resultData) {
      const data = existingReport.resultData as Record<string, ResultValue>;
      setResultData(data);
    }
    if (existingReport?.interpretation) {
      setInterpretation(existingReport.interpretation);
    }
    if (existingReport?.instrumentUsed) {
      setInstrumentUsed(existingReport.instrumentUsed);
    }
    if (existingReport?.methodology) {
      setMethodology(existingReport.methodology);
    } else if (template?.methodology) {
      setMethodology(template.methodology);
    }
  }, [existingReport, template]);

  const saveReportMutation = useMutation({
    mutationFn: async (data: {
      resultData: Record<string, ResultValue>;
      interpretation: string;
      instrumentUsed: string;
      methodology: string;
    }): Promise<TestReport> => {
      const endpoint = existingReport
        ? `/api/test-reports/${existingReport.id}`
        : "/api/test-reports";
      const method = existingReport ? "PATCH" : "POST";

      const response = await apiRequest(method, endpoint, {
        sampleId: sample.id,
        billId: sample.billId,
        patientId: patient.id,
        testId: test.id,
        branchId: null,
        ...data,
      });
      return response.json();
    },
    onSuccess: (report: TestReport) => {
      toast({
        title: "Report saved",
        description: "Test results have been saved as draft.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/test-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      onSave?.(report);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive",
      });
    },
  });

  const finalizeReportMutation = useMutation({
    mutationFn: async (): Promise<TestReport> => {
      const reportPayload = {
        sampleId: sample.id,
        billId: sample.billId,
        patientId: patient.id,
        testId: test.id,
        branchId: null,
        resultData,
        interpretation,
        instrumentUsed,
        methodology,
      };
      let reportId = existingReport?.id;
      if (reportId) {
        await apiRequest("PATCH", `/api/test-reports/${reportId}`, reportPayload);
      } else {
        const saveResponse = await apiRequest("POST", "/api/test-reports", reportPayload);
        const savedReport: TestReport = await saveResponse.json();
        reportId = savedReport.id;
      }
      const response = await apiRequest("POST", `/api/test-reports/${reportId}/finalize`);
      return response.json();
    },
    onSuccess: (report: TestReport) => {
      toast({
        title: "Report finalized",
        description: "Report has been finalized and locked.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/test-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      onFinalize?.(report);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to finalize report",
        variant: "destructive",
      });
    },
  });

  const handleValueChange = (fieldName: string, value: string, field: ReportField) => {
    let status: "normal" | "low" | "high" | "borderline" = "normal";

    if (field.type === "number" && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        status = calculateValueStatus(numValue, field, patientGender);
      }
    }

    setResultData((prev) => ({
      ...prev,
      [fieldName]: { value, status },
    }));
  };

  const handleSave = () => {
    saveReportMutation.mutate({
      resultData,
      interpretation,
      instrumentUsed,
      methodology,
    });
  };

  const handleFinalize = () => {
    finalizeReportMutation.mutate();
  };

  const generateAIInterpretation = async () => {
    setIsGeneratingAI(true);
    try {
      const abnormalValues = Object.entries(resultData)
        .filter(([, v]) => v.status !== "normal")
        .map(([key, v]) => `${key}: ${v.value} (${v.status})`);

      const response = await apiRequest("POST", "/api/ai/report-summary", {
        testName: test.name,
        patientName: `${patient.firstName} ${patient.lastName}`,
        patientAge: patient.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(patient.dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null,
        patientGender: patient.gender,
        resultData,
        abnormalValues,
      });

      const data = await response.json();
      if (data.summary) {
        setInterpretation(data.summary);
        toast({
          title: "AI Interpretation Generated",
          description: "Please review and edit as needed.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate AI interpretation",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getStatusIcon = (status: "normal" | "low" | "high" | "borderline") => {
    switch (status) {
      case "low":
        return <ArrowDown className="h-4 w-4 text-blue-500" />;
      case "high":
        return <ArrowUp className="h-4 w-4 text-red-500" />;
      case "borderline":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: "normal" | "low" | "high" | "borderline") => {
    switch (status) {
      case "low":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
            Low
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            High
          </Badge>
        );
      case "borderline":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
            Borderline
          </Badge>
        );
      default:
        return null;
    }
  };

  const isLocked = existingReport?.isLocked || false;

  if (!template) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No report template available for this test.</p>
            <p className="text-sm mt-2">
              Please configure a report template for "{test.name}" in test settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isLocked && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">
            This report is finalized and locked. Create a revision to make changes.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">{template.testName || test.name}</CardTitle>
            {existingReport && (
              <Badge
                className={
                  existingReport.status === "finalized"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-blue-500/10 text-blue-600"
                }
              >
                {existingReport.status === "finalized" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Finalized
                  </>
                ) : (
                  <>
                    <FileCheck className="h-3 w-3 mr-1" />
                    Draft
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Sample Type: {template.sampleType || test.sampleType}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {template.sections.map((section) => (
            <div key={section.name} className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {section.name}
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Investigation</TableHead>
                    <TableHead className="w-[20%]">Result</TableHead>
                    <TableHead className="w-[15%]">Status</TableHead>
                    <TableHead className="w-[20%]">Reference Value</TableHead>
                    <TableHead className="w-[10%]">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.fields.map((field) => {
                    const currentValue = resultData[field.name] || { value: "", status: "normal" };
                    const refText = getReferenceRangeText(field, patientGender);

                    return (
                      <TableRow key={field.name} data-testid={`row-${field.name}`}>
                        <TableCell className="font-medium">{field.label}</TableCell>
                        <TableCell>
                          {field.type === "select" && field.options ? (
                            <Select
                              value={String(currentValue.value)}
                              onValueChange={(v) => handleValueChange(field.name, v, field)}
                              disabled={isLocked}
                            >
                              <SelectTrigger
                                className="h-8"
                                data-testid={`input-${field.name}`}
                              >
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={field.type === "number" ? "number" : "text"}
                              value={String(currentValue.value)}
                              onChange={(e) =>
                                handleValueChange(field.name, e.target.value, field)
                              }
                              className={`h-8 ${
                                currentValue.status === "high"
                                  ? "border-red-500 text-red-600"
                                  : currentValue.status === "low"
                                  ? "border-blue-500 text-blue-600"
                                  : currentValue.status === "borderline"
                                  ? "border-amber-500 text-amber-600"
                                  : ""
                              }`}
                              step={field.decimalPlaces ? `0.${"0".repeat((field.decimalPlaces || 1) - 1)}1` : "any"}
                              disabled={isLocked}
                              data-testid={`input-${field.name}`}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(currentValue.status)}
                            {getStatusBadge(currentValue.status)}
                          </div>
                        </TableCell>
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

          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instrumentUsed">Instruments Used</Label>
                <Input
                  id="instrumentUsed"
                  value={instrumentUsed}
                  onChange={(e) => setInstrumentUsed(e.target.value)}
                  placeholder="e.g., Fully automated cell counter - Mindray 300"
                  disabled={isLocked}
                  data-testid="input-instrument"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="methodology">Methodology</Label>
                <Input
                  id="methodology"
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  placeholder="e.g., Impedance method"
                  disabled={isLocked}
                  data-testid="input-methodology"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="interpretation">Interpretation</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAIInterpretation}
                  disabled={isLocked || isGeneratingAI}
                  data-testid="button-ai-interpretation"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                id="interpretation"
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Clinical interpretation of results..."
                rows={3}
                disabled={isLocked}
                data-testid="input-interpretation"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isLocked || saveReportMutation.isPending}
              data-testid="button-save-draft"
            >
              {saveReportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={isLocked || finalizeReportMutation.isPending}
              data-testid="button-finalize"
            >
              {finalizeReportMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Finalize Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
