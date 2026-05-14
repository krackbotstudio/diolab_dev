export interface ReportField {
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
  category?: string;
}

export interface ReportTemplateSection {
  name: string;
  fields: ReportField[];
}

export interface ReportTemplate {
  testCode: string;
  testName: string;
  category: string;
  sampleType: string;
  methodology?: string;
  sections: ReportTemplateSection[];
}

export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  CBC: {
    testCode: "CBC",
    testName: "Complete Blood Count (CBC)",
    category: "Hematology",
    sampleType: "Blood",
    methodology: "Fully Automated Cell Counter",
    sections: [
      {
        name: "HEMOGLOBIN",
        fields: [
          {
            name: "hemoglobin",
            label: "Hemoglobin (Hb)",
            unit: "g/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              male: { min: 13.0, max: 17.0 },
              female: { min: 12.0, max: 15.0 },
            },
          },
        ],
      },
      {
        name: "RBC COUNT",
        fields: [
          {
            name: "totalRbcCount",
            label: "Total RBC count",
            unit: "mill/cumm",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              male: { min: 4.5, max: 5.5 },
              female: { min: 4.0, max: 5.0 },
            },
          },
        ],
      },
      {
        name: "BLOOD INDICES",
        fields: [
          {
            name: "pcv",
            label: "Packed Cell Volume (PCV)",
            unit: "%",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              male: { min: 40, max: 50 },
              female: { min: 36, max: 44 },
            },
          },
          {
            name: "mcv",
            label: "Mean Corpuscular Volume (MCV)",
            unit: "fL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 83, max: 101 },
            },
          },
          {
            name: "mch",
            label: "MCH",
            unit: "pg",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 27, max: 32 },
            },
          },
          {
            name: "mchc",
            label: "MCHC",
            unit: "g/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 32.5, max: 34.5 },
            },
          },
          {
            name: "rdw",
            label: "RDW",
            unit: "%",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 11.6, max: 14.0 },
            },
          },
        ],
      },
      {
        name: "WBC COUNT",
        fields: [
          {
            name: "totalWbcCount",
            label: "Total WBC count",
            unit: "cumm",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 4000, max: 11000 },
            },
          },
        ],
      },
      {
        name: "DIFFERENTIAL WBC COUNT",
        fields: [
          {
            name: "neutrophils",
            label: "Neutrophils",
            unit: "%",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 50, max: 62 },
            },
          },
          {
            name: "lymphocytes",
            label: "Lymphocytes",
            unit: "%",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 20, max: 40 },
            },
          },
          {
            name: "eosinophils",
            label: "Eosinophils",
            unit: "%",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 6 },
            },
          },
          {
            name: "monocytes",
            label: "Monocytes",
            unit: "%",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 10 },
            },
          },
          {
            name: "basophils",
            label: "Basophils",
            unit: "%",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 2 },
            },
          },
        ],
      },
      {
        name: "PLATELET COUNT",
        fields: [
          {
            name: "plateletCount",
            label: "Platelet Count",
            unit: "cumm",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 150000, max: 410000 },
            },
          },
        ],
      },
    ],
  },

  LIPID: {
    testCode: "LIPID",
    testName: "Lipid Profile",
    category: "Biochemistry",
    sampleType: "Blood (Fasting)",
    methodology: "Enzymatic Method",
    sections: [
      {
        name: "LIPID PANEL",
        fields: [
          {
            name: "totalCholesterol",
            label: "Total Cholesterol",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 200, text: "Desirable: <200, Borderline: 200-239, High: ≥240" },
            },
          },
          {
            name: "triglycerides",
            label: "Triglycerides",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 150, text: "Normal: <150, Borderline: 150-199, High: 200-499" },
            },
          },
          {
            name: "hdlCholesterol",
            label: "HDL Cholesterol",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              male: { min: 40, max: 999, text: "Low: <40, Desirable: ≥60" },
              female: { min: 50, max: 999, text: "Low: <50, Desirable: ≥60" },
            },
          },
          {
            name: "ldlCholesterol",
            label: "LDL Cholesterol",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 100, text: "Optimal: <100, Near Optimal: 100-129, Borderline: 130-159, High: 160-189" },
            },
          },
          {
            name: "vldlCholesterol",
            label: "VLDL Cholesterol",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 5, max: 40 },
            },
          },
          {
            name: "totalHdlRatio",
            label: "Total Cholesterol/HDL Ratio",
            unit: "",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 0, max: 5, text: "Ideal: <5" },
            },
          },
          {
            name: "ldlHdlRatio",
            label: "LDL/HDL Ratio",
            unit: "",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 0, max: 3.5, text: "Ideal: <3.5" },
            },
          },
        ],
      },
    ],
  },

  LFT: {
    testCode: "LFT",
    testName: "Liver Function Test (LFT)",
    category: "Biochemistry",
    sampleType: "Blood",
    methodology: "Kinetic/Colorimetric Method",
    sections: [
      {
        name: "LIVER ENZYMES",
        fields: [
          {
            name: "sgot",
            label: "SGOT (AST)",
            unit: "U/L",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 40 },
            },
          },
          {
            name: "sgpt",
            label: "SGPT (ALT)",
            unit: "U/L",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 40 },
            },
          },
          {
            name: "alkalinePhosphatase",
            label: "Alkaline Phosphatase",
            unit: "U/L",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 44, max: 147 },
            },
          },
          {
            name: "ggt",
            label: "Gamma GT (GGT)",
            unit: "U/L",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              male: { min: 0, max: 60 },
              female: { min: 0, max: 40 },
            },
          },
        ],
      },
      {
        name: "BILIRUBIN",
        fields: [
          {
            name: "totalBilirubin",
            label: "Total Bilirubin",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 0.1, max: 1.2 },
            },
          },
          {
            name: "directBilirubin",
            label: "Direct Bilirubin",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 0, max: 0.3 },
            },
          },
          {
            name: "indirectBilirubin",
            label: "Indirect Bilirubin",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 0.1, max: 0.9 },
            },
          },
        ],
      },
      {
        name: "PROTEINS",
        fields: [
          {
            name: "totalProtein",
            label: "Total Protein",
            unit: "g/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 6.0, max: 8.3 },
            },
          },
          {
            name: "albumin",
            label: "Albumin",
            unit: "g/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 3.5, max: 5.2 },
            },
          },
          {
            name: "globulin",
            label: "Globulin",
            unit: "g/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 2.0, max: 3.5 },
            },
          },
          {
            name: "agRatio",
            label: "A/G Ratio",
            unit: "",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 1.2, max: 2.2 },
            },
          },
        ],
      },
    ],
  },

  KFT: {
    testCode: "KFT",
    testName: "Kidney Function Test (KFT)",
    category: "Biochemistry",
    sampleType: "Blood",
    methodology: "Enzymatic/Colorimetric Method",
    sections: [
      {
        name: "KIDNEY PARAMETERS",
        fields: [
          {
            name: "bloodUreaNitrogen",
            label: "Blood Urea Nitrogen (BUN)",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 7, max: 20 },
            },
          },
          {
            name: "urea",
            label: "Urea",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 15, max: 45 },
            },
          },
          {
            name: "creatinine",
            label: "Creatinine",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              male: { min: 0.7, max: 1.3 },
              female: { min: 0.6, max: 1.1 },
            },
          },
          {
            name: "uricAcid",
            label: "Uric Acid",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              male: { min: 3.4, max: 7.0 },
              female: { min: 2.4, max: 6.0 },
            },
          },
          {
            name: "egfr",
            label: "eGFR (Estimated GFR)",
            unit: "mL/min/1.73m²",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 90, max: 999, text: "Normal: ≥90, Mild decrease: 60-89, Moderate: 30-59, Severe: 15-29, Kidney failure: <15" },
            },
          },
        ],
      },
      {
        name: "ELECTROLYTES",
        fields: [
          {
            name: "sodium",
            label: "Sodium (Na+)",
            unit: "mEq/L",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 136, max: 145 },
            },
          },
          {
            name: "potassium",
            label: "Potassium (K+)",
            unit: "mEq/L",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 3.5, max: 5.0 },
            },
          },
          {
            name: "chloride",
            label: "Chloride (Cl-)",
            unit: "mEq/L",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 98, max: 106 },
            },
          },
          {
            name: "calcium",
            label: "Calcium",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 8.5, max: 10.5 },
            },
          },
          {
            name: "phosphorus",
            label: "Phosphorus",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 2.5, max: 4.5 },
            },
          },
        ],
      },
    ],
  },

  THYROID: {
    testCode: "THYROID",
    testName: "Thyroid Profile",
    category: "Endocrinology",
    sampleType: "Blood",
    methodology: "Chemiluminescence Immunoassay (CLIA)",
    sections: [
      {
        name: "THYROID HORMONES",
        fields: [
          {
            name: "tsh",
            label: "TSH (Thyroid Stimulating Hormone)",
            unit: "µIU/mL",
            type: "number",
            decimalPlaces: 3,
            referenceRange: {
              general: { min: 0.4, max: 4.0 },
            },
          },
          {
            name: "t3Total",
            label: "T3 (Triiodothyronine) - Total",
            unit: "ng/dL",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 80, max: 200 },
            },
          },
          {
            name: "t4Total",
            label: "T4 (Thyroxine) - Total",
            unit: "µg/dL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 4.5, max: 12.5 },
            },
          },
          {
            name: "freeT3",
            label: "Free T3 (FT3)",
            unit: "pg/mL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 2.3, max: 4.2 },
            },
          },
          {
            name: "freeT4",
            label: "Free T4 (FT4)",
            unit: "ng/dL",
            type: "number",
            decimalPlaces: 2,
            referenceRange: {
              general: { min: 0.8, max: 1.8 },
            },
          },
        ],
      },
    ],
  },

  DIABETES: {
    testCode: "DIABETES",
    testName: "Diabetes Panel",
    category: "Biochemistry",
    sampleType: "Blood (Fasting/PP)",
    methodology: "Enzymatic Method / HPLC",
    sections: [
      {
        name: "GLUCOSE LEVELS",
        fields: [
          {
            name: "fastingGlucose",
            label: "Fasting Blood Glucose",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 70, max: 100, text: "Normal: 70-100, Pre-diabetic: 100-125, Diabetic: ≥126" },
            },
          },
          {
            name: "ppGlucose",
            label: "Post Prandial Blood Glucose",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 140, text: "Normal: <140, Pre-diabetic: 140-199, Diabetic: ≥200" },
            },
          },
          {
            name: "randomGlucose",
            label: "Random Blood Glucose",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 140 },
            },
          },
        ],
      },
      {
        name: "GLYCATED HEMOGLOBIN",
        fields: [
          {
            name: "hba1c",
            label: "HbA1c (Glycated Hemoglobin)",
            unit: "%",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 0, max: 5.7, text: "Normal: <5.7%, Pre-diabetic: 5.7-6.4%, Diabetic: ≥6.5%" },
            },
          },
          {
            name: "estimatedAvgGlucose",
            label: "Estimated Average Glucose (eAG)",
            unit: "mg/dL",
            type: "number",
            decimalPlaces: 0,
            referenceRange: {
              general: { min: 0, max: 117 },
            },
          },
        ],
      },
    ],
  },

  URINE: {
    testCode: "URINE",
    testName: "Complete Urine Examination",
    category: "Clinical Pathology",
    sampleType: "Urine (Midstream)",
    methodology: "Chemical Strip / Microscopy",
    sections: [
      {
        name: "PHYSICAL EXAMINATION",
        fields: [
          {
            name: "color",
            label: "Color",
            unit: "",
            type: "select",
            options: ["Pale Yellow", "Yellow", "Dark Yellow", "Amber", "Red", "Brown", "Cloudy"],
            referenceRange: {
              general: { text: "Pale Yellow to Yellow" },
            },
          },
          {
            name: "appearance",
            label: "Appearance",
            unit: "",
            type: "select",
            options: ["Clear", "Slightly Turbid", "Turbid", "Very Turbid"],
            referenceRange: {
              general: { text: "Clear" },
            },
          },
          {
            name: "specificGravity",
            label: "Specific Gravity",
            unit: "",
            type: "number",
            decimalPlaces: 3,
            referenceRange: {
              general: { min: 1.003, max: 1.030 },
            },
          },
          {
            name: "ph",
            label: "pH",
            unit: "",
            type: "number",
            decimalPlaces: 1,
            referenceRange: {
              general: { min: 4.5, max: 8.0 },
            },
          },
        ],
      },
      {
        name: "CHEMICAL EXAMINATION",
        fields: [
          {
            name: "protein",
            label: "Protein",
            unit: "",
            type: "select",
            options: ["Nil", "Trace", "+", "++", "+++"],
            referenceRange: {
              general: { text: "Nil" },
            },
          },
          {
            name: "glucose",
            label: "Glucose",
            unit: "",
            type: "select",
            options: ["Nil", "Trace", "+", "++", "+++"],
            referenceRange: {
              general: { text: "Nil" },
            },
          },
          {
            name: "ketones",
            label: "Ketones",
            unit: "",
            type: "select",
            options: ["Nil", "Trace", "+", "++", "+++"],
            referenceRange: {
              general: { text: "Nil" },
            },
          },
          {
            name: "blood",
            label: "Blood",
            unit: "",
            type: "select",
            options: ["Nil", "Trace", "+", "++", "+++"],
            referenceRange: {
              general: { text: "Nil" },
            },
          },
          {
            name: "bilirubin",
            label: "Bilirubin",
            unit: "",
            type: "select",
            options: ["Nil", "+", "++", "+++"],
            referenceRange: {
              general: { text: "Nil" },
            },
          },
          {
            name: "urobilinogen",
            label: "Urobilinogen",
            unit: "",
            type: "select",
            options: ["Normal", "Increased"],
            referenceRange: {
              general: { text: "Normal" },
            },
          },
          {
            name: "nitrite",
            label: "Nitrite",
            unit: "",
            type: "select",
            options: ["Negative", "Positive"],
            referenceRange: {
              general: { text: "Negative" },
            },
          },
          {
            name: "leukocyteEsterase",
            label: "Leukocyte Esterase",
            unit: "",
            type: "select",
            options: ["Negative", "Trace", "+", "++", "+++"],
            referenceRange: {
              general: { text: "Negative" },
            },
          },
        ],
      },
      {
        name: "MICROSCOPIC EXAMINATION",
        fields: [
          {
            name: "rbcMicro",
            label: "RBC",
            unit: "/HPF",
            type: "text",
            referenceRange: {
              general: { min: 0, max: 3, text: "0-3 /HPF" },
            },
          },
          {
            name: "wbcMicro",
            label: "WBC (Pus Cells)",
            unit: "/HPF",
            type: "text",
            referenceRange: {
              general: { min: 0, max: 5, text: "0-5 /HPF" },
            },
          },
          {
            name: "epithelialCells",
            label: "Epithelial Cells",
            unit: "/HPF",
            type: "text",
            referenceRange: {
              general: { text: "Few" },
            },
          },
          {
            name: "casts",
            label: "Casts",
            unit: "/LPF",
            type: "text",
            referenceRange: {
              general: { text: "Nil" },
            },
          },
          {
            name: "crystals",
            label: "Crystals",
            unit: "",
            type: "text",
            referenceRange: {
              general: { text: "Nil" },
            },
          },
          {
            name: "bacteria",
            label: "Bacteria",
            unit: "",
            type: "select",
            options: ["Nil", "Few", "Moderate", "Many"],
            referenceRange: {
              general: { text: "Nil" },
            },
          },
        ],
      },
    ],
  },
};

