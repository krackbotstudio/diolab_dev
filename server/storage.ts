import { randomUUID } from "crypto";
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

// Storage interface for all CRUD operations
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;

  // Organizations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationByOwnerId(ownerId: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // Branches
  getBranches(organizationId: string): Promise<Branch[]>;
  getBranch(id: string): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;

  // Patients
  getPatients(organizationId: string): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByPhone(phone: string, organizationId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined>;
  searchPatients(query: string, organizationId: string): Promise<Patient[]>;

  // Tests
  getTests(organizationId: string): Promise<Test[]>;
  getTest(id: string): Promise<Test | undefined>;
  createTest(test: InsertTest): Promise<Test>;
  updateTest(id: string, data: Partial<InsertTest>): Promise<Test | undefined>;
  deleteTest(id: string): Promise<void>;

  // Test Packages
  getPackages(organizationId: string): Promise<TestPackage[]>;
  getPackage(id: string): Promise<TestPackage | undefined>;
  createPackage(pkg: InsertTestPackage): Promise<TestPackage>;
  updatePackage(id: string, data: Partial<InsertTestPackage>): Promise<TestPackage | undefined>;
  deletePackage(id: string): Promise<void>;

  // Bills
  getBills(organizationId: string): Promise<Bill[]>;
  getBill(id: string): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  createBillWithNumber(bill: InsertBill & { billNumber: string }): Promise<Bill>;
  updateBill(id: string, data: Partial<InsertBill>): Promise<Bill | undefined>;

  // Samples
  getSamples(organizationId: string): Promise<Sample[]>;
  getSample(id: string): Promise<Sample | undefined>;
  createSample(sample: InsertSample): Promise<Sample>;
  createSampleWithId(sample: InsertSample & { sampleId: string }): Promise<Sample>;
  updateSampleStatus(id: string, status: string): Promise<Sample | undefined>;
  updateSampleResult(id: string, data: { resultValue: string; isAbnormal: boolean; notes?: string; resultData?: Record<string, string>; status: string; processedAt: Date }): Promise<Sample | undefined>;

  // Reports (legacy)
  getReports(organizationId: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, data: Partial<InsertReport>): Promise<Report | undefined>;

  // Test Reports (per-test individual reports)
  getTestReports(organizationId: string): Promise<TestReport[]>;
  getTestReportsBySample(sampleId: string): Promise<TestReport[]>;
  getTestReportsByPatient(patientId: string): Promise<TestReport[]>;
  getTestReportsByBill(billId: string): Promise<TestReport[]>;
  getTestReport(id: string): Promise<TestReport | undefined>;
  getTestReportByReportNumber(reportNumber: string): Promise<TestReport | undefined>;
  createTestReport(report: InsertTestReport): Promise<TestReport>;
  createTestReportWithNumber(report: InsertTestReport & { reportNumber: string; status?: string; isLocked?: boolean }): Promise<TestReport>;
  updateTestReport(id: string, data: Partial<InsertTestReport>): Promise<TestReport | undefined>;
  finalizeTestReport(id: string, finalizedBy: string): Promise<TestReport | undefined>;
  createReportRevision(parentReportId: string, revisionNotes: string): Promise<TestReport | undefined>;

  // Report Shares
  getReportShares(reportId: string): Promise<ReportShare[]>;
  createReportShare(share: InsertReportShare): Promise<ReportShare>;
  updateReportShareStatus(id: string, status: string, viewedAt?: Date): Promise<ReportShare | undefined>;

  // Inventory
  getInventoryItems(organizationId: string): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryStock(id: string, quantity: number): Promise<InventoryItem | undefined>;

  // Bookings
  getBookings(organizationId: string): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking & { bookingNumber: string }): Promise<Booking>;
  updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string, statusNotes?: string): Promise<Booking | undefined>;

  // Organization Booking Settings
  getOrganizationBookingSettings(organizationId: string): Promise<OrganizationBookingSettings | undefined>;
  createOrganizationBookingSettings(settings: InsertOrganizationBookingSettings): Promise<OrganizationBookingSettings>;
  updateOrganizationBookingSettings(organizationId: string, data: Partial<InsertOrganizationBookingSettings>): Promise<OrganizationBookingSettings | undefined>;

  // Booking Patients (for returning patient lookup)
  getBookingPatientByPhone(organizationId: string, phone: string): Promise<BookingPatient | undefined>;
  createOrUpdateBookingPatient(patient: InsertBookingPatient): Promise<BookingPatient>;

  // Departments (OP POS)
  getDepartments(organizationId: string): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string): Promise<boolean>;

  // Doctors (OP POS)
  getDoctors(organizationId: string): Promise<Doctor[]>;
  getDoctor(id: string): Promise<Doctor | undefined>;
  getDoctorsByDepartment(departmentId: string): Promise<Doctor[]>;
  createDoctor(doctor: InsertDoctor): Promise<Doctor>;

  // Storage Locations
  getStorageLocations(organizationId: string): Promise<StorageLocation[]>;
  getStorageLocation(id: string): Promise<StorageLocation | undefined>;
  createStorageLocation(location: InsertStorageLocation): Promise<StorageLocation>;
  updateStorageLocation(id: string, data: Partial<UpdateStorageLocation>): Promise<StorageLocation | undefined>;
  deleteStorageLocation(id: string): Promise<boolean>;
  updateDoctor(id: string, data: Partial<InsertDoctor>): Promise<Doctor | undefined>;
  deleteDoctor(id: string): Promise<boolean>;

  // OP Visits (OP POS)
  getOpVisits(organizationId: string): Promise<OpVisit[]>;
  getOpVisitsByDate(organizationId: string, date: string): Promise<OpVisit[]>;
  getOpVisit(id: string): Promise<OpVisit | undefined>;
  getOpVisitByMeetingRoomId(roomId: string): Promise<OpVisit | undefined>;
  getVideoConsultations(organizationId: string): Promise<OpVisit[]>;
  getNextTokenNumber(organizationId: string, date: string): Promise<number>;
  createOpVisit(visit: InsertOpVisit): Promise<OpVisit>;
  updateOpVisit(id: string, data: Partial<InsertOpVisit>): Promise<OpVisit | undefined>;

  // Prescriptions (OP POS)
  getPrescriptions(opVisitId: string): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  deletePrescription(id: string): Promise<void>;

  // Patient Vitals
  getPatientVitals(patientId: string, organizationId: string): Promise<PatientVital[]>;
  getPatientVitalsByVisit(opVisitId: string): Promise<PatientVital | undefined>;
  createPatientVital(vital: InsertPatientVital): Promise<PatientVital>;

  // Doctor Referrals
  getDoctorReferrals(organizationId: string): Promise<DoctorReferral[]>;
  getDoctorReferralsByDoctor(doctorId: string): Promise<DoctorReferral[]>;
  getIncomingReferrals(doctorId: string): Promise<DoctorReferral[]>;
  getDoctorReferral(id: string): Promise<DoctorReferral | undefined>;
  createDoctorReferral(referral: InsertDoctorReferral): Promise<DoctorReferral>;
  updateDoctorReferral(id: string, data: Partial<InsertDoctorReferral>): Promise<DoctorReferral | undefined>;

  // Prescription updates
  updatePrescription(id: string, data: Partial<InsertPrescription>): Promise<Prescription | undefined>;
  getPrescriptionsByPatient(patientId: string, organizationId: string): Promise<Prescription[]>;

  // Staff
  getStaff(organizationId: string): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  getStaffByUsername(username: string): Promise<Staff | undefined>;
  getStaffByUserId(userId: string, organizationId: string): Promise<Staff | undefined>;
  createStaff(staff: InsertStaff): Promise<Staff>;
  updateStaff(id: string, data: Partial<InsertStaff>): Promise<Staff | undefined>;
  deleteStaff(id: string): Promise<boolean>;

  // Wards
  getWards(organizationId: string): Promise<Ward[]>;
  getWard(id: string): Promise<Ward | undefined>;
  createWard(ward: InsertWard): Promise<Ward>;
  updateWard(id: string, data: Partial<InsertWard>): Promise<Ward | undefined>;
  deleteWard(id: string): Promise<boolean>;

  // Beds
  getBeds(organizationId: string): Promise<Bed[]>;
  getBedsByWard(wardId: string): Promise<Bed[]>;
  getBed(id: string): Promise<Bed | undefined>;
  createBed(bed: InsertBed): Promise<Bed>;
  updateBed(id: string, data: Partial<InsertBed>): Promise<Bed | undefined>;
  deleteBed(id: string): Promise<boolean>;

  // Admissions
  getAdmissions(organizationId: string): Promise<Admission[]>;
  getActiveAdmissions(organizationId: string): Promise<Admission[]>;
  getAdmission(id: string): Promise<Admission | undefined>;
  createAdmission(admission: InsertAdmission): Promise<Admission>;
  updateAdmission(id: string, data: Partial<InsertAdmission>): Promise<Admission | undefined>;
  getNextAdmissionNumber(organizationId: string): Promise<string>;

  // ICU Monitoring
  getIcuRecords(admissionId: string): Promise<IcuMonitoring[]>;
  getLatestIcuRecord(admissionId: string): Promise<IcuMonitoring | undefined>;
  createIcuRecord(record: InsertIcuMonitoring): Promise<IcuMonitoring>;
  getIcuPatients(organizationId: string): Promise<Admission[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private organizations: Map<string, Organization>;
  private branches: Map<string, Branch>;
  private patients: Map<string, Patient>;
  private tests: Map<string, Test>;
  private packages: Map<string, TestPackage>;
  private bills: Map<string, Bill>;
  private samples: Map<string, Sample>;
  private reports: Map<string, Report>;
  private testReports: Map<string, TestReport>;
  private reportShares: Map<string, ReportShare>;
  private inventoryItems: Map<string, InventoryItem>;
  private bookings: Map<string, Booking>;
  private organizationBookingSettings: Map<string, OrganizationBookingSettings>;
  private bookingPatients: Map<string, BookingPatient>;

  private patientCounter = 1;
  private billCounter = 1;
  private sampleCounter = 1;
  private reportCounter = 1;
  private testReportCounter = 1;
  private bookingCounter = 1;

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.branches = new Map();
    this.patients = new Map();
    this.tests = new Map();
    this.packages = new Map();
    this.bills = new Map();
    this.samples = new Map();
    this.reports = new Map();
    this.testReports = new Map();
    this.reportShares = new Map();
    this.inventoryItems = new Map();
    this.bookings = new Map();
    this.organizationBookingSettings = new Map();
    this.bookingPatients = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const id = insertUser.id || randomUUID();
    const user: User = { 
      id, 
      email: insertUser.email ?? null,
      phone: insertUser.phone ?? null,
      password: insertUser.password ?? null,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      profileImageUrl: insertUser.profileImageUrl ?? null,
      authProvider: insertUser.authProvider ?? null,
      googleId: insertUser.googleId ?? null,
      isEmailVerified: insertUser.isEmailVerified ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Organizations
  async getOrganization(id: string): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async getOrganizationByOwnerId(ownerId: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find((org) => org.ownerId === ownerId);
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const id = randomUUID();
    const org: Organization = { 
      id, 
      name: insertOrg.name,
      logo: insertOrg.logo ?? null,
      address: insertOrg.address ?? null,
      city: insertOrg.city ?? null,
      state: insertOrg.state ?? null,
      pincode: insertOrg.pincode ?? null,
      phone: insertOrg.phone ?? null,
      email: insertOrg.email ?? null,
      website: insertOrg.website ?? null,
      gstNumber: insertOrg.gstNumber ?? null,
      panNumber: insertOrg.panNumber ?? null,
      licenseNumber: insertOrg.licenseNumber ?? null,
      invoicePrefix: insertOrg.invoicePrefix ?? "INV",
      reportHeader: insertOrg.reportHeader ?? null,
      reportFooter: insertOrg.reportFooter ?? null,
      showLogo: insertOrg.showLogo ?? true,
      showQRCode: insertOrg.showQRCode ?? true,
      primaryColor: insertOrg.primaryColor ?? "#2DD4BF",
      accentColor: insertOrg.accentColor ?? "#0F766E",
      headerColor: insertOrg.headerColor ?? "#0D9488",
      upiQrCodeUrl: insertOrg.upiQrCodeUrl ?? null,
      upiId: insertOrg.upiId ?? null,
      ownerId: insertOrg.ownerId ?? null,
      isOnboarded: insertOrg.isOnboarded ?? false,
      subscribedModules: insertOrg.subscribedModules ?? ["dialab"],
      defaultConsultationFee: insertOrg.defaultConsultationFee ?? "500",
      tokenPrefix: insertOrg.tokenPrefix ?? "T",
      pharmacyName: insertOrg.pharmacyName ?? null,
      defaultMarkupPercent: insertOrg.defaultMarkupPercent ?? "15",
      lowStockThreshold: insertOrg.lowStockThreshold ?? 10,
      createdAt: new Date() 
    };
    this.organizations.set(id, org);
    return org;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const org = this.organizations.get(id);
    if (!org) return undefined;
    const updated: Organization = { ...org, ...data };
    this.organizations.set(id, updated);
    return updated;
  }

  // Branches
  async getBranches(organizationId: string): Promise<Branch[]> {
    return Array.from(this.branches.values()).filter(b => b.organizationId === organizationId);
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    return this.branches.get(id);
  }

  async createBranch(insertBranch: InsertBranch): Promise<Branch> {
    const id = randomUUID();
    const branch: Branch = { 
      id, 
      organizationId: insertBranch.organizationId,
      name: insertBranch.name,
      address: insertBranch.address ?? null,
      phone: insertBranch.phone ?? null,
      email: insertBranch.email ?? null,
      isActive: true, 
      createdAt: new Date() 
    };
    this.branches.set(id, branch);
    return branch;
  }

  // Patients
  async getPatients(organizationId: string): Promise<Patient[]> {
    return Array.from(this.patients.values())
      .filter(p => p.organizationId === organizationId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async getPatientByPhone(phone: string, organizationId: string): Promise<Patient | undefined> {
    return Array.from(this.patients.values()).find(
      (p) => p.phone === phone && p.organizationId === organizationId
    );
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = randomUUID();
    const patientId = `PAT-${String(this.patientCounter++).padStart(3, "0")}`;
    const patient: Patient = { 
      id, 
      patientId,
      organizationId: insertPatient.organizationId,
      firstName: insertPatient.firstName,
      lastName: insertPatient.lastName,
      phone: insertPatient.phone,
      email: insertPatient.email ?? null,
      dateOfBirth: insertPatient.dateOfBirth ?? null,
      gender: insertPatient.gender ?? null,
      address: insertPatient.address ?? null,
      bloodGroup: insertPatient.bloodGroup ?? null,
      familyGroupId: insertPatient.familyGroupId ?? null,
      source: insertPatient.source ?? "walk_in",
      module: insertPatient.module ?? "diagnostics",
      createdAt: new Date() 
    };
    this.patients.set(id, patient);
    return patient;
  }

  async updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const patient = this.patients.get(id);
    if (!patient) return undefined;
    const updated: Patient = { ...patient, ...data };
    this.patients.set(id, updated);
    return updated;
  }

  async searchPatients(query: string, organizationId: string): Promise<Patient[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.patients.values()).filter(
      (p) =>
        p.organizationId === organizationId && (
          p.firstName.toLowerCase().includes(lowerQuery) ||
          p.lastName.toLowerCase().includes(lowerQuery) ||
          p.phone.includes(query) ||
          p.patientId.toLowerCase().includes(lowerQuery)
        )
    );
  }

  // Tests
  async getTests(organizationId: string): Promise<Test[]> {
    return Array.from(this.tests.values()).filter(
      (t) => t.isActive && t.organizationId === organizationId
    );
  }

  async getTest(id: string): Promise<Test | undefined> {
    return this.tests.get(id);
  }

  async createTest(insertTest: InsertTest): Promise<Test> {
    const id = randomUUID();
    const test: Test = { 
      id,
      organizationId: insertTest.organizationId,
      name: insertTest.name,
      code: insertTest.code,
      category: insertTest.category,
      description: insertTest.description ?? null,
      price: insertTest.price,
      normalRange: insertTest.normalRange ?? null,
      unit: insertTest.unit ?? null,
      sampleType: insertTest.sampleType ?? null,
      turnaroundTime: insertTest.turnaroundTime ?? null,
      reportTemplate: insertTest.reportTemplate ?? null,
      isActive: true, 
      createdAt: new Date() 
    };
    this.tests.set(id, test);
    return test;
  }

  async updateTest(id: string, data: Partial<InsertTest>): Promise<Test | undefined> {
    const test = this.tests.get(id);
    if (!test) return undefined;
    const updated: Test = {
      ...test,
      ...data,
      id: test.id,
      organizationId: test.organizationId,
      createdAt: test.createdAt,
    };
    this.tests.set(id, updated);
    return updated;
  }

  async deleteTest(id: string): Promise<void> {
    this.tests.delete(id);
  }

  // Packages
  async getPackages(organizationId: string): Promise<TestPackage[]> {
    return Array.from(this.packages.values()).filter(
      (p) => p.isActive && p.organizationId === organizationId
    );
  }

  async getPackage(id: string): Promise<TestPackage | undefined> {
    return this.packages.get(id);
  }

  async createPackage(insertPackage: InsertTestPackage): Promise<TestPackage> {
    const id = randomUUID();
    const pkg: TestPackage = { 
      id,
      organizationId: insertPackage.organizationId,
      name: insertPackage.name,
      description: insertPackage.description ?? null,
      testIds: insertPackage.testIds,
      originalPrice: insertPackage.originalPrice,
      discountedPrice: insertPackage.discountedPrice,
      discountPercent: insertPackage.discountPercent ?? null,
      validFrom: insertPackage.validFrom ?? null,
      validUntil: insertPackage.validUntil ?? null,
      isActive: true, 
      createdAt: new Date() 
    };
    this.packages.set(id, pkg);
    return pkg;
  }

  async updatePackage(id: string, data: Partial<InsertTestPackage>): Promise<TestPackage | undefined> {
    const existing = this.packages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.packages.set(id, updated);
    return updated;
  }

  async deletePackage(id: string): Promise<void> {
    this.packages.delete(id);
  }

  // Bills
  async getBills(organizationId: string): Promise<Bill[]> {
    return Array.from(this.bills.values())
      .filter(b => b.organizationId === organizationId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getBill(id: string): Promise<Bill | undefined> {
    return this.bills.get(id);
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const id = randomUUID();
    // Get organization's invoice prefix
    const org = await this.getOrganization(insertBill.organizationId);
    const prefix = org?.invoicePrefix || "INV";
    const billNumber = `${prefix}-${String(this.billCounter++).padStart(3, "0")}`;
    const bill: Bill = { 
      id,
      billNumber,
      organizationId: insertBill.organizationId,
      branchId: insertBill.branchId,
      patientId: insertBill.patientId,
      createdBy: insertBill.createdBy,
      items: insertBill.items,
      subtotal: insertBill.subtotal,
      discountAmount: insertBill.discountAmount ?? null,
      taxAmount: insertBill.taxAmount ?? null,
      totalAmount: insertBill.totalAmount,
      paidAmount: insertBill.paidAmount ?? null,
      dueAmount: insertBill.dueAmount ?? null,
      paymentMethod: insertBill.paymentMethod ?? null,
      paymentStatus: insertBill.paymentStatus ?? null,
      notes: insertBill.notes ?? null,
      createdAt: new Date() 
    };
    this.bills.set(id, bill);
    return bill;
  }

  async createBillWithNumber(insertBill: InsertBill & { billNumber: string }): Promise<Bill> {
    const id = randomUUID();
    const bill: Bill = { 
      id,
      billNumber: insertBill.billNumber,
      organizationId: insertBill.organizationId,
      branchId: insertBill.branchId,
      patientId: insertBill.patientId,
      createdBy: insertBill.createdBy,
      items: insertBill.items,
      subtotal: insertBill.subtotal,
      discountAmount: insertBill.discountAmount ?? null,
      taxAmount: insertBill.taxAmount ?? null,
      totalAmount: insertBill.totalAmount,
      paidAmount: insertBill.paidAmount ?? null,
      dueAmount: insertBill.dueAmount ?? null,
      paymentMethod: insertBill.paymentMethod ?? null,
      paymentStatus: insertBill.paymentStatus ?? null,
      notes: insertBill.notes ?? null,
      createdAt: new Date() 
    };
    this.bills.set(id, bill);
    return bill;
  }

  async updateBill(id: string, data: Partial<InsertBill>): Promise<Bill | undefined> {
    const bill = this.bills.get(id);
    if (!bill) return undefined;
    const updated: Bill = { ...bill, ...data };
    this.bills.set(id, updated);
    return updated;
  }

  // Samples
  async getSamples(organizationId: string): Promise<Sample[]> {
    return Array.from(this.samples.values())
      .filter(s => s.organizationId === organizationId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getSample(id: string): Promise<Sample | undefined> {
    return this.samples.get(id);
  }

  async createSample(insertSample: InsertSample): Promise<Sample> {
    const id = randomUUID();
    const sampleId = `SMP-${String(this.sampleCounter++).padStart(3, "0")}`;
    const sample: Sample = { 
      id, 
      sampleId,
      organizationId: insertSample.organizationId,
      billId: insertSample.billId,
      patientId: insertSample.patientId,
      testId: insertSample.testId,
      status: "collected",
      collectedBy: insertSample.collectedBy ?? null,
      collectedAt: insertSample.collectedAt ?? new Date(),
      processedBy: insertSample.processedBy ?? null,
      processedAt: insertSample.processedAt ?? null,
      result: insertSample.result ?? null,
      resultValue: insertSample.resultValue ?? null,
      resultData: insertSample.resultData ?? null,
      isAbnormal: insertSample.isAbnormal ?? null,
      notes: insertSample.notes ?? null,
      createdAt: new Date() 
    };
    this.samples.set(id, sample);
    return sample;
  }

  async createSampleWithId(insertSample: InsertSample & { sampleId: string }): Promise<Sample> {
    const id = randomUUID();
    const sample: Sample = { 
      id, 
      sampleId: insertSample.sampleId,
      organizationId: insertSample.organizationId,
      billId: insertSample.billId,
      patientId: insertSample.patientId,
      testId: insertSample.testId,
      status: insertSample.status ?? "collected",
      collectedBy: insertSample.collectedBy ?? null,
      collectedAt: insertSample.collectedAt ?? new Date(),
      processedBy: insertSample.processedBy ?? null,
      processedAt: insertSample.processedAt ?? null,
      result: insertSample.result ?? null,
      resultValue: insertSample.resultValue ?? null,
      resultData: insertSample.resultData ?? null,
      isAbnormal: insertSample.isAbnormal ?? null,
      notes: insertSample.notes ?? null,
      createdAt: new Date() 
    };
    this.samples.set(id, sample);
    return sample;
  }

  async updateSampleStatus(id: string, status: string): Promise<Sample | undefined> {
    const sample = this.samples.get(id);
    if (sample) {
      sample.status = status;
      if (status === "processing") {
        sample.processedAt = new Date();
      }
    }
    return sample;
  }

  async updateSampleResult(id: string, data: { resultValue: string; isAbnormal: boolean; notes?: string; resultData?: Record<string, string>; status: string; processedAt: Date }): Promise<Sample | undefined> {
    const sample = this.samples.get(id);
    if (sample) {
      sample.resultValue = data.resultValue;
      sample.isAbnormal = data.isAbnormal;
      sample.notes = data.notes ?? null;
      sample.resultData = data.resultData ?? null;
      sample.status = data.status;
      sample.processedAt = data.processedAt;
    }
    return sample;
  }

  // Reports
  async getReports(organizationId: string): Promise<Report[]> {
    return Array.from(this.reports.values())
      .filter(r => r.organizationId === organizationId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getReport(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const reportNumber = `RPT-${String(this.reportCounter++).padStart(3, "0")}`;
    const report: Report = { 
      id, 
      reportNumber,
      organizationId: insertReport.organizationId,
      billId: insertReport.billId,
      patientId: insertReport.patientId,
      pdfUrl: insertReport.pdfUrl ?? null,
      status: "pending",
      generatedBy: insertReport.generatedBy ?? null,
      generatedAt: insertReport.generatedAt ?? null,
      deliveredAt: insertReport.deliveredAt ?? null,
      deliveryMethod: insertReport.deliveryMethod ?? null,
      version: 1,
      aiSummary: insertReport.aiSummary ?? null,
      createdAt: new Date() 
    };
    this.reports.set(id, report);
    return report;
  }

  async updateReport(id: string, data: Partial<InsertReport>): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;
    const updated: Report = { ...report, ...data };
    this.reports.set(id, updated);
    return updated;
  }

  // Inventory
  async getInventoryItems(organizationId: string): Promise<InventoryItem[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (i) => i.isActive && i.organizationId === organizationId
    );
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    return this.inventoryItems.get(id);
  }

  async createInventoryItem(insertItem: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID();
    const item: InventoryItem = { 
      id,
      organizationId: insertItem.organizationId,
      branchId: insertItem.branchId ?? null,
      name: insertItem.name,
      category: insertItem.category,
      unit: insertItem.unit,
      currentStock: insertItem.currentStock ?? null,
      minStock: insertItem.minStock ?? null,
      maxStock: insertItem.maxStock ?? null,
      unitPrice: insertItem.unitPrice ?? null,
      supplier: insertItem.supplier ?? null,
      lastRestocked: insertItem.lastRestocked ?? null,
      expiryDate: insertItem.expiryDate ?? null,
      isActive: true, 
      createdAt: new Date() 
    };
    this.inventoryItems.set(id, item);
    return item;
  }

  async updateInventoryStock(id: string, quantity: number): Promise<InventoryItem | undefined> {
    const item = this.inventoryItems.get(id);
    if (item) {
      item.currentStock = (item.currentStock || 0) + quantity;
      item.lastRestocked = new Date();
    }
    return item;
  }

  // Test Reports (per-test individual reports)
  async getTestReports(organizationId: string): Promise<TestReport[]> {
    return Array.from(this.testReports.values())
      .filter(r => r.organizationId === organizationId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTestReportsBySample(sampleId: string): Promise<TestReport[]> {
    return Array.from(this.testReports.values())
      .filter(r => r.sampleId === sampleId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTestReportsByPatient(patientId: string): Promise<TestReport[]> {
    return Array.from(this.testReports.values())
      .filter(r => r.patientId === patientId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTestReportsByBill(billId: string): Promise<TestReport[]> {
    return Array.from(this.testReports.values())
      .filter(r => r.billId === billId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTestReport(id: string): Promise<TestReport | undefined> {
    return this.testReports.get(id);
  }

  async getTestReportByReportNumber(reportNumber: string): Promise<TestReport | undefined> {
    return Array.from(this.testReports.values()).find(r => r.reportNumber === reportNumber);
  }

  async createTestReport(insertReport: InsertTestReport): Promise<TestReport> {
    const id = randomUUID();
    const reportNumber = `TR-${String(this.testReportCounter++).padStart(5, "0")}`;
    const report: TestReport = {
      id,
      reportNumber,
      organizationId: insertReport.organizationId,
      branchId: insertReport.branchId ?? null,
      billId: insertReport.billId,
      sampleId: insertReport.sampleId,
      patientId: insertReport.patientId,
      testId: insertReport.testId,
      resultData: insertReport.resultData ?? null,
      interpretation: insertReport.interpretation ?? null,
      aiSummary: insertReport.aiSummary ?? null,
      instrumentUsed: insertReport.instrumentUsed ?? null,
      methodology: insertReport.methodology ?? null,
      status: "pending",
      enteredBy: insertReport.enteredBy ?? null,
      enteredAt: insertReport.enteredAt ?? null,
      verifiedBy: insertReport.verifiedBy ?? null,
      verifiedAt: insertReport.verifiedAt ?? null,
      finalizedBy: insertReport.finalizedBy ?? null,
      finalizedAt: insertReport.finalizedAt ?? null,
      isLocked: false,
      pdfUrl: insertReport.pdfUrl ?? null,
      version: 1,
      parentReportId: insertReport.parentReportId ?? null,
      revisionNotes: insertReport.revisionNotes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.testReports.set(id, report);
    return report;
  }

  async createTestReportWithNumber(insertReport: InsertTestReport & { reportNumber: string; status?: string; isLocked?: boolean }): Promise<TestReport> {
    const id = randomUUID();
    const report: TestReport = {
      id,
      reportNumber: insertReport.reportNumber,
      organizationId: insertReport.organizationId,
      branchId: insertReport.branchId ?? null,
      billId: insertReport.billId,
      sampleId: insertReport.sampleId,
      patientId: insertReport.patientId,
      testId: insertReport.testId,
      resultData: insertReport.resultData ?? null,
      interpretation: insertReport.interpretation ?? null,
      aiSummary: insertReport.aiSummary ?? null,
      instrumentUsed: insertReport.instrumentUsed ?? null,
      methodology: insertReport.methodology ?? null,
      status: insertReport.status ?? "pending",
      enteredBy: insertReport.enteredBy ?? null,
      enteredAt: insertReport.enteredAt ?? null,
      verifiedBy: insertReport.verifiedBy ?? null,
      verifiedAt: insertReport.verifiedAt ?? null,
      finalizedBy: insertReport.finalizedBy ?? null,
      finalizedAt: insertReport.finalizedAt ?? null,
      isLocked: insertReport.isLocked ?? false,
      pdfUrl: insertReport.pdfUrl ?? null,
      version: 1,
      parentReportId: insertReport.parentReportId ?? null,
      revisionNotes: insertReport.revisionNotes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.testReports.set(id, report);
    return report;
  }

  async updateTestReport(id: string, data: Partial<InsertTestReport>): Promise<TestReport | undefined> {
    const report = this.testReports.get(id);
    if (!report || report.isLocked) return undefined;
    const updated: TestReport = { ...report, ...data, updatedAt: new Date() };
    this.testReports.set(id, updated);
    return updated;
  }

  async finalizeTestReport(id: string, finalizedBy: string): Promise<TestReport | undefined> {
    const report = this.testReports.get(id);
    if (!report) return undefined;
    report.status = "finalized";
    report.finalizedBy = finalizedBy;
    report.finalizedAt = new Date();
    report.isLocked = true;
    report.updatedAt = new Date();
    return report;
  }

  async createReportRevision(parentReportId: string, revisionNotes: string): Promise<TestReport | undefined> {
    const parent = this.testReports.get(parentReportId);
    if (!parent) return undefined;
    
    const id = randomUUID();
    const reportNumber = `TR-${String(this.testReportCounter++).padStart(5, "0")}`;
    const revision: TestReport = {
      ...parent,
      id,
      reportNumber,
      parentReportId,
      revisionNotes,
      version: (parent.version || 1) + 1,
      status: "draft",
      isLocked: false,
      finalizedBy: null,
      finalizedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Mark parent as revised
    parent.status = "revised";
    
    this.testReports.set(id, revision);
    return revision;
  }

  // Report Shares
  async getReportShares(reportId: string): Promise<ReportShare[]> {
    return Array.from(this.reportShares.values())
      .filter(s => s.reportId === reportId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createReportShare(insertShare: InsertReportShare): Promise<ReportShare> {
    const id = randomUUID();
    const share: ReportShare = {
      id,
      reportId: insertShare.reportId,
      organizationId: insertShare.organizationId,
      shareMethod: insertShare.shareMethod,
      recipientPhone: insertShare.recipientPhone ?? null,
      recipientEmail: insertShare.recipientEmail ?? null,
      shareLink: insertShare.shareLink ?? null,
      status: "sent",
      sentAt: new Date(),
      viewedAt: insertShare.viewedAt ?? null,
      sentBy: insertShare.sentBy ?? null,
      errorMessage: insertShare.errorMessage ?? null,
      createdAt: new Date(),
    };
    this.reportShares.set(id, share);
    return share;
  }

  async updateReportShareStatus(id: string, status: string, viewedAt?: Date): Promise<ReportShare | undefined> {
    const share = this.reportShares.get(id);
    if (!share) return undefined;
    share.status = status;
    if (viewedAt) share.viewedAt = viewedAt;
    return share;
  }

  // Bookings
  async getBookings(organizationId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(b => b.organizationId === organizationId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(booking: InsertBooking & { bookingNumber: string }): Promise<Booking> {
    const id = randomUUID();
    const newBooking: Booking = {
      id,
      bookingNumber: booking.bookingNumber,
      organizationId: booking.organizationId,
      branchId: booking.branchId ?? null,
      patientName: booking.patientName,
      patientAge: booking.patientAge ?? null,
      patientGender: booking.patientGender ?? null,
      patientPhone: booking.patientPhone,
      patientEmail: booking.patientEmail ?? null,
      patientId: booking.patientId ?? null,
      selectedTests: booking.selectedTests ?? null,
      selectedPackages: booking.selectedPackages ?? null,
      symptoms: booking.symptoms ?? null,
      serviceType: booking.serviceType ?? "lab_visit",
      preferredDate: booking.preferredDate,
      preferredTimeSlot: booking.preferredTimeSlot ?? null,
      collectionAddress: booking.collectionAddress ?? null,
      collectionAddressLine2: booking.collectionAddressLine2 ?? null,
      collectionCity: booking.collectionCity ?? null,
      collectionPincode: booking.collectionPincode ?? null,
      collectionNotes: booking.collectionNotes ?? null,
      collectionAgentId: booking.collectionAgentId ?? null,
      estimatedAmount: booking.estimatedAmount ?? null,
      homeCollectionCharge: booking.homeCollectionCharge ?? "0",
      status: booking.status ?? "pending",
      statusNotes: booking.statusNotes ?? null,
      billId: booking.billId ?? null,
      source: booking.source ?? "online",
      ipAddress: booking.ipAddress ?? null,
      userAgent: booking.userAgent ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bookings.set(id, newBooking);
    this.bookingCounter++;
    return newBooking;
  }

  async updateBooking(id: string, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    const updated = { ...booking, ...data, updatedAt: new Date() };
    this.bookings.set(id, updated);
    return updated;
  }

  async updateBookingStatus(id: string, status: string, statusNotes?: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    booking.status = status;
    if (statusNotes) booking.statusNotes = statusNotes;
    booking.updatedAt = new Date();
    return booking;
  }

  // Organization Booking Settings
  async getOrganizationBookingSettings(organizationId: string): Promise<OrganizationBookingSettings | undefined> {
    return Array.from(this.organizationBookingSettings.values())
      .find(s => s.organizationId === organizationId);
  }

  async createOrganizationBookingSettings(settings: InsertOrganizationBookingSettings): Promise<OrganizationBookingSettings> {
    const id = randomUUID();
    const newSettings: OrganizationBookingSettings = {
      id,
      organizationId: settings.organizationId,
      bookingEnabled: settings.bookingEnabled ?? true,
      bookingPageTitle: settings.bookingPageTitle ?? null,
      bookingPageDescription: settings.bookingPageDescription ?? null,
      homeCollectionEnabled: settings.homeCollectionEnabled ?? false,
      homeCollectionCharge: settings.homeCollectionCharge ?? "0",
      homeCollectionMinOrder: settings.homeCollectionMinOrder ?? null,
      availableTimeSlots: settings.availableTimeSlots ?? null,
      bookingLeadTime: settings.bookingLeadTime ?? 1,
      maxBookingsPerSlot: settings.maxBookingsPerSlot ?? 5,
      workingDays: settings.workingDays ?? [1, 2, 3, 4, 5, 6],
      notifyOnBooking: settings.notifyOnBooking ?? true,
      notificationEmail: settings.notificationEmail ?? null,
      notificationPhone: settings.notificationPhone ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.organizationBookingSettings.set(id, newSettings);
    return newSettings;
  }

  async updateOrganizationBookingSettings(organizationId: string, data: Partial<InsertOrganizationBookingSettings>): Promise<OrganizationBookingSettings | undefined> {
    const settings = await this.getOrganizationBookingSettings(organizationId);
    if (!settings) return undefined;
    const updated = { ...settings, ...data, updatedAt: new Date() };
    this.organizationBookingSettings.set(settings.id, updated);
    return updated;
  }

  // Booking Patients
  async getBookingPatientByPhone(organizationId: string, phone: string): Promise<BookingPatient | undefined> {
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    return Array.from(this.bookingPatients.values()).find(
      p => p.organizationId === organizationId && 
           p.phone.replace(/\D/g, "").slice(-10) === normalizedPhone
    );
  }

  async createOrUpdateBookingPatient(patient: InsertBookingPatient): Promise<BookingPatient> {
    const normalizedPhone = patient.phone.replace(/\D/g, "").slice(-10);
    const existing = await this.getBookingPatientByPhone(patient.organizationId, normalizedPhone);
    
    if (existing) {
      const updated: BookingPatient = {
        ...existing,
        name: patient.name,
        email: patient.email ?? existing.email,
        age: patient.age ?? existing.age,
        gender: patient.gender ?? existing.gender,
        address: patient.address ?? existing.address,
        addressLine2: patient.addressLine2 ?? existing.addressLine2,
        city: patient.city ?? existing.city,
        pincode: patient.pincode ?? existing.pincode,
        totalBookings: (existing.totalBookings ?? 0) + 1,
        lastBookingDate: new Date(),
        updatedAt: new Date(),
      };
      this.bookingPatients.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const newPatient: BookingPatient = {
      id,
      organizationId: patient.organizationId,
      name: patient.name,
      phone: normalizedPhone,
      email: patient.email ?? null,
      age: patient.age ?? null,
      gender: patient.gender ?? null,
      address: patient.address ?? null,
      addressLine2: patient.addressLine2 ?? null,
      city: patient.city ?? null,
      pincode: patient.pincode ?? null,
      patientId: patient.patientId ?? null,
      totalBookings: 1,
      lastBookingDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bookingPatients.set(id, newPatient);
    return newPatient;
  }

  // ============ STAFF STUBS ============
  async getStaff(_organizationId: string): Promise<Staff[]> { throw new Error("Not implemented"); }
  async getStaffMember(_id: string): Promise<Staff | undefined> { throw new Error("Not implemented"); }
  async getStaffByUsername(_username: string): Promise<Staff | undefined> { throw new Error("Not implemented"); }
  async getStaffByUserId(_userId: string, _organizationId: string): Promise<Staff | undefined> { throw new Error("Not implemented"); }
  async createStaff(_staff: InsertStaff): Promise<Staff> { throw new Error("Not implemented"); }
  async updateStaff(_id: string, _data: Partial<InsertStaff>): Promise<Staff | undefined> { throw new Error("Not implemented"); }
  async deleteStaff(_id: string): Promise<boolean> { throw new Error("Not implemented"); }

  // ============ OP POS STUBS (uses dbStorage in production) ============
  async getDepartments(_orgId: string): Promise<Department[]> { return []; }
  async getDepartment(_id: string): Promise<Department | undefined> { return undefined; }
  async createDepartment(_dept: InsertDepartment): Promise<Department> { throw new Error("Not implemented"); }
  async updateDepartment(_id: string, _data: Partial<InsertDepartment>): Promise<Department | undefined> { return undefined; }
  async deleteDepartment(_id: string): Promise<boolean> { return false; }
  async getDoctors(_orgId: string): Promise<Doctor[]> { return []; }
  async getDoctor(_id: string): Promise<Doctor | undefined> { return undefined; }
  async getDoctorsByDepartment(_deptId: string): Promise<Doctor[]> { return []; }
  async createDoctor(_doc: InsertDoctor): Promise<Doctor> { throw new Error("Not implemented"); }
  async updateDoctor(_id: string, _data: Partial<InsertDoctor>): Promise<Doctor | undefined> { return undefined; }
  async deleteDoctor(_id: string): Promise<boolean> { return false; }
  async getOpVisits(_orgId: string): Promise<OpVisit[]> { return []; }
  async getOpVisitsByDate(_orgId: string, _date: string): Promise<OpVisit[]> { return []; }
  async getOpVisit(_id: string): Promise<OpVisit | undefined> { return undefined; }
  async getOpVisitByMeetingRoomId(_roomId: string): Promise<OpVisit | undefined> { return undefined; }
  async getVideoConsultations(_orgId: string): Promise<OpVisit[]> { return []; }
  async getNextTokenNumber(_orgId: string, _date: string): Promise<number> { return 1; }
  async createOpVisit(_visit: InsertOpVisit): Promise<OpVisit> { throw new Error("Not implemented"); }
  async updateOpVisit(_id: string, _data: Partial<InsertOpVisit>): Promise<OpVisit | undefined> { return undefined; }
  async getPrescriptions(_opVisitId: string): Promise<Prescription[]> { return []; }
  async createPrescription(_prescription: InsertPrescription): Promise<Prescription> { throw new Error("Not implemented"); }
  async deletePrescription(_id: string): Promise<void> { }

  // ============ HOSPITAL MANAGEMENT STUBS ============
  async getWards(_orgId: string): Promise<Ward[]> { return []; }
  async getWard(_id: string): Promise<Ward | undefined> { return undefined; }
  async createWard(_ward: InsertWard): Promise<Ward> { throw new Error("Not implemented"); }
  async updateWard(_id: string, _data: Partial<InsertWard>): Promise<Ward | undefined> { return undefined; }
  async deleteWard(_id: string): Promise<boolean> { return false; }
  async getBeds(_orgId: string): Promise<Bed[]> { return []; }
  async getBedsByWard(_wardId: string): Promise<Bed[]> { return []; }
  async getBed(_id: string): Promise<Bed | undefined> { return undefined; }
  async createBed(_bed: InsertBed): Promise<Bed> { throw new Error("Not implemented"); }
  async updateBed(_id: string, _data: Partial<InsertBed>): Promise<Bed | undefined> { return undefined; }
  async deleteBed(_id: string): Promise<boolean> { return false; }
  async getAdmissions(_orgId: string): Promise<Admission[]> { return []; }
  async getActiveAdmissions(_orgId: string): Promise<Admission[]> { return []; }
  async getAdmission(_id: string): Promise<Admission | undefined> { return undefined; }
  async createAdmission(_admission: InsertAdmission): Promise<Admission> { throw new Error("Not implemented"); }
  async updateAdmission(_id: string, _data: Partial<InsertAdmission>): Promise<Admission | undefined> { return undefined; }
  async getNextAdmissionNumber(_orgId: string): Promise<string> { return "ADM-001"; }
  async getIcuRecords(_admissionId: string): Promise<IcuMonitoring[]> { return []; }
  async getLatestIcuRecord(_admissionId: string): Promise<IcuMonitoring | undefined> { return undefined; }
  async createIcuRecord(_record: InsertIcuMonitoring): Promise<IcuMonitoring> { throw new Error("Not implemented"); }
  async getIcuPatients(_orgId: string): Promise<Admission[]> { return []; }

  // Patient Vitals stubs
  async getPatientVitals(_patientId: string, _orgId: string): Promise<PatientVital[]> { return []; }
  async getPatientVitalsByVisit(_opVisitId: string): Promise<PatientVital | undefined> { return undefined; }
  async createPatientVital(_vital: InsertPatientVital): Promise<PatientVital> { throw new Error("Not implemented"); }

  // Doctor Referrals stubs
  async getDoctorReferrals(_orgId: string): Promise<DoctorReferral[]> { return []; }
  async getDoctorReferralsByDoctor(_doctorId: string): Promise<DoctorReferral[]> { return []; }
  async getIncomingReferrals(_doctorId: string): Promise<DoctorReferral[]> { return []; }
  async getDoctorReferral(_id: string): Promise<DoctorReferral | undefined> { return undefined; }
  async createDoctorReferral(_referral: InsertDoctorReferral): Promise<DoctorReferral> { throw new Error("Not implemented"); }
  async updateDoctorReferral(_id: string, _data: Partial<InsertDoctorReferral>): Promise<DoctorReferral | undefined> { return undefined; }

  // Prescription updates stubs
  async updatePrescription(_id: string, _data: Partial<InsertPrescription>): Promise<Prescription | undefined> { return undefined; }
  async getPrescriptionsByPatient(_patientId: string, _orgId: string): Promise<Prescription[]> { return []; }

  // Storage Locations stubs
  async getStorageLocations(_orgId: string): Promise<StorageLocation[]> { return []; }
  async getStorageLocation(_id: string): Promise<StorageLocation | undefined> { return undefined; }
  async createStorageLocation(_location: InsertStorageLocation): Promise<StorageLocation> { throw new Error("Not implemented"); }
  async updateStorageLocation(_id: string, _data: Partial<UpdateStorageLocation>): Promise<StorageLocation | undefined> { return undefined; }
  async deleteStorageLocation(_id: string): Promise<boolean> { return false; }
}

// Use DatabaseStorage for persistent data
import { dbStorage } from "./dbStorage";
export const storage: IStorage = dbStorage;
