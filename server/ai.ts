import OpenAI from "openai";
import { z } from "zod";
import type { Patient, Test, Bill } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
});

// ============ Validation Schemas ============
export const checkDuplicateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

export const suggestTestsSchema = z.object({
  patientId: z.string().optional(),
  conditions: z.array(z.string()).optional(),
});

export const checkBillingSchema = z.object({
  items: z.array(z.object({
    testId: z.string(),
    testName: z.string().optional(),
    price: z.number(),
    quantity: z.number().min(1),
  })),
  totalAmount: z.string(),
});

export const whatsappSummarySchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  testResults: z.array(z.object({
    testName: z.string(),
    value: z.string(),
    normalRange: z.string(),
    isAbnormal: z.boolean(),
  })),
});

export const reportSummarySchema = z.object({
  testResults: z.array(z.object({
    testName: z.string(),
    value: z.string(),
    normalRange: z.string(),
    unit: z.string(),
    isAbnormal: z.boolean(),
  })),
});

export const suggestTestDetailsSchema = z.object({
  testName: z.string().min(1, "Test name is required"),
});

export const suggestPackageSchema = z.object({
  packageName: z.string().min(1, "Package name is required"),
  availableTests: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
  })),
});

export const generateReportTemplateSchema = z.object({
  testName: z.string().min(1, "Test name is required"),
  testCode: z.string().min(1, "Test code is required"),
  category: z.string().optional(),
  sampleType: z.string().optional(),
});

export const suggestMedicinesSchema = z.object({
  symptoms: z.string().min(1, "Symptoms are required"),
  diagnosis: z.string().optional(),
  searchQuery: z.string().optional(),
});

export interface MedicineSuggestion {
  medicineName: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  description: string;
  usage: string;
  category: string;
}

// ============ AI Functions ============

export async function suggestMedicines(
  symptoms: string,
  diagnosis?: string,
  searchQuery?: string,
): Promise<{ medicines: MedicineSuggestion[] }> {
  const searchClause = searchQuery
    ? `The doctor is searching for "${searchQuery}". Prioritize medicines matching this search term that are relevant to the symptoms.`
    : "";

  const diagnosisClause = diagnosis
    ? `Diagnosis: ${diagnosis}`
    : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a medical prescription assistant for Indian healthcare. Suggest medicines commonly prescribed in India for the given symptoms. Include both brand names popular in India and generic names. Return ONLY valid JSON.

Response format:
{
  "medicines": [
    {
      "medicineName": "Brand name (e.g., Dolo 650)",
      "genericName": "Generic name (e.g., Paracetamol 650mg)",
      "dosage": "e.g., 650mg or 500mg",
      "frequency": "e.g., 1-0-1 (morning-afternoon-night) or SOS",
      "duration": "e.g., 5 days or 7 days",
      "description": "Brief 1-line description of what this medicine does",
      "usage": "When and how to take (e.g., After food, Before sleep)",
      "category": "e.g., Analgesic, Antibiotic, Antacid, Antihistamine"
    }
  ]
}

Important:
- Suggest 5-8 relevant medicines
- Use Indian brand names commonly available
- Include dosage in standard Indian medical notation (1-0-1, 1-1-1, 0-0-1, SOS)
- Focus on commonly prescribed, safe medications
- Group related medicines logically (antipyretics first for fever, etc.)`,
      },
      {
        role: "user",
        content: `Patient symptoms: ${symptoms}\n${diagnosisClause}\n${searchClause}\n\nSuggest appropriate medicines.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    const medicines = (parsed.medicines || []).map((m: any) => ({
      medicineName: m.medicineName || "Unknown Medicine",
      genericName: m.genericName || "",
      dosage: m.dosage || "",
      frequency: m.frequency || "",
      duration: m.duration || "",
      description: m.description || "",
      usage: m.usage || "",
      category: m.category || "General",
    })).filter((m: any) => m.medicineName !== "Unknown Medicine");
    return { medicines };
  } catch (err) {
    console.error("Failed to parse AI medicine response:", content, err);
    return { medicines: [] };
  }
}

