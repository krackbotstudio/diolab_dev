import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ViewSwitcher, useViewMode } from "@/components/view-switcher";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Booking, Test, TestPackage, OrganizationBookingSettings } from "@shared/schema";
import {
  CalendarCheck,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Home,
  Building2,
  User,
  Package,
  TestTube,
  Copy,
  ExternalLink,
  Check,
  X,
  RefreshCw,
  Filter,
  Settings,
  Link as LinkIcon,
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sample_collected: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  sample_collected: "Sample Collected",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function Bookings() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useViewMode("bookings");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Local state for settings inputs to prevent focus loss during mutation
  const [localHomeCollectionCharge, setLocalHomeCollectionCharge] = useState<string>("");
  const [localNotificationEmail, setLocalNotificationEmail] = useState<string>("");
  const [localNotificationPhone, setLocalNotificationPhone] = useState<string>("");
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  const { data: bookings = [], isLoading, refetch } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    refetchInterval: 15000, // Auto-refresh every 15 seconds
    refetchOnWindowFocus: true,
  });

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const { data: packages = [] } = useQuery<TestPackage[]>({
    queryKey: ["/api/packages"],
  });

  const { data: settings } = useQuery<OrganizationBookingSettings>({
    queryKey: ["/api/booking-settings"],
  });

  const { data: orgData } = useQuery<{ organization: { id: string; name: string } }>({
    queryKey: ["/api/organizations/my"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, statusNotes }: { id: string; status: string; statusNotes?: string }) => {
      return apiRequest("PATCH", `/api/bookings/${id}/status`, { status, statusNotes });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      // When a booking is confirmed, samples are created - refresh samples/patients/bills
      if (variables.status === "confirmed") {
        queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      }
      toast({ title: "Status updated successfully" });
      setSelectedBooking(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<OrganizationBookingSettings>) => {
      return apiRequest("PATCH", "/api/booking-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-settings"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    },
  });

  // Initialize local state from settings when data loads
  useEffect(() => {
    if (settings && !settingsInitialized) {
      setLocalHomeCollectionCharge(settings.homeCollectionCharge || "0");
      setLocalNotificationEmail(settings.notificationEmail || "");
      setLocalNotificationPhone(settings.notificationPhone || "");
      setSettingsInitialized(true);
    }
  }, [settings, settingsInitialized]);

  // Reset initialized state when settings sheet closes
  useEffect(() => {
    if (!showSettings) {
      setSettingsInitialized(false);
    }
  }, [showSettings]);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.patientPhone.includes(searchQuery) ||
      booking.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTestName = (testId: string) => {
    const test = tests.find(t => t.id === testId);
    return test?.name || testId;
  };

  const getPackageName = (pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    return pkg?.name || pkgId;
  };

  const bookingLink = orgData?.organization?.id 
    ? `${window.location.origin}/book/${orgData.organization.id}`
    : null;

  const copyBookingLink = () => {
    if (bookingLink) {
      navigator.clipboard.writeText(bookingLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({ title: "Booking link copied!" });
    }
  };

  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
  const todayBookings = bookings.filter(b => {
    const today = new Date().toISOString().split("T")[0];
    return b.preferredDate === today;
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Online Bookings
          </h1>
          <p className="text-muted-foreground">Manage patient booking requests from your online booking page</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh bookings" data-testid="button-refresh-bookings">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowSettings(true)} data-testid="button-booking-settings">
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
                <p className="text-2xl font-bold text-primary">{todayBookings}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <p className="text-sm text-muted-foreground">Share this link with patients for online booking</p>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="sample_collected">Collected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <ViewSwitcher pageKey="bookings" defaultView="table" onChange={setViewMode} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">No bookings yet</h3>
              <p className="text-muted-foreground">
                Share your booking link with patients to receive online bookings
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookings.map(booking => (
                <Card
                  key={booking.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                  data-testid={`card-booking-${booking.id}`}
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{booking.patientName}</p>
                        <p className="text-xs text-muted-foreground">{booking.bookingNumber}</p>
                      </div>
                      <Badge className={statusColors[booking.status || "pending"]}>
                        {statusLabels[booking.status || "pending"]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {booking.serviceType === "home_collection" ? (
                        <Badge variant="secondary">
                          <Home className="h-3 w-3 mr-1" />
                          Home Collection
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Building2 className="h-3 w-3 mr-1" />
                          Lab Visit
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{booking.patientPhone}</span>
                      </div>
                      {booking.patientEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{booking.patientEmail}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>{format(new Date(booking.preferredDate), "dd MMM yyyy")}</span>
                      {booking.preferredTimeSlot && (
                        <>
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{booking.preferredTimeSlot}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold">
                        ₹{parseFloat(String(booking.estimatedAmount || 0)).toFixed(0)}
                      </span>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }} data-testid={`button-view-booking-${booking.id}`}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {filteredBookings.map(booking => (
                <div
                  key={booking.id}
                  className="bg-muted/50 hover-elevate rounded-lg p-3 cursor-pointer"
                  onClick={() => setSelectedBooking(booking)}
                  data-testid={`list-booking-${booking.id}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{booking.patientName}</span>
                          <Badge variant="outline">{booking.bookingNumber}</Badge>
                          <Badge className={statusColors[booking.status || "pending"]}>
                            {statusLabels[booking.status || "pending"]}
                          </Badge>
                          {booking.serviceType === "home_collection" ? (
                            <Badge variant="secondary">
                              <Home className="h-3 w-3 mr-1" />
                              Home
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Building2 className="h-3 w-3 mr-1" />
                              Lab
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(booking.preferredDate), "dd MMM yyyy")}
                      </span>
                      <span className="font-semibold">
                        ₹{parseFloat(String(booking.estimatedAmount || 0)).toFixed(0)}
                      </span>
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }} data-testid={`button-view-booking-${booking.id}`}>
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map(booking => (
                <div
                  key={booking.id}
                  className="border rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedBooking(booking)}
                  data-testid={`booking-${booking.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{booking.patientName}</span>
                          <Badge variant="outline" className="text-xs">{booking.bookingNumber}</Badge>
                          <Badge className={statusColors[booking.status || "pending"]}>
                            {statusLabels[booking.status || "pending"]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {booking.patientPhone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(booking.preferredDate), "dd MMM yyyy")}
                          </span>
                          {booking.serviceType === "home_collection" ? (
                            <span className="flex items-center gap-1 text-primary">
                              <Home className="h-3 w-3" />
                              Home Collection
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              Lab Visit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        ₹{parseFloat(String(booking.estimatedAmount || 0)).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(booking.createdAt!), "dd MMM, h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedBooking && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <SheetTitle>Booking Details</SheetTitle>
                  <Badge className={statusColors[selectedBooking.status || "pending"]}>
                    {statusLabels[selectedBooking.status || "pending"]}
                  </Badge>
                </div>
                <SheetDescription>
                  {selectedBooking.bookingNumber} - Submitted on {format(new Date(selectedBooking.createdAt!), "PPP")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Patient Information</h3>
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedBooking.patientName}</p>
                          {selectedBooking.patientAge && (
                            <p className="text-sm text-muted-foreground">
                              {selectedBooking.patientAge} years, {selectedBooking.patientGender}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedBooking.patientPhone}</span>
                      </div>
                      {selectedBooking.patientEmail && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedBooking.patientEmail}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Selected Tests & Packages</h3>
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      {selectedBooking.selectedTests?.map((testId, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <TestTube className="h-4 w-4 text-muted-foreground" />
                          <span>{getTestName(testId)}</span>
                        </div>
                      ))}
                      {selectedBooking.selectedPackages?.map((pkgId, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{getPackageName(pkgId)}</span>
                        </div>
                      ))}
                      {selectedBooking.symptoms && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Symptoms:</p>
                          <p className="text-sm">{selectedBooking.symptoms}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Appointment Details</h3>
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(selectedBooking.preferredDate), "PPPP")}</span>
                      </div>
                      {selectedBooking.preferredTimeSlot && (
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedBooking.preferredTimeSlot}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        {selectedBooking.serviceType === "home_collection" ? (
                          <>
                            <Home className="h-4 w-4 text-primary" />
                            <span className="text-primary font-medium">Home Collection</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>Lab Visit</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {selectedBooking.serviceType === "home_collection" && selectedBooking.collectionAddress && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Collection Address</h3>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p>{selectedBooking.collectionAddress}</p>
                            {selectedBooking.collectionAddressLine2 && (
                              <p>{selectedBooking.collectionAddressLine2}</p>
                            )}
                            <p>
                              {selectedBooking.collectionCity}
                              {selectedBooking.collectionPincode && ` - ${selectedBooking.collectionPincode}`}
                            </p>
                            {selectedBooking.collectionNotes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Note: {selectedBooking.collectionNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Estimated Amount</h3>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span>₹{(parseFloat(String(selectedBooking.estimatedAmount || 0)) - parseFloat(String(selectedBooking.homeCollectionCharge || 0))).toFixed(0)}</span>
                      </div>
                      {selectedBooking.serviceType === "home_collection" && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Home Collection</span>
                          <span>₹{parseFloat(String(selectedBooking.homeCollectionCharge || 0)).toFixed(0)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between font-semibold text-lg">
                        <span>Total</span>
                        <span className="text-primary">₹{parseFloat(String(selectedBooking.estimatedAmount || 0)).toFixed(0)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBooking.status === "pending" && (
                      <>
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: selectedBooking.id, status: "confirmed" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="button-confirm-booking"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => updateStatusMutation.mutate({ id: selectedBooking.id, status: "cancelled" })}
                          disabled={updateStatusMutation.isPending}
                          data-testid="button-cancel-booking"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}
                    {selectedBooking.status === "confirmed" && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: selectedBooking.id, status: "sample_collected" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid="button-mark-collected"
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        Mark as Collected
                      </Button>
                    )}
                    {selectedBooking.status === "sample_collected" && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: selectedBooking.id, status: "completed" })}
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

      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Booking Settings</SheetTitle>
            <SheetDescription>Configure your online booking page</SheetDescription>
          </SheetHeader>

          {settings && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Online Booking</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable online bookings</p>
                </div>
                <Button
                  variant={settings.bookingEnabled ? "default" : "outline"}
                  onClick={() => updateSettingsMutation.mutate({ bookingEnabled: !settings.bookingEnabled })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-toggle-booking"
                >
                  {settings.bookingEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Home Collection</Label>
                  <p className="text-sm text-muted-foreground">Allow home sample collection</p>
                </div>
                <Button
                  variant={settings.homeCollectionEnabled ? "default" : "outline"}
                  onClick={() => updateSettingsMutation.mutate({ homeCollectionEnabled: !settings.homeCollectionEnabled })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-toggle-home-collection"
                >
                  {settings.homeCollectionEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {settings.homeCollectionEnabled && (
                <div className="space-y-2">
                  <Label>Home Collection Charge (₹)</Label>
                  <Input
                    type="number"
                    value={localHomeCollectionCharge}
                    onChange={(e) => setLocalHomeCollectionCharge(e.target.value)}
                    onBlur={() => {
                      if (localHomeCollectionCharge !== (settings.homeCollectionCharge || "0")) {
                        updateSettingsMutation.mutate({ homeCollectionCharge: localHomeCollectionCharge });
                      }
                    }}
                    placeholder="0"
                    data-testid="input-home-collection-charge"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Booking Lead Time (days)</Label>
                <p className="text-sm text-muted-foreground">Minimum days in advance for booking</p>
                <Select
                  value={String(settings.bookingLeadTime || 1)}
                  onValueChange={(value) => updateSettingsMutation.mutate({ bookingLeadTime: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-lead-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Same day</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="2">2 days</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Max Bookings Per Slot</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxBookingsPerSlot || 5}
                  onChange={(e) => updateSettingsMutation.mutate({ maxBookingsPerSlot: parseInt(e.target.value) })}
                  data-testid="input-max-bookings"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Notification Email</Label>
                <Input
                  type="email"
                  value={localNotificationEmail}
                  onChange={(e) => setLocalNotificationEmail(e.target.value)}
                  onBlur={() => {
                    if (localNotificationEmail !== (settings.notificationEmail || "")) {
                      updateSettingsMutation.mutate({ notificationEmail: localNotificationEmail });
                    }
                  }}
                  placeholder="Email for booking notifications"
                  data-testid="input-notification-email"
                />
              </div>

              <div className="space-y-2">
                <Label>Notification Phone</Label>
                <Input
                  type="tel"
                  value={localNotificationPhone}
                  onChange={(e) => setLocalNotificationPhone(e.target.value)}
                  onBlur={() => {
                    if (localNotificationPhone !== (settings.notificationPhone || "")) {
                      updateSettingsMutation.mutate({ notificationPhone: localNotificationPhone });
                    }
                  }}
                  placeholder="Phone for SMS notifications"
                  data-testid="input-notification-phone"
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
