import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  Droplets,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  User,
  TestTube2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Sample, Patient, Test, Bill } from "@shared/schema";

type SortField = "sampleId" | "patient" | "test" | "status" | "collectedAt";
type SortOrder = "asc" | "desc";

const getStatusBadge = (status: string) => {
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

export default function Samples() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("collectedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [resultFormData, setResultFormData] = useState({
    resultValue: "",
    isAbnormal: false,
    notes: "",
  });

  const toggleSort = (field: SortField) => {
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
    refetchInterval: 15000, // Poll every 15 seconds for real-time updates
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

  const updateSampleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/samples/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      toast({
        title: "Sample updated",
        description: "Sample status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sample. Please try again.",
        variant: "destructive",
      });
    },
  });

  const submitResultMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof resultFormData }) => {
      return apiRequest("PATCH", `/api/samples/${id}/result`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      setIsResultDialogOpen(false);
      setSelectedSample(null);
      setResultFormData({ resultValue: "", isAbnormal: false, notes: "" });
      toast({
        title: "Result submitted",
        description: "Test result has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit result. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEnterResult = (sample: Sample) => {
    setSelectedSample(sample);
    setResultFormData({
      resultValue: sample.resultValue || "",
      isAbnormal: sample.isAbnormal || false,
      notes: sample.notes || "",
    });
    setIsResultDialogOpen(true);
  };

  const handleSubmitResult = () => {
    if (!selectedSample) return;
    submitResultMutation.mutate({
      id: selectedSample.id,
      data: resultFormData,
    });
  };

  const filteredSamples = samples
    .filter((sample) => {
      const patient = patients.find((p) => p.id === sample.patientId);
      const test = tests.find((t) => t.id === sample.testId);
      const matchesSearch =
        sample.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || sample.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      const patientA = patients.find((p) => p.id === a.patientId);
      const patientB = patients.find((p) => p.id === b.patientId);
      const testA = tests.find((t) => t.id === a.testId);
      const testB = tests.find((t) => t.id === b.testId);

      switch (sortField) {
        case "sampleId":
          comparison = a.sampleId.localeCompare(b.sampleId);
          break;
        case "patient":
          const nameA = `${patientA?.firstName || ""} ${patientA?.lastName || ""}`.trim();
          const nameB = `${patientB?.firstName || ""} ${patientB?.lastName || ""}`.trim();
          comparison = nameA.localeCompare(nameB);
          break;
        case "test":
          comparison = (testA?.name || "").localeCompare(testB?.name || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "collectedAt":
          const dateA = a.collectedAt ? new Date(a.collectedAt).getTime() : 0;
          const dateB = b.collectedAt ? new Date(b.collectedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const statusCounts = {
    collected: samples.filter((s) => s.status === "collected").length,
    processing: samples.filter((s) => s.status === "processing").length,
    completed: samples.filter((s) => s.status === "completed").length,
    rejected: samples.filter((s) => s.status === "rejected").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Sample Tracking</h1>
          <p className="text-muted-foreground">Track sample collection, processing, and results</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{statusCounts.collected}</p>
                <p className="text-sm text-muted-foreground">Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <FlaskConical className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{statusCounts.processing}</p>
                <p className="text-sm text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{statusCounts.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{statusCounts.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by sample ID, patient, or test..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-samples"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Samples ({filteredSamples.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {samplesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="text-center py-12">
              <Droplets className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">No samples found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Samples will appear when bills are created with tests"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 select-none"
                      onClick={() => toggleSort("sampleId")}
                    >
                      <div className="flex items-center">
                        Sample ID {getSortIcon("sampleId")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 select-none"
                      onClick={() => toggleSort("patient")}
                    >
                      <div className="flex items-center">
                        Patient {getSortIcon("patient")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 select-none"
                      onClick={() => toggleSort("test")}
                    >
                      <div className="flex items-center">
                        Test {getSortIcon("test")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 select-none"
                      onClick={() => toggleSort("status")}
                    >
                      <div className="flex items-center">
                        Status {getSortIcon("status")}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/80 select-none"
                      onClick={() => toggleSort("collectedAt")}
                    >
                      <div className="flex items-center">
                        Collected {getSortIcon("collectedAt")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSamples.map((sample) => {
                    const patient = patients.find((p) => p.id === sample.patientId);
                    const test = tests.find((t) => t.id === sample.testId);
                    return (
                      <TableRow key={sample.id} data-testid={`row-sample-${sample.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {sample.sampleId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {patient?.firstName} {patient?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {patient?.patientId}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TestTube2 className="h-4 w-4 text-muted-foreground" />
                            <span>{test?.name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(sample.status || "collected")}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {sample.collectedAt
                            ? new Date(sample.collectedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {sample.status === "collected" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateSampleMutation.mutate({
                                    id: sample.id,
                                    status: "processing",
                                  })
                                }
                                data-testid={`button-start-processing-${sample.id}`}
                              >
                                <FlaskConical className="h-4 w-4 mr-1" />
                                Start Processing
                              </Button>
                            )}
                            {sample.status === "processing" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleEnterResult(sample)}
                                data-testid={`button-enter-result-${sample.id}`}
                              >
                                Enter Result
                              </Button>
                            )}
                            {sample.status === "completed" && sample.resultValue && (
                              <Badge
                                variant={sample.isAbnormal ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {sample.resultValue} {test?.unit || ""}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enter Test Result</DialogTitle>
            <DialogDescription>
              {selectedSample && (
                <>
                  Sample: {selectedSample.sampleId} |{" "}
                  Test: {tests.find((t) => t.id === selectedSample.testId)?.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedSample && (
              <>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Normal Range:</span>
                      <p className="font-medium">
                        {tests.find((t) => t.id === selectedSample.testId)?.normalRange || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit:</span>
                      <p className="font-medium">
                        {tests.find((t) => t.id === selectedSample.testId)?.unit || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resultValue">Result Value *</Label>
                  <Input
                    id="resultValue"
                    value={resultFormData.resultValue}
                    onChange={(e) =>
                      setResultFormData({ ...resultFormData, resultValue: e.target.value })
                    }
                    placeholder="Enter test result"
                    data-testid="input-result-value"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAbnormal"
                    checked={resultFormData.isAbnormal}
                    onChange={(e) =>
                      setResultFormData({ ...resultFormData, isAbnormal: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                    data-testid="checkbox-is-abnormal"
                  />
                  <Label htmlFor="isAbnormal" className="text-sm font-normal">
                    Mark as abnormal result
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={resultFormData.notes}
                    onChange={(e) =>
                      setResultFormData({ ...resultFormData, notes: e.target.value })
                    }
                    rows={3}
                    placeholder="Add any additional notes..."
                    data-testid="input-result-notes"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsResultDialogOpen(false)}
                    data-testid="button-cancel-result"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitResult}
                    disabled={!resultFormData.resultValue || submitResultMutation.isPending}
                    data-testid="button-submit-result"
                  >
                    {submitResultMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Submit Result
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
