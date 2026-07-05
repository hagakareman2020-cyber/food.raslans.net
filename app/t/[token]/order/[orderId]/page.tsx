import OrderTracker from "@/components/OrderTracker";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ token: string; orderId: string }>;
}) {
  const { token, orderId } = await params;
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <OrderTracker token={token} orderId={orderId} />
    </div>
  );
}
