import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { DailyOperationLandingCards } from "@/components/daily-operation/DailyOperationLandingCards";

export const metadata = pageMetadata({
  title: "Daily Operation",
  description:
    "Manage and analyze daily operational records: create and track tasks, review analytics and maintain the module master data.",
  path: "/daily-operation",
});

export default function DailyOperationPage() {
  const t = getDict();

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-text">{t.dailyOp.title}</h1>
        <p className="text-sm text-text-muted">{t.dailyOp.subtitle}</p>
      </div>

      <DailyOperationLandingCards />
    </div>
  );
}
