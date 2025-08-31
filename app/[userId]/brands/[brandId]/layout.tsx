"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Users,
  Building2,
  Settings,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { fetchData } from "@/utils/fetch";
import { useUserContext } from "@/context/userContext";
import ApiError from "@/components/api-error";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import Loading from "@/components/loading";
import { toast } from "sonner";

interface BrandLayoutProps {
  children: React.ReactNode;
}

const BrandLayout: React.FC<BrandLayoutProps> = ({ children }) => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { userId, brandId } = params;
  const [brandName, setBrandName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState("");

  // context
  const { user } = useUserContext();

  useEffect(() => {
    async function fetchBrandName() {
      try {
        const response = await fetchData(`/api/brand/${brandId}`);
        const { data } = response;
        setBrandName(data.name || `Brand ${brandId}`);
      } catch (error) {
        console.error("Error fetching brand name:", error);
        setBrandName(`Brand ${brandId}`);
      } finally {
        setLoading(false);
      }
    }

    if (brandId && userId) {
      fetchBrandName();
    }
  }, [userId, brandId]);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      const response = await fetchData("/api/logout");
      const { message } = response;
      toast.success(message);

      router.replace("/login");
    } catch (error) {
      setError(
        `Logout Failed - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLogoutLoading(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("userId");
        localStorage.removeItem("token");
      }
    }
  }

  const navigationItems = [
    {
      title: "Dashboard",
      url: `/${userId}/brands/${brandId}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Matrix",
      url: `/${userId}/brands/${brandId}/matrix`,
      icon: BarChart3,
    },
    {
      title: "Logs",
      url: `/${userId}/brands/${brandId}/view-logs`,
      icon: FileText,
    },
    {
      title: "Members",
      url: `/${userId}/brands/${brandId}/members`,
      icon: Users,
    },
  ];

  const settingsItems = [
    {
      title: "Brand Settings",
      url: `/${userId}/brands/${brandId}/edit-brand`,
      icon: Settings,
    },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href={`/${userId}/brands`}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Brand Viz</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href={`/${userId}/brands`}>
                  <Building2 className="size-4" />
                  <span>All Brands</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center gap-4 px-4 h-20 shrink-0 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-20">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border" />
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Link
                href={`/${userId}/brands`}
                className="hover:text-foreground"
              >
                Brands
              </Link>
              <span>/</span>
              <span className="text-foreground">
                {loading ? "Fetching brand name..." : brandName}
              </span>
            </nav>
          </div>
          <div className="ml-auto flex items-center gap-4 lg:gap-6">
            {error && (
              <ApiError
                message={error}
                setMessage={(value) => setError(value)}
              />
            )}
            <ModeToggle />
            {user._id && (
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full">
                  <UserCircle stroke="#5e6bc5" />
                </div>
                <p className="text-base font-bold text-foreground dark:text-foreground">
                  {user?.full_name}
                </p>
              </div>
            )}
            <Button
              disabled={logoutLoading || loading}
              variant={logoutLoading ? "outline" : "destructive"}
              onClick={handleLogout}
            >
              {logoutLoading ? <Loading message="Loggin out..." /> : "Logout"}
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default BrandLayout;
