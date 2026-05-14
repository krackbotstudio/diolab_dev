import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Switch, Route, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Boxes,
  Shield,
  Settings,
  ScrollText,
  LogOut,
  Loader2,
} from "lucide-react";
import CMSDashboard from "./cms-dashboard";
import CMSOrganizations from "./cms-organizations";
import CMSUsers from "./cms-users";
import CMSStaff from "./cms-staff";
import CMSModules from "./cms-modules";
import CMSRoles from "./cms-roles";
import CMSSettings from "./cms-settings";
import CMSActivity from "./cms-activity";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dlab-cms" },
  { title: "Organizations", icon: Building2, path: "/dlab-cms/organizations" },
  { title: "Users", icon: Users, path: "/dlab-cms/users" },
  { title: "Staff", icon: UserCog, path: "/dlab-cms/staff" },
  { title: "Modules", icon: Boxes, path: "/dlab-cms/modules" },
  { title: "Roles & Permissions", icon: Shield, path: "/dlab-cms/roles" },
  { title: "Settings", icon: Settings, path: "/dlab-cms/settings" },
  { title: "Activity Log", icon: ScrollText, path: "/dlab-cms/activity" },
];

function CMSSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold" data-testid="text-cms-title">dlabCMS</span>
          <Badge variant="secondary" className="text-[10px]" data-testid="badge-admin">Admin</Badge>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = item.path === "/dlab-cms"
                  ? location === "/dlab-cms"
                  : location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      tooltip={item.title}
                    >
                      <Link href={item.path} data-testid={`link-cms-${item.title.toLowerCase().replace(/\s+&?\s*/g, "-")}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function CMSRouter() {
  return (
    <Switch>
      <Route path="/dlab-cms" component={CMSDashboard} />
      <Route path="/dlab-cms/organizations" component={CMSOrganizations} />
      <Route path="/dlab-cms/users" component={CMSUsers} />
      <Route path="/dlab-cms/staff" component={CMSStaff} />
      <Route path="/dlab-cms/modules" component={CMSModules} />
      <Route path="/dlab-cms/roles" component={CMSRoles} />
      <Route path="/dlab-cms/settings" component={CMSSettings} />
      <Route path="/dlab-cms/activity" component={CMSActivity} />
    </Switch>
  );
}

export default function CMSApp() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: admin, isLoading, isError } = useQuery<{ id: number; email: string; role: string }>({
    queryKey: ["/api/cms/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && isError) {
      navigate("/dlab-cms/login");
    }
  }, [isLoading, isError, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="icon-cms-loading" />
          <p className="text-muted-foreground">Loading CMS...</p>
        </div>
      </div>
    );
  }

  if (isError || !admin) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/cms/logout");
      queryClient.invalidateQueries({ queryKey: ["/api/cms/me"] });
      navigate("/dlab-cms/login");
      toast({
        title: "Logged Out",
        description: "You have been logged out of dlabCMS",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <CMSSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-3 px-4 py-3 border-b">
            <div className="flex items-center gap-3 flex-wrap">
              <SidebarTrigger data-testid="button-cms-sidebar-toggle" />
              <span className="text-sm font-medium text-muted-foreground" data-testid="text-cms-console-label">
                Super Admin Console
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-cms-admin-email">
                {admin.email}
              </span>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="button-cms-logout"
              >
                <LogOut />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <CMSRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
