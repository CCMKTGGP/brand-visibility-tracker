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
  CreditCard,
  History,
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
import { CreditBalance } from "@/components/credit-balance";
import { CreditStats } from "@/types";
import { isUserOwner } from "@/utils/checkUserRole";
import Image from "next/image";

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
  const { user, setUser } = useUserContext();

  useEffect(() => {
    async function fetchBrandName() {
      try {
        const response = await fetchData(`/api/brand/${brandId}`);
        const { data } = response;
        setBrandName(data.name || `Brand ${brandId}`);
      } catch (error) {
        setError(
          `Error fetching brand name - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    if (brandId && userId) {
      fetchBrandName();
    }
  }, [userId, brandId]);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetchData(
          `/api/users/${userId}/fetch-role?brandId=${brandId}`
        );
        const { data } = response;
        setUser({ ...user, role: data.role });
      } catch (error) {
        setError(
          `Error fetching user role - ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    }
    if (userId && brandId) {
      fetchUserRole();
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

  const creditItems = [
    {
      title: "Purchase Credits",
      url: `/${userId}/brands/${brandId}/credits/purchase`,
      icon: CreditCard,
    },
    {
      title: "Transaction History",
      url: `/${userId}/brands/${brandId}/transactions`,
      icon: History,
    },
  ];

  const settingsItems = isUserOwner(user)
    ? [
        {
          title: "Brand Settings",
          url: `/${userId}/brands/${brandId}/edit-brand`,
          icon: Settings,
        },
      ]
    : [];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="cursor-pointer hover:bg-transparent"
              >
                <Link href={`/${userId}/brands`}>
                  <Image
                    src="/logo.svg"
                    alt="GEO Status"
                    width={140}
                    height={140}
                  />
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
            <SidebarGroupLabel>Credits</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {creditItems.map((item) => (
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

          {settingsItems.length > 0 && (
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
          )}
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
        <header className="flex items-center gap-4 px-8 h-20 shrink-0 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-20">
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
          <div className="ml-auto flex items-center gap-4 lg:gap-8">
            {error && (
              <ApiError
                message={error}
                setMessage={(value) => setError(value)}
              />
            )}
            {user._id && (
              <CreditBalance
                compact={true}
                purchaseUrl={`/${userId}/brands/${brandId}/credits/purchase`}
                creditData={
                  {
                    currentBalance: user.credits_balance,
                    totalPurchased: user.total_credits_purchased,
                    totalUsed: user.total_credits_used,
                  } as CreditStats
                }
              />
            )}
            {user._id && (
              <div className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full">
                  <UserCircle stroke="#5e6bc5" />
                </div>
                <div className="flex flex-col">
                  <p className="text-base font-bold text-foreground dark:text-foreground">
                    {user?.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
            )}
            <ModeToggle />
            <Button
              disabled={logoutLoading || loading}
              variant={logoutLoading ? "outline" : "destructive"}
              onClick={handleLogout}
            >
              {logoutLoading ? <Loading message="Loggin out..." /> : "Logout"}
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 px-8 py-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default BrandLayout;
