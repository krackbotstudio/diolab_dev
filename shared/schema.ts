import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export chat models for OpenAI integration
export * from "./models/chat";

// Re-export auth models
export * from "./models/auth";

// ============ STAFF (Internal Users with Roles) ============
export const staff = pgTable("staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Links to auth users table
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  password: text("password"), // hashed password for staff login
  role: text("role").notNull().default("receptionist"), // owner, admin, manager, receptionist, lab_technician, pharmacist, doctor, accountant
  organizationId: varchar("organization_id"),
  branchId: varchar("branch_id"),
  moduleAccess: jsonb("module_access").default(sql`'["dialab"]'::jsonb`), // which modules this staff can access
  pagePermissions: jsonb("page_permissions"), // maps module to allowed page keys
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
  password: true,
});
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

// ============ ORGANIZATIONS ============
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  licenseNumber: text("license_number"),
  invoicePrefix: text("invoice_prefix").default("INV"),
  reportHeader: text("report_header"),
  reportFooter: text("report_footer"),
  showLogo: boolean("show_logo").default(true),
  showQRCode: boolean("show_qr_code").default(true),
  // Custom branding colors for reports and bills
  primaryColor: text("primary_color").default("#2DD4BF"),
  accentColor: text("accent_color").default("#0F766E"),
  headerColor: text("header_color").default("#0D9488"),
  // Payment configuration - user can upload their own UPI QR code
  upiQrCodeUrl: text("upi_qr_code_url"),
  upiId: text("upi_id"),
  ownerId: varchar("owner_id"),
  isOnboarded: boolean("is_onboarded").default(false),
  subscribedModules: jsonb("subscribed_modules").default(sql`'["dialab"]'::jsonb`),
  // Doclab module settings
  defaultConsultationFee: text("default_consultation_fee").default("500"),
  tokenPrefix: text("token_prefix").default("T"),
  // Medlab module settings
  pharmacyName: text("pharmacy_name"),
  defaultMarkupPercent: text("default_markup_percent").default("15"),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// ============ BRANCHES ============
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
});
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branches.$inferSelect;

// ============ PATIENTS ============
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  patientId: text("patient_id").notNull(), // Human-readable ID like PAT-001
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"), // male, female, other
  address: text("address"),
  bloodGroup: text("blood_group"),
  familyGroupId: varchar("family_group_id"),
  source: text("source").default("walk_in"), // online, phone, walk_in
  module: text("module").default("diagnostics"), // diagnostics, hospitals, both - which app module the patient belongs to
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

// ============ TESTS ============
export const tests = pgTable("tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  normalRange: text("normal_range"),
  unit: text("unit"),
  sampleType: text("sample_type"), // blood, urine, stool, etc.
  turnaroundTime: text("turnaround_time"), // e.g., "24 hours"
  reportTemplate: jsonb("report_template"), // Template structure with fields, types, reference ranges
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
  createdAt: true,
});
export type InsertTest = z.infer<typeof insertTestSchema>;
export type Test = typeof tests.$inferSelect;

// Update schema for PATCH tests - all fields optional, validated
export const updateTestSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().min(1, "Code is required").optional(),
  category: z.string().min(1, "Category is required").optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().min(0).optional(),
  normalRange: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  sampleType: z.string().nullable().optional(),
  turnaroundTime: z.string().nullable().optional(),
  isActive: z.union([z.boolean(), z.string()]).transform(val => val === true || val === "true").optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});
export type UpdateTest = z.infer<typeof updateTestSchema>;

// ============ TEST PACKAGES ============
export const testPackages = pgTable("test_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  testIds: jsonb("test_ids").notNull(), // Array of test IDs
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTestPackageSchema = createInsertSchema(testPackages).omit({
  id: true,
  createdAt: true,
});
export type InsertTestPackage = z.infer<typeof insertTestPackageSchema>;
export type TestPackage = typeof testPackages.$inferSelect;

// Update schema for PATCH - all fields optional, validated
export const updateTestPackageSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().nullable().optional(),
  testIds: z.array(z.string()).optional(),
  originalPrice: z.coerce.number().min(0).optional(),
  discountedPrice: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  isActive: z.union([z.boolean(), z.string()]).transform(val => val === true || val === "true").optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});
export type UpdateTestPackage = z.infer<typeof updateTestPackageSchema>;