/**
 * Check for duplicate patients based on name and phone similarity
 */
export async function detectDuplicatePatient(
  newPatient: { firstName: string; lastName: string; phone: string },
  existingPatients: Patient[]
): Promise<{ isDuplicate: boolean; matchedPatient?: Patient; confidence: number }> {
  if (existingPatients.length === 0) {
    return { isDuplicate: false, confidence: 0 };
  }

  // First check exact phone match
  const phoneMatch = existingPatients.find(p => p.phone === newPatient.phone);
  if (phoneMatch) {
    return { isDuplicate: true, matchedPatient: phoneMatch, confidence: 100 };
  }

  // Check for similar names (Levenshtein-style fuzzy match without AI for performance)
  const newName = `${newPatient.firstName} ${newPatient.lastName}`.toLowerCase();
  for (const patient of existingPatients) {
    const existingName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    if (existingName === newName) {
      return { isDuplicate: true, matchedPatient: patient, confidence: 95 };
    }
    // Check if names are very similar (first few characters match)
    if (existingName.substring(0, 5) === newName.substring(0, 5) && 
        patient.phone.substring(0, 6) === newPatient.phone.substring(0, 6)) {
      return { isDuplicate: true, matchedPatient: patient, confidence: 80 };
    }
  }

  // For more complex fuzzy matching, use AI only if needed
  if (existingPatients.length <= 50) {
    const patientList = existingPatients.map(p => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      phone: p.phone
    }));

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are a duplicate detection system. Given a new patient and a list of existing patients, determine if the new patient might be a duplicate based on similar names or phone numbers. Consider typos, spelling variations, and nicknames. Return JSON with: isDuplicate (boolean), matchedId (string ID from the list or null), confidence (0-100 number).`
        }, {
          role: "user",
          content: `New patient: ${newPatient.firstName} ${newPatient.lastName}, Phone: ${newPatient.phone}\n\nExisting patients:\n${JSON.stringify(patientList)}`
        }],
        response_format: { type: "json_object" },
        max_completion_tokens: 200,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      if (result.isDuplicate && result.matchedId) {
        const matched = existingPatients.find(p => p.id === result.matchedId);
        if (matched) {
          return { isDuplicate: true, matchedPatient: matched, confidence: result.confidence || 80 };
        }
      }
      return { isDuplicate: false, confidence: result.confidence || 0 };
    } catch (error) {
      console.error("AI duplicate detection failed:", error);
      return { isDuplicate: false, confidence: 0 };
    }
  }

  return { isDuplicate: false, confidence: 0 };
}

/**
 * Suggest tests based on patient history and current symptoms/conditions
 */
export async function suggestTests(
  patientHistory: { tests: string[]; conditions?: string[] },
  availableTests: Test[]
): Promise<{ suggestedTests: Array<{ id: string; name: string }>; reason: string }> {
  if (availableTests.length === 0) {
    return { suggestedTests: [], reason: "No tests available" };
  }

  try {
    const testList = availableTests.map(t => ({ id: t.id, name: t.name, category: t.category }));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a medical test recommendation system for a diagnostic lab in India. Based on patient history and conditions, suggest relevant follow-up or related tests from the available list. Return JSON with: suggestedTestIds (array of test ID strings from the provided list), reason (brief explanation in 1-2 sentences).`
      }, {
        role: "user",
        content: `Patient's previous tests: ${patientHistory.tests.join(", ") || "None"}\nConditions: ${patientHistory.conditions?.join(", ") || "Not specified"}\n\nAvailable tests:\n${JSON.stringify(testList)}`
      }],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const suggestedTestIds = result.suggestedTestIds || [];
    
    // Map IDs to test objects with names
    const suggestedTests = suggestedTestIds
      .map((id: string) => {
        const test = availableTests.find(t => t.id === id);
        return test ? { id: test.id, name: test.name } : null;
      })
      .filter(Boolean) as Array<{ id: string; name: string }>;

    return {
      suggestedTests,
      reason: result.reason || "Based on patient history"
    };
  } catch (error) {
    console.error("AI test suggestion failed:", error);
    return { suggestedTests: [], reason: "Suggestion unavailable" };
  }
}

