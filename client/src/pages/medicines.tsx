import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Search,
  Plus,
  Pill,
  Pencil,
  Trash2,
  Loader2,
  Package,
  AlertTriangle,
  ScanBarcode,
  Upload,
  Sparkles,
  Brain,
  LayoutGrid,
  List,
  Camera,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { ViewSwitcher, useViewMode } from "@/components/view-switcher";
import type { Medicine, InsertMedicine,
  StorageLocation, Supplier, Organization, Section
} from "@shared/schema";
import Quagga from "@ericblade/quagga2";
import { MedicineCamera } from "@/components/medicine-camera";

const categories = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Powder", "Other"];

const csvExpectedColumns = [
  "name", "genericName", "brand", "category", "form", "strength", "unit",
  "mrp", "sellingPrice", "costPrice", "stock", "reorderLevel", "batchNumber",
  "expiryDate", "barcode",
];

const emptyFormData = {
  name: "",
  genericName: "",
  brand: "",
  category: "",
  form: "",
  strength: "",
  unit: "",
  mrp: "",
  sellingPrice: "",
  costPrice: "",
  stock: "",
  reorderLevel: "",
  batchNumber: "",
  expiryDate: "",
  supplierId: "",
  requiresPrescription: false,
  barcode: "",
  hsnCode: "",
  manufacturer: "",
  description: "",
  locationId: "",
  sectionId: "",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return expiry <= thirtyDaysFromNow && expiry >= new Date();
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export default function Medicines() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [stockMedicine, setStockMedicine] = useState<Medicine | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [formData, setFormData] = useState(emptyFormData);

  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [barcodeResult, setBarcodeResult] = useState<Medicine | null>(null);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [scannedBarcodeValue, setScannedBarcodeValue] = useState("");
  const videoRef = useRef<HTMLDivElement>(null);

  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImportResult, setCsvImportResult] = useState<{
    imported: number;
    failed: number;
    total: number;
    errors: Array<{ index: number; error: string }>;
  } | null>(null);

  const [aiIdentifyLoading, setAiIdentifyLoading] = useState(false);

  const [aiSearchActive, setAiSearchActive] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<
    Array<{ medicineId: string; relevance: string; reason: string }>
  >([]);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);

  const [viewMode, setViewMode] = useViewMode("medicines", "table");

  const { data: orgData } = useQuery<{ organization: Organization; isOnboarded: boolean }>({
    queryKey: ["/api/organizations/my"],
  });
  const organization = orgData?.organization;

  const { data: medicines = [], isLoading } = useQuery<Medicine[]>({
    queryKey: ["/api/medlab/medicines", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/medicines?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch medicines");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const { data: storageLocations } = useQuery<StorageLocation[]>({
    queryKey: ["/api/medlab/storage-locations", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/storage-locations?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch storage locations");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const { data: suppliersList = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/medlab/suppliers", organization?.id],
    queryFn: async () => {
      const res = await fetch(`/api/medlab/suppliers?organizationId=${organization?.id}`);
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      return res.json();
    },
    enabled: !!organization?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/medlab/medicines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/stats"] });
      setIsDialogOpen(false);
      setFormData(emptyFormData);
      toast({ title: "Medicine added", description: "Medicine has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add medicine.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/medlab/medicines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/stats"] });
      setIsEditDialogOpen(false);
      setEditingMedicine(null);
      setFormData(emptyFormData);
      toast({ title: "Medicine updated", description: "Medicine has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update medicine.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/medlab/medicines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/stats"] });
      setIsDeleteDialogOpen(false);
      setDeletingMedicine(null);
      toast({ title: "Medicine deleted", description: "Medicine has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete medicine.", variant: "destructive" });
    },
  });

  const stockMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return apiRequest("PATCH", `/api/medlab/medicines/${id}/stock`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/stats"] });
      setIsStockDialogOpen(false);
      setStockMedicine(null);
      setStockAdjustment("");
      toast({ title: "Stock updated", description: "Medicine stock has been adjusted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update stock.", variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (items: any[]) => {
      return apiRequest("POST", "/api/medlab/medicines/bulk-import", { items });
    },
    onSuccess: async (res) => {
      const result = await res.json();
      setCsvImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/medicines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medlab/stats"] });
      toast({
        title: "Import complete",
        description: `${result.imported} imported, ${result.failed} failed out of ${result.total}`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to import medicines.", variant: "destructive" });
    },
  });

  const activeMedicines = medicines.filter((m) => m.isActive !== false);

  const filteredMedicines = useMemo(() => {
    if (aiSearchActive && aiSearchResults.length > 0) {
      const aiIds = new Set(aiSearchResults.map((r) => r.medicineId));
      return activeMedicines.filter((med) => {
        const matchesCategory = selectedCategory === "all" || med.category === selectedCategory;
        return aiIds.has(med.id) && matchesCategory;
      });
    }
    return activeMedicines.filter((med) => {
      const matchesSearch =
        searchQuery === "" ||
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (med.brand || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (med.genericName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || med.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeMedicines, searchQuery, selectedCategory, aiSearchActive, aiSearchResults]);

  const getAiRelevance = useCallback(
    (medicineId: string) => {
      const match = aiSearchResults.find((r) => r.medicineId === medicineId);
      return match || null;
    },
    [aiSearchResults]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;
    createMutation.mutate({
      ...formData,
      organizationId: organization.id,
      mrp: formData.mrp,
      sellingPrice: formData.sellingPrice,
      costPrice: formData.costPrice || undefined,
      stock: parseInt(formData.stock) || 0,
      reorderLevel: parseInt(formData.reorderLevel) || 10,
      supplierId: formData.supplierId || undefined,
      barcode: formData.barcode || undefined,
      hsnCode: formData.hsnCode || undefined,
      manufacturer: formData.manufacturer || undefined,
      description: formData.description || undefined,
      locationId: formData.locationId || undefined,
      sectionId: formData.sectionId || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;
    updateMutation.mutate({
      id: editingMedicine.id,
      data: {
        ...formData,
        mrp: formData.mrp,
        sellingPrice: formData.sellingPrice,
        costPrice: formData.costPrice || undefined,
        stock: parseInt(formData.stock) || 0,
        reorderLevel: parseInt(formData.reorderLevel) || 10,
        supplierId: formData.supplierId || undefined,
        barcode: formData.barcode || undefined,
        hsnCode: formData.hsnCode || undefined,
        manufacturer: formData.manufacturer || undefined,
        description: formData.description || undefined,
        locationId: formData.locationId || undefined,
        sectionId: formData.sectionId || undefined,
      },
    });
  };

  const openEditDialog = (med: Medicine) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      genericName: med.genericName || "",
      brand: med.brand || "",
      category: med.category || "",
      form: med.form || "",
      strength: med.strength || "",
      unit: med.unit || "",
      mrp: String(med.mrp),
      sellingPrice: String(med.sellingPrice),
      costPrice: med.costPrice ? String(med.costPrice) : "",
      stock: String(med.stock ?? 0),
      reorderLevel: String(med.reorderLevel ?? 10),
      batchNumber: med.batchNumber || "",
      expiryDate: med.expiryDate || "",
      supplierId: med.supplierId || "",
      requiresPrescription: med.requiresPrescription ?? false,
      barcode: med.barcode || "",
      hsnCode: med.hsnCode || "",
      manufacturer: med.manufacturer || "",
      description: med.description || "",
      locationId: med.locationId || "",
      sectionId: med.sectionId || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (med: Medicine) => {
    setDeletingMedicine(med);
    setIsDeleteDialogOpen(true);
  };

  const openStockDialog = (med: Medicine) => {
    setStockMedicine(med);
    setStockAdjustment("");
    setIsStockDialogOpen(true);
  };

  const handleStockUpdate = () => {
    if (!stockMedicine || !stockAdjustment) return;
    stockMutation.mutate({ id: stockMedicine.id, quantity: parseInt(stockAdjustment) });
  };

  const lookupBarcode = async (barcode: string) => {
    if (!barcode || !organization?.id) return;
    setBarcodeLoading(true);
    setBarcodeResult(null);
    setBarcodeNotFound(false);
    setScannedBarcodeValue(barcode);
    try {
      const res = await fetch(
        `/api/medlab/medicines/by-barcode?barcode=${encodeURIComponent(barcode)}&organizationId=${organization.id}`
      );
      if (res.ok) {
        const med = await res.json();
        setBarcodeResult(med);
      } else {
        setBarcodeNotFound(true);
      }
    } catch {
      setBarcodeNotFound(true);
    } finally {
      setBarcodeLoading(false);
    }
  };

  const detectedHandlerRef = useRef<((result: any) => void) | null>(null);

  const startScanner = useCallback(() => {
    if (!videoRef.current) return;
    setIsScannerActive(true);
    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: videoRef.current,
          constraints: { facingMode: "environment" },
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"],
        },
      },
      (err: any) => {
        if (err) {
          toast({ title: "Camera Error", description: "Could not access camera for scanning.", variant: "destructive" });
          setIsScannerActive(false);
          return;
        }
        Quagga.start();
      }
    );
    const onDetected = (result: any) => {
      const code = result.codeResult.code;
      if (code) {
        Quagga.offDetected(onDetected);
        Quagga.stop();
        setIsScannerActive(false);
        lookupBarcode(code);
      }
    };
    detectedHandlerRef.current = onDetected;
    Quagga.onDetected(onDetected);
  }, [organization?.id]);

  const stopScanner = useCallback(() => {
    try {
      if (detectedHandlerRef.current) {
        Quagga.offDetected(detectedHandlerRef.current);
        detectedHandlerRef.current = null;
      }
      Quagga.stop();
    } catch {}
    setIsScannerActive(false);
  }, []);

  useEffect(() => {
    if (!isBarcodeDialogOpen) {
      stopScanner();
      setBarcodeResult(null);
      setBarcodeNotFound(false);
      setManualBarcode("");
      setScannedBarcodeValue("");
    }
  }, [isBarcodeDialogOpen, stopScanner]);

  const handleAddFromBarcode = () => {
    setIsBarcodeDialogOpen(false);
    setFormData({ ...emptyFormData, barcode: scannedBarcodeValue });
    setIsDialogOpen(true);
    if (scannedBarcodeValue) {
      handleAiIdentify(emptyFormData.name, scannedBarcodeValue);
    }
  };

  const handleAiIdentify = async (name?: string, barcode?: string) => {
    const medicineName = name || formData.name;
    const medicineBarcode = barcode || formData.barcode;
    if (!medicineName && !medicineBarcode) {
      toast({ title: "Name required", description: "Enter a medicine name to identify.", variant: "destructive" });
      return;
    }
    setAiIdentifyLoading(true);
    try {
      const res = await apiRequest("POST", "/api/medlab/ai/identify-medicine", {
        name: medicineName || "Unknown",
        barcode: medicineBarcode || undefined,
      });
      const data = await res.json();
      setFormData((prev) => ({
        ...prev,
        genericName: data.genericName || prev.genericName,
        category: data.category || prev.category,
        form: data.form || prev.form,
        strength: data.strength || prev.strength,
        manufacturer: data.manufacturer || prev.manufacturer,
        description: data.description || prev.description,
        hsnCode: data.hsnCode || prev.hsnCode,
        requiresPrescription: data.requiresPrescription ?? prev.requiresPrescription,
      }));
      toast({ title: "AI Identified", description: "Form fields auto-filled with AI suggestions." });
    } catch {
      toast({ title: "AI Error", description: "Failed to identify medicine.", variant: "destructive" });
    } finally {
      setAiIdentifyLoading(false);
    }
  };

  const handleAiSmartSearch = async (query: string) => {
    if (!query || !organization?.id) {
      setAiSearchResults([]);
      return;
    }
    setAiSearchLoading(true);
    try {
      const res = await apiRequest("POST", "/api/medlab/ai/smart-search", {
        query,
        organizationId: organization.id,
      });
      const data = await res.json();
      setAiSearchResults(data.matches || []);
    } catch {
      toast({ title: "AI Search Error", description: "Failed to perform smart search.", variant: "destructive" });
      setAiSearchResults([]);
    } finally {
      setAiSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!aiSearchActive) {
      setAiSearchResults([]);
      return;
    }
    if (!searchQuery.trim()) {
      setAiSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleAiSmartSearch(searchQuery);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, aiSearchActive]);

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = () => {
    if (!organization?.id || csvData.length === 0) return;
    const items = csvData.map((row) => ({
      organizationId: organization!.id,
      name: row.name || "",
      genericName: row.genericName || undefined,
      brand: row.brand || undefined,
      category: row.category || undefined,
      form: row.form || undefined,
      strength: row.strength || undefined,
      unit: row.unit || undefined,
      mrp: row.mrp || "0",
      sellingPrice: row.sellingPrice || "0",
      costPrice: row.costPrice || undefined,
      stock: parseInt(row.stock) || 0,
      reorderLevel: parseInt(row.reorderLevel) || 10,
      batchNumber: row.batchNumber || undefined,
      expiryDate: row.expiryDate || undefined,
      barcode: row.barcode || undefined,
    }));
    bulkImportMutation.mutate(items);
  };

  const renderFormFields = (isEdit?: boolean) => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <div className="flex gap-2">
            <Input
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
              data-testid="input-medicine-name"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleAiIdentify()}
              disabled={aiIdentifyLoading || (!formData.name && !formData.barcode)}
              data-testid="button-ai-identify"
              title="AI Identify Medicine"
            >
              {aiIdentifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Generic Name</Label>
          <Input
            value={formData.genericName}
            onChange={(e) => setFormData((p) => ({ ...p, genericName: e.target.value }))}
            data-testid="input-generic-name"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Brand</Label>
          <Input
            value={formData.brand}
            onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
            data-testid="input-brand"
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData((p) => ({ ...p, category: value }))}
          >
            <SelectTrigger data-testid="select-medicine-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Form</Label>
          <Input
            value={formData.form}
            onChange={(e) => setFormData((p) => ({ ...p, form: e.target.value }))}
            placeholder="e.g., Tablet, Syrup"
            data-testid="input-form"
          />
        </div>
        <div className="space-y-2">
          <Label>Strength</Label>
          <Input
            value={formData.strength}
            onChange={(e) => setFormData((p) => ({ ...p, strength: e.target.value }))}
            placeholder="e.g., 500mg"
            data-testid="input-strength"
          />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Input
            value={formData.unit}
            onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))}
            placeholder="e.g., Strip, Bottle"
            data-testid="input-unit"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>MRP *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.mrp}
            onChange={(e) => setFormData((p) => ({ ...p, mrp: e.target.value }))}
            required
            data-testid="input-mrp"
          />
        </div>
        <div className="space-y-2">
          <Label>Selling Price *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.sellingPrice}
            onChange={(e) => setFormData((p) => ({ ...p, sellingPrice: e.target.value }))}
            required
            data-testid="input-selling-price"
          />
        </div>
        <div className="space-y-2">
          <Label>Cost Price</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.costPrice}
            onChange={(e) => setFormData((p) => ({ ...p, costPrice: e.target.value }))}
            data-testid="input-cost-price"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Stock *</Label>
          <Input
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData((p) => ({ ...p, stock: e.target.value }))}
            required
            data-testid="input-stock"
          />
        </div>
        <div className="space-y-2">
          <Label>Reorder Level</Label>
          <Input
            type="number"
            value={formData.reorderLevel}
            onChange={(e) => setFormData((p) => ({ ...p, reorderLevel: e.target.value }))}
            placeholder="10"
            data-testid="input-reorder-level"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Batch Number</Label>
          <Input
            value={formData.batchNumber}
            onChange={(e) => setFormData((p) => ({ ...p, batchNumber: e.target.value }))}
            data-testid="input-batch-number"
          />
        </div>
        <div className="space-y-2">
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value }))}
            data-testid="input-expiry-date"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Storage Location</Label>
          <Select
            value={formData.locationId || "unassigned"}
            onValueChange={(val) => {
              if (val === "unassigned") {
                setFormData((p) => ({ ...p, locationId: "", sectionId: "" }));
              } else {
                setFormData((p) => ({ ...p, locationId: val, sectionId: "" }));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Cabinet/Rack" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {storageLocations?.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {formData.locationId && (
          <div className="space-y-2">
            <Label>Section / Compartment</Label>
            <Select
              value={formData.sectionId || "unassigned"}
              onValueChange={(val) => setFormData((p) => ({ ...p, sectionId: val === "unassigned" ? "" : val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Shelf/Drawer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Top Level (No Section)</SelectItem>
                {(storageLocations?.find(l => l.id === formData.locationId)?.sections as { id: string, name: string }[] | undefined)?.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>{sec.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Barcode</Label>
          <Input
            value={formData.barcode}
            onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))}
            placeholder="e.g., 8901234567890"
            data-testid="input-barcode"
          />
        </div>
        <div className="space-y-2">
          <Label>HSN Code</Label>
          <Input
            value={formData.hsnCode}
            onChange={(e) => setFormData((p) => ({ ...p, hsnCode: e.target.value }))}
            placeholder="e.g., 3004"
            data-testid="input-hsn-code"
          />
        </div>
        <div className="space-y-2">
          <Label>Manufacturer</Label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => setFormData((p) => ({ ...p, manufacturer: e.target.value }))}
            placeholder="e.g., Sun Pharma"
            data-testid="input-manufacturer"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          placeholder="Brief description of the medicine"
          rows={2}
          data-testid="input-description"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Select
            value={formData.supplierId}
            onValueChange={(value) => setFormData((p) => ({ ...p, supplierId: value }))}
          >
            <SelectTrigger data-testid="select-supplier">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliersList
                .filter((s) => s.isActive !== false)
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox
            id="requiresPrescription"
            checked={formData.requiresPrescription}
            onCheckedChange={(checked) =>
              setFormData((p) => ({ ...p, requiresPrescription: checked === true }))
            }
            data-testid="checkbox-requires-prescription"
          />
          <Label htmlFor="requiresPrescription" className="cursor-pointer">
            Requires Prescription
          </Label>
        </div>
      </div>
    </>
  );

  const renderStatusBadge = (med: Medicine) => {
    const lowStock = (med.stock ?? 0) < (med.reorderLevel ?? 10);
    const expiring = isExpiringSoon(med.expiryDate);
    const expired = isExpired(med.expiryDate);

    if (expired) {
      return (
        <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
          Expired
        </Badge>
      );
    }
    if (lowStock) {
      return (
        <Badge variant="default" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
          Low Stock
        </Badge>
      );
    }
    if (expiring) {
      return (
        <Badge variant="default" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          Expiring
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
        In Stock
      </Badge>
    );
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredMedicines.length === 0 ? (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No medicines found</p>
        </div>
      ) : (
        filteredMedicines.map((med) => {
          const aiMatch = aiSearchActive ? getAiRelevance(med.id) : null;
          return (
            <Card key={med.id} data-testid={`card-medicine-${med.id}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate" data-testid={`text-medicine-name-${med.id}`}>
                      {med.name}
                    </p>
                    {med.genericName && (
                      <p className="text-xs text-muted-foreground truncate">{med.genericName}</p>
                    )}
                    {med.brand && (
                      <p className="text-xs text-muted-foreground">{med.brand}</p>
                    )}
                  </div>
                  {renderStatusBadge(med)}
                </div>
                {aiMatch && (
                  <Badge
                    variant="default"
                    className={
                      aiMatch.relevance === "high"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : aiMatch.relevance === "medium"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                    }
                    data-testid={`badge-ai-relevance-${med.id}`}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    {aiMatch.relevance}
                  </Badge>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">MRP:</span>{" "}
                    <span className="font-medium">{formatCurrency(Number(med.mrp))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>{" "}
                    <span className="font-medium">{formatCurrency(Number(med.sellingPrice))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stock:</span>{" "}
                    <span
                      className={
                        (med.stock ?? 0) < (med.reorderLevel ?? 10)
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "font-medium"
                      }
                    >
                      {med.stock ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {med.category || med.form || "-"}
                    </span>
                  </div>
                </div>
                {med.locationId && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground bg-muted/30 p-1.5 rounded-md border border-muted">
                    <Box className="h-3.5 w-3.5" />
                    <span>
                      {storageLocations?.find(l => l.id === med.locationId)?.name || 'Unknown Location'}
                      {med.sectionId && ` › ${storageLocations?.find(l => l.id === med.locationId)?.sections?.find((s: any) => s.id === med.sectionId)?.name || 'Section'}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 pt-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openStockDialog(med)}
                    data-testid={`button-grid-stock-${med.id}`}
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(med)}
                    data-testid={`button-grid-edit-${med.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openDeleteDialog(med)}
                    data-testid={`button-grid-delete-${med.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  const renderTableView = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                {aiSearchActive && <TableHead>AI Match</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={aiSearchActive ? 12 : 11} className="text-center py-8 text-muted-foreground">
                    <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No medicines found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMedicines.map((med) => {
                  const lowStock = (med.stock ?? 0) < (med.reorderLevel ?? 10);
                  const expiring = isExpiringSoon(med.expiryDate);
                  const expired = isExpired(med.expiryDate);
                  const aiMatch = aiSearchActive ? getAiRelevance(med.id) : null;
                  return (
                    <TableRow key={med.id} data-testid={`row-medicine-${med.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{med.name}</span>
                          {med.genericName && (
                            <span className="text-xs text-muted-foreground">{med.genericName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{med.brand || "-"}</TableCell>
                      <TableCell>{med.category || "-"}</TableCell>
                      <TableCell>{med.form || "-"}</TableCell>
                      <TableCell>{med.strength || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(med.mrp))}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(med.sellingPrice))}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={lowStock ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                          {med.stock ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          {med.locationId ? (
                            <>
                              <span className="font-medium">{storageLocations?.find(l => l.id === med.locationId)?.name || 'Unknown'}</span>
                              {med.sectionId && (
                                <span className="text-muted-foreground">
                                  {storageLocations?.find(l => l.id === med.locationId)?.sections?.find((s: any) => s.id === med.sectionId)?.name || 'Section'}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {med.expiryDate ? (
                          <span
                            className={
                              expired
                                ? "text-red-600 dark:text-red-400"
                                : expiring
                                ? "text-amber-600 dark:text-amber-400"
                                : ""
                            }
                          >
                            {med.expiryDate}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{renderStatusBadge(med)}</TableCell>
                      {aiSearchActive && (
                        <TableCell>
                          {aiMatch ? (
                            <div className="space-y-1">
                              <Badge
                                variant="default"
                                className={
                                  aiMatch.relevance === "high"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : aiMatch.relevance === "medium"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                }
                                data-testid={`badge-ai-relevance-${med.id}`}
                              >
                                {aiMatch.relevance}
                              </Badge>
                              <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={aiMatch.reason}>
                                {aiMatch.reason}
                              </p>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openStockDialog(med)}
                            data-testid={`button-stock-${med.id}`}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(med)}
                            data-testid={`button-edit-${med.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDeleteDialog(med)}
                            data-testid={`button-delete-${med.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-medicines-title">
            Medicines
          </h1>
          <p className="text-muted-foreground">Manage medicine inventory and stock</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCameraDialogOpen(true)}
            data-testid="button-scan-medicine"
          >
            <Camera className="h-4 w-4 mr-2" />
            Scan Medicine
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsBarcodeDialogOpen(true)}
            data-testid="button-scan-barcode"
          >
            <ScanBarcode className="h-4 w-4 mr-2" />
            Scan Barcode
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsCsvDialogOpen(true);
              setCsvData([]);
              setCsvFileName("");
              setCsvImportResult(null);
            }}
            data-testid="button-import-csv"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-medicine">
                <Plus className="h-4 w-4 mr-2" />
                Add Medicine
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Medicine</DialogTitle>
                <DialogDescription>Add a new medicine to inventory.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {renderFormFields()}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-add"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-medicine">
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Medicine
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={aiSearchActive ? "AI Search: describe symptoms, conditions, or medicines..." : "Search by name, brand, or generic name..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-medicines"
              />
            </div>
            <Button
              variant="outline"
              className={`toggle-elevate ${aiSearchActive ? "toggle-elevated" : ""}`}
              onClick={() => {
                setAiSearchActive(!aiSearchActive);
                setAiSearchResults([]);
              }}
              data-testid="button-ai-search-toggle"
            >
              {aiSearchLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              AI Search
            </Button>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ViewSwitcher
              pageKey="medicines"
              defaultView="table"
              onChange={(mode) => setViewMode(mode)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        renderGridView()
      ) : (
        renderTableView()
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
            <DialogDescription>Update medicine details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            {renderFormFields(true)}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-medicine">
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Medicine
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingMedicine?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingMedicine && deleteMutation.mutate(deletingMedicine.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Current stock for "{stockMedicine?.name}": {stockMedicine?.stock ?? 0}. Enter positive number to
              add, negative to subtract.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Quantity Adjustment</Label>
              <Input
                type="number"
                value={stockAdjustment}
                onChange={(e) => setStockAdjustment(e.target.value)}
                placeholder="e.g., 50 or -10"
                data-testid="input-stock-adjustment"
              />
            </div>
            {stockAdjustment && (
              <p className="text-sm text-muted-foreground">
                New stock will be: {(stockMedicine?.stock ?? 0) + parseInt(stockAdjustment || "0")}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsStockDialogOpen(false)}
              data-testid="button-cancel-stock"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStockUpdate}
              disabled={stockMutation.isPending || !stockAdjustment}
              data-testid="button-update-stock"
            >
              {stockMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBarcodeDialogOpen} onOpenChange={setIsBarcodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
            <DialogDescription>
              Use camera to scan a barcode or enter it manually below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div
              ref={videoRef}
              className="relative w-full aspect-video bg-muted rounded-md overflow-hidden"
              data-testid="barcode-scanner-viewport"
            >
              {!isScannerActive && !barcodeResult && !barcodeNotFound && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <Button onClick={startScanner} data-testid="button-start-scanner">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}
              {isScannerActive && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                  <Button variant="outline" size="sm" onClick={stopScanner} data-testid="button-stop-scanner">
                    Stop
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter barcode manually..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    lookupBarcode(manualBarcode);
                  }
                }}
                data-testid="input-manual-barcode"
              />
              <Button
                onClick={() => lookupBarcode(manualBarcode)}
                disabled={!manualBarcode || barcodeLoading}
                data-testid="button-lookup-barcode"
              >
                {barcodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
              </Button>
            </div>

            {barcodeLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Looking up barcode...
              </div>
            )}

            {barcodeResult && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="font-medium">Medicine Found</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span> {barcodeResult.name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Brand:</span> {barcodeResult.brand || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stock:</span> {barcodeResult.stock ?? 0}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price:</span>{" "}
                      {formatCurrency(Number(barcodeResult.sellingPrice))}
                    </div>
                  </div>
                  {renderStatusBadge(barcodeResult)}
                </CardContent>
              </Card>
            )}

            {barcodeNotFound && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Barcode not found in inventory</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Barcode: {scannedBarcodeValue}
                  </p>
                  <Button onClick={handleAddFromBarcode} data-testid="button-add-from-barcode">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medicine with this Barcode
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Medicines from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with medicine data. Expected columns: {csvExpectedColumns.join(", ")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                data-testid="input-csv-file"
              />
              {csvFileName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {csvFileName} ({csvData.length} rows)
                </p>
              )}
            </div>

            {csvData.length > 0 && !csvImportResult && (
              <>
                <div className="border rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        {Object.keys(csvData[0]).slice(0, 8).map((col) => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          {Object.keys(csvData[0]).slice(0, 8).map((col) => (
                            <TableCell key={col} className="max-w-[120px] truncate">
                              {row[col] || "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {csvData.length > 10 && (
                  <p className="text-sm text-muted-foreground">
                    Showing first 10 of {csvData.length} rows
                  </p>
                )}
              </>
            )}

            {csvImportResult && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium">Import Results</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>{csvImportResult.imported} imported</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{csvImportResult.failed} failed</span>
                    </div>
                    <div className="text-muted-foreground">{csvImportResult.total} total</div>
                  </div>
                  {csvImportResult.errors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Errors:</p>
                      <div className="max-h-[150px] overflow-y-auto space-y-1">
                        {csvImportResult.errors.map((err, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            Row {err.index + 1}: {err.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCsvDialogOpen(false)}
              data-testid="button-cancel-csv"
            >
              Close
            </Button>
            {!csvImportResult && (
              <Button
                onClick={handleCsvImport}
                disabled={csvData.length === 0 || bulkImportMutation.isPending}
                data-testid="button-import-csv-submit"
              >
                {bulkImportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import {csvData.length} Medicines
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MedicineCamera
        open={isCameraDialogOpen}
        onOpenChange={setIsCameraDialogOpen}
        mode="single"
        onIdentified={(result) => {
          setFormData({
            ...emptyFormData,
            name: result.name || "",
            genericName: result.genericName || "",
            category: result.category || "",
            form: result.form || "",
            strength: result.strength || "",
            manufacturer: result.manufacturer || "",
            brand: result.brand || "",
            batchNumber: result.batchNumber || "",
            expiryDate: result.expiryDate || "",
            mrp: result.mrp || "",
            sellingPrice: result.mrp || "",
            description: result.description || "",
            hsnCode: result.hsnCode || "",
            requiresPrescription: result.requiresPrescription || false,
          });
          setIsDialogOpen(true);
        }}
      />
    </div>
  );
}
