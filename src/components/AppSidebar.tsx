import { LayoutDashboard, FileText, MessageSquare, User, LogOut, Calendar } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Employee", url: "/employees", icon: User },
  { title: "Chat Room", url: "/chat-room", icon: MessageSquare },
  { title: "Leave Requests", url: "/leave-requests", icon: Calendar },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  // 🧠 Log user to verify role (you can remove this after debugging)
  console.log("Current user in sidebar:", user);

  // ✅ Ensure Employee section only shows for non-employees (like admin)
  const filteredMenu = menuItems.filter((item) => {
    if (item.title === "Employee") {
      // hide for employee role, show for admin
      return user?.role && user.role.toLowerCase() !== "employee";
    }
    return true;
  });

  // 🕐 Optionally handle loading state
  if (!user) {
    return (
      <Sidebar>
        <SidebarHeader>
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        </SidebarHeader>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="rounded-lg bg-sidebar-primary p-2">
            <Briefcase className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-sidebar-foreground">WorkStack</span>
            <span className="text-xs text-sidebar-foreground/70">Employee Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenu.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