// ============ BILLING ============
export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billNumber: text("bill_number").notNull().unique(),
  organizationId: varchar("organization_id").notNull(),
  branchId: varchar("branch_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  createdBy: varchar("created_by").notNull(),
  items: jsonb("items").notNull(), // Array of {testId, testName, price, quantity}
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  dueAmount: decimal("due_amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"), // cash, upi, card, online
  paymentStatus: text("payment_status").default("pending"), // pending, partial, paid
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  billNumber: true,
  createdAt: true,
});
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

// ============ SAMPLES & REPORTS ============
export const samples = pgTable("samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sampleId: text("sample_id").notNull(), // Human-readable ID
  organizationId: varchar("organization_id").notNull(),
  billId: varchar("bill_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  testId: varchar("test_id").notNull(),
  status: text("status").default("collected"), // collected, processing, completed, reported
  collectedBy: varchar("collected_by"),
  collectedAt: timestamp("collected_at").default(sql`CURRENT_TIMESTAMP`),
  processedBy: varchar("processed_by"),
  processedAt: timestamp("processed_at"),
  result: text("result"),
  resultValue: text("result_value"),
  resultData: jsonb("result_data"), // Structured results based on test template
  isAbnormal: boolean("is_abnormal").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertSampleSchema = createInsertSchema(samples).omit({
  id: true,
  sampleId: true,
  createdAt: true,
});
export type InsertSample = z.infer<typeof insertSampleSchema>;
export type Sample = typeof samples.$inferSelect;

// ============ TEST REPORTS (Per-Test Individual Reports) ============
export const testReports = pgTable("test_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportNumber: text("report_number").notNull().unique(),
  organizationId: varchar("organization_id").notNull(),
  branchId: varchar("branch_id"),
  billId: varchar("bill_id").notNull(),
  sampleId: varchar("sample_id").notNull(), // Links to specific sample
  patientId: varchar("patient_id").notNull(),
  testId: varchar("test_id").notNull(), // The specific test this report is for

  // Report content
  resultData: jsonb("result_data"), // Structured test results with values
  interpretation: text("interpretation"), // Short clinical interpretation
  aiSummary: text("ai_summary"), // AI-generated patient-friendly summary
  instrumentUsed: text("instrument_used"), // Lab equipment used
  methodology: text("methodology"), // Test methodology

  // Status workflow
  status: text("status").default("pending"), // pending, draft, finalized, revised

  // Signatures
  enteredBy: varchar("entered_by"), // Staff who entered values
  enteredAt: timestamp("entered_at"),
  verifiedBy: varchar("verified_by"), // Pathologist/doctor who verified
  verifiedAt: timestamp("verified_at"),

  // Finalization
  finalizedBy: varchar("finalized_by"),
  finalizedAt: timestamp("finalized_at"),
  isLocked: boolean("is_locked").default(false),

  // PDF
  pdfUrl: text("pdf_url"),

  // Versioning
  version: integer("version").default(1),
  parentReportId: varchar("parent_report_id"), // Links to previous version if revised
  revisionNotes: text("revision_notes"),

  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertTestReportSchema = createInsertSchema(testReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTestReport = z.infer<typeof insertTestReportSchema>;
export type TestReport = typeof testReports.$inferSelect;

// ============ REPORT SHARES (Tracking sharing history) ============
export const reportShares = pgTable("report_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull(), // Links to testReports
  organizationId: varchar("organization_id").notNull(),

  // Share details
  shareMethod: text("share_method").notNull(), // whatsapp, email, download, print
  recipientPhone: text("recipient_phone"),
  recipientEmail: text("recipient_email"),
  shareLink: text("share_link"), // Secure shareable link

  // Status tracking
  status: text("status").default("sent"), // sent, delivered, viewed, failed
  sentAt: timestamp("sent_at").default(sql`CURRENT_TIMESTAMP`),
  viewedAt: timestamp("viewed_at"),

  // Metadata
  sentBy: varchar("sent_by"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertReportShareSchema = createInsertSchema(reportShares).omit({
  id: true,
  createdAt: true,
});
export type InsertReportShare = z.infer<typeof insertReportShareSchema>;
export type ReportShare = typeof reportShares.$inferSelect;

// Legacy reports table - keeping for backward compatibility
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportNumber: text("report_number").notNull().unique(),
  organizationId: varchar("organization_id").notNull(),
  billId: varchar("bill_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  pdfUrl: text("pdf_url"),
  status: text("status").default("pending"), // pending, generated, delivered
  generatedBy: varchar("generated_by"),
  generatedAt: timestamp("generated_at"),
  deliveredAt: timestamp("delivered_at"),
  deliveryMethod: text("delivery_method"), // whatsapp, email, portal, print
  version: integer("version").default(1),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// ============ STORAGE LOCATIONS ============
export const storageLocations = pgTable("storage_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(), // e.g. "Cabinet A", "Cold Storage", "Rack 1"
  type: text("type").notNull().default("cabinet"), // cabinet, rack, refrigeration, drawer_unit
  sections: jsonb("sections").default(sql`'[]'::jsonb`), 
  // Array of sections/shelves inside: { id: "sec1", name: "Shelf 1", type: "shelf" | "drawer" | "box" }
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({
  id: true,
  createdAt: true,
});
export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;
export type StorageLocation = typeof storageLocations.$inferSelect;

export const updateStorageLocationSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  type: z.string().optional(),
  sections: z.any().optional(),
});
export type UpdateStorageLocation = z.infer<typeof updateStorageLocationSchema>;

// ============ INVENTORY ============
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  branchId: varchar("branch_id"),
  name: text("name").notNull(),
  category: text("category").notNull(), // reagents, consumables, equipment
  unit: text("unit").notNull(), // pieces, ml, kg, etc.
  currentStock: integer("current_stock").default(0),
  minStock: integer("min_stock").default(10),
  maxStock: integer("max_stock"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  supplier: text("supplier"),
  locationId: text("location_id"),
  sectionId: text("section_id"),
  lastRestocked: timestamp("last_restocked"),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// ============ ANALYTICS DATA ============
export const dailyStats = pgTable("daily_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  branchId: varchar("branch_id"),
  date: text("date").notNull(), // YYYY-MM-DD format
  totalBills: integer("total_bills").default(0),
  totalRevenue: decimal("total_revenue", { precision: 12, scale: 2 }).default("0"),
  totalPatients: integer("total_patients").default(0),
  totalTests: integer("total_tests").default(0),
  collectionAmount: decimal("collection_amount", { precision: 12, scale: 2 }).default("0"),
  dueAmount: decimal("due_amount", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
export type DailyStats = typeof dailyStats.$inferSelect;

// ============ ZOD VALIDATION SCHEMAS FOR FORMS ============
export const patientFormSchema = insertPatientSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required"),
});

export const testFormSchema = insertTestSchema.extend({
  name: z.string().min(1, "Test name is required"),
  code: z.string().min(1, "Test code is required"),
  category: z.string().min(1, "Category is required"),
  price: z.string().min(1, "Price is required"),
});

export const billFormSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  items: z.array(z.object({
    testId: z.string(),
    testName: z.string(),
    price: z.number(),
    quantity: z.number().default(1),
  })).min(1, "At least one test is required"),
  discountAmount: z.number().default(0),
  paymentMethod: z.string().optional(),
  paidAmount: z.number().default(0),
  notes: z.string().optional(),
});

export const organizationFormSchema = insertOrganizationSchema.extend({
  name: z.string().min(2, "Organization name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
});

// ============ ONLINE BOOKINGS ============
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingNumber: text("booking_number").notNull().unique(),
  organizationId: varchar("organization_id").notNull(),
  branchId: varchar("branch_id"),

  // Patient info (stored directly, not requiring patient record yet)
  patientName: text("patient_name").notNull(),
  patientAge: integer("patient_age"),
  patientGender: text("patient_gender"), // male, female, other
  patientPhone: text("patient_phone").notNull(),
  patientEmail: text("patient_email"),
  patientId: varchar("patient_id"),
  selectedTests: jsonb("selected_tests"), // Array of test IDs
  selectedPackages: jsonb("selected_packages"), // Array of package IDs
  symptoms: text("symptoms"),
  // Service type
  serviceType: text("service_type").notNull().default("lab_visit"), // lab_visit, home_collection

  // Scheduling
  preferredDate: text("preferred_date").notNull(), // YYYY-MM-DD
  preferredTimeSlot: text("preferred_time_slot"), // e.g., "09:00-10:00"

  // Home collection details
  collectionAddress: text("collection_address"),
  collectionAddressLine2: text("collection_address_line2"),
  collectionCity: text("collection_city"),
  collectionPincode: text("collection_pincode"),
  collectionNotes: text("collection_notes"),
  collectionAgentId: varchar("collection_agent_id"), // Assigned staff member

  // Pricing
  estimatedAmount: decimal("estimated_amount", { precision: 10, scale: 2 }),
  homeCollectionCharge: decimal("home_collection_charge", { precision: 10, scale: 2 }).default("0"),

  // Status tracking
  status: text("status").default("pending"), // pending, confirmed, sample_collected, cancelled, completed
  statusNotes: text("status_notes"),

  // Conversion tracking
  billId: varchar("bill_id"), // Created bill after conversion

  // Metadata
  source: text("source").default("online"), // online, phone, walk_in
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  bookingNumber: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Booking form validation schema for public form
export const publicBookingFormSchema = z.object({
  patientName: z.string().min(2, "Name is required"),
  patientAge: z.number().min(0).max(150).optional(),
  patientGender: z.enum(["male", "female", "other"]).optional(),
  patientPhone: z.string().min(10, "Valid phone number required"),
  patientEmail: z.string().email().optional().or(z.literal("")),
  selectedTests: z.array(z.string()).optional(),
  selectedPackages: z.array(z.string()).optional(),
  symptoms: z.string().optional(),
  serviceType: z.enum(["lab_visit", "home_collection"]),
  preferredDate: z.string().min(1, "Date is required"),
  preferredTimeSlot: z.string().optional(),
  collectionAddress: z.string().optional(),
  collectionAddressLine2: z.string().optional(),
  collectionCity: z.string().optional(),
  collectionPincode: z.string().optional(),
  collectionNotes: z.string().optional(),
}).refine(
  (data) => {
    if (data.serviceType === "home_collection") {
      return data.collectionAddress && data.collectionAddress.length > 0;
    }
    return true;
  },
  { message: "Address is required for home collection", path: ["collectionAddress"] }
).refine(
  (data) => {
    return (data.selectedTests && data.selectedTests.length > 0) ||
      (data.selectedPackages && data.selectedPackages.length > 0);
  },
  { message: "Please select at least one test or package", path: ["selectedTests"] }
);

// ============ ORGANIZATION BOOKING SETTINGS ============
export const organizationBookingSettings = pgTable("organization_booking_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().unique(),

  // Online booking settings
  bookingEnabled: boolean("booking_enabled").default(true),
  bookingPageTitle: text("booking_page_title"), // Custom title for booking page
  bookingPageDescription: text("booking_page_description"), // Custom description

  // Home collection settings
  homeCollectionEnabled: boolean("home_collection_enabled").default(false),
  homeCollectionCharge: decimal("home_collection_charge", { precision: 10, scale: 2 }).default("0"),
  homeCollectionMinOrder: decimal("home_collection_min_order", { precision: 10, scale: 2 }),
  availableTimeSlots: jsonb("available_time_slots"), // Array of {start: "09:00", end: "10:00", label: "Morning"}
  bookingLeadTime: integer("booking_lead_time").default(1),
  maxBookingsPerSlot: integer("max_bookings_per_slot").default(5),
  workingDays: jsonb("working_days").default(sql`'[1, 2, 3, 4, 5, 6]'::jsonb`),
  notifyOnBooking: boolean("notify_on_booking").default(true),
  notificationEmail: text("notification_email"),
  notificationPhone: text("notification_phone"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertOrganizationBookingSettingsSchema = createInsertSchema(organizationBookingSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganizationBookingSettings = z.infer<typeof insertOrganizationBookingSettingsSchema>;
export type OrganizationBookingSettings = typeof organizationBookingSettings.$inferSelect;

// ============ BOOKING PATIENTS (For returning patient lookup) ============
export const bookingPatients = pgTable("booking_patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),

  // Patient details
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  age: integer("age"),
  gender: text("gender"), // male, female, other

  // Address (for home collection)
  address: text("address"),
  addressLine2: text("address_line2"),
  city: text("city"),
  pincode: text("pincode"),

  // Linked to internal patient (if converted)
  patientId: varchar("patient_id"),

  // Stats
  totalBookings: integer("total_bookings").default(1),
  lastBookingDate: timestamp("last_booking_date"),

  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertBookingPatientSchema = createInsertSchema(bookingPatients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBookingPatient = z.infer<typeof insertBookingPatientSchema>;
export type BookingPatient = typeof bookingPatients.$inferSelect;

// ============ DEPARTMENTS (For OP POS) ============
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }).default("500"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// ============ DOCTORS (For OP POS) ============
export const doctors = pgTable("doctors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  departmentId: varchar("department_id"),
  staffId: varchar("staff_id"), // Links to staff table if staff member
  name: text("name").notNull(),
  specialization: text("specialization"),
  qualification: text("qualification"),
  phone: text("phone"),
  email: text("email"),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }).default("500"),
  isAvailable: boolean("is_available").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDoctorSchema = createInsertSchema(doctors).omit({
  id: true,
  createdAt: true,
});
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctors.$inferSelect;

// ============ OP VISITS (For OP POS) ============
export const opVisits = pgTable("op_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  tokenNumber: integer("token_number").notNull(),
  tokenDate: text("token_date").notNull(), // YYYY-MM-DD format for daily token reset
  patientId: varchar("patient_id").notNull(),
  doctorId: varchar("doctor_id"),
  departmentId: varchar("department_id"),
  visitType: text("visit_type").notNull().default("new"), // new, follow_up
  consultationType: text("consultation_type").notNull().default("in_person"), // in_person, video
  source: text("source").notNull().default("walk_in"), // walk_in, online
  status: text("status").notNull().default("booked"), // booked, waiting, in_consultation, completed, cancelled
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  notes: text("notes"),
  consultationFee: decimal("consultation_fee", { precision: 10, scale: 2 }),
  paymentMode: text("payment_mode"), // cash, upi, card, unpaid, online
  paymentStatus: text("payment_status").default("unpaid"), // paid, unpaid
  queuePosition: integer("queue_position"),
  scheduledTime: text("scheduled_time"), // Time slot for online bookings like "09:00"
  scheduledDate: text("scheduled_date"), // YYYY-MM-DD for video consultations
  meetingRoomId: varchar("meeting_room_id"), // Unique room ID for video calls
  paymentTransactionId: text("payment_transaction_id"), // Razorpay/Stripe transaction ID
  consultationStartedAt: timestamp("consultation_started_at"),
  consultationEndedAt: timestamp("consultation_ended_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertOpVisitSchema = createInsertSchema(opVisits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOpVisit = z.infer<typeof insertOpVisitSchema>;
export type OpVisit = typeof opVisits.$inferSelect;

// Update schema for PATCH op visits
export const updateOpVisitSchema = z.object({
  doctorId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  status: z.enum(["booked", "waiting", "in_consultation", "completed", "cancelled"]).optional(),
  symptoms: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  consultationFee: z.coerce.number().min(0).nullable().optional(),
  paymentMode: z.enum(["cash", "upi", "card", "unpaid", "online"]).nullable().optional(),
  paymentStatus: z.enum(["paid", "unpaid"]).optional(),
  paymentTransactionId: z.string().nullable().optional(),
  meetingRoomId: z.string().nullable().optional(),
  queuePosition: z.number().nullable().optional(),
});
export type UpdateOpVisit = z.infer<typeof updateOpVisitSchema>;

// ============ PRESCRIPTIONS (For OP POS) ============
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opVisitId: varchar("op_visit_id").notNull(),
  organizationId: varchar("organization_id").notNull(),
  medicineName: text("medicine_name").notNull(),
  dosage: text("dosage"), // e.g., "500mg"
  frequency: text("frequency"), // e.g., "1-0-1" or "Twice daily"
  duration: text("duration"), // e.g., "5 days"
  instructions: text("instructions"), // e.g., "After food"
  quantity: integer("quantity"),
  followUpDate: text("follow_up_date"),
  language: text("language"),
  translatedMedicineName: text("translated_medicine_name"),
  translatedDosage: text("translated_dosage"),
  translatedFrequency: text("translated_frequency"),
  translatedDuration: text("translated_duration"),
  translatedInstructions: text("translated_instructions"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
});
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

// ============ MEDLAB - SUPPLIERS ============
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  gstNumber: text("gst_number"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ============ MEDLAB - MEDICINES ============
export const medicines = pgTable("medicines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  brand: text("brand"),
  category: text("category"),
  form: text("form"),
  strength: text("strength"),
  unit: text("unit"),
  mrp: decimal("mrp", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  reorderLevel: integer("reorder_level").default(10),
  batchNumber: text("batch_number"),
  expiryDate: text("expiry_date"),
  supplierId: varchar("supplier_id"),
  barcode: text("barcode"),
  hsnCode: text("hsn_code"),
  manufacturer: text("manufacturer"),
  description: text("description"),
  shelfLocation: text("shelf_location"),
  locationId: text("location_id"),
  sectionId: text("section_id"),
  requiresPrescription: boolean("requires_prescription").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertMedicineSchema = createInsertSchema(medicines).omit({
  id: true,
  createdAt: true,
});
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicines.$inferSelect;

// ============ MEDLAB - MEDICINE SALES ============
export const medicineSales = pgTable("medicine_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  items: jsonb("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").default("cash"),
  paymentStatus: text("payment_status").default("paid"),
  prescriptionRef: text("prescription_ref"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertMedicineSaleSchema = createInsertSchema(medicineSales).omit({
  id: true,
  createdAt: true,
});
export type InsertMedicineSale = z.infer<typeof insertMedicineSaleSchema>;
export type MedicineSale = typeof medicineSales.$inferSelect;

// ============ HOSPITAL - WARDS ============
export const wards = pgTable("wards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("general"), // general, private, semi_private, icu, nicu, picu, maternity, surgical, emergency, isolation
  floor: text("floor"),
  totalBeds: integer("total_beds").notNull().default(0),
  description: text("description"),
  inCharge: text("in_charge"),
  contactExtension: text("contact_extension"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertWardSchema = createInsertSchema(wards).omit({
  id: true,
  createdAt: true,
});
export type InsertWard = z.infer<typeof insertWardSchema>;
export type Ward = typeof wards.$inferSelect;

// ============ HOSPITAL - BEDS ============
export const beds = pgTable("beds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  wardId: varchar("ward_id").notNull(),
  bedNumber: text("bed_number").notNull(),
  type: text("type").default("standard"), // standard, electric, icu, ventilator, cradle, bariatric
  status: text("status").notNull().default("available"), // available, occupied, maintenance, reserved, housekeeping
  currentPatientId: varchar("current_patient_id"),
  currentAdmissionId: varchar("current_admission_id"),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  features: text("features"), // oxygen, suction, monitor, etc.
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertBedSchema = createInsertSchema(beds).omit({
  id: true,
  createdAt: true,
});
export type InsertBed = z.infer<typeof insertBedSchema>;
export type Bed = typeof beds.$inferSelect;

// ============ HOSPITAL - ADMISSIONS (INPATIENT) ============
export const admissions = pgTable("admissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  admissionNumber: text("admission_number").notNull(),
  organizationId: varchar("organization_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  bedId: varchar("bed_id"),
  wardId: varchar("ward_id"),
  doctorId: varchar("doctor_id"),
  admissionType: text("admission_type").notNull().default("regular"), // regular, emergency, icu, daycare
  status: text("status").notNull().default("admitted"), // admitted, discharged, transferred, deceased, absconded
  admissionDate: timestamp("admission_date").default(sql`CURRENT_TIMESTAMP`),
  dischargeDate: timestamp("discharge_date"),
  diagnosis: text("diagnosis"),
  chiefComplaint: text("chief_complaint"),
  treatmentPlan: text("treatment_plan"),
  surgeryRequired: boolean("surgery_required").default(false),
  surgeryNotes: text("surgery_notes"),
  insuranceProvider: text("insurance_provider"),
  insurancePolicyNumber: text("insurance_policy_number"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  dischargeSummary: text("discharge_summary"),
  dischargeNotes: text("discharge_notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertAdmissionSchema = createInsertSchema(admissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdmission = z.infer<typeof insertAdmissionSchema>;
export type Admission = typeof admissions.$inferSelect;

// ============ HOSPITAL - ICU MONITORING ============
export const icuMonitoring = pgTable("icu_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  admissionId: varchar("admission_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  heartRate: integer("heart_rate"),
  systolicBp: integer("systolic_bp"),
  diastolicBp: integer("diastolic_bp"),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  spO2: integer("sp_o2"),
  respiratoryRate: integer("respiratory_rate"),
  bloodSugar: decimal("blood_sugar", { precision: 6, scale: 1 }),
  gcsScore: integer("gcs_score"),
  ventilatorMode: text("ventilator_mode"), // none, cpap, bipap, simv, ac, ps
  fiO2: integer("fi_o2"),
  peep: integer("peep"),
  tidalVolume: integer("tidal_volume"),
  oxygenFlow: decimal("oxygen_flow", { precision: 4, scale: 1 }),
  urineOutput: integer("urine_output"),
  intakeVolume: integer("intake_volume"),
  outputVolume: integer("output_volume"),
  painScore: integer("pain_score"),
  consciousness: text("consciousness"), // alert, verbal, pain, unresponsive
  pupilReaction: text("pupil_reaction"),
  ivFluids: text("iv_fluids"),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  recordedAt: timestamp("recorded_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertIcuMonitoringSchema = createInsertSchema(icuMonitoring).omit({
  id: true,
  recordedAt: true,
});
export type InsertIcuMonitoring = z.infer<typeof insertIcuMonitoringSchema>;
export type IcuMonitoring = typeof icuMonitoring.$inferSelect;

// ============ SUPER ADMINS (dlabCMS) ============
export const superAdmins = pgTable("super_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type SuperAdmin = typeof superAdmins.$inferSelect;

// ============ CMS ACTIVITY LOG ============
export const cmsActivityLog = pgTable("cms_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: varchar("target_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type CmsActivityLog = typeof cmsActivityLog.$inferSelect;

// ============ MEDLAB - PHARMACY ORDERS (Online) ============
export const pharmacyOrders = pgTable("pharmacy_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address"),
  items: jsonb("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPharmacyOrderSchema = createInsertSchema(pharmacyOrders).omit({
  id: true,
  createdAt: true,
});
export type InsertPharmacyOrder = z.infer<typeof insertPharmacyOrderSchema>;
export type PharmacyOrder = typeof pharmacyOrders.$inferSelect;

// ============ PATIENT VITALS ============
export const patientVitals = pgTable("patient_vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  patientId: varchar("patient_id").notNull(),
  opVisitId: varchar("op_visit_id"),
  height: decimal("height", { precision: 5, scale: 1 }),
  weight: decimal("weight", { precision: 5, scale: 1 }),
  bmi: decimal("bmi", { precision: 4, scale: 1 }),
  bloodPressure: text("blood_pressure"),
  pulse: integer("pulse"),
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  spO2: integer("sp_o2"),
  recordedBy: varchar("recorded_by"),
  recordedAt: timestamp("recorded_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertPatientVitalSchema = createInsertSchema(patientVitals).omit({
  id: true,
  createdAt: true,
});
export type InsertPatientVital = z.infer<typeof insertPatientVitalSchema>;
export type PatientVital = typeof patientVitals.$inferSelect;

// ============ DOCTOR REFERRALS ============
export const doctorReferrals = pgTable("doctor_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  referralNumber: text("referral_number").notNull(),
  opVisitId: varchar("op_visit_id"),
  patientId: varchar("patient_id").notNull(),
  referringDoctorId: varchar("referring_doctor_id").notNull(),
  referredDoctorId: varchar("referred_doctor_id").notNull(),
  reason: text("reason").notNull(),
  priority: text("priority").default("normal"),
  clinicalNotes: text("clinical_notes"),
  diagnosis: text("diagnosis"),
  status: text("status").default("pending"),
  completionNotes: text("completion_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertDoctorReferralSchema = createInsertSchema(doctorReferrals).omit({
  id: true,
  createdAt: true,
});
export type InsertDoctorReferral = z.infer<typeof insertDoctorReferralSchema>;
export type DoctorReferral = typeof doctorReferrals.$inferSelect;

// ============ MODULE REFERRALS (Cross-Module Patient Transfers) ============
export const moduleReferrals = pgTable("module_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  referralNumber: text("referral_number").notNull(),
  sourceModule: text("source_module").notNull(), // doclab, dialab, medlab
  targetModule: text("target_module").notNull(), // doclab, dialab, medlab
  patientId: varchar("patient_id"),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone"),
  opVisitId: varchar("op_visit_id"),
  doctorName: text("doctor_name"),
  referralType: text("referral_type").notNull(), // prescription, lab_test
  items: jsonb("items").notNull(), // prescription items or test items
  notes: text("notes"),
  status: text("status").default("sent"), // sent, received, in_progress, completed, cancelled
  completedAt: timestamp("completed_at"),
  linkedSaleId: varchar("linked_sale_id"),
  linkedTestId: varchar("linked_test_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertModuleReferralSchema = createInsertSchema(moduleReferrals).omit({
  id: true,
  createdAt: true,
});
export type InsertModuleReferral = z.infer<typeof insertModuleReferralSchema>;
export type ModuleReferral = typeof moduleReferrals.$inferSelect;
