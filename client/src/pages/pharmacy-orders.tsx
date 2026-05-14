import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Package,
  Phone,
  MapPin,
  MessageCircle,
  Check,
  X,
  Clock,
  Loader2,
  ClipboardList,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Organization, PharmacyOrder } from "@shared/schema";

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "confirmed":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "ready":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "completed":
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  }
}

export default function PharmacyOrders() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");

  const { data: orgData } = useQuery<{ organization: Organization; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: orders = [], isLoading: ordersLoading } = useQuery<PharmacyOrder[]>({
    queryKey: ["/api/medlab/orders", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const res = await fetch(`/api/medlab/orders?organizationId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/medlab/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/orders"] });
      toast({ title: "Success", description: "Order status updated." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    ready: orders.filter((o) => o.status === "ready").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    return order.status === activeTab;
  });

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleWhatsApp = (order: PharmacyOrder) => {
    const cleanPhone = order.customerPhone.replace(/\D/g, "");
    const phoneWithCode = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const status = order.status || "pending";
    const message = `Hi ${order.customerName}, your order #${order.orderNumber} status is now: ${status.toUpperCase()}. Total: ${formatCurrency(order.total)}`;
    window.open(
      `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (ordersLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Pharmacy Orders
        </h1>
        <p className="text-muted-foreground">Manage online medicine orders</p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="all" data-testid="tab-all" className="text-xs sm:text-sm">
            <span>All</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending" className="text-xs sm:text-sm">
            <span>Pending</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {statusCounts.pending}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="confirmed" data-testid="tab-confirmed" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Confirmed</span>
            <span className="sm:hidden">Conf</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {statusCounts.confirmed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ready" data-testid="tab-ready" className="text-xs sm:text-sm">
            <span>Ready</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {statusCounts.ready}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Completed</span>
            <span className="sm:hidden">Done</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {statusCounts.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Cancelled</span>
            <span className="sm:hidden">Cancel</span>
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {statusCounts.cancelled}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Orders Grid */}
        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredOrders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-foreground mb-1">No orders found</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "all"
                    ? "No orders yet. Online orders will appear here."
                    : `No orders with status "${activeTab}".`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  className="hover-elevate overflow-hidden"
                  data-testid={`card-order-${order.orderNumber}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base" data-testid={`text-order-number-${order.id}`}>
                          Order #{order.orderNumber}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : ""}
                        </p>
                      </div>
                      <Badge
                        className={`${getStatusColor(order.status || "pending")} shrink-0`}
                        data-testid={`badge-status-${order.id}`}
                      >
                        {(order.status || "pending").charAt(0).toUpperCase() + (order.status || "pending").slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div className="space-y-2">
                      <div
                        className="flex items-center gap-2"
                        data-testid={`text-customer-name-${order.id}`}
                      >
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{order.customerName}</span>
                      </div>
                      <button
                        onClick={() => handleCall(order.customerPhone)}
                        className="flex items-center gap-2 text-sm text-primary hover:underline hover-elevate py-1 px-2 rounded -mx-2"
                        data-testid={`button-call-${order.id}`}
                      >
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{order.customerPhone}</span>
                      </button>
                      {order.customerAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground">
                            {order.customerAddress}
                          </span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Items List */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Items</p>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {(order.items as Array<{medicineId: string; name: string; quantity: number; price: number}>).map((item: {medicineId: string; name: string; quantity: number; price: number}, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 text-sm"
                            data-testid={`text-item-${order.id}-${idx}`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-xs">
                                x{item.quantity}
                              </Badge>
                              <span className="text-muted-foreground">
                                {formatCurrency(item.price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <>
                        <Separator />
                        <div className="bg-muted/50 rounded p-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm text-foreground" data-testid={`text-notes-${order.id}`}>
                            {order.notes}
                          </p>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Total and Actions */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                        <span
                          className="text-lg font-bold text-foreground"
                          data-testid={`text-total-${order.id}`}
                        >
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {order.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(order.id, "confirmed")}
                              disabled={updateStatusMutation.isPending}
                              className="flex-1 sm:flex-none"
                              data-testid={`button-confirm-${order.id}`}
                            >
                              {updateStatusMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(order.id, "cancelled")}
                              disabled={updateStatusMutation.isPending}
                              className="flex-1 sm:flex-none"
                              data-testid={`button-cancel-${order.id}`}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === "confirmed" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(order.id, "ready")}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 sm:flex-none"
                            data-testid={`button-mark-ready-${order.id}`}
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1" />
                            )}
                            Mark Ready
                          </Button>
                        )}
                        {order.status === "ready" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(order.id, "completed")}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 sm:flex-none"
                            data-testid={`button-complete-${order.id}`}
                          >
                            {updateStatusMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1" />
                            )}
                            Complete
                          </Button>
                        )}

                        {/* WhatsApp Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(order)}
                          className="flex-1 sm:flex-none"
                          data-testid={`button-whatsapp-${order.id}`}
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