export function getTemplateByCode(testCode: string): ReportTemplate | undefined {
  const upperCode = testCode.toUpperCase();
  
  // Exact match
  if (REPORT_TEMPLATES[upperCode]) {
    return REPORT_TEMPLATES[upperCode];
  }
  
  // Match by testCode field
  for (const key in REPORT_TEMPLATES) {
    if (REPORT_TEMPLATES[key].testCode.toUpperCase() === upperCode) {
      return REPORT_TEMPLATES[key];
    }
  }
  
  // Flexible match - check if test code starts with template key
  // e.g., "CBC001" should match "CBC" template
  for (const key in REPORT_TEMPLATES) {
    const templateKey = key.toUpperCase();
    if (upperCode.startsWith(templateKey)) {
      return REPORT_TEMPLATES[key];
    }
  }
  
  // Flexible match - check if test code contains template key
  for (const key in REPORT_TEMPLATES) {
    const templateKey = key.toUpperCase();
    if (upperCode.includes(templateKey) || templateKey.includes(upperCode)) {
      return REPORT_TEMPLATES[key];
    }
  }
  
  return undefined;
}

export function calculateValueStatus(
  value: number,
  field: ReportField,
  gender: "male" | "female" | "other" = "male"
): "normal" | "low" | "high" | "borderline" {
  const ref = field.referenceRange;
  if (!ref) return "normal";

  let range = ref.general;
  if (gender === "male" && ref.male) range = ref.male;
  if (gender === "female" && ref.female) range = ref.female;

  if (!range || (range.min === undefined && range.max === undefined)) {
    return "normal";
  }

  const min = range.min ?? -Infinity;
  const max = range.max ?? Infinity;
  const borderlineThreshold = 0.1;

  if (value < min) {
    const borderlineLow = min - (max - min) * borderlineThreshold;
    if (value >= borderlineLow) return "borderline";
    return "low";
  }
  if (value > max) {
    const borderlineHigh = max + (max - min) * borderlineThreshold;
    if (value <= borderlineHigh) return "borderline";
    return "high";
  }
  return "normal";
}

export function getReferenceRangeText(
  field: ReportField,
  gender: "male" | "female" | "other" = "male"
): string {
  const ref = field.referenceRange;
  if (!ref) return "-";

  let range = ref.general;
  if (gender === "male" && ref.male) range = ref.male;
  if (gender === "female" && ref.female) range = ref.female;

  if (!range) return "-";

  if (range.text) return range.text;

  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min} - ${range.max}`;
  }
  if (range.min !== undefined) {
    return `≥${range.min}`;
  }
  if (range.max !== undefined) {
    return `≤${range.max}`;
  }

  return "-";
}
