import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  ShoppingCart,
  Trash2,
  Loader2,
  Plus,
  Minus,
  IndianRupee,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Pill,
  X,
  LayoutGrid,
  List,
  ScanBarcode,
  Sparkles,
  AlertTriangle,
  Shield,
  Camera,
  Printer,
  Mail,
  MessageCircle,
} from "lucide-react";
import Quagga from "@ericblade/quagga2";
import { MedicineCamera } from "@/components/medicine-camera";
import type { Medicine, Organization } from "@shared/schema";

interface CartItem {
  medicineId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
}

interface CompletedSale {
  invoiceNumber: string;
  items: Array<{ medicineId: string; name: string; price: number; quantity: number }>;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paymentMode: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
}

interface InteractionWarning {
  drug1: string;
  drug2: string;
  severity: string;
  description: string;
}

const CATEGORIES = ["All", "Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Powder", "Other"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function isExpiringSoon(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return expiry <= thirtyDaysFromNow && expiry >= new Date();
}

function isExpired(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

export default function MedlabSales() {
  const { toast } = useToast();
  const [medicineSearch, setMedicineSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [interactionWarnings, setInteractionWarnings] = useState<InteractionWarning[]>([]);
  const [interactionsOpen, setInteractionsOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");

  const scannerRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const { data: orgData } = useQuery<{ organization: Organization; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: medicines = [], isLoading: medicinesLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medlab/medicines", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/medicines?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const activeMedicines = medicines.filter((m) => m.isActive !== false);
  const inStockMedicines = activeMedicines.filter((m) => (m.stock ?? 0) > 0);

  const aiSearchMutation = useMutation({
    mutationFn: async (data: { query: string; organizationId: string }) => {
      const res = await apiRequest("POST", "/api/medlab/ai/smart-search", data);
      return res.json();
    },
  });

  const interactionCheckMutation = useMutation({
    mutationFn: async (data: { medicines: Array<{ name: string; genericName?: string }> }) => {
      const res = await apiRequest("POST", "/api/medlab/ai/interaction-check", data);
      return res.json();
    },
    onSuccess: (data) => {
      const warnings = data.interactions || data.warnings || [];
      setInteractionWarnings(warnings);
      setInteractionsOpen(true);
      if (warnings.length === 0) {
        toast({ title: "No interactions found", description: "The medicines in your cart appear safe to use together." });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to check interactions.", variant: "destructive" });
    },
  });

  const aiMatchMap = useMemo(() => {
    if (!aiSearchMutation.data?.matches) return new Map<string, { relevance: string; reason: string }>();
    const map = new Map<string, { relevance: string; reason: string }>();
    for (const match of aiSearchMutation.data.matches) {
      map.set(match.medicineId, { relevance: match.relevance, reason: match.reason });
    }
    return map;
  }, [aiSearchMutation.data]);

  const filteredMedicines = useMemo(() => {
    if (aiSearchEnabled && aiSearchMutation.data?.matches) {
      return inStockMedicines
        .filter((med) => aiMatchMap.has(med.id))
        .sort((a, b) => {
          const relOrder = { high: 0, medium: 1, low: 2 };
          const aRel = aiMatchMap.get(a.id)?.relevance || "low";
          const bRel = aiMatchMap.get(b.id)?.relevance || "low";
          return (relOrder[aRel as keyof typeof relOrder] ?? 2) - (relOrder[bRel as keyof typeof relOrder] ?? 2);
        });
    }

    let filtered = inStockMedicines;

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

    if (medicineSearch.trim()) {
      const q = medicineSearch.toLowerCase();
      filtered = filtered.filter(
        (med) =>
          med.name.toLowerCase().includes(q) ||
          (med.brand || "").toLowerCase().includes(q) ||
          (med.genericName || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [inStockMedicines, selectedCategory, medicineSearch, aiSearchEnabled, aiSearchMutation.data, aiMatchMap]);

  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/medlab/sales", data);
    },
    onSuccess: async (response) => {
      const sale = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/stats"] });
      setCompletedSale({
        invoiceNumber: sale.invoiceNumber,
        items: sale.items,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        total: sale.total,
        paymentMode: sale.paymentMode,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        createdAt: sale.createdAt,
      });
      toast({ title: "Sale completed", description: `Invoice: ${sale.invoiceNumber}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete sale.", variant: "destructive" });
    },
  });

  const addToCart = useCallback((med: Medicine) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.medicineId === med.id);
      if (existing) {
        if (existing.quantity >= (med.stock ?? 0)) {
          toast({ title: "Stock limit", description: "Cannot add more than available stock.", variant: "destructive" });
          return prev;
        }
        return prev.map((item) =>
          item.medicineId === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if ((med.stock ?? 0) <= 0) {
        toast({ title: "Out of stock", description: `${med.name} is out of stock.`, variant: "destructive" });
        return prev;
      }
      return [
        ...prev,
        {
          medicineId: med.id,
          name: med.name,
          price: Number(med.sellingPrice),
          quantity: 1,
          maxStock: med.stock ?? 0,
        },
      ];
    });
  }, [toast]);

  const updateQuantity = (medicineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicineId !== medicineId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.maxStock) {
            toast({ title: "Stock limit", description: "Cannot exceed available stock.", variant: "destructive" });
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = parseFloat(discount) || 0;
  const taxRate = 0.05;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount > 0 ? taxableAmount * taxRate : 0;
  const total = taxableAmount + taxAmount;

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast({ title: "Empty cart", description: "Add medicines to cart before completing sale.", variant: "destructive" });
      return;
    }
    if (!organization?.id) return;

    createSaleMutation.mutate({
      organizationId: organization.id,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      items: cart.map((item) => ({
        medicineId: item.medicineId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal: subtotal.toFixed(2),
      discount: discountAmount.toFixed(2),
      tax: taxAmount.toFixed(2),
      total: total.toFixed(2),
      paymentMode,
      paymentStatus: "paid",
    });
  };

  const resetSale = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount("");
    setPaymentMode("cash");
    setCompletedSale(null);
    setWhatsappPhone("");
    setInteractionWarnings([]);
    setInteractionsOpen(false);
  };

  const handleAiSearch = () => {
    if (!medicineSearch.trim() || !organization?.id) return;
    aiSearchMutation.mutate({ query: medicineSearch, organizationId: organization.id });
  };

  const handleCheckInteractions = () => {
    if (cart.length < 2) {
      toast({ title: "Need more items", description: "Add at least 2 medicines to check interactions.", variant: "destructive" });
      return;
    }
    const meds = cart.map((item) => {
      const found = activeMedicines.find((m) => m.id === item.medicineId);
      return { name: item.name, genericName: found?.genericName || undefined };
    });
    interactionCheckMutation.mutate({ medicines: meds });
  };

  const handleBarcodeDetected = useCallback(
    (barcode: string) => {
      if (!organization?.id) return;
      setScannerOpen(false);
      fetch(`/api/medlab/medicines/by-barcode?barcode=${encodeURIComponent(barcode)}&organizationId=${organization.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Not found");
          return res.json();
        })
        .then((med: Medicine) => {
          addToCart(med);
          toast({ title: "Medicine found", description: `${med.name} added to cart.` });
        })
        .catch(() => {
          toast({ title: "Not found", description: `No medicine found for barcode: ${barcode}`, variant: "destructive" });
        });
    },
    [organization?.id, addToCart, toast]
  );

  useEffect(() => {
    if (!scannerOpen) {
      setScannerError(null);
      setScannerLoading(false);
      setManualBarcode("");
      return;
    }

    let stopped = false;
    let onDetected: ((result: any) => void) | null = null;
    setScannerError(null);
    setScannerLoading(true);

    const initScanner = () => {
      if (stopped || !scannerRef.current) {
        if (!stopped) {
          setScannerError("Scanner element not ready. Please try again or enter the barcode manually.");
          setScannerLoading(false);
        }
        return;
      }

      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              facingMode: "environment",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          },
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader", "upc_e_reader"],
          },
          locate: true,
          frequency: 10,
        },
        (err: any) => {
          if (stopped) return;
          if (err) {
            console.error("Quagga init error:", err);
            const msg = err?.message || String(err);
            if (msg.includes("Permission") || msg.includes("NotAllowed")) {
              setScannerError("Camera permission denied. Please allow camera access or enter the barcode manually below.");
            } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
              setScannerError("No camera found on this device. Please enter the barcode manually below.");
            } else if (msg.includes("NotReadable") || msg.includes("TrackStartError")) {
              setScannerError("Camera is in use by another app. Please close it and try again, or enter the barcode manually.");
            } else {
              setScannerError("Could not start camera. Please enter the barcode manually below.");
            }
            setScannerLoading(false);
            return;
          }

          setScannerLoading(false);
          Quagga.start();

          onDetected = (result: any) => {
            const code = result?.codeResult?.code;
            if (code && !stopped) {
              stopped = true;
              if (onDetected) Quagga.offDetected(onDetected);
              try { Quagga.stop(); } catch {}
              setScannerOpen(false);
              handleBarcodeDetected(code);
            }
          };

          Quagga.onDetected(onDetected);
        }
      );
    };

    const timer = setTimeout(initScanner, 500);

    return () => {
      stopped = true;
      clearTimeout(timer);
      try {
        if (onDetected) Quagga.offDetected(onDetected);
        Quagga.stop();
      } catch {}
    };
  }, [scannerOpen, handleBarcodeDetected]);

  const getSeverityColor = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === "high" || s === "severe" || s === "major") return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    if (s === "moderate" || s === "medium") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  };

  const generateBillText = (sale: CompletedSale) => {
    const orgName = organization?.pharmacyName || organization?.name || "Store";
    let text = `${orgName}\n`;
    if (organization?.address) text += `${organization.address}\n`;
    if (organization?.city || organization?.state) text += `${[organization?.city, organization?.state].filter(Boolean).join(", ")}\n`;
    if (organization?.phone) text += `Ph: ${organization.phone}\n`;
    text += `\nINVOICE: ${sale.invoiceNumber}\n`;
    text += `Date: ${new Date(sale.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}\n`;
    if (sale.customerName) text += `Customer: ${sale.customerName}\n`;
    text += `\n--- Items ---\n`;
    sale.items.forEach((item, i) => {
      text += `${i + 1}. ${item.name} x${item.quantity} @ ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}\n`;
    });
    text += `\nSubtotal: ${formatCurrency(parseFloat(sale.subtotal))}`;
    if (parseFloat(sale.discount) > 0) text += `\nDiscount: -${formatCurrency(parseFloat(sale.discount))}`;
    text += `\nTax (GST 5%): ${formatCurrency(parseFloat(sale.tax))}`;
    text += `\nTotal: ${formatCurrency(parseFloat(sale.total))}`;
    text += `\nPayment: ${sale.paymentMode.toUpperCase()}`;
    text += `\n\nThank you for your purchase!`;
    return text;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = (sale: CompletedSale) => {
    const phone = sale.customerPhone || whatsappPhone;
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCode = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = generateBillText(sale);
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleEmail = (sale: CompletedSale) => {
    const text = generateBillText(sale);
    const subject = `Invoice ${sale.invoiceNumber} - ${organization?.pharmacyName || organization?.name || "Store"}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, "_self");
  };

  if (completedSale) {
    return (
      <>
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            [data-print-bill], [data-print-bill] * { visibility: visible !important; }
            [data-print-bill] { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20px !important; }
            [data-no-print] { display: none !important; }
          }
        `}</style>
        <div className="p-4 md:p-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-2" data-no-print>
            <CheckCircle2 className="h-6 w-6" />
            <h2 className="text-xl font-semibold" data-testid="text-sale-success">Sale Completed!</h2>
          </div>

          <Card className="max-w-2xl w-full" ref={billRef} data-print-bill>
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-foreground">{organization?.pharmacyName || organization?.name || "Store"}</h3>
                {organization?.address && <p className="text-xs text-muted-foreground">{organization.address}</p>}
                {(organization?.city || organization?.state) && (
                  <p className="text-xs text-muted-foreground">{[organization?.city, organization?.state].filter(Boolean).join(", ")}</p>
                )}
                {organization?.phone && <p className="text-xs text-muted-foreground">Ph: {organization.phone}</p>}
                {organization?.email && <p className="text-xs text-muted-foreground">{organization.email}</p>}
                {organization?.gstNumber && <p className="text-xs text-muted-foreground">GSTIN: {organization.gstNumber}</p>}
                {organization?.licenseNumber && <p className="text-xs text-muted-foreground">License: {organization.licenseNumber}</p>}
              </div>

              <Separator />

              <div className="text-center">
                <h4 className="text-base font-semibold tracking-wide">INVOICE</h4>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice No: </span>
                  <span className="font-medium" data-testid="text-invoice-number">{completedSale.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date: </span>
                  <span className="font-medium">{new Date(completedSale.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>

              {(completedSale.customerName || completedSale.customerPhone) && (
                <div className="text-sm space-y-0.5">
                  {completedSale.customerName && (
                    <p><span className="text-muted-foreground">Customer: </span><span className="font-medium">{completedSale.customerName}</span></p>
                  )}
                  {completedSale.customerPhone && (
                    <p><span className="text-muted-foreground">Phone: </span><span className="font-medium">{completedSale.customerPhone}</span></p>
                  )}
                </div>
              )}

              <Separator />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">S.No</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedSale.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(parseFloat(completedSale.subtotal))}</span>
                </div>
                {parseFloat(completedSale.discount) > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-emerald-600 dark:text-emerald-400">-{formatCurrency(parseFloat(completedSale.discount))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Tax (GST 5%)</span>
                  <span>{formatCurrency(parseFloat(completedSale.tax))}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-2 font-semibold text-base">
                  <span>Grand Total</span>
                  <span>{formatCurrency(parseFloat(completedSale.total))}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <Badge variant="outline">
                  {completedSale.paymentMode === "cash" && <Banknote className="h-3 w-3 mr-1" />}
                  {completedSale.paymentMode === "card" && <CreditCard className="h-3 w-3 mr-1" />}
                  {completedSale.paymentMode === "upi" && <Smartphone className="h-3 w-3 mr-1" />}
                  {completedSale.paymentMode.toUpperCase()}
                </Badge>
              </div>

              <Separator />

              <p className="text-center text-sm text-muted-foreground">Thank you for your purchase!</p>
            </CardContent>
          </Card>

          <div className="max-w-2xl w-full space-y-3" data-no-print>
            {!completedSale.customerPhone && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter phone for WhatsApp"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="flex-1"
                  data-testid="input-whatsapp-phone"
                />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handlePrint} variant="outline" data-testid="button-print-bill">
                <Printer className="h-4 w-4 mr-2" />
                Print Bill
              </Button>
              <Button
                onClick={() => handleWhatsApp(completedSale)}
                variant="outline"
                disabled={!completedSale.customerPhone && !whatsappPhone}
                data-testid="button-share-whatsapp"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button onClick={() => handleEmail(completedSale)} variant="outline" data-testid="button-share-email">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button onClick={resetSale} data-testid="button-new-sale">
                <ShoppingCart className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-medlab-sales-title">
          Medicine Sale
        </h1>
        <p className="text-muted-foreground text-sm">Point of sale for medicine billing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base font-medium">Medicine Catalog</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant={cameraOpen ? "default" : "outline"}
                    onClick={() => setCameraOpen(true)}
                    data-testid="button-camera-scan"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={scannerOpen ? "default" : "outline"}
                    onClick={() => setScannerOpen(true)}
                    data-testid="button-barcode-scan"
                  >
                    <ScanBarcode className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    className="toggle-elevate"
                    onClick={() => setViewMode("grid")}
                    data-testid="button-view-grid"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={viewMode === "list" ? "default" : "outline"}
                    className="toggle-elevate"
                    onClick={() => setViewMode("list")}
                    data-testid="button-view-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={aiSearchEnabled ? "Describe symptoms or medicine use..." : "Search by name, brand, or generic name..."}
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && aiSearchEnabled) handleAiSearch();
                    }}
                    className="pl-9"
                    data-testid="input-search-sale-medicine"
                  />
                </div>
                <Button
                  variant={aiSearchEnabled ? "default" : "outline"}
                  className="toggle-elevate gap-1"
                  onClick={() => {
                    setAiSearchEnabled(!aiSearchEnabled);
                    if (!aiSearchEnabled) {
                      aiSearchMutation.reset();
                    }
                  }}
                  data-testid="button-ai-search-toggle"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">AI</span>
                </Button>
                {aiSearchEnabled && (
                  <Button
                    onClick={handleAiSearch}
                    disabled={!medicineSearch.trim() || aiSearchMutation.isPending}
                    data-testid="button-ai-search-submit"
                  >
                    {aiSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    className="cursor-pointer toggle-elevate"
                    onClick={() => setSelectedCategory(cat)}
                    data-testid={`badge-category-${cat.toLowerCase()}`}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>

              {medicinesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                  ))}
                </div>
              ) : aiSearchMutation.isPending ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Searching with AI...
                </div>
              ) : filteredMedicines.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No medicines found</p>
                  {medicineSearch && <p className="text-xs mt-1">Try adjusting your search or filters</p>}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {filteredMedicines.map((med) => (
                    <div
                      key={med.id}
                      className="border rounded-md p-2.5 cursor-pointer hover-elevate flex flex-col justify-between gap-1.5"
                      onClick={() => addToCart(med)}
                      data-testid={`card-medicine-${med.id}`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate" title={med.name}>{med.name}</p>
                        {med.brand && (
                          <p className="text-xs text-muted-foreground truncate">{med.brand}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {med.strength || ""} {med.form || ""}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {aiSearchEnabled && aiMatchMap.has(med.id) && (
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 no-default-active-elevate ${
                              aiMatchMap.get(med.id)?.relevance === "high" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                              aiMatchMap.get(med.id)?.relevance === "medium" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {aiMatchMap.get(med.id)?.relevance}
                            </Badge>
                          )}
                          {(med.stock ?? 0) <= (med.reorderLevel ?? 10) && (med.stock ?? 0) > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 no-default-active-elevate">
                              Low
                            </Badge>
                          )}
                          {isExpiringSoon(med.expiryDate) && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 no-default-active-elevate">
                              Expiring
                            </Badge>
                          )}
                          {isExpired(med.expiryDate) && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 no-default-active-elevate">
                              Expired
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-semibold">{formatCurrency(Number(med.sellingPrice))}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-active-elevate">
                            {med.stock ?? 0}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(med);
                          }}
                          data-testid={`button-add-to-cart-${med.id}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
                  {filteredMedicines.map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between gap-3 p-2.5 hover-elevate cursor-pointer"
                      onClick={() => addToCart(med)}
                      data-testid={`row-medicine-${med.id}`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{med.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {med.brand ? `${med.brand} - ` : ""}
                          {med.strength || ""} {med.form || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {aiSearchEnabled && aiMatchMap.has(med.id) && (
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 no-default-active-elevate ${
                            aiMatchMap.get(med.id)?.relevance === "high" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                            aiMatchMap.get(med.id)?.relevance === "medium" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {aiMatchMap.get(med.id)?.relevance}
                          </Badge>
                        )}
                        {(med.stock ?? 0) <= (med.reorderLevel ?? 10) && (med.stock ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 no-default-active-elevate">
                            Low
                          </Badge>
                        )}
                        <span className="text-sm font-medium whitespace-nowrap">{formatCurrency(Number(med.sellingPrice))}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-active-elevate">
                          {med.stock ?? 0}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(med);
                          }}
                          data-testid={`button-add-to-cart-${med.id}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base font-medium">
                  Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
                </CardTitle>
                {cart.length >= 2 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCheckInteractions}
                    disabled={interactionCheckMutation.isPending}
                    data-testid="button-check-interactions"
                  >
                    {interactionCheckMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Shield className="h-3.5 w-3.5 mr-1" />
                    )}
                    AI Check Interactions
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {interactionWarnings.length > 0 && (
                <div className="px-4 pb-2">
                  <Collapsible open={interactionsOpen} onOpenChange={setInteractionsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2" data-testid="button-toggle-interactions">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">{interactionWarnings.length} interaction warning{interactionWarnings.length !== 1 ? "s" : ""} found</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 mt-2">
                        {interactionWarnings.map((warning, idx) => (
                          <div
                            key={idx}
                            className="border rounded-md p-2.5 space-y-1"
                            data-testid={`interaction-warning-${idx}`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={getSeverityColor(warning.severity) + " no-default-active-elevate"}>
                                {warning.severity}
                              </Badge>
                              <span className="text-xs font-medium">
                                {warning.drug1} + {warning.drug2}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{warning.description}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                  <p className="text-xs mt-1">Click on medicines above to add them</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.medicineId} data-testid={`cart-item-${item.medicineId}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.medicineId, -1)}
                              data-testid={`button-qty-minus-${item.medicineId}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium" data-testid={`text-qty-${item.medicineId}`}>
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => updateQuantity(item.medicineId, 1)}
                              data-testid={`button-qty-plus-${item.medicineId}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeFromCart(item.medicineId)}
                            data-testid={`button-remove-${item.medicineId}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Name (Optional)</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  data-testid="input-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                  data-testid="input-customer-phone"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-medium" data-testid="text-subtotal">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Discount</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-28 text-right"
                    placeholder="0"
                    data-testid="input-discount"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">GST (5%)</span>
                  <span className="text-sm" data-testid="text-tax">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold" data-testid="text-total">
                    {formatCurrency(total > 0 ? total : 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={paymentMode === "cash" ? "default" : "outline"}
                    className="toggle-elevate"
                    onClick={() => setPaymentMode("cash")}
                    data-testid="button-payment-cash"
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Cash
                  </Button>
                  <Button
                    variant={paymentMode === "upi" ? "default" : "outline"}
                    className="toggle-elevate"
                    onClick={() => setPaymentMode("upi")}
                    data-testid="button-payment-upi"
                  >
                    <Smartphone className="h-4 w-4 mr-1" />
                    UPI
                  </Button>
                  <Button
                    variant={paymentMode === "card" ? "default" : "outline"}
                    className="toggle-elevate"
                    onClick={() => setPaymentMode("card")}
                    data-testid="button-payment-card"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Card
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || createSaleMutation.isPending}
                data-testid="button-complete-sale"
              >
                {createSaleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <IndianRupee className="h-4 w-4 mr-2" />
                )}
                Complete Sale
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5" />
              Scan Barcode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!scannerError && (
              <div className="relative">
                <div
                  ref={scannerRef}
                  className="w-full aspect-[4/3] bg-muted rounded-md overflow-hidden"
                  data-testid="barcode-scanner-viewport"
                />
                {scannerLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted rounded-md">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Starting camera...</p>
                  </div>
                )}
              </div>
            )}
            {scannerError && (
              <div className="flex flex-col items-center gap-2 p-6 bg-muted rounded-md text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <p className="text-sm text-muted-foreground">{scannerError}</p>
              </div>
            )}
            {!scannerError && !scannerLoading && (
              <p className="text-xs text-muted-foreground text-center">
                Point your camera at the medicine barcode
              </p>
            )}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center font-medium">Or enter barcode manually</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter barcode number..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualBarcode.trim()) {
                      setScannerOpen(false);
                      handleBarcodeDetected(manualBarcode.trim());
                      setManualBarcode("");
                    }
                  }}
                  data-testid="input-manual-barcode"
                />
                <Button
                  onClick={() => {
                    if (manualBarcode.trim()) {
                      setScannerOpen(false);
                      handleBarcodeDetected(manualBarcode.trim());
                      setManualBarcode("");
                    }
                  }}
                  disabled={!manualBarcode.trim()}
                  data-testid="button-submit-barcode"
                >
                  Search
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setScannerOpen(false)}
              data-testid="button-close-scanner"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MedicineCamera
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        mode="multi"
        onIdentified={(result) => {
          const identifiedName = (result.name || "").toLowerCase().trim();
          const identifiedGeneric = (result.genericName || "").toLowerCase().trim();
          const identifiedBrand = (result.brand || "").toLowerCase().trim();
          const searchTerm = identifiedName || identifiedGeneric || identifiedBrand;

          if (!searchTerm) return;

          const match = medicines.find((med) => {
            const medName = (med.name || "").toLowerCase();
            const medGeneric = (med.genericName || "").toLowerCase();
            const medBrand = (med.brand || "").toLowerCase();

            const nameMatch = identifiedName && (
              medName.includes(identifiedName) || identifiedName.includes(medName)
            );
            const genericMatch = identifiedGeneric && (
              medGeneric.includes(identifiedGeneric) || identifiedGeneric.includes(medGeneric)
            );
            const brandMatch = identifiedBrand && medBrand && (
              medBrand.includes(identifiedBrand) || identifiedBrand.includes(medBrand)
            );

            return nameMatch || genericMatch || brandMatch;
          });

          if (match) {
            addToCart(match);
            toast({ title: "Medicine found", description: `Added ${match.name} to cart.` });
          } else {
            setMedicineSearch(searchTerm);
            toast({
              title: "Not in inventory",
              description: `"${result.name || result.genericName || result.brand}" not found in inventory.`,
              variant: "destructive",
            });
          }
        }}
      />
    </div>
  );
}
