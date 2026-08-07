import { AdminGate } from "@/components/settings/AdminGate";

export default function DailyOperationMasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGate>{children}</AdminGate>;
}
