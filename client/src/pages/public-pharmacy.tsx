import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Phone,
  User,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Pill,
  Building2,
  Package,
} from "lucide-react";

type OrgInfo = {
  id: string;
  name: string;
  pharmacyName: string | null;
  logo: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  primaryColor: string | null;
};

type MedicineItem = {
  id: string;
  name: string;
  genericName: string | null;
  brand: string | null;
  category: string | null;
  form: string | null;
  strength: string | null;
  sellingPrice: string;
  requiresPrescription: boolean;
  description: string | null;
  inStock: boolean;
};

type CartItem = {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
};

type OrderResult = {
  orderNumber: string;
  items: CartItem[];
  total: number;
};

const CATEGORIES = ["All", "Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Powder", "Other"];

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function PublicPharmacy() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { toast } = useToast();

  const [step, setStep] = useState<"browse" | "cart" | "checkout" | "confirmation">("browse");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  const { data: org, isLoading: orgLoading, error: orgError } = useQuery<OrgInfo>({
    queryKey: ["/api/medlab/public/org", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/public/org/${orgId}`);
      if (!res.ok) throw new Error("Organization not found");
      return res.json();
    },
    enabled: !!orgId,
  });

  const { data: medicines = [], isLoading: medicinesLoading } = useQuery<MedicineItem[]>({
    queryKey: ["/api/medlab/public/org", orgId, "medicines"],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/public/org/${orgId}/medicines`);
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
    enabled: !!orgId,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (body: {
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      items: { medicineId: string; name: string; quantity: number; price: number }[];
      subtotal: number;
      total: number;
      notes: string;
    }) => {
      const res = await apiRequest("POST", `/api/medlab/public/org/${orgId}/order`, body);
      return res.json();
    },
    onSuccess: (data) => {
      setOrderResult({
        orderNumber: data.orderNumber || data.id || "N/A",
        items: cart,
        total: subtotal,
      });
      setStep("confirmation");
    },
    onError: (error: Error) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredMedicines = useMemo(() => {
    let filtered = medicines.filter((m) => m.inStock);

    if (selectedCategory !== "All") {
      filtered = filtered.filter((med) => {
        const form = (med.form || "").toLowerCase();
        const cat = selectedCategory.toLowerCase();
        if (cat === "other") {
          return !["tablet", "capsule", "syrup", "injection", "cream", "drops", "powder"].some(
            (c) => form.includes(c)
          );
        }
        return form.includes(cat);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (med) =>
          med.name.toLowerCase().includes(q) ||
          (med.genericName || "").toLowerCase().includes(q) ||
          (med.brand || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [medicines, selectedCategory, searchQuery]);

  const addToCart = (med: MedicineItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.medicineId === med.id);
      if (existing) {
        return prev.map((item) =>
          item.medicineId === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { medicineId: med.id, name: med.name, price: Number(med.sellingPrice), quantity: 1 }];
    });
    toast({ title: "Added to cart", description: `${med.name} added.` });
  };

  const updateQuantity = (medicineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicineId !== medicineId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and phone number.",
        variant: "destructive",
      });
      return;
    }
    if (customerPhone.length < 10) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    placeOrderMutation.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      items: cart.map((item) => ({
        medicineId: item.medicineId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      total: subtotal,
      notes: notes.trim(),
    });
  };

  const displayName = org?.pharmacyName || org?.name || "Pharmacy";
  const locationParts = [org?.address, org?.city, org?.state].filter(Boolean);

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-org" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-error-title">Pharmacy Unavailable</h2>
            <p className="text-muted-foreground" data-testid="text-error-message">
              This pharmacy is not available or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "confirmation" && orderResult) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              {org.logo ? (
                <img src={org.logo} alt={displayName} className="h-10 w-10 rounded-md object-contain" />
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
              )}
              <h1 className="font-semibold text-lg" data-testid="text-pharmacy-name">{displayName}</h1>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2" data-testid="text-order-success">Order Placed Successfully</h2>
          <p className="text-muted-foreground mb-6">Thank you for your order. The pharmacy will contact you to confirm.</p>

          <Card className="text-left mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Order Number</span>
                <span className="font-semibold" data-testid="text-order-number">{orderResult.orderNumber}</span>
              </div>
              <Separator />
              {orderResult.items.map((item) => (
                <div key={item.medicineId} className="flex items-center justify-between gap-2 flex-wrap text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span className="font-medium">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between gap-2 flex-wrap font-semibold">
                <span>Total</span>
                <span data-testid="text-order-total">{formatINR(orderResult.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              setStep("browse");
              setCart([]);
              setCustomerName("");
              setCustomerPhone("");
              setCustomerAddress("");
              setNotes("");
              setOrderResult(null);
            }}
            data-testid="button-new-order"
          >
            <Package className="h-4 w-4 mr-2" />
            Place Another Order
          </Button>
        </div>
      </div>
    );
  }

  if (step === "checkout") {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setStep("cart")} data-testid="button-back-to-cart">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-semibold text-lg">Checkout</h1>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Your Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Name *</Label>
                <Input
                  id="customerName"
                  placeholder="Your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  data-testid="input-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customerPhone"
                    placeholder="10-digit phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-10"
                    data-testid="input-customer-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerAddress">Delivery Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="customerAddress"
                    placeholder="Your delivery address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="pl-10 min-h-[80px]"
                    data-testid="input-customer-address"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="input-notes"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.map((item) => (
                <div key={item.medicineId} className="flex items-center justify-between gap-2 flex-wrap text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span className="font-medium">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between gap-2 flex-wrap font-semibold">
                <span>Total</span>
                <span data-testid="text-checkout-total">{formatINR(subtotal)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={placeOrderMutation.isPending}
            data-testid="button-place-order"
          >
            {placeOrderMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Place Order
          </Button>
        </div>
      </div>
    );
  }

  if (step === "cart") {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setStep("browse")} data-testid="button-back-to-browse">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-semibold text-lg">Your Cart</h1>
              <Badge variant="secondary" className="ml-auto">{cartItemCount} items</Badge>
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {cart.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-1">Your cart is empty</h3>
                <p className="text-sm text-muted-foreground mb-4">Browse medicines and add items to your cart.</p>
                <Button onClick={() => setStep("browse")} data-testid="button-browse-from-empty-cart">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Browse Medicines
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {cart.map((item) => (
                <Card key={item.medicineId} data-testid={`card-cart-item-${item.medicineId}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" data-testid={`text-cart-item-name-${item.medicineId}`}>{item.name}</p>
                        <p className="text-sm text-muted-foreground">{formatINR(item.price)} each</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.medicineId)}
                        data-testid={`button-remove-${item.medicineId}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.medicineId, -1)}
                          data-testid={`button-decrease-${item.medicineId}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.medicineId}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.medicineId, 1)}
                          data-testid={`button-increase-${item.medicineId}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="font-semibold" data-testid={`text-item-total-${item.medicineId}`}>
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium" data-testid="text-cart-subtotal">{formatINR(subtotal)}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between gap-2 flex-wrap font-semibold text-lg">
                    <span>Total</span>
                    <span data-testid="text-cart-total">{formatINR(subtotal)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={() => setStep("checkout")}
                data-testid="button-continue-to-checkout"
              >
                Continue to Checkout
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {org.logo ? (
              <img src={org.logo} alt={displayName} className="h-10 w-10 rounded-md object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Pill className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-semibold text-lg leading-tight truncate" data-testid="text-pharmacy-name">
                {displayName}
              </h1>
              {locationParts.length > 0 && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {locationParts.join(", ")}
                </p>
              )}
              {org.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  {org.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-medicines"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="shrink-0"
              data-testid={`button-category-${cat.toLowerCase()}`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {medicinesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" data-testid="loader-medicines" />
          </div>
        ) : filteredMedicines.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-1" data-testid="text-no-medicines">No medicines found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== "All"
                  ? "Try adjusting your search or category filter."
                  : "This pharmacy has no medicines available at the moment."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMedicines.map((med) => {
              const inCart = cart.find((item) => item.medicineId === med.id);
              return (
                <Card key={med.id} data-testid={`card-medicine-${med.id}`}>
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-tight truncate" data-testid={`text-medicine-name-${med.id}`}>
                          {med.name}
                        </p>
                        {med.genericName && (
                          <p className="text-xs text-muted-foreground truncate" data-testid={`text-generic-name-${med.id}`}>
                            {med.genericName}
                          </p>
                        )}
                      </div>
                      {med.requiresPrescription && (
                        <Badge variant="secondary" className="shrink-0 text-xs" data-testid={`badge-rx-${med.id}`}>
                          Rx Required
                        </Badge>
                      )}
                    </div>

                    {(med.form || med.strength) && (
                      <p className="text-xs text-muted-foreground">
                        {[med.form, med.strength].filter(Boolean).join(" | ")}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-lg font-semibold" data-testid={`text-price-${med.id}`}>
                        {formatINR(Number(med.sellingPrice))}
                      </span>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(med.id, -1)}
                            data-testid={`button-cart-decrease-${med.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium text-sm" data-testid={`text-cart-qty-${med.id}`}>
                            {inCart.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(med.id, 1)}
                            data-testid={`button-cart-increase-${med.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => addToCart(med)}
                          data-testid={`button-add-to-cart-${med.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card/95 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium" data-testid="text-floating-cart-count">
                {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
              </span>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="font-semibold" data-testid="text-floating-cart-total">{formatINR(subtotal)}</span>
            </div>
            <Button onClick={() => setStep("cart")} data-testid="button-view-cart">
              View Cart
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
