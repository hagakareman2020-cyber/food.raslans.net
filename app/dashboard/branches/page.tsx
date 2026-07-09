import { redirect } from "next/navigation";
import { getAccess } from "@/lib/access";
import BranchesManager from "@/components/BranchesManager";

export default async function BranchesPage() {
  const access = await getAccess();
  if (!access || !access.isOwner) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">الفروع</h1>
      <p className="text-black/60 mb-6">
        أدِر فروع مطعمك. اختر فرعاً للدخول إلى كل إعداداته (المنيو، المخزون، الترابيزات،
        الطلبات، الموظفون).
      </p>
      <BranchesManager branches={access.branches} activeId={access.restaurant.id} />
    </div>
  );
}
