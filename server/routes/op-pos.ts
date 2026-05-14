import { Router } from "express";
import { storage } from "../storage";
import { insertDepartmentSchema, insertDoctorSchema, insertOpVisitSchema, insertPrescriptionSchema, updateOpVisitSchema, insertPatientVitalSchema, insertDoctorReferralSchema } from "@shared/schema";
import { z } from "zod";
import { translatePrescription, translatePrescriptionSchema } from "../ai";

const router = Router();

// ============ DEPARTMENTS ============
router.get("/departments", async (req, res) => {
  const organizationId = req.query.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }
  const departments = await storage.getDepartments(organizationId);
  res.json(departments);
});

router.post("/departments", async (req, res) => {
  try {
    const data = insertDepartmentSchema.parse(req.body);
    const department = await storage.createDepartment(data);
    res.status(201).json(department);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

router.patch("/departments/:id", async (req, res) => {
  const department = await storage.updateDepartment(req.params.id, req.body);
  if (!department) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json(department);
});

router.delete("/departments/:id", async (req, res) => {
  const success = await storage.deleteDepartment(req.params.id);
  if (!success) {
    return res.status(404).json({ error: "Department not found" });
  }
  res.json({ success: true });
});

// ============ DOCTORS ============
router.get("/doctors", async (req, res) => {
  const organizationId = req.query.organizationId as string;
  const departmentId = req.query.departmentId as string;
  
  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }
  
  if (departmentId) {
    const doctors = await storage.getDoctorsByDepartment(departmentId);
    return res.json(doctors);
  }
  
  const doctors = await storage.getDoctors(organizationId);
  res.json(doctors);
});

router.get("/doctors/:id", async (req, res) => {
  const doctor = await storage.getDoctor(req.params.id);
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }
  res.json(doctor);
});

router.post("/doctors", async (req, res) => {
  try {
    const data = insertDoctorSchema.parse(req.body);
    const doctor = await storage.createDoctor(data);
    res.status(201).json(doctor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

router.patch("/doctors/:id", async (req, res) => {
  const doctor = await storage.updateDoctor(req.params.id, req.body);
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }
  res.json(doctor);
});

router.delete("/doctors/:id", async (req, res) => {
  const success = await storage.deleteDoctor(req.params.id);
  if (!success) {
    return res.status(404).json({ error: "Doctor not found" });
  }
  res.json({ success: true });
});

// ============ OP VISITS ============
router.get("/op-visits", async (req, res) => {
  const organizationId = req.query.organizationId as string;
  const date = req.query.date as string;
  
  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }
  
  let visits;
  if (date) {
    visits = await storage.getOpVisitsByDate(organizationId, date);
  } else {
    visits = await storage.getOpVisits(organizationId);
  }

  const [patients, doctors, departments] = await Promise.all([
    storage.getPatients(organizationId),
    storage.getDoctors(organizationId),
    storage.getDepartments(organizationId),
  ]);

  const enrichedVisits = visits.map((v) => ({
    ...v,
    patient: patients.find((p) => p.id === v.patientId) || null,
    doctor: doctors.find((d) => d.id === v.doctorId) || null,
    department: departments.find((d) => d.id === v.departmentId) || null,
  }));

  res.json(enrichedVisits);
});

router.get("/op-visits/:id", async (req, res) => {
  const visit = await storage.getOpVisit(req.params.id);
  if (!visit) {
    return res.status(404).json({ error: "Visit not found" });
  }
  res.json(visit);
});

router.post("/op-visits", async (req, res) => {
  try {
    const organizationId = req.body.organizationId;
    const tokenDate = req.body.tokenDate || new Date().toISOString().split('T')[0];
    
    // Get next token number for today
    const tokenNumber = await storage.getNextTokenNumber(organizationId, tokenDate);
    
    const data = insertOpVisitSchema.parse({
      ...req.body,
      tokenNumber,
      tokenDate,
    });
    
    const visit = await storage.createOpVisit(data);
    res.status(201).json(visit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

router.patch("/op-visits/:id", async (req, res) => {
  try {
    const data = updateOpVisitSchema.parse(req.body);
    
    // Track consultation times
    const updateData: any = { ...data };
    if (data.status === "in_consultation") {
      updateData.consultationStartedAt = new Date();
    } else if (data.status === "completed") {
      updateData.consultationEndedAt = new Date();
    }
    
    const visit = await storage.updateOpVisit(req.params.id, updateData);
    if (!visit) {
      return res.status(404).json({ error: "Visit not found" });
    }
    res.json(visit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

router.post("/op-visits/:id/complete", async (req, res) => {
  const { consultationFee, paymentMode } = req.body;
  
  const visit = await storage.updateOpVisit(req.params.id, {
    status: "completed",
    consultationFee,
    paymentMode,
    paymentStatus: paymentMode === "unpaid" ? "unpaid" : "paid",
  });
  
  if (!visit) {
    return res.status(404).json({ error: "Visit not found" });
  }
  res.json(visit);
});

// ============ PRESCRIPTIONS ============
router.get("/op-visits/:opVisitId/prescriptions", async (req, res) => {
  const prescriptions = await storage.getPrescriptions(req.params.opVisitId);
  res.json(prescriptions);
});

router.post("/prescriptions", async (req, res) => {
  try {
    const data = insertPrescriptionSchema.parse(req.body);
    const prescription = await storage.createPrescription(data);
    res.status(201).json(prescription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

router.delete("/prescriptions/:id", async (req, res) => {
  await storage.deletePrescription(req.params.id);
  res.status(204).send();
});

// ============ PATIENT LAST VISIT ============
router.get("/patient-last-visit", async (req, res) => {
  const patientId = req.query.patientId as string;
  const organizationId = req.query.organizationId as string;

  if (!patientId || !organizationId) {
    return res.status(400).json({ error: "patientId and organizationId are required" });
  }

  const allVisits = await storage.getOpVisits(organizationId);
  const patientVisits = allVisits
    .filter(v => v.patientId === patientId)
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  if (patientVisits.length === 0) {
    return res.json(null);
  }

  res.json(patientVisits[0]);
});

// ============ TOKEN NUMBER ============
router.get("/next-token", async (req, res) => {
  const organizationId = req.query.organizationId as string;
  const date = req.query.date as string || new Date().toISOString().split('T')[0];
  
  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }
  
  const nextToken = await storage.getNextTokenNumber(organizationId, date);
  res.json({ nextToken });
});

// ============ PRESCRIPTION UPDATE ============
router.patch("/prescriptions/:id", async (req, res) => {
  try {
    const updated = await storage.updatePrescription(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Prescription not found" });
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

router.get("/patient-prescriptions", async (req, res) => {
  const patientId = req.query.patientId as string;
  const organizationId = req.query.organizationId as string;
  if (!patientId || !organizationId) {
    return res.status(400).json({ error: "patientId and organizationId required" });
  }
  const prescriptions = await storage.getPrescriptionsByPatient(patientId, organizationId);
  res.json(prescriptions);
});

// ============ PRESCRIPTION TRANSLATION ============
router.post("/prescriptions/translate", async (req, res) => {
  try {
    const data = translatePrescriptionSchema.parse(req.body);
    const translations = await translatePrescription(data.medicines, data.targetLanguage);
    res.json({ translations });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Translation error:", error);
    res.status(500).json({ error: "Failed to translate prescriptions" });
  }
});

// ============ PATIENT VITALS ============
router.get("/patient-vitals", async (req, res) => {
  const patientId = req.query.patientId as string;
  const organizationId = req.query.organizationId as string;
  if (!patientId || !organizationId) {
    return res.status(400).json({ error: "patientId and organizationId required" });
  }
  const vitals = await storage.getPatientVitals(patientId, organizationId);
  res.json(vitals);
});

router.get("/visit-vitals/:opVisitId", async (req, res) => {
  const vital = await storage.getPatientVitalsByVisit(req.params.opVisitId);
  res.json(vital || null);
});

router.post("/patient-vitals", async (req, res) => {
  try {
    const data = insertPatientVitalSchema.parse(req.body);
    const vital = await storage.createPatientVital(data);
    res.status(201).json(vital);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

// ============ DOCTOR REFERRALS ============
router.get("/doctor-referrals", async (req, res) => {
  const organizationId = req.query.organizationId as string;
  if (!organizationId) {
    return res.status(400).json({ error: "Organization ID required" });
  }
  const referrals = await storage.getDoctorReferrals(organizationId);
  res.json(referrals);
});

router.get("/doctor-referrals/outgoing/:doctorId", async (req, res) => {
  const referrals = await storage.getDoctorReferralsByDoctor(req.params.doctorId);
  res.json(referrals);
});

router.get("/doctor-referrals/incoming/:doctorId", async (req, res) => {
  const referrals = await storage.getIncomingReferrals(req.params.doctorId);
  res.json(referrals);
});

router.get("/doctor-referrals/:id", async (req, res) => {
  const referral = await storage.getDoctorReferral(req.params.id);
  if (!referral) {
    return res.status(404).json({ error: "Referral not found" });
  }
  res.json(referral);
});

router.post("/doctor-referrals", async (req, res) => {
  try {
    const data = insertDoctorReferralSchema.parse(req.body);
    const referral = await storage.createDoctorReferral(data);
    res.status(201).json(referral);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
});

router.patch("/doctor-referrals/:id", async (req, res) => {
  const referral = await storage.updateDoctorReferral(req.params.id, req.body);
  if (!referral) {
    return res.status(404).json({ error: "Referral not found" });
  }
  res.json(referral);
});

// ============ PATIENT CASE SHEET (Aggregated medical history) ============
router.get("/patient-case-sheet", async (req, res) => {
  const patientId = req.query.patientId as string;
  const organizationId = req.query.organizationId as string;
  if (!patientId || !organizationId) {
    return res.status(400).json({ error: "patientId and organizationId required" });
  }

  const [vitals, visits, prescriptions] = await Promise.all([
    storage.getPatientVitals(patientId, organizationId),
    storage.getOpVisits(organizationId).then(all => 
      all.filter(v => v.patientId === patientId)
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
    ),
    storage.getPrescriptionsByPatient(patientId, organizationId),
  ]);

  res.json({
    vitals,
    visits,
    prescriptions,
    totalVisits: visits.length,
    lastVisit: visits[0] || null,
    latestVitals: vitals[0] || null,
  });
});

export default router;