/**
 * Detect billing anomalies (unusually high bills, duplicate charges, etc.)
 */
export async function detectBillingAnomalies(
  currentBill: { items: Array<{ testId: string; price: number; quantity: number }>; totalAmount: string },
  recentBills: Bill[]
): Promise<{ hasAnomaly: boolean; warnings: string[] }> {
  const warnings: string[] = [];

  const currentTotal = parseFloat(currentBill.totalAmount);
  if (isNaN(currentTotal) || currentTotal <= 0) {
    return { hasAnomaly: false, warnings: [] };
  }

  // Calculate average bill amount from recent bills
  const recentTotals = recentBills
    .map(b => parseFloat(String(b.totalAmount)))
    .filter(n => !isNaN(n) && n > 0);

  if (recentTotals.length >= 3) {
    const avgTotal = recentTotals.reduce((a, b) => a + b, 0) / recentTotals.length;
    if (currentTotal > avgTotal * 3) {
      warnings.push(`Bill amount (₹${currentTotal.toFixed(0)}) is significantly higher than average (₹${avgTotal.toFixed(0)})`);
    }
  }

  // Check for duplicate tests in same bill
  const testIds = currentBill.items
    .filter(item => item.testId)
    .map(item => item.testId);
  const duplicates = testIds.filter((id, idx) => testIds.indexOf(id) !== idx);
  if (duplicates.length > 0) {
    warnings.push("Duplicate tests detected in the same bill");
  }

  // Check for unusually high quantities
  const highQtyItems = currentBill.items.filter(item => item.quantity > 3);
  if (highQtyItems.length > 0) {
    warnings.push("Unusually high quantity for some tests");
  }

  return {
    hasAnomaly: warnings.length > 0,
    warnings
  };
}

/**
 * Generate patient-friendly report summary for WhatsApp
 */
export async function generatePatientFriendlySummary(
  patientName: string,
  testResults: Array<{ testName: string; value: string; normalRange: string; isAbnormal: boolean }>
): Promise<string> {
  if (!patientName || testResults.length === 0) {
    return `Dear ${patientName || "Patient"}, your test report is ready. Please visit our center or check the patient portal for details.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a friendly healthcare assistant. Generate a brief, warm WhatsApp message in simple language (mix of English and Hindi is fine) explaining test results to a patient. Keep it under 200 words. Don't give medical advice, just summarize. For abnormal results, gently suggest consulting a doctor. Start with "Dear ${patientName}".`
      }, {
        role: "user",
        content: `Patient: ${patientName}\nTest Results:\n${testResults.map(t => 
          `- ${t.testName}: ${t.value} (Normal: ${t.normalRange})${t.isAbnormal ? " [Abnormal]" : ""}`
        ).join("\n")}`
      }],
      max_completion_tokens: 300,
    });

    return response.choices[0]?.message?.content || `Dear ${patientName}, your report is ready.`;
  } catch (error) {
    console.error("AI summary generation failed:", error);
    return `Dear ${patientName}, your test report is ready. Please visit our center or check the patient portal for details.`;
  }
}

/**
 * Generate AI summary of lab report for healthcare professionals
 */
export async function generateReportAISummary(
  testResults: Array<{ testName: string; value: string; normalRange: string; unit: string; isAbnormal: boolean }>
): Promise<string> {
  if (testResults.length === 0) {
    return "No test results available for analysis.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a medical lab report analyst. Provide a brief clinical summary of the test results, highlighting any abnormal values and their potential significance. Keep it professional and concise (under 150 words). Include a disclaimer that this is an AI-generated summary and clinical correlation is advised.`
      }, {
        role: "user",
        content: `Test Results:\n${testResults.map(t => 
          `${t.testName}: ${t.value} ${t.unit} (Ref: ${t.normalRange})${t.isAbnormal ? " - ABNORMAL" : ""}`
        ).join("\n")}`
      }],
      max_completion_tokens: 250,
    });

    return response.choices[0]?.message?.content || "Analysis unavailable.";
  } catch (error) {
    console.error("AI report summary failed:", error);
    return "AI analysis unavailable at this time.";
  }
}

