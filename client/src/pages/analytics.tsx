import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Users,
  TestTube2,
  Receipt,
  Sparkles,
  BarChart3,
  PieChart,
  Loader2,
  AlertCircle,
  Stethoscope,
  Pill,
  Activity,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type ModuleKey = "dialab" | "doclab" | "medlab";

interface AnalyticsData {
  stats: {
    revenue: string;
    revenueChange: string;
    patients: string;
    patientsChange: string;
    transactions: string;
    transactionsChange: string;
    avgTransaction: string;
    avgTransactionChange: string;
  };
  selectedModules: string[];
  dialab: {
    revenue: number;
    revenueChange: string;
    testCount: number;
    billCount: number;
    topTests: Array<{ name: string; count: number; revenue: string }>;
    revenueByCategory: Array<{ category: string; percentage: number; color: string }>;
  } | null;
  doclab: {
    revenue: number;
    revenueChange: string;
    visitCount: number;
    completedCount: number;
    topDoctors: Array<{ name: string; consultations: number; revenue: string }>;
    statusBreakdown: { completed: number; waiting: number; booked: number; cancelled: number };
  } | null;
  medlab: {
    revenue: number;
    revenueChange: string;
    salesCount: number;
    topMedicines: Array<{ name: string; quantity: number; revenue: string }>;
  } | null;
  revenueByModule: Array<{ category: string; percentage: number; color: string }>;
  insights: Array<{ type: string; title: string; description: string; trend: string }>;
  hasData: boolean;
  totalPatients: number;
  totalTransactions: number;
}

function TrendIcon({ change }: { change: string }) {
  const isPositive = change.startsWith("+") && change !== "+0%";
  const isNegative = change.startsWith("-");
  
  if (isPositive) {
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  } else if (isNegative) {
    return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  }
  return <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />;
}

function TrendText({ change }: { change: string }) {
  const isPositive = change.startsWith("+") && change !== "+0%";
  const isNegative = change.startsWith("-");
  
  return (
    <span className={`text-xs font-medium ${isPositive ? "text-emerald-500" : isNegative ? "text-red-500" : "text-muted-foreground"}`}>
      {change}
    </span>
  );
}

