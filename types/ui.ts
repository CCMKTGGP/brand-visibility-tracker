// UI component related types

// Tag input component props
export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Sidebar context props
export interface SidebarContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

// Form field context value (from react-hook-form integration)
export interface FormFieldContextValue<
  TFieldValues extends Record<string, any> = Record<string, any>,
  TName extends string = string
> {
  name: TName;
}

// Form item context value
export interface FormItemContextValue {
  id: string;
}

// Brand layout props
export interface BrandLayoutProps {
  children: React.ReactNode;
  params: Promise<{ userId: string; brandId: string }>;
}

// Loading states
export type LoadingState = "idle" | "loading" | "success" | "error";

// Theme types
export type Theme = "light" | "dark" | "system";

// Component variant types
export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