/**
 * Suggest test details based on test name using AI
 */
export async function suggestTestDetails(
  testName: string
): Promise<{
  code: string;
  category: string;
  normalRange: string;
  unit: string;
  sampleType: string;
  turnaroundTime: string;
  description: string;
}> {
  const defaultResult = {
    code: "",
    category: "Other",
    normalRange: "",
    unit: "",
    sampleType: "Blood",
    turnaroundTime: "24 hours",
    description: "",
  };

  if (!testName.trim()) {
    return defaultResult;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a medical laboratory expert with deep knowledge of diagnostic tests. Given a test name, provide standardized details for that test. Use your knowledge of common lab tests including:
- CBC (Complete Blood Count), Hemoglobin, WBC Count, Platelet Count
- Lipid Panel (Total Cholesterol, LDL, HDL, Triglycerides)
- Liver Function Tests (SGOT/AST, SGPT/ALT, Bilirubin, Alkaline Phosphatase)
- Kidney Function Tests (Creatinine, BUN, Uric Acid, eGFR)
- Thyroid Profile (TSH, T3, T4, Free T3, Free T4)
- Diabetes Tests (Fasting Blood Sugar, HbA1c, PPBS, OGTT)
- Vitamin Tests (Vitamin D, Vitamin B12, Folic Acid)
- Electrolytes (Sodium, Potassium, Chloride, Calcium)
- Cardiac Markers (Troponin, CK-MB, BNP)
- Infectious Disease Tests (HIV, HBsAg, HCV, Dengue, Malaria)
- Urine Tests (Routine Urine, Urine Culture)
- Hormone Tests (Testosterone, Estrogen, Prolactin, Cortisol)

Return JSON with these fields:
- code: Short alphanumeric code (e.g., "CBC001", "LFT001", "TFT001")
- category: One of "Hematology", "Biochemistry", "Microbiology", "Immunology", "Pathology", "Radiology", "Cardiology", "Other"
- normalRange: Standard reference range with units if applicable (e.g., "4.5-11.0", "70-100 mg/dL", "Negative")
- unit: Unit of measurement (e.g., "x10^9/L", "mg/dL", "mIU/L", "ng/mL")
- sampleType: One of "Blood", "Urine", "Stool", "Sputum", "Swab", "Tissue", "Other"
- turnaroundTime: Typical reporting time (e.g., "Same day", "24 hours", "48-72 hours")
- description: Brief clinical description of the test (1-2 sentences)`
      }, {
        role: "user",
        content: `Test name: ${testName}`
      }],
      response_format: { type: "json_object" },
      max_completion_tokens: 400,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      code: result.code || defaultResult.code,
      category: result.category || defaultResult.category,
      normalRange: result.normalRange || defaultResult.normalRange,
      unit: result.unit || defaultResult.unit,
      sampleType: result.sampleType || defaultResult.sampleType,
      turnaroundTime: result.turnaroundTime || defaultResult.turnaroundTime,
      description: result.description || defaultResult.description,
    };
  } catch (error) {
    console.error("AI test details suggestion failed:", error);
    return defaultResult;
  }
}

/**
 * Suggest tests for a health package based on package name
 */
export async function suggestPackageTests(
  packageName: string,
  availableTests: Array<{ id: string; name: string; category: string }>
): Promise<{ suggestedTestIds: string[]; reason: string }> {
  if (availableTests.length === 0) {
    return { suggestedTestIds: [], reason: "No tests available" };
  }

  try {
    const testList = availableTests.map(t => ({ id: t.id, name: t.name, category: t.category }));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a medical laboratory expert helping to create health checkup packages. Based on the package name, suggest which tests from the available list should be included. Use your knowledge of common health checkup packages:

- Full Body Checkup: CBC, LFT, KFT, Lipid Profile, Thyroid Profile, Blood Sugar, Urine Routine, Vitamin D, B12
- Basic Health Package: CBC, Blood Sugar, Lipid Profile, Urine Routine
- Cardiac Profile: Lipid Profile, ECG markers, Troponin, CK-MB, BNP, Blood Sugar
- Diabetes Panel: Fasting Blood Sugar, HbA1c, PPBS, Kidney Function, Lipid Profile
- Women's Health Package: CBC, Thyroid Profile, Vitamin D, B12, Iron Studies, Hormone panel
- Men's Health Package: CBC, Lipid Profile, PSA, Testosterone, Liver Function, Kidney Function
- Thyroid Profile: TSH, T3, T4, Free T3, Free T4
- Kidney Function Panel: Creatinine, BUN, Uric Acid, eGFR, Electrolytes
- Liver Function Panel: SGOT/AST, SGPT/ALT, Bilirubin, Alkaline Phosphatase, GGT, Albumin, Total Protein

Match tests by name similarity. Be generous in matching - if a test name contains relevant keywords, include it.
Return JSON with: suggestedTestIds (array of test ID strings from the provided list), reason (brief 1-2 sentence explanation).`
      }, {
        role: "user",
        content: `Package name: ${packageName}\n\nAvailable tests:\n${JSON.stringify(testList)}`
      }],
      response_format: { type: "json_object" },
      max_completion_tokens: 500,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const suggestedTestIds = result.suggestedTestIds || [];
    
    // Validate that all suggested IDs exist in available tests
    const validTestIds = suggestedTestIds.filter((id: string) => 
      availableTests.some(t => t.id === id)
    );

    return {
      suggestedTestIds: validTestIds,
      reason: result.reason || "Based on common health package composition"
    };
  } catch (error) {
    console.error("AI package suggestion failed:", error);
    return { suggestedTestIds: [], reason: "Suggestion unavailable" };
  }
}

