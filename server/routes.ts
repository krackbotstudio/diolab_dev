import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { insertOrganizationSchema, insertBillSchema, insertSampleSchema, publicBookingFormSchema, updateTestPackageSchema, updateTestSchema, insertStaffSchema, staff as staffTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
import { registerUploadRoutes } from "./uploads";
import { setupCustomAuth } from "./auth/customAuth";
import dioAssistantRouter from "./routes/dio-assistant";
import opPosRouter from "./routes/op-pos";
import medlabRouter from "./routes/medlab";
import cmsRouter from "./routes/cms";
import seoRouter from "./routes/seo";

// Schema for bill items (tests in the bill)
const billItemSchema = z.object({
  testId: z.string().min(1),
  testName: z.string(),
  price: z.number(),
  quantity: z.number().default(1),
  isPackage: z.boolean().optional(),
  packageTestIds: z.array(z.string()).optional(),
});

// Extended bill creation schema with items - omit server-side generated fields
const createBillWithItemsSchema = insertBillSchema.omit({
  organizationId: true,
  branchId: true,
  createdBy: true,
}).extend({
  items: z.array(billItemSchema).optional(),
  branchId: z.string().optional(),
});
import {
  detectDuplicatePatient,
  suggestTests,
  detectBillingAnomalies,
  generatePatientFriendlySummary,
  generateReportAISummary,
  suggestTestDetails,
  suggestPackageTests,
  generateReportTemplate,
  suggestMedicines,
  checkDuplicateSchema,
  suggestTestsSchema,
  checkBillingSchema,
  whatsappSummarySchema,
  reportSummarySchema,
  suggestTestDetailsSchema,
  suggestPackageSchema,
  generateReportTemplateSchema,
  suggestMedicinesSchema,
  analyzeConsultation,
  consultationListenSchema,
} from "./ai";
import QRCode from "qrcode";
import { fromError } from "zod-validation-error";

// Helper to get user ID from session
function getUserId(req: Request): string {
  const sessionUser = (req as any).session?.user;
  return sessionUser?.id ?? "";
}

// Helper to get user's organization ID
async function getOrgId(req: Request): Promise<string | null> {
  const userId = getUserId(req);
  if (!userId) return null;
  const org = await storage.getOrganizationByOwnerId(userId);
  return org?.id || null;
}

// Middleware to require organization
async function requireOrg(req: Request, res: Response): Promise<string | null> {
  const orgId = await getOrgId(req);
  if (!orgId) {
    res.status(401).json({ error: "Organization not found. Please complete onboarding." });
    return null;
  }
  return orgId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register custom authentication routes
  setupCustomAuth(app);

  // Register object storage routes for file uploads
  registerUploadRoutes(app);

  // Register Dio AI Assistant routes
  app.use("/api", dioAssistantRouter);

  // Register OP POS routes
  app.use("/api/op-pos", opPosRouter);

  // Register Medlab routes
  app.use("/api/medlab", medlabRouter);

  // Register CMS (dlabCMS super admin) routes
  app.use("/api/cms", cmsRouter);

  // Register SEO routes (robots.txt, sitemap.xml)
  app.use("/", seoRouter);

  // ============ PATIENTS ============
  app.get("/api/patients", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      let patients = await storage.getPatients(orgId);

      // Filter by module if specified
      const module = req.query.module as string;
      if (module && (module === "diagnostics" || module === "hospitals")) {
        if (module === "hospitals") {
          const allVisits = await storage.getOpVisits(orgId);
          const visitPatientIds = new Set(allVisits.map(v => v.patientId));
          patients = patients.filter(p =>
            p.module === "hospitals" || p.module === "both" || !p.module || visitPatientIds.has(p.id)
          );
        } else {
          patients = patients.filter(p =>
            p.module === module || p.module === "both" || !p.module
          );
        }
      }

      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/search", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const query = req.query.q as string || "";
      let patients = await storage.searchPatients(query, orgId);

      // Filter by module if specified
      const module = req.query.module as string;
      if (module && (module === "diagnostics" || module === "hospitals")) {
        if (module === "hospitals") {
          const allVisits = await storage.getOpVisits(orgId);
          const visitPatientIds = new Set(allVisits.map(v => v.patientId));
          patients = patients.filter(p =>
            p.module === "hospitals" || p.module === "both" || !p.module || visitPatientIds.has(p.id)
          );
        } else {
          patients = patients.filter(p =>
            p.module === module || p.module === "both" || !p.module
          );
        }
      }

      res.json(patients);
    } catch (error) {
      console.error("Error searching patients:", error);
      res.status(500).json({ error: "Failed to search patients" });
    }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const patient = await storage.getPatient(req.params.id);
      if (!patient || patient.organizationId !== orgId) {
        return res.status(404).json({ error: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ error: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      // Generate unique patient ID using crypto UUID for guaranteed uniqueness
      // Format: PAT-XXXXXXXX (first 8 chars of UUID)
      const { randomUUID } = await import("crypto");
      const patientId = `PAT-${randomUUID().substring(0, 8).toUpperCase()}`;

      const patient = await storage.createPatient({
        ...req.body,
        organizationId: orgId,
        patientId: patientId
      });
      res.status(201).json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ error: "Failed to create patient" });
    }
  });

  app.patch("/api/patients/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getPatient(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Patient not found" });
      }
      const patient = await storage.updatePatient(req.params.id, req.body);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Failed to update patient" });
    }
  });

  // ============ TESTS ============
  app.get("/api/tests", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const tests = await storage.getTests(orgId);
      res.json(tests);
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ error: "Failed to fetch tests" });
    }
  });

  app.get("/api/tests/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const test = await storage.getTest(req.params.id);
      if (!test || test.organizationId !== orgId) {
        return res.status(404).json({ error: "Test not found" });
      }
      res.json(test);
    } catch (error) {
      console.error("Error fetching test:", error);
      res.status(500).json({ error: "Failed to fetch test" });
    }
  });

  app.post("/api/tests", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const test = await storage.createTest({ ...req.body, organizationId: orgId });
      res.status(201).json(test);
    } catch (error) {
      console.error("Error creating test:", error);
      res.status(500).json({ error: "Failed to create test" });
    }
  });

  // Update test
  app.patch("/api/tests/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const existing = await storage.getTest(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Test not found" });
      }

      // Validate with Zod schema
      const parseResult = updateTestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.errors
        });
      }

      const validated = parseResult.data;

      // Convert validated data for storage
      const updateData: Record<string, any> = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.code !== undefined) updateData.code = validated.code;
      if (validated.category !== undefined) updateData.category = validated.category;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.price !== undefined) updateData.price = String(validated.price);
      if (validated.normalRange !== undefined) updateData.normalRange = validated.normalRange;
      if (validated.unit !== undefined) updateData.unit = validated.unit;
      if (validated.sampleType !== undefined) updateData.sampleType = validated.sampleType;
      if (validated.turnaroundTime !== undefined) updateData.turnaroundTime = validated.turnaroundTime;
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

      const test = await storage.updateTest(req.params.id, updateData);
      res.json(test);
    } catch (error) {
      console.error("Error updating test:", error);
      res.status(500).json({ error: "Failed to update test" });
    }
  });

  // Delete test
  app.delete("/api/tests/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const existing = await storage.getTest(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Test not found" });
      }

      await storage.deleteTest(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting test:", error);
      res.status(500).json({ error: "Failed to delete test" });
    }
  });

  app.post("/api/seed-tests", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const existingTests = await storage.getTests(orgId);
      if (existingTests.length > 0) {
        return res.status(400).json({
          error: "Tests already exist. Seeding is only allowed when no tests are present to avoid duplicates."
        });
      }

      const commonTests = [
        { name: "Complete Blood Count (CBC)", code: "CBC001", category: "Hematology", price: "450", normalRange: "See individual parameters", unit: "", sampleType: "Blood", turnaroundTime: "4 hours", description: "Includes RBC, WBC, Hemoglobin, Hematocrit, Platelet count, MCV, MCH, MCHC, RDW" },
        { name: "Hemoglobin", code: "HGB001", category: "Hematology", price: "100", normalRange: "M: 13.5-17.5, F: 12.0-16.0", unit: "g/dL", sampleType: "Blood", turnaroundTime: "2 hours", description: "Measures hemoglobin concentration in blood" },
        { name: "Platelet Count", code: "PLT001", category: "Hematology", price: "150", normalRange: "150,000-400,000", unit: "cells/mcL", sampleType: "Blood", turnaroundTime: "2 hours", description: "Measures the number of platelets in blood" },
        { name: "ESR (Erythrocyte Sedimentation Rate)", code: "ESR001", category: "Hematology", price: "120", normalRange: "M: 0-15, F: 0-20", unit: "mm/hr", sampleType: "Blood", turnaroundTime: "1 hour", description: "Measures the rate at which red blood cells settle" },
        { name: "Peripheral Blood Smear", code: "PBS001", category: "Hematology", price: "200", normalRange: "Normal morphology", unit: "", sampleType: "Blood", turnaroundTime: "4 hours", description: "Microscopic examination of blood cells" },

        { name: "Blood Glucose (Fasting)", code: "GLU001", category: "Biochemistry", price: "80", normalRange: "70-100", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "2 hours", description: "Measures blood sugar level after 8-12 hours fasting" },
        { name: "Blood Glucose (PP)", code: "GLU002", category: "Biochemistry", price: "80", normalRange: "< 140", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "2 hours", description: "Measures blood sugar 2 hours after meal" },
        { name: "HbA1c (Glycated Hemoglobin)", code: "HBA1C", category: "Biochemistry", price: "450", normalRange: "< 5.7%", unit: "%", sampleType: "Blood", turnaroundTime: "24 hours", description: "Average blood sugar over past 2-3 months" },
        { name: "Lipid Profile", code: "LIP001", category: "Biochemistry", price: "550", normalRange: "TC: <200, HDL: >40, LDL: <100, TG: <150", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Includes Total Cholesterol, HDL, LDL, Triglycerides, VLDL" },
        { name: "Total Cholesterol", code: "CHOL01", category: "Biochemistry", price: "150", normalRange: "< 200", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Measures total cholesterol in blood" },
        { name: "HDL Cholesterol", code: "HDL001", category: "Biochemistry", price: "180", normalRange: "> 40", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "High-density lipoprotein (good cholesterol)" },
        { name: "LDL Cholesterol", code: "LDL001", category: "Biochemistry", price: "180", normalRange: "< 100", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Low-density lipoprotein (bad cholesterol)" },
        { name: "Triglycerides", code: "TRG001", category: "Biochemistry", price: "150", normalRange: "< 150", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Measures fat levels in blood" },
        { name: "VLDL Cholesterol", code: "VLDL01", category: "Biochemistry", price: "150", normalRange: "< 30", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Very low-density lipoprotein" },
        { name: "Liver Function Test (LFT)", code: "LFT001", category: "Biochemistry", price: "650", normalRange: "See individual parameters", unit: "", sampleType: "Blood", turnaroundTime: "4 hours", description: "Includes SGOT, SGPT, ALP, Bilirubin Total/Direct, Total Protein, Albumin, Globulin" },
        { name: "SGOT (AST)", code: "SGOT01", category: "Biochemistry", price: "120", normalRange: "10-40", unit: "U/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Aspartate aminotransferase enzyme" },
        { name: "SGPT (ALT)", code: "SGPT01", category: "Biochemistry", price: "120", normalRange: "7-56", unit: "U/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Alanine aminotransferase enzyme" },
        { name: "Alkaline Phosphatase (ALP)", code: "ALP001", category: "Biochemistry", price: "150", normalRange: "44-147", unit: "U/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Liver and bone enzyme" },
        { name: "Bilirubin Total", code: "BILT01", category: "Biochemistry", price: "100", normalRange: "0.1-1.2", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Total bilirubin in blood" },
        { name: "Bilirubin Direct", code: "BILD01", category: "Biochemistry", price: "100", normalRange: "0.0-0.3", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Conjugated bilirubin" },
        { name: "Total Protein", code: "TPRO01", category: "Biochemistry", price: "100", normalRange: "6.0-8.3", unit: "g/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Total protein in serum" },
        { name: "Albumin", code: "ALB001", category: "Biochemistry", price: "100", normalRange: "3.5-5.0", unit: "g/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Albumin protein level" },
        { name: "Kidney Function Test (KFT)", code: "KFT001", category: "Biochemistry", price: "550", normalRange: "See individual parameters", unit: "", sampleType: "Blood", turnaroundTime: "4 hours", description: "Includes Urea, Creatinine, Uric Acid, BUN" },
        { name: "Blood Urea", code: "UREA01", category: "Biochemistry", price: "100", normalRange: "15-40", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Measures urea nitrogen in blood" },
        { name: "Serum Creatinine", code: "CREA01", category: "Biochemistry", price: "120", normalRange: "0.7-1.3", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Measures kidney function" },
        { name: "Uric Acid", code: "URIC01", category: "Biochemistry", price: "150", normalRange: "M: 3.4-7.0, F: 2.4-6.0", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Measures uric acid levels" },
        { name: "Blood Urea Nitrogen (BUN)", code: "BUN001", category: "Biochemistry", price: "100", normalRange: "7-20", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Measures nitrogen in blood urea" },
        { name: "Electrolytes Panel", code: "ELEC01", category: "Biochemistry", price: "450", normalRange: "Na: 136-145, K: 3.5-5.0, Cl: 98-106", unit: "mEq/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Includes Sodium, Potassium, Chloride" },
        { name: "Sodium", code: "NA0001", category: "Biochemistry", price: "150", normalRange: "136-145", unit: "mEq/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Serum sodium level" },
        { name: "Potassium", code: "K00001", category: "Biochemistry", price: "150", normalRange: "3.5-5.0", unit: "mEq/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Serum potassium level" },
        { name: "Chloride", code: "CL0001", category: "Biochemistry", price: "150", normalRange: "98-106", unit: "mEq/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Serum chloride level" },
        { name: "Calcium", code: "CA0001", category: "Biochemistry", price: "180", normalRange: "8.5-10.5", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Serum calcium level" },
        { name: "Phosphorus", code: "PHOS01", category: "Biochemistry", price: "180", normalRange: "2.5-4.5", unit: "mg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Serum phosphorus level" },
        { name: "Vitamin D (25-OH)", code: "VITD01", category: "Biochemistry", price: "1200", normalRange: "30-100", unit: "ng/mL", sampleType: "Blood", turnaroundTime: "24 hours", description: "25-hydroxyvitamin D level" },
        { name: "Vitamin B12", code: "VITB12", category: "Biochemistry", price: "900", normalRange: "200-900", unit: "pg/mL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Cobalamin level" },
        { name: "Iron Studies", code: "IRON01", category: "Biochemistry", price: "750", normalRange: "See individual parameters", unit: "", sampleType: "Blood", turnaroundTime: "24 hours", description: "Includes Serum Iron, TIBC, Ferritin" },
        { name: "Serum Iron", code: "FE0001", category: "Biochemistry", price: "200", normalRange: "60-170", unit: "mcg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Iron level in blood" },
        { name: "TIBC (Total Iron Binding Capacity)", code: "TIBC01", category: "Biochemistry", price: "250", normalRange: "250-370", unit: "mcg/dL", sampleType: "Blood", turnaroundTime: "4 hours", description: "Measures transferrin capacity" },
        { name: "Ferritin", code: "FERR01", category: "Biochemistry", price: "500", normalRange: "M: 20-500, F: 20-200", unit: "ng/mL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Iron storage protein" },

        { name: "Thyroid Profile (T3, T4, TSH)", code: "THY001", category: "Immunology", price: "550", normalRange: "T3: 80-200, T4: 5-12, TSH: 0.4-4.0", unit: "ng/dL, mcg/dL, mIU/L", sampleType: "Blood", turnaroundTime: "24 hours", description: "Complete thyroid panel" },
        { name: "T3 (Triiodothyronine)", code: "T30001", category: "Immunology", price: "200", normalRange: "80-200", unit: "ng/dL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Thyroid hormone T3" },
        { name: "T4 (Thyroxine)", code: "T40001", category: "Immunology", price: "200", normalRange: "5.0-12.0", unit: "mcg/dL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Thyroid hormone T4" },
        { name: "TSH (Thyroid Stimulating Hormone)", code: "TSH001", category: "Immunology", price: "300", normalRange: "0.4-4.0", unit: "mIU/L", sampleType: "Blood", turnaroundTime: "24 hours", description: "Pituitary thyroid hormone" },
        { name: "Free T3", code: "FT3001", category: "Immunology", price: "350", normalRange: "2.3-4.2", unit: "pg/mL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Unbound T3 hormone" },
        { name: "Free T4", code: "FT4001", category: "Immunology", price: "350", normalRange: "0.8-1.8", unit: "ng/dL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Unbound T4 hormone" },

        { name: "CRP (C-Reactive Protein)", code: "CRP001", category: "Immunology", price: "350", normalRange: "< 10", unit: "mg/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Inflammation marker" },
        { name: "hs-CRP (High Sensitivity CRP)", code: "HSCRP1", category: "Immunology", price: "600", normalRange: "< 1.0 (low risk)", unit: "mg/L", sampleType: "Blood", turnaroundTime: "24 hours", description: "Cardiac risk marker" },
        { name: "Rheumatoid Factor (RF)", code: "RF0001", category: "Immunology", price: "400", normalRange: "< 20", unit: "IU/mL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Autoimmune marker" },
        { name: "Anti-Nuclear Antibody (ANA)", code: "ANA001", category: "Immunology", price: "1200", normalRange: "Negative", unit: "", sampleType: "Blood", turnaroundTime: "48 hours", description: "Autoimmune screening test" },
        { name: "HIV 1 & 2 Antibody", code: "HIV001", category: "Immunology", price: "400", normalRange: "Non-Reactive", unit: "", sampleType: "Blood", turnaroundTime: "24 hours", description: "HIV screening test" },
        { name: "HBsAg (Hepatitis B Surface Antigen)", code: "HBSAG1", category: "Immunology", price: "350", normalRange: "Non-Reactive", unit: "", sampleType: "Blood", turnaroundTime: "24 hours", description: "Hepatitis B screening" },
        { name: "Anti-HCV (Hepatitis C Antibody)", code: "HCV001", category: "Immunology", price: "600", normalRange: "Non-Reactive", unit: "", sampleType: "Blood", turnaroundTime: "24 hours", description: "Hepatitis C screening" },

        { name: "Urine Routine Examination", code: "URINE1", category: "Microbiology", price: "120", normalRange: "See detailed report", unit: "", sampleType: "Urine", turnaroundTime: "2 hours", description: "Physical, chemical and microscopic examination" },
        { name: "Urine Culture & Sensitivity", code: "UCULT1", category: "Microbiology", price: "600", normalRange: "No growth / <10^4 CFU/mL", unit: "CFU/mL", sampleType: "Urine", turnaroundTime: "48-72 hours", description: "Identifies bacteria and antibiotic sensitivity" },

        { name: "Troponin I", code: "TROP01", category: "Cardiology", price: "800", normalRange: "< 0.04", unit: "ng/mL", sampleType: "Blood", turnaroundTime: "2 hours", description: "Cardiac biomarker for heart attack" },
        { name: "CPK-MB", code: "CPKMB1", category: "Cardiology", price: "500", normalRange: "< 25", unit: "U/L", sampleType: "Blood", turnaroundTime: "4 hours", description: "Cardiac muscle enzyme" },
        { name: "NT-proBNP", code: "BNPRO1", category: "Cardiology", price: "1500", normalRange: "< 125", unit: "pg/mL", sampleType: "Blood", turnaroundTime: "24 hours", description: "Heart failure marker" },
      ];

      let createdCount = 0;
      for (const test of commonTests) {
        await storage.createTest({ ...test, organizationId: orgId });
        createdCount++;
      }

      res.status(201).json({
        message: `Successfully seeded ${createdCount} common lab tests.`,
        testsCreated: createdCount
      });
    } catch (error) {
      console.error("Error seeding tests:", error);
      res.status(500).json({ error: "Failed to seed tests" });
    }
  });

  // Seed demo data for testing
  app.post("/api/seed-demo", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const userId = getUserId(req);

      // Get existing tests
      const existingTests = await storage.getTests(orgId);
      if (existingTests.length === 0) {
        return res.status(400).json({ error: "Please seed tests first using 'Seed Common Tests' button" });
      }

      // Demo patients data
      const demoPatients = [
        { firstName: "Rahul", lastName: "Sharma", phone: "9876543210", email: "rahul.sharma@email.com", dateOfBirth: "1985-03-15", gender: "male", address: "123 MG Road, Mumbai", bloodGroup: "A+" },
        { firstName: "Priya", lastName: "Patel", phone: "9876543211", email: "priya.patel@email.com", dateOfBirth: "1990-07-22", gender: "female", address: "456 Park Street, Delhi", bloodGroup: "B+" },
        { firstName: "Amit", lastName: "Kumar", phone: "9876543212", email: "amit.kumar@email.com", dateOfBirth: "1978-11-08", gender: "male", address: "789 Lake View, Bangalore", bloodGroup: "O+" },
        { firstName: "Sunita", lastName: "Devi", phone: "9876543213", email: "sunita.devi@email.com", dateOfBirth: "1995-01-30", gender: "female", address: "321 Garden Lane, Chennai", bloodGroup: "AB-" },
        { firstName: "Vikram", lastName: "Singh", phone: "9876543214", email: "vikram.singh@email.com", dateOfBirth: "1982-05-12", gender: "male", address: "654 Hill Road, Hyderabad", bloodGroup: "B-" },
      ];

      const createdPatients = [];
      for (let i = 0; i < demoPatients.length; i++) {
        const patient = await storage.createPatient({
          ...demoPatients[i],
          organizationId: orgId,
          patientId: `PAT-${String(100 + i).padStart(3, "0")}`,
        });
        createdPatients.push(patient);
      }

      // Find specific tests for bills
      const cbcTest = existingTests.find(t => t.code === "CBC001");
      const lipidTest = existingTests.find(t => t.code === "LIP001");
      const lftTest = existingTests.find(t => t.code === "LFT001");
      const kftTest = existingTests.find(t => t.code === "KFT001");
      const thyroidTest = existingTests.find(t => t.code === "THY001");
      const glucoseTest = existingTests.find(t => t.code === "GLU001");

      // Create bills and samples
      const demoBills = [
        { patient: createdPatients[0], tests: [cbcTest, lipidTest].filter(Boolean) },
        { patient: createdPatients[1], tests: [thyroidTest, glucoseTest].filter(Boolean) },
        { patient: createdPatients[2], tests: [lftTest, kftTest].filter(Boolean) },
        { patient: createdPatients[3], tests: [cbcTest].filter(Boolean) },
        { patient: createdPatients[4], tests: [lipidTest, glucoseTest].filter(Boolean) },
      ];

      const createdBills = [];
      const createdSamples = [];
      let billNum = 100;
      let sampleNum = 100;

      for (const billData of demoBills) {
        if (!billData.patient || billData.tests.length === 0) continue;

        const items = billData.tests.map((test: any) => ({
          testId: test.id,
          testName: test.name,
          price: parseFloat(test.price),
          quantity: 1,
          isPackage: false,
        }));

        const subtotal = items.reduce((sum: number, item: any) => sum + item.price, 0);

        const bill = await storage.createBillWithNumber({
          billNumber: `INV-${billNum++}`,
          organizationId: orgId,
          branchId: "",
          patientId: billData.patient.id,
          createdBy: userId,
          items,
          subtotal: String(subtotal),
          totalAmount: String(subtotal),
          dueAmount: String(subtotal),
          paymentMethod: "cash",
          paymentStatus: "pending",
        });
        createdBills.push(bill);

        // Create samples for each test
        for (const test of billData.tests) {
          if (!test) continue;
          const sample = await storage.createSampleWithId({
            sampleId: `SMP-${sampleNum++}`,
            organizationId: orgId,
            billId: bill.id,
            patientId: billData.patient.id,
            testId: test.id,
            status: "collected",
            collectedBy: userId,
            collectedAt: new Date(),
          });
          createdSamples.push(sample);
        }
      }

      // Create some test reports with results
      const cbcResultData = {
        hemoglobin: { value: 14.5, status: "normal" },
        totalRbcCount: { value: 4.8, status: "normal" },
        pcv: { value: 42, status: "normal" },
        mcv: { value: 87, status: "normal" },
        mch: { value: 29, status: "normal" },
        mchc: { value: 33, status: "normal" },
        rdw: { value: 13.5, status: "normal" },
        totalWbcCount: { value: 7500, status: "normal" },
        neutrophils: { value: 60, status: "normal" },
        lymphocytes: { value: 30, status: "normal" },
        eosinophils: { value: 4, status: "normal" },
        monocytes: { value: 5, status: "normal" },
        basophils: { value: 1, status: "normal" },
        plateletCount: { value: 250000, status: "normal" },
        mpv: { value: 9.5, status: "normal" },
      };

      // Create a finalized test report for the first CBC sample
      const cbcSample = createdSamples.find((s: any) => {
        const test = existingTests.find(t => t.id === s.testId);
        return test?.code === "CBC001";
      });

      if (cbcSample) {
        await storage.createTestReportWithNumber({
          organizationId: orgId,
          sampleId: cbcSample.id,
          billId: cbcSample.billId,
          patientId: cbcSample.patientId,
          testId: cbcSample.testId,
          branchId: null,
          reportNumber: `RPT-${Date.now()}`,
          resultData: cbcResultData,
          interpretation: "All blood parameters are within normal limits. No abnormalities detected.",
          instrumentUsed: "Sysmex XN-1000",
          methodology: "Fully Automated Cell Counter",
          status: "finalized",
          isLocked: true,
          enteredBy: userId,
          enteredAt: new Date(),
          verifiedBy: userId,
          finalizedAt: new Date(),
          aiSummary: "Your blood test results look good! All values are within the healthy range, indicating normal blood cell counts and no signs of infection or anemia.",
        });
      }

      res.status(201).json({
        message: "Demo data created successfully!",
        created: {
          patients: createdPatients.length,
          bills: createdBills.length,
          samples: createdSamples.length,
        }
      });
    } catch (error) {
      console.error("Error seeding demo data:", error);
      res.status(500).json({ error: "Failed to seed demo data" });
    }
  });

  // ============ PACKAGES ============
  app.get("/api/packages", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const packages = await storage.getPackages(orgId);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  app.get("/api/packages/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const pkg = await storage.getPackage(req.params.id);
      if (!pkg || pkg.organizationId !== orgId) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      console.error("Error fetching package:", error);
      res.status(500).json({ error: "Failed to fetch package" });
    }
  });

  app.post("/api/packages", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const pkg = await storage.createPackage({ ...req.body, organizationId: orgId });
      res.status(201).json(pkg);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ error: "Failed to create package" });
    }
  });

  app.patch("/api/packages/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getPackage(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Package not found" });
      }

      // Validate with Zod schema
      const parseResult = updateTestPackageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.errors
        });
      }

      const validated = parseResult.data;

      // Convert validated data for storage (decimal fields need string conversion)
      const updateData: Record<string, any> = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.testIds !== undefined) updateData.testIds = validated.testIds;
      if (validated.originalPrice !== undefined) updateData.originalPrice = String(validated.originalPrice);
      if (validated.discountedPrice !== undefined) updateData.discountedPrice = String(validated.discountedPrice);
      if (validated.discountPercent !== undefined) updateData.discountPercent = validated.discountPercent !== null ? String(validated.discountPercent) : null;
      if (validated.validFrom !== undefined) updateData.validFrom = validated.validFrom;
      if (validated.validUntil !== undefined) updateData.validUntil = validated.validUntil;
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

      const pkg = await storage.updatePackage(req.params.id, updateData);
      res.json(pkg);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).json({ error: "Failed to update package" });
    }
  });

  app.delete("/api/packages/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getPackage(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Package not found" });
      }
      await storage.deletePackage(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting package:", error);
      res.status(500).json({ error: "Failed to delete package" });
    }
  });

  // ============ BILLS ============
  app.get("/api/bills", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const bills = await storage.getBills(orgId);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      res.status(500).json({ error: "Failed to fetch bills" });
    }
  });

  app.get("/api/bills/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const bill = await storage.getBill(req.params.id);
      if (!bill || bill.organizationId !== orgId) {
        return res.status(404).json({ error: "Bill not found" });
      }
      res.json(bill);
    } catch (error) {
      console.error("Error fetching bill:", error);
      res.status(500).json({ error: "Failed to fetch bill" });
    }
  });

  app.post("/api/bills", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const userId = getUserId(req);

      // Validate bill data including items
      const parsed = createBillWithItemsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: fromError(parsed.error).toString() });
      }

      const { items, ...billData } = parsed.data;

      const bill = await storage.createBill({
        ...billData,
        items: items || [],
        organizationId: orgId,
        createdBy: userId,
        branchId: billData.branchId || "",
      });

      // Auto-create samples for each test in the bill
      if (items && items.length > 0) {
        for (const item of items) {
          for (let i = 0; i < (item.quantity || 1); i++) {
            // If it's a package, create samples for each constituent test
            if (item.isPackage && item.packageTestIds && item.packageTestIds.length > 0) {
              for (const testId of item.packageTestIds) {
                await storage.createSample({
                  organizationId: orgId,
                  billId: bill.id,
                  patientId: billData.patientId,
                  testId: testId,
                  collectedBy: userId,
                  collectedAt: new Date(),
                });
              }
            } else {
              // Regular test item
              await storage.createSample({
                organizationId: orgId,
                billId: bill.id,
                patientId: billData.patientId,
                testId: item.testId,
                collectedBy: userId,
                collectedAt: new Date(),
              });
            }
          }
        }
      }

      res.status(201).json(bill);
    } catch (error) {
      console.error("Error creating bill:", error);
      res.status(500).json({ error: "Failed to create bill" });
    }
  });

  app.patch("/api/bills/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getBill(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Bill not found" });
      }
      const bill = await storage.updateBill(req.params.id, req.body);
      res.json(bill);
    } catch (error) {
      console.error("Error updating bill:", error);
      res.status(500).json({ error: "Failed to update bill" });
    }
  });

  // ============ SAMPLES ============
  app.get("/api/samples", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const samples = await storage.getSamples(orgId);
      res.json(samples);
    } catch (error) {
      console.error("Error fetching samples:", error);
      res.status(500).json({ error: "Failed to fetch samples" });
    }
  });

  app.get("/api/samples/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const sample = await storage.getSample(req.params.id);
      if (!sample || sample.organizationId !== orgId) {
        return res.status(404).json({ error: "Sample not found" });
      }
      res.json(sample);
    } catch (error) {
      console.error("Error fetching sample:", error);
      res.status(500).json({ error: "Failed to fetch sample" });
    }
  });

  app.post("/api/samples", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const sample = await storage.createSample({ ...req.body, organizationId: orgId });
      res.status(201).json(sample);
    } catch (error) {
      console.error("Error creating sample:", error);
      res.status(500).json({ error: "Failed to create sample" });
    }
  });

  app.patch("/api/samples/:id/status", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getSample(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Sample not found" });
      }
      const { status } = req.body;
      const sample = await storage.updateSampleStatus(req.params.id, status);
      res.json(sample);
    } catch (error) {
      console.error("Error updating sample:", error);
      res.status(500).json({ error: "Failed to update sample" });
    }
  });

  app.patch("/api/samples/:id/result", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getSample(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Sample not found" });
      }
      const { resultValue, isAbnormal, notes, resultData } = req.body;
      const sample = await storage.updateSampleResult(req.params.id, {
        resultValue,
        isAbnormal,
        notes,
        resultData,
        status: "completed",
        processedAt: new Date(),
      });
      res.json(sample);
    } catch (error) {
      console.error("Error updating sample result:", error);
      res.status(500).json({ error: "Failed to update sample result" });
    }
  });

  // ============ REPORTS ============
  app.get("/api/reports", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const reports = await storage.getReports(orgId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const report = await storage.getReport(req.params.id);
      if (!report || report.organizationId !== orgId) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const report = await storage.createReport({ ...req.body, organizationId: orgId });
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  app.patch("/api/reports/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getReport(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Report not found" });
      }
      const report = await storage.updateReport(req.params.id, req.body);
      res.json(report);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  app.get("/api/reports/public/:id", async (req, res) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      const [patient, organization, samples, tests] = await Promise.all([
        storage.getPatient(report.patientId),
        storage.getOrganization(report.organizationId),
        storage.getSamples(report.organizationId),
        storage.getTests(report.organizationId),
      ]);

      if (!patient || !organization) {
        return res.status(404).json({ error: "Report data not found" });
      }

      const reportSamples = samples.filter((s) => s.billId === report.billId);
      const testResults = reportSamples.map((sample) => {
        const test = tests.find((t) => t.id === sample.testId);
        return {
          testName: test?.name || "Unknown Test",
          resultValue: sample.resultValue,
          normalRange: test?.normalRange || null,
          unit: test?.unit || null,
          isAbnormal: sample.isAbnormal || false,
        };
      });

      res.json({
        report: {
          id: report.id,
          reportNumber: report.reportNumber,
          status: report.status,
          generatedAt: report.generatedAt,
          aiSummary: report.aiSummary,
        },
        patient: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          // Mask phone for privacy - show last 4 digits only
          phone: patient.phone ? `XXXX-XXX-${patient.phone.slice(-4)}` : null,
          // Don't expose email in public view
          email: null,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
        },
        organization: {
          name: organization.name,
          logo: organization.logo,
          address: organization.address,
          city: organization.city,
          state: organization.state,
          phone: organization.phone,
          email: organization.email,
          reportHeader: organization.reportHeader,
          reportFooter: organization.reportFooter,
          showLogo: organization.showLogo ?? true,
          showQRCode: organization.showQRCode ?? true,
        },
        testResults,
      });
    } catch (error) {
      console.error("Error fetching public report:", error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // ============ TEST REPORTS (Per-Test Individual Reports) ============
  app.get("/api/test-reports", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const reports = await storage.getTestReports(orgId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching test reports:", error);
      res.status(500).json({ error: "Failed to fetch test reports" });
    }
  });

  app.get("/api/test-reports/by-bill/:billId", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const reports = await storage.getTestReportsByBill(req.params.billId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching test reports by bill:", error);
      res.status(500).json({ error: "Failed to fetch test reports" });
    }
  });

  app.get("/api/test-reports/by-patient/:patientId", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const reports = await storage.getTestReportsByPatient(req.params.patientId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching test reports by patient:", error);
      res.status(500).json({ error: "Failed to fetch test reports" });
    }
  });

  app.get("/api/test-reports/by-sample/:sampleId", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const reports = await storage.getTestReportsBySample(req.params.sampleId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching test reports by sample:", error);
      res.status(500).json({ error: "Failed to fetch test reports" });
    }
  });

  app.get("/api/test-reports/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const report = await storage.getTestReport(req.params.id);
      if (!report || report.organizationId !== orgId) {
        return res.status(404).json({ error: "Test report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Error fetching test report:", error);
      res.status(500).json({ error: "Failed to fetch test report" });
    }
  });

  app.post("/api/test-reports", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const userId = getUserId(req);
      const report = await storage.createTestReport({
        ...req.body,
        organizationId: orgId,
        enteredBy: userId,
        enteredAt: new Date(),
        status: "draft",
      });
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating test report:", error);
      res.status(500).json({ error: "Failed to create test report" });
    }
  });

  app.patch("/api/test-reports/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getTestReport(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Test report not found" });
      }
      if (existing.isLocked) {
        return res.status(400).json({ error: "Report is locked. Create a revision instead." });
      }
      const report = await storage.updateTestReport(req.params.id, {
        ...req.body,
        status: "draft",
      });
      res.json(report);
    } catch (error) {
      console.error("Error updating test report:", error);
      res.status(500).json({ error: "Failed to update test report" });
    }
  });

  app.post("/api/test-reports/:id/finalize", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const userId = getUserId(req);
      const existing = await storage.getTestReport(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Test report not found" });
      }
      if (existing.isLocked) {
        return res.status(400).json({ error: "Report is already finalized" });
      }
      const report = await storage.finalizeTestReport(req.params.id, userId);
      res.json(report);
    } catch (error) {
      console.error("Error finalizing test report:", error);
      res.status(500).json({ error: "Failed to finalize test report" });
    }
  });

  app.post("/api/test-reports/:id/revise", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getTestReport(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Test report not found" });
      }
      const { revisionNotes } = req.body;
      const revision = await storage.createReportRevision(req.params.id, revisionNotes || "Revision");
      res.status(201).json(revision);
    } catch (error) {
      console.error("Error creating report revision:", error);
      res.status(500).json({ error: "Failed to create report revision" });
    }
  });

  app.get("/api/test-reports/public/:reportNumber", async (req, res) => {
    try {
      const report = await storage.getTestReportByReportNumber(req.params.reportNumber);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      const [patient, organization, test, sample] = await Promise.all([
        storage.getPatient(report.patientId),
        storage.getOrganization(report.organizationId),
        storage.getTest(report.testId),
        storage.getSample(report.sampleId),
      ]);

      if (!patient || !organization || !test) {
        return res.status(404).json({ error: "Report data not found" });
      }

      res.json({
        report: {
          id: report.id,
          reportNumber: report.reportNumber,
          status: report.status,
          version: report.version,
          resultData: report.resultData,
          interpretation: report.interpretation,
          aiSummary: report.aiSummary,
          instrumentUsed: report.instrumentUsed,
          methodology: report.methodology,
          finalizedAt: report.finalizedAt,
          createdAt: report.createdAt,
        },
        patient: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          patientId: patient.patientId,
          phone: patient.phone ? `XXXX-XXX-${patient.phone.slice(-4)}` : null,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
        },
        test: {
          name: test.name,
          code: test.code,
          category: test.category,
          sampleType: test.sampleType,
          reportTemplate: test.reportTemplate,
        },
        sample: sample ? {
          sampleId: sample.sampleId,
          collectedAt: sample.collectedAt,
          status: sample.status,
        } : null,
        organization: {
          name: organization.name,
          logo: organization.logo,
          address: organization.address,
          city: organization.city,
          state: organization.state,
          pincode: organization.pincode,
          phone: organization.phone,
          email: organization.email,
          reportHeader: organization.reportHeader,
          reportFooter: organization.reportFooter,
          showLogo: organization.showLogo ?? true,
          showQRCode: organization.showQRCode ?? true,
        },
      });
    } catch (error) {
      console.error("Error fetching public test report:", error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // ============ REPORT SHARES ============
  app.get("/api/test-reports/:id/shares", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const shares = await storage.getReportShares(req.params.id);
      res.json(shares);
    } catch (error) {
      console.error("Error fetching report shares:", error);
      res.status(500).json({ error: "Failed to fetch report shares" });
    }
  });

  app.post("/api/test-reports/:id/share", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const userId = getUserId(req);
      const report = await storage.getTestReport(req.params.id);
      if (!report || report.organizationId !== orgId) {
        return res.status(404).json({ error: "Report not found" });
      }

      const { shareMethod, recipientPhone, recipientEmail } = req.body;
      const shareLink = `${req.protocol}://${req.get("host")}/report/${report.reportNumber}`;

      const share = await storage.createReportShare({
        reportId: report.id,
        organizationId: orgId,
        shareMethod,
        recipientPhone,
        recipientEmail,
        shareLink,
        sentBy: userId,
      });
      res.status(201).json(share);
    } catch (error) {
      console.error("Error sharing report:", error);
      res.status(500).json({ error: "Failed to share report" });
    }
  });

  // ============ INVENTORY ============
  app.get("/api/inventory", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const items = await storage.getInventoryItems(orgId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Failed to fetch inventory" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const item = await storage.createInventoryItem({ ...req.body, organizationId: orgId });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ error: "Failed to create inventory item" });
    }
  });

  app.patch("/api/inventory/:id/stock", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getInventoryItem(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Item not found" });
      }
      const { quantity } = req.body;
      const item = await storage.updateInventoryStock(req.params.id, quantity);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ error: "Failed to update inventory" });
    }
  });

  // ============ STAFF ============
  app.get("/api/staff/me", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const org = await storage.getOrganizationByOwnerId(userId);
      if (org) {
        return res.json({ isOwner: true, role: "owner", moduleAccess: org.subscribedModules, pagePermissions: {} });
      }
      const staffId = (req as any).session?.staffId;
      if (!staffId) {
        return res.json({ isOwner: false, role: "none", moduleAccess: [], pagePermissions: {} });
      }
      const member = await storage.getStaffMember(staffId);
      if (!member) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      const { password: _, ...memberWithoutPassword } = member;
      return res.json({ isOwner: false, ...memberWithoutPassword });
    } catch (error) {
      console.error("Error fetching staff me:", error);
      res.status(500).json({ error: "Failed to fetch staff info" });
    }
  });

  app.get("/api/staff", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const staffList = await storage.getStaff(orgId);
      const sanitized = staffList.map(({ password: _, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  app.get("/api/staff/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const member = await storage.getStaffMember(req.params.id);
      if (!member || member.organizationId !== orgId) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      const { password: _, ...memberWithoutPassword } = member;
      res.json(memberWithoutPassword);
    } catch (error) {
      console.error("Error fetching staff member:", error);
      res.status(500).json({ error: "Failed to fetch staff member" });
    }
  });

  app.post("/api/staff", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const { password, ...rest } = req.body;
      if (!password || password.length < 4) {
        return res.status(400).json({ error: "Password is required and must be at least 4 characters" });
      }

      const existing = await storage.getStaffByUsername(rest.username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const staffData = {
        ...rest,
        organizationId: orgId,
      };

      const parseResult = insertStaffSchema.safeParse(staffData);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Validation failed", details: parseResult.error.errors });
      }

      const member = await storage.createStaff(parseResult.data);
      await db.update(staffTable).set({ password: hashedPassword }).where(eq(staffTable.id, member.id));

      const { password: _, ...memberWithoutPassword } = { ...member, password: hashedPassword };
      res.status(201).json(memberWithoutPassword);
    } catch (error) {
      console.error("Error creating staff:", error);
      res.status(500).json({ error: "Failed to create staff member" });
    }
  });

  app.patch("/api/staff/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getStaffMember(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      const { password, ...rest } = req.body;
      let updateData: any = { ...rest };

      if (password && password.length > 0) {
        const hashedPassword = await hashPassword(password);
        await db.update(staffTable).set({ password: hashedPassword }).where(eq(staffTable.id, req.params.id));
      }

      const member = await storage.updateStaff(req.params.id, updateData);
      if (!member) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      const { password: _, ...memberWithoutPassword } = member;
      res.json(memberWithoutPassword);
    } catch (error) {
      console.error("Error updating staff:", error);
      res.status(500).json({ error: "Failed to update staff member" });
    }
  });

  app.delete("/api/staff/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const existing = await storage.getStaffMember(req.params.id);
      if (!existing || existing.organizationId !== orgId) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      await storage.deleteStaff(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting staff:", error);
      res.status(500).json({ error: "Failed to delete staff member" });
    }
  });

  // Storage locations are handled by medlabRouter at /api/medlab/storage-locations

  app.post("/api/staff/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      const member = await storage.getStaffByUsername(username);
      if (!member || !member.password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      if (!member.isActive) {
        return res.status(401).json({ error: "Account is deactivated" });
      }
      const isValid = await comparePasswords(password, member.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      (req as any).session.staffId = member.id;
      const { password: _, ...memberWithoutPassword } = member;
      res.json(memberWithoutPassword);
    } catch (error) {
      console.error("Error during staff login:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // ============ WARDS ============
  app.get("/api/wards", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const wardList = await storage.getWards(org.id);
      res.json(wardList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wards" });
    }
  });

  app.post("/api/wards", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const ward = await storage.createWard({ ...req.body, organizationId: org.id });
      res.json(ward);
    } catch (error) {
      console.error("Error creating ward:", error);
      res.status(500).json({ error: "Failed to create ward" });
    }
  });

  app.patch("/api/wards/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const existing = await storage.getWard(req.params.id);
      if (!existing || existing.organizationId !== org.id) return res.status(404).json({ error: "Ward not found" });
      const ward = await storage.updateWard(req.params.id, req.body);
      res.json(ward);
    } catch (error) {
      res.status(500).json({ error: "Failed to update ward" });
    }
  });

  app.delete("/api/wards/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const existing = await storage.getWard(req.params.id);
      if (!existing || existing.organizationId !== org.id) return res.status(404).json({ error: "Ward not found" });
      await storage.deleteWard(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete ward" });
    }
  });

  // ============ BEDS ============
  app.get("/api/beds", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const bedList = await storage.getBeds(org.id);
      res.json(bedList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch beds" });
    }
  });

  app.get("/api/beds/ward/:wardId", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const ward = await storage.getWard(req.params.wardId);
      if (!ward || ward.organizationId !== org.id) return res.status(404).json({ error: "Ward not found" });
      const bedList = await storage.getBedsByWard(req.params.wardId);
      res.json(bedList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch beds" });
    }
  });

  app.post("/api/beds", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const bed = await storage.createBed({ ...req.body, organizationId: org.id });
      res.json(bed);
    } catch (error) {
      console.error("Error creating bed:", error);
      res.status(500).json({ error: "Failed to create bed" });
    }
  });

  app.patch("/api/beds/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const existing = await storage.getBed(req.params.id);
      if (!existing || existing.organizationId !== org.id) return res.status(404).json({ error: "Bed not found" });
      const bed = await storage.updateBed(req.params.id, req.body);
      res.json(bed);
    } catch (error) {
      res.status(500).json({ error: "Failed to update bed" });
    }
  });

  app.delete("/api/beds/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const existing = await storage.getBed(req.params.id);
      if (!existing || existing.organizationId !== org.id) return res.status(404).json({ error: "Bed not found" });
      await storage.deleteBed(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bed" });
    }
  });

  // ============ ADMISSIONS ============
  app.get("/api/admissions", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const admissionList = await storage.getAdmissions(org.id);
      res.json(admissionList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admissions" });
    }
  });

  app.get("/api/admissions/active", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const admissionList = await storage.getActiveAdmissions(org.id);
      res.json(admissionList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active admissions" });
    }
  });

  app.get("/api/admissions/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const admission = await storage.getAdmission(req.params.id);
      if (!admission || admission.organizationId !== org.id) return res.status(404).json({ error: "Admission not found" });
      res.json(admission);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admission" });
    }
  });

  app.post("/api/admissions", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const admissionNumber = await storage.getNextAdmissionNumber(org.id);
      const admission = await storage.createAdmission({ ...req.body, organizationId: org.id, admissionNumber });

      if (req.body.bedId) {
        await storage.updateBed(req.body.bedId, {
          status: "occupied",
          currentPatientId: req.body.patientId,
          currentAdmissionId: admission.id,
        });
      }
      res.json(admission);
    } catch (error) {
      console.error("Error creating admission:", error);
      res.status(500).json({ error: "Failed to create admission" });
    }
  });

  app.patch("/api/admissions/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const existing = await storage.getAdmission(req.params.id);
      if (!existing || existing.organizationId !== org.id) return res.status(404).json({ error: "Admission not found" });

      const admission = await storage.updateAdmission(req.params.id, req.body);

      if (req.body.status === "discharged" && existing.bedId) {
        await storage.updateBed(existing.bedId, {
          status: "available",
          currentPatientId: null,
          currentAdmissionId: null,
        });
      }

      if (req.body.bedId && req.body.bedId !== existing.bedId) {
        if (existing.bedId) {
          await storage.updateBed(existing.bedId, {
            status: "available",
            currentPatientId: null,
            currentAdmissionId: null,
          });
        }
        await storage.updateBed(req.body.bedId, {
          status: "occupied",
          currentPatientId: existing.patientId,
          currentAdmissionId: existing.id,
        });
      }

      res.json(admission);
    } catch (error) {
      console.error("Error updating admission:", error);
      res.status(500).json({ error: "Failed to update admission" });
    }
  });

  // ============ ICU MONITORING ============
  app.get("/api/icu/patients", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const icuPatients = await storage.getIcuPatients(org.id);
      res.json(icuPatients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ICU patients" });
    }
  });

  app.get("/api/icu/records/:admissionId", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const admission = await storage.getAdmission(req.params.admissionId);
      if (!admission || admission.organizationId !== org.id) return res.status(404).json({ error: "Admission not found" });
      const records = await storage.getIcuRecords(req.params.admissionId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ICU records" });
    }
  });

  app.get("/api/icu/latest/:admissionId", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const admission = await storage.getAdmission(req.params.admissionId);
      if (!admission || admission.organizationId !== org.id) return res.status(404).json({ error: "Admission not found" });
      const record = await storage.getLatestIcuRecord(req.params.admissionId);
      res.json(record || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest ICU record" });
    }
  });

  app.post("/api/icu/records", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const org = await storage.getOrganizationByOwnerId(userId);
      if (!org) return res.status(404).json({ error: "Organization not found" });
      const record = await storage.createIcuRecord({ ...req.body, organizationId: org.id });
      res.json(record);
    } catch (error) {
      console.error("Error creating ICU record:", error);
      res.status(500).json({ error: "Failed to create ICU record" });
    }
  });

  // ============ ORGANIZATIONS ============

  // Validation schema for organization creation/update (omit server-controlled fields)
  const organizationBodySchema = insertOrganizationSchema.omit({
    ownerId: true,
    isOnboarded: true,
  }).extend({
    name: z.string().min(2, "Organization name must be at least 2 characters"),
    phone: z.string().min(10, "Valid phone number required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format").optional().or(z.literal("")),
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number format").optional().or(z.literal("")),
  });

  app.get("/api/organizations/my", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const organization = await storage.getOrganizationByOwnerId(userId);
      if (!organization) {
        return res.json({ organization: null, isOnboarded: false });
      }
      res.json({ organization, isOnboarded: organization.isOnboarded });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      console.log("[Organization Create] Starting organization creation...");

      const userId = getUserId(req);
      console.log("[Organization Create] User ID:", userId);

      if (!userId) {
        console.log("[Organization Create] ERROR: No user ID found in session");
        return res.status(401).json({ error: "Please sign in again to continue. Your session may have expired." });
      }

      // Validate request body
      console.log("[Organization Create] Validating request body...");
      const parseResult = organizationBodySchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMessage = fromError(parseResult.error).message;
        console.log("[Organization Create] Validation failed:", errorMessage);
        return res.status(400).json({ error: errorMessage });
      }

      console.log("[Organization Create] Checking for existing organization...");
      const existingOrg = await storage.getOrganizationByOwnerId(userId);
      if (existingOrg) {
        console.log("[Organization Create] Organization already exists for user:", existingOrg.id);
        return res.status(400).json({ error: "Your diagnostic center already exists. Redirecting to dashboard..." });
      }

      console.log("[Organization Create] Creating new organization with data:", JSON.stringify(parseResult.data, null, 2));
      const organization = await storage.createOrganization({
        ...parseResult.data,
        ownerId: userId,
        isOnboarded: true,
      });

      console.log("[Organization Create] SUCCESS! Created organization:", organization.id);
      res.status(201).json(organization);
    } catch (error: any) {
      console.error("[Organization Create] ERROR:", error?.message || error);
      console.error("[Organization Create] Stack:", error?.stack);
      res.status(500).json({ error: `Failed to create organization: ${error?.message || 'Unknown error'}` });
    }
  });

  app.patch("/api/organizations/:id", async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check ownership before allowing update
      const existingOrg = await storage.getOrganization(req.params.id);
      if (!existingOrg) {
        return res.status(404).json({ error: "Organization not found" });
      }
      if (existingOrg.ownerId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this organization" });
      }

      // Validate partial update (allow partial fields)
      const partialSchema = organizationBodySchema.partial();
      const parseResult = partialSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }

      const organization = await storage.updateOrganization(req.params.id, parseResult.data);
      res.json(organization);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // ============ BRANCHES ============
  app.get("/api/branches", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const branches = await storage.getBranches(orgId);
      res.json(branches);
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  app.post("/api/branches", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const branch = await storage.createBranch({ ...req.body, organizationId: orgId });
      res.status(201).json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  // ============ AI ENDPOINTS ============

  // Check for duplicate patients
  app.post("/api/ai/check-duplicate", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const parseResult = checkDuplicateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { firstName, lastName, phone } = parseResult.data;
      const existingPatients = await storage.getPatients(orgId);
      const result = await detectDuplicatePatient(
        { firstName, lastName, phone },
        existingPatients
      );
      res.json(result);
    } catch (error) {
      console.error("Error checking duplicates:", error);
      res.status(500).json({ error: "Failed to check duplicates" });
    }
  });

  // Suggest tests based on patient history
  app.post("/api/ai/suggest-tests", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const parseResult = suggestTestsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { patientId, conditions } = parseResult.data;
      const tests = await storage.getTests(orgId);

      // Get patient's previous tests from bills
      let previousTests: string[] = [];
      if (patientId) {
        const bills = await storage.getBills(orgId);
        const patientBills = bills.filter(b => b.patientId === patientId);
        previousTests = patientBills.flatMap(b =>
          (b.items as any[]).map(item => item.testName || "")
        ).filter(Boolean);
      }

      const result = await suggestTests(
        { tests: previousTests, conditions },
        tests
      );
      res.json(result);
    } catch (error) {
      console.error("Error suggesting tests:", error);
      res.status(500).json({ error: "Failed to suggest tests" });
    }
  });

  // Detect billing anomalies
  app.post("/api/ai/check-billing", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const parseResult = checkBillingSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { items, totalAmount } = parseResult.data;
      const recentBills = await storage.getBills(orgId);
      const result = await detectBillingAnomalies(
        { items, totalAmount },
        recentBills.slice(0, 50)
      );
      res.json(result);
    } catch (error) {
      console.error("Error checking billing:", error);
      res.status(500).json({ error: "Failed to check billing" });
    }
  });

  // Generate patient-friendly WhatsApp message
  app.post("/api/ai/whatsapp-summary", async (req, res) => {
    try {
      const parseResult = whatsappSummarySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { patientName, testResults } = parseResult.data;
      const summary = await generatePatientFriendlySummary(patientName, testResults);
      res.json({ message: summary });
    } catch (error) {
      console.error("Error generating WhatsApp summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Generate AI report summary
  app.post("/api/ai/report-summary", async (req, res) => {
    try {
      const parseResult = reportSummarySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { testResults } = parseResult.data;
      const summary = await generateReportAISummary(testResults);
      res.json({ summary });
    } catch (error) {
      console.error("Error generating report summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Suggest test details based on test name
  app.post("/api/ai/suggest-test-details", async (req, res) => {
    try {
      const parseResult = suggestTestDetailsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { testName } = parseResult.data;
      const details = await suggestTestDetails(testName);
      res.json(details);
    } catch (error) {
      console.error("Error suggesting test details:", error);
      res.status(500).json({ error: "Failed to suggest test details" });
    }
  });

  // Suggest tests for a package based on package name
  app.post("/api/ai/suggest-package", async (req, res) => {
    try {
      const parseResult = suggestPackageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { packageName, availableTests } = parseResult.data;
      const result = await suggestPackageTests(packageName, availableTests);
      res.json(result);
    } catch (error) {
      console.error("Error suggesting package tests:", error);
      res.status(500).json({ error: "Failed to suggest package tests" });
    }
  });

  // Generate report template using AI
  app.post("/api/ai/suggest-medicines", async (req, res) => {
    try {
      const parseResult = suggestMedicinesSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { symptoms, diagnosis, searchQuery } = parseResult.data;
      const result = await suggestMedicines(symptoms, diagnosis, searchQuery);
      res.json(result);
    } catch (error) {
      console.error("Error suggesting medicines:", error);
      res.status(500).json({ error: "Failed to suggest medicines" });
    }
  });

  app.post("/api/ai/consultation-listen", async (req, res) => {
    try {
      const parseResult = consultationListenSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { audio, patientName, patientAge, patientGender, existingSymptoms, existingDiagnosis } = parseResult.data;

      console.log(`AI Consultation Listen: received ${(audio.length / 1024).toFixed(0)}KB audio data`);

      const transcriptionApiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (!transcriptionApiKey) {
        console.error("AI Consultation Listen: No OpenAI API key available for transcription");
        return res.status(500).json({ error: "AI service is not configured. Please contact support." });
      }

      const { ensureCompatibleFormat } = await import("./utils/audio");
      const OpenAI = (await import("openai")).default;
      const { toFile } = await import("openai");
      const transcriptionClient = new OpenAI({
        apiKey: transcriptionApiKey,
      });
      const rawBuffer = Buffer.from(audio, "base64");
      console.log(`AI Consultation Listen: raw buffer size ${rawBuffer.length} bytes`);

      let audioBuffer: Buffer;
      let inputFormat: "wav" | "mp3" | "webm";
      try {
        const result = await ensureCompatibleFormat(rawBuffer);
        audioBuffer = result.buffer;
        inputFormat = result.format;
        console.log(`AI Consultation Listen: converted to ${inputFormat}, buffer size ${audioBuffer.length} bytes`);
      } catch (formatErr: any) {
        console.error(`AI Consultation Listen: Audio format conversion failed: ${formatErr?.message}`);
        return res.status(400).json({ error: "Failed to process audio format. Please ensure your microphone is working and try again." });
      }

      let transcript = "";
      try {
        const file = await toFile(audioBuffer, `audio.${inputFormat}`);
        const response = await transcriptionClient.audio.transcriptions.create({
          file,
          model: "gpt-4o-mini-transcribe",
        });
        transcript = response.text;
        console.log(`AI Consultation Listen: transcribed with gpt-4o-mini-transcribe`);
      } catch (transcribeErr: any) {
        console.log(`AI Consultation Listen: gpt-4o-mini-transcribe failed (${transcribeErr?.status || ''} ${transcribeErr?.message}), trying whisper-1`);
        try {
          const file = await toFile(audioBuffer, `audio.${inputFormat}`);
          const response = await transcriptionClient.audio.transcriptions.create({
            file,
            model: "whisper-1",
          });
          transcript = response.text;
          console.log(`AI Consultation Listen: transcribed with whisper-1 fallback`);
        } catch (whisperErr: any) {
          console.error(`AI Consultation Listen: All transcription models failed. Last error: ${whisperErr?.status || ''} ${whisperErr?.message}`);
          return res.status(500).json({ error: "Audio transcription failed. Please check your microphone and try again." });
        }
      }

      console.log(`AI Consultation Listen: transcript length ${transcript.length}`);

      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({ error: "Could not transcribe the audio. Please try speaking louder or closer to the microphone." });
      }

      const analysis = await analyzeConsultation(
        transcript,
        patientName,
        patientAge,
        patientGender,
        existingSymptoms,
        existingDiagnosis,
      );

      console.log(`AI Consultation Listen: analysis complete`);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error in consultation listen:", error?.message || error);
      res.status(500).json({ error: error?.message || "Failed to analyze consultation audio. Please try again." });
    }
  });

  app.post("/api/ai/generate-template", async (req, res) => {
    try {
      const parseResult = generateReportTemplateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: fromError(parseResult.error).message });
      }
      const { testName, testCode, category, sampleType } = parseResult.data;
      const template = await generateReportTemplate(testName, testCode, category, sampleType);
      res.json(template);
    } catch (error) {
      console.error("Error generating report template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Save report template to a test
  app.patch("/api/tests/:id/template", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const { template } = req.body;
      if (!template) {
        return res.status(400).json({ error: "Template is required" });
      }

      const test = await storage.getTest(req.params.id);
      if (!test || test.organizationId !== orgId) {
        return res.status(404).json({ error: "Test not found" });
      }

      const updated = await storage.updateTest(req.params.id, { reportTemplate: template });
      res.json(updated);
    } catch (error) {
      console.error("Error saving report template:", error);
      res.status(500).json({ error: "Failed to save template" });
    }
  });

  // Generate QR code for report
  app.get("/api/reports/:id/qrcode", async (req, res) => {
    try {
      const report = await storage.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Generate public URL for the report
      const baseUrl = req.protocol + "://" + req.get("host");
      const reportUrl = `${baseUrl}/reports/view/${report.id}`;

      // Generate QR code as base64 data URL
      const qrCodeDataUrl = await QRCode.toDataURL(reportUrl, {
        width: 150,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      res.json({ qrCode: qrCodeDataUrl, url: reportUrl });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // ============ STATS ============
  app.get("/api/stats/dashboard", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const [patients, bills, samples, inventory] = await Promise.all([
        storage.getPatients(orgId),
        storage.getBills(orgId),
        storage.getSamples(orgId),
        storage.getInventoryItems(orgId),
      ]);

      const today = new Date().toDateString();
      const todayBills = bills.filter(b => b.createdAt && new Date(b.createdAt).toDateString() === today);
      const todayRevenue = todayBills.reduce((sum, b) => sum + parseFloat(String(b.totalAmount)), 0);

      const pendingSamples = samples.filter(s => s.status === "collected" || s.status === "processing");
      const lowStockItems = inventory.filter(i => (i.currentStock ?? 0) <= (i.minStock || 0));

      res.json({
        totalPatients: patients.length,
        todayRevenue,
        todayBillCount: todayBills.length,
        pendingSamples: pendingSamples.length,
        lowStockAlerts: lowStockItems.length,
        recentBills: bills.slice(0, 5),
        recentPatients: patients.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/stats/hospital-dashboard", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const today = new Date().toISOString().split("T")[0];

      const [visits, patients, departments, doctors] = await Promise.all([
        storage.getOpVisitsByDate(orgId, today),
        storage.getPatients(orgId),
        storage.getDepartments(orgId),
        storage.getDoctors(orgId),
      ]);

      const hospitalPatients = patients.filter(p => p.module === "hospitals" || p.module === "both");
      const waitingVisits = visits.filter(v => v.status === "waiting");
      const inConsultation = visits.filter(v => v.status === "in_consultation");
      const completedVisits = visits.filter(v => v.status === "completed");
      const todayRevenue = completedVisits
        .filter(v => v.paymentStatus === "paid")
        .reduce((sum, v) => sum + parseFloat(String(v.consultationFee || 0)), 0);

      const recentVisits = visits
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 8)
        .map(v => ({
          ...v,
          patient: patients.find(p => p.id === v.patientId),
          doctor: doctors.find(d => d.id === v.doctorId),
          department: departments.find(d => d.id === v.departmentId),
        }));

      const departmentStats = departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        visitCount: visits.filter(v => v.departmentId === dept.id).length,
        waitingCount: visits.filter(v => v.departmentId === dept.id && v.status === "waiting").length,
      }));

      res.json({
        totalPatients: hospitalPatients.length,
        todayVisits: visits.length,
        waitingCount: waitingVisits.length,
        inConsultationCount: inConsultation.length,
        completedCount: completedVisits.length,
        todayRevenue,
        totalDoctors: doctors.filter(d => d.isActive !== false).length,
        totalDepartments: departments.length,
        recentVisits,
        departmentStats,
      });
    } catch (error) {
      console.error("Error fetching hospital dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch hospital stats" });
    }
  });

  // ============ BOOKINGS (Internal - Authenticated) ============
  app.get("/api/bookings", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const bookings = await storage.getBookings(orgId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.organizationId !== orgId) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  const bookingStatusSchema = z.object({
    status: z.enum(["pending", "confirmed", "sample_collected", "completed", "cancelled"]),
    statusNotes: z.string().optional(),
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const userId = getUserId(req);
      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.organizationId !== orgId) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const parseResult = bookingStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const { status, statusNotes } = parseResult.data;

      // When confirming a booking (or moving to sample_collected/completed), create patient + bill + samples if not already created
      const statusesThatCreateRecords = ["confirmed", "sample_collected", "completed"];
      if (statusesThatCreateRecords.includes(status) && !booking.billId) {
        const { randomUUID } = await import("crypto");

        // Create or find patient
        let patientId = booking.patientId;
        if (!patientId) {
          // Check if patient exists with same phone
          const existingPatients = await storage.getPatients(orgId);
          const existingPatient = existingPatients.find(p => p.phone === booking.patientPhone);

          if (existingPatient) {
            patientId = existingPatient.id;
            // Update existing patient's source to "online" since they booked online
            if (existingPatient.source !== "online") {
              await storage.updatePatient(existingPatient.id, { source: "online" });
            }
          } else {
            // Create new patient
            const patientIdCode = `PAT-${randomUUID().substring(0, 8).toUpperCase()}`;
            const nameParts = booking.patientName.split(" ");
            const newPatient = await storage.createPatient({
              organizationId: orgId,
              patientId: patientIdCode,
              firstName: nameParts[0] || booking.patientName,
              lastName: nameParts.slice(1).join(" ") || "",
              phone: booking.patientPhone,
              email: booking.patientEmail || "",
              gender: booking.patientGender || "other",
              dateOfBirth: null,
              address: booking.serviceType === "home_collection"
                ? `${booking.collectionAddress || ""} ${booking.collectionAddressLine2 || ""} ${booking.collectionCity || ""} ${booking.collectionPincode || ""}`.trim()
                : "",
              source: "online",
            });
            patientId = newPatient.id;
          }

          // Update booking with patient ID
          await storage.updateBooking(req.params.id, { patientId });
        }

        // Get tests and packages for bill items
        const allTests = await storage.getTests(orgId);
        const allPackages = await storage.getPackages(orgId);

        const billItems: {
          testId: string;
          testName: string;
          price: string;
          quantity: number;
          discount: string;
          isPackage?: boolean;
          packageTestIds?: string[];
        }[] = [];

        // Add selected tests
        if (booking.selectedTests && booking.selectedTests.length > 0) {
          for (const testId of booking.selectedTests) {
            const test = allTests.find(t => t.id === testId);
            if (test) {
              billItems.push({
                testId: test.id,
                testName: test.name,
                price: String(test.price || 0),
                quantity: 1,
                discount: "0",
              });
            }
          }
        }

        // Add selected packages
        if (booking.selectedPackages && booking.selectedPackages.length > 0) {
          for (const pkgId of booking.selectedPackages) {
            const pkg = allPackages.find(p => p.id === pkgId);
            if (pkg) {
              billItems.push({
                testId: pkg.id,
                testName: pkg.name,
                price: String(pkg.discountedPrice || pkg.originalPrice || 0),
                quantity: 1,
                discount: "0",
                isPackage: true,
                packageTestIds: pkg.testIds as string[] || [],
              });
            }
          }
        }

        // Calculate totals
        const subtotal = billItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
        const homeCollectionCharge = parseFloat(String(booking.homeCollectionCharge || 0));
        const totalAmount = subtotal + homeCollectionCharge;

        // Create bill
        const bill = await storage.createBill({
          organizationId: orgId,
          branchId: booking.branchId || "",
          patientId: patientId!,
          items: billItems,
          subtotal: String(subtotal),
          discountAmount: "0",
          taxAmount: "0",
          totalAmount: String(totalAmount),
          paidAmount: "0",
          paymentStatus: "pending",
          paymentMethod: null,
          notes: `Online booking: ${booking.bookingNumber}`,
          createdBy: userId,
        });

        // Create samples for each test
        for (const item of billItems) {
          if (item.isPackage && item.packageTestIds && item.packageTestIds.length > 0) {
            // Package - create samples for each constituent test
            for (const testId of item.packageTestIds) {
              await storage.createSample({
                organizationId: orgId,
                billId: bill.id,
                patientId: patientId!,
                testId: testId,
                collectedBy: userId,
                collectedAt: new Date(),
              });
            }
          } else {
            // Regular test
            await storage.createSample({
              organizationId: orgId,
              billId: bill.id,
              patientId: patientId!,
              testId: item.testId,
              collectedBy: userId,
              collectedAt: new Date(),
            });
          }
        }

        // Update booking with bill ID
        await storage.updateBooking(req.params.id, { billId: bill.id });
      }

      const updated = await storage.updateBookingStatus(req.params.id, status, statusNotes);
      res.json(updated);
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).json({ error: "Failed to update booking status" });
    }
  });

  app.patch("/api/bookings/:id/assign", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      const booking = await storage.getBooking(req.params.id);
      if (!booking || booking.organizationId !== orgId) {
        return res.status(404).json({ error: "Booking not found" });
      }
      const { collectionAgentId } = req.body;
      const updated = await storage.updateBooking(req.params.id, { collectionAgentId });
      res.json(updated);
    } catch (error) {
      console.error("Error assigning collection agent:", error);
      res.status(500).json({ error: "Failed to assign collection agent" });
    }
  });

  // Organization Booking Settings
  app.get("/api/booking-settings", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;
      let settings = await storage.getOrganizationBookingSettings(orgId);
      if (!settings) {
        settings = await storage.createOrganizationBookingSettings({
          organizationId: orgId,
          bookingEnabled: true,
          homeCollectionEnabled: false,
          homeCollectionCharge: "0",
          bookingLeadTime: 1,
          maxBookingsPerSlot: 5,
          workingDays: [1, 2, 3, 4, 5, 6],
          notifyOnBooking: true,
          availableTimeSlots: [
            { start: "08:00", end: "10:00", label: "Morning (8 AM - 10 AM)" },
            { start: "10:00", end: "12:00", label: "Late Morning (10 AM - 12 PM)" },
            { start: "12:00", end: "14:00", label: "Afternoon (12 PM - 2 PM)" },
            { start: "14:00", end: "16:00", label: "Late Afternoon (2 PM - 4 PM)" },
            { start: "16:00", end: "18:00", label: "Evening (4 PM - 6 PM)" },
          ],
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching booking settings:", error);
      res.status(500).json({ error: "Failed to fetch booking settings" });
    }
  });

  const bookingSettingsUpdateSchema = z.object({
    bookingEnabled: z.boolean().optional(),
    bookingPageTitle: z.string().optional(),
    bookingPageDescription: z.string().optional(),
    homeCollectionEnabled: z.boolean().optional(),
    homeCollectionCharge: z.string().optional(),
    homeCollectionMinOrder: z.string().optional(),
    availableTimeSlots: z.array(z.object({
      start: z.string(),
      end: z.string(),
      label: z.string(),
    })).optional(),
    bookingLeadTime: z.number().int().min(0).max(30).optional(),
    maxBookingsPerSlot: z.number().int().min(1).max(100).optional(),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
    notifyOnBooking: z.boolean().optional(),
    notificationEmail: z.string().email().optional().or(z.literal("")),
    notificationPhone: z.string().optional(),
  });

  app.patch("/api/booking-settings", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const parseResult = bookingSettingsUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const updated = await storage.updateOrganizationBookingSettings(orgId, parseResult.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating booking settings:", error);
      res.status(500).json({ error: "Failed to update booking settings" });
    }
  });

  // ============ PUBLIC BOOKING API (No auth required) ============

  // Get organization info for booking page (public)
  app.get("/api/public/org/:orgId", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const settings = await storage.getOrganizationBookingSettings(req.params.orgId);
      if (!settings?.bookingEnabled) {
        return res.status(403).json({ error: "Online booking is not enabled for this organization" });
      }
      res.json({
        id: org.id,
        name: org.name,
        logo: org.logo,
        address: org.address,
        city: org.city,
        state: org.state,
        phone: org.phone,
        email: org.email,
        bookingSettings: settings,
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Get tests for booking page (public)
  app.get("/api/public/org/:orgId/tests", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const settings = await storage.getOrganizationBookingSettings(req.params.orgId);
      if (!settings?.bookingEnabled) {
        return res.status(403).json({ error: "Online booking is not enabled for this organization" });
      }
      const tests = await storage.getTests(req.params.orgId);
      const activeTests = tests.filter(t => t.isActive);
      res.json(activeTests.map(t => ({
        id: t.id,
        name: t.name,
        code: t.code,
        category: t.category,
        price: t.price,
        description: t.description,
        sampleType: t.sampleType,
        turnaroundTime: t.turnaroundTime,
      })));
    } catch (error) {
      console.error("Error fetching tests:", error);
      res.status(500).json({ error: "Failed to fetch tests" });
    }
  });

  // Get packages for booking page (public)
  app.get("/api/public/org/:orgId/packages", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const settings = await storage.getOrganizationBookingSettings(req.params.orgId);
      if (!settings?.bookingEnabled) {
        return res.status(403).json({ error: "Online booking is not enabled for this organization" });
      }
      const packages = await storage.getPackages(req.params.orgId);
      const activePackages = packages.filter(p => p.isActive);
      res.json(activePackages.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        testIds: p.testIds,
        originalPrice: p.originalPrice,
        discountedPrice: p.discountedPrice,
        discountPercent: p.discountPercent,
      })));
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  // Submit booking (public)
  app.post("/api/public/org/:orgId/book", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const settings = await storage.getOrganizationBookingSettings(req.params.orgId);
      if (!settings?.bookingEnabled) {
        return res.status(403).json({ error: "Online booking is not enabled" });
      }

      // Validate booking data
      const parseResult = publicBookingFormSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.message });
      }
      const bookingData = parseResult.data;

      // Check if home collection is allowed
      if (bookingData.serviceType === "home_collection" && !settings.homeCollectionEnabled) {
        return res.status(400).json({ error: "Home collection is not available" });
      }

      // Calculate estimated amount
      let estimatedAmount = 0;
      if (bookingData.selectedTests && bookingData.selectedTests.length > 0) {
        for (const testId of bookingData.selectedTests) {
          const test = await storage.getTest(testId);
          if (test) {
            estimatedAmount += parseFloat(String(test.price));
          }
        }
      }
      if (bookingData.selectedPackages && bookingData.selectedPackages.length > 0) {
        for (const pkgId of bookingData.selectedPackages) {
          const pkg = await storage.getPackage(pkgId);
          if (pkg) {
            estimatedAmount += parseFloat(String(pkg.discountedPrice));
          }
        }
      }

      // Add home collection charge if applicable
      let homeCollectionCharge = "0";
      if (bookingData.serviceType === "home_collection" && settings.homeCollectionCharge) {
        homeCollectionCharge = String(settings.homeCollectionCharge);
        estimatedAmount += parseFloat(homeCollectionCharge);
      }

      // Generate booking number
      const bookings = await storage.getBookings(req.params.orgId);
      const bookingNumber = `BK-${String(bookings.length + 1).padStart(5, "0")}`;

      const booking = await storage.createBooking({
        bookingNumber,
        organizationId: req.params.orgId,
        patientName: bookingData.patientName,
        patientAge: bookingData.patientAge,
        patientGender: bookingData.patientGender,
        patientPhone: bookingData.patientPhone,
        patientEmail: bookingData.patientEmail || undefined,
        selectedTests: bookingData.selectedTests,
        selectedPackages: bookingData.selectedPackages,
        symptoms: bookingData.symptoms,
        serviceType: bookingData.serviceType,
        preferredDate: bookingData.preferredDate,
        preferredTimeSlot: bookingData.preferredTimeSlot,
        collectionAddress: bookingData.collectionAddress,
        collectionAddressLine2: bookingData.collectionAddressLine2,
        collectionCity: bookingData.collectionCity,
        collectionPincode: bookingData.collectionPincode,
        collectionNotes: bookingData.collectionNotes,
        estimatedAmount: String(estimatedAmount),
        homeCollectionCharge,
        status: "pending",
        source: "online",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      // Save/update booking patient for future lookups
      await storage.createOrUpdateBookingPatient({
        organizationId: req.params.orgId,
        name: bookingData.patientName,
        phone: bookingData.patientPhone,
        email: bookingData.patientEmail || undefined,
        age: bookingData.patientAge,
        gender: bookingData.patientGender,
        address: bookingData.collectionAddress,
        addressLine2: bookingData.collectionAddressLine2,
        city: bookingData.collectionCity,
        pincode: bookingData.collectionPincode,
      });

      // Also create a patient record in the main patients table if not exists
      const existingPatient = await storage.getPatientByPhone(bookingData.patientPhone, req.params.orgId);
      if (!existingPatient) {
        const { randomUUID } = await import("crypto");
        const patientId = `PAT-${randomUUID().substring(0, 8).toUpperCase()}`;

        // Parse patient name into first and last name
        const nameParts = bookingData.patientName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Build address string from collection address parts
        const addressParts = [
          bookingData.collectionAddress,
          bookingData.collectionAddressLine2,
          bookingData.collectionCity,
          bookingData.collectionPincode,
        ].filter(Boolean);

        await storage.createPatient({
          organizationId: req.params.orgId,
          patientId,
          firstName,
          lastName,
          phone: bookingData.patientPhone,
          email: bookingData.patientEmail || undefined,
          gender: bookingData.patientGender,
          address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
          source: "online",
        });
      }

      res.status(201).json({
        success: true,
        bookingNumber: booking.bookingNumber,
        estimatedAmount,
        message: "Booking submitted successfully! We will contact you shortly to confirm.",
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Public consultation booking
  const publicConsultationBookingSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    patientName: z.string().min(2, "Name must be at least 2 characters"),
    patientAge: z.number().min(0).max(150).optional(),
    patientGender: z.enum(["male", "female", "other"]),
    patientPhone: z.string().min(10, "Phone must be at least 10 digits"),
    patientEmail: z.string().email().optional().or(z.literal("")),
    symptoms: z.string().optional(),
    doctorId: z.string().min(1, "Doctor is required"),
    departmentId: z.string().optional(),
    preferredDate: z.string().optional(),
    preferredTimeSlot: z.string().optional(),
    consultationType: z.enum(["in_person", "video"]).default("in_person"),
  });

  app.post("/api/public/book-consultation", async (req, res) => {
    try {
      const parseResult = publicConsultationBookingSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.message });
      }
      const {
        organizationId,
        patientName,
        patientAge,
        patientGender,
        patientPhone,
        patientEmail,
        symptoms,
        doctorId,
        departmentId,
        preferredDate,
        preferredTimeSlot,
        consultationType,
      } = parseResult.data;

      if (consultationType === "video" && (!preferredDate || !preferredTimeSlot)) {
        return res.status(400).json({ error: "Date and time slot are required for video consultations" });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Check if doctor exists and is available
      const doctor = await storage.getDoctor(doctorId);
      if (!doctor || !doctor.isAvailable) {
        return res.status(400).json({ error: "Doctor not available" });
      }

      // Get or create patient
      let patient = await storage.getPatientByPhone(patientPhone, organizationId);
      if (!patient) {
        const { randomUUID } = await import("crypto");
        const patientId = `PAT-${randomUUID().substring(0, 8).toUpperCase()}`;
        const nameParts = patientName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        patient = await storage.createPatient({
          organizationId,
          patientId,
          firstName,
          lastName,
          phone: patientPhone,
          email: patientEmail || undefined,
          gender: patientGender,
          source: "online",
          module: "hospitals",
        });
      } else if (patient.module === "diagnostics") {
        patient = await storage.updatePatient(patient.id, { module: "both" }) || patient;
      }

      // Get token date and next token number
      const tokenDate = preferredDate || new Date().toISOString().split("T")[0];
      const tokenNumber = await storage.getNextTokenNumber(organizationId, tokenDate);

      // Generate meeting room ID for video consultations
      let meetingRoomId: string | null = null;
      if (consultationType === "video") {
        const { randomUUID } = await import("crypto");
        meetingRoomId = randomUUID();
      }

      // Create OP visit
      const visit = await storage.createOpVisit({
        organizationId,
        patientId: patient.id,
        doctorId,
        departmentId: departmentId || null,
        tokenNumber,
        tokenDate,
        visitType: "consultation",
        consultationType,
        source: "online",
        status: "booked",
        symptoms: symptoms || null,
        scheduledTime: preferredTimeSlot || null,
        scheduledDate: preferredDate || null,
        meetingRoomId,
        consultationFee: doctor.consultationFee,
        paymentMode: consultationType === "video" ? "online" : undefined,
        paymentStatus: "unpaid",
      });

      // Get queue position - count all non-completed visits ahead
      const todayVisits = await storage.getOpVisitsByDate(organizationId, tokenDate);
      const waitingCount = todayVisits.filter(
        (v) => (v.status === "waiting" || v.status === "booked" || v.status === "in_consultation") &&
          v.tokenNumber <= tokenNumber
      ).length;

      const response: Record<string, any> = {
        success: true,
        tokenNumber: visit.tokenNumber,
        visitId: visit.id,
        queuePosition: waitingCount,
        message: consultationType === "video"
          ? "Video consultation booked successfully!"
          : "Consultation booked successfully!",
      };

      if (consultationType === "video" && meetingRoomId) {
        response.meetingRoomId = meetingRoomId;
      }

      res.status(201).json(response);
    } catch (error) {
      console.error("Error creating consultation booking:", error);
      res.status(500).json({ error: "Failed to book consultation" });
    }
  });

  // Get queue status for a specific visit (public)
  app.get("/api/public/queue/:visitId", async (req, res) => {
    try {
      const visit = await storage.getOpVisit(req.params.visitId);
      if (!visit) {
        return res.status(404).json({ error: "Visit not found" });
      }

      const todayVisits = await storage.getOpVisitsByDate(visit.organizationId, visit.tokenDate);

      // Calculate queue position - count all active visits with earlier tokens
      const activeStatuses = ["waiting", "booked", "in_consultation"];
      const visitsAhead = todayVisits
        .filter((v) => activeStatuses.includes(v.status) && v.tokenNumber < visit.tokenNumber)
        .length;

      const inConsultation = todayVisits.find((v) => v.status === "in_consultation");

      // Get doctor info
      let doctor = null;
      if (visit.doctorId) {
        doctor = await storage.getDoctor(visit.doctorId);
      }

      // If current visit is already in queue, add 1 for position (1-based)
      const queuePosition = visit.status === "completed" || visit.status === "cancelled" ? 0 : visitsAhead + 1;

      res.json({
        tokenNumber: visit.tokenNumber,
        status: visit.status,
        queuePosition,
        estimatedWaitMinutes: visitsAhead * 15,
        doctor: doctor ? { name: doctor.name, specialization: doctor.specialization } : null,
        currentlyServing: inConsultation?.tokenNumber || null,
        scheduledTime: visit.scheduledTime,
        symptoms: visit.symptoms,
      });
    } catch (error) {
      console.error("Error fetching queue status:", error);
      res.status(500).json({ error: "Failed to fetch queue status" });
    }
  });

  // Get organization info (public)
  app.get("/api/public/org/:orgId/info", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      res.json({
        id: org.id,
        name: org.name,
        logo: org.logo,
        address: org.address,
        phone: org.phone,
        email: org.email,
      });
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ error: "Failed to fetch organization" });
    }
  });

  // Patient portal - verify phone and get patient data
  app.post("/api/public/patient-portal/:orgId/verify", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone || phone.length < 10) {
        return res.status(400).json({ error: "Valid phone number required" });
      }

      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      // Find patient by phone
      const patient = await storage.getPatientByPhone(phone, req.params.orgId);
      if (!patient) {
        return res.status(404).json({ error: "No records found for this phone number" });
      }

      // Get patient's visits with prescriptions
      const allVisits = await storage.getOpVisits(req.params.orgId);
      const patientVisits = allVisits.filter(v => v.patientId === patient.id);

      // Get doctors for visit details
      const doctors = await storage.getDoctors(req.params.orgId);

      // Get prescriptions for each visit
      const visitsWithDetails = await Promise.all(
        patientVisits.map(async (visit) => {
          const prescriptions = await storage.getPrescriptions(visit.id);
          const doctor = doctors.find(d => d.id === visit.doctorId);
          return {
            ...visit,
            doctor,
            prescriptions,
          };
        })
      );

      // Sort by date (newest first)
      visitsWithDetails.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      res.json({
        patient,
        organization: org,
        visits: visitsWithDetails,
      });
    } catch (error) {
      console.error("Error verifying patient:", error);
      res.status(500).json({ error: "Failed to verify patient" });
    }
  });

  // Lookup patient by phone (public) - for returning patients
  app.get("/api/public/org/:orgId/patient-lookup", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const settings = await storage.getOrganizationBookingSettings(req.params.orgId);
      if (!settings?.bookingEnabled) {
        return res.status(403).json({ error: "Online booking is not enabled" });
      }

      const phone = req.query.phone as string;
      if (!phone || phone.length < 10) {
        return res.status(400).json({ error: "Valid phone number required" });
      }

      const bookingPatient = await storage.getBookingPatientByPhone(req.params.orgId, phone);
      if (bookingPatient) {
        return res.json({
          found: true,
          patient: {
            name: bookingPatient.name,
            phone: bookingPatient.phone,
            email: bookingPatient.email,
            age: bookingPatient.age,
            gender: bookingPatient.gender,
            address: bookingPatient.address,
            addressLine2: bookingPatient.addressLine2,
            city: bookingPatient.city,
            pincode: bookingPatient.pincode,
          },
        });
      }

      const mainPatient = await storage.getPatientByPhone(phone, req.params.orgId);
      if (mainPatient) {
        let age: number | null = null;
        if (mainPatient.dateOfBirth) {
          const dob = new Date(mainPatient.dateOfBirth);
          const today = new Date();
          age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
          }
        }
        const name = [mainPatient.firstName, mainPatient.lastName].filter(Boolean).join(" ");
        return res.json({
          found: true,
          patient: {
            name,
            phone: mainPatient.phone,
            email: mainPatient.email || "",
            age,
            gender: mainPatient.gender || "",
            address: mainPatient.address || "",
            addressLine2: "",
            city: "",
            pincode: "",
          },
        });
      }

      return res.json({ found: false });
    } catch (error) {
      console.error("Error looking up patient:", error);
      res.status(500).json({ error: "Failed to lookup patient" });
    }
  });

  // Get bookings by phone (public) - for customers to track their bookings
  // Security: Requires phone + booking number for verification
  // Without booking number, only returns count of bookings (no details)
  app.get("/api/public/org/:orgId/bookings", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const settings = await storage.getOrganizationBookingSettings(req.params.orgId);
      if (!settings?.bookingEnabled) {
        return res.status(403).json({ error: "Online booking is not enabled" });
      }

      const phone = req.query.phone as string;
      const bookingNumber = req.query.bookingNumber as string;

      if (!phone || phone.length < 10) {
        return res.status(400).json({ error: "Valid phone number required" });
      }

      // Fetch all bookings for this phone number
      const allBookings = await storage.getBookings(req.params.orgId);
      const customerBookings = allBookings.filter(b => b.patientPhone === phone);

      // If no booking number provided, return only aggregate status counts (no details)
      if (!bookingNumber) {
        const statusCounts = {
          total: customerBookings.length,
          pending: customerBookings.filter(b => b.status === "pending").length,
          confirmed: customerBookings.filter(b => b.status === "confirmed").length,
          sample_collected: customerBookings.filter(b => b.status === "sample_collected").length,
          completed: customerBookings.filter(b => b.status === "completed").length,
          cancelled: customerBookings.filter(b => b.status === "cancelled").length,
        };

        // Return booking numbers only (masked) so user can select one to track
        const bookingList = customerBookings.map(b => ({
          bookingNumber: b.bookingNumber,
          status: b.status,
          date: b.preferredDate,
        }));

        return res.json({
          verified: false,
          statusCounts,
          bookings: bookingList,
          message: "Enter your booking number for full details"
        });
      }

      // With booking number - verify it matches and return full details for that booking only
      const matchingBooking = customerBookings.find(
        b => b.bookingNumber.toUpperCase() === bookingNumber.toUpperCase()
      );

      if (!matchingBooking) {
        return res.status(404).json({
          error: "Booking not found. Please check your booking number and phone number."
        });
      }

      // Return full details for the verified booking
      const bookingDetails = {
        id: matchingBooking.id,
        bookingNumber: matchingBooking.bookingNumber,
        patientName: matchingBooking.patientName,
        status: matchingBooking.status,
        preferredDate: matchingBooking.preferredDate,
        preferredTimeSlot: matchingBooking.preferredTimeSlot,
        serviceType: matchingBooking.serviceType,
        estimatedAmount: matchingBooking.estimatedAmount,
        testCount: matchingBooking.selectedTests?.length || 0,
        packageCount: matchingBooking.selectedPackages?.length || 0,
        createdAt: matchingBooking.createdAt,
      };

      res.json({
        verified: true,
        booking: bookingDetails,
        // Also include list of other bookings (status only) for navigation
        otherBookings: customerBookings
          .filter(b => b.id !== matchingBooking.id)
          .map(b => ({ bookingNumber: b.bookingNumber, status: b.status, date: b.preferredDate }))
      });
    } catch (error) {
      console.error("Error fetching customer bookings:", error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  // Get test reports for a customer by phone (public) - for customer portal
  app.get("/api/public/org/:orgId/reports", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }
      const settings = await storage.getOrganizationBookingSettings(req.params.orgId);
      if (!settings?.bookingEnabled) {
        return res.status(403).json({ error: "Online booking is not enabled" });
      }

      const phone = req.query.phone as string;
      if (!phone || phone.length < 10) {
        return res.status(400).json({ error: "Valid phone number required" });
      }

      // Find patients with this phone number
      const allPatients = await storage.getPatients(req.params.orgId);
      const matchingPatients = allPatients.filter(p => p.phone === phone);

      if (matchingPatients.length === 0) {
        return res.json({ reports: [] });
      }

      // Get all finalized test reports for these patients
      const allTestReports = await storage.getTestReports(req.params.orgId);
      const allTests = await storage.getTests(req.params.orgId);
      const allSamples = await storage.getSamples(req.params.orgId);

      const patientIds = matchingPatients.map(p => p.id);
      const customerReports = allTestReports.filter(r =>
        patientIds.includes(r.patientId) &&
        (r.status === "finalized" || r.status === "revised")
      );

      // Build report list with test and patient info
      const reportsList = customerReports.map(report => {
        const patient = matchingPatients.find(p => p.id === report.patientId);
        const test = allTests.find(t => t.id === report.testId);
        const sample = allSamples.find(s => s.id === report.sampleId);

        return {
          id: report.id,
          reportNumber: report.reportNumber,
          testName: test?.name || "Unknown Test",
          patientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : "Unknown",
          status: report.status,
          finalizedAt: report.finalizedAt,
          createdAt: report.createdAt,
        };
      }).sort((a, b) => {
        const dateA = a.finalizedAt || a.createdAt;
        const dateB = b.finalizedAt || b.createdAt;
        return new Date(dateB!).getTime() - new Date(dateA!).getTime();
      });

      res.json({ reports: reportsList });
    } catch (error) {
      console.error("Error fetching customer reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Get a specific report for download (public) - for customer portal
  app.get("/api/public/org/:orgId/reports/:reportNumber", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.orgId);
      if (!org) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const phone = req.query.phone as string;
      if (!phone || phone.length < 10) {
        return res.status(400).json({ error: "Valid phone number required for verification" });
      }

      // Find report
      const report = await storage.getTestReportByReportNumber(req.params.reportNumber);
      if (!report || report.organizationId !== req.params.orgId) {
        return res.status(404).json({ error: "Report not found" });
      }

      // Verify the phone matches the patient
      const patient = await storage.getPatient(report.patientId);
      if (!patient || patient.phone !== phone) {
        return res.status(403).json({ error: "Phone number does not match" });
      }

      // Get related data
      const test = await storage.getTest(report.testId);
      const sample = await storage.getSample(report.sampleId);

      res.json({
        report: {
          id: report.id,
          reportNumber: report.reportNumber,
          status: report.status,
          version: report.version,
          resultData: report.resultData,
          interpretation: report.interpretation,
          aiSummary: report.aiSummary,
          instrumentUsed: report.instrumentUsed,
          methodology: report.methodology,
          finalizedAt: report.finalizedAt,
          createdAt: report.createdAt,
        },
        patient: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          patientId: patient.patientId,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
        },
        test: test ? {
          name: test.name,
          code: test.code,
          category: test.category,
          sampleType: test.sampleType,
          reportTemplate: test.reportTemplate,
          normalRange: test.normalRange,
          unit: test.unit,
        } : null,
        sample: sample ? {
          sampleId: sample.sampleId,
          collectedAt: sample.collectedAt,
          status: sample.status,
          resultValue: sample.resultValue,
          isAbnormal: sample.isAbnormal,
        } : null,
        organization: {
          name: org.name,
          logo: org.logo,
          address: org.address,
          city: org.city,
          state: org.state,
          pincode: org.pincode,
          phone: org.phone,
          email: org.email,
          reportHeader: org.reportHeader,
          reportFooter: org.reportFooter,
          primaryColor: org.primaryColor,
          accentColor: org.accentColor,
          headerColor: org.headerColor,
          showLogo: org.showLogo ?? true,
          showQRCode: org.showQRCode ?? true,
        },
      });
    } catch (error) {
      console.error("Error fetching public report:", error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // ============ ANALYTICS ============
  app.get("/api/analytics", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const period = (req.query.period as string) || "month";
      const modulesParam = (req.query.modules as string) || "dialab,doclab,medlab";
      const selectedModules = modulesParam.split(",").map(m => m.trim().toLowerCase());
      const includeDialab = selectedModules.includes("dialab");
      const includeDoclab = selectedModules.includes("doclab");
      const includeMedlab = selectedModules.includes("medlab");

      const now = new Date();
      let startDate: Date;
      let prevStartDate: Date;
      let prevEndDate: Date;

      if (period === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(startDate);
      } else if (period === "week") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate = new Date(startDate);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEndDate = new Date(startDate);
      }

      const formatCurrency = (num: number) => `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
      const formatChange = (change: string) => {
        const num = parseInt(change);
        return num >= 0 ? `+${num}%` : `${num}%`;
      };
      const calcChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev * 100).toFixed(0) : "0";
      const colors = ["bg-red-500", "bg-blue-500", "bg-purple-500", "bg-green-500", "bg-amber-500", "bg-cyan-500"];

      let totalRevenueCurrent = 0;
      let totalRevenuePrev = 0;
      let totalTransactionsCurrent = 0;
      let totalTransactionsPrev = 0;
      const allPatientIds = new Set<string>();
      const prevPatientIds = new Set<string>();
      const insights: Array<{ type: string; title: string; description: string; trend: string }> = [];
      let hasData = false;

      let dialabData: any = null;
      let doclabData: any = null;
      let medlabData: any = null;

      if (includeDialab) {
        const allBills = await storage.getBills(orgId);
        const allTests = await storage.getTests(orgId);
        const currentBills = allBills.filter(b => new Date(b.createdAt!) >= startDate);
        const prevBills = allBills.filter(b => {
          const d = new Date(b.createdAt!);
          return d >= prevStartDate && d < prevEndDate;
        });

        const currentRevenue = currentBills.reduce((sum, b) => sum + parseFloat(b.totalAmount || "0"), 0);
        const prevRevenue = prevBills.reduce((sum, b) => sum + parseFloat(b.totalAmount || "0"), 0);
        totalRevenueCurrent += currentRevenue;
        totalRevenuePrev += prevRevenue;
        totalTransactionsCurrent += currentBills.length;
        totalTransactionsPrev += prevBills.length;
        currentBills.forEach(b => allPatientIds.add(b.patientId));
        prevBills.forEach(b => prevPatientIds.add(b.patientId));
        if (currentBills.length > 0) hasData = true;

        let currentTestCount = 0;
        currentBills.forEach(b => {
          const items = b.items as any[];
          if (Array.isArray(items)) currentTestCount += items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        });

        const testCounts: Record<string, { name: string; count: number; revenue: number }> = {};
        currentBills.forEach(b => {
          const items = b.items as any[];
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const key = item.testId || item.testName;
              if (!testCounts[key]) testCounts[key] = { name: item.testName || "Unknown Test", count: 0, revenue: 0 };
              testCounts[key].count += item.quantity || 1;
              testCounts[key].revenue += (item.price || 0) * (item.quantity || 1);
            });
          }
        });
        const topTests = Object.values(testCounts).sort((a, b) => b.count - a.count).slice(0, 5)
          .map(t => ({ name: t.name, count: t.count, revenue: `₹${t.revenue.toLocaleString("en-IN")}` }));

        const categoryRevenue: Record<string, number> = {};
        currentBills.forEach(b => {
          const items = b.items as any[];
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const test = allTests.find(t => t.id === item.testId);
              const category = test?.category || "Other";
              categoryRevenue[category] = (categoryRevenue[category] || 0) + ((item.price || 0) * (item.quantity || 1));
            });
          }
        });
        const totalCatRev = Object.values(categoryRevenue).reduce((a, b) => a + b, 0);
        const revenueByCategory = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1]).slice(0, 6)
          .map(([category, revenue], i) => ({ category, percentage: totalCatRev > 0 ? Math.round((revenue / totalCatRev) * 100) : 0, color: colors[i % colors.length] }));

        dialabData = {
          revenue: currentRevenue,
          revenueChange: calcChange(currentRevenue, prevRevenue),
          testCount: currentTestCount,
          billCount: currentBills.length,
          topTests,
          revenueByCategory,
        };

        if (topTests.length >= 2) {
          insights.push({ type: "suggestion", title: "Dialab: Package Opportunity", description: `Consider bundling ${topTests[0]?.name} with ${topTests[1]?.name} - frequently ordered together.`, trend: "neutral" });
        }
      }

      if (includeDoclab) {
        const allVisits = await storage.getOpVisits(orgId);
        const allDoctors = await storage.getDoctors(orgId);
        const currentVisits = allVisits.filter(v => new Date(v.createdAt!) >= startDate);
        const prevVisits = allVisits.filter(v => {
          const d = new Date(v.createdAt!);
          return d >= prevStartDate && d < prevEndDate;
        });

        const currentRevenue = currentVisits.filter(v => v.paymentStatus === "paid").reduce((sum, v) => sum + parseFloat(v.consultationFee || "0"), 0);
        const prevRevenue = prevVisits.filter(v => v.paymentStatus === "paid").reduce((sum, v) => sum + parseFloat(v.consultationFee || "0"), 0);
        totalRevenueCurrent += currentRevenue;
        totalRevenuePrev += prevRevenue;
        totalTransactionsCurrent += currentVisits.length;
        totalTransactionsPrev += prevVisits.length;
        currentVisits.forEach(v => allPatientIds.add(v.patientId));
        prevVisits.forEach(v => prevPatientIds.add(v.patientId));
        if (currentVisits.length > 0) hasData = true;

        const completedVisits = currentVisits.filter(v => v.status === "completed");
        const doctorCounts: Record<string, { name: string; consultations: number; revenue: number }> = {};
        currentVisits.forEach(v => {
          const doc = allDoctors.find(d => d.id === v.doctorId);
          const docName = doc?.name || "Unknown Doctor";
          if (!doctorCounts[v.doctorId || "unknown"]) doctorCounts[v.doctorId || "unknown"] = { name: docName, consultations: 0, revenue: 0 };
          doctorCounts[v.doctorId || "unknown"].consultations++;
          if (v.paymentStatus === "paid") doctorCounts[v.doctorId || "unknown"].revenue += parseFloat(v.consultationFee || "0");
        });
        const topDoctors = Object.values(doctorCounts).sort((a, b) => b.consultations - a.consultations).slice(0, 5)
          .map(d => ({ name: d.name, consultations: d.consultations, revenue: `₹${d.revenue.toLocaleString("en-IN")}` }));

        const statusBreakdown = {
          completed: currentVisits.filter(v => v.status === "completed").length,
          waiting: currentVisits.filter(v => v.status === "waiting").length,
          booked: currentVisits.filter(v => v.status === "booked").length,
          cancelled: currentVisits.filter(v => v.status === "cancelled").length,
        };

        doclabData = {
          revenue: currentRevenue,
          revenueChange: calcChange(currentRevenue, prevRevenue),
          visitCount: currentVisits.length,
          completedCount: completedVisits.length,
          topDoctors,
          statusBreakdown,
        };

        const completionRate = currentVisits.length > 0 ? Math.round((completedVisits.length / currentVisits.length) * 100) : 0;
        if (completionRate > 80) {
          insights.push({ type: "growth", title: "Doclab: High Completion Rate", description: `${completionRate}% of consultations were completed this period. Great patient follow-through.`, trend: "up" });
        } else if (completionRate < 50 && currentVisits.length > 3) {
          insights.push({ type: "alert", title: "Doclab: Low Completion Rate", description: `Only ${completionRate}% consultations completed. Consider reducing wait times.`, trend: "down" });
        }
      }

      if (includeMedlab) {
        const { medicineSales: medSalesTable, medicines: medsTable } = await import("@shared/schema");
        const { db } = await import("./db");
        const { eq, desc: descOrder } = await import("drizzle-orm");

        const allSales = await db.select().from(medSalesTable).where(eq(medSalesTable.organizationId, orgId)).orderBy(descOrder(medSalesTable.createdAt));
        const currentSales = allSales.filter(s => new Date(s.createdAt!) >= startDate);
        const prevSales = allSales.filter(s => {
          const d = new Date(s.createdAt!);
          return d >= prevStartDate && d < prevEndDate;
        });

        const currentRevenue = currentSales.reduce((sum, s) => sum + parseFloat(s.total || "0"), 0);
        const prevRevenue = prevSales.reduce((sum, s) => sum + parseFloat(s.total || "0"), 0);
        totalRevenueCurrent += currentRevenue;
        totalRevenuePrev += prevRevenue;
        totalTransactionsCurrent += currentSales.length;
        totalTransactionsPrev += prevSales.length;
        currentSales.forEach(s => { if (s.customerPhone) allPatientIds.add(s.customerPhone); });
        prevSales.forEach(s => { if (s.customerPhone) prevPatientIds.add(s.customerPhone); });
        if (currentSales.length > 0) hasData = true;

        const medicineCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
        currentSales.forEach(s => {
          const items = s.items as any[];
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const key = item.medicineId || item.name;
              if (!medicineCounts[key]) medicineCounts[key] = { name: item.name || "Unknown", quantity: 0, revenue: 0 };
              medicineCounts[key].quantity += item.quantity || 1;
              medicineCounts[key].revenue += (item.price || 0) * (item.quantity || 1);
            });
          }
        });
        const topMedicines = Object.values(medicineCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5)
          .map(m => ({ name: m.name, quantity: m.quantity, revenue: `₹${m.revenue.toLocaleString("en-IN")}` }));

        medlabData = {
          revenue: currentRevenue,
          revenueChange: calcChange(currentRevenue, prevRevenue),
          salesCount: currentSales.length,
          topMedicines,
        };

        if (parseInt(calcChange(currentRevenue, prevRevenue)) > 15) {
          insights.push({ type: "growth", title: "Medlab: Sales Growing", description: `Pharmacy revenue increased ${calcChange(currentRevenue, prevRevenue)}% compared to last period.`, trend: "up" });
        }
      }

      const overallRevenueChange = calcChange(totalRevenueCurrent, totalRevenuePrev);
      const overallPatientChange = calcChange(allPatientIds.size, prevPatientIds.size);
      const overallTransactionChange = calcChange(totalTransactionsCurrent, totalTransactionsPrev);
      const avgTransaction = totalTransactionsCurrent > 0 ? totalRevenueCurrent / totalTransactionsCurrent : 0;
      const prevAvgTransaction = totalTransactionsPrev > 0 ? totalRevenuePrev / totalTransactionsPrev : 0;
      const avgTransactionChange = calcChange(avgTransaction, prevAvgTransaction);

      if (parseInt(overallRevenueChange) > 10) {
        insights.unshift({ type: "growth", title: "Revenue Growing", description: `Overall revenue increased ${overallRevenueChange}% compared to last period across selected modules.`, trend: "up" });
      } else if (parseInt(overallRevenueChange) < -10) {
        insights.unshift({ type: "alert", title: "Revenue Declining", description: `Overall revenue decreased ${Math.abs(parseInt(overallRevenueChange))}% compared to last period.`, trend: "down" });
      }

      if (!hasData) {
        insights.push({ type: "info", title: "Getting Started", description: "Start adding patients and creating bills to see your analytics and insights here.", trend: "neutral" });
      }

      const revenueByModule: Array<{ category: string; percentage: number; color: string }> = [];
      if (totalRevenueCurrent > 0) {
        if (includeDialab && dialabData) revenueByModule.push({ category: "Dialab", percentage: Math.round((dialabData.revenue / totalRevenueCurrent) * 100), color: "bg-blue-500" });
        if (includeDoclab && doclabData) revenueByModule.push({ category: "Doclab", percentage: Math.round((doclabData.revenue / totalRevenueCurrent) * 100), color: "bg-purple-500" });
        if (includeMedlab && medlabData) revenueByModule.push({ category: "Medlab", percentage: Math.round((medlabData.revenue / totalRevenueCurrent) * 100), color: "bg-green-500" });
      }

      res.json({
        stats: {
          revenue: formatCurrency(totalRevenueCurrent),
          revenueChange: formatChange(overallRevenueChange),
          patients: allPatientIds.size.toString(),
          patientsChange: formatChange(overallPatientChange),
          transactions: totalTransactionsCurrent.toString(),
          transactionsChange: formatChange(overallTransactionChange),
          avgTransaction: formatCurrency(avgTransaction),
          avgTransactionChange: formatChange(avgTransactionChange),
        },
        selectedModules,
        dialab: dialabData,
        doclab: doclabData,
        medlab: medlabData,
        revenueByModule: revenueByModule.length > 0 ? revenueByModule : [{ category: "No data", percentage: 100, color: "bg-gray-500" }],
        insights: insights.length > 0 ? insights : [{ type: "info", title: "Welcome to Analytics", description: "Select modules and start creating bills to see real-time business insights.", trend: "neutral" }],
        hasData,
        totalPatients: allPatientIds.size,
        totalTransactions: totalTransactionsCurrent,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ============ VIDEO CONSULTATION ENDPOINTS ============

  // Get video consultation details by meeting room ID (public, no auth)
  app.get("/api/public/video-consultation/:meetingRoomId", async (req, res) => {
    try {
      const visit = await storage.getOpVisitByMeetingRoomId(req.params.meetingRoomId);
      if (!visit) {
        return res.status(404).json({ error: "Video consultation not found" });
      }

      const [doctor, patient, org] = await Promise.all([
        visit.doctorId ? storage.getDoctor(visit.doctorId) : null,
        storage.getPatient(visit.patientId),
        storage.getOrganization(visit.organizationId),
      ]);

      res.json({
        visit,
        doctor: doctor ? {
          id: doctor.id,
          name: doctor.name,
          specialization: doctor.specialization,
          qualification: doctor.qualification,
        } : null,
        patient: patient ? {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          email: patient.email,
          gender: patient.gender,
        } : null,
        organization: org ? {
          id: org.id,
          name: org.name,
          logo: org.logo,
          phone: org.phone,
          email: org.email,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching video consultation:", error);
      res.status(500).json({ error: "Failed to fetch video consultation details" });
    }
  });

  // Update payment status for a video consultation (requires auth)
  app.patch("/api/op-pos/video-consultation/:visitId/payment", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const visit = await storage.getOpVisit(req.params.visitId);
      if (!visit || visit.organizationId !== orgId) {
        return res.status(404).json({ error: "Visit not found" });
      }

      if (visit.consultationType !== "video") {
        return res.status(400).json({ error: "Visit is not a video consultation" });
      }

      const paymentSchema = z.object({
        paymentTransactionId: z.string().min(1, "Transaction ID is required"),
      });

      const parseResult = paymentSchema.safeParse(req.body);
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const updated = await storage.updateOpVisit(visit.id, {
        paymentStatus: "paid",
        paymentMode: "online",
        paymentTransactionId: parseResult.data.paymentTransactionId,
      });

      res.json({ success: true, visit: updated });
    } catch (error) {
      console.error("Error updating video consultation payment:", error);
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  // Get all video consultations for an organization (requires auth)
  app.get("/api/op-pos/video-consultations", async (req, res) => {
    try {
      const orgId = await requireOrg(req, res);
      if (!orgId) return;

      const videoVisits = await storage.getVideoConsultations(orgId);

      const enrichedVisits = await Promise.all(
        videoVisits.map(async (visit) => {
          const [doctor, patient] = await Promise.all([
            visit.doctorId ? storage.getDoctor(visit.doctorId) : null,
            storage.getPatient(visit.patientId),
          ]);
          return {
            ...visit,
            doctorName: doctor?.name || null,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : null,
            patientPhone: patient?.phone || null,
          };
        })
      );

      res.json(enrichedVisits);
    } catch (error) {
      console.error("Error fetching video consultations:", error);
      res.status(500).json({ error: "Failed to fetch video consultations" });
    }
  });

  return httpServer;
}


