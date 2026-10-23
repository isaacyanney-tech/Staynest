import { Activity, BadgeCheck, Banknote, Building2, CreditCard, FileText, ImageIcon, LayoutDashboard, Palette, SlidersHorizontal, Users } from "lucide-react";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Building2 },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/plans", label: "Plans and prices", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: Banknote },
  { href: "/admin/settings", label: "Business settings", icon: SlidersHorizontal },
  { href: "/admin/content", label: "Pages and content", icon: FileText },
  { href: "/admin/media", label: "Media library", icon: ImageIcon },
  { href: "/admin/site", label: "Site and navigation", icon: Palette },
  { href: "/admin/activity", label: "Activity log", icon: Activity },
] as const;