/**
 * Report template field types
 */
export interface ReportTemplateField {
  id: string;
  name: string;
  type: "numeric" | "text" | "select" | "boolean";
  unit?: string;
  normalRange?: string;
  options?: string[]; // For select type
  required?: boolean;
  order: number;
}

export interface ReportTemplate {
  fields: ReportTemplateField[];
  layout?: "standard" | "table" | "detailed";
  showReferenceRanges?: boolean;
  showInterpretation?: boolean;
}

// Type for AI-generated report templates matching shared/report-templates.ts structure
export interface AIReportField {
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

export interface AIReportSection {
  name: string;
  fields: AIReportField[];
}

export interface AIReportTemplate {
  testCode: string;
  testName: string;
  category: string;
  sampleType: string;
  methodology?: string;
  sections: AIReportSection[];
}

/**
 * Generate a report template for a test based on its name and category using AI
 * Returns a template matching the ReportTemplate structure from shared/report-templates.ts
 */
export async function generateReportTemplate(
  testName: string,
  testCode: string,
  category?: string,
  sampleType?: string
): Promise<AIReportTemplate> {
  const defaultTemplate: AIReportTemplate = {
    testCode: testCode || "TEST",
    testName: testName,
    category: category || "Other",
    sampleType: sampleType || "Blood",
    sections: [{
      name: "RESULTS",
      fields: [{
        name: "result",
        label: "Result",
        unit: "",
        type: "text",
      }],
    }],
  };

  if (!testName.trim()) {
    return defaultTemplate;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `You are a medical laboratory expert who creates report templates for diagnostic tests. Given a test name, generate a structured report template with sections and fields for lab technicians to enter results.

Template structure guidelines:
- Group related tests into sections (e.g., "HEMOGLOBIN", "RBC COUNT", "WBC COUNT", "DIFFERENTIAL COUNT" for CBC)
- Each field should have proper reference ranges with male/female/general values
- Use snake_case for field names (e.g., "hemoglobin", "total_cholesterol")
- Reference ranges should use min/max for numeric values

Common test examples:
- CBC: Sections for Hemoglobin (13-17 male, 12-15 female), RBC Count (4.5-5.5M/4.0-5.0F), WBC Count (4000-11000), Platelets (150000-450000), Blood Indices (MCV 83-101, MCH 27-32, MCHC 32-36), Differential Count (Neutrophils 40-70%, Lymphocytes 20-45%, etc.)
- Lipid Profile: Total Cholesterol (<200), Triglycerides (<150), HDL (>40), LDL (<100), VLDL (<30), Cholesterol/HDL Ratio
- LFT: Bilirubin Total (0.3-1.2), Direct (0-0.3), SGOT/AST (5-40), SGPT/ALT (7-56), ALP (44-147), Total Protein (6-8), Albumin (3.5-5), Globulin, A/G Ratio
- KFT: Blood Urea (15-40), Creatinine (0.7-1.3), Uric Acid (3.5-7.2 M, 2.5-6.2 F), BUN, eGFR
- Thyroid: TSH (0.4-4.0), T3 (80-200), T4 (4.5-12.5), Free T3, Free T4

Return JSON with:
{
  "testCode": "TEST_CODE",
  "testName": "Full Test Name",
  "category": "Category",
  "sampleType": "Blood|Urine|Serum|etc.",
  "methodology": "e.g., Fully Automated Cell Counter",
  "sections": [
    {
      "name": "SECTION NAME (uppercase)",
      "fields": [
        {
          "name": "field_name_snake_case",
          "label": "Display Label",
          "unit": "g/dL",
          "type": "number|text|select",
          "decimalPlaces": 1,
          "options": ["Option1", "Option2"] // only for select type
          "referenceRange": {
            "male": { "min": 13.0, "max": 17.0 },
            "female": { "min": 12.0, "max": 15.0 }
          }
          // OR use "general" for non-gender-specific ranges:
          // "referenceRange": { "general": { "min": 80, "max": 100 } }
        }
      ]
    }
  ]
}`
      }, {
        role: "user",
        content: `Generate a report template for:
Test name: ${testName}
Test code: ${testCode}
Category: ${category || "Unknown"}
Sample type: ${sampleType || "Blood"}`
      }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    // Validate and return the template
    if (result.sections && Array.isArray(result.sections) && result.sections.length > 0) {
      return {
        testCode: result.testCode || testCode || "TEST",
        testName: result.testName || testName,
        category: result.category || category || "Other",
        sampleType: result.sampleType || sampleType || "Blood",
        methodology: result.methodology,
        sections: result.sections,
      };
    }
    
    return defaultTemplate;
  } catch (error) {
    console.error("AI report template generation failed:", error);
    return defaultTemplate;
  }
}

