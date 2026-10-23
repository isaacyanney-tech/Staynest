import { Activity, BadgeCheck, Building2, CreditCard, LayoutDashboard, SlidersHorizontal, Users } from "lucide-react";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Building2 },
  { href: "/admin/verification", label: "Verification", icon: BadgeCheck },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/plans", label: "Plans and prices", icon: CreditCard },
  { href: "/admin/settings", label: "Business settings", icon: SlidersHorizontal },
  { href: "/admin/activity", label: "Activity log", icon: Activity },
] as const;
