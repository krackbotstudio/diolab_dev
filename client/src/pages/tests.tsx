import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewSwitcher, useViewMode, InlineEditCell } from "@/components/view-switcher";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Plus,
  TestTube2,
  Package,
  IndianRupee,
  Clock,
  Loader2,
  Beaker,
  Percent,
  X,
  Share2,
  Sparkles,
  Database,
  FileText,
  Check,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { Test, TestPackage } from "@shared/schema";

interface AIReportField {
  name: string;
  label: string;
  unit: string;
  type: "number" | "text" | "select";
  options?: string[];
  referenceRange?: {
    male?: { min?: number; max?: number; text?: string };
    female?: { min?: number; max?: number; text?: string };
    general?: { min?: number; max?: number; text?: string };
  };
  decimalPlaces?: number;
}

interface AIReportSection {
  name: string;
  fields: AIReportField[];
}

interface AIReportTemplate {
  testCode: string;
  testName: string;
  category: string;
  sampleType: string;
  methodology?: string;
  sections: AIReportSection[];
}

const testCategories = [
  "Hematology",
  "Biochemistry",
  "Microbiology",
  "Immunology",
  "Pathology",
  "Radiology",
  "Cardiology",
  "Other",
];

const sampleTypes = [
  "Blood",
  "Urine",
  "Stool",
  "Sputum",
  "Swab",
  "Tissue",
  "Other",
];

