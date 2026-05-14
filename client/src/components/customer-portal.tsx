import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Home, ClipboardList, MapPin, FileText, User, Loader2, CheckCircle2, Clock, Building2, Download, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomerPortalProvider, useCustomerPortal, TabType } from "@/contexts/customer-portal-context";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const tabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "bookings", label: "My Bookings", icon: ClipboardList },
  { id: "track", label: "Track", icon: MapPin },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "profile", label: "Profile", icon: User },
];

type BookingItem = {
  id: string;
  bookingNumber: string;
  patientName: string;
  status: string;
  preferredDate: string;
  preferredTimeSlot: string | null;
  serviceType: string;
  estimatedAmount: string | number;
  testCount: number;
  packageCount: number;
  createdAt: string;
};

type BookingListItem = {
  bookingNumber: string;
  status: string;
  date: string;
};

type ReportItem = {
  id: string;
  reportNumber: string;
  testName: string;
  patientName: string;
  status: string;
  finalizedAt: string | null;
  createdAt: string;
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    sample_collected: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[status] || colors.pending;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    sample_collected: "Sample Collected",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || "Pending";
};

interface CustomerPortalContentProps {
  children: ReactNode;
}

function CustomerPortalContent({ children }: CustomerPortalContentProps) {
  const { 
    activeTab, 
    setActiveTab, 
    customerPhone, 
    setCustomerPhone, 
    isVerified,
    setIsVerified,
    orgId,
    selectedBookingNumber,
    setSelectedBookingNumber
  } = useCustomerPortal();
  const { toast } = useToast();

  const handlePhoneSave = () => {
    if (customerPhone.length >= 10) {
      setIsVerified(true);
    }
  };

  // Query for bookings list (used in My Bookings and Reports tabs)
  const { data: bookingsListData, isLoading: bookingsListLoading, error: bookingsListError } = useQuery<{
    bookings?: BookingListItem[];
    verified?: boolean;
  }>({
    queryKey: ["/api/public/org", orgId, "bookings-list", customerPhone],
    queryFn: async () => {
      const url = `/api/public/org/${orgId}/bookings?phone=${encodeURIComponent(customerPhone)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
    enabled: !!orgId && customerPhone.length >= 10,
    refetchInterval: 30000,
  });

  // Query for specific booking details (used in Track tab)
  const { data: bookingDetailsData, isLoading: bookingDetailsLoading, error: bookingDetailsError } = useQuery<{
    booking?: BookingItem;
  }>({
    queryKey: ["/api/public/org", orgId, "booking-details", customerPhone, selectedBookingNumber],
    queryFn: async () => {
      const url = `/api/public/org/${orgId}/bookings?phone=${encodeURIComponent(customerPhone)}&bookingNumber=${encodeURIComponent(selectedBookingNumber!)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch booking details");
      return res.json();
    },
    enabled: !!orgId && customerPhone.length >= 10 && !!selectedBookingNumber && activeTab === "track",
    refetchInterval: 30000,
  });

  // Query for test reports (used in Reports tab)
  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useQuery<{
    reports?: ReportItem[];
  }>({
    queryKey: ["/api/public/org", orgId, "reports", customerPhone],
    queryFn: async () => {
      const url = `/api/public/org/${orgId}/reports?phone=${encodeURIComponent(customerPhone)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: !!orgId && customerPhone.length >= 10 && activeTab === "reports",
    refetchInterval: 30000,
  });

  const bookingsList = bookingsListData?.bookings || [];
  const verifiedBooking = bookingDetailsData?.booking;
  const bookingsLoading = bookingsListLoading;
  const bookingsError = bookingsListError;
  const testReports = reportsData?.reports || [];

  const completedBookings = bookingsList.filter(b => b.status === "completed");

  const handleViewDetails = (bookingNumber: string) => {
    setSelectedBookingNumber(bookingNumber);
    setActiveTab("track");
  };

  const handleDownloadReport = async (reportNumber: string) => {
    try {
      const url = `/api/public/org/${orgId}/reports/${reportNumber}?phone=${encodeURIComponent(customerPhone)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch report");
      }
      const data = await res.json();
      
      // Open report in a new window for viewing/printing
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        const org = data.organization;
        const patient = data.patient;
        const test = data.test;
        const sample = data.sample;
        const report = data.report;
        
        reportWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Lab Report - ${report.reportNumber}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
              .header { background: ${org.headerColor || '#0D9488'}; color: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
              .header h1 { font-size: 24px; margin-bottom: 5px; }
              .header p { font-size: 14px; opacity: 0.9; }
              .logo { max-height: 60px; margin-bottom: 10px; }
              .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e5e5; border-radius: 8px; }
              .section-title { color: ${org.primaryColor || '#2DD4BF'}; font-size: 14px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .label { color: #666; font-size: 13px; }
              .value { font-weight: 500; font-size: 14px; }
              .result { font-size: 20px; font-weight: bold; color: ${org.primaryColor || '#2DD4BF'}; }
              .abnormal { color: #DC2626; }
              .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px; }
              .summary h3 { color: ${org.primaryColor || '#2DD4BF'}; margin-bottom: 10px; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
              @media print { body { padding: 0; } .no-print { display: none; } }
              .print-btn { background: ${org.primaryColor || '#2DD4BF'}; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
            
            <div class="header">
              ${org.logo && org.showLogo ? `<img src="${org.logo}" alt="Logo" class="logo" />` : ''}
              <h1>${org.name}</h1>
              <p>${[org.address, org.city, org.state, org.pincode].filter(Boolean).join(', ')}</p>
              <p>Phone: ${org.phone || ''} | Email: ${org.email || ''}</p>
            </div>
            
            <div class="section">
              <div class="section-title">Patient Information</div>
              <div class="row"><span class="label">Name:</span><span class="value">${patient.firstName} ${patient.lastName}</span></div>
              <div class="row"><span class="label">Patient ID:</span><span class="value">${patient.patientId}</span></div>
              <div class="row"><span class="label">Gender:</span><span class="value">${patient.gender || 'N/A'}</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">Test Information</div>
              <div class="row"><span class="label">Test Name:</span><span class="value">${test?.name || 'N/A'}</span></div>
              <div class="row"><span class="label">Report Number:</span><span class="value">${report.reportNumber}</span></div>
              <div class="row"><span class="label">Sample ID:</span><span class="value">${sample?.sampleId || 'N/A'}</span></div>
              <div class="row"><span class="label">Collection Date:</span><span class="value">${sample?.collectedAt ? new Date(sample.collectedAt).toLocaleDateString() : 'N/A'}</span></div>
              <div class="row"><span class="label">Report Date:</span><span class="value">${report.finalizedAt ? new Date(report.finalizedAt).toLocaleDateString() : new Date(report.createdAt).toLocaleDateString()}</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">Test Result</div>
              <div class="row">
                <span class="label">Result:</span>
                <span class="result ${sample?.isAbnormal ? 'abnormal' : ''}">${sample?.resultValue || 'N/A'} ${test?.unit || ''}</span>
              </div>
              ${test?.normalRange ? `<div class="row"><span class="label">Reference Range:</span><span class="value">${test.normalRange}</span></div>` : ''}
              ${report.interpretation ? `<div class="row"><span class="label">Interpretation:</span><span class="value">${report.interpretation}</span></div>` : ''}
            </div>
            
            ${report.aiSummary ? `
            <div class="summary">
              <h3>Report Summary</h3>
              <p>${report.aiSummary}</p>
            </div>
            ` : ''}
            
            <div class="footer">
              ${org.reportFooter || `This is a computer-generated report from ${org.name}`}
            </div>
          </body>
          </html>
        `);
        reportWindow.document.close();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load report. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const PhoneInputForm = () => (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Verify Your Phone
          </CardTitle>
          <CardDescription>
            Enter your phone number to view your bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              data-testid="input-verify-phone"
            />
          </div>
          <Button 
            className="w-full" 
            onClick={handlePhoneSave}
            disabled={customerPhone.length < 10}
            data-testid="button-verify-phone"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return children;
      
      case "bookings":
        if (customerPhone.length < 10) {
          return <PhoneInputForm />;
        }
        
        if (bookingsLoading) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (bookingsError) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Card className="max-w-md w-full">
                <CardContent className="pt-6 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">Error Loading Bookings</h2>
                  <p className="text-muted-foreground">Something went wrong. Please try again.</p>
                </CardContent>
              </Card>
            </div>
          );
        }

        if (bookingsList.length === 0) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Card className="max-w-md w-full">
                <CardContent className="pt-6 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">No Bookings Found</h2>
                  <p className="text-muted-foreground">No bookings found for this phone number.</p>
                </CardContent>
              </Card>
            </div>
          );
        }

        return (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold" data-testid="text-my-bookings-title">My Bookings</h2>
            <div className="space-y-3">
              {bookingsList.map((booking) => (
                <Card key={booking.bookingNumber} data-testid={`card-booking-${booking.bookingNumber}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" data-testid={`badge-booking-number-${booking.bookingNumber}`}>
                          {booking.bookingNumber}
                        </Badge>
                        <Badge className={getStatusColor(booking.status)} data-testid={`badge-status-${booking.bookingNumber}`}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground" data-testid={`text-date-${booking.bookingNumber}`}>
                        {format(new Date(booking.date), "dd MMM yyyy")}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(booking.bookingNumber)}
                      data-testid={`button-view-details-${booking.bookingNumber}`}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case "track":
        if (!selectedBookingNumber) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Card className="max-w-md w-full">
                <CardContent className="pt-6 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">Track Your Booking</h2>
                  <p className="text-muted-foreground" data-testid="text-no-booking-selected">
                    Select a booking from My Bookings to track
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab("bookings")}
                    data-testid="button-go-to-bookings"
                  >
                    Go to My Bookings
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        }

        if (customerPhone.length < 10) {
          return <PhoneInputForm />;
        }

        if (bookingDetailsLoading) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (bookingDetailsError || !verifiedBooking) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Card className="max-w-md w-full">
                <CardContent className="pt-6 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">Booking Not Found</h2>
                  <p className="text-muted-foreground">Could not find the selected booking. Please try again.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSelectedBookingNumber(null);
                      setActiveTab("bookings");
                    }}
                    data-testid="button-try-again"
                  >
                    Back to My Bookings
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        }

        const statusSteps = ["pending", "confirmed", "sample_collected", "completed"];
        const currentStepIndex = statusSteps.indexOf(verifiedBooking.status);

        return (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" data-testid="text-track-title">Track Booking</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedBookingNumber(null);
                  setActiveTab("bookings");
                }}
                data-testid="button-back-to-bookings"
              >
                Back to Bookings
              </Button>
            </div>

            <Card data-testid="card-booking-details">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="outline" data-testid="badge-tracking-number">
                        {verifiedBooking.bookingNumber}
                      </Badge>
                      <Badge className={getStatusColor(verifiedBooking.status)} data-testid="badge-tracking-status">
                        {getStatusLabel(verifiedBooking.status)}
                      </Badge>
                    </div>
                    <p className="font-medium" data-testid="text-tracking-patient-name">{verifiedBooking.patientName}</p>
                  </div>
                  <p className="font-semibold text-primary" data-testid="text-tracking-amount">
                    ₹{parseFloat(String(verifiedBooking.estimatedAmount || 0)).toFixed(0)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1" data-testid="text-tracking-date">
                    <CalendarIcon className="h-3 w-3" />
                    {format(new Date(verifiedBooking.preferredDate), "dd MMM yyyy")}
                  </span>
                  {verifiedBooking.preferredTimeSlot && (
                    <span className="flex items-center gap-1" data-testid="text-tracking-time">
                      <Clock className="h-3 w-3" />
                      {verifiedBooking.preferredTimeSlot}
                    </span>
                  )}
                  <span className="flex items-center gap-1" data-testid="text-tracking-service-type">
                    {verifiedBooking.serviceType === "home_collection" ? (
                      <>
                        <Home className="h-3 w-3" />
                        Home Collection
                      </>
                    ) : (
                      <>
                        <Building2 className="h-3 w-3" />
                        Lab Visit
                      </>
                    )}
                  </span>
                </div>

                <div className="pt-4 border-t" data-testid="stepper-container">
                  <div className="flex items-center justify-between">
                    {statusSteps.map((step, index) => {
                      const isCompleted = index < currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      const isPending = index > currentStepIndex;
                      
                      return (
                        <div key={step} className="flex items-center flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div 
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors",
                                isCompleted && "bg-primary border-primary text-primary-foreground",
                                isCurrent && "border-primary bg-primary/10 text-primary",
                                isPending && "border-muted bg-muted/50 text-muted-foreground"
                              )}
                              data-testid={`step-${step}`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                <span className="text-xs font-medium">{index + 1}</span>
                              )}
                            </div>
                            <span className={cn(
                              "text-xs mt-1 text-center",
                              (isCompleted || isCurrent) ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {getStatusLabel(step)}
                            </span>
                          </div>
                          {index < statusSteps.length - 1 && (
                            <div className={cn(
                              "flex-1 h-0.5 mx-1",
                              index < currentStepIndex ? "bg-primary" : "bg-muted"
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case "reports":
        if (customerPhone.length < 10) {
          return <PhoneInputForm />;
        }
        
        if (reportsLoading) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (testReports.length === 0) {
          return (
            <div className="flex items-center justify-center min-h-[60vh] p-4">
              <Card className="max-w-md w-full">
                <CardContent className="pt-6 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">No Reports Available</h2>
                  <p className="text-muted-foreground">
                    Reports will be available here once your tests are completed and reports are finalized.
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        }

        return (
          <div className="p-4 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold" data-testid="text-reports-title">My Reports</h2>
            <div className="space-y-3">
              {testReports.map((report) => (
                <Card key={report.id} data-testid={`card-report-${report.reportNumber}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid={`text-test-name-${report.reportNumber}`}>
                          {report.testName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {report.patientName}
                        </p>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0" data-testid={`badge-report-number-${report.reportNumber}`}>
                        {report.reportNumber}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground" data-testid={`text-report-date-${report.reportNumber}`}>
                        {format(new Date(report.finalizedAt || report.createdAt), "dd MMM yyyy")}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDownloadReport(report.reportNumber)}
                        data-testid={`button-download-report-${report.reportNumber}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        View Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case "profile":
        return (
          <div className="flex items-center justify-center min-h-[60vh] p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription>
                  Enter your phone number to view and manage your bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    data-testid="input-customer-phone"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handlePhoneSave}
                  disabled={customerPhone.length < 10}
                  data-testid="button-save-phone"
                >
                  Save Phone Number
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return children;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        {renderTabContent()}
      </div>
      
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-background border-t z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                data-testid={`nav-tab-${tab.id}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

interface CustomerPortalProps {
  children: ReactNode;
  orgId: string;
}

export function CustomerPortal({ children, orgId }: CustomerPortalProps) {
  return (
    <CustomerPortalProvider orgId={orgId}>
      <CustomerPortalContent>{children}</CustomerPortalContent>
    </CustomerPortalProvider>
  );
}
