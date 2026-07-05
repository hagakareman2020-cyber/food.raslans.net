import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { signOut } from "@/lib/actions/auth";
import PoweredBy from "@/components/PoweredBy";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect("/dashboard");

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <span className="text-xl">🛡️</span>
          <span>لوحة الأدمن — قبول المطاعم</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs text-black/50 dark:text-white/50">{user.email}</span>
          <form action={signOut}>
            <button className="text-sm rounded-lg border border-black/15 dark:border-white/15 px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
              خروج
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
      <footer className="py-4 border-t border-black/10 dark:border-white/10">
        <PoweredBy />
      </footer>
    </div>
  );
}
