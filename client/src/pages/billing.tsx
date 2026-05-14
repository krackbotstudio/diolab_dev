import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ViewSwitcher, useViewMode, InlineEditCell } from "@/components/view-switcher";
import {
  Search,
  Plus,
  Receipt,
  IndianRupee,
  Trash2,
  Loader2,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Phone,
  Package,
  FlaskConical,
  Minus,
  ShoppingCart,
  X,
  Printer,
  Share2,
  Pencil,
  MessageCircle,
  Download,
  Calendar,
} from "lucide-react";
import type { Bill, Patient, Test, TestPackage, Organization } from "@shared/schema";

interface BillItem {
  testId: string;
  testName: string;
  price: number;
  quantity: number;
  isPackage?: boolean;
  packageTestIds?: string[];
}

const getPaymentStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Billing() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useViewMode("billing");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStep, setPaymentStep] = useState<"select" | "confirm">("select");
  const [patientSearch, setPatientSearch] = useState("");
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/bills"],
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const { data: packages = [] } = useQuery<TestPackage[]>({
    queryKey: ["/api/packages"],
  });

  const { data: orgData } = useQuery<{ organization: Organization; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const createBillMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/bills", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Bill created",
        description: "Invoice has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/bills/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/samples"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Bill updated",
        description: "Invoice has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bill. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPatient(null);
    setBillItems([]);
    setPaymentMethod("");
    setPaymentStep("select");
    setPatientSearch("");
    setTestSearch("");
    setSelectedCategory("all");
    setEditingBillId(null);
  };

  // Get unique categories from tests
  const categories = useMemo(() => {
    const cats = new Set(tests.map((t) => t.category || "Other"));
    return ["all", ...Array.from(cats)];
  }, [tests]);

  // Filter tests based on search and category
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const matchesSearch =
        testSearch === "" ||
        test.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        test.code?.toLowerCase().includes(testSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || test.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tests, testSearch, selectedCategory]);

  // Filter packages based on search
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) =>
      pkg.name.toLowerCase().includes(testSearch.toLowerCase())
    );
  }, [packages, testSearch]);

  const addTest = (test: Test) => {
    const existingItem = billItems.find(
      (item) => item.testId === test.id && !item.isPackage
    );
    if (existingItem) {
      setBillItems(
        billItems.map((item) =>
          item.testId === test.id && !item.isPackage
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setBillItems([
        ...billItems,
        {
          testId: test.id,
          testName: test.name,
          price: parseFloat(String(test.price)),
          quantity: 1,
          isPackage: false,
        },
      ]);
    }
  };

  const addPackage = (pkg: TestPackage) => {
    // Add package as a line item for billing display
    const existingItem = billItems.find(
      (item) => item.testId === pkg.id && item.isPackage
    );
    if (existingItem) {
      setBillItems(
        billItems.map((item) =>
          item.testId === pkg.id && item.isPackage
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Add the package as a line item
      const newItems: BillItem[] = [{
        testId: pkg.id,
        testName: pkg.name,
        price: parseFloat(String(pkg.discountedPrice)),
        quantity: 1,
        isPackage: true,
        packageTestIds: pkg.testIds as string[], // Store constituent test IDs
      }];
      setBillItems([...billItems, ...newItems]);
    }
  };

  const updateQuantity = (testId: string, isPackage: boolean, delta: number) => {
    setBillItems(
      billItems
        .map((item) => {
          if (item.testId === testId && item.isPackage === isPackage) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as BillItem[]
    );
  };

  const removeItem = (testId: string, isPackage: boolean) => {
    setBillItems(
      billItems.filter(
        (item) => !(item.testId === testId && item.isPackage === isPackage)
      )
    );
  };

  const subtotal = billItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal;

  const handleSubmit = () => {
    if (!selectedPatient || billItems.length === 0) {
      toast({
        title: "Incomplete form",
        description: "Please select a patient and add at least one test.",
        variant: "destructive",
      });
      return;
    }

    const billData = {
      patientId: selectedPatient.id,
      items: billItems,
      subtotal: subtotal.toString(),
      totalAmount: total.toString(),
      paidAmount: total.toString(),
      dueAmount: "0",
      paymentMethod,
      paymentStatus: "paid",
    };

    if (editingBillId) {
      updateBillMutation.mutate({ id: editingBillId, data: billData });
    } else {
      createBillMutation.mutate(billData);
    }
  };

  const handleViewBill = (bill: Bill) => {
    setViewingBill(bill);
    setIsDetailDialogOpen(true);
  };

  const handlePrintBill = (bill: Bill) => {
    const patient = patients.find((p) => p.id === bill.patientId);
    const items = (bill.items as BillItem[]) || [];
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Pop-up blocked",
        description: "Please allow pop-ups to print the bill",
        variant: "destructive",
      });
      return;
    }

    const primaryColor = organization?.primaryColor || "#2DD4BF";
    const headerColor = organization?.headerColor || "#0D9488";
    const accentColor = organization?.accentColor || "#0F766E";
    const orgName = organization?.name || "Healthcare Center";
    const orgAddress = organization?.address || "";
    const orgPhone = organization?.phone || "";
    const orgEmail = organization?.email || "";
    const showLogo = organization?.showLogo !== false;
    const logoUrl = organization?.logo || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${bill.billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${headerColor}; padding-bottom: 20px; }
          .header-content { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 10px; }
          .header-logo { max-height: 60px; max-width: 120px; object-fit: contain; }
          .org-name { color: ${headerColor}; margin: 0; font-size: 24px; font-weight: bold; }
          .org-details { color: #666; font-size: 12px; margin-top: 5px; }
          .invoice-title { color: ${primaryColor}; font-size: 18px; font-weight: bold; margin-top: 15px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-block { background: #f5f5f5; padding: 15px; border-radius: 8px; flex: 1; margin: 0 5px; border-left: 4px solid ${accentColor}; }
          .info-block strong { color: ${headerColor}; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: ${headerColor}; color: white; }
          .total-row { font-weight: bold; background: ${primaryColor}15; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid ${accentColor}; color: #666; }
          .footer-brand { color: ${headerColor}; font-weight: bold; }
          @media print { body { padding: 0; } .header { border-bottom-color: ${headerColor}; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="header-logo" />` : ""}
            <div>
              <h1 class="org-name">${orgName}</h1>
              <p class="org-details">
                ${orgAddress ? orgAddress + " | " : ""}${orgPhone ? orgPhone : ""}${orgEmail ? " | " + orgEmail : ""}
              </p>
            </div>
          </div>
          <p class="invoice-title">INVOICE: ${bill.billNumber}</p>
        </div>
        <div class="info">
          <div class="info-block">
            <strong>Patient Details:</strong><br>
            ${patient?.firstName || ""} ${patient?.lastName || ""}<br>
            Phone: ${patient?.phone || "-"}
            ${patient?.email ? `<br>Email: ${patient.email}` : ""}
          </div>
          <div class="info-block">
            <strong>Invoice Details:</strong><br>
            Date: ${bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-IN") : "-"}<br>
            Status: ${bill.paymentStatus || "Pending"}<br>
            Payment: ${bill.paymentMethod || "-"}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Test/Service</th><th>Price</th><th>Qty</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td>${item.testName}${item.isPackage ? " (Package)" : ""}</td>
                <td>₹${Number(item.price).toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>₹${(Number(item.price) * item.quantity).toFixed(2)}</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td colspan="3" style="text-align: right;"><strong>Subtotal</strong></td>
              <td>₹${Number(bill.subtotal || bill.totalAmount).toFixed(2)}</td>
            </tr>
            ${Number(bill.discountAmount) > 0 ? `
            <tr>
              <td colspan="3" style="text-align: right;">Discount</td>
              <td>-₹${Number(bill.discountAmount).toFixed(2)}</td>
            </tr>` : ""}
            <tr class="total-row" style="background: ${primaryColor}25;">
              <td colspan="3" style="text-align: right;"><strong>Total Amount</strong></td>
              <td style="font-size: 16px;"><strong>₹${Number(bill.totalAmount).toFixed(2)}</strong></td>
            </tr>
            ${Number(bill.dueAmount) > 0 ? `
            <tr>
              <td colspan="3" style="text-align: right;">Amount Paid</td>
              <td>₹${(Number(bill.totalAmount) - Number(bill.dueAmount)).toFixed(2)}</td>
            </tr>
            <tr style="color: #dc2626;">
              <td colspan="3" style="text-align: right;"><strong>Balance Due</strong></td>
              <td><strong>₹${Number(bill.dueAmount).toFixed(2)}</strong></td>
            </tr>` : ""}
          </tbody>
        </table>
        <div class="footer">
          <p>Thank you for choosing <span class="footer-brand">${orgName}</span>!</p>
          <p style="font-size: 11px; color: #999;">This is a computer generated invoice.</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadBill = (bill: Bill) => {
    const patient = patients.find((p) => p.id === bill.patientId);
    const items = (bill.items as BillItem[]) || [];
    
    const primaryColor = organization?.primaryColor || "#2DD4BF";
    const headerColor = organization?.headerColor || "#0D9488";
    const accentColor = organization?.accentColor || "#0F766E";
    const orgName = organization?.name || "Healthcare Center";
    const orgAddress = organization?.address || "";
    const orgPhone = organization?.phone || "";
    const orgEmail = organization?.email || "";
    const showLogo = organization?.showLogo !== false;
    const logoUrl = organization?.logo || "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${bill.billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; background: white; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${headerColor}; padding-bottom: 20px; }
          .header-content { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 10px; }
          .header-logo { max-height: 60px; max-width: 120px; object-fit: contain; }
          .org-name { color: ${headerColor}; margin: 0; font-size: 24px; font-weight: bold; }
          .org-details { color: #666; font-size: 12px; margin-top: 5px; }
          .invoice-title { color: ${primaryColor}; font-size: 18px; font-weight: bold; margin-top: 15px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .info-block { background: #f5f5f5; padding: 15px; border-radius: 8px; flex: 1; margin: 0 5px; border-left: 4px solid ${accentColor}; }
          .info-block strong { color: ${headerColor}; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: ${headerColor}; color: white; }
          .total-row { font-weight: bold; background: ${primaryColor}15; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid ${accentColor}; color: #666; }
          .footer-brand { color: ${headerColor}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="${orgName}" class="header-logo" />` : ""}
            <div>
              <h1 class="org-name">${orgName}</h1>
              <p class="org-details">
                ${orgAddress ? orgAddress + " | " : ""}${orgPhone ? orgPhone : ""}${orgEmail ? " | " + orgEmail : ""}
              </p>
            </div>
          </div>
          <p class="invoice-title">INVOICE: ${bill.billNumber}</p>
        </div>
        <div class="info">
          <div class="info-block">
            <strong>Patient Details:</strong><br>
            ${patient?.firstName || ""} ${patient?.lastName || ""}<br>
            Phone: ${patient?.phone || "-"}
          </div>
          <div class="info-block">
            <strong>Invoice Details:</strong><br>
            Date: ${bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-IN") : "-"}<br>
            Status: ${bill.paymentStatus || "Pending"}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Test/Service</th><th>Price</th><th>Qty</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td>${item.testName}</td>
                <td>₹${Number(item.price).toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>₹${(Number(item.price) * item.quantity).toFixed(2)}</td>
              </tr>
            `).join("")}
            <tr class="total-row" style="background: ${primaryColor}25;">
              <td colspan="3" style="text-align: right;"><strong>Total Amount</strong></td>
              <td><strong>₹${Number(bill.totalAmount).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Thank you for choosing <span class="footer-brand">${orgName}</span>!</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${bill.billNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Bill downloaded",
      description: `Saved as invoice-${bill.billNumber}.html - Open in browser to print as PDF`,
    });
  };

  const handleShareWhatsApp = (bill: Bill) => {
    const patient = patients.find((p) => p.id === bill.patientId);
    const items = (bill.items as BillItem[]) || [];
    const orgName = organization?.name || "Healthcare Center";
    
    const message = `
*${orgName}*
*Invoice: ${bill.billNumber}*
Date: ${bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-IN") : "-"}

*Patient:* ${patient?.firstName || ""} ${patient?.lastName || ""}

*Tests/Services:*
${items.map((item) => `- ${item.testName} - Rs.${(Number(item.price) * item.quantity).toFixed(2)}`).join("\n")}

*Total: Rs.${Number(bill.totalAmount).toFixed(2)}*
${bill.dueAmount && Number(bill.dueAmount) > 0 ? `Balance Due: Rs.${Number(bill.dueAmount).toFixed(2)}` : "Paid in full"}

Thank you for choosing ${orgName}!
    `.trim();

    const phone = patient?.phone?.replace(/\D/g, "") || "";
    const whatsappUrl = phone
      ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, "_blank");
  };

  const handleEditBill = (bill: Bill) => {
    setIsDetailDialogOpen(false);
    setViewingBill(null);
    
    const patient = patients.find((p) => p.id === bill.patientId);
    if (patient) {
      setSelectedPatient(patient);
    }
    
    const items = (bill.items as BillItem[]) || [];
    setBillItems(items);
    setPaymentMethod(bill.paymentMethod || "");
    setEditingBillId(bill.id);
    setIsDialogOpen(true);
  };

  const filteredBills = bills.filter((bill) =>
    bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPatients = patients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.lastName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
          <p className="text-muted-foreground">
            Create invoices and manage payments
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button data-testid="button-new-bill">
              <Plus className="h-4 w-4 mr-2" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{editingBillId ? "Edit Bill" : "Create New Bill"}</DialogTitle>
              <DialogDescription>
                {editingBillId ? "Update bill items and payment details" : "POS-style billing - search and add tests quickly"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex gap-4 mt-4">
              {/* Left Panel - Test/Package Selection */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Patient Selection */}
                <div className="space-y-2 mb-4">
                  <Label className="text-sm font-medium">
                    Select Patient *
                  </Label>
                  {selectedPatient ? (
                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-primary/5 border-primary/30">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPatient.phone}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPatient(null)}
                        data-testid="button-change-patient"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search patient by name or phone..."
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-patient"
                        />
                      </div>
                      {patientSearch && (
                        <div className="border rounded-lg max-h-32 overflow-y-auto">
                          {filteredPatients.length === 0 ? (
                            <p className="p-3 text-sm text-muted-foreground text-center">
                              No patients found
                            </p>
                          ) : (
                            filteredPatients.slice(0, 5).map((patient) => (
                              <button
                                key={patient.id}
                                className="w-full p-2 text-left hover:bg-muted/50 flex items-center gap-2 border-b last:border-b-0"
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setPatientSearch("");
                                }}
                                data-testid={`select-patient-${patient.id}`}
                              >
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {patient.firstName[0]}
                                    {patient.lastName[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {patient.firstName} {patient.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {patient.phone}
                                  </p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Test/Package Search */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tests or packages..."
                      value={testSearch}
                      onChange={(e) => setTestSearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-tests"
                    />
                  </div>

                  {/* Category Tabs */}
                  <Tabs
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
                      {categories.slice(0, 6).map((cat) => (
                        <TabsTrigger
                          key={cat}
                          value={cat}
                          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-7 px-3 text-xs capitalize"
                          data-testid={`tab-category-${cat}`}
                        >
                          {cat}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  {/* Tests and Packages Grid */}
                  <ScrollArea className="h-[280px]">
                    <div className="space-y-3">
                      {/* Packages Section */}
                      {filteredPackages.length > 0 &&
                        (testSearch || selectedCategory === "all") && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">
                                Packages
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {filteredPackages.slice(0, 4).map((pkg) => (
                                <button
                                  key={pkg.id}
                                  onClick={() => addPackage(pkg)}
                                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
                                  data-testid={`add-package-${pkg.id}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                      <Package className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {pkg.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {(pkg.testIds as string[])?.length || 0}{" "}
                                        tests included
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-primary">
                                      ₹{pkg.discountedPrice}
                                    </span>
                                    <Plus className="h-4 w-4" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Tests Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FlaskConical className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Tests</span>
                          <Badge variant="secondary" className="text-xs">
                            {filteredTests.length}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {filteredTests.map((test) => {
                            const inCart = billItems.find(
                              (i) => i.testId === test.id && !i.isPackage
                            );
                            return (
                              <button
                                key={test.id}
                                onClick={() => addTest(test)}
                                className={`flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-colors text-left ${
                                  inCart
                                    ? "bg-primary/5 border-primary/30"
                                    : ""
                                }`}
                                data-testid={`add-test-${test.id}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                                    <FlaskConical className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {test.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {test.category}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-medium text-primary text-sm">
                                    ₹{test.price}
                                  </span>
                                  {inCart ? (
                                    <Badge
                                      variant="secondary"
                                      className="h-5 px-1.5"
                                    >
                                      {inCart.quantity}
                                    </Badge>
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Right Panel - Cart */}
              <div className="w-72 flex flex-col border-l pl-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Cart</h3>
                  {billItems.length > 0 && (
                    <Badge>{billItems.length}</Badge>
                  )}
                </div>

                {billItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mb-2 opacity-30" />
                    <p className="text-sm">No items added</p>
                    <p className="text-xs">
                      Click on tests or packages to add
                    </p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2 pr-2">
                        {billItems.map((item) => (
                          <div
                            key={`${item.testId}-${item.isPackage}`}
                            className="p-2 border rounded-lg space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {item.isPackage ? (
                                  <Package className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <FlaskConical className="h-4 w-4 shrink-0" />
                                )}
                                <span className="text-sm font-medium truncate">
                                  {item.testName}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() =>
                                  removeItem(item.testId, item.isPackage || false)
                                }
                                data-testid={`remove-item-${item.testId}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    updateQuantity(
                                      item.testId,
                                      item.isPackage || false,
                                      -1
                                    )
                                  }
                                  data-testid={`qty-minus-${item.testId}`}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    updateQuantity(
                                      item.testId,
                                      item.isPackage || false,
                                      1
                                    )
                                  }
                                  data-testid={`qty-plus-${item.testId}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="font-medium text-sm">
                                ₹{(item.price * item.quantity).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Summary */}
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span className="text-primary">
                          ₹{total.toFixed(0)}
                        </span>
                      </div>

                      {/* Payment Method Selection */}
                      {paymentStep === "select" && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Select Payment Method</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: "cash", label: "Cash", icon: Banknote, description: "Physical currency" },
                              { value: "upi", label: "UPI", icon: Smartphone, description: "Scan QR code" },
                              { value: "card", label: "Card", icon: CreditCard, description: "Debit/Credit" },
                            ].map((method) => (
                              <Button
                                key={method.value}
                                type="button"
                                variant={paymentMethod === method.value ? "default" : "outline"}
                                onClick={() => setPaymentMethod(method.value)}
                                className={`h-auto p-3 flex flex-col items-center gap-1 ${
                                  paymentMethod === method.value ? "border-primary" : ""
                                }`}
                                data-testid={`payment-${method.value}`}
                              >
                                <method.icon className="h-5 w-5" />
                                <span className="text-sm font-medium">{method.label}</span>
                                <span className="text-xs opacity-70">{method.description}</span>
                              </Button>
                            ))}
                          </div>

                          <Button
                            type="button"
                            className="w-full mt-2"
                            onClick={() => {
                              if (!paymentMethod) {
                                toast({
                                  title: "Select payment method",
                                  description: "Please select a payment method to proceed",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setPaymentStep("confirm");
                            }}
                            disabled={!selectedPatient || billItems.length === 0 || !paymentMethod}
                            data-testid="button-proceed-payment"
                          >
                            Proceed to Payment
                          </Button>
                        </div>
                      )}

                      {/* Payment Confirmation */}
                      {paymentStep === "confirm" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Confirm Payment</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPaymentStep("select")}
                              data-testid="button-back-payment"
                            >
                              Change Method
                            </Button>
                          </div>

                          {/* Cash Payment */}
                          {paymentMethod === "cash" && (
                            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="p-3 rounded-full bg-emerald-500/10">
                                  <Banknote className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-medium">Cash Payment</p>
                                  <p className="text-sm text-muted-foreground">Collect ₹{total.toFixed(0)} from customer</p>
                                </div>
                              </div>
                              <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700"
                                onClick={handleSubmit}
                                disabled={createBillMutation.isPending || updateBillMutation.isPending}
                                data-testid="button-confirm-cash"
                              >
                                {(createBillMutation.isPending || updateBillMutation.isPending) ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                {editingBillId ? "Update Bill" : "Confirm Cash Received - Create Bill"}
                              </Button>
                            </div>
                          )}

                          {/* Card Payment */}
                          {paymentMethod === "card" && (
                            <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="p-3 rounded-full bg-blue-500/10">
                                  <CreditCard className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium">Card Payment</p>
                                  <p className="text-sm text-muted-foreground">Swipe card for ₹{total.toFixed(0)}</p>
                                </div>
                              </div>
                              <Button
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                onClick={handleSubmit}
                                disabled={createBillMutation.isPending || updateBillMutation.isPending}
                                data-testid="button-confirm-card"
                              >
                                {(createBillMutation.isPending || updateBillMutation.isPending) ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                {editingBillId ? "Update Bill" : "Confirm Card Payment - Create Bill"}
                              </Button>
                            </div>
                          )}

                          {/* UPI Payment */}
                          {paymentMethod === "upi" && (
                            <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="p-3 rounded-full bg-purple-500/10">
                                  <Smartphone className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                  <p className="font-medium">UPI Payment</p>
                                  <p className="text-sm text-muted-foreground">Amount: ₹{total.toFixed(0)}</p>
                                </div>
                              </div>

                              {organization?.upiQrCodeUrl ? (
                                <div className="flex flex-col items-center gap-3">
                                  <div className="p-3 bg-white rounded-lg border">
                                    <img 
                                      src={organization.upiQrCodeUrl} 
                                      alt="UPI QR Code" 
                                      className="h-40 w-40 object-contain"
                                    />
                                  </div>
                                  {organization?.upiId && (
                                    <p className="text-sm text-muted-foreground">
                                      UPI ID: <span className="font-mono">{organization.upiId}</span>
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground text-center">
                                    Ask customer to scan and pay ₹{total.toFixed(0)}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <Smartphone className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">No UPI QR code uploaded</p>
                                  <p className="text-xs text-muted-foreground">Go to Settings → Payments to upload your QR code</p>
                                </div>
                              )}

                              <Button
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                onClick={handleSubmit}
                                disabled={createBillMutation.isPending || updateBillMutation.isPending || !organization?.upiQrCodeUrl}
                                data-testid="button-confirm-upi"
                              >
                                {(createBillMutation.isPending || updateBillMutation.isPending) ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                )}
                                {editingBillId ? "Update Bill" : (organization?.upiQrCodeUrl ? "Payment Received - Create Bill" : "Upload QR in Settings first")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and View Switcher */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-bills"
              />
            </div>
            <ViewSwitcher pageKey="billing" defaultView={viewMode} onChange={setViewMode} />
          </div>
        </CardContent>
      </Card>

      {/* Bills Listing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            All Bills ({filteredBills.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {billsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                No bills found
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "Create your first bill to get started"}
              </p>
            </div>
          ) : viewMode === "table" ? (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => {
                    const patient = patients.find(
                      (p) => p.id === bill.patientId
                    );
                    const patientName = patient
                      ? `${patient.firstName} ${patient.lastName}`
                      : "-";
                    return (
                      <TableRow
                        key={bill.id}
                        className="hover-elevate"
                        data-testid={`row-bill-${bill.id}`}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="font-mono w-fit">
                              {bill.billNumber}
                            </Badge>
                            {bill.notes?.includes("Online booking") && (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 w-fit text-xs">
                                Online
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <InlineEditCell
                            value={patientName}
                            onSave={(newName) => {
                              if (patient) {
                                const [firstName, ...rest] = newName.trim().split(" ");
                                const lastName = rest.join(" ");
                                apiRequest("PATCH", `/api/patients/${patient.id}`, { firstName, lastName }).then(() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
                                });
                              }
                            }}
                            editable={!!patient}
                            placeholder="No patient"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-3.5 w-3.5" />
                            {bill.totalAmount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(bill.paymentStatus || "pending")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {bill.createdAt
                            ? new Date(bill.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewBill(bill)}
                              title="View"
                              data-testid={`button-view-bill-${bill.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintBill(bill)}
                              title="Print"
                              data-testid={`button-print-bill-${bill.id}`}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadBill(bill)}
                              title="Download"
                              data-testid={`button-download-bill-${bill.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleShareWhatsApp(bill)}
                              title="Share on WhatsApp"
                              className="text-green-600 dark:text-green-400"
                              data-testid={`button-share-bill-${bill.id}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditBill(bill)}
                              title="Edit"
                              data-testid={`button-edit-bill-${bill.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBills.map((bill) => {
                const patient = patients.find((p) => p.id === bill.patientId);
                const patientName = patient
                  ? `${patient.firstName} ${patient.lastName}`
                  : "-";
                return (
                  <Card
                    key={bill.id}
                    className="hover-elevate overflow-visible"
                    data-testid={`card-bill-${bill.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="outline" className="font-mono">
                          {bill.billNumber}
                        </Badge>
                        {getPaymentStatusBadge(bill.paymentStatus || "pending")}
                      </div>
                      <div>
                        <p className="font-medium truncate" data-testid={`text-patient-${bill.id}`}>
                          {patientName}
                        </p>
                        <p className="text-xl font-bold mt-1" data-testid={`text-amount-${bill.id}`}>
                          <span className="inline-flex items-center gap-0.5">
                            <IndianRupee className="h-4 w-4" />
                            {bill.totalAmount}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {bill.paymentMethod && (
                          <span className="capitalize">{bill.paymentMethod}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {bill.createdAt
                            ? new Date(bill.createdAt).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewBill(bill)}
                          title="View"
                          data-testid={`button-view-bill-${bill.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintBill(bill)}
                          title="Print"
                          data-testid={`button-print-bill-${bill.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadBill(bill)}
                          title="Download"
                          data-testid={`button-download-bill-${bill.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShareWhatsApp(bill)}
                          title="Share on WhatsApp"
                          className="text-green-600 dark:text-green-400"
                          data-testid={`button-share-bill-${bill.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBill(bill)}
                          title="Edit"
                          data-testid={`button-edit-bill-${bill.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBills.map((bill) => {
                const patient = patients.find((p) => p.id === bill.patientId);
                const patientName = patient
                  ? `${patient.firstName} ${patient.lastName}`
                  : "-";
                return (
                  <div
                    key={bill.id}
                    className="bg-muted/50 hover-elevate rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                    data-testid={`list-bill-${bill.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="outline" className="font-mono shrink-0">
                        {bill.billNumber}
                      </Badge>
                      <span className="font-medium truncate" data-testid={`text-patient-${bill.id}`}>
                        {patientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold flex items-center gap-0.5" data-testid={`text-amount-${bill.id}`}>
                        <IndianRupee className="h-3.5 w-3.5" />
                        {bill.totalAmount}
                      </span>
                      {getPaymentStatusBadge(bill.paymentStatus || "pending")}
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {bill.createdAt
                          ? new Date(bill.createdAt).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewBill(bill)}
                        title="View"
                        data-testid={`button-view-bill-${bill.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintBill(bill)}
                        title="Print"
                        data-testid={`button-print-bill-${bill.id}`}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadBill(bill)}
                        title="Download"
                        data-testid={`button-download-bill-${bill.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleShareWhatsApp(bill)}
                        title="Share on WhatsApp"
                        className="text-green-600 dark:text-green-400"
                        data-testid={`button-share-bill-${bill.id}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditBill(bill)}
                        title="Edit"
                        data-testid={`button-edit-bill-${bill.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice {viewingBill?.billNumber}
            </DialogTitle>
            <DialogDescription>
              Created on{" "}
              {viewingBill?.createdAt
                ? new Date(viewingBill.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "-"}
            </DialogDescription>
          </DialogHeader>

          {viewingBill && (
            <div className="space-y-4 mt-4">
              {/* Patient Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      {(() => {
                        const patient = patients.find(
                          (p) => p.id === viewingBill.patientId
                        );
                        return (
                          <>
                            <p className="font-medium">
                              {patient?.firstName} {patient?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {patient?.phone}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bill Items */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Test</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewingBill.items as BillItem[])?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">
                          {item.testName}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{item.price}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{item.price * item.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{viewingBill.subtotal}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">
                      ₹{viewingBill.totalAmount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due Amount</span>
                    <span className="text-destructive">
                      ₹{viewingBill.dueAmount || viewingBill.totalAmount}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintBill(viewingBill)}
                  data-testid="button-print-bill"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadBill(viewingBill)}
                  data-testid="button-download-bill"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShareWhatsApp(viewingBill)}
                  className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                  data-testid="button-share-whatsapp"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditBill(viewingBill)}
                  data-testid="button-edit-bill"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
