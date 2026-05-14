import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { HelmetProvider } from "react-helmet-async";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppModeProvider, useAppMode } from "@/contexts/app-mode-context";
import { AppModeSwitcher } from "@/components/app-mode-switcher";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, Loader2, Building2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import Tests from "@/pages/tests";
import Billing from "@/pages/billing";
import SamplesReports from "@/pages/samples-reports";
import TestReportView from "@/pages/test-report-view";
import PublicBooking from "@/pages/public-booking";
import Inventory from "@/pages/inventory";
import Analytics from "@/pages/analytics";
import Branches from "@/pages/branches";
import Settings from "@/pages/settings";
import Bookings from "@/pages/bookings";
import OpPos from "@/pages/op-pos";
import DoctorConsole from "@/pages/doctor-console";
import Consultations from "@/pages/consultations";
import PublicConsultationBooking from "@/pages/public-consultation-booking";
import QueueTracker from "@/pages/queue-tracker";
import HospitalSettings from "@/pages/hospital-settings";
import PatientPortal from "@/pages/patient-portal";
import PrivacyPolicy from "@/pages/privacy-policy";
import TermsConditions from "@/pages/terms-conditions";
import Affiliates from "@/pages/affiliates";
import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import { DioChatAssistant } from "@/components/dio-chat-assistant";
import Medicines from "@/pages/medicines";
import MedlabSales from "@/pages/medlab-sales";
import PharmacyOrders from "@/pages/pharmacy-orders";
import PublicPharmacy from "@/pages/public-pharmacy";
import MedlabCustomers from "@/pages/medlab-customers";
import MedlabPatients from "@/pages/medlab-patients";
import Suppliers from "@/pages/suppliers";
import StaffManagement from "@/pages/staff-management";
import WardManagement from "@/pages/ward-management";
import BedManagement from "@/pages/bed-management";
import Admissions from "@/pages/admissions";
import IcuDashboard from "@/pages/icu-dashboard";
import PatientDashboard from "@/pages/patient-dashboard";
import VideoRoom from "@/pages/video-room";
import CMSLogin from "@/pages/cms/cms-login";
import CMSApp from "@/pages/cms/cms-app";
import StorageLocator from "@/pages/storage-locator";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/patients" component={Patients} />
      <Route path="/tests" component={Tests} />
      <Route path="/billing" component={Billing} />
      <Route path="/samples-reports" component={SamplesReports} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/branches" component={Branches} />
      <Route path="/settings" component={Settings} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/op-pos" component={OpPos} />
      <Route path="/doctor-console" component={DoctorConsole} />
      <Route path="/consultations" component={Consultations} />
      <Route path="/hospital-settings" component={HospitalSettings} />
      <Route path="/patient/:orgId" component={PatientPortal} />
      <Route path="/medicines" component={Medicines} />
      <Route path="/medlab-sales" component={MedlabSales} />
      <Route path="/pharmacy-orders" component={PharmacyOrders} />
      <Route path="/suppliers" component={Suppliers} />
      <Route path="/medlab-inventory" component={Medicines} />
      <Route path="/medlab-customers" component={MedlabCustomers} />
      <Route path="/medlab-patients" component={MedlabPatients} />
      <Route path="/staff" component={StaffManagement} />
      <Route path="/wards" component={WardManagement} />
      <Route path="/beds" component={BedManagement} />
      <Route path="/admissions" component={Admissions} />
      <Route path="/icu" component={IcuDashboard} />
      <Route path="/patient-dashboard/:patientId" component={PatientDashboard} />
      <Route path="/storage-locator" component={StorageLocator} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UserMenu({ user }: { user: any }) {
  const { logout } = useAuth();
  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings" className="cursor-pointer">
            <UserIcon className="h-4 w-4 mr-2" />
            Settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="cursor-pointer text-red-600 dark:text-red-400"
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OrgHeader({ organization }: { organization: any }) {
  const { mode } = useAppMode();

  const modeLabel: Record<string, string> = {
    diagnostics: "Diagnostic Center",
    hospitals: "Hospital",
    medlab: "Medical Center",
  };

  const label = modeLabel[mode] || "Organization";
  const orgName = organization?.name || "";
  const logoUrl = organization?.logo || "";

  return (
    <div className="flex items-center gap-2 min-w-0" data-testid="header-org-info">
      <Avatar className="h-7 w-7 shrink-0" data-testid="avatar-org-logo">
        {logoUrl && <AvatarImage src={logoUrl} alt={orgName} />}
        <AvatarFallback className="text-[10px] bg-primary/10">
          <Building2 className="h-3.5 w-3.5 text-primary" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold leading-tight truncate" data-testid="text-org-name">
          {orgName}
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight" data-testid="text-org-label">
          {label}
        </span>
      </div>
    </div>
  );
}

function AuthenticatedApp({ user, subscribedModules, organization }: { user: any; subscribedModules: string[]; organization: any }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <AppModeProvider subscribedModules={subscribedModules}>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0 flex-wrap">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <AppModeSwitcher />
                <div className="h-5 w-px bg-border shrink-0" />
                <OrgHeader organization={organization} />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <UserMenu user={user} />
              </div>
            </header>
            <main className="flex-1 overflow-auto custom-scrollbar">
              <Router />
            </main>
          </div>
        </div>
        <DioChatAssistant />
      </SidebarProvider>
    </AppModeProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  const { data: orgData, isLoading: isOrgLoading, isError } = useQuery<{ organization: any; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || (isAuthenticated && isOrgLoading)) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (isError || !orgData || !orgData.isOnboarded) {
    return <Onboarding />;
  }

  return <AuthenticatedApp user={user} subscribedModules={orgData.organization?.subscribedModules || ["dialab"]} organization={orgData.organization} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider defaultTheme="light" storageKey="diolab-theme">
          <TooltipProvider>
            <Switch>
              <Route path="/report/:reportNumber" component={TestReportView} />
              <Route path="/book/:orgId" component={PublicBooking} />
              <Route path="/pharmacy/:orgId" component={PublicPharmacy} />
              <Route path="/book/:orgId/consultation" component={PublicConsultationBooking} />
              <Route path="/video-room/:roomId" component={VideoRoom} />
              <Route path="/queue/:orgId/:visitId" component={QueueTracker} />
              <Route path="/privacy-policy" component={PrivacyPolicy} />
              <Route path="/terms-and-conditions" component={TermsConditions} />
              <Route path="/affiliates" component={Affiliates} />
              <Route path="/dlab-cms/login" component={CMSLogin} />
              <Route path="/dlab-cms/:rest*" component={CMSApp} />
              <Route path="/dlab-cms" component={CMSApp} />
              <Route path="/sign-in" component={SignIn} />
              <Route path="/sign-up" component={SignUp} />
              <Route path="/home" component={Landing} />
              <Route>
                <AppContent />
              </Route>
            </Switch>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
