import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Staff } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search, Users, Shield, ShieldAlert } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

const MODULE_PAGES: Record<string, { key: string; label: string }[]> = {
  dialab: [
    { key: "dashboard", label: "Dashboard" },
    { key: "patients", label: "Patients" },
    { key: "tests", label: "Tests & Packages" },
    { key: "billing", label: "Billing" },
    { key: "samples-reports", label: "Samples & Reports" },
    { key: "bookings", label: "Bookings" },
    { key: "inventory", label: "Inventory" },
    { key: "analytics", label: "Analytics" },
    { key: "branches", label: "Branches" },
  ],
  doclab: [
    { key: "dashboard", label: "Dashboard" },
    { key: "patients", label: "Patients" },
    { key: "op-pos", label: "OP Reception" },
    { key: "doctor-console", label: "Doctor Console" },
    { key: "consultations", label: "Consultations" },
    { key: "admissions", label: "Admissions" },
    { key: "wards", label: "Wards" },
    { key: "beds", label: "Beds" },
    { key: "icu", label: "ICU Dashboard" },
    { key: "hospital-settings", label: "Hospital Setup" },
    { key: "analytics", label: "Analytics" },
  ],
  medlab: [
    { key: "dashboard", label: "Dashboard" },
    { key: "medicines", label: "Medicines" },
    { key: "medlab-sales", label: "Sales / POS" },
    { key: "pharmacy-orders", label: "Orders" },
    { key: "medlab-customers", label: "Customers" },
    { key: "suppliers", label: "Suppliers" },
    { key: "medlab-inventory", label: "Inventory" },
    { key: "analytics", label: "Analytics" },
  ],
};

const MODULE_LABELS: Record<string, string> = {
  dialab: "Dialab (Diagnostics)",
  doclab: "Doclab (Hospitals)",
  medlab: "Medlab (Pharmacy)",
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "receptionist", label: "Receptionist" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "doctor", label: "Doctor" },
  { value: "accountant", label: "Accountant" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  manager: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  receptionist: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  lab_technician: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  pharmacist: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  doctor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  accountant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

interface FormData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  moduleAccess: string[];
  pagePermissions: Record<string, string[]>;
  branchId: string;
  isActive: boolean;
}

const emptyForm: FormData = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  role: "receptionist",
  moduleAccess: [],
  pagePermissions: {},
  branchId: "",
  isActive: true,
};

