import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";
import {
  Building,
  FileText,
  Bell,
  Palette,
  Upload,
  Save,
  Sparkles,
  Loader2,
  Database,
  Users,
  X,
  Image,
  CreditCard,
  QrCode,
  Smartphone,
  TestTube2,
  Stethoscope,
  Pill,
  Puzzle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrganizationResponse {
  organization: Organization | null;
  isOnboarded: boolean;
}

const MODULE_INFO = [
  {
    id: "dialab",
    name: "Dialab",
    description: "Diagnostic center management with test billing, sample tracking, and report generation",
    icon: TestTube2,
  },
  {
    id: "doclab",
    name: "Doclab",
    description: "Doctor consultation management with OPD queue, token system, and prescriptions",
    icon: Stethoscope,
  },
  {
    id: "medlab",
    name: "Medlab",
    description: "Pharmacy and medicine inventory management with sales and stock tracking",
    icon: Pill,
  },
];

export default function Settings() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<OrganizationResponse>({
    queryKey: ["/api/organizations/my"],
  });

  const organization = data?.organization;
  const subscribedModules = organization?.subscribedModules ?? ["dialab"];

  const [orgSettings, setOrgSettings] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    gstNumber: "",
    panNumber: "",
    licenseNumber: "",
    invoicePrefix: "INV",
  });

  const [reportSettings, setReportSettings] = useState({
    reportHeader: "",
    reportFooter: "",
    showLogo: true,
    showQRCode: true,
  });

  const [brandingSettings, setBrandingSettings] = useState({
    logo: "",
    primaryColor: "#2DD4BF",
    accentColor: "#0F766E",
    headerColor: "#0D9488",
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [paymentSettings, setPaymentSettings] = useState({
    upiQrCodeUrl: "",
    upiId: "",
  });
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const [notificationSettings, setNotificationSettings] = useState({
    whatsappEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    autoSendReports: true,
    lowStockAlerts: true,
  });

  const [doclabSettings, setDoclabSettings] = useState({
    tokenPrefix: "T",
  });

  const [medlabSettings, setMedlabSettings] = useState({
    pharmacyName: "",
    defaultMarkupPercent: "15",
    lowStockThreshold: 10,
  });

  useEffect(() => {
    if (organization) {
      setOrgSettings({
        name: organization.name || "",
        address: organization.address || "",
        phone: organization.phone || "",
        email: organization.email || "",
        gstNumber: organization.gstNumber || "",
        panNumber: organization.panNumber || "",
        licenseNumber: organization.licenseNumber || "",
        invoicePrefix: organization.invoicePrefix || "INV",
      });
      setReportSettings({
        reportHeader: organization.reportHeader || "",
        reportFooter: organization.reportFooter || "",
        showLogo: organization.showLogo ?? true,
        showQRCode: organization.showQRCode ?? true,
      });
      setBrandingSettings({
        logo: organization.logo || "",
        primaryColor: organization.primaryColor || "#2DD4BF",
        accentColor: organization.accentColor || "#0F766E",
        headerColor: organization.headerColor || "#0D9488",
      });
      setPaymentSettings({
        upiQrCodeUrl: organization.upiQrCodeUrl || "",
        upiId: organization.upiId || "",
      });
      setDoclabSettings({
        tokenPrefix: organization.tokenPrefix || "T",
      });
      setMedlabSettings({
        pharmacyName: organization.pharmacyName || "",
        defaultMarkupPercent: organization.defaultMarkupPercent || "15",
        lowStockThreshold: organization.lowStockThreshold ?? 10,
      });
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Organization>) => {
      if (!organization?.id) throw new Error("Organization not found");
      const response = await apiRequest("PATCH", `/api/organizations/${organization.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/my"] });
      toast({
        title: "Settings saved",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moduleToggleMutation = useMutation({
    mutationFn: async (updates: { subscribedModules: string[] }) => {
      if (!organization?.id) throw new Error("Organization not found");
      const response = await apiRequest("PATCH", `/api/organizations/${organization.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/my"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update modules",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updates: Partial<Organization> = {
      name: orgSettings.name,
      address: orgSettings.address,
      phone: orgSettings.phone,
      email: orgSettings.email,
      gstNumber: orgSettings.gstNumber,
      panNumber: orgSettings.panNumber,
      licenseNumber: orgSettings.licenseNumber,
      invoicePrefix: orgSettings.invoicePrefix,
      reportHeader: reportSettings.reportHeader,
      reportFooter: reportSettings.reportFooter,
      showLogo: reportSettings.showLogo,
      showQRCode: reportSettings.showQRCode,
      logo: brandingSettings.logo,
      primaryColor: brandingSettings.primaryColor,
      accentColor: brandingSettings.accentColor,
      headerColor: brandingSettings.headerColor,
      upiQrCodeUrl: paymentSettings.upiQrCodeUrl,
      upiId: paymentSettings.upiId,
      tokenPrefix: doclabSettings.tokenPrefix,
      pharmacyName: medlabSettings.pharmacyName,
      defaultMarkupPercent: medlabSettings.defaultMarkupPercent,
      lowStockThreshold: medlabSettings.lowStockThreshold,
    };
    updateMutation.mutate(updates);
  };

  const handleModuleToggle = (moduleId: string, enabled: boolean) => {
    const current = subscribedModules;
    let updated: string[];

    if (enabled) {
      updated = [...current, moduleId];
    } else {
      if (current.length <= 1) {
        toast({
          title: "Cannot remove module",
          description: "At least one module must remain active.",
          variant: "destructive",
        });
        return;
      }
      updated = current.filter((m) => m !== moduleId);
    }

    moduleToggleMutation.mutate(
      { subscribedModules: updated },
      {
        onSuccess: () => {
          toast({
            title: enabled ? "Module activated" : "Module deactivated",
            description: `${MODULE_INFO.find((m) => m.id === moduleId)?.name} has been ${enabled ? "enabled" : "disabled"}.`,
          });
        },
      }
    );
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");
      const { objectPath } = await uploadRes.json();

      setBrandingSettings(prev => ({ ...prev, logo: objectPath }));
      toast({
        title: "Logo uploaded",
        description: "Don't forget to save your changes!",
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleQrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload file");
      const { objectPath } = await uploadRes.json();

      setPaymentSettings(prev => ({ ...prev, upiQrCodeUrl: objectPath }));
      toast({
        title: "QR Code uploaded",
        description: "Don't forget to save your changes!",
      });
    } catch (error) {
      console.error("QR upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = "";
    }
  };

  const seedDemoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/seed-demo");
      return response.json();
    },
    onSuccess: (data: { message: string; created: { patients: number; bills: number; samples: number } }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-reports"] });
      toast({
        title: "Demo data created",
        description: `Created ${data.created.patients} patients, ${data.created.bills} bills, and ${data.created.samples} samples.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to seed demo data",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-12 w-full max-w-md" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive" data-testid="text-error">Failed to load settings. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground" data-testid="text-onboarding-required">Please complete onboarding to access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasModule = (mod: string) => subscribedModules.includes(mod);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">Manage your organization and application preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full lg:w-auto">
          <TabsTrigger value="general" data-testid="tab-general">
            <Building className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          {hasModule("dialab") && (
            <TabsTrigger value="dialab" data-testid="tab-dialab">
              <TestTube2 className="h-4 w-4 mr-2" />
              Dialab
            </TabsTrigger>
          )}
          {hasModule("doclab") && (
            <TabsTrigger value="doclab" data-testid="tab-doclab">
              <Stethoscope className="h-4 w-4 mr-2" />
              Doclab
            </TabsTrigger>
          )}
          {hasModule("medlab") && (
            <TabsTrigger value="medlab" data-testid="tab-medlab">
              <Pill className="h-4 w-4 mr-2" />
              Medlab
            </TabsTrigger>
          )}
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="modules" data-testid="tab-modules">
            <Puzzle className="h-4 w-4 mr-2" />
            Modules
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Details</CardTitle>
              <CardDescription>
                Update your organization's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Organization Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden relative">
                    {brandingSettings.logo ? (
                      <>
                        <img 
                          src={brandingSettings.logo} 
                          alt="Organization Logo" 
                          className="h-full w-full object-contain"
                          data-testid="img-org-logo"
                        />
                        <button
                          type="button"
                          onClick={() => setBrandingSettings(prev => ({ ...prev, logo: "" }))}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                          data-testid="button-remove-logo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      data-testid="input-logo-file"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      data-testid="button-upload-logo"
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recommended: 200x200px, PNG or JPG (max 5MB)
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Logo will appear on reports and bills
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings({ ...orgSettings, name: e.target.value })}
                    data-testid="input-org-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgEmail">Email</Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={orgSettings.email}
                    onChange={(e) => setOrgSettings({ ...orgSettings, email: e.target.value })}
                    data-testid="input-org-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgAddress">Address</Label>
                <Textarea
                  id="orgAddress"
                  value={orgSettings.address}
                  onChange={(e) => setOrgSettings({ ...orgSettings, address: e.target.value })}
                  rows={2}
                  data-testid="input-org-address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgPhone">Phone</Label>
                  <Input
                    id="orgPhone"
                    value={orgSettings.phone}
                    onChange={(e) => setOrgSettings({ ...orgSettings, phone: e.target.value })}
                    data-testid="input-org-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={orgSettings.gstNumber}
                    onChange={(e) => setOrgSettings({ ...orgSettings, gstNumber: e.target.value })}
                    data-testid="input-gst-number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    value={orgSettings.panNumber}
                    onChange={(e) => setOrgSettings({ ...orgSettings, panNumber: e.target.value })}
                    data-testid="input-pan-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={orgSettings.licenseNumber}
                    onChange={(e) => setOrgSettings({ ...orgSettings, licenseNumber: e.target.value })}
                    data-testid="input-license-number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={orgSettings.invoicePrefix}
                  onChange={(e) => setOrgSettings({ ...orgSettings, invoicePrefix: e.target.value.toUpperCase() })}
                  className="w-32"
                  maxLength={5}
                  data-testid="input-invoice-prefix"
                />
                <p className="text-xs text-muted-foreground">
                  Invoices will be numbered as {orgSettings.invoicePrefix}-001, {orgSettings.invoicePrefix}-002, etc.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Settings
              </CardTitle>
              <CardDescription>
                Configure your payment collection methods. Upload your UPI QR code so customers can scan and pay directly to your bank account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    UPI QR Code
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Upload your UPI QR code from any payment app (GPay, PhonePe, Paytm, etc.). This QR will be shown to customers during UPI payments.
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="h-40 w-40 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden relative">
                      {paymentSettings.upiQrCodeUrl ? (
                        <>
                          <img 
                            src={paymentSettings.upiQrCodeUrl} 
                            alt="UPI QR Code" 
                            className="h-full w-full object-contain p-2"
                            data-testid="img-upi-qr"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => setPaymentSettings(prev => ({ ...prev, upiQrCodeUrl: "" }))}
                            data-testid="button-remove-qr"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <QrCode className="h-8 w-8 text-muted-foreground/50 mx-auto mb-1" />
                          <span className="text-xs text-muted-foreground">No QR uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={qrInputRef}
                        onChange={handleQrUpload}
                        className="hidden"
                        data-testid="input-qr-file"
                      />
                      <Button
                        variant="outline"
                        onClick={() => qrInputRef.current?.click()}
                        disabled={isUploadingQr}
                        data-testid="button-upload-qr"
                      >
                        {isUploadingQr ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {paymentSettings.upiQrCodeUrl ? "Change QR Code" : "Upload QR Code"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="upiId" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    UPI ID (Optional)
                  </Label>
                  <Input
                    id="upiId"
                    placeholder="yourname@upi or yourphone@bank"
                    value={paymentSettings.upiId}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, upiId: e.target.value }))}
                    data-testid="input-upi-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your UPI ID will be displayed alongside the QR code for manual entry
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dialab Tab */}
        {hasModule("dialab") && (
          <TabsContent value="dialab" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube2 className="h-5 w-5" />
                  Dialab Settings
                </CardTitle>
                <CardDescription>
                  Configure report branding for your diagnostic center
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reportHeader">Report Header</Label>
                  <Input
                    id="reportHeader"
                    value={reportSettings.reportHeader}
                    onChange={(e) => setReportSettings({ ...reportSettings, reportHeader: e.target.value })}
                    data-testid="input-report-header"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportFooter">Report Footer / Disclaimer</Label>
                  <Textarea
                    id="reportFooter"
                    value={reportSettings.reportFooter}
                    onChange={(e) => setReportSettings({ ...reportSettings, reportFooter: e.target.value })}
                    rows={3}
                    data-testid="input-report-footer"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI can suggest professional disclaimers for your reports
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Logo on Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Display your organization logo on printed reports
                      </p>
                    </div>
                    <Switch
                      checked={reportSettings.showLogo}
                      onCheckedChange={(checked) => setReportSettings({ ...reportSettings, showLogo: checked })}
                      data-testid="switch-show-logo"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show QR Code</Label>
                      <p className="text-sm text-muted-foreground">
                        Add a QR code for patients to access reports online
                      </p>
                    </div>
                    <Switch
                      checked={reportSettings.showQRCode}
                      onCheckedChange={(checked) => setReportSettings({ ...reportSettings, showQRCode: checked })}
                      data-testid="switch-show-qr-code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Doclab Tab */}
        {hasModule("doclab") && (
          <TabsContent value="doclab" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Doclab Settings
                </CardTitle>
                <CardDescription>
                  Configure consultation and OPD settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tokenPrefix">Token Prefix</Label>
                    <Input
                      id="tokenPrefix"
                      value={doclabSettings.tokenPrefix}
                      onChange={(e) => setDoclabSettings({ ...doclabSettings, tokenPrefix: e.target.value.toUpperCase() })}
                      className="w-32"
                      maxLength={5}
                      data-testid="input-token-prefix"
                    />
                    <p className="text-xs text-muted-foreground">
                      Tokens will be numbered as {doclabSettings.tokenPrefix}-001, {doclabSettings.tokenPrefix}-002, etc.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consultation fees are set individually for each doctor in the Doctors management page.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Medlab Tab */}
        {hasModule("medlab") && (
          <TabsContent value="medlab" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Medlab Settings
                </CardTitle>
                <CardDescription>
                  Configure pharmacy and inventory settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pharmacyName">Pharmacy Name</Label>
                  <Input
                    id="pharmacyName"
                    value={medlabSettings.pharmacyName}
                    onChange={(e) => setMedlabSettings({ ...medlabSettings, pharmacyName: e.target.value })}
                    placeholder="e.g., MedPlus Pharmacy"
                    data-testid="input-pharmacy-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name for your pharmacy on bills and receipts
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultMarkupPercent">Default Markup %</Label>
                    <Input
                      id="defaultMarkupPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={medlabSettings.defaultMarkupPercent}
                      onChange={(e) => setMedlabSettings({ ...medlabSettings, defaultMarkupPercent: e.target.value })}
                      data-testid="input-default-markup-percent"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default markup percentage applied to medicine cost price
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      min="0"
                      value={medlabSettings.lowStockThreshold}
                      onChange={(e) => setMedlabSettings({ ...medlabSettings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                      data-testid="input-low-stock-threshold"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when stock quantity falls below this number
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Communication Channels</CardTitle>
              <CardDescription>
                Configure how you communicate with patients
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send bills and reports via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.whatsappEnabled}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, whatsappEnabled: checked })}
                  data-testid="switch-whatsapp"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send bills and reports via email
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailEnabled: checked })}
                  data-testid="switch-email"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via SMS
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.smsEnabled}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, smsEnabled: checked })}
                  data-testid="switch-sms"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-send Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically send reports when ready
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.autoSendReports}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, autoSendReports: checked })}
                  data-testid="switch-auto-send"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts when inventory is low
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.lowStockAlerts}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, lowStockAlerts: checked })}
                  data-testid="switch-low-stock-alerts"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Theme & Display</CardTitle>
              <CardDescription>
                Customize the look and feel of your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Use the theme toggle in the header to switch between light and dark modes.
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Dashboard Colors</Label>
                <p className="text-sm text-muted-foreground">
                  The application uses a professional teal color scheme suited for healthcare applications.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <div className="h-10 w-10 rounded-lg bg-primary" title="Primary" />
                  <div className="h-10 w-10 rounded-lg bg-primary/80" title="Primary 80%" />
                  <div className="h-10 w-10 rounded-lg bg-primary/60" title="Primary 60%" />
                  <div className="h-10 w-10 rounded-lg bg-primary/40" title="Primary 40%" />
                  <div className="h-10 w-10 rounded-lg bg-primary/20" title="Primary 20%" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report & Bill Branding</CardTitle>
              <CardDescription>
                Customize colors for your printed reports and bills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <p className="text-xs text-muted-foreground">Used for headers and titles</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primaryColor"
                      value={brandingSettings.primaryColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="h-10 w-14 rounded border cursor-pointer"
                      data-testid="input-primary-color"
                    />
                    <Input
                      value={brandingSettings.primaryColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1 font-mono text-sm"
                      placeholder="#2DD4BF"
                      data-testid="input-primary-color-text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <p className="text-xs text-muted-foreground">Used for accents and highlights</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="accentColor"
                      value={brandingSettings.accentColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="h-10 w-14 rounded border cursor-pointer"
                      data-testid="input-accent-color"
                    />
                    <Input
                      value={brandingSettings.accentColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="flex-1 font-mono text-sm"
                      placeholder="#0F766E"
                      data-testid="input-accent-color-text"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headerColor">Header Color</Label>
                  <p className="text-xs text-muted-foreground">Used for report header background</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="headerColor"
                      value={brandingSettings.headerColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                      className="h-10 w-14 rounded border cursor-pointer"
                      data-testid="input-header-color"
                    />
                    <Input
                      value={brandingSettings.headerColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                      className="flex-1 font-mono text-sm"
                      placeholder="#0D9488"
                      data-testid="input-header-color-text"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Preview</Label>
                <div 
                  className="rounded-lg border p-4 space-y-3"
                  style={{ backgroundColor: brandingSettings.headerColor + "15" }}
                  data-testid="preview-branding"
                >
                  <div 
                    className="rounded-md p-3 text-white text-center font-semibold"
                    style={{ backgroundColor: brandingSettings.headerColor }}
                  >
                    {organization?.name || "Your Healthcare Center"}
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: brandingSettings.primaryColor }}
                    />
                    <span className="text-sm" style={{ color: brandingSettings.primaryColor }}>
                      Sample Test Name
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: brandingSettings.accentColor }}>
                    Reference Range: Normal
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Puzzle className="h-5 w-5" />
                Module Management
              </CardTitle>
              <CardDescription>
                Enable or disable modules for your organization. At least one module must remain active.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MODULE_INFO.map((mod) => {
                const isActive = hasModule(mod.id);
                const IconComponent = mod.icon;
                return (
                  <Card key={mod.id} data-testid={`card-module-${mod.id}`}>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium" data-testid={`text-module-name-${mod.id}`}>{mod.name}</span>
                            <Badge
                              variant={isActive ? "default" : "secondary"}
                              data-testid={`badge-module-status-${mod.id}`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5" data-testid={`text-module-desc-${mod.id}`}>
                            {mod.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => handleModuleToggle(mod.id, checked)}
                        disabled={moduleToggleMutation.isPending}
                        data-testid={`switch-module-${mod.id}`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending}
          data-testid="button-save-settings"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5" />
            Development Tools
          </CardTitle>
          <CardDescription>
            Tools for testing and development purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Seed Demo Data</Label>
              <p className="text-sm text-muted-foreground">
                Create sample patients, bills, samples, and reports for testing
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="button-seed-demo">
                  <Users className="h-4 w-4 mr-2" />
                  Seed Demo Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Seed Demo Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create sample patients, bills, samples, and test reports 
                    in your organization. Make sure you have seeded tests first (from the Tests page).
                    This is useful for testing the application features.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => seedDemoMutation.mutate()}
                    disabled={seedDemoMutation.isPending}
                    data-testid="button-confirm-seed-demo"
                  >
                    {seedDemoMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Seeding...
                      </>
                    ) : (
                      "Seed Data"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
