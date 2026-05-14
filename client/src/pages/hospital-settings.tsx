import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ViewSwitcher, useViewMode, InlineEditCell } from "@/components/view-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Organization, Department, Doctor } from "@shared/schema";
import {
  Building2,
  Clock,
  Stethoscope,
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Phone,
  Mail,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface OrganizationResponse {
  organization: Organization | null;
  isOnboarded: boolean;
}

export default function HospitalSettings() {
  const { toast } = useToast();
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [doctorViewMode, setDoctorViewMode] = useViewMode("doctors");

  // Consultation duration stored per-doctor in localStorage (minutes)
  const [consultationDurations, setConsultationDurations] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("consultationDurations") || "{}"); } catch { return {}; }
  });
  const saveConsultationDuration = (doctorId: string, minutes: number) => {
    const updated = { ...consultationDurations, [doctorId]: minutes };
    setConsultationDurations(updated);
    localStorage.setItem("consultationDurations", JSON.stringify(updated));
    toast({ title: "Saved", description: `Consultation duration set to ${minutes} min` });
  };

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    consultationFee: "500",
    isActive: true,
  });

  const [doctorForm, setDoctorForm] = useState({
    name: "",
    specialization: "",
    qualification: "",
    phone: "",
    email: "",
    departmentId: "",
    consultationFee: "500",
    isAvailable: true,
    isActive: true,
  });

  const { data: orgData, isLoading: orgLoading } = useQuery<OrganizationResponse>({
    queryKey: ["/api/organizations/my"],
  });

  const organization = orgData?.organization;

  const { data: departments = [], isLoading: deptLoading } = useQuery<Department[]>({
    queryKey: ["/api/op-pos/departments", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/departments?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json();
    },
  });

  const { data: doctors = [], isLoading: docLoading } = useQuery<Doctor[]>({
    queryKey: ["/api/op-pos/doctors", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/doctors?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: typeof departmentForm) => {
      const res = await apiRequest("POST", "/api/op-pos/departments", {
        ...data,
        organizationId: organization?.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/departments"] });
      setDepartmentDialogOpen(false);
      resetDepartmentForm();
      toast({ title: "Department created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create department", description: error.message, variant: "destructive" });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof departmentForm }) => {
      const res = await apiRequest("PATCH", `/api/op-pos/departments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/departments"] });
      setDepartmentDialogOpen(false);
      setEditingDepartment(null);
      resetDepartmentForm();
      toast({ title: "Department updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update department", description: error.message, variant: "destructive" });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/op-pos/departments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/departments"] });
      toast({ title: "Department deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete department", description: error.message, variant: "destructive" });
    },
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (data: typeof doctorForm) => {
      const res = await apiRequest("POST", "/api/op-pos/doctors", {
        ...data,
        organizationId: organization?.id,
        departmentId: data.departmentId && data.departmentId !== "none" ? data.departmentId : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/doctors"] });
      setDoctorDialogOpen(false);
      resetDoctorForm();
      toast({ title: "Doctor created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create doctor", description: error.message, variant: "destructive" });
    },
  });

  const updateDoctorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof doctorForm }) => {
      const res = await apiRequest("PATCH", `/api/op-pos/doctors/${id}`, {
        ...data,
        departmentId: data.departmentId && data.departmentId !== "none" ? data.departmentId : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/doctors"] });
      setDoctorDialogOpen(false);
      setEditingDoctor(null);
      resetDoctorForm();
      toast({ title: "Doctor updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update doctor", description: error.message, variant: "destructive" });
    },
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/op-pos/doctors/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/doctors"] });
      toast({ title: "Doctor deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete doctor", description: error.message, variant: "destructive" });
    },
  });

  const inlineUpdateDoctorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/op-pos/doctors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/doctors"] });
      toast({ title: "Doctor updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update doctor", description: error.message, variant: "destructive" });
    },
  });

  const handleInlineDoctorUpdate = (doc: Doctor, field: string, value: string) => {
    inlineUpdateDoctorMutation.mutate({ id: doc.id, data: { [field]: value } });
  };

  const resetDepartmentForm = () => {
    setDepartmentForm({
      name: "",
      description: "",
      consultationFee: "500",
      isActive: true,
    });
  };

  const resetDoctorForm = () => {
    setDoctorForm({
      name: "",
      specialization: "",
      qualification: "",
      phone: "",
      email: "",
      departmentId: "",
      consultationFee: "500",
      isAvailable: true,
      isActive: true,
    });
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentForm({
      name: dept.name,
      description: dept.description || "",
      consultationFee: dept.consultationFee || "500",
      isActive: dept.isActive ?? true,
    });
    setDepartmentDialogOpen(true);
  };

  const handleEditDoctor = (doc: Doctor) => {
    setEditingDoctor(doc);
    setDoctorForm({
      name: doc.name,
      specialization: doc.specialization || "",
      qualification: doc.qualification || "",
      phone: doc.phone || "",
      email: doc.email || "",
      departmentId: doc.departmentId || "",
      consultationFee: doc.consultationFee || "500",
      isAvailable: doc.isAvailable ?? true,
      isActive: doc.isActive ?? true,
    });
    setDoctorDialogOpen(true);
  };

  const handleDepartmentSubmit = () => {
    if (editingDepartment) {
      updateDepartmentMutation.mutate({ id: editingDepartment.id, data: departmentForm });
    } else {
      createDepartmentMutation.mutate(departmentForm);
    }
  };

  const handleDoctorSubmit = () => {
    if (editingDoctor) {
      updateDoctorMutation.mutate({ id: editingDoctor.id, data: doctorForm });
    } else {
      createDoctorMutation.mutate(doctorForm);
    }
  };

  const bookingLink = organization?.id
    ? `${window.location.origin}/book/${organization.id}/consultation`
    : "";

  const copyBookingLink = () => {
    navigator.clipboard.writeText(bookingLink);
    toast({ title: "Link copied to clipboard" });
  };

  if (orgLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Please complete organization setup first.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">Hospital Settings</h1>
        <p className="text-muted-foreground">Configure departments, doctors, and online booking for your hospital</p>
      </div>

      <Tabs defaultValue="booking" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full lg:w-auto">
          <TabsTrigger value="booking" data-testid="tab-booking-settings">
            <ExternalLink className="h-4 w-4 mr-2" />
            Online Booking
          </TabsTrigger>
          <TabsTrigger value="consultation" data-testid="tab-consultation-settings">
            <Clock className="h-4 w-4 mr-2" />
            Consultation
          </TabsTrigger>
          <TabsTrigger value="departments" data-testid="tab-departments">
            <Building2 className="h-4 w-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="doctors" data-testid="tab-doctors">
            <Stethoscope className="h-4 w-4 mr-2" />
            Doctors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Online Consultation Booking</CardTitle>
              <CardDescription>
                Share this link with your patients to allow them to book consultations online
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Public Booking Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={bookingLink}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-booking-link"
                  />
                  <Button
                    variant="outline"
                    onClick={copyBookingLink}
                    data-testid="button-copy-booking-link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(bookingLink, "_blank")}
                    data-testid="button-open-booking-link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Patients can use this link to book appointments, view their queue status, and access their prescriptions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consultation Slot Duration</CardTitle>
              <CardDescription>
                Set the average time per patient per doctor. Used to calculate estimated wait times in the queue for both in-person and video consultations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docLoading ? (
                <Skeleton className="h-24" />
              ) : doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No doctors configured yet. Add doctors in the Doctors tab first.</p>
              ) : (
                <div className="space-y-3">
                  {doctors.filter(d => d.isActive).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">Dr. {doc.name}</p>
                        {doc.specialization && <p className="text-xs text-muted-foreground">{doc.specialization}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground">Slot</Label>
                        <Select
                          value={String(consultationDurations[doc.id] ?? 10)}
                          onValueChange={(v) => saveConsultationDuration(doc.id, parseInt(v))}
                        >
                          <SelectTrigger className="w-28" data-testid={`select-duration-${doc.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[5, 10, 15, 20, 30, 45, 60].map(m => (
                              <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">
                    These settings are saved locally. A future update will sync them across devices.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Departments</CardTitle>
                <CardDescription>
                  Manage hospital departments like Cardiology, Orthopedics, General Medicine, etc.
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingDepartment(null);
                  resetDepartmentForm();
                  setDepartmentDialogOpen(true);
                }}
                data-testid="button-add-department"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </CardHeader>
            <CardContent>
              {deptLoading ? (
                <Skeleton className="h-40" />
              ) : departments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No departments configured. Add departments to organize your doctors and services.
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Consultation Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.id} data-testid={`row-department-${dept.id}`}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-muted-foreground">{dept.description || "-"}</TableCell>
                        <TableCell>Rs. {Number(dept.consultationFee || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={dept.isActive ? "default" : "secondary"}>
                            {dept.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditDepartment(dept)}
                              data-testid={`button-edit-department-${dept.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-delete-department-${dept.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Department</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{dept.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDepartmentMutation.mutate(dept.id)}
                                    data-testid="button-confirm-delete-department"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-lg">Doctors</CardTitle>
                <CardDescription>
                  Manage doctors, their specializations, and availability for consultations
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ViewSwitcher pageKey="doctors" defaultView={doctorViewMode} onChange={setDoctorViewMode} />
                <Button
                  onClick={() => {
                    setEditingDoctor(null);
                    resetDoctorForm();
                    setDoctorDialogOpen(true);
                  }}
                  data-testid="button-add-doctor"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Doctor
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {docLoading ? (
                <Skeleton className="h-40" />
              ) : doctors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No doctors configured. Add doctors to enable consultations and appointments.
                </div>
              ) : doctorViewMode === "table" ? (
                <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Consultation Fee</TableHead>
                      <TableHead>Slot (min)</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors.map((doc) => {
                      const dept = departments.find((d) => d.id === doc.departmentId);
                      return (
                        <TableRow key={doc.id} data-testid={`row-doctor-${doc.id}`}>
                          <TableCell className="font-medium">
                            <div>
                              <InlineEditCell
                                value={doc.name}
                                onSave={(val) => handleInlineDoctorUpdate(doc, "name", val)}
                                placeholder="Doctor name"
                              />
                              {doc.qualification && (
                                <div className="text-sm text-muted-foreground">{doc.qualification}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <InlineEditCell
                              value={doc.specialization || ""}
                              onSave={(val) => handleInlineDoctorUpdate(doc, "specialization", val)}
                              placeholder="Specialization"
                            />
                          </TableCell>
                          <TableCell>{dept?.name || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Rs.</span>
                              <InlineEditCell
                                value={doc.consultationFee || "0"}
                                onSave={(val) => handleInlineDoctorUpdate(doc, "consultationFee", val)}
                                type="number"
                                placeholder="Fee"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                className="h-8 w-16 text-sm"
                                value={consultationDurations[doc.id] ?? 10}
                                min={5} max={60} step={5}
                                onChange={(e) => saveConsultationDuration(doc.id, parseInt(e.target.value) || 10)}
                                data-testid={`input-consult-duration-${doc.id}`}
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              {doc.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {doc.phone}
                                </span>
                              )}
                              {doc.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {doc.email}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant={doc.isAvailable ? "default" : "secondary"}>
                                {doc.isAvailable ? "Available" : "Unavailable"}
                              </Badge>
                              {!doc.isActive && (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditDoctor(doc)}
                                data-testid={`button-edit-doctor-${doc.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-delete-doctor-${doc.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete Dr. {doc.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteDoctorMutation.mutate(doc.id)}
                                      data-testid="button-confirm-delete-doctor"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              ) : doctorViewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctors.map((doc) => {
                    const dept = departments.find((d) => d.id === doc.departmentId);
                    return (
                      <Card key={doc.id} className="hover-elevate" data-testid={`card-doctor-${doc.id}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">
                                <InlineEditCell
                                  value={doc.name}
                                  onSave={(val) => handleInlineDoctorUpdate(doc, "name", val)}
                                  placeholder="Doctor name"
                                />
                              </div>
                              {doc.qualification && (
                                <div className="text-sm text-muted-foreground">{doc.qualification}</div>
                              )}
                            </div>
                            <Badge variant={doc.isAvailable ? "default" : "secondary"}>
                              {doc.isAvailable ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground shrink-0">Specialization:</span>
                              <InlineEditCell
                                value={doc.specialization || ""}
                                onSave={(val) => handleInlineDoctorUpdate(doc, "specialization", val)}
                                placeholder="Set specialization"
                              />
                            </div>
                            {dept && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground shrink-0">Department:</span>
                                <Badge variant="outline">{dept.name}</Badge>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground shrink-0">Fee: Rs.</span>
                              <InlineEditCell
                                value={doc.consultationFee || "0"}
                                onSave={(val) => handleInlineDoctorUpdate(doc, "consultationFee", val)}
                                type="number"
                                placeholder="Fee"
                              />
                            </div>
                          </div>
                          {!doc.isActive && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditDoctor(doc)}
                              data-testid={`button-edit-doctor-${doc.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-delete-doctor-${doc.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete Dr. {doc.name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDoctorMutation.mutate(doc.id)}
                                    data-testid="button-confirm-delete-doctor"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {doctors.map((doc) => {
                    const dept = departments.find((d) => d.id === doc.departmentId);
                    return (
                      <div
                        key={doc.id}
                        className="bg-muted/50 hover-elevate rounded-lg p-3 flex items-center gap-3 flex-wrap"
                        data-testid={`list-doctor-${doc.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            <InlineEditCell
                              value={doc.name}
                              onSave={(val) => handleInlineDoctorUpdate(doc, "name", val)}
                              placeholder="Doctor name"
                            />
                          </div>
                          {doc.qualification && (
                            <span className="text-sm text-muted-foreground">{doc.qualification}</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <InlineEditCell
                            value={doc.specialization || ""}
                            onSave={(val) => handleInlineDoctorUpdate(doc, "specialization", val)}
                            placeholder="Specialization"
                          />
                        </div>
                        {dept && (
                          <Badge variant="outline">{dept.name}</Badge>
                        )}
                        <div className="text-sm flex items-center gap-1">
                          <span className="text-muted-foreground">Rs.</span>
                          <InlineEditCell
                            value={doc.consultationFee || "0"}
                            onSave={(val) => handleInlineDoctorUpdate(doc, "consultationFee", val)}
                            type="number"
                            placeholder="Fee"
                          />
                        </div>
                        <Badge variant={doc.isAvailable ? "default" : "secondary"}>
                          {doc.isAvailable ? "Available" : "Unavailable"}
                        </Badge>
                        {!doc.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDoctor(doc)}
                            data-testid={`button-edit-doctor-${doc.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-doctor-${doc.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete Dr. {doc.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDoctorMutation.mutate(doc.id)}
                                  data-testid="button-confirm-delete-doctor"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Edit Department" : "Add Department"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input
                placeholder="e.g., Cardiology, Orthopedics"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                data-testid="input-department-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the department"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                data-testid="input-department-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Default Consultation Fee (Rs.)</Label>
              <Input
                type="number"
                placeholder="500"
                value={departmentForm.consultationFee}
                onChange={(e) => setDepartmentForm({ ...departmentForm, consultationFee: e.target.value })}
                data-testid="input-department-fee"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={departmentForm.isActive}
                onCheckedChange={(checked) => setDepartmentForm({ ...departmentForm, isActive: checked })}
                data-testid="switch-department-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDepartmentSubmit}
              disabled={!departmentForm.name || createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
              data-testid="button-save-department"
            >
              {(createDepartmentMutation.isPending || updateDepartmentMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingDepartment ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={doctorDialogOpen} onOpenChange={setDoctorDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Doctor Name *</Label>
              <Input
                placeholder="Dr. John Smith"
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                data-testid="input-doctor-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input
                placeholder="e.g., Cardiologist, General Physician"
                value={doctorForm.specialization}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                data-testid="input-doctor-specialization"
              />
            </div>
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Input
                placeholder="e.g., MBBS, MD"
                value={doctorForm.qualification}
                onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                data-testid="input-doctor-qualification"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={doctorForm.departmentId}
                onValueChange={(value) => setDoctorForm({ ...doctorForm, departmentId: value })}
              >
                <SelectTrigger data-testid="select-doctor-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                placeholder="+91 9876543210"
                value={doctorForm.phone}
                onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                data-testid="input-doctor-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="doctor@hospital.com"
                value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                data-testid="input-doctor-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Consultation Fee (Rs.)</Label>
              <Input
                type="number"
                placeholder="500"
                value={doctorForm.consultationFee}
                onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })}
                data-testid="input-doctor-fee"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Available for Appointments</Label>
              <Switch
                checked={doctorForm.isAvailable}
                onCheckedChange={(checked) => setDoctorForm({ ...doctorForm, isAvailable: checked })}
                data-testid="switch-doctor-available"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={doctorForm.isActive}
                onCheckedChange={(checked) => setDoctorForm({ ...doctorForm, isActive: checked })}
                data-testid="switch-doctor-active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoctorDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDoctorSubmit}
              disabled={!doctorForm.name || createDoctorMutation.isPending || updateDoctorMutation.isPending}
              data-testid="button-save-doctor"
            >
              {(createDoctorMutation.isPending || updateDoctorMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingDoctor ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