export const consultationListenSchema = z.object({
  audio: z.string().min(1, "Audio data is required"),
  patientName: z.string().optional(),
  patientAge: z.number().optional(),
  patientGender: z.string().optional(),
  existingSymptoms: z.string().optional(),
  existingDiagnosis: z.string().optional(),
});

export interface ConsultationAnalysis {
  transcript: string;
  summary: string;
  symptoms: string;
  diagnosis: string;
  treatmentPlan: string;
  medicines: MedicineSuggestion[];
  notes: string;
}

export async function analyzeConsultation(
  transcript: string,
  patientName?: string,
  patientAge?: number,
  patientGender?: string,
  existingSymptoms?: string,
  existingDiagnosis?: string,
): Promise<ConsultationAnalysis> {
  const patientInfo = [
    patientName ? `Name: ${patientName}` : "",
    patientAge ? `Age: ${patientAge}` : "",
    patientGender ? `Gender: ${patientGender}` : "",
  ].filter(Boolean).join(", ");

  const existingContext = [
    existingSymptoms ? `Previously noted symptoms: ${existingSymptoms}` : "",
    existingDiagnosis ? `Previously noted diagnosis: ${existingDiagnosis}` : "",
  ].filter(Boolean).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert clinical assistant for Indian healthcare. You will receive a transcript of a doctor-patient consultation (which may be in any language - Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Marathi, English, or mixed languages). Your job is to analyze the conversation and extract structured clinical information.

Return ONLY valid JSON in this exact format:
{
  "summary": "A brief 2-3 sentence summary of the consultation in English",
  "symptoms": "Comma-separated list of symptoms the patient described, in English",
  "diagnosis": "The most likely diagnosis based on the conversation, in English",
  "treatmentPlan": "Recommended treatment approach in brief, in English",
  "medicines": [
    {
      "medicineName": "Indian brand name (e.g., Dolo 650)",
      "genericName": "Generic name (e.g., Paracetamol 650mg)",
      "dosage": "e.g., 650mg",
      "frequency": "e.g., 1-0-1 (Indian notation)",
      "duration": "e.g., 5 days",
      "description": "Brief description of what this medicine does",
      "usage": "When and how to take (e.g., After food)",
      "category": "e.g., Analgesic, Antibiotic"
    }
  ],
  "notes": "Any additional clinical notes or observations from the conversation"
}

Important:
- The transcript may be in ANY language or a mix of languages - you MUST understand all of them
- Always respond in English regardless of the transcript language
- Suggest 3-8 relevant medicines using Indian brand names
- Use standard Indian medical notation for frequency (1-0-1, 1-1-1, 0-0-1, SOS)
- Be medically accurate and conservative in suggestions
- If the conversation is unclear or incomplete, note that in the summary
- Extract ALL symptoms mentioned by the patient, even casual mentions`,
      },
      {
        role: "user",
        content: `${patientInfo ? `Patient Info: ${patientInfo}\n` : ""}${existingContext ? `${existingContext}\n\n` : ""}Consultation Transcript:\n${transcript}\n\nAnalyze this consultation and provide structured clinical information with medicine suggestions.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    return {
      transcript,
      summary: parsed.summary || "Unable to generate summary from the conversation.",
      symptoms: parsed.symptoms || "",
      diagnosis: parsed.diagnosis || "",
      treatmentPlan: parsed.treatmentPlan || "",
      medicines: (parsed.medicines || []).map((m: any) => ({
        medicineName: m.medicineName || "Unknown Medicine",
        genericName: m.genericName || "",
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration || "",
        description: m.description || "",
        usage: m.usage || "",
        category: m.category || "General",
      })).filter((m: any) => m.medicineName !== "Unknown Medicine"),
      notes: parsed.notes || "",
    };
  } catch (err) {
    console.error("Failed to parse consultation analysis:", content, err);
    return {
      transcript,
      summary: "Could not analyze the consultation. Please try again.",
      symptoms: "",
      diagnosis: "",
      treatmentPlan: "",
      medicines: [],
      notes: "",
    };
  }
}

