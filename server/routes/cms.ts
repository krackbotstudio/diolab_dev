import { Router } from "express";
import { db } from "../db";
import { eq, desc, count, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  superAdmins,
  cmsActivityLog,
  organizations,
  staff,
  users,
  branches,
  patients,
  bills,
  tests,
  testPackages,
  medicines,
  medicineSales,
  suppliers,
  doctors,
  departments,
  opVisits,
  bookings,
  wards,
  beds,
  admissions,
} from "@shared/schema";

const router = Router();
async function logCmsActivity(
  adminId: string,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: any
) {
  await db.insert(cmsActivityLog).values({
    adminId,
    adminEmail,
    action,
    targetType,
    targetId,
    details,
  });
}

function requireCmsAdmin(req: any, res: any, next: any) {
  if (!(req as any).session?.cmsAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.post("/seed", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Seed endpoint disabled in production" });
  }
  try {
    const admins = [
      { email: "dotbotzstudio@gmail.com", password: "DlabCMS@2025", name: "DotBotz Admin" },
      { email: "krackbotstudio@gmail.com", password: "DlabCMS@2025", name: "KrackBot Admin" },
    ];

    const created: string[] = [];

    for (const admin of admins) {
      const existing = await db
        .select()
        .from(superAdmins)
        .where(eq(superAdmins.email, admin.email))
        .limit(1);

      if (existing.length === 0) {
        const hashedPassword = await hashPassword(admin.password);
        await db.insert(superAdmins).values({
          email: admin.email,
          password: hashedPassword,
          name: admin.name,
        });
        created.push(admin.email);
      }
    }

    res.json({ message: "Seed complete", created });
  } catch (error) {
    console.error("CMS seed error:", error);
    res.status(500).json({ error: "Failed to seed super admins" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const [admin] = await db
      .select()
      .from(superAdmins)
      .where(eq(superAdmins.email, email))
      .limit(1);

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    (req as any).session.cmsAdmin = { id: admin.id, email: admin.email, name: admin.name };

    await db
      .update(superAdmins)
      .set({ lastLoginAt: new Date() })
      .where(eq(superAdmins.id, admin.id));

    res.json({ message: "Login successful", admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (error) {
    console.error("CMS login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  (req as any).session.cmsAdmin = null;
  res.json({ message: "Logged out" });
});

router.get("/me", (req, res) => {
  const admin = (req as any).session?.cmsAdmin;
  if (!admin) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json(admin);
});

router.use(requireCmsAdmin);

router.get("/dashboard/stats", async (_req, res) => {
  try {
    const [orgCount] = await db.select({ value: count() }).from(organizations);
    const [userCount] = await db.select({ value: count() }).from(users);
    const [staffCount] = await db.select({ value: count() }).from(staff);
    const [patientCount] = await db.select({ value: count() }).from(patients);
    const [billCount] = await db.select({ value: count() }).from(bills);
    const [testCount] = await db.select({ value: count() }).from(tests);
    const [medicineCount] = await db.select({ value: count() }).from(medicines);
    const [doctorCount] = await db.select({ value: count() }).from(doctors);

    const allOrgs = await db.select({ subscribedModules: organizations.subscribedModules }).from(organizations);

    const activeModules = { dialab: 0, doclab: 0, medlab: 0 };
    for (const org of allOrgs) {
      const modules = org.subscribedModules || [];
      if (modules.includes("dialab")) activeModules.dialab++;
      if (modules.includes("doclab")) activeModules.doclab++;
      if (modules.includes("medlab")) activeModules.medlab++;
    }

    res.json({
      totalOrganizations: orgCount.value,
      totalUsers: userCount.value,
      totalStaff: staffCount.value,
      totalPatients: patientCount.value,
      totalBills: billCount.value,
      totalTests: testCount.value,
      totalMedicines: medicineCount.value,
      totalDoctors: doctorCount.value,
      activeModules,
    });
  } catch (error) {
    console.error("CMS dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

router.get("/dashboard/activity", async (_req, res) => {
  try {
    const activity = await db
      .select()
      .from(cmsActivityLog)
      .orderBy(desc(cmsActivityLog.createdAt))
      .limit(50);
    res.json(activity);
  } catch (error) {
    console.error("CMS activity log error:", error);
    res.status(500).json({ error: "Failed to fetch activity log" });
  }
});

router.get("/organizations", async (_req, res) => {
  try {
    const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));

    const result = await Promise.all(
      orgs.map(async (org) => {
        const [staffCount] = await db
          .select({ value: count() })
          .from(staff)
          .where(eq(staff.organizationId, org.id));
        const [patientCount] = await db
          .select({ value: count() })
          .from(patients)
          .where(eq(patients.organizationId, org.id));
        const [billCount] = await db
          .select({ value: count() })
          .from(bills)
          .where(eq(bills.organizationId, org.id));

        return {
          ...org,
          staffCount: staffCount.value,
          patientCount: patientCount.value,
          billCount: billCount.value,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("CMS organizations error:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

router.get("/organizations/:id", async (req, res) => {
  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, req.params.id))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json(org);
  } catch (error) {
    console.error("CMS organization detail error:", error);
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

router.patch("/organizations/:id", async (req, res) => {
  try {
    const [org] = await db
      .update(organizations)
      .set(req.body)
      .where(eq(organizations.id, req.params.id))
      .returning();

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const admin = (req as any).session.cmsAdmin;
    await logCmsActivity(admin.id, admin.email, "update_organization", "organization", org.id, req.body);

    res.json(org);
  } catch (error) {
    console.error("CMS update organization error:", error);
    res.status(500).json({ error: "Failed to update organization" });
  }
});

router.patch("/organizations/:id/modules", async (req, res) => {
  try {
    const { subscribedModules } = req.body;
    const [org] = await db
      .update(organizations)
      .set({ subscribedModules })
      .where(eq(organizations.id, req.params.id))
      .returning();

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const admin = (req as any).session.cmsAdmin;
    await logCmsActivity(admin.id, admin.email, "update_modules", "organization", org.id, { subscribedModules });

    res.json(org);
  } catch (error) {
    console.error("CMS update modules error:", error);
    res.status(500).json({ error: "Failed to update modules" });
  }
});

router.delete("/organizations/:id", async (req, res) => {
  try {
    const orgId = req.params.id;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    await db.update(staff).set({ isActive: false }).where(eq(staff.organizationId, orgId));
    await db.update(tests).set({ isActive: false }).where(eq(tests.organizationId, orgId));
    await db.update(testPackages).set({ isActive: false }).where(eq(testPackages.organizationId, orgId));
    await db.update(medicines).set({ isActive: false }).where(eq(medicines.organizationId, orgId));
    await db.update(suppliers).set({ isActive: false }).where(eq(suppliers.organizationId, orgId));
    await db.update(doctors).set({ isActive: false }).where(eq(doctors.organizationId, orgId));
    await db.update(departments).set({ isActive: false }).where(eq(departments.organizationId, orgId));
    await db.update(branches).set({ isActive: false }).where(eq(branches.organizationId, orgId));
    await db.update(wards).set({ isActive: false }).where(eq(wards.organizationId, orgId));
    await db.update(beds).set({ isActive: false }).where(eq(beds.organizationId, orgId));
    await db.update(organizations).set({ isOnboarded: false }).where(eq(organizations.id, orgId));

    const admin = (req as any).session.cmsAdmin;
    await logCmsActivity(admin.id, admin.email, "soft_delete_organization", "organization", orgId, { name: org.name });

    res.json({ message: "Organization soft deleted" });
  } catch (error) {
    console.error("CMS delete organization error:", error);
    res.status(500).json({ error: "Failed to delete organization" });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

    const result = await Promise.all(
      allUsers.map(async (user) => {
        const [org] = await db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(eq(organizations.ownerId, user.id))
          .limit(1);

        return {
          ...user,
          password: undefined,
          organization: org || null,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("CMS users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/staff", async (_req, res) => {
  try {
    const allStaff = await db.select().from(staff).orderBy(desc(staff.createdAt));

    const result = await Promise.all(
      allStaff.map(async (member) => {
        let orgName = null;
        if (member.organizationId) {
          const [org] = await db
            .select({ name: organizations.name })
            .from(organizations)
            .where(eq(organizations.id, member.organizationId))
            .limit(1);
          orgName = org?.name || null;
        }
        return { ...member, password: undefined, organizationName: orgName };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("CMS staff error:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

router.get("/staff/:id", async (req, res) => {
  try {
    const [member] = await db
      .select()
      .from(staff)
      .where(eq(staff.id, req.params.id))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    res.json({ ...member, password: undefined });
  } catch (error) {
    console.error("CMS staff detail error:", error);
    res.status(500).json({ error: "Failed to fetch staff member" });
  }
});

router.patch("/staff/:id", async (req, res) => {
  try {
    const { role, moduleAccess, pagePermissions, isActive, fullName, email, phone } = req.body;
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (moduleAccess !== undefined) updateData.moduleAccess = moduleAccess;
    if (pagePermissions !== undefined) updateData.pagePermissions = pagePermissions;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    const [member] = await db
      .update(staff)
      .set(updateData)
      .where(eq(staff.id, req.params.id))
      .returning();

    if (!member) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const admin = (req as any).session.cmsAdmin;
    await logCmsActivity(admin.id, admin.email, "update_staff", "staff", member.id, updateData);

    res.json({ ...member, password: undefined });
  } catch (error) {
    console.error("CMS update staff error:", error);
    res.status(500).json({ error: "Failed to update staff member" });
  }
});

router.delete("/staff/:id", async (req, res) => {
  try {
    const [member] = await db
      .update(staff)
      .set({ isActive: false })
      .where(eq(staff.id, req.params.id))
      .returning();

    if (!member) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    const admin = (req as any).session.cmsAdmin;
    await logCmsActivity(admin.id, admin.email, "deactivate_staff", "staff", member.id, { fullName: member.fullName });

    res.json({ message: "Staff member deactivated" });
  } catch (error) {
    console.error("CMS delete staff error:", error);
    res.status(500).json({ error: "Failed to deactivate staff member" });
  }
});

router.get("/modules/summary", async (_req, res) => {
  try {
    const allOrgs = await db
      .select({
        subscribedModules: organizations.subscribedModules,
        isOnboarded: organizations.isOnboarded,
      })
      .from(organizations);

    const summary = {
      dialab: { totalOrgs: 0, totalActiveOrgs: 0 },
      doclab: { totalOrgs: 0, totalActiveOrgs: 0 },
      medlab: { totalOrgs: 0, totalActiveOrgs: 0 },
    };

    for (const org of allOrgs) {
      const modules = org.subscribedModules || [];
      if (modules.includes("dialab")) {
        summary.dialab.totalOrgs++;
        if (org.isOnboarded) summary.dialab.totalActiveOrgs++;
      }
      if (modules.includes("doclab")) {
        summary.doclab.totalOrgs++;
        if (org.isOnboarded) summary.doclab.totalActiveOrgs++;
      }
      if (modules.includes("medlab")) {
        summary.medlab.totalOrgs++;
        if (org.isOnboarded) summary.medlab.totalActiveOrgs++;
      }
    }

    res.json(summary);
  } catch (error) {
    console.error("CMS modules summary error:", error);
    res.status(500).json({ error: "Failed to fetch modules summary" });
  }
});

router.patch("/modules/org/:orgId", async (req, res) => {
  try {
    const { subscribedModules } = req.body;
    const [org] = await db
      .update(organizations)
      .set({ subscribedModules })
      .where(eq(organizations.id, req.params.orgId))
      .returning();

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const admin = (req as any).session.cmsAdmin;
    await logCmsActivity(admin.id, admin.email, "update_org_modules", "organization", org.id, { subscribedModules });

    res.json(org);
  } catch (error) {
    console.error("CMS update org modules error:", error);
    res.status(500).json({ error: "Failed to update organization modules" });
  }
});

router.get("/settings/global", async (_req, res) => {
  res.json({
    maintenanceMode: false,
    defaultModules: ["dialab"],
    maxOrgsPerUser: 5,
  });
});

export default router;
