import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerPortal } from "@/components/customer-portal";
import {
  Calendar as CalendarIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  TestTube,
  Package,
  Home,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Search,
} from "lucide-react";

type OrgInfo = {
  id: string;
  name: string;
  logo: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  bookingSettings: {
    homeCollectionEnabled: boolean;
    homeCollectionCharge: string;
    availableTimeSlots: Array<{ start: string; end: string; label: string }>;
    bookingLeadTime: number;
    workingDays: number[];
  };
};

type Test = {
  id: string;
  name: string;
  code: string;
  category: string;
  price: string;
  description: string | null;
  sampleType: string | null;
  turnaroundTime: string | null;
};

type Package = {
  id: string;
  name: string;
  description: string | null;
  testIds: string[];
  originalPrice: string;
  discountedPrice: string;
  discountPercent: string | null;
};

type FormData = {
  patientName: string;
  patientAge: number | undefined;
  patientGender: string;
  patientPhone: string;
  patientEmail: string;
  selectedTests: string[];
  selectedPackages: string[];
  symptoms: string;
  serviceType: "lab_visit" | "home_collection";
  preferredDate: string;
  preferredTimeSlot: string;
  collectionAddress: string;
  collectionAddressLine2: string;
  collectionCity: string;
  collectionPincode: string;
  collectionNotes: string;
};

const STEPS = [
  { id: 1, name: "Select Tests", icon: TestTube },
  { id: 2, name: "Your Details", icon: User },
  { id: 3, name: "Schedule", icon: Calendar },
];

