import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pill,
  AlertTriangle,
  Clock,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
  ArrowRight,
  Package,
  Sparkles,
  RefreshCw,
  TrendingDown,
  BarChart3,
  Loader2,
  Link2,
  Copy,
  Check,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, Stethoscope } from "lucide-react";
import type { Medicine, MedicineSale, Organization, PharmacyOrder, ModuleReferral } from "@shared/schema";

interface StockInsights {
  reorderSuggestions: Array<{
    medicineName: string;
    currentStock: number;
    reorderLevel: number;
    suggestedQuantity?: number;
    urgency?: string;
    reason: string;
  }>;
  expiryRisks: Array<{
    medicineName: string;
    expiryDate: string;
    currentStock?: number;
    stock?: number;
    riskLevel: string;
    recommendation?: string;
    suggestion?: string;
  }>;
  slowMovingItems: Array<{
    medicineName: string;
    stock: number;
    salesLast30Days?: number;
    recommendation?: string;
    suggestion?: string;
  }>;
  salesPatterns: Array<{
    observation: string;
    recommendation: string;
  }>;
  summary: string;
}

interface MedlabStats {
  totalMedicines: number;
  lowStockCount: number;
  expiringSoonCount: number;
  todaySales: number;
  todayRevenue: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
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

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function MedlabDashboard() {
  const { toast } = useToast();
  const [insights, setInsights] = useState<StockInsights | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: orgData } = useQuery<{ organization: Organization; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const pharmacyLink = organization?.id
    ? `${window.location.origin}/pharmacy/${organization.id}`
    : "";

  const copyPharmacyLink = () => {
    navigator.clipboard.writeText(pharmacyLink);
    setLinkCopied(true);
    toast({ title: "Link copied", description: "Online ordering link copied to clipboard." });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const insightsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/medlab/ai/stock-insights", {
        organizationId: organization?.id,
      });
      return res.json() as Promise<StockInsights>;
    },
    onSuccess: (data) => {
      setInsights(data);
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery<MedlabStats>({
    queryKey: ["/api/medlab/stats", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/stats?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const { data: sales = [] } = useQuery<MedicineSale[]>({
    queryKey: ["/api/medlab/sales", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/sales?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch sales");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const { data: pharmacyOrders = [] } = useQuery<PharmacyOrder[]>({
    queryKey: ["/api/medlab/orders", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/orders?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const pendingOrders = pharmacyOrders.filter((o) => o.status === "pending" || o.status === "confirmed");

  const { data: incomingReferrals = [] } = useQuery<ModuleReferral[]>({
    queryKey: ["/api/medlab/referrals", organization?.id, "medlab"],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/referrals?organizationId=${organization?.id}&targetModule=medlab`);
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const pendingReferrals = incomingReferrals.filter((r) => r.status === "sent" || r.status === "received");

  const { data: allMedicines = [] } = useQuery<Medicine[]>({
    queryKey: ["/api/medlab/medicines", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/medicines?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const recentSales = sales.slice(0, 8);
  const lowStockMedicines = allMedicines.filter(
    (m) => m.isActive && (m.stock ?? 0) < (m.reorderLevel ?? 10)
  ).slice(0, 8);

  if (statsLoading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      title: "Total Medicines",
      value: stats?.totalMedicines ?? 0,
      icon: Pill,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Low Stock Alerts",
      value: stats?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/10",
    },
    {
      title: "Expiring Soon",
      value: stats?.expiringSoonCount ?? 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "Today's Sales",
      value: stats?.todaySales ?? 0,
      icon: ShoppingCart,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue ?? 0),
      icon: IndianRupee,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-medlab-dashboard-title">
          Medlab Dashboard
        </h1>
        <p className="text-muted-foreground">Pharmacy operations overview for today.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/medicines">
          <Button data-testid="button-add-medicine">
            <Pill className="h-4 w-4 mr-2" />
            Add Medicine
          </Button>
        </Link>
        <Link href="/medlab-sales">
          <Button variant="outline" data-testid="button-new-sale">
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </Link>
        {pendingOrders.length > 0 && (
          <Link href="/pharmacy-orders">
            <Button variant="outline" data-testid="button-pending-orders">
              <ClipboardList className="h-4 w-4 mr-2" />
              {pendingOrders.length} Pending Order{pendingOrders.length !== 1 ? "s" : ""}
            </Button>
          </Link>
        )}
        {pendingReferrals.length > 0 && (
          <Link href="/medlab-customers">
            <Button variant="outline" data-testid="button-pending-referrals">
              <Stethoscope className="h-4 w-4 mr-2" />
              {pendingReferrals.length} Incoming Prescription{pendingReferrals.length !== 1 ? "s" : ""}
            </Button>
          </Link>
        )}
      </div>

      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Online Pharmacy Ordering</p>
                <p className="text-xs text-muted-foreground">Share this link with customers so they can order medicines online</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                readOnly
                value={pharmacyLink}
                className="text-xs h-9 min-w-0 flex-1 sm:w-64"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                data-testid="input-pharmacy-link"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={copyPharmacyLink}
                data-testid="button-copy-pharmacy-link"
              >
                {linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <a href={pharmacyLink} target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" data-testid="button-open-pharmacy-link">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                  <span
                    className="text-2xl font-semibold"
                    data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {stat.value}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Today</span>
                  </div>
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
            <CardTitle className="text-base font-medium">Recent Sales</CardTitle>
            <Link href="/medlab-sales">
              <Button variant="ghost" size="sm" data-testid="link-view-all-sales">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                    data-testid={`sale-${sale.invoiceNumber}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {sale.customerName || "Walk-in Customer"}
                        </span>
                        <span className="text-xs text-muted-foreground">{sale.invoiceNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {formatCurrency(Number(sale.total))}
                        </span>
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(new Date(sale.createdAt || Date.now()))}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="default"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      >
                        {sale.paymentMode || "cash"}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent sales</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-medium">Low Stock Medicines</CardTitle>
            <Link href="/medicines">
              <Button variant="ghost" size="sm" data-testid="link-view-all-medicines">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {lowStockMedicines.length > 0 ? (
                lowStockMedicines.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                    data-testid={`low-stock-medicine-${med.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/10 shrink-0">
                        <Package className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{med.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {med.brand || med.genericName || med.category || "Uncategorized"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="default"
                        className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      >
                        Stock: {med.stock ?? 0}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No low stock alerts</p>
                  <p className="text-xs mt-1">All medicines are well stocked</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-ai-stock-insights">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">AI Stock Insights</CardTitle>
          </div>
          <Button
            onClick={() => insightsMutation.mutate()}
            disabled={insightsMutation.isPending}
            data-testid="button-generate-insights"
          >
            {insightsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : insights ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {insightsMutation.isPending ? "Analyzing..." : insights ? "Refresh Insights" : "Generate Insights"}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {insightsMutation.isPending && (
            <div className="space-y-4" data-testid="insights-loading">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing inventory...</span>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-3/4" />
              </div>
            </div>
          )}

          {!insightsMutation.isPending && !insights && (
            <div className="text-center py-8 text-muted-foreground" data-testid="insights-empty">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Generate AI-powered insights about your inventory</p>
              <p className="text-xs mt-1">Analyzes stock levels, expiry dates, and sales patterns</p>
            </div>
          )}

          {!insightsMutation.isPending && insights && (
            <div className="space-y-6" data-testid="insights-results">
              {insights.reorderSuggestions && insights.reorderSuggestions.length > 0 && (
                <div data-testid="insights-reorder-suggestions">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-medium">Reorder Suggestions</h3>
                  </div>
                  <div className="space-y-2">
                    {insights.reorderSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`reorder-suggestion-${idx}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{item.medicineName}</span>
                          <span className="text-xs text-muted-foreground">{item.reason}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="default"
                            className={
                              (item.urgency === "critical" || item.currentStock === 0)
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }
                          >
                            Stock: {item.currentStock}
                          </Badge>
                          {item.suggestedQuantity && (
                            <Badge
                              variant="default"
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            >
                              Order: {item.suggestedQuantity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.expiryRisks && insights.expiryRisks.length > 0 && (
                <div data-testid="insights-expiry-risks">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-red-500" />
                    <h3 className="text-sm font-medium">Expiry Risks</h3>
                  </div>
                  <div className="space-y-2">
                    {insights.expiryRisks.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`expiry-risk-${idx}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{item.medicineName}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.recommendation || item.suggestion}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="default"
                            className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          >
                            {item.riskLevel}
                          </Badge>
                          <Badge
                            variant="default"
                            className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          >
                            Expires: {new Date(item.expiryDate).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.slowMovingItems && insights.slowMovingItems.length > 0 && (
                <div data-testid="insights-slow-moving">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-medium">Slow Moving Items</h3>
                  </div>
                  <div className="space-y-2">
                    {insights.slowMovingItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                        data-testid={`slow-moving-${idx}`}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{item.medicineName}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.recommendation || item.suggestion}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="default"
                            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          >
                            Stock: {item.stock}
                          </Badge>
                          {item.salesLast30Days !== undefined && (
                            <Badge
                              variant="default"
                              className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            >
                              Sales (30d): {item.salesLast30Days}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.salesPatterns && insights.salesPatterns.length > 0 && (
                <div data-testid="insights-sales-patterns">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">Sales Patterns</h3>
                  </div>
                  <div className="space-y-2">
                    {insights.salesPatterns.map((pattern, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-muted/50"
                        data-testid={`sales-pattern-${idx}`}
                      >
                        <p className="text-sm text-foreground">{pattern.observation}</p>
                        <p className="text-xs text-muted-foreground mt-1">{pattern.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.summary && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10" data-testid="insights-summary">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium">Summary</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{insights.summary}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
