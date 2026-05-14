import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Phone,
  ShoppingBag,
  Truck,
  ArrowUpDown,
  ChevronRight,
  Package,
  Pill,
  Clock,
  IndianRupee,
  FileText,
  Loader2,
} from "lucide-react";
import type { Organization } from "@shared/schema";

interface Customer {
  name: string;
  phone: string;
  totalPurchases: number;
  totalOrders: number;
  totalReferrals: number;
  totalSpent: number;
  lastVisit: string | null;
}

interface SaleRecord {
  id: string;
  createdAt: string;
  invoiceNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: string | number;
  paymentMode: string;
}

interface OrderRecord {
  id: string;
  createdAt: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: string | number;
  status: string;
}

interface ReferralRecord {
  id: string;
  createdAt: string;
  referralNumber: string;
  doctorName: string;
  items: Array<{ medicineName?: string; testName?: string; name?: string; dosage?: string; frequency?: string; duration?: string; quantity?: number }>;
  status: string;
}

interface CustomerHistory {
  sales: SaleRecord[];
  orders: OrderRecord[];
  referrals: ReferralRecord[];
}

type SortKey = "name" | "totalSpent" | "lastVisit" | "totalPurchases";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "sent":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "received":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "in_progress":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "completed":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  }
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function MedlabCustomers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [historyTab, setHistoryTab] = useState("purchases");

  const { data: orgData } = useQuery<{ organization: Organization; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/medlab/customers", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const res = await fetch(`/api/medlab/customers?organizationId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const { data: customerHistory, isLoading: historyLoading } = useQuery<CustomerHistory>({
    queryKey: ["/api/medlab/customers", selectedCustomer?.phone, "history", organization?.id],
    queryFn: async () => {
      if (!organization?.id || !selectedCustomer?.phone) return { sales: [], orders: [], referrals: [] };
      const res = await fetch(`/api/medlab/customers/${encodeURIComponent(selectedCustomer.phone)}/history?organizationId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
    enabled: !!organization?.id && !!selectedCustomer?.phone,
  });

  const filteredAndSorted = useMemo(() => {
    let result = customers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "totalSpent":
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case "lastVisit":
          if (!a.lastVisit && !b.lastVisit) return 0;
          if (!a.lastVisit) return 1;
          if (!b.lastVisit) return -1;
          return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
        case "totalPurchases":
          return (b.totalPurchases || 0) - (a.totalPurchases || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [customers, searchQuery, sortBy]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "totalSpent", label: "Total Spent" },
    { key: "lastVisit", label: "Last Visit" },
    { key: "totalPurchases", label: "Purchases" },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground" data-testid="text-loading">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Customers
          </h1>
          <p className="text-muted-foreground">Track customer orders and purchase history</p>
        </div>
        <Badge variant="secondary" data-testid="badge-customer-count">
          <Users className="h-3.5 w-3.5 mr-1" />
          {customers.length} customers
        </Badge>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
          {sortOptions.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={sortBy === opt.key ? "default" : "outline"}
              onClick={() => setSortBy(opt.key)}
              data-testid={`button-sort-${opt.key}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium text-foreground mb-1" data-testid="text-empty-title">No customers found</p>
            <p className="text-sm text-muted-foreground" data-testid="text-empty-description">
              {searchQuery ? "Try a different search term." : "Customer data will appear here once sales are recorded."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAndSorted.map((customer) => (
            <Card
              key={customer.phone}
              className="hover-elevate"
              data-testid={`card-customer-${customer.phone}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate" data-testid={`text-name-${customer.phone}`}>
                      {customer.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span data-testid={`text-phone-${customer.phone}`}>{customer.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-purchases-${customer.phone}`}>
                      {customer.totalPurchases} purchases
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-orders-${customer.phone}`}>
                      {customer.totalOrders} orders
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-referrals-${customer.phone}`}>
                      {customer.totalReferrals} referrals
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground" data-testid={`text-spent-${customer.phone}`}>
                      {formatCurrency(customer.totalSpent || 0)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span data-testid={`text-last-visit-${customer.phone}`}>
                      {customer.lastVisit
                        ? new Date(customer.lastVisit).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "No visits yet"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setHistoryTab("purchases");
                    }}
                    data-testid={`button-view-history-${customer.phone}`}
                  >
                    View History
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {selectedCustomer?.phone}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={historyTab} onValueChange={setHistoryTab}>
            <TabsList className="grid w-full grid-cols-3 gap-1">
              <TabsTrigger value="purchases" data-testid="tab-purchases">
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                Purchases
              </TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-orders">
                <Package className="h-3.5 w-3.5 mr-1.5" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="referrals" data-testid="tab-referrals">
                <Pill className="h-3.5 w-3.5 mr-1.5" />
                Referrals
              </TabsTrigger>
            </TabsList>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <TabsContent value="purchases" className="mt-4">
                  {!customerHistory?.sales?.length ? (
                    <div className="text-center py-8">
                      <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground" data-testid="text-no-purchases">No purchase history</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerHistory.sales.map((sale) => (
                          <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                            <TableCell className="text-muted-foreground">
                              {new Date(sale.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                            <TableCell className="text-right">
                              {Array.isArray(sale.items) ? sale.items.length : 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(typeof sale.total === "string" ? parseFloat(sale.total) : sale.total)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {sale.paymentMode}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="orders" className="mt-4">
                  {!customerHistory?.orders?.length ? (
                    <div className="text-center py-8">
                      <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground" data-testid="text-no-orders">No order history</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order #</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerHistory.orders.map((order) => (
                          <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                            <TableCell className="text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="font-medium">{order.orderNumber}</TableCell>
                            <TableCell className="text-right">
                              {Array.isArray(order.items) ? order.items.length : 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(typeof order.total === "string" ? parseFloat(order.total) : order.total)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {formatStatus(order.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="referrals" className="mt-4">
                  {!customerHistory?.referrals?.length ? (
                    <div className="text-center py-8">
                      <Pill className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground" data-testid="text-no-referrals">No referral history</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Referral #</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerHistory.referrals.map((referral) => (
                          <TableRow key={referral.id} data-testid={`row-referral-${referral.id}`}>
                            <TableCell className="text-muted-foreground">
                              {new Date(referral.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="font-medium">{referral.referralNumber}</TableCell>
                            <TableCell>{referral.doctorName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {Array.isArray(referral.items)
                                ? referral.items.map((i) => i.medicineName || i.testName || i.name || "—").join(", ")
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(referral.status)}>
                                {formatStatus(referral.status)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
