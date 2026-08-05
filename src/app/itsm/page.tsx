import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ITSM",
  description:
    "Manage and analyze ITSM tickets, review analytics, and maintain master data.",
  path: "/itsm",
});

const cards = [
  {
    href: "/itsm/management",
    key: "management" as const,
    icon: "▤",
  },
  {
    href: "/itsm/analysis",
    key: "analysis" as const,
    icon: "◔",
  },
  {
    href: "/itsm/master/users",
    key: "master" as const,
    icon: "◎",
  },
];

export default function ITSMPage() {
  const t = getDict();

  const titleFor = (key: (typeof cards)[number]["key"]) => {
    if (key === "management") return t.itsm.manageTitle;
    if (key === "analysis") return t.itsm.analysisTitle;
    return t.nav.master;
  };

  const descFor = (key: (typeof cards)[number]["key"]) => {
    if (key === "management") return t.itsm.manageDesc;
    if (key === "analysis") return t.itsm.analysisDesc;
    return t.itsm.masterDesc;
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-text">
          {t.itsm.title}
        </h1>
        <p className="text-sm text-text-muted">
          {t.itsm.subtitle}
        </p>
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

            <h2 className="text-sm font-semibold text-text">
              {titleFor(card.key)}
            </h2>

            <p className="mt-1 text-xs text-text-muted">
              {descFor(card.key)}
            </p>

            <span className="mt-4 text-xs font-medium text-accent group-hover:underline">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}