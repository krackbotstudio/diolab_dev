import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppMode } from "@/contexts/app-mode-context";
import { ViewSwitcher, useViewMode, InlineEditCell } from "@/components/view-switcher";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  Plus,
  Phone,
  Calendar,
  User,
  Loader2,
  Sparkles,
  Pencil,
  Filter,
  ArrowUpDown,
  MessageSquare,
  Send,
  X,
  ChevronDown,
  ArrowRightLeft,
  MoreHorizontal,
  Stethoscope,
  Info,
  ClipboardList,
} from "lucide-react";
import { Link } from "wouter";
import type { Patient, Doctor, Department, OpVisit } from "@shared/schema";

type SortField = "name" | "phone" | "createdAt" | "patientId";
type SortOrder = "asc" | "desc";

const emptyFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  bloodGroup: "",
};

function patientToFormData(patient: Patient) {
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    phone: patient.phone,
    email: patient.email || "",
    dateOfBirth: patient.dateOfBirth || "",
    gender: patient.gender || "",
    address: patient.address || "",
    bloodGroup: patient.bloodGroup || "",
  };
}

export default function Patients() {
  const { toast } = useToast();
  const { mode } = useAppMode();
  const [viewMode, setViewMode] = useViewMode("patients");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMarketingDialogOpen, setIsMarketingDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [marketingMessage, setMarketingMessage] = useState("");
  
  // Create OP Visit states
  const [isCreateOpDialogOpen, setIsCreateOpDialogOpen] = useState(false);
  const [opPatient, setOpPatient] = useState<Patient | null>(null);
  const [opForm, setOpForm] = useState({
    doctorId: "",
    departmentId: "",
    symptoms: "",
    visitType: "new" as "new" | "follow_up",
  });

  // Filter states
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterBloodGroup, setFilterBloodGroup] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort states
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch patients filtered by current app mode (auto-poll every 10s for real-time updates)
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients", { module: mode }],
    queryFn: async () => {
      const res = await fetch(`/api/patients?module=${mode}`);
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  // Fetch organization for OP visit creation
  const { data: orgData } = useQuery<{ organization: { id: string } }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  // Fetch doctors for OP visit creation (hospitals mode)
  const { data: opDoctors = [] } = useQuery<Doctor[]>({
    queryKey: ["/api/op-pos/doctors", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/doctors?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    },
    enabled: !!organization?.id && mode === "hospitals",
  });

  // Fetch departments for OP visit creation (hospitals mode)
  const { data: opDepartments = [] } = useQuery<Department[]>({
    queryKey: ["/api/op-pos/departments", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/departments?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json();
    },
    enabled: !!organization?.id && mode === "hospitals",
  });

  // Fetch last visit for selected patient
  const { data: lastVisitData } = useQuery<OpVisit | null>({
    queryKey: ["/api/op-pos/patient-last-visit", opPatient?.id, organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/op-pos/patient-last-visit?patientId=${opPatient?.id}&organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch last visit");
      const data = await res.json();
      return data;
    },
    enabled: !!opPatient?.id && !!organization?.id,
  });

  // Mutation to push patient to other module
  const pushToModuleMutation = useMutation({
    mutationFn: async ({ patientId, targetModule }: { patientId: string; targetModule: string }) => {
      return apiRequest("PATCH", `/api/patients/${patientId}`, { module: targetModule });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Success",
        description: "Patient is now available in both modules.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update patient module.",
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { module?: string }) => {
      return apiRequest("POST", "/api/patients", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setIsDialogOpen(false);
      setFormData(emptyFormData);
      toast({
        title: "Patient registered",
        description: "New patient has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to register patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return apiRequest("PATCH", `/api/patients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setIsEditDialogOpen(false);
      setEditingPatient(null);
      setFormData(emptyFormData);
      toast({
        title: "Patient updated",
        description: "Patient details have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update patient. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create OP Visit mutation
  const createOpVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/op-pos/op-visits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/op-pos/op-visits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setIsCreateOpDialogOpen(false);
      setOpPatient(null);
      setOpForm({ doctorId: "", departmentId: "", symptoms: "", visitType: "new" });
      toast({
        title: "OP Visit Created",
        description: "The patient has been added to the queue.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create OP visit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openCreateOpDialog = (patient: Patient) => {
    setOpPatient(patient);
    setOpForm({ doctorId: "", departmentId: "", symptoms: "", visitType: "new" });
    setIsCreateOpDialogOpen(true);
  };

  // Auto-set follow_up based on last visit
  const lastVisitDaysAgo = useMemo(() => {
    if (!lastVisitData?.createdAt) return null;
    const lastDate = new Date(lastVisitData.createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [lastVisitData]);

  // Auto-fill department from selected doctor
  const selectedDoctor = useMemo(() => {
    return opDoctors.find(d => d.id === opForm.doctorId);
  }, [opDoctors, opForm.doctorId]);

  useEffect(() => {
    if (lastVisitDaysAgo !== null && lastVisitDaysAgo <= 15 && isCreateOpDialogOpen) {
      setOpForm(prev => ({ ...prev, visitType: "follow_up" }));
    }
  }, [lastVisitDaysAgo, isCreateOpDialogOpen]);

  useEffect(() => {
    if (selectedDoctor?.departmentId) {
      setOpForm(prev => ({ ...prev, departmentId: selectedDoctor.departmentId ?? "" }));
    }
  }, [selectedDoctor]);

  const handleCreateOpVisit = () => {
    if (!opPatient || !organization?.id || !opForm.doctorId) {
      toast({
        title: "Missing fields",
        description: "Please select a doctor.",
        variant: "destructive",
      });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    createOpVisitMutation.mutate({
      patientId: opPatient.id,
      organizationId: organization.id,
      doctorId: opForm.doctorId,
      departmentId: opForm.departmentId || null,
      symptoms: opForm.symptoms || null,
      visitType: opForm.visitType,
      tokenDate: today,
      status: "waiting",
    });
  };

  // Filter and sort patients
  const filteredAndSortedPatients = useMemo(() => {
    let result = patients.filter((patient) => {
      // Search filter
      const matchesSearch = 
        patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone.includes(searchQuery) ||
        patient.patientId.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Gender filter
      if (filterGender !== "all" && patient.gender !== filterGender) return false;
      
      // Blood group filter
      if (filterBloodGroup !== "all" && patient.bloodGroup !== filterBloodGroup) return false;
      
      // Date range filter
      if (filterDateFrom && patient.createdAt) {
        const patientDate = new Date(patient.createdAt);
        const fromDate = new Date(filterDateFrom);
        if (patientDate < fromDate) return false;
      }
      if (filterDateTo && patient.createdAt) {
        const patientDate = new Date(patient.createdAt);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (patientDate > toDate) return false;
      }
      
      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case "phone":
          comparison = a.phone.localeCompare(b.phone);
          break;
        case "createdAt":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case "patientId":
          comparison = a.patientId.localeCompare(b.patientId);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [patients, searchQuery, filterGender, filterBloodGroup, filterDateFrom, filterDateTo, sortField, sortOrder]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Include current app mode as the patient's module
    createMutation.mutate({ ...formData, module: mode });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, data: formData });
    }
  };

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email || "",
      dateOfBirth: patient.dateOfBirth || "",
      gender: patient.gender || "",
      address: patient.address || "",
      bloodGroup: patient.bloodGroup || "",
    });
    setIsEditDialogOpen(true);
  };

  const togglePatientSelection = (patientId: string) => {
    const newSelection = new Set(selectedPatients);
    if (newSelection.has(patientId)) {
      newSelection.delete(patientId);
    } else {
      newSelection.add(patientId);
    }
    setSelectedPatients(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedPatients.size === filteredAndSortedPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(filteredAndSortedPatients.map(p => p.id)));
    }
  };

  const handleSendMarketing = () => {
    if (!marketingMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a marketing message to send.",
        variant: "destructive",
      });
      return;
    }

    const selectedPatientsData = patients.filter(p => selectedPatients.has(p.id));
    
    toast({
      title: "Marketing message queued",
      description: `Message will be sent to ${selectedPatientsData.length} patient(s).`,
    });
    
    setIsMarketingDialogOpen(false);
    setMarketingMessage("");
    setSelectedPatients(new Set());
  };

  const clearFilters = () => {
    setFilterGender("all");
    setFilterBloodGroup("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters = filterGender !== "all" || filterBloodGroup !== "all" || filterDateFrom || filterDateTo;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderFormFields = (isEdit: boolean) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-firstName" : "firstName"}>First Name *</Label>
          <Input
            id={isEdit ? "edit-firstName" : "firstName"}
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            required
            data-testid={isEdit ? "input-edit-first-name" : "input-first-name"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-lastName" : "lastName"}>Last Name *</Label>
          <Input
            id={isEdit ? "edit-lastName" : "lastName"}
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            required
            data-testid={isEdit ? "input-edit-last-name" : "input-last-name"}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-phone" : "phone"}>Phone Number *</Label>
        <div className="relative">
          <Input
            id={isEdit ? "edit-phone" : "phone"}
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            required
            className="pr-10"
            data-testid={isEdit ? "input-edit-phone" : "input-phone"}
          />
          {!isEdit && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-primary/50" />
            </div>
          )}
        </div>
        {!isEdit && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI will auto-fill details for returning patients
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-email" : "email"}>Email</Label>
        <Input
          id={isEdit ? "edit-email" : "email"}
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          data-testid={isEdit ? "input-edit-email" : "input-email"}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-dateOfBirth" : "dateOfBirth"}>Date of Birth</Label>
          <Input
            id={isEdit ? "edit-dateOfBirth" : "dateOfBirth"}
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            data-testid={isEdit ? "input-edit-dob" : "input-dob"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-gender" : "gender"}>Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
          >
            <SelectTrigger data-testid={isEdit ? "select-edit-gender" : "select-gender"}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-bloodGroup" : "bloodGroup"}>Blood Group</Label>
          <Select
            value={formData.bloodGroup}
            onValueChange={(value) => setFormData(prev => ({ ...prev, bloodGroup: value }))}
          >
            <SelectTrigger data-testid={isEdit ? "select-edit-blood-group" : "select-blood-group"}>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-address" : "address"}>Address</Label>
          <Input
            id={isEdit ? "edit-address" : "address"}
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            data-testid={isEdit ? "input-edit-address" : "input-address"}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Patients</h1>
          <p className="text-muted-foreground">Manage patient records and history</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ViewSwitcher pageKey="patients" defaultView={viewMode} onChange={setViewMode} />
          {selectedPatients.size > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsMarketingDialogOpen(true)}
              data-testid="button-send-marketing"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send to {selectedPatients.size} selected
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-patient">
                <Plus className="h-4 w-4 mr-2" />
                Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Patient</DialogTitle>
                <DialogDescription>
                  Fill in the patient details. AI will auto-fill returning patients.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {renderFormFields(false)}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-patient">
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Register Patient
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or patient ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-patients"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" data-testid="button-sort">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleSort("name")}>
                    Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("phone")}>
                    Phone {sortField === "phone" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("createdAt")}>
                    Registered Date {sortField === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleSort("patientId")}>
                    Patient ID {sortField === "patientId" && (sortOrder === "asc" ? "↑" : "↓")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={filterGender} onValueChange={setFilterGender}>
                  <SelectTrigger data-testid="filter-gender">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Blood Group</Label>
                <Select value={filterBloodGroup} onValueChange={setFilterBloodGroup}>
                  <SelectTrigger data-testid="filter-blood-group">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Registered From</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  data-testid="filter-date-from"
                />
              </div>
              <div className="space-y-2">
                <Label>Registered To</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  data-testid="filter-date-to"
                />
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            All Patients ({filteredAndSortedPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredAndSortedPatients.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">No patients found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || hasActiveFilters ? "Try adjusting your filters" : "Add your first patient to get started"}
              </p>
            </div>
          ) : (
            <>
              {viewMode === "table" && (
                <div className="rounded-lg border overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedPatients.size === filteredAndSortedPatients.length && filteredAndSortedPatients.length > 0}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Blood Group</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead className="w-16">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedPatients.map((patient) => (
                        <TableRow key={patient.id} className="hover-elevate" data-testid={`row-patient-${patient.id}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedPatients.has(patient.id)}
                              onCheckedChange={() => togglePatientSelection(patient.id)}
                              data-testid={`checkbox-patient-${patient.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {patient.patientId}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-medium text-primary">
                                  {patient.firstName[0]}{patient.lastName[0]}
                                </span>
                              </div>
                              <InlineEditCell
                                value={`${patient.firstName} ${patient.lastName}`}
                                onSave={(val) => {
                                  const parts = val.trim().split(" ");
                                  updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] } });
                                }}
                                className="font-medium"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <InlineEditCell
                                value={patient.phone}
                                type="tel"
                                onSave={(val) => {
                                  updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), phone: val } });
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <InlineEditCell
                              value={patient.gender || ""}
                              placeholder="-"
                              className="capitalize"
                              onSave={(val) => {
                                updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), gender: val } });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <InlineEditCell
                              value={patient.bloodGroup || ""}
                              placeholder="-"
                              onSave={(val) => {
                                updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), bloodGroup: val } });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {patient.source === "online" ? (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                Online Booking
                              </Badge>
                            ) : patient.source === "phone" ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Phone
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Walk-in
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {patient.createdAt
                              ? new Date(patient.createdAt).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {mode === "hospitals" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCreateOpDialog(patient)}
                                  data-testid={`button-create-op-${patient.id}`}
                                >
                                  <Stethoscope className="h-3.5 w-3.5 mr-1" />
                                  Create OP
                                </Button>
                              )}
                              <Link href={`/patient-dashboard/${patient.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-view-dashboard-${patient.id}`}
                                >
                                  <ClipboardList className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(patient)}
                                data-testid={`button-edit-patient-${patient.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {patient.module !== "both" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" data-testid={`button-more-patient-${patient.id}`}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => pushToModuleMutation.mutate({ 
                                        patientId: patient.id, 
                                        targetModule: "both" 
                                      })}
                                      data-testid={`button-push-patient-${patient.id}`}
                                    >
                                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                                      Share with {mode === "hospitals" ? "Dialab" : "Doclab"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              {patient.module === "both" && (
                                <Badge variant="outline" className="text-xs">Both</Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedPatients.map((patient) => (
                    <Card key={patient.id} className="hover-elevate" data-testid={`card-patient-${patient.id}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-medium text-primary">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <InlineEditCell
                                value={`${patient.firstName} ${patient.lastName}`}
                                onSave={(val) => {
                                  const parts = val.trim().split(" ");
                                  updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] } });
                                }}
                                className="font-semibold text-foreground"
                              />
                              <Badge variant="outline" className="font-mono mt-1">
                                {patient.patientId}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {mode === "hospitals" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCreateOpDialog(patient)}
                                data-testid={`button-create-op-${patient.id}`}
                              >
                                <Stethoscope className="h-3.5 w-3.5 mr-1" />
                                Create OP
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(patient)}
                              data-testid={`button-edit-patient-${patient.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {patient.module !== "both" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-more-patient-${patient.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => pushToModuleMutation.mutate({ 
                                      patientId: patient.id, 
                                      targetModule: "both" 
                                    })}
                                    data-testid={`button-push-patient-${patient.id}`}
                                  >
                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                    Share with {mode === "hospitals" ? "Dialab" : "Doclab"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {patient.module === "both" && (
                              <Badge variant="outline" className="text-xs">Both</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <InlineEditCell
                            value={patient.phone}
                            type="tel"
                            onSave={(val) => {
                              updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), phone: val } });
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {patient.gender && (
                            <Badge variant="secondary" className="capitalize">{patient.gender}</Badge>
                          )}
                          {patient.bloodGroup && (
                            <Badge variant="secondary">{patient.bloodGroup}</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            {patient.source === "online" ? (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                Online Booking
                              </Badge>
                            ) : patient.source === "phone" ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                                Phone
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Walk-in
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {patient.createdAt
                              ? new Date(patient.createdAt).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {viewMode === "list" && (
                <div className="space-y-2">
                  {filteredAndSortedPatients.map((patient) => (
                    <div
                      key={patient.id}
                      className="p-3 rounded-lg bg-muted/50 hover-elevate flex items-center justify-between gap-3"
                      data-testid={`list-patient-${patient.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {patient.firstName[0]}{patient.lastName[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <InlineEditCell
                            value={`${patient.firstName} ${patient.lastName}`}
                            onSave={(val) => {
                              const parts = val.trim().split(" ");
                              updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), firstName: parts[0], lastName: parts.slice(1).join(" ") || parts[0] } });
                            }}
                            className="font-medium"
                          />
                          <Badge variant="outline" className="font-mono mt-0.5">
                            {patient.patientId}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap shrink-0">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <InlineEditCell
                            value={patient.phone}
                            type="tel"
                            onSave={(val) => {
                              updateMutation.mutate({ id: patient.id, data: { ...patientToFormData(patient), phone: val } });
                            }}
                          />
                        </div>
                        {patient.gender && (
                          <span className="text-sm text-muted-foreground capitalize">{patient.gender}</span>
                        )}
                        {patient.bloodGroup && (
                          <Badge variant="secondary">{patient.bloodGroup}</Badge>
                        )}
                        {patient.source === "online" ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                            Online Booking
                          </Badge>
                        ) : patient.source === "phone" ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Phone
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Walk-in
                          </Badge>
                        )}
                        <div className="flex items-center gap-1">
                          {mode === "hospitals" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCreateOpDialog(patient)}
                              data-testid={`button-create-op-${patient.id}`}
                            >
                              <Stethoscope className="h-3.5 w-3.5 mr-1" />
                              Create OP
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(patient)}
                            data-testid={`button-edit-patient-${patient.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {patient.module !== "both" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-more-patient-${patient.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => pushToModuleMutation.mutate({ 
                                    patientId: patient.id, 
                                    targetModule: "both" 
                                  })}
                                  data-testid={`button-push-patient-${patient.id}`}
                                >
                                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                                  Share with {mode === "hospitals" ? "Dialab" : "Doclab"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {patient.module === "both" && (
                            <Badge variant="outline" className="text-xs">Both</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
            <DialogDescription>
              Update patient details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            {renderFormFields(true)}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-patient">
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Marketing Message Dialog */}
      <Dialog open={isMarketingDialogOpen} onOpenChange={setIsMarketingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Marketing Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedPatients.size} selected patient(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="marketing-message">Message</Label>
              <Textarea
                id="marketing-message"
                placeholder="Enter your marketing message..."
                value={marketingMessage}
                onChange={(e) => setMarketingMessage(e.target.value)}
                rows={5}
                data-testid="textarea-marketing-message"
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent via SMS/WhatsApp to selected patients.
              </p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsMarketingDialogOpen(false)}
              data-testid="button-cancel-marketing"
            >
              Cancel
            </Button>
            <Button onClick={handleSendMarketing} data-testid="button-send-marketing-message">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create OP Visit Dialog */}
      <Dialog open={isCreateOpDialogOpen} onOpenChange={setIsCreateOpDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Create OP Visit
            </DialogTitle>
            <DialogDescription>
              {opPatient && (
                <span>Create an OP visit for {opPatient.firstName} {opPatient.lastName}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {lastVisitDaysAgo !== null && lastVisitDaysAgo <= 15 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  Last visit: {lastVisitDaysAgo} day{lastVisitDaysAgo !== 1 ? 's' : ''} ago. Defaulting to follow-up.
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Doctor *</Label>
              <Select
                value={opForm.doctorId}
                onValueChange={(value) => setOpForm(prev => ({ ...prev, doctorId: value }))}
              >
                <SelectTrigger data-testid="select-op-doctor">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {opDoctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      Dr. {doc.name}{doc.specialization ? ` - ${doc.specialization}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={opForm.departmentId}
                onValueChange={(value) => setOpForm(prev => ({ ...prev, departmentId: value }))}
              >
                <SelectTrigger data-testid="select-op-department">
                  <SelectValue placeholder="Auto-filled from doctor" />
                </SelectTrigger>
                <SelectContent>
                  {opDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Symptoms</Label>
              <Textarea
                placeholder="Enter symptoms (optional)"
                value={opForm.symptoms}
                onChange={(e) => setOpForm(prev => ({ ...prev, symptoms: e.target.value }))}
                rows={2}
                data-testid="input-op-symptoms"
              />
            </div>
            <div className="space-y-2">
              <Label>Visit Type</Label>
              <Select
                value={opForm.visitType}
                onValueChange={(value) => setOpForm(prev => ({ ...prev, visitType: value as "new" | "follow_up" }))}
              >
                <SelectTrigger data-testid="select-op-visit-type">
                  <SelectValue placeholder="Select visit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Visit</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateOpDialogOpen(false)}
              data-testid="button-cancel-op-visit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOpVisit}
              disabled={createOpVisitMutation.isPending}
              data-testid="button-submit-op-visit"
            >
              {createOpVisitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Stethoscope className="h-4 w-4 mr-2" />
              Create Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