export default function StaffManagement() {
  const { toast } = useToast();
  const { isOwner, role, isLoading: permissionsLoading } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { data: orgData } = useQuery<{ organization: any; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
  });

  if (!permissionsLoading && !isOwner && role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-center">You don't have permission to manage staff members. Please contact your administrator.</p>
      </div>
    );
  }

  const subscribedModules: string[] = orgData?.organization?.subscribedModules || ["dialab"];

  const moduleIdMap: Record<string, string> = {
    diagnostics: "dialab",
    hospitals: "doclab",
    medlab: "medlab",
  };

  const availableModuleIds = subscribedModules.map((m: string) => moduleIdMap[m] || m);

  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Staff created", description: "Staff member has been added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create staff member.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Staff updated", description: "Staff member has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update staff member.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff deactivated", description: "Staff member has been deactivated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to deactivate staff member.", variant: "destructive" });
    },
  });

  function resetForm() {
    setFormData(emptyForm);
    setEditingStaff(null);
  }

  function openCreateDialog() {
    resetForm();
    setIsDialogOpen(true);
  }

  function openEditDialog(staff: Staff) {
    setEditingStaff(staff);
    setFormData({
      fullName: staff.fullName,
      username: staff.username,
      email: staff.email,
      phone: staff.phone || "",
      password: "",
      role: staff.role,
      moduleAccess: staff.moduleAccess || [],
      pagePermissions: (staff.pagePermissions as Record<string, string[]>) || {},
      branchId: staff.branchId || "",
      isActive: staff.isActive ?? true,
    });
    setIsDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = {
      fullName: formData.fullName,
      username: formData.username,
      email: formData.email,
      phone: formData.phone || null,
      role: formData.role,
      moduleAccess: formData.moduleAccess,
      pagePermissions: formData.pagePermissions,
      branchId: formData.branchId || null,
      isActive: formData.isActive,
    };

    if (editingStaff) {
      if (formData.password) {
        payload.password = formData.password;
      }
      updateMutation.mutate({ id: editingStaff.id, data: payload });
    } else {
      payload.password = formData.password;
      createMutation.mutate(payload);
    }
  }

  function toggleModule(moduleId: string) {
    setFormData((prev) => {
      const isCurrentlySelected = prev.moduleAccess.includes(moduleId);
      const newModuleAccess = isCurrentlySelected
        ? prev.moduleAccess.filter((m) => m !== moduleId)
        : [...prev.moduleAccess, moduleId];

      const newPagePermissions = { ...prev.pagePermissions };
      if (isCurrentlySelected) {
        delete newPagePermissions[moduleId];
      }

      return { ...prev, moduleAccess: newModuleAccess, pagePermissions: newPagePermissions };
    });
  }

  function togglePage(moduleId: string, pageKey: string) {
    setFormData((prev) => {
      const currentPages = prev.pagePermissions[moduleId] || [];
      const newPages = currentPages.includes(pageKey)
        ? currentPages.filter((p) => p !== pageKey)
        : [...currentPages, pageKey];

      return {
        ...prev,
        pagePermissions: { ...prev.pagePermissions, [moduleId]: newPages },
      };
    });
  }

  function toggleAllPages(moduleId: string) {
    setFormData((prev) => {
      const allPageKeys = MODULE_PAGES[moduleId]?.map((p) => p.key) || [];
      const currentPages = prev.pagePermissions[moduleId] || [];
      const allSelected = allPageKeys.every((k) => currentPages.includes(k));
      const newPages = allSelected ? [] : [...allPageKeys];

      return {
        ...prev,
        pagePermissions: { ...prev.pagePermissions, [moduleId]: newPages },
      };
    });
  }

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    );
  });

  const isFormValid =
    formData.fullName.length > 0 &&
    formData.username.length > 0 &&
    formData.email.length > 0 &&
    formData.role.length > 0 &&
    (editingStaff || formData.password.length >= 4);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Staff Management</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-description">
              Manage team members and their access permissions
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-add-staff">
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>{staffList.length} staff member{staffList.length !== 1 ? "s" : ""}</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-staff"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading staff...</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {searchQuery ? "No staff members match your search" : "No staff members yet"}
              </p>
              {!searchQuery && (
                <Button variant="outline" onClick={openCreateDialog} data-testid="button-add-staff-empty">
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first staff member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-staff-list">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Modules</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id} data-testid={`row-staff-${member.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-staff-name-${member.id}`}>{member.fullName}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-staff-username-${member.id}`}>{member.username}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={ROLE_COLORS[member.role] || ""}
                          data-testid={`badge-staff-role-${member.id}`}
                        >
                          {ROLE_OPTIONS.find((r) => r.value === member.role)?.label || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(member.moduleAccess || []).map((mod: string) => (
                            <Badge key={mod} variant="outline" className="text-xs" data-testid={`badge-module-${member.id}-${mod}`}>
                              {mod}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.isActive ? "default" : "secondary"}
                          className={member.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : ""}
                          data-testid={`badge-staff-status-${member.id}`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(member)}
                            data-testid={`button-edit-staff-${member.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(member.id)}
                            data-testid={`button-delete-staff-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff details and permissions" : "Create a new staff member with role and access control"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Enter full name"
                  data-testid="input-staff-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  data-testid="input-staff-username"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                  data-testid="input-staff-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone"
                  data-testid="input-staff-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingStaff ? "(leave empty to keep)" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingStaff ? "Leave empty to keep current" : "Minimum 4 characters"}
                  data-testid="input-staff-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger data-testid="select-staff-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} data-testid={`option-role-${r.value}`}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Module Access</Label>
              <div className="flex gap-4 flex-wrap">
                {availableModuleIds.map((moduleId) => (
                  <label key={moduleId} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={formData.moduleAccess.includes(moduleId)}
                      onCheckedChange={() => toggleModule(moduleId)}
                      data-testid={`checkbox-module-${moduleId}`}
                    />
                    <span className="text-sm">{MODULE_LABELS[moduleId] || moduleId}</span>
                  </label>
                ))}
              </div>
            </div>

            {formData.moduleAccess.length > 0 && (
              <div className="space-y-4">
                <Label>Page Permissions</Label>
                {formData.moduleAccess.map((moduleId) => {
                  const pages = MODULE_PAGES[moduleId] || [];
                  const currentPages = formData.pagePermissions[moduleId] || [];
                  const allSelected = pages.every((p) => currentPages.includes(p.key));
                  return (
                    <Card key={moduleId}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">{MODULE_LABELS[moduleId] || moduleId}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => toggleAllPages(moduleId)}
                              data-testid={`checkbox-select-all-${moduleId}`}
                            />
                            <span className="text-xs text-muted-foreground">Select All</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {pages.map((page) => (
                            <label key={page.key} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={currentPages.includes(page.key)}
                                onCheckedChange={() => togglePage(moduleId, page.key)}
                                data-testid={`checkbox-page-${moduleId}-${page.key}`}
                              />
                              <span className="text-sm">{page.label}</span>
                            </label>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-staff-active"
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                data-testid="button-cancel-staff"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-staff"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingStaff
                  ? "Update Staff"
                  : "Create Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
