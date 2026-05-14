import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, Settings, Activity } from "lucide-react";

type GlobalSettings = {
  maintenanceMode: boolean;
  defaultModules: string[];
  maxOrgsPerUser: number;
};

export default function CMSSettings() {
  const { data: settings, isLoading } = useQuery<GlobalSettings>({
    queryKey: ["/api/cms/settings/global"],
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        Global Settings
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900/40">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">Platform Info</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">App Name</span>
                  <span className="text-sm font-medium" data-testid="text-app-name">Diolab</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge variant="secondary" data-testid="badge-version">1.0.0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Environment</span>
                  <Badge variant="outline" data-testid="badge-environment">Production</Badge>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-orange-100 dark:bg-orange-900/40">
                  <Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold">Default Configuration</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Default Modules</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {settings?.defaultModules.map((mod) => (
                      <Badge key={mod} variant="secondary" data-testid={`badge-default-module-${mod}`}>
                        {mod}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max Orgs Per User</span>
                  <span className="text-sm font-medium" data-testid="text-max-orgs">{settings?.maxOrgsPerUser}</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/40">
                  <Activity className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold">System Status</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Maintenance Mode</span>
                  <Badge
                    variant={settings?.maintenanceMode ? "destructive" : "default"}
                    data-testid="badge-maintenance-mode"
                  >
                    {settings?.maintenanceMode ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <Badge variant="default" data-testid="badge-db-status">Connected</Badge>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
