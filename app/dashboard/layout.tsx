import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { isSuperAdmin } from "@/lib/admin";
import { signOut } from "@/lib/actions/auth";
import Sidebar from "@/components/Sidebar";
import PoweredBy from "@/components/PoweredBy";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (isSuperAdmin(user)) redirect("/admin");

  const access = await getAccess();

  // مستخدم مسجّل بلا مطعم ولا عضوية → مالك جديد ينشئ مطعمه (onboarding)
  if (!access) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <form action={signOut}>
            <button className="text-sm rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/5">
              تسجيل الخروج
            </button>
          </form>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    );
  }

  const { restaurant, isOwner, sections } = access;

  // بوابة الموافقة (للمالك فقط)
  if (isOwner && restaurant.status !== "active") {
    const pending = restaurant.status === "pending";
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center rounded-2xl border border-black/10 bg-white p-8">
          <div className="text-5xl mb-3">{pending ? "⏳" : "🚫"}</div>
          <h1 className="text-xl font-bold">
            {pending ? "مطعمك قيد المراجعة" : "تم إيقاف الحساب"}
          </h1>
          <p className="text-black/60 mt-2 text-sm">
            {pending
              ? "سيراجع فريقنا طلب مطعمك ويُفعّله قريباً."
              : "تم إيقاف حساب مطعمك. يرجى التواصل مع الإدارة."}
          </p>
          <form action={signOut} className="mt-6">
            <button className="rounded-lg border border-black/15 px-5 py-2 text-sm hover:bg-black/5">
              تسجيل الخروج
            </button>
          </form>
          <div className="mt-6"><PoweredBy /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <aside className="w-64 shrink-0 border-l border-black/10 min-h-screen hidden md:flex flex-col">
        <div className="p-4 border-b border-black/10">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={restaurant.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <span className="text-xl">🍽️</span>
            )}
            <span className="truncate">{restaurant.name}</span>
          </Link>
        </div>
        <Sidebar sections={[...sections]} isOwner={isOwner} />
        <div className="mt-auto p-3 border-t border-black/10">
          <div className="text-xs text-black/50 mb-2 truncate px-1">
            {user.email}
            {!isOwner && <span className="text-brand"> · موظف</span>}
          </div>
          <form action={signOut}>
            <button className="w-full text-sm rounded-lg border border-black/15 py-2 hover:bg-black/5">
              تسجيل الخروج
            </button>
          </form>
          <div className="mt-3"><PoweredBy /></div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6">{children}</main>
    </div>
  );
}