export const translatePrescriptionSchema = z.object({
  medicines: z.array(z.object({
    medicineName: z.string(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    instructions: z.string().optional(),
  })),
  targetLanguage: z.string().min(1, "Target language is required"),
});

export async function translatePrescription(
  medicines: Array<{
    medicineName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }>,
  targetLanguage: string
): Promise<Array<{
  medicineName: string;
  translatedMedicineName: string;
  translatedDosage: string;
  translatedFrequency: string;
  translatedDuration: string;
  translatedInstructions: string;
}>> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a medical prescription translator. Translate the following prescription details into ${targetLanguage}. Keep medicine brand names in English but translate dosage instructions, frequency, duration, and usage instructions. Use simple, patient-friendly language that patients can easily understand. 

Return a JSON object with this structure:
{
  "translations": [
    {
      "medicineName": "original medicine name",
      "translatedMedicineName": "medicine name (keep brand name, translate generic description if any)",
      "translatedDosage": "translated dosage",
      "translatedFrequency": "translated frequency in patient-friendly terms",
      "translatedDuration": "translated duration",
      "translatedInstructions": "translated instructions"
    }
  ]
}`,
      },
      {
        role: "user",
        content: `Translate these prescription items to ${targetLanguage}:\n${JSON.stringify(medicines, null, 2)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    return parsed.translations || [];
  } catch (err) {
    console.error("Failed to parse translation:", content, err);
    return medicines.map(m => ({
      medicineName: m.medicineName,
      translatedMedicineName: m.medicineName,
      translatedDosage: m.dosage || "",
      translatedFrequency: m.frequency || "",
      translatedDuration: m.duration || "",
      translatedInstructions: m.instructions || "",
    }));
  }
}