export default function Tests() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useViewMode("tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [testFormData, setTestFormData] = useState({
    name: "",
    code: "",
    category: "",
    description: "",
    price: "",
    normalRange: "",
    unit: "",
    sampleType: "",
    turnaroundTime: "",
  });
  const [packageFormData, setPackageFormData] = useState({
    name: "",
    description: "",
    testIds: [] as string[],
    discountPercent: "",
  });
  const [packageTestSearch, setPackageTestSearch] = useState("");
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false);
  const [selectedTestForTemplate, setSelectedTestForTemplate] = useState<Test | null>(null);
  const [generatedTemplate, setGeneratedTemplate] = useState<AIReportTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: tests = [], isLoading: testsLoading } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  const { data: packages = [], isLoading: packagesLoading } = useQuery<TestPackage[]>({
    queryKey: ["/api/packages"],
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: typeof testFormData) => {
      return apiRequest("POST", "/api/tests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setIsTestDialogOpen(false);
      setTestFormData({
        name: "",
        code: "",
        category: "",
        description: "",
        price: "",
        normalRange: "",
        unit: "",
        sampleType: "",
        turnaroundTime: "",
      });
      toast({
        title: "Test created",
        description: "New test has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create test. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof testFormData }) => {
      return apiRequest("PATCH", `/api/tests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setIsTestDialogOpen(false);
      setEditingTestId(null);
      setTestFormData({
        name: "",
        code: "",
        category: "",
        description: "",
        price: "",
        normalRange: "",
        unit: "",
        sampleType: "",
        turnaroundTime: "",
      });
      toast({
        title: "Test updated",
        description: "Test has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update test. Please try again.",
        variant: "destructive",
      });
    },
  });

  const inlineUpdateTestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof testFormData> }) => {
      return apiRequest("PATCH", `/api/tests/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Test updated",
        description: "Field updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update field. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInlineSave = (test: Test, field: string, value: string) => {
    inlineUpdateTestMutation.mutate({ id: test.id, data: { [field]: value } });
  };

  const deleteTestMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Test deleted",
        description: "Test has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete test. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (data: typeof packageFormData) => {
      const selectedTests = tests.filter((t) => data.testIds.includes(t.id));
      const originalPrice = selectedTests.reduce((sum, t) => sum + Number(t.price), 0);
      const discountPercent = data.discountPercent ? Number(data.discountPercent) : 0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);
      
      return apiRequest("POST", "/api/packages", {
        name: data.name,
        description: data.description || undefined,
        testIds: data.testIds,
        originalPrice: String(originalPrice),
        discountedPrice: String(discountedPrice),
        discountPercent: discountPercent > 0 ? String(discountPercent) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setIsPackageDialogOpen(false);
      setPackageFormData({
        name: "",
        description: "",
        testIds: [],
        discountPercent: "",
      });
      setPackageTestSearch("");
      toast({
        title: "Package created",
        description: "New test package has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create package. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof packageFormData }) => {
      const selectedTests = tests.filter((t) => data.testIds.includes(t.id));
      const originalPrice = selectedTests.reduce((sum, t) => sum + Number(t.price), 0);
      const discountPercent = data.discountPercent ? Number(data.discountPercent) : 0;
      const discountedPrice = originalPrice * (1 - discountPercent / 100);
      
      return apiRequest("PATCH", `/api/packages/${id}`, {
        name: data.name,
        description: data.description || undefined,
        testIds: data.testIds,
        originalPrice: String(originalPrice),
        discountedPrice: String(discountedPrice),
        discountPercent: discountPercent > 0 ? String(discountPercent) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setIsPackageDialogOpen(false);
      setEditingPackageId(null);
      setPackageFormData({
        name: "",
        description: "",
        testIds: [],
        discountPercent: "",
      });
      setPackageTestSearch("");
      toast({
        title: "Package updated",
        description: "Test package has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update package. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Package deleted",
        description: "Test package has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete package. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditPackage = (pkg: TestPackage) => {
    setEditingPackageId(pkg.id);
    setPackageFormData({
      name: pkg.name,
      description: pkg.description || "",
      testIds: pkg.testIds,
      discountPercent: pkg.discountPercent ? String(pkg.discountPercent) : "",
    });
    setIsPackageDialogOpen(true);
  };

  const handlePackageDialogClose = (open: boolean) => {
    if (!open) {
      setEditingPackageId(null);
      setPackageFormData({
        name: "",
        description: "",
        testIds: [],
        discountPercent: "",
      });
      setPackageTestSearch("");
    }
    setIsPackageDialogOpen(open);
  };

  const handleEditTest = (test: Test) => {
    setEditingTestId(test.id);
    setTestFormData({
      name: test.name,
      code: test.code,
      category: test.category,
      description: test.description || "",
      price: String(test.price),
      normalRange: test.normalRange || "",
      unit: test.unit || "",
      sampleType: test.sampleType || "",
      turnaroundTime: test.turnaroundTime || "",
    });
    setIsTestDialogOpen(true);
  };

  const handleTestDialogClose = (open: boolean) => {
    if (!open) {
      setEditingTestId(null);
      setTestFormData({
        name: "",
        code: "",
        category: "",
        description: "",
        price: "",
        normalRange: "",
        unit: "",
        sampleType: "",
        turnaroundTime: "",
      });
    }
    setIsTestDialogOpen(open);
  };

  const aiSuggestMutation = useMutation({
    mutationFn: async (testName: string) => {
      const response = await apiRequest("POST", "/api/ai/suggest-test-details", { testName });
      return response.json();
    },
    onSuccess: (data: { code: string; category: string; normalRange: string; unit: string; sampleType: string; turnaroundTime: string; description: string }) => {
      setTestFormData((prev) => ({
        ...prev,
        code: data.code || prev.code,
        category: data.category || prev.category,
        normalRange: data.normalRange || prev.normalRange,
        unit: data.unit || prev.unit,
        sampleType: data.sampleType || prev.sampleType,
        turnaroundTime: data.turnaroundTime || prev.turnaroundTime,
        description: data.description || prev.description,
      }));
      toast({
        title: "AI Suggestion Applied",
        description: "Form fields have been auto-filled based on AI suggestions.",
      });
    },
    onError: () => {
      toast({
        title: "AI Suggestion Failed",
        description: "Could not get AI suggestions. Please fill in the details manually.",
        variant: "destructive",
      });
    },
  });

  const aiSuggestPackageMutation = useMutation({
    mutationFn: async (packageName: string) => {
      const availableTests = tests.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
      }));
      const response = await apiRequest("POST", "/api/ai/suggest-package", {
        packageName,
        availableTests,
      });
      return response.json();
    },
    onSuccess: (data: { suggestedTestIds: string[]; reason: string }) => {
      if (data.suggestedTestIds.length > 0) {
        setPackageFormData((prev) => ({
          ...prev,
          testIds: data.suggestedTestIds,
        }));
        toast({
          title: "AI Suggestion Applied",
          description: data.reason || `Selected ${data.suggestedTestIds.length} tests based on package type.`,
        });
      } else {
        toast({
          title: "No Matching Tests",
          description: "AI couldn't find matching tests for this package. Please select tests manually.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "AI Suggestion Failed",
        description: "Could not get AI suggestions. Please select tests manually.",
        variant: "destructive",
      });
    },
  });

  const seedTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/seed-tests");
      return response.json();
    },
    onSuccess: (data: { message: string; testsCreated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      toast({
        title: "Tests Seeded Successfully",
        description: `${data.testsCreated} common lab tests have been added to your system.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Seeding Failed",
        description: error.message || "Failed to seed tests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateTemplateMutation = useMutation({
    mutationFn: async (test: Test) => {
      const response = await apiRequest("POST", "/api/ai/generate-template", {
        testName: test.name,
        testCode: test.code,
        category: test.category,
        sampleType: test.sampleType,
      });
      return response.json();
    },
    onSuccess: (data: AIReportTemplate) => {
      setGeneratedTemplate(data);
      toast({
        title: "Template Generated",
        description: `AI has created a report template with ${data.sections?.length || 0} section(s).`,
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ testId, template }: { testId: string; template: AIReportTemplate }) => {
      const response = await apiRequest("PATCH", `/api/tests/${testId}/template`, { template });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tests"] });
      setIsTemplateSheetOpen(false);
      setGeneratedTemplate(null);
      setSelectedTestForTemplate(null);
      toast({
        title: "Template Saved",
        description: "Report template has been saved to this test.",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOpenTemplateSheet = (test: Test) => {
    setSelectedTestForTemplate(test);
    setGeneratedTemplate(test.reportTemplate as AIReportTemplate | null);
    setIsTemplateSheetOpen(true);
  };

  const handleGenerateTemplate = () => {
    if (selectedTestForTemplate) {
      generateTemplateMutation.mutate(selectedTestForTemplate);
    }
  };

  const handleSaveTemplate = () => {
    if (selectedTestForTemplate && generatedTemplate) {
      saveTemplateMutation.mutate({
        testId: selectedTestForTemplate.id,
        template: generatedTemplate,
      });
    }
  };

  const getReferenceRangeText = (field: AIReportField) => {
    if (!field.referenceRange) return "-";
    const ref = field.referenceRange;
    if (ref.general) {
      if (ref.general.text) return ref.general.text;
      if (ref.general.min !== undefined && ref.general.max !== undefined) {
        return `${ref.general.min} - ${ref.general.max}`;
      }
    }
    if (ref.male && ref.female) {
      const maleRange = ref.male.min !== undefined && ref.male.max !== undefined 
        ? `${ref.male.min}-${ref.male.max}` : "-";
      const femaleRange = ref.female.min !== undefined && ref.female.max !== undefined 
        ? `${ref.female.min}-${ref.female.max}` : "-";
      return `M: ${maleRange} / F: ${femaleRange}`;
    }
    return "-";
  };

  // Template editing functions
  const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<AIReportField>) => {
    if (!generatedTemplate) return;
    const newTemplate = { ...generatedTemplate };
    newTemplate.sections = [...newTemplate.sections];
    newTemplate.sections[sectionIndex] = { ...newTemplate.sections[sectionIndex] };
    newTemplate.sections[sectionIndex].fields = [...newTemplate.sections[sectionIndex].fields];
    newTemplate.sections[sectionIndex].fields[fieldIndex] = {
      ...newTemplate.sections[sectionIndex].fields[fieldIndex],
      ...updates,
    };
    setGeneratedTemplate(newTemplate);
  };

  const updateSectionName = (sectionIndex: number, name: string) => {
    if (!generatedTemplate) return;
    const newTemplate = { ...generatedTemplate };
    newTemplate.sections = [...newTemplate.sections];
    newTemplate.sections[sectionIndex] = { ...newTemplate.sections[sectionIndex], name };
    setGeneratedTemplate(newTemplate);
  };

  const addField = (sectionIndex: number) => {
    if (!generatedTemplate) return;
    const newField: AIReportField = {
      name: `new_field_${Date.now()}`,
      label: "New Field",
      unit: "",
      type: "number",
    };
    const newTemplate = { ...generatedTemplate };
    newTemplate.sections = [...newTemplate.sections];
    newTemplate.sections[sectionIndex] = { ...newTemplate.sections[sectionIndex] };
    newTemplate.sections[sectionIndex].fields = [...newTemplate.sections[sectionIndex].fields, newField];
    setGeneratedTemplate(newTemplate);
  };

  const deleteField = (sectionIndex: number, fieldIndex: number) => {
    if (!generatedTemplate) return;
    const newTemplate = { ...generatedTemplate };
    newTemplate.sections = [...newTemplate.sections];
    newTemplate.sections[sectionIndex] = { ...newTemplate.sections[sectionIndex] };
    newTemplate.sections[sectionIndex].fields = newTemplate.sections[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
    setGeneratedTemplate(newTemplate);
  };

  const addSection = () => {
    if (!generatedTemplate) return;
    const newSection: AIReportSection = {
      name: "NEW SECTION",
      fields: [{
        name: `new_field_${Date.now()}`,
        label: "New Field",
        unit: "",
        type: "number",
      }],
    };
    const newTemplate = { ...generatedTemplate };
    newTemplate.sections = [...newTemplate.sections, newSection];
    setGeneratedTemplate(newTemplate);
  };

  const deleteSection = (sectionIndex: number) => {
    if (!generatedTemplate) return;
    const newTemplate = { ...generatedTemplate };
    newTemplate.sections = newTemplate.sections.filter((_, i) => i !== sectionIndex);
    setGeneratedTemplate(newTemplate);
  };

  const moveSection = (fromIndex: number, toIndex: number) => {
    if (!generatedTemplate) return;
    if (toIndex < 0 || toIndex >= generatedTemplate.sections.length) return;
    const newTemplate = { ...generatedTemplate };
    const sections = [...newTemplate.sections];
    const [moved] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, moved);
    newTemplate.sections = sections;
    setGeneratedTemplate(newTemplate);
  };

  const moveField = (sectionIndex: number, fromIndex: number, toIndex: number) => {
    if (!generatedTemplate) return;
    const section = generatedTemplate.sections[sectionIndex];
    if (!section || toIndex < 0 || toIndex >= section.fields.length) return;
    const newTemplate = { ...generatedTemplate };
    newTemplate.sections = [...newTemplate.sections];
    newTemplate.sections[sectionIndex] = { ...newTemplate.sections[sectionIndex] };
    const fields = [...newTemplate.sections[sectionIndex].fields];
    const [moved] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, moved);
    newTemplate.sections[sectionIndex].fields = fields;
    setGeneratedTemplate(newTemplate);
  };

  const [draggedSection, setDraggedSection] = useState<number | null>(null);
  const [dragOverSection, setDragOverSection] = useState<number | null>(null);
  const [draggedField, setDraggedField] = useState<{ section: number; field: number } | null>(null);
  const [dragOverField, setDragOverField] = useState<{ section: number; field: number } | null>(null);

  const updateFieldReferenceRange = (
    sectionIndex: number,
    fieldIndex: number,
    rangeType: "male" | "female" | "general",
    field: "min" | "max",
    value: string
  ) => {
    if (!generatedTemplate) return;
    const numValue = value === "" ? undefined : parseFloat(value);
    const currentField = generatedTemplate.sections[sectionIndex].fields[fieldIndex];
    const currentRef = currentField.referenceRange || {};
    const newRef = {
      ...currentRef,
      [rangeType]: {
        ...currentRef[rangeType],
        [field]: numValue,
      },
    };
    updateField(sectionIndex, fieldIndex, { referenceRange: newRef });
  };

  const handleAiSuggestPackage = () => {
    if (!packageFormData.name.trim()) {
      toast({
        title: "Package name required",
        description: "Please enter a package name first to get AI suggestions.",
        variant: "destructive",
      });
      return;
    }
    if (tests.length === 0) {
      toast({
        title: "No tests available",
        description: "Please create some tests first before using AI suggestions.",
        variant: "destructive",
      });
      return;
    }
    aiSuggestPackageMutation.mutate(packageFormData.name);
  };

  const handleAiSuggest = () => {
    if (!testFormData.name.trim()) {
      toast({
        title: "Test name required",
        description: "Please enter a test name first to get AI suggestions.",
        variant: "destructive",
      });
      return;
    }
    aiSuggestMutation.mutate(testFormData.name);
  };

  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTestId) {
      updateTestMutation.mutate({ id: editingTestId, data: testFormData });
    } else {
      createTestMutation.mutate(testFormData);
    }
  };

  const handlePackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (packageFormData.testIds.length === 0) {
      toast({
        title: "No tests selected",
        description: "Please select at least one test for the package.",
        variant: "destructive",
      });
      return;
    }
    if (editingPackageId) {
      updatePackageMutation.mutate({ id: editingPackageId, data: packageFormData });
    } else {
      createPackageMutation.mutate(packageFormData);
    }
  };

  const toggleTestInPackage = (testId: string) => {
    setPackageFormData((prev) => ({
      ...prev,
      testIds: prev.testIds.includes(testId)
        ? prev.testIds.filter((id) => id !== testId)
        : [...prev.testIds, testId],
    }));
  };

  const filteredPackageTests = tests.filter(
    (t) =>
      t.name.toLowerCase().includes(packageTestSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(packageTestSearch.toLowerCase())
  );

  const selectedTestsTotal = tests
    .filter((t) => packageFormData.testIds.includes(t.id))
    .reduce((sum, t) => sum + Number(t.price), 0);

  const discountedTotal =
    selectedTestsTotal *
    (1 - (packageFormData.discountPercent ? Number(packageFormData.discountPercent) : 0) / 100);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Hematology: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      Biochemistry: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      Microbiology: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      Immunology: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      Pathology: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      Radiology: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      Cardiology: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    };
    return colors[category] || "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Tests & Packages</h1>
          <p className="text-muted-foreground">Manage diagnostic tests and packages</p>
        </div>
        <Dialog open={isTestDialogOpen} onOpenChange={handleTestDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-test">
              <Plus className="h-4 w-4 mr-2" />
              Add Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{editingTestId ? "Edit Test" : "Add New Test"}</DialogTitle>
              <DialogDescription>
                {editingTestId ? "Update the test details." : "Create a new diagnostic test with pricing and details."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleTestSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name *</Label>
                <div className="flex gap-2">
                  <Input
                    id="testName"
                    value={testFormData.name}
                    onChange={(e) => setTestFormData({ ...testFormData, name: e.target.value })}
                    required
                    placeholder="e.g., Complete Blood Count"
                    className="flex-1"
                    data-testid="input-test-name"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAiSuggest}
                    disabled={aiSuggestMutation.isPending || !testFormData.name.trim()}
                    data-testid="button-ai-suggest"
                  >
                    {aiSuggestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">AI Suggest</span>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testCode">Test Code *</Label>
                  <Input
                    id="testCode"
                    value={testFormData.code}
                    onChange={(e) => setTestFormData({ ...testFormData, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g., CBC001"
                    data-testid="input-test-code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testCategory">Category *</Label>
                  <Select
                    value={testFormData.category}
                    onValueChange={(value) => setTestFormData({ ...testFormData, category: value })}
                  >
                    <SelectTrigger data-testid="select-test-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {testCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testPrice">Price (₹) *</Label>
                  <Input
                    id="testPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={testFormData.price}
                    onChange={(e) => setTestFormData({ ...testFormData, price: e.target.value })}
                    required
                    data-testid="input-test-price"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sampleType">Sample Type</Label>
                  <Select
                    value={testFormData.sampleType}
                    onValueChange={(value) => setTestFormData({ ...testFormData, sampleType: value })}
                  >
                    <SelectTrigger data-testid="select-sample-type">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnaroundTime">Turnaround Time</Label>
                  <Input
                    id="turnaroundTime"
                    value={testFormData.turnaroundTime}
                    onChange={(e) => setTestFormData({ ...testFormData, turnaroundTime: e.target.value })}
                    placeholder="e.g., 24 hours"
                    data-testid="input-turnaround-time"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="normalRange">Normal Range</Label>
                  <Input
                    id="normalRange"
                    value={testFormData.normalRange}
                    onChange={(e) => setTestFormData({ ...testFormData, normalRange: e.target.value })}
                    placeholder="e.g., 4.5-11.0"
                    data-testid="input-normal-range"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={testFormData.unit}
                    onChange={(e) => setTestFormData({ ...testFormData, unit: e.target.value })}
                    placeholder="e.g., x10^9/L"
                    data-testid="input-unit"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={testFormData.description}
                  onChange={(e) => setTestFormData({ ...testFormData, description: e.target.value })}
                  rows={2}
                  data-testid="input-description"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTestDialogOpen(false)}
                  data-testid="button-cancel-test"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTestMutation.isPending || updateTestMutation.isPending} 
                  data-testid="button-submit-test"
                >
                  {(createTestMutation.isPending || updateTestMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingTestId ? "Update Test" : "Add Test"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests" data-testid="tab-tests">
            <TestTube2 className="h-4 w-4 mr-2" />
            Tests ({tests.length})
          </TabsTrigger>
          <TabsTrigger value="packages" data-testid="tab-packages">
            <Package className="h-4 w-4 mr-2" />
            Packages ({packages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {/* Search, Filter, and View Switcher */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by test name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-tests"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {testCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ViewSwitcher pageKey="tests" defaultView="table" onChange={setViewMode} />
              </div>
            </CardContent>
          </Card>

          {/* Tests Grid */}
          {testsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredTests.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Beaker className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No tests found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery || selectedCategory !== "all"
                      ? "Try adjusting your filters"
                      : "Add your first test or seed common lab tests to get started"}
                  </p>
                  {tests.length === 0 && !searchQuery && selectedCategory === "all" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" data-testid="button-seed-tests">
                          <Database className="h-4 w-4 mr-2" />
                          Seed Common Tests
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Seed Common Lab Tests</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will add 60+ common laboratory tests to your system including:
                            <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                              <li>Hematology (CBC, Hemoglobin, ESR, etc.)</li>
                              <li>Biochemistry (Glucose, Lipid Profile, LFT, KFT, etc.)</li>
                              <li>Thyroid Profile (T3, T4, TSH, Free T3, Free T4)</li>
                              <li>Immunology (CRP, RF, ANA, HIV, HBsAg, etc.)</li>
                              <li>Urine Tests (Routine, Culture)</li>
                              <li>Cardiac Markers (Troponin, CPK-MB, NT-proBNP)</li>
                            </ul>
                            <p className="mt-3">All tests include realistic pricing in INR, normal ranges, and turnaround times.</p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => seedTestsMutation.mutate()}
                            disabled={seedTestsMutation.isPending}
                            data-testid="button-confirm-seed"
                          >
                            {seedTestsMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Seeding...
                              </>
                            ) : (
                              "Seed Tests"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price (₹)</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>TAT</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map((test) => (
                    <TableRow key={test.id} data-testid={`row-test-${test.id}`}>
                      <TableCell className="font-medium">
                        <InlineEditCell
                          value={test.name}
                          onSave={(val) => handleInlineSave(test, "name", val)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{test.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <InlineEditCell
                          value={test.category}
                          onSave={(val) => handleInlineSave(test, "category", val)}
                        />
                      </TableCell>
                      <TableCell>
                        <InlineEditCell
                          value={String(test.price)}
                          onSave={(val) => handleInlineSave(test, "price", val)}
                          type="number"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{test.sampleType || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{test.turnaroundTime || "—"}</TableCell>
                      <TableCell>
                        {test.reportTemplate !== null && test.reportTemplate !== undefined && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <FileText className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenTemplateSheet(test)}
                            data-testid={`button-ai-template-${test.id}`}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTest(test)}
                            data-testid={`button-edit-test-${test.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-test-${test.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Test</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{test.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTestMutation.mutate(test.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTests.map((test) => (
                <Card key={test.id} className="hover-elevate" data-testid={`card-test-${test.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TestTube2 className="h-4 w-4 text-primary" />
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {test.code}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {test.reportTemplate !== null && test.reportTemplate !== undefined && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <FileText className="h-3 w-3 mr-1" />
                            Template
                          </Badge>
                        )}
                        <Badge className={getCategoryColor(test.category)}>
                          {test.category}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="font-medium text-foreground mb-2">
                      <InlineEditCell
                        value={test.name}
                        onSave={(val) => handleInlineSave(test, "name", val)}
                      />
                    </h3>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5" />
                          Price
                        </span>
                        <span className="font-medium text-foreground">
                          <InlineEditCell
                            value={String(test.price)}
                            onSave={(val) => handleInlineSave(test, "price", val)}
                            type="number"
                          />
                        </span>
                      </div>
                      {test.turnaroundTime && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            TAT
                          </span>
                          <span>{test.turnaroundTime}</span>
                        </div>
                      )}
                      {test.sampleType && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Sample</span>
                          <span>{test.sampleType}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenTemplateSheet(test)}
                        data-testid={`button-ai-template-${test.id}`}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Template
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTest(test)}
                        data-testid={`button-edit-test-${test.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-test-${test.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Test</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{test.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTestMutation.mutate(test.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="bg-muted/50 hover-elevate rounded-lg p-3 flex flex-wrap items-center gap-3"
                  data-testid={`list-test-${test.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TestTube2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">
                      <InlineEditCell
                        value={test.name}
                        onSave={(val) => handleInlineSave(test, "name", val)}
                      />
                    </span>
                    <Badge variant="outline" className="font-mono text-xs shrink-0">{test.code}</Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={getCategoryColor(test.category)}>{test.category}</Badge>
                    <span className="text-sm font-medium">
                      ₹<InlineEditCell
                        value={String(test.price)}
                        onSave={(val) => handleInlineSave(test, "price", val)}
                        type="number"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenTemplateSheet(test)}
                      data-testid={`button-ai-template-${test.id}`}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditTest(test)}
                      data-testid={`button-edit-test-${test.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-test-${test.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Test</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{test.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTestMutation.mutate(test.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isPackageDialogOpen} onOpenChange={handlePackageDialogClose}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-package">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Package
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>{editingPackageId ? "Edit Test Package" : "Create Test Package"}</DialogTitle>
                  <DialogDescription>
                    {editingPackageId ? "Update the package details below." : "Bundle multiple tests together at a discounted price."}
                  </DialogDescription>
                </DialogHeader>
                <form id="package-form" onSubmit={handlePackageSubmit} className="flex-1 overflow-y-auto space-y-4 mt-4 pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="packageName">Package Name *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="packageName"
                        value={packageFormData.name}
                        onChange={(e) =>
                          setPackageFormData({ ...packageFormData, name: e.target.value })
                        }
                        required
                        placeholder="e.g., Full Body Checkup"
                        className="flex-1"
                        data-testid="input-package-name"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAiSuggestPackage}
                        disabled={aiSuggestPackageMutation.isPending || !packageFormData.name.trim() || tests.length === 0}
                        data-testid="button-ai-suggest-package"
                      >
                        {aiSuggestPackageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">AI Suggest</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="packageDescription">Description</Label>
                    <Textarea
                      id="packageDescription"
                      value={packageFormData.description}
                      onChange={(e) =>
                        setPackageFormData({ ...packageFormData, description: e.target.value })
                      }
                      rows={2}
                      placeholder="Describe what this package includes..."
                      data-testid="input-package-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Tests *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tests to add..."
                        value={packageTestSearch}
                        onChange={(e) => setPackageTestSearch(e.target.value)}
                        className="pl-10"
                        data-testid="input-package-test-search"
                      />
                    </div>
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                      {filteredPackageTests.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          {tests.length === 0
                            ? "No tests available. Create tests first."
                            : "No tests match your search."}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredPackageTests.map((test) => (
                            <label
                              key={test.id}
                              className="flex items-center gap-3 p-2 rounded hover-elevate cursor-pointer"
                              data-testid={`checkbox-test-${test.id}`}
                            >
                              <Checkbox
                                checked={packageFormData.testIds.includes(test.id)}
                                onCheckedChange={() => toggleTestInPackage(test.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{test.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {test.code} - {test.category}
                                </div>
                              </div>
                              <div className="text-sm font-medium">₹{test.price}</div>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    {packageFormData.testIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {tests
                          .filter((t) => packageFormData.testIds.includes(t.id))
                          .map((test) => (
                            <Badge
                              key={test.id}
                              variant="secondary"
                              className="text-xs gap-1"
                            >
                              {test.name}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => toggleTestInPackage(test.id)}
                              />
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountPercent">Discount Percentage</Label>
                    <div className="relative">
                      <Input
                        id="discountPercent"
                        type="number"
                        min="0"
                        max="100"
                        value={packageFormData.discountPercent}
                        onChange={(e) =>
                          setPackageFormData({ ...packageFormData, discountPercent: e.target.value })
                        }
                        placeholder="0"
                        className="pr-10"
                        data-testid="input-discount-percent"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {packageFormData.testIds.length > 0 && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Original Price:</span>
                          <span>₹{selectedTestsTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Discount:</span>
                          <span className="text-green-600">
                            -{packageFormData.discountPercent || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-2 mt-2">
                          <span>Package Price:</span>
                          <span className="text-primary">₹{discountedTotal.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </form>
                <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPackageDialogOpen(false)}
                    data-testid="button-cancel-package"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="package-form"
                    disabled={(createPackageMutation.isPending || updatePackageMutation.isPending) || packageFormData.testIds.length === 0}
                    data-testid="button-submit-package"
                  >
                    {(createPackageMutation.isPending || updatePackageMutation.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingPackageId ? "Save Changes" : "Create Package"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {packagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : packages.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No packages yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Create test packages to offer bundled tests at discounted prices
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => {
                const pkgTests = tests.filter((t) => pkg.testIds.includes(t.id));
                return (
                  <Card key={pkg.id} className="hover-elevate" data-testid={`card-package-${pkg.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        {pkg.discountPercent && Number(pkg.discountPercent) > 0 && (
                          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                            {pkg.discountPercent}% OFF
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground mb-1">{pkg.name}</h3>
                      {pkg.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pkgTests.slice(0, 3).map((t) => (
                          <Badge key={t.id} variant="outline" className="text-xs">
                            {t.name}
                          </Badge>
                        ))}
                        {pkgTests.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{pkgTests.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          {pkg.originalPrice !== pkg.discountedPrice && (
                            <span className="text-sm text-muted-foreground line-through mr-2">
                              ₹{pkg.originalPrice}
                            </span>
                          )}
                          <span className="font-semibold text-primary">₹{pkg.discountedPrice}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground mr-1">
                            {pkg.testIds.length} tests
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPackage(pkg)}
                            data-testid={`button-edit-package-${pkg.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-delete-package-${pkg.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Package</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{pkg.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deletePackageMutation.mutate(pkg.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const testNames = pkgTests.map((t) => t.name).join(", ");
                              const message = `Check out our ${pkg.name}!\n\nIncludes: ${testNames}\n\n${pkg.discountPercent && Number(pkg.discountPercent) > 0 ? `Special Offer: ${pkg.discountPercent}% OFF\n` : ""}Original Price: ₹${pkg.originalPrice}\nPackage Price: ₹${pkg.discountedPrice}\n\nContact us to book!`;
                              window.open(
                                `https://wa.me/?text=${encodeURIComponent(message)}`,
                                "_blank"
                              );
                            }}
                            data-testid={`button-share-package-${pkg.id}`}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={isTemplateSheetOpen} onOpenChange={setIsTemplateSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Report Template
            </SheetTitle>
            <SheetDescription>
              {selectedTestForTemplate?.name} ({selectedTestForTemplate?.code})
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGenerateTemplate}
                disabled={generateTemplateMutation.isPending}
                data-testid="button-generate-template"
              >
                {generateTemplateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : generatedTemplate ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {generatedTemplate ? "Regenerate Template" : "Generate with AI"}
              </Button>
              
              {generatedTemplate && (
                <Button
                  variant="default"
                  onClick={handleSaveTemplate}
                  disabled={saveTemplateMutation.isPending}
                  data-testid="button-save-template"
                >
                  {saveTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Template
                </Button>
              )}
            </div>

            {generateTemplateMutation.isPending && (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                  <p className="text-muted-foreground">AI is generating your report template...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
                </div>
              </div>
            )}

            {generatedTemplate && !generateTemplateMutation.isPending && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      {isEditMode ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {isEditMode ? "Edit Template" : "Template Preview"}
                    </h4>
                    <Button
                      size="sm"
                      variant={isEditMode ? "default" : "outline"}
                      onClick={() => setIsEditMode(!isEditMode)}
                      data-testid="button-toggle-edit-mode"
                    >
                      {isEditMode ? (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          Preview
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Test Name:</span> {generatedTemplate.testName}</p>
                    <p><span className="text-muted-foreground">Category:</span> {generatedTemplate.category}</p>
                    <p><span className="text-muted-foreground">Sample Type:</span> {generatedTemplate.sampleType}</p>
                    {generatedTemplate.methodology && (
                      <p><span className="text-muted-foreground">Methodology:</span> {generatedTemplate.methodology}</p>
                    )}
                    <p><span className="text-muted-foreground">Sections:</span> {generatedTemplate.sections?.length || 0}</p>
                    <p><span className="text-muted-foreground">Total Fields:</span> {generatedTemplate.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {generatedTemplate.sections?.map((section, sectionIndex) => (
                    <Card
                      key={sectionIndex}
                      onDragOver={(e) => {
                        if (draggedSection === null || !isEditMode) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDragOverSection(sectionIndex);
                      }}
                      onDragLeave={() => {
                        if (dragOverSection === sectionIndex) setDragOverSection(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedSection !== null && draggedSection !== sectionIndex) {
                          moveSection(draggedSection, sectionIndex);
                        }
                        setDraggedSection(null);
                        setDragOverSection(null);
                      }}
                      className={dragOverSection === sectionIndex && draggedSection !== sectionIndex ? "ring-2 ring-primary" : ""}
                      data-testid={`card-section-${sectionIndex}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            {isEditMode && (
                              <div className="flex flex-col items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => moveSection(sectionIndex, sectionIndex - 1)}
                                  disabled={sectionIndex === 0}
                                  className="p-0.5 rounded text-muted-foreground disabled:opacity-30"
                                  data-testid={`button-move-section-up-${sectionIndex}`}
                                >
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedSection(sectionIndex);
                                    e.dataTransfer.effectAllowed = "move";
                                    e.dataTransfer.setData("text/plain", `section-${sectionIndex}`);
                                    const card = (e.currentTarget as HTMLElement).closest("[data-testid^='card-section-']") as HTMLElement;
                                    if (card) card.style.opacity = "0.5";
                                  }}
                                  onDragEnd={() => {
                                    setDraggedSection(null);
                                    setDragOverSection(null);
                                    document.querySelectorAll("[data-testid^='card-section-']").forEach((el) => {
                                      (el as HTMLElement).style.opacity = "1";
                                    });
                                  }}
                                  className="cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => moveSection(sectionIndex, sectionIndex + 1)}
                                  disabled={sectionIndex === generatedTemplate.sections.length - 1}
                                  className="p-0.5 rounded text-muted-foreground disabled:opacity-30"
                                  data-testid={`button-move-section-down-${sectionIndex}`}
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                            {isEditMode ? (
                              <Input
                                value={section.name}
                                onChange={(e) => updateSectionName(sectionIndex, e.target.value.toUpperCase())}
                                className="font-semibold uppercase tracking-wide text-sm"
                                data-testid={`input-section-name-${sectionIndex}`}
                              />
                            ) : (
                              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                {section.name}
                              </CardTitle>
                            )}
                          </div>
                          {isEditMode && generatedTemplate.sections.length > 1 && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-section-${sectionIndex}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Section</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the "{section.name}" section and all its fields? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSection(sectionIndex)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isEditMode ? (
                          <div className="space-y-3">
                            {section.fields?.map((field, fieldIndex) => (
                              <div
                                key={fieldIndex}
                                className={`border rounded-lg p-3 bg-background ${dragOverField?.section === sectionIndex && dragOverField?.field === fieldIndex && draggedField?.field !== fieldIndex ? "ring-2 ring-primary" : ""}`}
                                onDragOver={(e) => {
                                  if (!draggedField || draggedField.section !== sectionIndex) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = "move";
                                  setDragOverField({ section: sectionIndex, field: fieldIndex });
                                }}
                                onDragLeave={() => {
                                  if (dragOverField?.section === sectionIndex && dragOverField?.field === fieldIndex) {
                                    setDragOverField(null);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (draggedField && draggedField.section === sectionIndex && draggedField.field !== fieldIndex) {
                                    moveField(sectionIndex, draggedField.field, fieldIndex);
                                  }
                                  setDraggedField(null);
                                  setDragOverField(null);
                                }}
                                data-testid={`field-item-${sectionIndex}-${fieldIndex}`}
                              >
                                <div className="flex items-start gap-2 mb-3">
                                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => moveField(sectionIndex, fieldIndex, fieldIndex - 1)}
                                      disabled={fieldIndex === 0}
                                      className="p-0.5 rounded text-muted-foreground disabled:opacity-30"
                                      data-testid={`button-move-field-up-${sectionIndex}-${fieldIndex}`}
                                    >
                                      <ArrowUp className="h-2.5 w-2.5" />
                                    </button>
                                    <div
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        setDraggedField({ section: sectionIndex, field: fieldIndex });
                                        e.dataTransfer.effectAllowed = "move";
                                        e.dataTransfer.setData("text/plain", `field-${sectionIndex}-${fieldIndex}`);
                                        const fieldEl = (e.currentTarget as HTMLElement).closest("[data-testid^='field-item-']") as HTMLElement;
                                        if (fieldEl) fieldEl.style.opacity = "0.5";
                                      }}
                                      onDragEnd={() => {
                                        setDraggedField(null);
                                        setDragOverField(null);
                                        document.querySelectorAll("[data-testid^='field-item-']").forEach((el) => {
                                          (el as HTMLElement).style.opacity = "1";
                                        });
                                      }}
                                      className="cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => moveField(sectionIndex, fieldIndex, fieldIndex + 1)}
                                      disabled={fieldIndex === (section.fields?.length || 0) - 1}
                                      className="p-0.5 rounded text-muted-foreground disabled:opacity-30"
                                      data-testid={`button-move-field-down-${sectionIndex}-${fieldIndex}`}
                                    >
                                      <ArrowDown className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Field Name</Label>
                                      <Input
                                        value={field.name}
                                        onChange={(e) => updateField(sectionIndex, fieldIndex, { name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                        className="text-sm"
                                        placeholder="field_name"
                                        data-testid={`input-field-name-${sectionIndex}-${fieldIndex}`}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Display Label</Label>
                                      <Input
                                        value={field.label}
                                        onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
                                        className="text-sm"
                                        placeholder="Display Label"
                                        data-testid={`input-field-label-${sectionIndex}-${fieldIndex}`}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Unit</Label>
                                      <Input
                                        value={field.unit}
                                        onChange={(e) => updateField(sectionIndex, fieldIndex, { unit: e.target.value })}
                                        className="text-sm"
                                        placeholder="g/dL, mg/L, etc."
                                        data-testid={`input-field-unit-${sectionIndex}-${fieldIndex}`}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Type</Label>
                                      <Select
                                        value={field.type}
                                        onValueChange={(value) => updateField(sectionIndex, fieldIndex, { type: value as "number" | "text" | "select" })}
                                      >
                                        <SelectTrigger className="text-sm" data-testid={`select-field-type-${sectionIndex}-${fieldIndex}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="number">Number</SelectItem>
                                          <SelectItem value="text">Text</SelectItem>
                                          <SelectItem value="select">Select</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {field.type === "number" && (
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Decimal Places</Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="6"
                                          value={field.decimalPlaces ?? ""}
                                          onChange={(e) => updateField(sectionIndex, fieldIndex, { decimalPlaces: e.target.value ? parseInt(e.target.value) : undefined })}
                                          className="text-sm"
                                          placeholder="2"
                                          data-testid={`input-field-decimals-${sectionIndex}-${fieldIndex}`}
                                        />
                                      </div>
                                    )}
                                    {field.type === "select" && (
                                      <div className="col-span-2">
                                        <Label className="text-xs text-muted-foreground">Options (comma separated)</Label>
                                        <Input
                                          value={field.options?.join(", ") ?? ""}
                                          onChange={(e) => updateField(sectionIndex, fieldIndex, { options: e.target.value.split(",").map(o => o.trim()).filter(o => o) })}
                                          className="text-sm"
                                          placeholder="Option 1, Option 2, Option 3"
                                          data-testid={`input-field-options-${sectionIndex}-${fieldIndex}`}
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive flex-shrink-0"
                                        data-testid={`button-delete-field-${sectionIndex}-${fieldIndex}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Field</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{field.label}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteField(sectionIndex, fieldIndex)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                                {field.type === "number" && (
                                  <div className="ml-7 grid grid-cols-3 gap-2">
                                    <div className="col-span-3">
                                      <Label className="text-xs text-muted-foreground">Reference Ranges</Label>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Male Min - Max</Label>
                                      <div className="flex gap-1">
                                        <Input
                                          type="number"
                                          step="any"
                                          value={field.referenceRange?.male?.min ?? ""}
                                          onChange={(e) => updateFieldReferenceRange(sectionIndex, fieldIndex, "male", "min", e.target.value)}
                                          className="text-xs"
                                          placeholder="Min"
                                        />
                                        <Input
                                          type="number"
                                          step="any"
                                          value={field.referenceRange?.male?.max ?? ""}
                                          onChange={(e) => updateFieldReferenceRange(sectionIndex, fieldIndex, "male", "max", e.target.value)}
                                          className="text-xs"
                                          placeholder="Max"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">Female Min - Max</Label>
                                      <div className="flex gap-1">
                                        <Input
                                          type="number"
                                          step="any"
                                          value={field.referenceRange?.female?.min ?? ""}
                                          onChange={(e) => updateFieldReferenceRange(sectionIndex, fieldIndex, "female", "min", e.target.value)}
                                          className="text-xs"
                                          placeholder="Min"
                                        />
                                        <Input
                                          type="number"
                                          step="any"
                                          value={field.referenceRange?.female?.max ?? ""}
                                          onChange={(e) => updateFieldReferenceRange(sectionIndex, fieldIndex, "female", "max", e.target.value)}
                                          className="text-xs"
                                          placeholder="Max"
                                        />
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">General Min - Max</Label>
                                      <div className="flex gap-1">
                                        <Input
                                          type="number"
                                          step="any"
                                          value={field.referenceRange?.general?.min ?? ""}
                                          onChange={(e) => updateFieldReferenceRange(sectionIndex, fieldIndex, "general", "min", e.target.value)}
                                          className="text-xs"
                                          placeholder="Min"
                                        />
                                        <Input
                                          type="number"
                                          step="any"
                                          value={field.referenceRange?.general?.max ?? ""}
                                          onChange={(e) => updateFieldReferenceRange(sectionIndex, fieldIndex, "general", "max", e.target.value)}
                                          className="text-xs"
                                          placeholder="Max"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => addField(sectionIndex)}
                              data-testid={`button-add-field-${sectionIndex}`}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Field
                            </Button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="pb-2 pr-4">Field</th>
                                  <th className="pb-2 pr-4">Unit</th>
                                  <th className="pb-2 pr-4">Type</th>
                                  <th className="pb-2">Reference Range</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section.fields?.map((field, fieldIndex) => (
                                  <tr key={fieldIndex} className="border-b last:border-0">
                                    <td className="py-2 pr-4 font-medium">{field.label}</td>
                                    <td className="py-2 pr-4 text-muted-foreground">{field.unit || "-"}</td>
                                    <td className="py-2 pr-4">
                                      <Badge variant="outline" className="text-xs">
                                        {field.type}
                                      </Badge>
                                    </td>
                                    <td className="py-2 text-muted-foreground">{getReferenceRangeText(field)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {isEditMode && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={addSection}
                      data-testid="button-add-section"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!generatedTemplate && !generateTemplateMutation.isPending && (
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-2">No report template yet</p>
                <p className="text-sm text-muted-foreground">
                  Click "Generate with AI" to create a professional report template for this test.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
