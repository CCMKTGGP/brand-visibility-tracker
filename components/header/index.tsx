"use client";

import { fetchData } from "@/utils/fetch";
import { toast } from "sonner";
import Logo from "../logo";
import { ModeToggle } from "../mode-toggle";
import { Button } from "../ui/button";
import { useState } from "react";
import ApiError from "../api-error";
import Loading from "../loading";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/context/userContext";
import { UserCircle } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useUserContext();

  async function handleLogout() {
    setLoading(true);
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
      setLoading(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("userId");
        localStorage.removeItem("token");
      }
    }
  }

  return (
    <div className="w-full px-6 py-6 lg:px-12 lg:py-6 flex items-center border-b border-border bg-background">
      <Logo />
      <div className="ml-auto flex items-center gap-4 lg:gap-6">
        {error && (
          <ApiError message={error} setMessage={(value) => setError(value)} />
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
          disabled={loading}
          variant={loading ? "outline" : "destructive"}
          onClick={handleLogout}
        >
          {loading ? <Loading message="Loggin out..." /> : "Logout"}
        </Button>
      </div>
    </div>
  );
}