const MODULE_CONFIG: Record<ModuleKey, { label: string; icon: typeof TestTube2; color: string; bgColor: string }> = {
  dialab: { label: "Dialab", icon: TestTube2, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
  doclab: { label: "Doclab", icon: Stethoscope, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-500/10" },
  medlab: { label: "Medlab", icon: Pill, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10" },
};

export default function Analytics() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("month");
  const [selectedModules, setSelectedModules] = useState<Set<ModuleKey>>(() => new Set<ModuleKey>(["dialab", "doclab", "medlab"]));

  const modulesParam = useMemo(() => Array.from(selectedModules).join(","), [selectedModules]);

  const toggleModule = (mod: ModuleKey) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(mod)) {
        if (next.size > 1) next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", period, modulesParam],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?period=${period}&modules=${modulesParam}`);
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-muted-foreground">Failed to load analytics. Please try again.</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    revenue: "₹0",
    revenueChange: "+0%",
    patients: "0",
    patientsChange: "+0%",
    transactions: "0",
    transactionsChange: "+0%",
    avgTransaction: "₹0",
    avgTransactionChange: "+0%",
  };

  const insights = data?.insights || [];
  const hasData = data?.hasData || false;
  const revenueByModule = data?.revenueByModule || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {(Object.keys(MODULE_CONFIG) as ModuleKey[]).map((mod) => {
              const config = MODULE_CONFIG[mod];
              const Icon = config.icon;
              const isActive = selectedModules.has(mod);
              return (
                <Button
                  key={mod}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleModule(mod)}
                  className={`toggle-elevate ${isActive ? "toggle-elevated" : ""}`}
                  data-testid={`button-module-${mod}`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {config.label}
                </Button>
              );
            })}
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as "today" | "week" | "month")}>
            <SelectTrigger className="w-[140px]" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <div key={index} className="p-3 rounded-lg bg-background/80 border" data-testid={`insight-${index}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {insight.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500 mt-0.5" />
                    ) : insight.trend === "down" ? (
                      <TrendingDown className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : (
                      <BarChart3 className="h-4 w-4 text-primary mt-0.5" />
                    )}
                    <span className="text-sm font-medium">{insight.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-2xl font-semibold" data-testid="stat-revenue">
                  {stats.revenue}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={stats.revenueChange} />
                  <TrendText change={stats.revenueChange} />
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10">
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Total Patients</span>
                <span className="text-2xl font-semibold" data-testid="stat-patients">
                  {stats.patients}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={stats.patientsChange} />
                  <TrendText change={stats.patientsChange} />
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Transactions</span>
                <span className="text-2xl font-semibold" data-testid="stat-transactions">
                  {stats.transactions}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={stats.transactionsChange} />
                  <TrendText change={stats.transactionsChange} />
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-500/10">
                <Activity className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Avg. Transaction</span>
                <span className="text-2xl font-semibold" data-testid="stat-avg-transaction">
                  {stats.avgTransaction}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon change={stats.avgTransactionChange} />
                  <TrendText change={stats.avgTransactionChange} />
                  <span className="text-xs text-muted-foreground">vs last period</span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <Receipt className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              Revenue by Module
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {!hasData ? (
              <div className="text-center py-8 text-muted-foreground">
                <PieChart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No revenue data yet</p>
                <p className="text-sm">Start creating transactions to see revenue breakdown</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {revenueByModule.map((mod) => (
                    <div key={mod.category} className="space-y-2" data-testid={`module-revenue-${mod.category.toLowerCase()}`}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${mod.color}`} />
                          <span className="font-medium">{mod.category}</span>
                        </div>
                        <span className="text-muted-foreground">{mod.percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${mod.color}`}
                          style={{ width: `${mod.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-semibold text-primary" data-testid="summary-revenue">{stats.revenue}</div>
                      <div className="text-xs text-muted-foreground">Total Revenue</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-semibold text-primary" data-testid="summary-transactions">{stats.transactions}</div>
                      <div className="text-xs text-muted-foreground">Total Transactions</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {selectedModules.has("dialab") && data?.dialab && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TestTube2 className="h-4 w-4 text-blue-500" />
                Dialab - Top Tests
                <Badge variant="secondary" className="text-[10px] no-default-active-elevate">{data.dialab.testCount} tests</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.dialab.topTests.length === 0 || data.dialab.billCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TestTube2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No test data yet</p>
                  <p className="text-sm">Start creating lab bills to see your top tests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.dialab.topTests.map((test, index) => (
                    <div key={test.name} className="flex items-center gap-4" data-testid={`top-test-${index}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-sm font-medium text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                          <span className="text-sm font-medium truncate">{test.name}</span>
                          <span className="text-sm text-muted-foreground">{test.count} tests</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${data.dialab!.topTests[0]?.count > 0 ? (test.count / data.dialab!.topTests[0].count) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-medium text-right min-w-[80px]">
                        {test.revenue}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedModules.has("doclab") && data?.doclab && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-purple-500" />
                Doclab - Top Doctors
                <Badge variant="secondary" className="text-[10px] no-default-active-elevate">{data.doclab.visitCount} visits</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.doclab.topDoctors.length === 0 || data.doclab.visitCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No consultation data yet</p>
                  <p className="text-sm">Start creating OP visits to see doctor performance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.doclab.topDoctors.map((doc, index) => (
                    <div key={doc.name} className="flex items-center gap-4" data-testid={`top-doctor-${index}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-sm font-medium text-purple-600 dark:text-purple-400">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                          <span className="text-sm font-medium truncate">{doc.name}</span>
                          <span className="text-sm text-muted-foreground">{doc.consultations} visits</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${data.doclab!.topDoctors[0]?.consultations > 0 ? (doc.consultations / data.doclab!.topDoctors[0].consultations) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-medium text-right min-w-[80px]">
                        {doc.revenue}
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="grid grid-cols-4 gap-2">
                      {(["completed", "waiting", "booked", "cancelled"] as const).map((status) => (
                        <div key={status} className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="text-lg font-semibold" data-testid={`doclab-status-${status}`}>
                            {data.doclab!.statusBreakdown[status]}
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">{status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedModules.has("medlab") && data?.medlab && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Pill className="h-4 w-4 text-green-500" />
                Medlab - Top Medicines
                <Badge variant="secondary" className="text-[10px] no-default-active-elevate">{data.medlab.salesCount} sales</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.medlab.topMedicines.length === 0 || data.medlab.salesCount === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Pill className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No pharmacy sales yet</p>
                  <p className="text-sm">Start selling medicines to see your top products</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.medlab.topMedicines.map((med, index) => (
                    <div key={med.name} className="flex items-center gap-4" data-testid={`top-medicine-${index}`}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-sm font-medium text-green-600 dark:text-green-400">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                          <span className="text-sm font-medium truncate">{med.name}</span>
                          <span className="text-sm text-muted-foreground">{med.quantity} sold</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${data.medlab!.topMedicines[0]?.quantity > 0 ? (med.quantity / data.medlab!.topMedicines[0].quantity) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-medium text-right min-w-[80px]">
                        {med.revenue}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedModules.has("dialab") && data?.dialab && data.dialab.revenueByCategory.length > 0 && data.dialab.billCount > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Dialab - Revenue by Test Category
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {data.dialab.revenueByCategory.map((cat) => (
                  <div key={cat.category} className="space-y-2" data-testid={`category-${cat.category}`}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${cat.color}`} />
                        <span className="font-medium">{cat.category}</span>
                      </div>
                      <span className="text-muted-foreground">{cat.percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cat.color}`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
