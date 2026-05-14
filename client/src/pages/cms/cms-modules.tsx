import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Stethoscope, Pill } from "lucide-react";

type ModuleSummary = {
  dialab: { totalOrgs: number; totalActiveOrgs: number };
  doclab: { totalOrgs: number; totalActiveOrgs: number };
  medlab: { totalOrgs: number; totalActiveOrgs: number };
};

type Organization = {
  id: string;
  name: string;
  city?: string;
  subscribedModules?: string[];
};

const MODULE_CONFIG = [
  {
    key: "dialab",
    name: "Dialab",
    description: "Diagnostic Lab Tests",
    icon: FlaskConical,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/40",
  },
  {
    key: "doclab",
    name: "Doclab",
    description: "Hospital OP & Inpatient",
    icon: Stethoscope,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/40",
  },
  {
    key: "medlab",
    name: "Medlab",
    description: "Pharmacy Management",
    icon: Pill,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/40",
  },
] as const;

export default function CMSModules() {
  const { toast } = useToast();

  const { data: summary, isLoading: summaryLoading } = useQuery<ModuleSummary>({
    queryKey: ["/api/cms/modules/summary"],
  });

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/cms/organizations"],
  });

  const updateModulesMutation = useMutation({
    mutationFn: async ({ orgId, subscribedModules }: { orgId: string; subscribedModules: string[] }) => {
      const res = await apiRequest("PATCH", `/api/cms/modules/org/${orgId}`, { subscribedModules });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/modules/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cms/organizations"] });
      toast({ title: "Success", description: "Module subscription updated" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to update modules",
        variant: "destructive",
      });
    },
  });

  const handleModuleToggle = (org: Organization, moduleKey: string, checked: boolean) => {
    const current = org.subscribedModules || [];
    const updated = checked ? [...current, moduleKey] : current.filter((m) => m !== moduleKey);
    updateModulesMutation.mutate({ orgId: org.id, subscribedModules: updated });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        Module Control
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MODULE_CONFIG.map((mod) => (
          <Card key={mod.key} className="p-5">
            {summaryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-md ${mod.bg}`}>
                  <mod.icon className={`w-5 h-5 ${mod.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold" data-testid={`text-module-name-${mod.key}`}>
                    {mod.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" data-testid={`badge-module-orgs-${mod.key}`}>
                      {summary?.[mod.key as keyof ModuleSummary]?.totalOrgs ?? 0} subscribed
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-module-active-${mod.key}`}>
                      {summary?.[mod.key as keyof ModuleSummary]?.totalActiveOrgs ?? 0} active
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead className="text-center">Dialab</TableHead>
              <TableHead className="text-center">Doclab</TableHead>
              <TableHead className="text-center">Medlab</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No organizations found
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.id} data-testid={`row-module-org-${org.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-org-name-${org.id}`}>{org.name}</div>
                    <div className="text-sm text-muted-foreground">{org.city || "-"}</div>
                  </TableCell>
                  {MODULE_CONFIG.map((mod) => (
                    <TableCell key={mod.key} className="text-center">
                      <Checkbox
                        data-testid={`checkbox-module-${mod.key}-${org.id}`}
                        checked={(org.subscribedModules || []).includes(mod.key)}
                        onCheckedChange={(checked) => handleModuleToggle(org, mod.key, !!checked)}
                        disabled={updateModulesMutation.isPending}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
