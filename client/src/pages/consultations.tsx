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
import {
  CalendarCheck,
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
  Video,
  Building2,
  Globe,
  IndianRupee,
} from "lucide-react";

type OpVisit = {
  id: string;
  tokenNumber: number;
  tokenDate: string;
  patientId: string;
  doctorId: string | null;
  departmentId: string | null;
  visitType: string;
  source: string;
  status: string;
  symptoms: string | null;
  diagnosis: string | null;
  consultationFee: string | null;
  paymentMode: string | null;
  paymentStatus: string | null;
  notes: string | null;
  scheduledTime: string | null;
  consultationType: string | null;
  createdAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    patientId: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialization: string;
  };
  department?: {
    id: string;
    name: string;
  };
};

const statusColors: Record<string, string> = {
  booked: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  waiting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_consultation: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  booked: "Pending",
  waiting: "Confirmed",
  in_consultation: "In Consultation",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Consultations() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useViewMode("consultations");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVisit, setSelectedVisit] = useState<OpVisit | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: orgData } = useQuery<{ organization: { id: string; name: string } }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: visits = [], isLoading, refetch } = useQuery<OpVisit[]>({
    queryKey: ["/api/op-pos/op-visits", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/op-visits?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch visits");
      return res.json();
    },
    enabled: !!organization?.id,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/op-pos/op-visits/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits", organization?.id] });
      toast({ title: "Status updated successfully" });
      setSelectedVisit(null);
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  // Only show online bookings (source === "online")
  const onlineVisits = visits.filter((v) => v.source === "online");

  const pendingCount = onlineVisits.filter((v) => v.status === "booked").length;
  const confirmedCount = onlineVisits.filter((v) => v.status === "waiting" || v.status === "in_consultation").length;
  const todayCount = onlineVisits.filter(
    (v) => v.tokenDate === new Date().toISOString().split("T")[0]
  ).length;

  const filteredVisits = onlineVisits.filter((visit) => {
    const name = `${visit.patient?.firstName ?? ""} ${visit.patient?.lastName ?? ""}`.toLowerCase();
    const matchesSearch =
      name.includes(searchQuery.toLowerCase()) ||
      (visit.patient?.phone ?? "").includes(searchQuery) ||
      visit.tokenNumber?.toString().includes(searchQuery);
    const matchesStatus = statusFilter === "all" || visit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const bookingLink = organization?.id
    ? `${window.location.origin}/book/${organization.id}/consultation`
    : null;

  const copyBookingLink = () => {
    if (bookingLink) {
      navigator.clipboard.writeText(bookingLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: "Booking link copied!" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Online Bookings
          </h1>
          <p className="text-muted-foreground">Manage patient consultation requests from your online booking page</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh" data-testid="button-refresh-consultations">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)} data-testid="button-consultation-settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {bookingLink && (
            <Button onClick={copyBookingLink} data-testid="button-copy-booking-link">
              {copiedLink ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copiedLink ? "Copied!" : "Copy Booking Link"}
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
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold text-blue-600">{confirmedCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s Bookings</p>
                <p className="text-2xl font-bold text-primary">{todayCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Booking Link ── */}
      {bookingLink && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Your Booking Page</p>
                  <p className="text-sm text-muted-foreground">Share this link with patients for online consultation booking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={bookingLink}
                  readOnly
                  className="max-w-xs text-sm"
                  data-testid="input-booking-link"
                />
                <Button variant="outline" size="icon" onClick={copyBookingLink} data-testid="button-copy-link-icon">
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" asChild data-testid="button-open-booking-link">
                  <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Booking Requests ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Booking Requests</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-bookings"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="booked">Pending</SelectItem>
                  <SelectItem value="waiting">Confirmed</SelectItem>
                  <SelectItem value="in_consultation">In Consultation</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <ViewSwitcher pageKey="consultations" defaultView="table" onChange={setViewMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bookings...</div>
          ) : filteredVisits.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No bookings yet</h3>
              <p className="text-muted-foreground">
                Share your booking link with patients to receive online consultation bookings
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVisits.map((visit) => (
                <Card
                  key={visit.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedVisit(visit)}
                  data-testid={`card-booking-${visit.id}`}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">Token #{visit.tokenNumber}</p>
                      </div>
                      <Badge className={statusColors[visit.status]}>
                        {statusLabels[visit.status] ?? visit.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {visit.consultationType === "video" ? (
                        <Badge variant="secondary">
                          <Video className="h-3 w-3 mr-1" />
                          Video
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Building2 className="h-3 w-3 mr-1" />
                          In-Person
                        </Badge>
                      )}
                      {visit.visitType === "new" ? (
                        <Badge variant="outline" className="text-xs">New</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Follow-up</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{visit.patient?.phone}</span>
                      </div>
                      {visit.doctor && (
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {visit.doctor.name.startsWith("Dr") ? visit.doctor.name : `Dr. ${visit.doctor.name}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>{visit.tokenDate && format(new Date(visit.tokenDate), "dd MMM yyyy")}</span>
                      {visit.scheduledTime && (
                        <>
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{visit.scheduledTime}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold text-sm">
                        {visit.consultationFee ? `₹${visit.consultationFee}` : "—"}
                      </span>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedVisit(visit); }} data-testid={`button-view-booking-${visit.id}`}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {filteredVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-muted/50 hover-elevate rounded-lg p-3 cursor-pointer"
                  onClick={() => setSelectedVisit(visit)}
                  data-testid={`list-booking-${visit.id}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown"}
                          </span>
                          <Badge variant="outline">#{visit.tokenNumber}</Badge>
                          <Badge className={statusColors[visit.status]}>
                            {statusLabels[visit.status] ?? visit.status}
                          </Badge>
                          {visit.consultationType === "video" ? (
                            <Badge variant="secondary">
                              <Video className="h-3 w-3 mr-1" />
                              Video
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Building2 className="h-3 w-3 mr-1" />
                              In-Person
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {visit.tokenDate && format(new Date(visit.tokenDate), "dd MMM yyyy")}
                      </span>
                      {visit.consultationFee && (
                        <span className="font-semibold">₹{visit.consultationFee}</span>
                      )}
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedVisit(visit); }} data-testid={`button-view-booking-${visit.id}`}>
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table view */
            <div className="space-y-3">
              {filteredVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="border rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedVisit(visit)}
                  data-testid={`booking-${visit.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown"}
                          </span>
                          <Badge variant="outline" className="text-xs">#{visit.tokenNumber}</Badge>
                          <Badge className={statusColors[visit.status]}>
                            {statusLabels[visit.status] ?? visit.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {visit.patient?.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {visit.tokenDate && format(new Date(visit.tokenDate), "dd MMM yyyy")}
                          </span>
                          {visit.doctor && (
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-3 w-3" />
                              {visit.doctor.name.startsWith("Dr") ? visit.doctor.name : `Dr. ${visit.doctor.name}`}
                            </span>
                          )}
                          {visit.consultationType === "video" ? (
                            <span className="flex items-center gap-1 text-primary">
                              <Video className="h-3 w-3" />
                              Video Consultation
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              In-Person
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {visit.consultationFee && (
                        <p className="font-semibold text-primary">₹{visit.consultationFee}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(visit.createdAt), "dd MMM, h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Details Sheet ── */}
      <Sheet open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedVisit && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>Consultation Details</SheetTitle>
                  <Badge className={statusColors[selectedVisit.status]}>
                    {statusLabels[selectedVisit.status] ?? selectedVisit.status}
                  </Badge>
                </div>
                <SheetDescription>
                  Token #{selectedVisit.tokenNumber} · Submitted on{" "}
                  {format(new Date(selectedVisit.createdAt), "PPP")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Patient */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Patient Information</h3>
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {selectedVisit.patient
                              ? `${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName}`
                              : "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {selectedVisit.visitType === "new" ? "New Patient" : "Follow-up"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedVisit.patient?.phone}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Appointment */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Appointment Details</h3>
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      {selectedVisit.doctor && (
                        <div className="flex items-center gap-3">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {selectedVisit.doctor.name.startsWith("Dr")
                                ? selectedVisit.doctor.name
                                : `Dr. ${selectedVisit.doctor.name}`}
                            </p>
                            <p className="text-sm text-muted-foreground">{selectedVisit.doctor.specialization}</p>
                          </div>
                        </div>
                      )}
                      {selectedVisit.department && (
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedVisit.department.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {selectedVisit.tokenDate &&
                            format(new Date(selectedVisit.tokenDate), "PPPP")}
                        </span>
                      </div>
                      {selectedVisit.scheduledTime && (
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedVisit.scheduledTime}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {selectedVisit.consultationType === "video" ? (
                          <>
                            <Video className="h-4 w-4 text-primary" />
                            <span className="text-primary font-medium">Video Consultation</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>In-Person</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Symptoms */}
                {selectedVisit.symptoms && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Symptoms</h3>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm">{selectedVisit.symptoms}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Fee */}
                {selectedVisit.consultationFee && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Consultation Fee</h3>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span className="text-primary">₹{selectedVisit.consultationFee}</span>
                        </div>
                        {selectedVisit.paymentStatus && (
                          <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                            <span>Payment</span>
                            <Badge className={selectedVisit.paymentStatus === "paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }>
                              {selectedVisit.paymentStatus === "paid"
                                ? `Paid · ${selectedVisit.paymentMode ?? ""}`
                                : "Unpaid"}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVisit.status === "booked" && (
                      <>
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: selectedVisit.id, status: "waiting" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="button-confirm-booking"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: selectedVisit.id, status: "cancelled" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="button-cancel-booking"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}
                    {selectedVisit.status === "waiting" && (
                      <Button
                        variant="destructive"
                        onClick={() => updateStatusMutation.mutate({ id: selectedVisit.id, status: "cancelled" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-cancel-confirmed"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    {selectedVisit.status === "in_consultation" && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: selectedVisit.id, status: "completed" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-mark-completed"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Completed
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
            <SheetTitle>Booking Settings</SheetTitle>
            <SheetDescription>Configure your online consultation booking page</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <Label>Booking Link</Label>
              <p className="text-sm text-muted-foreground mb-2">Share this link with patients</p>
              {bookingLink && (
                <div className="flex items-center gap-2">
                  <Input value={bookingLink} readOnly className="text-sm" />
                  <Button variant="outline" size="icon" onClick={copyBookingLink}>
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={bookingLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4" />
              <span>Consultation booking settings can be configured in Hospital Settings → Consultation tab.</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
