import { Router, json } from "express";
import { db } from "../db";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { z } from "zod";
import OpenAI from "openai";
import {
  suppliers,
  medicines,
  medicineSales,
  pharmacyOrders,
  organizations,
  moduleReferrals,
  storageLocations,
  patients,
  opVisits,
  prescriptions,
  doctors,
  insertSupplierSchema,
  insertMedicineSchema,
  insertMedicineSaleSchema,
  insertPharmacyOrderSchema,
  insertModuleReferralSchema,
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

const router = Router();

// ============ MEDICINES ============
router.get("/medicines", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    const result = await db
      .select()
      .from(medicines)
      .where(eq(medicines.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching medicines:", error);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

router.post("/medicines", async (req, res) => {
  try {
    const data = insertMedicineSchema.parse(req.body);
    const [medicine] = await db.insert(medicines).values(data).returning();
    res.status(201).json(medicine);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating medicine:", error);
    res.status(500).json({ error: "Failed to create medicine" });
  }
});

router.patch("/medicines/:id", async (req, res) => {
  try {
    const [medicine] = await db
      .update(medicines)
      .set(req.body)
      .where(eq(medicines.id, req.params.id))
      .returning();
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }
    res.json(medicine);
  } catch (error) {
    console.error("Error updating medicine:", error);
    res.status(500).json({ error: "Failed to update medicine" });
  }
});

router.delete("/medicines/:id", async (req, res) => {
  try {
    const [medicine] = await db
      .update(medicines)
      .set({ isActive: false })
      .where(eq(medicines.id, req.params.id))
      .returning();
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting medicine:", error);
    res.status(500).json({ error: "Failed to delete medicine" });
  }
});

router.patch("/medicines/:id/stock", async (req, res) => {
  try {
    const { quantity } = req.body;
    if (typeof quantity !== "number") {
      return res.status(400).json({ error: "quantity must be a number" });
    }
    const [medicine] = await db
      .update(medicines)
      .set({ stock: sql`COALESCE(${medicines.stock}, 0) + ${quantity}` })
      .where(eq(medicines.id, req.params.id))
      .returning();
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }
    res.json(medicine);
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

// ============ SUPPLIERS ============
router.get("/suppliers", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    const result = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.organizationId, organizationId));
    res.json(result);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

router.post("/suppliers", async (req, res) => {
  try {
    const data = insertSupplierSchema.parse(req.body);
    const [supplier] = await db.insert(suppliers).values(data).returning();
    res.status(201).json(supplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

router.patch("/suppliers/:id", async (req, res) => {
  try {
    const [supplier] = await db
      .update(suppliers)
      .set(req.body)
      .where(eq(suppliers.id, req.params.id))
      .returning();
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    res.json(supplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

router.delete("/suppliers/:id", async (req, res) => {
  try {
    const [supplier] = await db
      .update(suppliers)
      .set({ isActive: false })
      .where(eq(suppliers.id, req.params.id))
      .returning();
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

// ============ SALES ============
router.get("/sales", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    const result = await db
      .select()
      .from(medicineSales)
      .where(eq(medicineSales.organizationId, organizationId))
      .orderBy(desc(medicineSales.createdAt));
    res.json(result);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

router.get("/sales/:id", async (req, res) => {
  try {
    const [sale] = await db
      .select()
      .from(medicineSales)
      .where(eq(medicineSales.id, req.params.id))
      .limit(1);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }
    res.json(sale);
  } catch (error) {
    console.error("Error fetching sale:", error);
    res.status(500).json({ error: "Failed to fetch sale" });
  }
});

router.post("/sales", async (req, res) => {
  try {
    const invoiceNumber = `MED-${Date.now()}`;
    const data = insertMedicineSaleSchema.parse({
      ...req.body,
      invoiceNumber,
    });

    const items = data.items as Array<{ medicineId: string; quantity: number }>;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.medicineId && typeof item.quantity === "number") {
          await db
            .update(medicines)
            .set({
              stock: sql`GREATEST(COALESCE(${medicines.stock}, 0) - ${item.quantity}, 0)`,
            })
            .where(eq(medicines.id, item.medicineId));
        }
      }
    }

    const [sale] = await db.insert(medicineSales).values(data).returning();
    res.status(201).json(sale);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating sale:", error);
    res.status(500).json({ error: "Failed to create sale" });
  }
});

// ============ DASHBOARD STATS ============
router.get("/stats", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    const [totalMedicinesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(medicines)
      .where(
        and(
          eq(medicines.organizationId, organizationId),
          eq(medicines.isActive, true)
        )
      );

    const [lowStockResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(medicines)
      .where(
        and(
          eq(medicines.organizationId, organizationId),
          eq(medicines.isActive, true),
          sql`COALESCE(${medicines.stock}, 0) < COALESCE(${medicines.reorderLevel}, 10)`
        )
      );

    const [expiringSoonResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(medicines)
      .where(
        and(
          eq(medicines.organizationId, organizationId),
          eq(medicines.isActive, true),
          sql`${medicines.expiryDate} IS NOT NULL AND ${medicines.expiryDate} <= ${thirtyDaysStr} AND ${medicines.expiryDate} >= ${todayStr}`
        )
      );

    const [todaySalesResult] = await db
      .select({
        count: sql<number>`count(*)::int`,
        revenue: sql<string>`COALESCE(sum(${medicineSales.total}::numeric), 0)::text`,
      })
      .from(medicineSales)
      .where(
        and(
          eq(medicineSales.organizationId, organizationId),
          sql`${medicineSales.createdAt} >= ${todayStart.toISOString()}`
        )
      );

    res.json({
      totalMedicines: totalMedicinesResult?.count ?? 0,
      lowStockCount: lowStockResult?.count ?? 0,
      expiringSoonCount: expiringSoonResult?.count ?? 0,
      todaySales: todaySalesResult?.count ?? 0,
      todayRevenue: parseFloat(todaySalesResult?.revenue ?? "0"),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ============ BULK IMPORT ============
router.post("/medicines/bulk-import", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items array is required and must not be empty" });
    }

    const results = { imported: 0, failed: 0, errors: [] as Array<{ index: number; error: string }> };

    for (let i = 0; i < items.length; i++) {
      try {
        const data = insertMedicineSchema.parse(items[i]);
        await db.insert(medicines).values(data);
        results.imported++;
      } catch (err) {
        results.failed++;
        const message = err instanceof z.ZodError
          ? err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")
          : "Invalid data";
        results.errors.push({ index: i, error: message });
      }
    }

    res.status(201).json({
      success: true,
      imported: results.imported,
      failed: results.failed,
      total: items.length,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Error bulk importing medicines:", error);
    res.status(500).json({ error: "Failed to bulk import medicines" });
  }
});

// ============ BARCODE LOOKUP ============
router.get("/medicines/by-barcode", async (req, res) => {
  try {
    const barcode = req.query.barcode as string;
    const organizationId = req.query.organizationId as string;
    if (!barcode || !organizationId) {
      return res.status(400).json({ error: "barcode and organizationId are required" });
    }
    const [medicine] = await db
      .select()
      .from(medicines)
      .where(
        and(
          eq(medicines.organizationId, organizationId),
          eq(medicines.barcode, barcode),
          eq(medicines.isActive, true)
        )
      )
      .limit(1);
    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found for this barcode" });
    }
    res.json(medicine);
  } catch (error) {
    console.error("Error fetching medicine by barcode:", error);
    res.status(500).json({ error: "Failed to fetch medicine by barcode" });
  }
});

// ============ AI ROUTES ============
router.post("/ai/identify-medicine", async (req, res) => {
  try {
    const { name, barcode } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Medicine name is required" });
    }

    const barcodeClause = barcode ? `\nBarcode: ${barcode}` : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a pharmaceutical database assistant specializing in the Indian pharmaceutical market. Given a medicine name (and optionally a barcode), identify the medicine and return its details. Use knowledge of common Indian medicine brands (Sun Pharma, Cipla, Dr. Reddy's, Lupin, Mankind, etc.) and generic formulations. Return ONLY valid JSON.

Response format:
{
  "genericName": "Generic/salt name (e.g., Paracetamol)",
  "category": "Therapeutic category (e.g., Analgesic, Antibiotic, Antidiabetic)",
  "form": "Dosage form (e.g., Tablet, Capsule, Syrup, Injection)",
  "strength": "Strength (e.g., 500mg, 250mg/5ml)",
  "manufacturer": "Manufacturer name",
  "description": "Brief description of the medicine and its uses",
  "hsnCode": "HSN code for GST classification (e.g., 3004 for medicaments)",
  "requiresPrescription": true/false
}

If you cannot identify the medicine, still return the JSON structure with your best guesses and set description to indicate uncertainty.`,
        },
        {
          role: "user",
          content: `Identify this medicine:\nName: ${name}${barcodeClause}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (error) {
    console.error("Error identifying medicine:", error);
    res.status(500).json({ error: "Failed to identify medicine" });
  }
});

router.post("/ai/identify-medicine-image", json({ limit: "10mb" }), async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Image data is required" });
    }
    if (!image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Invalid image format. Expected a data URL (data:image/...)" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a pharmaceutical image recognition assistant specializing in the Indian pharmaceutical market. You will be shown an image of a medicine strip, box, or label. Your job is to:

1. Look at the medicine strip, box, or label in the image
2. Extract ALL visible text including brand name, generic name, strength, manufacturer, batch number, expiry date, MRP
3. Use your knowledge of Indian pharmaceutical brands (Sun Pharma, Cipla, Dr. Reddy's, Lupin, Mankind, Torrent, Alkem, Zydus, Glenmark, Abbott India, etc.) to identify the medicine
4. If certain fields are not visible in the image, make your best guess based on your pharmaceutical knowledge

Return ONLY valid JSON in this exact format:
{
  "name": "Medicine brand name as printed on packaging",
  "genericName": "Generic/salt name (e.g., Paracetamol, Amoxicillin)",
  "category": "Therapeutic category (e.g., Analgesic, Antibiotic, Antidiabetic)",
  "form": "Dosage form (Tablet, Capsule, Syrup, Injection, etc.)",
  "strength": "Strength as printed (e.g., 500mg, 250mg/5ml)",
  "manufacturer": "Manufacturer name",
  "brand": "Brand name",
  "batchNumber": "Batch/Lot number if visible, otherwise empty string",
  "expiryDate": "Expiry date if visible in YYYY-MM format, otherwise empty string",
  "mrp": "MRP if visible (number only, no currency symbol), otherwise empty string",
  "description": "Brief description of the medicine and its primary uses",
  "hsnCode": "HSN code for GST classification (e.g., 3004 for medicaments)",
  "requiresPrescription": true or false
}

Always return valid JSON. If you cannot read the image clearly, still return the JSON structure with your best guesses and mention uncertainty in the description field.`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: "Identify the medicine in this image. Extract all visible details from the packaging, strip, or label." },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (error) {
    console.error("Error identifying medicine from image:", error);
    res.status(500).json({ error: "Failed to identify medicine from image" });
  }
});

router.post("/ai/smart-search", async (req, res) => {
  try {
    const { query, organizationId } = req.body;
    if (!query || !organizationId) {
      return res.status(400).json({ error: "query and organizationId are required" });
    }

    const allMedicines = await db
      .select()
      .from(medicines)
      .where(
        and(
          eq(medicines.organizationId, organizationId),
          eq(medicines.isActive, true)
        )
      );

    if (allMedicines.length === 0) {
      return res.json({ matches: [], message: "No medicines in inventory" });
    }

    const medicineList = allMedicines.map(m => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      category: m.category,
      form: m.form,
      strength: m.strength,
      manufacturer: m.manufacturer,
      description: m.description,
      stock: m.stock,
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a smart pharmacy search assistant for an Indian pharmacy. Given a search query (which could be symptoms, a disease name, a description, or a medicine name) and the pharmacy's current inventory, find the most relevant medicines. Consider:
- Direct name matches
- Generic name / salt composition matches
- Therapeutic category relevance for symptoms/conditions
- Common Indian brand name equivalents

Return ONLY valid JSON:
{
  "matches": [
    {
      "medicineId": "ID from the inventory list",
      "relevance": "high" | "medium" | "low",
      "reason": "Brief explanation of why this medicine matches the query"
    }
  ]
}

Return up to 10 most relevant matches, ordered by relevance. Only include medicines that are genuinely relevant.`,
        },
        {
          role: "user",
          content: `Search query: "${query}"\n\nAvailable inventory:\n${JSON.stringify(medicineList)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (error) {
    console.error("Error in smart search:", error);
    res.status(500).json({ error: "Failed to perform smart search" });
  }
});

router.post("/ai/stock-insights", async (req, res) => {
  try {
    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ error: "organizationId is required" });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [allMedicines, recentSales] = await Promise.all([
      db
        .select()
        .from(medicines)
        .where(
          and(
            eq(medicines.organizationId, organizationId),
            eq(medicines.isActive, true)
          )
        ),
      db
        .select()
        .from(medicineSales)
        .where(
          and(
            eq(medicineSales.organizationId, organizationId),
            gte(medicineSales.createdAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(medicineSales.createdAt)),
    ]);

    if (allMedicines.length === 0) {
      return res.json({
        reorderSuggestions: [],
        expiryRisks: [],
        slowMovingItems: [],
        salesPatterns: [],
        summary: "No medicines in inventory to analyze.",
      });
    }

    const medicineData = allMedicines.map(m => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      category: m.category,
      stock: m.stock,
      reorderLevel: m.reorderLevel,
      expiryDate: m.expiryDate,
      costPrice: m.costPrice,
      sellingPrice: m.sellingPrice,
      mrp: m.mrp,
    }));

    const salesData = recentSales.map(s => ({
      id: s.id,
      items: s.items,
      total: s.total,
      createdAt: s.createdAt,
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an inventory analytics assistant for an Indian pharmacy/medical store. Analyze the medicine inventory and recent sales data to provide actionable insights. Consider Indian pharmaceutical market patterns, seasonal demand, and common prescribing trends.

Return ONLY valid JSON:
{
  "reorderSuggestions": [
    { "medicineId": "id", "medicineName": "name", "currentStock": 0, "reorderLevel": 0, "urgency": "critical" | "high" | "medium", "reason": "explanation" }
  ],
  "expiryRisks": [
    { "medicineId": "id", "medicineName": "name", "expiryDate": "date", "stock": 0, "riskLevel": "expired" | "critical" | "warning", "suggestion": "what to do" }
  ],
  "slowMovingItems": [
    { "medicineId": "id", "medicineName": "name", "stock": 0, "suggestion": "recommendation" }
  ],
  "salesPatterns": [
    { "observation": "insight about sales trends", "recommendation": "actionable suggestion" }
  ],
  "summary": "Brief overall inventory health summary in 2-3 sentences"
}`,
        },
        {
          role: "user",
          content: `Analyze this pharmacy inventory:\n\nMedicines (${allMedicines.length} items):\n${JSON.stringify(medicineData)}\n\nRecent Sales (last 30 days, ${recentSales.length} transactions):\n${JSON.stringify(salesData)}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (error) {
    console.error("Error generating stock insights:", error);
    res.status(500).json({ error: "Failed to generate stock insights" });
  }
});

router.post("/ai/interaction-check", async (req, res) => {
  try {
    const { medicines: medicineList } = req.body;
    if (!Array.isArray(medicineList) || medicineList.length < 2) {
      return res.status(400).json({ error: "At least 2 medicines are required for interaction check" });
    }

    const medicineNames = medicineList.map((m: any) =>
      typeof m === "string" ? m : m.name || m.genericName || "Unknown"
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a clinical pharmacology assistant specializing in drug-drug interactions. Given a list of medicines, check for potential interactions between them. Consider:
- Direct pharmacological interactions
- Contraindications
- Common side effect amplifications
- Food-drug interactions relevant to the combination
- Interactions commonly seen in Indian prescribing patterns

Return ONLY valid JSON:
{
  "warnings": [
    {
      "medicines": ["Medicine A", "Medicine B"],
      "severity": "high" | "moderate" | "low",
      "type": "interaction type (e.g., pharmacokinetic, pharmacodynamic, contraindication)",
      "description": "Clear explanation of the interaction and potential risk",
      "recommendation": "What to do (e.g., avoid combination, monitor closely, adjust timing)"
    }
  ],
  "safetyNote": "General safety summary about the combination"
}

If no significant interactions are found, return an empty warnings array with a reassuring safetyNote. Always err on the side of caution.`,
        },
        {
          role: "user",
          content: `Check for drug interactions between these medicines:\n${medicineNames.join(", ")}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (error) {
    console.error("Error checking drug interactions:", error);
    res.status(500).json({ error: "Failed to check drug interactions" });
  }
});

// ============ PHARMACY ORDERS ============
router.get("/orders", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    const result = await db
      .select()
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.organizationId, organizationId))
      .orderBy(desc(pharmacyOrders.createdAt));
    res.json(result);
  } catch (error) {
    console.error("Error fetching pharmacy orders:", error);
    res.status(500).json({ error: "Failed to fetch pharmacy orders" });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "confirmed", "ready", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [order] = await db
      .update(pharmacyOrders)
      .set({ status })
      .where(eq(pharmacyOrders.id, req.params.id))
      .returning();
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ============ PUBLIC PHARMACY PORTAL ============
router.get("/public/org/:orgId", async (req, res) => {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, req.params.orgId))
      .limit(1);
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }
    if (!org.subscribedModules?.includes("medlab")) {
      return res.status(403).json({ error: "Pharmacy module is not active for this organization" });
    }
    res.json({
      id: org.id,
      name: org.name,
      pharmacyName: org.pharmacyName,
      logo: org.logo,
      address: org.address,
      city: org.city,
      state: org.state,
      phone: org.phone,
      email: org.email,
      primaryColor: org.primaryColor,
    });
  } catch (error) {
    console.error("Error fetching org for pharmacy portal:", error);
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

router.get("/public/org/:orgId/medicines", async (req, res) => {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, req.params.orgId))
      .limit(1);
    if (!org || !org.subscribedModules?.includes("medlab")) {
      return res.status(404).json({ error: "Pharmacy not found" });
    }
    const result = await db
      .select()
      .from(medicines)
      .where(
        and(
          eq(medicines.organizationId, req.params.orgId),
          eq(medicines.isActive, true)
        )
      );
    const available = result
      .filter((m) => (m.stock ?? 0) > 0)
      .map((m) => ({
        id: m.id,
        name: m.name,
        genericName: m.genericName,
        brand: m.brand,
        category: m.category,
        form: m.form,
        strength: m.strength,
        sellingPrice: m.sellingPrice,
        requiresPrescription: m.requiresPrescription,
        description: m.description,
        inStock: true,
      }));
    res.json(available);
  } catch (error) {
    console.error("Error fetching public medicines:", error);
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

router.post("/public/org/:orgId/order", async (req, res) => {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, req.params.orgId))
      .limit(1);
    if (!org || !org.subscribedModules?.includes("medlab")) {
      return res.status(404).json({ error: "Pharmacy not found" });
    }

    const orderNumber = `ORD-${Date.now()}`;
    const data = insertPharmacyOrderSchema.parse({
      ...req.body,
      organizationId: req.params.orgId,
      orderNumber,
    });

    const [order] = await db.insert(pharmacyOrders).values(data).returning();
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating pharmacy order:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// ============ REFERRALS ============
router.get("/referrals", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    const conditions = [eq(moduleReferrals.organizationId, organizationId)];
    const targetModule = req.query.targetModule as string;
    if (targetModule) {
      conditions.push(eq(moduleReferrals.targetModule, targetModule));
    }
    const status = req.query.status as string;
    if (status) {
      conditions.push(eq(moduleReferrals.status, status));
    }
    const result = await db
      .select()
      .from(moduleReferrals)
      .where(and(...conditions))
      .orderBy(desc(moduleReferrals.createdAt));
    res.json(result);
  } catch (error) {
    console.error("Error fetching referrals:", error);
    res.status(500).json({ error: "Failed to fetch referrals" });
  }
});

router.post("/referrals", async (req, res) => {
  try {
    const referralNumber = `REF-${Date.now()}`;
    const data = insertModuleReferralSchema.parse({
      ...req.body,
      referralNumber,
    });
    const [referral] = await db.insert(moduleReferrals).values(data).returning();
    res.status(201).json(referral);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating referral:", error);
    res.status(500).json({ error: "Failed to create referral" });
  }
});

router.patch("/referrals/:id/status", async (req, res) => {
  try {
    const { status, linkedSaleId, linkedTestId } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }
    const updateData: Record<string, any> = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    if (linkedSaleId) {
      updateData.linkedSaleId = linkedSaleId;
    }
    if (linkedTestId) {
      updateData.linkedTestId = linkedTestId;
    }
    const [referral] = await db
      .update(moduleReferrals)
      .set(updateData)
      .where(eq(moduleReferrals.id, req.params.id))
      .returning();
    if (!referral) {
      return res.status(404).json({ error: "Referral not found" });
    }
    res.json(referral);
  } catch (error) {
    console.error("Error updating referral status:", error);
    res.status(500).json({ error: "Failed to update referral status" });
  }
});

// ============ PATIENT PRESCRIPTION LOOKUP ============
// Search by phone to find prescriptions from any hospital (for walk-in patients)
router.get("/patients/lookup", async (req, res) => {
  try {
    const phone = req.query.phone as string;
    if (!phone) {
      return res.status(400).json({ error: "Phone number required" });
    }

    // Find patients matching this phone (across all orgs - only returns prescription data)
    const matchingPatients = await db
      .select()
      .from(patients)
      .where(eq(patients.phone, phone));

    if (matchingPatients.length === 0) {
      return res.json([]);
    }

    const results: any[] = [];

    for (const patient of matchingPatients) {
      // Get completed OP visits for this patient
      const visits = await db
        .select()
        .from(opVisits)
        .where(and(eq(opVisits.patientId, patient.id), eq(opVisits.status, "completed")))
        .orderBy(desc(opVisits.createdAt))
        .limit(10);

      for (const visit of visits) {
        const rxItems = await db
          .select()
          .from(prescriptions)
          .where(eq(prescriptions.opVisitId, visit.id));

        if (rxItems.length > 0) {
          let doctorName: string | null = null;
          if (visit.doctorId) {
            const [doctor] = await db.select().from(doctors).where(eq(doctors.id, visit.doctorId));
            if (doctor) doctorName = doctor.name;
          }

          results.push({
            patientName: `${patient.firstName} ${patient.lastName}`,
            patientPhone: patient.phone,
            doctorName,
            date: visit.createdAt,
            opVisitId: visit.id,
            items: rxItems.map((rx) => ({
              medicineName: rx.medicineName,
              dosage: rx.dosage,
              frequency: rx.frequency,
              duration: rx.duration,
              instructions: rx.instructions,
              quantity: rx.quantity,
            })),
          });
        }
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Patient lookup error:", error);
    res.status(500).json({ error: "Lookup failed" });
  }
});

// ============ CUSTOMERS ============
router.get("/customers", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }

    const [sales, orders, referrals] = await Promise.all([
      db
        .select()
        .from(medicineSales)
        .where(eq(medicineSales.organizationId, organizationId)),
      db
        .select()
        .from(pharmacyOrders)
        .where(eq(pharmacyOrders.organizationId, organizationId)),
      db
        .select()
        .from(moduleReferrals)
        .where(
          and(
            eq(moduleReferrals.organizationId, organizationId),
            eq(moduleReferrals.targetModule, "medlab")
          )
        ),
    ]);

    const customerMap = new Map<string, {
      name: string;
      phone: string;
      totalPurchases: number;
      totalOrders: number;
      totalReferrals: number;
      totalSpent: number;
      lastVisit: Date | null;
    }>();

    for (const sale of sales) {
      const phone = sale.customerPhone;
      if (!phone) continue;
      const existing = customerMap.get(phone) || {
        name: sale.customerName || "",
        phone,
        totalPurchases: 0,
        totalOrders: 0,
        totalReferrals: 0,
        totalSpent: 0,
        lastVisit: null,
      };
      existing.totalPurchases++;
      existing.totalSpent += parseFloat(sale.total || "0");
      if (sale.customerName) existing.name = sale.customerName;
      const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
      if (saleDate && (!existing.lastVisit || saleDate > existing.lastVisit)) {
        existing.lastVisit = saleDate;
      }
      customerMap.set(phone, existing);
    }

    for (const order of orders) {
      const phone = order.customerPhone;
      if (!phone) continue;
      const existing = customerMap.get(phone) || {
        name: order.customerName || "",
        phone,
        totalPurchases: 0,
        totalOrders: 0,
        totalReferrals: 0,
        totalSpent: 0,
        lastVisit: null,
      };
      existing.totalOrders++;
      if (order.customerName) existing.name = order.customerName;
      const orderDate = order.createdAt ? new Date(order.createdAt) : null;
      if (orderDate && (!existing.lastVisit || orderDate > existing.lastVisit)) {
        existing.lastVisit = orderDate;
      }
      customerMap.set(phone, existing);
    }

    for (const referral of referrals) {
      const phone = referral.patientPhone;
      if (!phone) continue;
      const existing = customerMap.get(phone) || {
        name: referral.patientName || "",
        phone,
        totalPurchases: 0,
        totalOrders: 0,
        totalReferrals: 0,
        totalSpent: 0,
        lastVisit: null,
      };
      existing.totalReferrals++;
      if (referral.patientName) existing.name = referral.patientName;
      customerMap.set(phone, existing);
    }

    res.json(Array.from(customerMap.values()));
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.get("/customers/:phone/history", async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    const phone = req.params.phone;

    const [sales, orders, referrals] = await Promise.all([
      db
        .select()
        .from(medicineSales)
        .where(
          and(
            eq(medicineSales.organizationId, organizationId),
            eq(medicineSales.customerPhone, phone)
          )
        )
        .orderBy(desc(medicineSales.createdAt)),
      db
        .select()
        .from(pharmacyOrders)
        .where(
          and(
            eq(pharmacyOrders.organizationId, organizationId),
            eq(pharmacyOrders.customerPhone, phone)
          )
        )
        .orderBy(desc(pharmacyOrders.createdAt)),
      db
        .select()
        .from(moduleReferrals)
        .where(
          and(
            eq(moduleReferrals.organizationId, organizationId),
            eq(moduleReferrals.targetModule, "medlab"),
            eq(moduleReferrals.patientPhone, phone)
          )
        )
        .orderBy(desc(moduleReferrals.createdAt)),
    ]);

    res.json({ sales, orders, referrals });
  } catch (error) {
    console.error("Error fetching customer history:", error);
    res.status(500).json({ error: "Failed to fetch customer history" });
  }
});

// ============ STORAGE LOCATIONS ============
// Helper: get orgId from session (owner-based auth)
async function getSessionOrgId(req: any): Promise<string | null> {
  const userId = req.session?.user?.id;
  if (!userId) return null;
  const [org] = await db.select().from(organizations).where(eq(organizations.ownerId, userId)).limit(1);
  return org?.id || null;
}

router.get("/storage-locations", async (req, res) => {
  try {
    const orgId = await getSessionOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Organization not found" });
    const locations = await db.select().from(storageLocations).where(eq(storageLocations.organizationId, orgId));
    res.json(locations);
  } catch (error) {
    console.error("Error fetching storage locations:", error);
    res.status(500).json({ error: "Failed to fetch storage locations" });
  }
});

router.post("/storage-locations", async (req, res) => {
  try {
    const orgId = await getSessionOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Organization not found" });
    const [created] = await db.insert(storageLocations).values({ ...req.body, organizationId: orgId }).returning();
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating storage location:", error);
    res.status(500).json({ error: "Failed to create storage location" });
  }
});

router.patch("/storage-locations/:id", async (req, res) => {
  try {
    const orgId = await getSessionOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Organization not found" });
    const [existing] = await db.select().from(storageLocations).where(eq(storageLocations.id, req.params.id)).limit(1);
    if (!existing || existing.organizationId !== orgId) {
      return res.status(404).json({ error: "Storage location not found" });
    }
    const [updated] = await db.update(storageLocations).set(req.body).where(eq(storageLocations.id, req.params.id)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Error updating storage location:", error);
    res.status(500).json({ error: "Failed to update storage location" });
  }
});

router.delete("/storage-locations/:id", async (req, res) => {
  try {
    const orgId = await getSessionOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Organization not found" });
    const [existing] = await db.select().from(storageLocations).where(eq(storageLocations.id, req.params.id)).limit(1);
    if (!existing || existing.organizationId !== orgId) {
      return res.status(404).json({ error: "Storage location not found" });
    }
    await db.delete(storageLocations).where(eq(storageLocations.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting storage location:", error);
    res.status(500).json({ error: "Failed to delete storage location" });
  }
});

export default router;
