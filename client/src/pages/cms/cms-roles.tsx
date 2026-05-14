import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

const ROLES = [
  { key: "owner", label: "Organization Owner", access: "Full access to all modules and pages" },
  { key: "admin", label: "Administrator", access: "Full access to assigned modules" },
  { key: "manager", label: "Manager", access: "Access to operational pages" },
  { key: "receptionist", label: "Receptionist", access: "Patient registration, billing" },
  { key: "lab_technician", label: "Lab Technician", access: "Sample processing, reports" },
  { key: "pharmacist", label: "Pharmacist", access: "Medicine inventory, sales" },
  { key: "doctor", label: "Doctor", access: "Consultations, prescriptions" },
  { key: "accountant", label: "Accountant", access: "Billing, analytics, financial reports" },
];

const DIALAB_PAGES = ["Dashboard", "Patients", "Tests", "Billing", "Samples & Reports", "Inventory", "Analytics", "Bookings", "Branches", "Settings", "Staff"];
const DOCLAB_PAGES = ["Dashboard", "Patients", "OP POS", "Doctor Console", "Consultations", "Hospital Settings", "Wards", "Beds", "Admissions", "ICU", "Analytics", "Staff"];
const MEDLAB_PAGES = ["Dashboard", "Medicines", "Sales/POS", "Suppliers", "Analytics", "Staff"];

const DIALAB_ACCESS: Record<string, string[]> = {
  owner: DIALAB_PAGES,
  admin: DIALAB_PAGES,
  manager: ["Dashboard", "Patients", "Tests", "Billing", "Samples & Reports", "Inventory", "Analytics", "Bookings", "Staff"],
  receptionist: ["Dashboard", "Patients", "Billing", "Bookings"],
  lab_technician: ["Dashboard", "Patients", "Tests", "Samples & Reports", "Inventory"],
  pharmacist: [],
  doctor: ["Dashboard", "Patients", "Tests", "Samples & Reports"],
  accountant: ["Dashboard", "Billing", "Analytics"],
};

const DOCLAB_ACCESS: Record<string, string[]> = {
  owner: DOCLAB_PAGES,
  admin: DOCLAB_PAGES,
  manager: ["Dashboard", "Patients", "OP POS", "Consultations", "Wards", "Beds", "Admissions", "ICU", "Analytics", "Staff"],
  receptionist: ["Dashboard", "Patients", "OP POS"],
  lab_technician: [],
  pharmacist: [],
  doctor: ["Dashboard", "Patients", "Doctor Console", "Consultations", "Wards", "Admissions", "ICU"],
  accountant: ["Dashboard", "OP POS", "Analytics"],
};

const MEDLAB_ACCESS: Record<string, string[]> = {
  owner: MEDLAB_PAGES,
  admin: MEDLAB_PAGES,
  manager: ["Dashboard", "Medicines", "Sales/POS", "Suppliers", "Analytics", "Staff"],
  receptionist: ["Dashboard", "Sales/POS"],
  lab_technician: [],
  pharmacist: ["Dashboard", "Medicines", "Sales/POS", "Suppliers"],
  doctor: [],
  accountant: ["Dashboard", "Sales/POS", "Analytics"],
};

function PermissionGrid({ title, pages, accessMap }: { title: string; pages: string[]; accessMap: Record<string, string[]> }) {
  return (
    <Card>
      <div className="p-4 border-b">
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Role</TableHead>
              {pages.map((page) => (
                <TableHead key={page} className="text-center text-xs min-w-[80px]">{page}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role.key} data-testid={`row-permission-${title.toLowerCase().replace(/\s/g, "-")}-${role.key}`}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium text-sm">{role.label}</TableCell>
                {pages.map((page) => {
                  const hasAccess = (accessMap[role.key] || []).includes(page);
                  return (
                    <TableCell key={page} className="text-center">
                      {hasAccess ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export default function CMSRoles() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold" data-testid="text-page-title">
        Roles & Permissions
      </h1>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Access Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role.key} data-testid={`row-role-${role.key}`}>
                <TableCell>
                  <Badge variant="secondary" data-testid={`badge-role-${role.key}`}>
                    {role.key}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium" data-testid={`text-role-label-${role.key}`}>
                  {role.label}
                </TableCell>
                <TableCell className="text-muted-foreground" data-testid={`text-role-access-${role.key}`}>
                  {role.access}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold" data-testid="text-permissions-grid-title">
          Module Permissions Grid
        </h2>
        <PermissionGrid title="Dialab" pages={DIALAB_PAGES} accessMap={DIALAB_ACCESS} />
        <PermissionGrid title="Doclab" pages={DOCLAB_PAGES} accessMap={DOCLAB_ACCESS} />
        <PermissionGrid title="Medlab" pages={MEDLAB_PAGES} accessMap={MEDLAB_ACCESS} />
      </div>
    </div>
  );
}
