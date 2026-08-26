import { pageMetadata } from "@/lib/seo";
import PostGoodsMovementPage from "./PostClient";

export const metadata = pageMetadata({
  title: "Stock Transactions · Sparepart",
  description: "Receive, issue, or transfer stock between storage locations.",
  path: "/sparepart/post",
});

export default function PostPage() {
  return <PostGoodsMovementPage />;
}
