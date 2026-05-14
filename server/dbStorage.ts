import { eq, and, ilike, or, sql, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  organizations,
  branches,
  patients,
  tests,
  testPackages,
  bills,
  samples,
  reports,
  testReports,
  reportShares,
  inventoryItems,
  bookings,
  organizationBookingSettings,
  bookingPatients,
  departments,
  doctors,
  opVisits,
  prescriptions,
  staff,
  wards,
  beds,
  admissions,
  icuMonitoring,
  patientVitals,
  doctorReferrals,
  storageLocations,
} from "@shared/schema";
import type {
  User, UpsertUser,
  Organization, InsertOrganization,
  Branch, InsertBranch,
  Patient, InsertPatient,
  Test, InsertTest,
  TestPackage, InsertTestPackage,
  Bill, InsertBill,
  Sample, InsertSample,
  Report, InsertReport,
  TestReport, InsertTestReport,
  ReportShare, InsertReportShare,
  InventoryItem, InsertInventoryItem,
  Booking, InsertBooking,
  OrganizationBookingSettings, InsertOrganizationBookingSettings,
  BookingPatient, InsertBookingPatient,
  Department, InsertDepartment,
  Doctor, InsertDoctor,
  OpVisit, InsertOpVisit,
  Prescription, InsertPrescription,
  Staff, InsertStaff,
  Ward, InsertWard,
  Bed, InsertBed,
  Admission, InsertAdmission,
  IcuMonitoring, InsertIcuMonitoring,
  PatientVital, InsertPatientVital,
  DoctorReferral, InsertDoctorReferral,
  StorageLocation, InsertStorageLocation, UpdateStorageLocation,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // ============ USERS ============
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      id: userData.id,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      authProvider: userData.authProvider,
      googleId: userData.googleId,
      isEmailVerified: userData.isEmailVerified,
    }).onConflictDoUpdate({
      target: users.id,
      set: {
        // Only update non-null values to avoid overwriting existing data
        ...(userData.email !== undefined && { email: userData.email }),
        ...(userData.phone !== undefined && { phone: userData.phone }),
        ...(userData.password !== undefined && { password: userData.password }),
        ...(userData.firstName !== undefined && { firstName: userData.firstName }),
        ...(userData.lastName !== undefined && { lastName: userData.lastName }),
        ...(userData.profileImageUrl !== undefined && { profileImageUrl: userData.profileImageUrl }),
        ...(userData.authProvider !== undefined && { authProvider: userData.authProvider }),
        ...(userData.googleId !== undefined && { googleId: userData.googleId }),
        ...(userData.isEmailVerified !== undefined && { isEmailVerified: userData.isEmailVerified }),
        updatedAt: new Date(),
      }
    }).returning();
    return user;
  }

  // ============ ORGANIZATIONS ============
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return org;
  }

  async getOrganizationByOwnerId(ownerId: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId)).limit(1);
    return org;
  }

  async createOrganization(orgData: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values({
      name: orgData.name,
      logo: orgData.logo ?? null,
      address: orgData.address ?? null,
      city: orgData.city ?? null,
      state: orgData.state ?? null,
      pincode: orgData.pincode ?? null,
      phone: orgData.phone ?? null,
      email: orgData.email ?? null,
      website: orgData.website ?? null,
      gstNumber: orgData.gstNumber ?? null,
      panNumber: orgData.panNumber ?? null,
      licenseNumber: orgData.licenseNumber ?? null,
      invoicePrefix: orgData.invoicePrefix ?? "INV",
      reportHeader: orgData.reportHeader ?? null,
      reportFooter: orgData.reportFooter ?? null,
      showLogo: orgData.showLogo ?? true,
      showQRCode: orgData.showQRCode ?? true,
      ownerId: orgData.ownerId,
      isOnboarded: orgData.isOnboarded ?? false,
      primaryColor: orgData.primaryColor ?? null,
      accentColor: orgData.accentColor ?? null,
      headerColor: orgData.headerColor ?? null,
      subscribedModules: orgData.subscribedModules ?? ["dialab"],
      defaultConsultationFee: orgData.defaultConsultationFee ?? "500",
      tokenPrefix: orgData.tokenPrefix ?? "T",
      pharmacyName: orgData.pharmacyName ?? null,
      defaultMarkupPercent: orgData.defaultMarkupPercent ?? "15",
      lowStockThreshold: orgData.lowStockThreshold ?? 10,
    }).returning();
    return org;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [org] = await db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
    return org;
  }

  // ============ BRANCHES ============
  async getBranches(organizationId: string): Promise<Branch[]> {
    return db.select().from(branches).where(eq(branches.organizationId, organizationId));
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
    return branch;
  }

  async createBranch(branchData: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(branchData).returning();
    return branch;
  }

  // ============ PATIENTS ============
  async getPatients(organizationId: string): Promise<Patient[]> {
    return db.select().from(patients).where(eq(patients.organizationId, organizationId));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return patient;
  }

  async getPatientByPhone(phone: string, organizationId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(
      and(eq(patients.phone, phone), eq(patients.organizationId, organizationId))
    ).limit(1);
    return patient;
  }

  async createPatient(patientData: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(patientData).returning();
    return patient;
  }

  async updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const [patient] = await db.update(patients).set(data).where(eq(patients.id, id)).returning();
    return patient;
  }

  async searchPatients(query: string, organizationId: string): Promise<Patient[]> {
    return db.select().from(patients).where(
      and(
        eq(patients.organizationId, organizationId),
        or(
          ilike(patients.firstName, `%${query}%`),
          ilike(patients.lastName, `%${query}%`),
          ilike(patients.phone, `%${query}%`),
          ilike(patients.email, `%${query}%`)
        )
      )
    );
  }

  // ============ TESTS ============
  async getTests(organizationId: string): Promise<Test[]> {
    return db.select().from(tests).where(eq(tests.organizationId, organizationId));
  }

  async getTest(id: string): Promise<Test | undefined> {
    const [test] = await db.select().from(tests).where(eq(tests.id, id)).limit(1);
    return test;
  }

  async createTest(testData: InsertTest): Promise<Test> {
    const [test] = await db.insert(tests).values(testData).returning();
    return test;
  }

  async updateTest(id: string, data: Partial<InsertTest>): Promise<Test | undefined> {
    const [test] = await db.update(tests).set(data).where(eq(tests.id, id)).returning();
    return test;
  }

  async deleteTest(id: string): Promise<void> {
    await db.delete(tests).where(eq(tests.id, id));
  }

  // ============ TEST PACKAGES ============
  async getPackages(organizationId: string): Promise<TestPackage[]> {
    return db.select().from(testPackages).where(eq(testPackages.organizationId, organizationId));
  }

  async getPackage(id: string): Promise<TestPackage | undefined> {
    const [pkg] = await db.select().from(testPackages).where(eq(testPackages.id, id)).limit(1);
    return pkg;
  }

  async createPackage(pkgData: InsertTestPackage): Promise<TestPackage> {
    const [pkg] = await db.insert(testPackages).values(pkgData).returning();
    return pkg;
  }

  async updatePackage(id: string, data: Partial<InsertTestPackage>): Promise<TestPackage | undefined> {
    const [pkg] = await db.update(testPackages).set(data).where(eq(testPackages.id, id)).returning();
    return pkg;
  }

  async deletePackage(id: string): Promise<void> {
    await db.delete(testPackages).where(eq(testPackages.id, id));
  }

  // ============ BILLS ============
  async getBills(organizationId: string): Promise<Bill[]> {
    return db.select().from(bills).where(eq(bills.organizationId, organizationId)).orderBy(desc(bills.createdAt));
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    return bill;
  }

  async createBill(billData: InsertBill): Promise<Bill> {
    const billNumber = `BILL-${Date.now()}`;
    const [bill] = await db.insert(bills).values({ ...billData, billNumber }).returning();
    return bill;
  }

  async createBillWithNumber(billData: InsertBill & { billNumber: string }): Promise<Bill> {
    const [bill] = await db.insert(bills).values(billData).returning();
    return bill;
  }

  async updateBill(id: string, data: Partial<InsertBill>): Promise<Bill | undefined> {
    const [bill] = await db.update(bills).set(data).where(eq(bills.id, id)).returning();
    return bill;
  }

  // ============ SAMPLES ============
  async getSamples(organizationId: string): Promise<Sample[]> {
    return db.select().from(samples).where(eq(samples.organizationId, organizationId));
  }

  async getSample(id: string): Promise<Sample | undefined> {
    const [sample] = await db.select().from(samples).where(eq(samples.id, id)).limit(1);
    return sample;
  }

  async createSample(sampleData: InsertSample): Promise<Sample> {
    const sampleId = `SPL-${Date.now()}`;
    const [sample] = await db.insert(samples).values({ ...sampleData, sampleId }).returning();
    return sample;
  }

  async createSampleWithId(sampleData: InsertSample & { sampleId: string }): Promise<Sample> {
    const [sample] = await db.insert(samples).values(sampleData).returning();
    return sample;
  }

  async updateSampleStatus(id: string, status: string): Promise<Sample | undefined> {
    const [sample] = await db.update(samples).set({ status }).where(eq(samples.id, id)).returning();
    return sample;
  }

  async updateSampleResult(id: string, data: { resultValue: string; isAbnormal: boolean; notes?: string; resultData?: Record<string, string>; status: string; processedAt: Date }): Promise<Sample | undefined> {
    const [sample] = await db.update(samples).set(data).where(eq(samples.id, id)).returning();
    return sample;
  }

  // ============ REPORTS (legacy) ============
  async getReports(organizationId: string): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.organizationId, organizationId));
  }

  async getReport(id: string): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    return report;
  }

  async createReport(reportData: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(reportData).returning();
    return report;
  }

  async updateReport(id: string, data: Partial<InsertReport>): Promise<Report | undefined> {
    const [report] = await db.update(reports).set(data).where(eq(reports.id, id)).returning();
    return report;
  }

  // ============ TEST REPORTS ============
  async getTestReports(organizationId: string): Promise<TestReport[]> {
    return db.select().from(testReports).where(eq(testReports.organizationId, organizationId));
  }

  async getTestReportsBySample(sampleId: string): Promise<TestReport[]> {
    return db.select().from(testReports).where(eq(testReports.sampleId, sampleId));
  }

  async getTestReportsByPatient(patientId: string): Promise<TestReport[]> {
    return db.select().from(testReports).where(eq(testReports.patientId, patientId));
  }

  async getTestReportsByBill(billId: string): Promise<TestReport[]> {
    return db.select().from(testReports).where(eq(testReports.billId, billId));
  }

  async getTestReport(id: string): Promise<TestReport | undefined> {
    const [report] = await db.select().from(testReports).where(eq(testReports.id, id)).limit(1);
    return report;
  }

  async getTestReportByReportNumber(reportNumber: string): Promise<TestReport | undefined> {
    const [report] = await db.select().from(testReports).where(eq(testReports.reportNumber, reportNumber)).limit(1);
    return report;
  }

  async createTestReport(reportData: InsertTestReport): Promise<TestReport> {
    const reportNumber = `RPT-${Date.now()}`;
    const [report] = await db.insert(testReports).values({ ...reportData, reportNumber, status: "draft", isLocked: false }).returning();
    return report;
  }

  async createTestReportWithNumber(reportData: InsertTestReport & { reportNumber: string; status?: string; isLocked?: boolean }): Promise<TestReport> {
    const [report] = await db.insert(testReports).values({
      ...reportData,
      status: reportData.status ?? "draft",
      isLocked: reportData.isLocked ?? false,
    }).returning();
    return report;
  }

  async updateTestReport(id: string, data: Partial<InsertTestReport>): Promise<TestReport | undefined> {
    const [report] = await db.update(testReports).set(data).where(eq(testReports.id, id)).returning();
    return report;
  }

  async finalizeTestReport(id: string, finalizedBy: string): Promise<TestReport | undefined> {
    const [report] = await db.update(testReports).set({
      status: "finalized",
      isLocked: true,
      finalizedBy,
      finalizedAt: new Date(),
    }).where(eq(testReports.id, id)).returning();
    return report;
  }

  async createReportRevision(parentReportId: string, revisionNotes: string): Promise<TestReport | undefined> {
    const parentReport = await this.getTestReport(parentReportId);
    if (!parentReport) return undefined;

    // Generate a unique revision suffix based on timestamp
    const revisionSuffix = Date.now().toString(36).slice(-4).toUpperCase();
    const reportNumber = `${parentReport.reportNumber}-R${revisionSuffix}`;
    
    const [report] = await db.insert(testReports).values({
      reportNumber,
      organizationId: parentReport.organizationId,
      branchId: parentReport.branchId,
      billId: parentReport.billId,
      sampleId: parentReport.sampleId,
      patientId: parentReport.patientId,
      testId: parentReport.testId,
      resultData: parentReport.resultData,
      interpretation: parentReport.interpretation,
      aiSummary: parentReport.aiSummary,
      instrumentUsed: parentReport.instrumentUsed,
      methodology: parentReport.methodology,
      parentReportId,
      revisionNotes,
      status: "draft",
      isLocked: false,
    }).returning();
    return report;
  }

  // ============ REPORT SHARES ============
  async getReportShares(reportId: string): Promise<ReportShare[]> {
    return db.select().from(reportShares).where(eq(reportShares.reportId, reportId));
  }

  async createReportShare(shareData: InsertReportShare): Promise<ReportShare> {
    const [share] = await db.insert(reportShares).values(shareData).returning();
    return share;
  }

  async updateReportShareStatus(id: string, status: string, viewedAt?: Date): Promise<ReportShare | undefined> {
    const [share] = await db.update(reportShares).set({ status, viewedAt }).where(eq(reportShares.id, id)).returning();
    return share;
  }

  // ============ INVENTORY ============
  async getInventoryItems(organizationId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.organizationId, organizationId));
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    return item;
  }

  async createInventoryItem(itemData: InsertInventoryItem): Promise<InventoryItem> {
    const [item] = await db.insert(inventoryItems).values(itemData).returning();
    return item;
  }

  async updateInventoryStock(id: string, quantity: number): Promise<InventoryItem | undefined> {
    const [item] = await db.update(inventoryItems).set({ currentStock: quantity }).where(eq(inventoryItems.id, id)).returning();
    return item;
  }

  // ============ BOOKINGS ============
  async getBookings(organizationId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.organizationId, organizationId)).orderBy(desc(bookings.createdAt));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return booking;
  }

  async createBooking(bookingData: InsertBooking & { bookingNumber: string }): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(bookingData).returning();
    return booking;
  }

  async updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async updateBookingStatus(id: string, status: string, statusNotes?: string): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set({ status, statusNotes }).where(eq(bookings.id, id)).returning();
    return booking;
  }

  // ============ ORGANIZATION BOOKING SETTINGS ============
  async getOrganizationBookingSettings(organizationId: string): Promise<OrganizationBookingSettings | undefined> {
    const [settings] = await db.select().from(organizationBookingSettings).where(eq(organizationBookingSettings.organizationId, organizationId)).limit(1);
    return settings;
  }

  async createOrganizationBookingSettings(settingsData: InsertOrganizationBookingSettings): Promise<OrganizationBookingSettings> {
    const [settings] = await db.insert(organizationBookingSettings).values(settingsData).returning();
    return settings;
  }

  async updateOrganizationBookingSettings(organizationId: string, data: Partial<InsertOrganizationBookingSettings>): Promise<OrganizationBookingSettings | undefined> {
    const [settings] = await db.update(organizationBookingSettings).set({ ...data, updatedAt: new Date() }).where(eq(organizationBookingSettings.organizationId, organizationId)).returning();
    return settings;
  }

  // ============ BOOKING PATIENTS ============
  async getBookingPatientByPhone(organizationId: string, phone: string): Promise<BookingPatient | undefined> {
    const [patient] = await db.select().from(bookingPatients).where(
      and(eq(bookingPatients.organizationId, organizationId), eq(bookingPatients.phone, phone))
    ).limit(1);
    return patient;
  }

  async createOrUpdateBookingPatient(patientData: InsertBookingPatient): Promise<BookingPatient> {
    const existing = await this.getBookingPatientByPhone(patientData.organizationId, patientData.phone);
    if (existing) {
      const [patient] = await db.update(bookingPatients).set({
        name: patientData.name,
        email: patientData.email,
        gender: patientData.gender,
        age: patientData.age,
        address: patientData.address,
        lastBookingDate: new Date(),
      }).where(eq(bookingPatients.id, existing.id)).returning();
      return patient;
    }
    const [patient] = await db.insert(bookingPatients).values({ ...patientData, lastBookingDate: new Date() }).returning();
    return patient;
  }

  // ============ DEPARTMENTS (OP POS) ============
  async getDepartments(organizationId: string): Promise<Department[]> {
    return db.select().from(departments).where(eq(departments.organizationId, organizationId));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [dept] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return dept;
  }

  async createDepartment(deptData: InsertDepartment): Promise<Department> {
    const [dept] = await db.insert(departments).values(deptData).returning();
    return dept;
  }

  async updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [dept] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return dept;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    const [deleted] = await db.delete(departments).where(eq(departments.id, id)).returning();
    return !!deleted;
  }

  // ============ DOCTORS (OP POS) ============
  async getDoctors(organizationId: string): Promise<Doctor[]> {
    return db.select().from(doctors).where(eq(doctors.organizationId, organizationId));
  }

  async getDoctor(id: string): Promise<Doctor | undefined> {
    const [doc] = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1);
    return doc;
  }

  async getDoctorsByDepartment(departmentId: string): Promise<Doctor[]> {
    return db.select().from(doctors).where(eq(doctors.departmentId, departmentId));
  }

  async createDoctor(doctorData: InsertDoctor): Promise<Doctor> {
    const [doc] = await db.insert(doctors).values(doctorData).returning();
    return doc;
  }

  async updateDoctor(id: string, data: Partial<InsertDoctor>): Promise<Doctor | undefined> {
    const [doc] = await db.update(doctors).set(data).where(eq(doctors.id, id)).returning();
    return doc;
  }

  async deleteDoctor(id: string): Promise<boolean> {
    const [deleted] = await db.delete(doctors).where(eq(doctors.id, id)).returning();
    return !!deleted;
  }

  // ============ OP VISITS (OP POS) ============
  async getOpVisits(organizationId: string): Promise<OpVisit[]> {
    return db.select().from(opVisits).where(eq(opVisits.organizationId, organizationId)).orderBy(desc(opVisits.createdAt));
  }

  async getOpVisitsByDate(organizationId: string, date: string): Promise<OpVisit[]> {
    return db.select().from(opVisits).where(
      and(eq(opVisits.organizationId, organizationId), eq(opVisits.tokenDate, date))
    ).orderBy(opVisits.tokenNumber);
  }

  async getOpVisit(id: string): Promise<OpVisit | undefined> {
    const [visit] = await db.select().from(opVisits).where(eq(opVisits.id, id)).limit(1);
    return visit;
  }

  async getNextTokenNumber(organizationId: string, date: string): Promise<number> {
    const result = await db.select({ maxToken: sql<number>`COALESCE(MAX(${opVisits.tokenNumber}), 0)` })
      .from(opVisits)
      .where(and(eq(opVisits.organizationId, organizationId), eq(opVisits.tokenDate, date)));
    return (result[0]?.maxToken || 0) + 1;
  }

  async getOpVisitByMeetingRoomId(roomId: string): Promise<OpVisit | undefined> {
    const [visit] = await db.select().from(opVisits).where(eq(opVisits.meetingRoomId, roomId)).limit(1);
    return visit;
  }

  async getVideoConsultations(organizationId: string): Promise<OpVisit[]> {
    return db.select().from(opVisits).where(
      and(eq(opVisits.organizationId, organizationId), eq(opVisits.consultationType, "video"))
    ).orderBy(desc(opVisits.createdAt));
  }

  async createOpVisit(visitData: InsertOpVisit): Promise<OpVisit> {
    const [visit] = await db.insert(opVisits).values(visitData).returning();
    return visit;
  }

  async updateOpVisit(id: string, data: Partial<InsertOpVisit>): Promise<OpVisit | undefined> {
    const [visit] = await db.update(opVisits).set({ ...data, updatedAt: new Date() }).where(eq(opVisits.id, id)).returning();
    return visit;
  }

  // ============ PRESCRIPTIONS (OP POS) ============
  async getPrescriptions(opVisitId: string): Promise<Prescription[]> {
    return db.select().from(prescriptions).where(eq(prescriptions.opVisitId, opVisitId));
  }

  async createPrescription(prescriptionData: InsertPrescription): Promise<Prescription> {
    const [prescription] = await db.insert(prescriptions).values(prescriptionData).returning();
    return prescription;
  }

  async deletePrescription(id: string): Promise<void> {
    await db.delete(prescriptions).where(eq(prescriptions.id, id));
  }

  // ============ PRESCRIPTION UPDATES ============
  async updatePrescription(id: string, data: Partial<InsertPrescription>): Promise<Prescription | undefined> {
    const [result] = await db.update(prescriptions).set(data).where(eq(prescriptions.id, id)).returning();
    return result;
  }

  async getPrescriptionsByPatient(patientId: string, organizationId: string): Promise<Prescription[]> {
    const visits = await db.select().from(opVisits).where(
      and(eq(opVisits.patientId, patientId), eq(opVisits.organizationId, organizationId))
    );
    if (visits.length === 0) return [];
    const visitIds = visits.map(v => v.id);
    const allPrescriptions: Prescription[] = [];
    for (const visitId of visitIds) {
      const presc = await db.select().from(prescriptions).where(eq(prescriptions.opVisitId, visitId));
      allPrescriptions.push(...presc);
    }
    return allPrescriptions;
  }

  // ============ PATIENT VITALS ============
  async getPatientVitals(patientId: string, organizationId: string): Promise<PatientVital[]> {
    return db.select().from(patientVitals)
      .where(and(eq(patientVitals.patientId, patientId), eq(patientVitals.organizationId, organizationId)))
      .orderBy(desc(patientVitals.recordedAt));
  }

  async getPatientVitalsByVisit(opVisitId: string): Promise<PatientVital | undefined> {
    const [vital] = await db.select().from(patientVitals).where(eq(patientVitals.opVisitId, opVisitId)).limit(1);
    return vital;
  }

  async createPatientVital(vitalData: InsertPatientVital): Promise<PatientVital> {
    const [vital] = await db.insert(patientVitals).values(vitalData).returning();
    return vital;
  }

  // ============ DOCTOR REFERRALS ============
  async getDoctorReferrals(organizationId: string): Promise<DoctorReferral[]> {
    return db.select().from(doctorReferrals)
      .where(eq(doctorReferrals.organizationId, organizationId))
      .orderBy(desc(doctorReferrals.createdAt));
  }

  async getDoctorReferralsByDoctor(doctorId: string): Promise<DoctorReferral[]> {
    return db.select().from(doctorReferrals)
      .where(eq(doctorReferrals.referringDoctorId, doctorId))
      .orderBy(desc(doctorReferrals.createdAt));
  }

  async getIncomingReferrals(doctorId: string): Promise<DoctorReferral[]> {
    return db.select().from(doctorReferrals)
      .where(eq(doctorReferrals.referredDoctorId, doctorId))
      .orderBy(desc(doctorReferrals.createdAt));
  }

  async getDoctorReferral(id: string): Promise<DoctorReferral | undefined> {
    const [referral] = await db.select().from(doctorReferrals).where(eq(doctorReferrals.id, id)).limit(1);
    return referral;
  }

  async createDoctorReferral(referralData: InsertDoctorReferral): Promise<DoctorReferral> {
    const [referral] = await db.insert(doctorReferrals).values(referralData).returning();
    return referral;
  }

  async updateDoctorReferral(id: string, data: Partial<InsertDoctorReferral>): Promise<DoctorReferral | undefined> {
    const [referral] = await db.update(doctorReferrals).set(data).where(eq(doctorReferrals.id, id)).returning();
    return referral;
  }

  // ============ STAFF ============
  async getStaff(organizationId: string): Promise<Staff[]> {
    return db.select().from(staff).where(eq(staff.organizationId, organizationId));
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    const [member] = await db.select().from(staff).where(eq(staff.id, id)).limit(1);
    return member;
  }

  async getStaffByUsername(username: string): Promise<Staff | undefined> {
    const [member] = await db.select().from(staff).where(eq(staff.username, username)).limit(1);
    return member;
  }

  async getStaffByUserId(userId: string, organizationId: string): Promise<Staff | undefined> {
    const [member] = await db.select().from(staff).where(
      and(eq(staff.userId, userId), eq(staff.organizationId, organizationId))
    ).limit(1);
    return member;
  }

  async createStaff(staffData: InsertStaff): Promise<Staff> {
    const [member] = await db.insert(staff).values(staffData).returning();
    return member;
  }

  async updateStaff(id: string, data: Partial<InsertStaff>): Promise<Staff | undefined> {
    const [member] = await db.update(staff).set(data).where(eq(staff.id, id)).returning();
    return member;
  }

  async deleteStaff(id: string): Promise<boolean> {
    const [deleted] = await db.update(staff).set({ isActive: false }).where(eq(staff.id, id)).returning();
    return !!deleted;
  }

  // ============ WARDS ============
  async getWards(organizationId: string): Promise<Ward[]> {
    return db.select().from(wards).where(eq(wards.organizationId, organizationId)).orderBy(wards.name);
  }

  async getWard(id: string): Promise<Ward | undefined> {
    const [ward] = await db.select().from(wards).where(eq(wards.id, id)).limit(1);
    return ward;
  }

  async createWard(ward: InsertWard): Promise<Ward> {
    const [created] = await db.insert(wards).values(ward).returning();
    return created;
  }

  async updateWard(id: string, data: Partial<InsertWard>): Promise<Ward | undefined> {
    const [updated] = await db.update(wards).set(data).where(eq(wards.id, id)).returning();
    return updated;
  }

  async deleteWard(id: string): Promise<boolean> {
    const [deleted] = await db.update(wards).set({ isActive: false }).where(eq(wards.id, id)).returning();
    return !!deleted;
  }

  // ============ BEDS ============
  async getBeds(organizationId: string): Promise<Bed[]> {
    return db.select().from(beds).where(eq(beds.organizationId, organizationId)).orderBy(beds.bedNumber);
  }

  async getBedsByWard(wardId: string): Promise<Bed[]> {
    return db.select().from(beds).where(eq(beds.wardId, wardId)).orderBy(beds.bedNumber);
  }

  async getBed(id: string): Promise<Bed | undefined> {
    const [bed] = await db.select().from(beds).where(eq(beds.id, id)).limit(1);
    return bed;
  }

  async createBed(bed: InsertBed): Promise<Bed> {
    const [created] = await db.insert(beds).values(bed).returning();
    return created;
  }

  async updateBed(id: string, data: Partial<InsertBed>): Promise<Bed | undefined> {
    const [updated] = await db.update(beds).set(data).where(eq(beds.id, id)).returning();
    return updated;
  }

  async deleteBed(id: string): Promise<boolean> {
    const [deleted] = await db.update(beds).set({ isActive: false }).where(eq(beds.id, id)).returning();
    return !!deleted;
  }

  // ============ ADMISSIONS ============
  async getAdmissions(organizationId: string): Promise<Admission[]> {
    return db.select().from(admissions).where(eq(admissions.organizationId, organizationId)).orderBy(desc(admissions.admissionDate));
  }

  async getActiveAdmissions(organizationId: string): Promise<Admission[]> {
    return db.select().from(admissions).where(
      and(eq(admissions.organizationId, organizationId), eq(admissions.status, "admitted"))
    ).orderBy(desc(admissions.admissionDate));
  }

  async getAdmission(id: string): Promise<Admission | undefined> {
    const [admission] = await db.select().from(admissions).where(eq(admissions.id, id)).limit(1);
    return admission;
  }

  async createAdmission(admission: InsertAdmission): Promise<Admission> {
    const [created] = await db.insert(admissions).values(admission).returning();
    return created;
  }

  async updateAdmission(id: string, data: Partial<InsertAdmission>): Promise<Admission | undefined> {
    const [updated] = await db.update(admissions).set(data).where(eq(admissions.id, id)).returning();
    return updated;
  }

  async getNextAdmissionNumber(organizationId: string): Promise<string> {
    const [result] = await db.select({ maxId: sql<number>`COUNT(*)` }).from(admissions).where(eq(admissions.organizationId, organizationId));
    const count = (result?.maxId || 0) + 1;
    return `ADM-${String(count).padStart(4, "0")}`;
  }

  // ============ ICU MONITORING ============
  async getIcuRecords(admissionId: string): Promise<IcuMonitoring[]> {
    return db.select().from(icuMonitoring).where(eq(icuMonitoring.admissionId, admissionId)).orderBy(desc(icuMonitoring.recordedAt));
  }

  async getLatestIcuRecord(admissionId: string): Promise<IcuMonitoring | undefined> {
    const [record] = await db.select().from(icuMonitoring).where(eq(icuMonitoring.admissionId, admissionId)).orderBy(desc(icuMonitoring.recordedAt)).limit(1);
    return record;
  }

  async createIcuRecord(record: InsertIcuMonitoring): Promise<IcuMonitoring> {
    const [created] = await db.insert(icuMonitoring).values(record).returning();
    return created;
  }

  async getIcuPatients(organizationId: string): Promise<Admission[]> {
    return db.select().from(admissions)
      .leftJoin(wards, eq(admissions.wardId, wards.id))
      .where(
        and(
          eq(admissions.organizationId, organizationId),
          eq(admissions.status, "admitted"),
          ilike(wards.name, "%ICU%")
        )
      )
      .orderBy(desc(admissions.admissionDate))
      .then(rows => rows.map(r => r.admissions as Admission));
  }
  
  // ============ STORAGE LOCATIONS ============
  async getStorageLocations(organizationId: string): Promise<StorageLocation[]> {
    return db.select().from(storageLocations).where(eq(storageLocations.organizationId, organizationId));
  }

  async getStorageLocation(id: string): Promise<StorageLocation | undefined> {
    const [location] = await db.select().from(storageLocations).where(eq(storageLocations.id, id)).limit(1);
    return location;
  }

  async createStorageLocation(location: InsertStorageLocation): Promise<StorageLocation> {
    const [created] = await db.insert(storageLocations).values(location).returning();
    return created;
  }

  async updateStorageLocation(id: string, data: Partial<UpdateStorageLocation>): Promise<StorageLocation | undefined> {
    const [updated] = await db.update(storageLocations).set(data).where(eq(storageLocations.id, id)).returning();
    return updated;
  }

  async deleteStorageLocation(id: string): Promise<boolean> {
    const [deleted] = await db.delete(storageLocations).where(eq(storageLocations.id, id)).returning();
    return !!deleted;
  }
}

export const dbStorage = new DatabaseStorage();
