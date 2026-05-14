import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2 } from "lucide-react";

type StaffMember = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  organizationId?: string;
  organizationName?: string;
  moduleAccess?: string[];
  pagePermissions?: string[];
  isActive: boolean;
  createdAt: string;
};

const ROLES = ["all", "owner", "admin", "manager", "receptionist", "lab_technician", "pharmacist", "doctor", "accountant"];
const EDITABLE_ROLES = ["admin", "manager", "receptionist", "lab_technician", "pharmacist", "doctor", "accountant"];
const MODULES = ["dialab", "doclab", "medlab"];

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "owner":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "admin":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "manager":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "receptionist":
      return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
    case "lab_technician":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "pharmacist":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "doctor":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
    case "accountant":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "";
  }
}

function getModuleBadgeClass(mod: string) {
  switch (mod) {
    case "dialab":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "doclab":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "medlab":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "";
  }
}

function EditStaffDialog({
  member,
  isOpen,
  onClose,
}: {
  member: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState(member?.fullName || "");
  const [email, setEmail] = useState(member?.email || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [role, setRole] = useState(member?.role || "receptionist");
  const [moduleAccess, setModuleAccess] = useState<string[]>(member?.moduleAccess || []);
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: unknown) => {
      if (!member) return;
      const res = await apiRequest("PATCH", `/api/cms/staff/${member.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/staff"] });
      toast({ title: "Success", description: "Staff member updated successfully" });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update staff member",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const data: Record<string, unknown> = {};
    if (fullName !== member?.fullName) data.fullName = fullName;
    if (email !== member?.email) data.email = email;
    if (phone !== (member?.phone || "")) data.phone = phone;
    if (role !== member?.role) data.role = role;
    if (isActive !== member?.isActive) data.isActive = isActive;
    if (JSON.stringify(moduleAccess.sort()) !== JSON.stringify((member?.moduleAccess || []).sort())) {
      data.moduleAccess = moduleAccess;
    }

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    updateMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="staff-fullname">Full Name</Label>
            <Input
              id="staff-fullname"
              data-testid="input-staff-fullname"
              value={fullName}
              onChange={(e) => setFullName((e.target as HTMLInputElement).value)}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              data-testid="input-staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="Email"
            />
          </div>
          <div>
            <Label htmlFor="staff-phone">Phone</Label>
            <Input
              id="staff-phone"
              data-testid="input-staff-phone"
              value={phone}
              onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
              placeholder="Phone"
            />
          </div>
          <div>
            <Label htmlFor="staff-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="select-staff-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r} data-testid={`select-role-${r}`}>
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Module Access</Label>
            <div className="space-y-2">
              {MODULES.map((mod) => (
                <div key={mod} className="flex items-center gap-2">
                  <Checkbox
                    id={`staff-module-${mod}`}
                    data-testid={`checkbox-module-${mod}`}
                    checked={moduleAccess.includes(mod)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setModuleAccess([...moduleAccess, mod]);
                      } else {
                        setModuleAccess(moduleAccess.filter((m) => m !== mod));
                      }
                    }}
                  />
                  <Label htmlFor={`staff-module-${mod}`} className="capitalize cursor-pointer">
                    {mod}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="staff-active"
              data-testid="checkbox-staff-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label htmlFor="staff-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-dialog-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-dialog-save"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CMSStaff() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: staffList = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/cms/staff"],
  });

  const filteredStaff = useMemo(() => {
    return staffList.filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.fullName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q)
      );
    });
  }, [staffList, searchQuery, roleFilter]);

  const handleEditClick = (member: StaffMember) => {
    setSelectedMember(member);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedMember(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Staff Management
        </h1>
        <Badge variant="secondary" data-testid="badge-total-count">
          {staffList.length}
        </Badge>
      </div>

      <Card className="p-4">
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            className="max-w-sm"
            data-testid="input-search-staff"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48" data-testid="select-role-filter">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} data-testid={`select-filter-role-${r}`}>
                  {r === "all" ? "All Roles" : r.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Username</TableHead>
              <TableHead>Email / Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Module Access</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((member) => (
                <TableRow key={member.id} data-testid={`row-staff-${member.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium" data-testid={`text-staff-name-${member.id}`}>
                        {member.fullName || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-staff-username-${member.id}`}>
                        {member.username}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm" data-testid={`text-staff-email-${member.id}`}>
                        {member.email || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-staff-phone-${member.id}`}>
                        {member.phone || "-"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getRoleBadgeClass(member.role)}
                      data-testid={`badge-role-${member.id}`}
                    >
                      {member.role?.replace(/_/g, " ") || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-staff-org-${member.id}`}>
                    {member.organizationName || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap" data-testid={`modules-${member.id}`}>
                      {member.moduleAccess && member.moduleAccess.length > 0 ? (
                        member.moduleAccess.map((mod) => (
                          <Badge
                            key={mod}
                            variant="outline"
                            className={getModuleBadgeClass(mod)}
                            data-testid={`badge-module-${mod}-${member.id}`}
                          >
                            {mod}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.isActive ? "default" : "secondary"}
                      data-testid={`badge-status-${member.id}`}
                    >
                      {member.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditClick(member)}
                      data-testid={`button-edit-${member.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <EditStaffDialog member={selectedMember} isOpen={isDialogOpen} onClose={handleDialogClose} />
    </div>
  );
}
