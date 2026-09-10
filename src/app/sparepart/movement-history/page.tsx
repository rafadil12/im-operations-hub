import { pageMetadata } from "@/lib/seo";
import MovementHistoryPage from "./MovementHistoryClient";

export const metadata = pageMetadata({
  title: "Movement History · Sparepart",
  description: "Ledger of goods movements for one material.",
  path: "/sparepart/movement-history",
});

export default function Page() {
  return <MovementHistoryPage />;
}
