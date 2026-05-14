import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  Users,
  TestTube2,
  Receipt,
  FileText,
  Package,
  Settings,
  Building2,
  TrendingUp,
  LogOut,
  CalendarCheck,
  Stethoscope,
  Pill,
  ShoppingCart,
  Truck,
  Warehouse,
  BedDouble,
  DoorOpen,
  ClipboardPlus,
  Activity,
  ClipboardList,
  Shapes,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import logoSymbol from "@assets/diolab_-_logo_-_color_-_symbol_1769252295192.png";
import { useAppMode } from "@/contexts/app-mode-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";

const diagnosticsNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Patients",
    url: "/patients",
    icon: Users,
  },
  {
    title: "Tests & Packages",
    url: "/tests",
    icon: TestTube2,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: Receipt,
  },
  {
    title: "Samples & Reports",
    url: "/samples-reports",
    icon: FileText,
  },
  {
    title: "Bookings",
    url: "/bookings",
    icon: CalendarCheck,
  },
];

const hospitalsNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Patients",
    url: "/patients",
    icon: Users,
  },
  {
    title: "OP Reception",
    url: "/op-pos",
    icon: Receipt,
  },
  {
    title: "Doctor Console",
    url: "/doctor-console",
    icon: Stethoscope,
  },
  {
    title: "Consultations",
    url: "/consultations",
    icon: CalendarCheck,
  },
  {
    title: "Admissions",
    url: "/admissions",
    icon: ClipboardPlus,
  },
  {
    title: "Wards",
    url: "/wards",
    icon: DoorOpen,
  },
  {
    title: "Beds",
    url: "/beds",
    icon: BedDouble,
  },
  {
    title: "ICU Dashboard",
    url: "/icu",
    icon: Activity,
  },
];

const diagnosticsManagementItems = [
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
  },
  {
    title: "Branches",
    url: "/branches",
    icon: Building2,
  },
  {
    title: "Staff",
    url: "/staff",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const hospitalsManagementItems = [
  {
    title: "Hospital Setup",
    url: "/hospital-settings",
    icon: Building2,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
  },
  {
    title: "Staff",
    url: "/staff",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const medlabNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Patients",
    url: "/medlab-patients",
    icon: ClipboardPlus,
  },
  {
    title: "Medicines",
    url: "/medicines",
    icon: Pill,
  },
  {
    title: "Sales / POS",
    url: "/medlab-sales",
    icon: ShoppingCart,
  },
  {
    title: "Orders",
    url: "/pharmacy-orders",
    icon: ClipboardList,
  },
  {
    title: "Customers",
    url: "/medlab-customers",
    icon: Users,
  },
  {
    title: "Suppliers",
    url: "/suppliers",
    icon: Truck,
  },
];

const medlabManagementItems = [
  {
    title: "Inventory",
    url: "/medlab-inventory",
    icon: Warehouse,
  },
  {
    title: "Storage Locator",
    url: "/storage-locator",
    icon: Shapes,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
  },
  {
    title: "Staff",
    url: "/staff",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const ALWAYS_VISIBLE = ["settings", "staff"];

function getPageKey(url: string): string {
  const key = url.replace(/^\//, "");
  return key || "dashboard";
}

export function AppSidebar() {
  const [location] = useLocation();
  const { state } = useSidebar();
  const { mode } = useAppMode();
  const { isOwner, role, canAccessPage, isLoading: permissionsLoading } = usePermissions();
  const { logout } = useAuth();
  const isCollapsed = state === "collapsed";

  const moduleId = mode === "diagnostics" ? "dialab" : mode === "hospitals" ? "doclab" : "medlab";

  const allMainNavItems = mode === "diagnostics" ? diagnosticsNavItems : mode === "hospitals" ? hospitalsNavItems : medlabNavItems;
  const allManagementItems = mode === "diagnostics" ? diagnosticsManagementItems : mode === "hospitals" ? hospitalsManagementItems : medlabManagementItems;

  const hasFullAccess = permissionsLoading || isOwner || role === "admin";

  const mainNavItems = hasFullAccess
    ? allMainNavItems
    : allMainNavItems.filter((item) => canAccessPage(moduleId, getPageKey(item.url)));

  const managementItems = hasFullAccess
    ? allManagementItems
    : allManagementItems.filter((item) => {
      const pageKey = getPageKey(item.url);
      return ALWAYS_VISIBLE.includes(pageKey) || canAccessPage(moduleId, pageKey);
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-3">
            <img src={logoSymbol} alt="Diolab" className="h-10 w-10 object-contain flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-sidebar-foreground">Diolab</span>
                <span className="text-xs text-muted-foreground">
                  {mode === "diagnostics" ? "Dialab" : mode === "hospitals" ? "Doclab" : "Medlab"}
                </span>
              </div>
            )}
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              data-testid="button-sidebar-logout"
              onClick={() => logout()}
              className="text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
