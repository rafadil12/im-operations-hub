import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Daily Operation",
  description:
    "Manage and analyze daily operational records: create and track tasks, review analytics and maintain the module master data.",
  path: "/daily-operation",
});

const cards = [
  {
    href: "/daily-operation/management",
    key: "management" as const,
    icon: "▤",
  },
  {
    href: "/daily-operation/analysis",
    key: "analysis" as const,
    icon: "◔",
  },
  {
    href: "/daily-operation/master/users",
    key: "master" as const,
    icon: "◎",
  },
];

export default function DailyOperationPage() {
  const t = getDict();

  const titleFor = (key: (typeof cards)[number]["key"]) => {
    if (key === "management") return t.dailyOp.manageTitle;
    if (key === "analysis") return t.dailyOp.analysisTitle;
    return t.nav.master;
  };
  const descFor = (key: (typeof cards)[number]["key"]) => {
    if (key === "management") return t.dailyOp.manageDesc;
    if (key === "analysis") return t.dailyOp.analysisDesc;
    return t.dailyOp.masterDesc;
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-text">{t.dailyOp.title}</h1>
        <p className="text-sm text-text-muted">{t.dailyOp.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/50 hover:bg-surface-hover"
          >
            <span className="mb-3 inline-flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              {card.icon}
            </span>
            <h2 className="text-sm font-semibold text-text">{titleFor(card.key)}</h2>
            <p className="mt-1 text-xs text-text-muted">{descFor(card.key)}</p>
            <span className="mt-4 text-xs font-medium text-accent group-hover:underline">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
