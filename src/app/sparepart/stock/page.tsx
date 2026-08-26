import { pageMetadata } from "@/lib/seo";
import StockOverviewPage from "./StockClient";

export const metadata = pageMetadata({
  title: "Stock Overview · Sparepart",
  description:
    "Current stock by material — totals across all storage locations, stock changes only via goods movements.",
  path: "/sparepart/stock",
});

export default function StockPage() {
  return <StockOverviewPage />;
}
