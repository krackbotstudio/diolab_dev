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
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2 } from "lucide-react";

type Organization = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  subscribedModules?: string[];
  isOnboarded: boolean;
  ownerId?: string;
  createdAt: string;
  staffCount: number;
  patientCount: number;
  billCount: number;
  primaryColor?: string;
};

function EditDialog({ org, isOpen, onClose }: { org: Organization | null; isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState(org?.name || "");
  const [email, setEmail] = useState(org?.email || "");
  const [phone, setPhone] = useState(org?.phone || "");
  const [city, setCity] = useState(org?.city || "");
  const [state, setState] = useState(org?.state || "");
  const [primaryColor, setPrimaryColor] = useState(org?.primaryColor || "#2DD4BF");
  const [modules, setModules] = useState<string[]>(org?.subscribedModules || []);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: unknown) => {
      if (!org) return;
      const res = await apiRequest("PATCH", `/api/cms/organizations/${org.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/organizations"] });
      toast({ title: "Success", description: "Organization updated successfully" });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  const modulesMutation = useMutation({
    mutationFn: async () => {
      if (!org) return;
      const res = await apiRequest("PATCH", `/api/cms/organizations/${org.id}/modules`, {
        subscribedModules: modules,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/organizations"] });
      toast({ title: "Success", description: "Modules updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update modules",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    const updateData: Record<string, unknown> = {};
    if (name !== org?.name) updateData.name = name;
    if (email !== org?.email) updateData.email = email;
    if (phone !== org?.phone) updateData.phone = phone;
    if (city !== org?.city) updateData.city = city;
    if (state !== org?.state) updateData.state = state;
    if (primaryColor !== org?.primaryColor) updateData.primaryColor = primaryColor;

    if (Object.keys(updateData).length > 0) {
      await updateMutation.mutateAsync(updateData);
    }

    const modulesChanged = JSON.stringify(modules.sort()) !== JSON.stringify((org?.subscribedModules || []).sort());
    if (modulesChanged) {
      await modulesMutation.mutateAsync();
    }

    if (Object.keys(updateData).length === 0 && !modulesChanged) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              data-testid="input-organization-name"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="Organization name"
            />
          </div>
          <div>
            <Label htmlFor="org-email">Email</Label>
            <Input
              id="org-email"
              data-testid="input-organization-email"
              type="email"
              value={email}
              onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="Email"
            />
          </div>
          <div>
            <Label htmlFor="org-phone">Phone</Label>
            <Input
              id="org-phone"
              data-testid="input-organization-phone"
              value={phone}
              onChange={(e) => setPhone((e.target as HTMLInputElement).value)}
              placeholder="Phone"
            />
          </div>
          <div>
            <Label htmlFor="org-city">City</Label>
            <Input
              id="org-city"
              data-testid="input-organization-city"
              value={city}
              onChange={(e) => setCity((e.target as HTMLInputElement).value)}
              placeholder="City"
            />
          </div>
          <div>
            <Label htmlFor="org-state">State</Label>
            <Input
              id="org-state"
              data-testid="input-organization-state"
              value={state}
              onChange={(e) => setState((e.target as HTMLInputElement).value)}
              placeholder="State"
            />
          </div>
          <div>
            <Label htmlFor="org-color">Primary Color</Label>
            <Input
              id="org-color"
              data-testid="input-organization-color"
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor((e.target as HTMLInputElement).value)}
              placeholder="#2DD4BF"
            />
          </div>
          <div className="space-y-2">
            <Label>Subscribed Modules</Label>
            <div className="space-y-2">
              {["dialab", "doclab", "medlab"].map((mod) => (
                <div key={mod} className="flex items-center gap-2">
                  <Checkbox
                    id={`module-${mod}`}
                    data-testid={`checkbox-module-${mod}`}
                    checked={modules.includes(mod)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setModules([...modules, mod]);
                      } else {
                        setModules(modules.filter((m) => m !== mod));
                      }
                    }}
                  />
                  <Label htmlFor={`module-${mod}`} className="capitalize cursor-pointer">
                    {mod}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-dialog-cancel">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || modulesMutation.isPending}
            data-testid="button-dialog-save"
          >
            {updateMutation.isPending || modulesMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CMSOrganizations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/cms/organizations"],
  });

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        org.name.toLowerCase().includes(searchLower) ||
        org.city?.toLowerCase().includes(searchLower) ||
        org.email?.toLowerCase().includes(searchLower)
      );
    });
  }, [organizations, searchQuery]);

  const handleEditClick = (org: Organization) => {
    setSelectedOrg(org);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedOrg(null);
  };

  const getModuleBadgeColor = (module: string) => {
    switch (module) {
      case "dialab":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "doclab":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medlab":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          Organizations
        </h1>
        <Badge variant="secondary" data-testid="badge-total-count">
          {organizations.length}
        </Badge>
      </div>

      <Card className="p-4">
        <Input
          placeholder="Search by name, city, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          className="max-w-sm"
          data-testid="input-search-organizations"
        />
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredOrganizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No organizations found
                </TableCell>
              </TableRow>
            ) : (
              filteredOrganizations.map((org) => (
                <TableRow key={org.id} data-testid={`row-organization-${org.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium" data-testid={`text-org-name-${org.id}`}>
                        {org.name}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-org-location-${org.id}`}>
                        {org.city}, {org.state}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm" data-testid={`text-org-email-${org.id}`}>
                        {org.email || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`text-org-phone-${org.id}`}>
                        {org.phone || "-"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap" data-testid={`modules-${org.id}`}>
                      {org.subscribedModules && org.subscribedModules.length > 0 ? (
                        org.subscribedModules.map((mod) => (
                          <Badge
                            key={mod}
                            variant="outline"
                            className={getModuleBadgeColor(mod)}
                            data-testid={`badge-module-${mod}-${org.id}`}
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
                    <div className="text-sm space-y-1" data-testid={`stats-${org.id}`}>
                      <div>Staff: {org.staffCount}</div>
                      <div>Patients: {org.patientCount}</div>
                      <div>Bills: {org.billCount}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={org.isOnboarded ? "default" : "secondary"}
                      data-testid={`badge-status-${org.id}`}
                    >
                      {org.isOnboarded ? "Onboarded" : "Not Onboarded"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditClick(org)}
                      data-testid={`button-edit-${org.id}`}
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

      <EditDialog org={selectedOrg} isOpen={isDialogOpen} onClose={handleDialogClose} />
    </div>
  );
}
