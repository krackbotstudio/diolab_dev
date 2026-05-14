import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  UserCog,
  Heart,
  Receipt,
  FlaskConical,
  Pill,
  Stethoscope,
} from "lucide-react";

interface DashboardStats {
  totalOrganizations: number;
  totalUsers: number;
  totalStaff: number;
  totalPatients: number;
  totalBills: number;
  totalTests: number;
  totalMedicines: number;
  totalDoctors: number;
  activeModules: {
    dialab: number;
    doclab: number;
    medlab: number;
  };
}

interface ActivityEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: any;
  createdAt: string;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  isLoading,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  isLoading: boolean;
}) => (
  <Card data-testid={`card-stat-${label.replace(/\s+/g, "-").toLowerCase()}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <div className="text-2xl font-bold" data-testid={`value-${label.replace(/\s+/g, "-").toLowerCase()}`}>
          {value}
        </div>
      )}
    </CardContent>
  </Card>
);

const ModuleCard = ({
  title,
  count,
  isLoading,
}: {
  title: string;
  count: number;
  isLoading: boolean;
}) => (
  <Card data-testid={`card-module-${title.toLowerCase()}`}>
    <CardHeader className="pb-3">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <div className="text-3xl font-bold" data-testid={`value-module-${title.toLowerCase()}`}>
          {count}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-1">organizations subscribed</p>
    </CardContent>
  </Card>
);

export default function CMSDashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ["/api/cms/dashboard/stats"],
  });

  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery<ActivityEntry[]>({
    queryKey: ["/api/cms/dashboard/activity"],
  });

  if (statsError || activityError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-red-600 dark:text-red-400 mt-4">
          Error loading dashboard data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="cms-dashboard">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-dashboard">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Overview of your Diolab platform
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Key Statistics</h2>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="grid-stats"
        >
          <StatCard
            icon={Building2}
            label="Total Organizations"
            value={stats?.totalOrganizations || 0}
            isLoading={statsLoading}
          />
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats?.totalUsers || 0}
            isLoading={statsLoading}
          />
          <StatCard
            icon={UserCog}
            label="Total Staff"
            value={stats?.totalStaff || 0}
            isLoading={statsLoading}
          />
          <StatCard
            icon={Heart}
            label="Total Patients"
            value={stats?.totalPatients || 0}
            isLoading={statsLoading}
          />
          <StatCard
            icon={Receipt}
            label="Total Bills"
            value={stats?.totalBills || 0}
            isLoading={statsLoading}
          />
          <StatCard
            icon={FlaskConical}
            label="Total Tests"
            value={stats?.totalTests || 0}
            isLoading={statsLoading}
          />
          <StatCard
            icon={Pill}
            label="Total Medicines"
            value={stats?.totalMedicines || 0}
            isLoading={statsLoading}
          />
          <StatCard
            icon={Stethoscope}
            label="Total Doctors"
            value={stats?.totalDoctors || 0}
            isLoading={statsLoading}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Module Distribution</h2>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          data-testid="grid-modules"
        >
          <ModuleCard
            title="Dialab"
            count={stats?.activeModules.dialab || 0}
            isLoading={statsLoading}
          />
          <ModuleCard
            title="Doclab"
            count={stats?.activeModules.doclab || 0}
            isLoading={statsLoading}
          />
          <ModuleCard
            title="Medlab"
            count={stats?.activeModules.medlab || 0}
            isLoading={statsLoading}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card data-testid="card-activity">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Latest 20 Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-email">Admin Email</TableHead>
                      <TableHead data-testid="header-action">Action</TableHead>
                      <TableHead data-testid="header-target">Target Type</TableHead>
                      <TableHead data-testid="header-timestamp">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.slice(0, 20).map((entry) => (
                      <TableRow
                        key={entry.id}
                        data-testid={`row-activity-${entry.id}`}
                      >
                        <TableCell data-testid={`email-${entry.id}`}>
                          <Badge variant="secondary">{entry.adminEmail}</Badge>
                        </TableCell>
                        <TableCell data-testid={`action-${entry.id}`}>
                          {entry.action}
                        </TableCell>
                        <TableCell data-testid={`target-${entry.id}`}>
                          {entry.targetType}
                        </TableCell>
                        <TableCell data-testid={`timestamp-${entry.id}`}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground" data-testid="text-no-activity">
                  No activity yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
