import { pageMetadata } from "@/lib/seo";
import MovementHistoryPage from "./MovementHistoryClient";

export const metadata = pageMetadata({
  title: "Movement History · Sparepart",
  description: "Line-level goods movements by material, type, location, or date.",
  path: "/sparepart/movement-history",
});

export default function Page() {
  return <MovementHistoryPage />;
}
