import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SEO from "@/components/SEO";
import {
  Users,
  Receipt,
  TestTube2,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  Clock,
  AlertCircle,
  FileText,
  Stethoscope,
  UserPlus,
  Building2,
  Activity,
  CalendarCheck,
  Timer,
} from "lucide-react";
import { Link } from "wouter";
import { useAppMode } from "@/contexts/app-mode-context";
import MedlabDashboardPage from "@/pages/medlab-dashboard";
import type { Bill, Patient } from "@shared/schema";

interface DiagnosticsStats {
  totalPatients: number;
  todayRevenue: number;
  todayBillCount: number;
  pendingSamples: number;
  lowStockAlerts: number;
  recentBills: Bill[];
  recentPatients: Patient[];
}

interface HospitalStats {
  totalPatients: number;
  todayVisits: number;
  waitingCount: number;
  inConsultationCount: number;
  completedCount: number;
  todayRevenue: number;
  totalDoctors: number;
  totalDepartments: number;
  recentVisits: Array<{
    id: string;
    tokenNumber: number;
    status: string;
    visitType: string;
    consultationFee: string | null;
    paymentStatus: string | null;
    paymentMode: string | null;
    createdAt: string;
    patient?: { firstName: string; lastName: string; phone: string };
    doctor?: { name: string; specialization: string };
    department?: { name: string };
  }>;
  departmentStats: Array<{
    id: string;
    name: string;
    visitCount: number;
    waitingCount: number;
  }>;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Paid</Badge>;
    case "partial":
      return <Badge variant="default" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Partial</Badge>;
    case "pending":
      return <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Pending</Badge>;
    case "processing":
      return <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">Processing</Badge>;
    case "collected":
      return <Badge variant="default" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">Collected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getVisitStatusBadge = (status: string) => {
  switch (status) {
    case "waiting":
      return <Badge variant="default" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Waiting</Badge>;
    case "in_consultation":
      return <Badge variant="default" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">In Consultation</Badge>;
    case "completed":
      return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Completed</Badge>;
    case "cancelled":
      return <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">Cancelled</Badge>;
    case "booked":
      return <Badge variant="default" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">Booked</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
  return `${Math.floor(diffMins / 1440)} days ago`;
}

function DiagnosticsDashboard() {
  const { data: stats, isLoading } = useQuery<DiagnosticsStats>({
    queryKey: ["/api/stats/dashboard"],
  });

  const { data: samples } = useQuery<any[]>({
    queryKey: ["/api/samples"],
  });

  const pendingSamples = samples?.filter(s => s.status === "collected" || s.status === "processing").slice(0, 4) || [];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      title: "Total Patients",
      value: stats?.totalPatients || 0,
      icon: Users,
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: IndianRupee,
    },
    {
      title: "Pending Samples",
      value: stats?.pendingSamples || 0,
      icon: TestTube2,
    },
    {
      title: "Today's Bills",
      value: stats?.todayBillCount || 0,
      icon: Receipt,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">Dialab Dashboard</h1>
        <p className="text-muted-foreground">Lab operations overview for today.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/billing">
          <Button data-testid="button-new-bill">
            <Receipt className="h-4 w-4 mr-2" />
            New Bill
          </Button>
        </Link>
        <Link href="/patients">
          <Button variant="outline" data-testid="button-register-patient">
            <Users className="h-4 w-4 mr-2" />
            Register Patient
          </Button>
        </Link>
        <Link href="/samples-reports?tab=reports">
          <Button variant="outline" data-testid="button-view-reports">
            <FileText className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                  <span className="text-2xl font-semibold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Today</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-medium">Recent Bills</CardTitle>
            <Link href="/billing">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="link-view-all-bills">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {stats?.recentBills && stats.recentBills.length > 0 ? (
                stats.recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                    data-testid={`bill-${bill.billNumber}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{(bill as any).patientName}</span>
                        <span className="text-xs text-muted-foreground">{bill.billNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-medium">{formatCurrency(Number(bill.totalAmount))}</span>
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(new Date(bill.createdAt || Date.now()))}</span>
                        </div>
                      </div>
                      {getStatusBadge(bill.paymentStatus || "pending")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent bills</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-medium">Sample Status</CardTitle>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="link-view-all-samples">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {pendingSamples.length > 0 ? (
                pendingSamples.map((sample: any) => (
                  <div
                    key={sample.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                    data-testid={`sample-${sample.sampleId}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent shrink-0">
                        <TestTube2 className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{sample.patientName}</span>
                        <span className="text-xs text-muted-foreground">{sample.testName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{sample.sampleId}</span>
                      {getStatusBadge(sample.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending samples</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.lowStockAlerts && stats.lowStockAlerts > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Low Stock Alert</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {stats.lowStockAlerts} inventory items are running low on stock. Check the inventory page for details.
                </p>
              </div>
              <Link href="/inventory">
                <Button variant="outline" size="sm" className="shrink-0" data-testid="button-check-inventory">
                  Check Inventory
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HospitalDashboard() {
  const { data: stats, isLoading } = useQuery<HospitalStats>({
    queryKey: ["/api/stats/hospital-dashboard"],
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      title: "Today's OP Visits",
      value: stats?.todayVisits || 0,
      icon: CalendarCheck,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Waiting in Queue",
      value: stats?.waitingCount || 0,
      icon: Timer,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "Consultations Done",
      value: stats?.completedCount || 0,
      icon: Stethoscope,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: IndianRupee,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-title">Hospital Dashboard</h1>
        <p className="text-muted-foreground">Out-patient operations overview for today.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/op-pos">
          <Button data-testid="button-new-op">
            <UserPlus className="h-4 w-4 mr-2" />
            New OP
          </Button>
        </Link>
        <Link href="/patients">
          <Button variant="outline" data-testid="button-view-patients">
            <Users className="h-4 w-4 mr-2" />
            Patients
          </Button>
        </Link>
        <Link href="/hospital-settings">
          <Button variant="outline" data-testid="button-hospital-settings">
            <Building2 className="h-4 w-4 mr-2" />
            Hospital Settings
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                  <span className="text-2xl font-semibold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </span>
                  {stat.title === "Waiting in Queue" && (stats?.inConsultationCount || 0) > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Activity className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs text-muted-foreground">{stats?.inConsultationCount} in consultation</span>
                    </div>
                  )}
                  {stat.title !== "Waiting in Queue" && (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Today</span>
                    </div>
                  )}
                </div>
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-medium">Today's Visits</CardTitle>
            <Link href="/op-pos">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="link-view-all-visits">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {stats?.recentVisits && stats.recentVisits.length > 0 ? (
                stats.recentVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                    data-testid={`visit-token-${visit.tokenNumber}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <span className="text-sm font-bold text-primary">{visit.tokenNumber}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : "Unknown Patient"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {visit.doctor?.name || "No doctor assigned"}
                          {visit.department ? ` - ${visit.department.name}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {visit.consultationFee && visit.status === "completed" && (
                        <span className="text-sm font-medium">{formatCurrency(Number(visit.consultationFee))}</span>
                      )}
                      {getVisitStatusBadge(visit.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No visits today</p>
                  <p className="text-xs mt-1">Click "New OP" to register a walk-in patient</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-medium">Department Activity</CardTitle>
            <Link href="/hospital-settings">
              <Button variant="ghost" size="sm" className="text-primary" data-testid="link-manage-departments">
                Manage
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {stats?.departmentStats && stats.departmentStats.length > 0 ? (
                stats.departmentStats.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                    data-testid={`dept-stat-${dept.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent shrink-0">
                        <Building2 className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{dept.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {dept.visitCount} visit{dept.visitCount !== 1 ? "s" : ""} today
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dept.waitingCount > 0 && (
                        <Badge variant="default" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          {dept.waitingCount} waiting
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No departments set up</p>
                  <p className="text-xs mt-1">Go to Hospital Settings to add departments</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-2xl font-semibold" data-testid="stat-total-patients">{stats?.totalPatients || 0}</span>
                <p className="text-sm text-muted-foreground">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <Stethoscope className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <span className="text-2xl font-semibold" data-testid="stat-total-doctors">{stats?.totalDoctors || 0}</span>
                <p className="text-sm text-muted-foreground">Active Doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="text-2xl font-semibold" data-testid="stat-total-departments">{stats?.totalDepartments || 0}</span>
                <p className="text-sm text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { mode } = useAppMode();

  if (mode === "hospitals") {
    return (
      <>
        <SEO
          title="Hospital Dashboard - Diolab"
          description="Manage your hospital operations with our comprehensive dashboard. Track patients, appointments, and resources in real-time."
          canonical="https://www.diolab.in/dashboard"
          ogTitle="Hospital Dashboard - Diolab"
          ogDescription="Manage your hospital operations with our comprehensive dashboard. Track patients, appointments, and resources in real-time."
          ogImage="/diolab-og-image.jpg"
          ogUrl="https://www.diolab.in/dashboard"
          breadcrumbs={[
            {
              name: "Home",
              url: "https://www.diolab.in/"
            }, 
            {
              name: "Dashboard",
              url: "https://www.diolab.in/dashboard"
            }
          ]}
        />
        <HospitalDashboard />
      </>
    );
  }

  if (mode === "medlab") {
    return (
      <>
        <SEO
          title="Pharmacy Dashboard - Diolab"
          description="Manage your pharmacy operations with our comprehensive dashboard. Track inventory, sales, and customers in real-time."
          canonical="https://www.diolab.in/dashboard"
          ogTitle="Pharmacy Dashboard - Diolab"
          ogDescription="Manage your pharmacy operations with our comprehensive dashboard. Track inventory, sales, and customers in real-time."
          ogImage="/diolab-og-image.jpg"
          ogUrl="https://www.diolab.in/dashboard"
          breadcrumbs={[
            {
              name: "Home",
              url: "https://www.diolab.in/"
            }, 
            {
              name: "Dashboard",
              url: "https://www.diolab.in/dashboard"
            }
          ]}
        />
        <MedlabDashboardPage />
      </>
    );
  }

  return (
    <>
      <SEO
        title="Diagnostics Dashboard - Diolab"
        description="Manage your diagnostic lab operations with our comprehensive dashboard. Track tests, samples, and reports in real-time."
        canonical="https://www.diolab.in/dashboard"
        ogTitle="Diagnostics Dashboard - Diolab"
        ogDescription="Manage your diagnostic lab operations with our comprehensive dashboard. Track tests, samples, and reports in real-time."
        ogImage="/diolab-og-image.jpg"
        ogUrl="https://www.diolab.in/dashboard"
        breadcrumbs={[
          {
            name: "Home",
            url: "https://www.diolab.in/"
          }, 
          {
            name: "Dashboard",
            url: "https://www.diolab.in/dashboard"
          }
        ]}
      />
      <DiagnosticsDashboard />
    </>
  );
}