export default function PublicBooking() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ bookingNumber: string; estimatedAmount: number } | null>(null);
  const [date, setDate] = useState<Date | undefined>();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tests" | "packages">("tests");
  const [lookupPhone, setLookupPhone] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [patientFound, setPatientFound] = useState(false);
  
  // Booking tracking state
  const [showTrackingView, setShowTrackingView] = useState(false);
  const [trackingPhone, setTrackingPhone] = useState("");
  const [trackingBookingNumber, setTrackingBookingNumber] = useState("");
  const [bookingsList, setBookingsList] = useState<Array<{
    bookingNumber: string;
    status: string;
    date: string;
  }>>([]);
  const [verifiedBooking, setVerifiedBooking] = useState<{
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
  } | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<{total: number; pending: number; confirmed: number; completed: number} | null>(null);

  const fetchBookingsByPhone = async (phone: string, bookingNum?: string) => {
    if (phone.length < 10) {
      setTrackingError("Please enter a valid 10-digit phone number");
      return;
    }
    setIsTrackingLoading(true);
    setTrackingError(null);
    try {
      let url = `/api/public/org/${orgId}/bookings?phone=${encodeURIComponent(phone)}`;
      if (bookingNum) {
        url += `&bookingNumber=${encodeURIComponent(bookingNum)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.verified && data.booking) {
          // Verified with booking number - show full details
          setVerifiedBooking(data.booking);
          setBookingsList(data.otherBookings || []);
        } else {
          // Not verified - show list of bookings
          setBookingsList(data.bookings || []);
          setStatusCounts(data.statusCounts || null);
          setVerifiedBooking(null);
          if (data.bookings?.length === 0) {
            setTrackingError("No bookings found for this phone number");
          }
        }
      } else {
        const error = await res.json();
        setTrackingError(error.error || "Failed to fetch bookings");
        setBookingsList([]);
        setVerifiedBooking(null);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setTrackingError("Something went wrong. Please try again.");
      setBookingsList([]);
      setVerifiedBooking(null);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Reset all tracking state
  const resetTrackingState = () => {
    setShowTrackingView(false);
    setBookingsList([]);
    setVerifiedBooking(null);
    setTrackingPhone("");
    setTrackingBookingNumber("");
    setTrackingError(null);
    setStatusCounts(null);
  };
  
  const [formData, setFormData] = useState<FormData>({
    patientName: "",
    patientAge: undefined,
    patientGender: "",
    patientPhone: "",
    patientEmail: "",
    selectedTests: [],
    selectedPackages: [],
    symptoms: "",
    serviceType: "lab_visit",
    preferredDate: "",
    preferredTimeSlot: "",
    collectionAddress: "",
    collectionAddressLine2: "",
    collectionCity: "",
    collectionPincode: "",
    collectionNotes: "",
  });

  const { data: org, isLoading: orgLoading, error: orgError } = useQuery<OrgInfo>({
    queryKey: ["/api/public/org", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/public/org/${orgId}`);
      if (!res.ok) throw new Error("Organization not found");
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: tests = [], isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ["/api/public/org", orgId, "tests"],
    queryFn: async () => {
      const res = await fetch(`/api/public/org/${orgId}/tests`);
      if (!res.ok) throw new Error("Failed to fetch tests");
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: packages = [], isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/public/org", orgId, "packages"],
    queryFn: async () => {
      const res = await fetch(`/api/public/org/${orgId}/packages`);
      if (!res.ok) throw new Error("Failed to fetch packages");
      return res.json();
    },
    enabled: !!orgId,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch(`/api/public/org/${orgId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit booking");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setBookingResult(data);
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const toggleTest = (testId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter(id => id !== testId)
        : [...prev.selectedTests, testId],
    }));
  };

  const togglePackage = (pkgId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPackages: prev.selectedPackages.includes(pkgId)
        ? prev.selectedPackages.filter(id => id !== pkgId)
        : [...prev.selectedPackages, pkgId],
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    formData.selectedTests.forEach(testId => {
      const test = tests.find(t => t.id === testId);
      if (test) total += parseFloat(test.price);
    });
    formData.selectedPackages.forEach(pkgId => {
      const pkg = packages.find(p => p.id === pkgId);
      if (pkg) total += parseFloat(pkg.discountedPrice);
    });
    if (formData.serviceType === "home_collection" && org?.bookingSettings?.homeCollectionCharge) {
      total += parseFloat(org.bookingSettings.homeCollectionCharge);
    }
    return total;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.selectedTests.length > 0 || formData.selectedPackages.length > 0;
      case 2:
        return formData.patientName && formData.patientPhone && formData.patientPhone.length >= 10;
      case 3:
        if (!formData.preferredDate) return false;
        if (formData.serviceType === "home_collection" && !formData.collectionAddress) return false;
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      submitMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePatientLookup = async () => {
    if (lookupPhone.length < 10) return;
    setIsLookingUp(true);
    setPatientFound(false);
    try {
      const res = await fetch(`/api/public/org/${orgId}/patient-lookup?phone=${encodeURIComponent(lookupPhone)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.patient) {
          updateFormData({
            patientName: data.patient.name || "",
            patientPhone: data.patient.phone || lookupPhone,
            patientEmail: data.patient.email || "",
            patientAge: data.patient.age || undefined,
            patientGender: data.patient.gender || "",
            collectionAddress: data.patient.address || "",
            collectionAddressLine2: data.patient.addressLine2 || "",
            collectionCity: data.patient.city || "",
            collectionPincode: data.patient.pincode || "",
          });
          setPatientFound(true);
        } else {
          updateFormData({ patientPhone: lookupPhone });
          toast({
            title: "New Patient",
            description: "No previous booking found. Please fill in your details.",
          });
        }
      }
    } catch (error) {
      console.error("Error looking up patient:", error);
    } finally {
      setIsLookingUp(false);
    }
  };

  useEffect(() => {
    if (date) {
      updateFormData({ preferredDate: format(date, "yyyy-MM-dd") });
    }
  }, [date]);

  const disabledDays = (day: Date) => {
    const leadTime = org?.bookingSettings?.bookingLeadTime || 1;
    const minDate = addDays(startOfDay(new Date()), leadTime);
    if (isBefore(day, minDate)) return true;
    const dayOfWeek = day.getDay();
    const workingDays = org?.bookingSettings?.workingDays || [1, 2, 3, 4, 5, 6];
    return !workingDays.includes(dayOfWeek);
  };

  const filteredTests = tests.filter(test => 
    searchQuery === "" || 
    test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (test.category && test.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPackages = packages.filter(pkg =>
    searchQuery === "" ||
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedTests = filteredTests.reduce((acc, test) => {
    const category = test.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {} as Record<string, Test[]>);

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Unavailable</h2>
            <p className="text-muted-foreground">
              Online booking is not available for this organization or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status color and label helpers
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      sample_collected: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending Confirmation",
      confirmed: "Confirmed",
      sample_collected: "Sample Collected",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return labels[status] || "Pending";
  };

  // Tracking view
  if (showTrackingView && org) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        {/* Header */}
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-lg">{org.name}</h1>
                <p className="text-xs text-muted-foreground">Track Your Bookings</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Search Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Track Your Bookings
              </CardTitle>
              <CardDescription>
                Enter your phone number to view all your bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your phone number"
                  value={trackingPhone}
                  onChange={(e) => setTrackingPhone(e.target.value)}
                  className="flex-1"
                  data-testid="input-tracking-phone"
                />
                <Button 
                  onClick={() => fetchBookingsByPhone(trackingPhone)}
                  disabled={trackingPhone.length < 10 || isTrackingLoading}
                  data-testid="button-search-bookings"
                >
                  {isTrackingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results - Verified Booking Details */}
          {verifiedBooking ? (
            <div className="space-y-4">
              <Card data-testid={`card-booking-${verifiedBooking.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" data-testid="badge-booking-number">{verifiedBooking.bookingNumber}</Badge>
                        <Badge className={getStatusColor(verifiedBooking.status)} data-testid="badge-booking-status">
                          {getStatusLabel(verifiedBooking.status)}
                        </Badge>
                      </div>
                      <p className="font-medium mt-2" data-testid="text-patient-name">{verifiedBooking.patientName}</p>
                    </div>
                    <p className="font-semibold text-primary" data-testid="text-amount">
                      ₹{parseFloat(String(verifiedBooking.estimatedAmount || 0)).toFixed(0)}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(verifiedBooking.preferredDate), "dd MMM yyyy")}
                    </span>
                    {verifiedBooking.preferredTimeSlot && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {verifiedBooking.preferredTimeSlot}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
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

                  {/* Status Progress */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <div className={cn(
                        "flex flex-col items-center gap-1",
                        ["pending", "confirmed", "sample_collected", "completed"].includes(verifiedBooking.status) ? "text-primary" : "text-muted-foreground"
                      )}>
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          ["pending", "confirmed", "sample_collected", "completed"].includes(verifiedBooking.status) ? "bg-primary" : "bg-muted"
                        )} />
                        <span>Booked</span>
                      </div>
                      <div className={cn("flex-1 h-0.5 mx-1", ["confirmed", "sample_collected", "completed"].includes(verifiedBooking.status) ? "bg-primary" : "bg-muted")} />
                      <div className={cn(
                        "flex flex-col items-center gap-1",
                        ["confirmed", "sample_collected", "completed"].includes(verifiedBooking.status) ? "text-primary" : "text-muted-foreground"
                      )}>
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          ["confirmed", "sample_collected", "completed"].includes(verifiedBooking.status) ? "bg-primary" : "bg-muted"
                        )} />
                        <span>Confirmed</span>
                      </div>
                      <div className={cn("flex-1 h-0.5 mx-1", ["sample_collected", "completed"].includes(verifiedBooking.status) ? "bg-primary" : "bg-muted")} />
                      <div className={cn(
                        "flex flex-col items-center gap-1",
                        ["sample_collected", "completed"].includes(verifiedBooking.status) ? "text-primary" : "text-muted-foreground"
                      )}>
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          ["sample_collected", "completed"].includes(verifiedBooking.status) ? "bg-primary" : "bg-muted"
                        )} />
                        <span>Collected</span>
                      </div>
                      <div className={cn("flex-1 h-0.5 mx-1", verifiedBooking.status === "completed" ? "bg-primary" : "bg-muted")} />
                      <div className={cn(
                        "flex flex-col items-center gap-1",
                        verifiedBooking.status === "completed" ? "text-primary" : "text-muted-foreground"
                      )}>
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          verifiedBooking.status === "completed" ? "bg-primary" : "bg-muted"
                        )} />
                        <span>Done</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other Bookings */}
              {bookingsList.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Other Bookings</h4>
                  <div className="space-y-2">
                    {bookingsList.map((b) => (
                      <div
                        key={b.bookingNumber}
                        className="border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                          setTrackingBookingNumber(b.bookingNumber);
                          fetchBookingsByPhone(trackingPhone, b.bookingNumber);
                        }}
                        data-testid={`button-view-booking-${b.bookingNumber}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{b.bookingNumber}</Badge>
                            <Badge className={getStatusColor(b.status)}>{getStatusLabel(b.status)}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">{format(new Date(b.date), "dd MMM")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : bookingsList.length > 0 ? (
            /* Unverified - Show booking list to select from */
            <div className="space-y-3">
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">
                  Found {bookingsList.length} booking{bookingsList.length > 1 ? "s" : ""}. Select one to view details.
                </p>
              </div>
              {bookingsList.map((booking) => (
                <div
                  key={booking.bookingNumber}
                  className="border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => {
                    setTrackingBookingNumber(booking.bookingNumber);
                    fetchBookingsByPhone(trackingPhone, booking.bookingNumber);
                  }}
                  data-testid={`button-select-booking-${booking.bookingNumber}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{booking.bookingNumber}</Badge>
                      <Badge className={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{format(new Date(booking.date), "dd MMM yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : trackingError ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground" data-testid="text-tracking-error">{trackingError}</p>
              </CardContent>
            </Card>
          ) : null}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                resetTrackingState();
              }}
              data-testid="button-back-to-confirmation"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={() => {
                resetTrackingState();
                setSubmitted(false);
                setBookingResult(null);
                setCurrentStep(1);
              }}
              data-testid="button-make-new-booking"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Reset form for new booking
  const handleBookAnother = (keepPatientDetails: boolean) => {
    setSubmitted(false);
    setBookingResult(null);
    setCurrentStep(1);
    setDate(undefined);
    // Reset tracking state
    resetTrackingState();
    if (keepPatientDetails) {
      // Keep patient details but clear selections
      setFormData(prev => ({
        ...prev,
        selectedTests: [],
        selectedPackages: [],
        symptoms: "",
        preferredDate: "",
        preferredTimeSlot: "",
        collectionNotes: "",
      }));
    } else {
      // Start fresh
      setFormData({
        patientName: "",
        patientAge: undefined,
        patientGender: "",
        patientPhone: "",
        patientEmail: "",
        selectedTests: [],
        selectedPackages: [],
        symptoms: "",
        serviceType: "lab_visit",
        preferredDate: "",
        preferredTimeSlot: "",
        collectionAddress: "",
        collectionAddressLine2: "",
        collectionCity: "",
        collectionPincode: "",
        collectionNotes: "",
      });
      setPatientFound(false);
      setLookupPhone("");
    }
  };

  // Show tracking view - auto-populate with booking number if coming from confirmation
  const handleTrackBookings = () => {
    setShowTrackingView(true);
    setTrackingPhone(formData.patientPhone);
    // If we have a booking result, auto-verify that booking
    if (bookingResult?.bookingNumber) {
      setTrackingBookingNumber(bookingResult.bookingNumber);
      fetchBookingsByPhone(formData.patientPhone, bookingResult.bookingNumber);
    } else {
      fetchBookingsByPhone(formData.patientPhone);
    }
  };

  if (submitted && bookingResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4">
        {/* Header */}
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10 -mx-4 px-4 mb-6">
          <div className="max-w-md mx-auto py-4">
            <div className="flex items-center gap-3">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-lg">{org.name}</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          {/* Success Card */}
          <Card>
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground mb-4">
                Your booking has been submitted successfully.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-muted-foreground">Booking Number</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-booking-number">{bookingResult.bookingNumber}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-muted-foreground">Estimated Amount</p>
                <p className="text-xl font-semibold" data-testid="text-estimated-amount">₹{bookingResult.estimatedAmount.toFixed(2)}</p>
              </div>
              
              {/* Status Tracking Preview */}
              <div className="bg-muted/30 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-3">Booking Status</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-xs">Pending</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-muted" />
                    <span className="text-xs text-muted-foreground">Confirmed</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-muted" />
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                We will contact you shortly at <strong>{formData.patientPhone}</strong> to confirm your appointment.
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button 
                className="w-full" 
                onClick={handleTrackBookings}
                data-testid="button-track-bookings"
              >
                <Search className="h-4 w-4 mr-2" />
                Track My Bookings
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleBookAnother(true)}
                  data-testid="button-book-again"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Book Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleBookAnother(false)}
                  data-testid="button-book-family"
                >
                  <User className="h-4 w-4 mr-2" />
                  Book for Family
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground text-center">
                Questions? Contact us at{" "}
                {org.phone && (
                  <a href={`tel:${org.phone}`} className="text-primary font-medium">
                    {org.phone}
                  </a>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <CustomerPortal orgId={orgId || ""}>
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              {org.logo ? (
                <img src={org.logo} alt={org.name} className="h-10 w-10 rounded-lg object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-lg">{org.name}</h1>
                {org.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {org.city}, {org.state}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "flex items-center gap-2",
                currentStep >= step.id ? "text-primary" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep > step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "bg-primary/20 text-primary border-2 border-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {currentStep > step.id ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{step.name}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 sm:w-16 h-0.5 mx-2",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>
              {currentStep === 1 && "Select Tests & Packages"}
              {currentStep === 2 && "Your Details"}
              {currentStep === 3 && "Schedule Appointment"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Choose the tests or health packages you need"}
              {currentStep === 2 && "Enter your personal information"}
              {currentStep === 3 && "Choose your preferred date, time, and service type"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tests or packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-tests"
                  />
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tests" | "packages")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="tests" className="flex items-center gap-2" data-testid="tab-tests">
                      <TestTube className="h-4 w-4" />
                      Tests ({filteredTests.length})
                    </TabsTrigger>
                    <TabsTrigger value="packages" className="flex items-center gap-2" data-testid="tab-packages">
                      <Package className="h-4 w-4" />
                      Packages ({filteredPackages.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tests" className="mt-4">
                    {testsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </div>
                    ) : filteredTests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No tests match your search" : "No tests available"}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupedTests).map(([category, categoryTests]) => (
                          <div key={category}>
                            <Label className="text-sm text-muted-foreground mb-2 block">{category}</Label>
                            <div className="grid gap-2">
                              {categoryTests.map(test => (
                                <div
                                  key={test.id}
                                  className={cn(
                                    "border rounded-lg p-3 cursor-pointer transition-all",
                                    formData.selectedTests.includes(test.id)
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-primary/50"
                                  )}
                                  onClick={() => toggleTest(test.id)}
                                  data-testid={`test-${test.id}`}
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={formData.selectedTests.includes(test.id)}
                                        className="pointer-events-none"
                                      />
                                      <div>
                                        <span className="font-medium">{test.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">({test.code})</span>
                                      </div>
                                    </div>
                                    <p className="font-semibold">₹{parseFloat(test.price).toFixed(0)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="packages" className="mt-4">
                    {packagesLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </div>
                    ) : filteredPackages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? "No packages match your search" : "No health packages available"}
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {filteredPackages.map(pkg => (
                          <div
                            key={pkg.id}
                            className={cn(
                              "border rounded-lg p-4 cursor-pointer transition-all",
                              formData.selectedPackages.includes(pkg.id)
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            )}
                            onClick={() => togglePackage(pkg.id)}
                            data-testid={`package-${pkg.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={formData.selectedPackages.includes(pkg.id)}
                                    className="pointer-events-none"
                                  />
                                  <span className="font-medium">{pkg.name}</span>
                                  {pkg.discountPercent && parseFloat(pkg.discountPercent) > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {parseFloat(pkg.discountPercent).toFixed(0)}% off
                                    </Badge>
                                  )}
                                </div>
                                {pkg.description && (
                                  <p className="text-sm text-muted-foreground mt-1 ml-6">
                                    {pkg.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                {parseFloat(pkg.originalPrice) > parseFloat(pkg.discountedPrice) && (
                                  <p className="text-sm text-muted-foreground line-through">
                                    ₹{parseFloat(pkg.originalPrice).toFixed(0)}
                                  </p>
                                )}
                                <p className="font-semibold text-primary">
                                  ₹{parseFloat(pkg.discountedPrice).toFixed(0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {(formData.selectedTests.length > 0 || formData.selectedPackages.length > 0) && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Selected Items</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.selectedTests.map(testId => {
                        const test = tests.find(t => t.id === testId);
                        return test ? (
                          <Badge key={testId} variant="secondary" className="text-xs">
                            {test.name}
                          </Badge>
                        ) : null;
                      })}
                      {formData.selectedPackages.map(pkgId => {
                        const pkg = packages.find(p => p.id === pkgId);
                        return pkg ? (
                          <Badge key={pkgId} variant="default" className="text-xs">
                            {pkg.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <Label className="text-base font-medium">Returning Patient?</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your phone number to auto-fill your details from your previous booking.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      value={lookupPhone}
                      onChange={(e) => setLookupPhone(e.target.value)}
                      placeholder="Enter 10-digit phone number"
                      className="flex-1"
                      data-testid="input-lookup-phone"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePatientLookup}
                      disabled={lookupPhone.length < 10 || isLookingUp}
                      data-testid="button-lookup-patient"
                    >
                      {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
                    </Button>
                  </div>
                  {patientFound && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Details loaded from your previous booking!
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientName">Full Name *</Label>
                  <Input
                    id="patientName"
                    value={formData.patientName}
                    onChange={(e) => updateFormData({ patientName: e.target.value })}
                    placeholder="Enter your full name"
                    data-testid="input-patient-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientAge">Age</Label>
                    <Input
                      id="patientAge"
                      type="number"
                      min="0"
                      max="150"
                      value={formData.patientAge ?? ""}
                      onChange={(e) => updateFormData({ patientAge: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Age"
                      data-testid="input-patient-age"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientGender">Gender</Label>
                    <Select
                      value={formData.patientGender}
                      onValueChange={(value) => updateFormData({ patientGender: value })}
                    >
                      <SelectTrigger data-testid="select-patient-gender">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientPhone">Phone Number *</Label>
                  <Input
                    id="patientPhone"
                    type="tel"
                    value={formData.patientPhone}
                    onChange={(e) => updateFormData({ patientPhone: e.target.value })}
                    placeholder="Enter 10-digit phone number"
                    data-testid="input-patient-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientEmail">Email (optional)</Label>
                  <Input
                    id="patientEmail"
                    type="email"
                    value={formData.patientEmail}
                    onChange={(e) => updateFormData({ patientEmail: e.target.value })}
                    placeholder="Enter email address"
                    data-testid="input-patient-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms (optional)</Label>
                  <Textarea
                    id="symptoms"
                    value={formData.symptoms}
                    onChange={(e) => updateFormData({ symptoms: e.target.value })}
                    placeholder="Describe any symptoms you're experiencing"
                    rows={3}
                    data-testid="input-symptoms"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base">Service Type</Label>
                  <RadioGroup
                    value={formData.serviceType}
                    onValueChange={(value) => updateFormData({ serviceType: value as "lab_visit" | "home_collection" })}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="lab_visit" id="lab_visit" className="peer sr-only" />
                      <Label
                        htmlFor="lab_visit"
                        className={cn(
                          "flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-all",
                          formData.serviceType === "lab_visit"
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        )}
                        data-testid="radio-lab-visit"
                      >
                        <Building2 className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Lab Visit</p>
                          <p className="text-sm text-muted-foreground">Visit us at the lab</p>
                        </div>
                      </Label>
                    </div>
                    {org.bookingSettings?.homeCollectionEnabled && (
                      <div>
                        <RadioGroupItem value="home_collection" id="home_collection" className="peer sr-only" />
                        <Label
                          htmlFor="home_collection"
                          className={cn(
                            "flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-all",
                            formData.serviceType === "home_collection"
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/50"
                          )}
                          data-testid="radio-home-collection"
                        >
                          <Home className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Home Collection</p>
                            <p className="text-sm text-muted-foreground">
                              +₹{parseFloat(org.bookingSettings.homeCollectionCharge || "0").toFixed(0)}
                            </p>
                          </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Preferred Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                        data-testid="button-select-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={disabledDays}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {org.bookingSettings?.availableTimeSlots && (
                  <div className="space-y-3">
                    <Label className="text-base">Preferred Time Slot</Label>
                    <Select
                      value={formData.preferredTimeSlot}
                      onValueChange={(value) => updateFormData({ preferredTimeSlot: value })}
                    >
                      <SelectTrigger data-testid="select-time-slot">
                        <SelectValue placeholder="Select time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {(org.bookingSettings.availableTimeSlots as Array<{ start: string; end: string; label: string }>).map((slot, idx) => (
                          <SelectItem key={idx} value={`${slot.start}-${slot.end}`}>
                            <span className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {slot.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.serviceType === "home_collection" && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Collection Address
                    </Label>
                    <div className="space-y-2">
                      <Input
                        value={formData.collectionAddress}
                        onChange={(e) => updateFormData({ collectionAddress: e.target.value })}
                        placeholder="House/Flat No., Building Name, Street *"
                        data-testid="input-collection-address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={formData.collectionAddressLine2}
                        onChange={(e) => updateFormData({ collectionAddressLine2: e.target.value })}
                        placeholder="Landmark, Area"
                        data-testid="input-collection-address2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        value={formData.collectionCity}
                        onChange={(e) => updateFormData({ collectionCity: e.target.value })}
                        placeholder="City"
                        data-testid="input-collection-city"
                      />
                      <Input
                        value={formData.collectionPincode}
                        onChange={(e) => updateFormData({ collectionPincode: e.target.value })}
                        placeholder="Pincode"
                        data-testid="input-collection-pincode"
                      />
                    </div>
                    <Textarea
                      value={formData.collectionNotes}
                      onChange={(e) => updateFormData({ collectionNotes: e.target.value })}
                      placeholder="Any instructions for the collection agent"
                      rows={2}
                      data-testid="input-collection-notes"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center pb-4">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            Need help? Call us at {org.phone || "our helpline"}
          </p>
        </div>
        
        {/* Spacer to account for fixed footer + bottom nav - only on step 1 */}
        {currentStep === 1 && <div className="h-36" />}
        
        {/* Non-sticky footer for steps 2 and 3 */}
        {currentStep > 1 && (
          <div className="bg-background border-t pt-4 mt-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-shrink-0">
                {(formData.selectedTests.length > 0 || formData.selectedPackages.length > 0) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Total</p>
                    <p className="text-xl font-bold text-primary">₹{calculateTotal().toFixed(0)}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleBack} data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || submitMutation.isPending}
                  data-testid="button-next"
                >
                  {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {currentStep === 3 ? "Confirm Booking" : "Continue"}
                  {currentStep < 3 && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Fixed Footer with Total and Continue Button - only on step 1 (test selection) */}
      {/* Position above the customer portal's bottom navigation (h-16 = 4rem) */}
      {currentStep === 1 && (
        <div 
          className="fixed left-0 right-0 bg-background border-t shadow-lg z-40"
          style={{ bottom: "4rem" }}
        >
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-shrink-0">
                {(formData.selectedTests.length > 0 || formData.selectedPackages.length > 0) ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Total</p>
                    <p className="text-xl font-bold text-primary">₹{calculateTotal().toFixed(0)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Select tests to continue</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || submitMutation.isPending}
                  data-testid="button-next-fixed"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </CustomerPortal>
  );
}
