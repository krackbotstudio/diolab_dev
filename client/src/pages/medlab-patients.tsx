import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ViewSwitcher, useViewMode } from "@/components/view-switcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";
import {
  Users,
  Search,
  Phone,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Copy,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  Filter,
  Settings,
  Link as LinkIcon,
  Pill,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShoppingCart,
  Globe,
} from "lucide-react";

type PrescriptionItem = {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  quantity?: number;
};

type Referral = {
  id: string;
  organizationId: string;
  referralNumber: string;
  sourceModule: string;
  targetModule: string;
  patientId: string | null;
  patientName: string;
  patientPhone: string | null;
  opVisitId: string | null;
  doctorName: string | null;
  referralType: string;
  items: PrescriptionItem[];
  notes: string | null;
  status: string;
  completedAt: string | null;
  linkedSaleId: string | null;
  linkedTestId: string | null;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  sent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  sent: "Pending",
  received: "Received",
  in_progress: "Dispensing",
  completed: "Dispensed",
  cancelled: "Cancelled",
};

export default function MedlabPatients() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [viewMode, setViewMode] = useViewMode("medlab-patients");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupResults, setLookupResults] = useState<any[] | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const { data: orgData } = useQuery<{ organization: { id: string; name: string } }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: referrals = [], isLoading, refetch } = useQuery<Referral[]>({
    queryKey: ["/api/medlab/referrals", organization?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/medlab/referrals?organizationId=${organization?.id}&targetModule=medlab`
      );
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
    enabled: !!organization?.id,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, linkedSaleId }: { id: string; status: string; linkedSaleId?: string }) => {
      return apiRequest("PATCH", `/api/medlab/referrals/${id}/status`, { status, linkedSaleId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/referrals", organization?.id] });
      toast({ title: "Status updated" });
      setSelectedReferral(null);
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const pendingCount = referrals.filter((r) => r.status === "sent").length;
  const inProgressCount = referrals.filter((r) => r.status === "received" || r.status === "in_progress").length;
  const todayCount = referrals.filter((r) => {
    const today = new Date().toISOString().split("T")[0];
    return r.createdAt.startsWith(today);
  }).length;

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch =
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.patientPhone ?? "").includes(searchQuery) ||
      r.referralNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.doctorName ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pharmacyLink = organization?.id
    ? `${window.location.origin}/pharmacy/${organization.id}`
    : null;

  const copyLink = () => {
    if (pharmacyLink) {
      navigator.clipboard.writeText(pharmacyLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: "Pharmacy link copied!" });
    }
  };

  const handleDispense = (referral: Referral) => {
    // Mark as in_progress and navigate to POS with pre-filled items
    updateStatusMutation.mutate({ id: referral.id, status: "in_progress" });
    const cartItems = encodeURIComponent(JSON.stringify(
      referral.items.map((item) => ({ medicineName: item.medicineName, quantity: item.quantity || 1 }))
    ));
    navigate(`/medlab-sales?referralId=${referral.id}&patient=${encodeURIComponent(referral.patientName)}&phone=${referral.patientPhone ?? ""}&cart=${cartItems}`);
  };

  const handleLookup = async () => {
    if (!lookupPhone.trim() || !organization?.id) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(
        `/api/medlab/patients/lookup?phone=${encodeURIComponent(lookupPhone)}&organizationId=${organization.id}`
      );
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      setLookupResults(data);
    } catch {
      toast({ title: "Lookup failed", description: "Could not find patient prescriptions", variant: "destructive" });
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Patients
          </h1>
          <p className="text-muted-foreground">
            Incoming prescription referrals from hospitals and clinics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh" data-testid="button-refresh-patients">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {pharmacyLink && (
            <Button onClick={copyLink} data-testid="button-copy-pharmacy-link">
              {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copiedLink ? "Copied!" : "Copy Pharmacy Link"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Pill className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Referrals</p>
                <p className="text-2xl font-bold text-primary">{todayCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Pharmacy Link ── */}
      {pharmacyLink && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Your Pharmacy Page</p>
                  <p className="text-sm text-muted-foreground">Share this link with hospitals to receive prescription referrals</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input value={pharmacyLink} readOnly className="max-w-xs text-sm" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href={pharmacyLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Prescription Lookup ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Prescription Lookup
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search for a patient's prescription by phone number — works for walk-in patients from any connected hospital
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter patient phone number..."
                value={lookupPhone}
                onChange={(e) => { setLookupPhone(e.target.value); setLookupResults(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleLookup} disabled={isLookingUp || !lookupPhone.trim()}>
              {isLookingUp ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Lookup
            </Button>
          </div>

          {lookupResults !== null && (
            <div className="mt-4">
              {lookupResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prescriptions found for this phone number.</p>
              ) : (
                <div className="space-y-3">
                  {lookupResults.map((prescription: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{prescription.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {prescription.doctorName && `Dr. ${prescription.doctorName}`}
                            {prescription.date && ` · ${format(new Date(prescription.date), "dd MMM yyyy")}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            const cartItems = encodeURIComponent(JSON.stringify(
                              (prescription.items || []).map((m: any) => ({
                                medicineName: m.medicineName,
                                quantity: m.quantity || 1,
                              }))
                            ));
                            navigate(
                              `/medlab-sales?patient=${encodeURIComponent(prescription.patientName)}&phone=${lookupPhone}&cart=${cartItems}`
                            );
                          }}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Dispense
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(prescription.items || []).map((item: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Pill className="h-2.5 w-2.5 mr-1" />
                            {item.medicineName}
                            {item.dosage && ` · ${item.dosage}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Referral Requests ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Prescription Referrals</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="in_progress">Dispensing</SelectItem>
                  <SelectItem value="completed">Dispensed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <ViewSwitcher pageKey="medlab-patients" defaultView="table" onChange={setViewMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading referrals...</div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No prescription referrals</h3>
              <p className="text-muted-foreground">
                Referrals from connected hospitals will appear here
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReferrals.map((referral) => (
                <Card
                  key={referral.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedReferral(referral)}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{referral.patientName}</p>
                        <p className="text-xs text-muted-foreground">{referral.referralNumber}</p>
                      </div>
                      <Badge className={statusColors[referral.status]}>
                        {statusLabels[referral.status] ?? referral.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {referral.patientPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{referral.patientPhone}</span>
                        </div>
                      )}
                      {referral.doctorName && (
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {referral.doctorName.startsWith("Dr") ? referral.doctorName : `Dr. ${referral.doctorName}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {referral.items.slice(0, 3).map((item, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] px-1.5">
                          <Pill className="h-2.5 w-2.5 mr-0.5" />
                          {item.medicineName}
                        </Badge>
                      ))}
                      {referral.items.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          +{referral.items.length - 3} more
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(referral.createdAt), "dd MMM, h:mm a")}
                      </span>
                      {referral.status === "sent" && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDispense(referral); }}>
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Dispense
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {filteredReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="bg-muted/50 hover-elevate rounded-lg p-3 cursor-pointer"
                  onClick={() => setSelectedReferral(referral)}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{referral.patientName}</span>
                          <Badge variant="outline" className="text-xs">{referral.referralNumber}</Badge>
                          <Badge className={statusColors[referral.status]}>
                            {statusLabels[referral.status] ?? referral.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {referral.items.length} medicine{referral.items.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(referral.createdAt), "dd MMM yyyy")}
                      </span>
                      {referral.status === "sent" && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDispense(referral); }}>
                          Dispense
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table view */
            <div className="space-y-3">
              {filteredReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="border rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedReferral(referral)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{referral.patientName}</span>
                          <Badge variant="outline" className="text-xs">{referral.referralNumber}</Badge>
                          <Badge className={statusColors[referral.status]}>
                            {statusLabels[referral.status] ?? referral.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          {referral.patientPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {referral.patientPhone}
                            </span>
                          )}
                          {referral.doctorName && (
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-3 w-3" />
                              {referral.doctorName.startsWith("Dr") ? referral.doctorName : `Dr. ${referral.doctorName}`}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Pill className="h-3 w-3" />
                            {referral.items.length} medicine{referral.items.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(referral.createdAt), "dd MMM, h:mm a")}
                      </p>
                      {referral.status === "sent" && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleDispense(referral); }}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Dispense
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Details Sheet ── */}
      <Sheet open={!!selectedReferral} onOpenChange={() => setSelectedReferral(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedReferral && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>Prescription Details</SheetTitle>
                  <Badge className={statusColors[selectedReferral.status]}>
                    {statusLabels[selectedReferral.status] ?? selectedReferral.status}
                  </Badge>
                </div>
                <SheetDescription>
                  {selectedReferral.referralNumber} · Received{" "}
                  {format(new Date(selectedReferral.createdAt), "PPP")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Patient */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Patient</h3>
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{selectedReferral.patientName}</p>
                      </div>
                      {selectedReferral.patientPhone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedReferral.patientPhone}</span>
                        </div>
                      )}
                      {selectedReferral.doctorName && (
                        <div className="flex items-center gap-3">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {selectedReferral.doctorName.startsWith("Dr")
                                ? selectedReferral.doctorName
                                : `Dr. ${selectedReferral.doctorName}`}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{selectedReferral.sourceModule} module</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Prescription */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Prescription</h3>
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      {selectedReferral.items.map((item, i) => (
                        <div key={i} className={i > 0 ? "pt-3 border-t" : ""}>
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="font-medium">{item.medicineName}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
                            {item.dosage && <Badge variant="outline" className="text-xs">{item.dosage}</Badge>}
                            {item.frequency && <Badge variant="outline" className="text-xs">{item.frequency}</Badge>}
                            {item.duration && <Badge variant="outline" className="text-xs">{item.duration}</Badge>}
                            {item.quantity && (
                              <Badge variant="secondary" className="text-xs">Qty: {item.quantity}</Badge>
                            )}
                          </div>
                          {item.instructions && (
                            <p className="text-xs text-muted-foreground mt-1 ml-6">{item.instructions}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {selectedReferral.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Notes</h3>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm">{selectedReferral.notes}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedReferral.status === "sent" || selectedReferral.status === "received") && (
                      <Button
                        onClick={() => handleDispense(selectedReferral)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Dispense Medicines
                      </Button>
                    )}
                    {selectedReferral.status === "sent" && (
                      <Button
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: selectedReferral.id, status: "received" })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Received
                      </Button>
                    )}
                    {(selectedReferral.status === "sent" || selectedReferral.status === "received") && (
                      <Button
                        variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ id: selectedReferral.id, status: "cancelled" })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    {selectedReferral.status === "in_progress" && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: selectedReferral.id, status: "completed" })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark Dispensed
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Settings Sheet ── */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Patient Referrals Settings</SheetTitle>
            <SheetDescription>Configure how your pharmacy receives prescription referrals</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <Label>Pharmacy Public Link</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Share with hospitals and clinics so they can send prescription referrals to your pharmacy
              </p>
              {pharmacyLink && (
                <div className="flex items-center gap-2">
                  <Input value={pharmacyLink} readOnly className="text-sm" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={pharmacyLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Hospitals using the Doclab module can send prescription referrals directly to your pharmacy.
                  Patients referred from these hospitals will appear in your Prescription Referrals queue above.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  For walk-in patients with prescriptions from external hospitals, use the
                  <strong> Prescription Lookup</strong> feature above to search by patient phone number.
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
