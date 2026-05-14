import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, ArrowRight, ArrowLeft, Loader2, TestTube2, Stethoscope, Pill, Check } from "lucide-react";
import logoSymbol from "@assets/diolab_-_logo_-_color_-_symbol_1769252295192.png";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Chandigarh", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

type ModuleId = "dialab" | "doclab" | "medlab";

const modules: { id: ModuleId; name: string; tagline: string; description: string; icon: typeof TestTube2 }[] = [
  {
    id: "dialab",
    name: "Dialab",
    tagline: "Diagnostic & Pathology",
    description: "Lab tests, sample tracking, report generation, billing, and online booking",
    icon: TestTube2,
  },
  {
    id: "doclab",
    name: "Doclab",
    tagline: "Out-Patient Consultations",
    description: "Departments, doctors, token queue, consultations, prescriptions, and patient portal",
    icon: Stethoscope,
  },
  {
    id: "medlab",
    name: "Medlab",
    tagline: "Pharmacy Management",
    description: "Medicine inventory, POS billing, barcode scanning, suppliers, and drug interactions",
    icon: Pill,
  },
];

const orgSchema = z.object({
  name: z.string().min(2, "Organization name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  invoicePrefix: z.string().optional(),
});

const moduleSettingsSchema = z.object({
  tokenPrefix: z.string().optional(),
  pharmacyName: z.string().optional(),
  defaultMarkupPercent: z.string().optional(),
  lowStockThreshold: z.string().optional(),
});

type OrgFormData = z.infer<typeof orgSchema>;
type ModuleSettingsData = z.infer<typeof moduleSettingsSchema>;

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([]);

  const orgForm = useForm<OrgFormData>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      gstNumber: "",
      panNumber: "",
      licenseNumber: "",
      invoicePrefix: "INV",
    },
  });

  const moduleForm = useForm<ModuleSettingsData>({
    resolver: zodResolver(moduleSettingsSchema),
    defaultValues: {
      tokenPrefix: "T",
      pharmacyName: "",
      defaultMarkupPercent: "15",
      lowStockThreshold: "10",
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: OrgFormData & ModuleSettingsData & { subscribedModules: string[] }) => {
      const response = await apiRequest("POST", "/api/organizations", data);
      return response.json();
    },
    onSuccess: () => {
      localStorage.removeItem("diolab-app-mode");
      queryClient.invalidateQueries({ queryKey: ["/api/organizations/my"] });
      toast({
        title: "Setup Complete",
        description: "Your healthcare center has been set up successfully!",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const toggleModule = (moduleId: ModuleId) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((m) => m !== moduleId) : [...prev, moduleId]
    );
  };

  const handleNext = async () => {
    if (step === 1) {
      if (selectedModules.length === 0) {
        toast({
          title: "Select at least one module",
          description: "Please choose which modules you'd like to use.",
          variant: "destructive",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const isValid = await orgForm.trigger();
      if (isValid) {
        const hasDoclab = selectedModules.includes("doclab");
        const hasMedlab = selectedModules.includes("medlab");
        if (hasDoclab || hasMedlab) {
          setStep(3);
        } else {
          handleSubmit();
        }
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const orgData = orgForm.getValues();
    const moduleData = moduleForm.getValues();
    const payload: any = {
      ...orgData,
      tokenPrefix: moduleData.tokenPrefix,
      pharmacyName: moduleData.pharmacyName,
      defaultMarkupPercent: moduleData.defaultMarkupPercent,
      lowStockThreshold: moduleData.lowStockThreshold ? parseInt(moduleData.lowStockThreshold, 10) || 10 : 10,
      subscribedModules: selectedModules,
    };
    createOrgMutation.mutate(payload);
  };

  const hasDoclab = selectedModules.includes("doclab");
  const hasMedlab = selectedModules.includes("medlab");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => window.location.href = '/home'}
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logoSymbol} alt="Diolab" className="h-12 w-12 object-contain" />
            <span className="text-2xl font-bold">Diolab</span>
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-onboarding-title">Set Up Your Healthcare Center</h1>
          <p className="text-muted-foreground">
            {step === 1 && "Choose which modules you'd like to use"}
            {step === 2 && "Enter your organization details"}
            {step === 3 && "Configure your module settings"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8" data-testid="stepper-progress">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s < step
                    ? "bg-primary text-primary-foreground"
                    : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`h-0.5 w-12 ${s < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4" data-testid="step-module-selection">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Select Your Modules
                </CardTitle>
                <CardDescription>
                  Choose which parts of Diolab you want to set up. You can add more modules later from Settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {modules.map((mod) => {
                  const isSelected = selectedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover-elevate"
                      }`}
                      data-testid={`button-module-${mod.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-primary/10" : "bg-muted"
                        }`}>
                          <mod.icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold" data-testid={`text-module-name-${mod.id}`}>{mod.name}</span>
                            <span className="text-xs text-muted-foreground">{mod.tagline}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                onClick={handleNext}
                disabled={selectedModules.length === 0}
                data-testid="button-next-step"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4" data-testid="step-org-details">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Organization Details
                </CardTitle>
                <CardDescription>
                  Enter your healthcare center information. You can update these details later.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...orgForm}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={orgForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Healthcare Center Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., City Healthcare Center" {...field} data-testid="input-org-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={orgForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 98765 43210" {...field} data-testid="input-org-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={orgForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contact@yourlabs.in" {...field} data-testid="input-org-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={orgForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Full address" {...field} data-testid="input-org-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={orgForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input placeholder="Mumbai" {...field} data-testid="input-org-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={orgForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-org-state">
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {indianStates.map((state) => (
                                  <SelectItem key={state} value={state}>
                                    {state}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={orgForm.control}
                        name="pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode</FormLabel>
                            <FormControl>
                              <Input placeholder="400001" {...field} data-testid="input-org-pincode" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={orgForm.control}
                        name="invoicePrefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Prefix</FormLabel>
                            <FormControl>
                              <Input placeholder="INV" {...field} data-testid="input-org-invoice-prefix" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="border-t pt-6">
                      <h3 className="font-medium mb-4">Tax & Registration (Optional)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={orgForm.control}
                          name="gstNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GST Number</FormLabel>
                              <FormControl>
                                <Input placeholder="27AABCD1234E1Z5" {...field} data-testid="input-org-gst" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={orgForm.control}
                          name="panNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PAN Number</FormLabel>
                              <FormControl>
                                <Input placeholder="ABCDE1234F" {...field} data-testid="input-org-pan" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={orgForm.control}
                          name="licenseNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Number</FormLabel>
                              <FormControl>
                                <Input placeholder="License number" {...field} data-testid="input-org-license" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </Form>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="lg" onClick={handleBack} data-testid="button-prev-step">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button size="lg" onClick={handleNext} data-testid="button-next-step">
                {hasDoclab || hasMedlab ? "Next" : "Complete Setup"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4" data-testid="step-module-settings">
            <Form {...moduleForm}>
              <div className="space-y-4">
                {hasDoclab && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-primary" />
                        Doclab Settings
                      </CardTitle>
                      <CardDescription>
                        Configure your out-patient consultation module
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={moduleForm.control}
                          name="tokenPrefix"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Token Prefix</FormLabel>
                              <FormControl>
                                <Input placeholder="T" maxLength={5} {...field} data-testid="input-token-prefix" />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">Prefix for patient token numbers (e.g., T-001)</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {hasMedlab && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Pill className="h-5 w-5 text-primary" />
                        Medlab Settings
                      </CardTitle>
                      <CardDescription>
                        Configure your pharmacy management module
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={moduleForm.control}
                          name="pharmacyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pharmacy Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., MediCare Pharmacy" {...field} data-testid="input-pharmacy-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={moduleForm.control}
                          name="defaultMarkupPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default Markup %</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="15" {...field} data-testid="input-markup-percent" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={moduleForm.control}
                          name="lowStockThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Low Stock Alert Threshold</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="10" {...field} data-testid="input-stock-threshold" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </Form>

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="lg" onClick={handleBack} data-testid="button-prev-step">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={createOrgMutation.isPending}
                data-testid="button-complete-setup"
              >
                {createOrgMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
