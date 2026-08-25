import { pageMetadata } from "@/lib/seo";
import { PicManager } from "@/components/daily-operation/master/PicManager";

export const metadata = pageMetadata({
  title: "PIC · Master Data",
  description: "Assign login accounts that can appear as PIC on Daily Operation activities.",
  path: "/daily-operation/master/users",
});

export default function MasterUsersPage() {
  return <PicManager />;
}
