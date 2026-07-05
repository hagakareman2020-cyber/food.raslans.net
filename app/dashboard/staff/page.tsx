import { requireOwner } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import StaffManager from "@/components/StaffManager";

export default async function StaffPage() {
  const restaurant = await requireOwner();
  const admin = createAdminClient();

  const { data: staff } = await admin
    .from("staff")
    .select("id, user_id, role, sections")
    .eq("restaurant_id", restaurant.id)
    .order("created_at");

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map(users?.users.map((u) => [u.id, u.email]) ?? []);

  const list = (staff ?? []).map((s) => ({
    ...s,
    sections: (s.sections as string[]) ?? [],
    email: emailById.get(s.user_id) ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">الموظفون والصلاحيات</h1>
      <p className="text-black/60 mb-6">
        أنشئ حسابات لموظفيك (كاشير، شيف، محاسب) وحدّد الأقسام التي يصل إليها كل موظف.
      </p>
      <StaffManager staff={list} />
    </div>
  );
}
