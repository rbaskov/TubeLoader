import { Link, useLocation } from "wouter";
import { Home, ListTodo, Settings, LogOut, LogIn, Download } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DownloadJob } from "@shared/schema";

export function AppSidebar() {
  const { t } = useApp();
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();

  const { data: jobs } = useQuery<DownloadJob[]>({
    queryKey: ["/api/jobs"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  const activeJobsCount = jobs?.filter(
    (job) => job.status === "downloading" || job.status === "queued" || job.status === "converting" || job.status === "uploading"
  ).length || 0;

  const menuItems = [
    {
      title: t.nav.home,
      url: "/",
      icon: Home,
      protected: true,
    },
    {
      title: t.nav.jobs,
      url: "/jobs",
      icon: ListTodo,
      badge: activeJobsCount > 0 ? activeJobsCount : undefined,
      protected: true,
    },
    {
      title: t.nav.settings,
      url: "/settings",
      icon: Settings,
      protected: true,
    },
  ];

  const visibleItems = menuItems.filter((item) => !item.protected || isAuthenticated);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">YT Downloader</span>
            <span className="text-xs text-muted-foreground">v1.0</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "") || "home"}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge !== undefined && (
                    <SidebarMenuBadge className="bg-primary text-primary-foreground">
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarSeparator className="mb-2" />
        
        {isAuthenticated && user ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-2 py-1">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user.profileImageUrl || undefined} 
                  alt={user.firstName || (user as any).username || user.email || "User"} 
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">
                  {(user.firstName?.[0] || (user as any).username?.[0] || user.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">
                  {user.firstName || (user as any).username || user.email || t.user.guest}
                </span>
                {(user.email || (user as any).username) && user.firstName && (
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email || `@${(user as any).username}`}
                  </span>
                )}
              </div>
            </div>
            
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  data-testid="link-logout"
                  className="text-muted-foreground cursor-pointer"
                  onClick={async () => {
                    try {
                      await apiRequest("POST", "/api/auth/logout");
                      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                      window.location.reload();
                    } catch (error) {
                      console.error("Logout error:", error);
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.nav.logout}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a 
                  href="/api/login" 
                  data-testid="link-login"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t.nav.login}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
