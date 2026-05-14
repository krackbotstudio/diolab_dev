import { useQuery } from "@tanstack/react-query";

interface StaffMeResponse {
  isOwner: boolean;
  role: string;
  moduleAccess: string[];
  pagePermissions: Record<string, string[]>;
}

export function usePermissions() {
  const { data: staffMe, isLoading: isStaffLoading } = useQuery<StaffMeResponse>({
    queryKey: ["/api/staff/me"],
  });

  const isOwner = staffMe?.isOwner ?? false;
  const role = staffMe?.role ?? "none";
  const moduleAccess = staffMe?.moduleAccess ?? [];
  const pagePermissions = staffMe?.pagePermissions ?? {};

  function canAccessModule(moduleId: string): boolean {
    if (isOwner || role === "admin") return true;
    return moduleAccess.includes(moduleId);
  }

  function canAccessPage(moduleId: string, pageKey: string): boolean {
    if (isOwner || role === "admin") return true;
    if (!canAccessModule(moduleId)) return false;
    if (pageKey === "dashboard") return true;
    const pages = pagePermissions[moduleId];
    if (!pages) return false;
    return pages.includes(pageKey);
  }

  return {
    isOwner,
    role,
    canAccessModule,
    canAccessPage,
    isLoading: isStaffLoading,
  };
}
