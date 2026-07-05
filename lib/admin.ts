// مساعدات الأدمن الرئيسي (super admin)
import type { User } from "@supabase/supabase-js";

function adminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export function isSuperAdmin(user: User | null): boolean {
  return isSuperAdminEmail(user?.email);
}
