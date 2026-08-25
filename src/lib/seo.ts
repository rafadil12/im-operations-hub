import type { Metadata } from "next";

export const SITE_NAME = "IM One";
export const SITE_TAGLINE = "Intelligent Operations, One Platform";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "IM One is the intelligent operations platform for factory teams: daily operation records, ITSM, analytics and master data in one place.";

/** Fallback keeps metadataBase valid in dev so relative canonical/OG URLs resolve. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Route served by app/opengraph-image.tsx. */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: SITE_TITLE,
};

type PageSeo = {
  /** Segment title only — the root layout appends " | IM One". */
  title: string;
  description: string;
  /** Route path, resolved against metadataBase for canonical and og:url. */
  path: string;
  /**
   * Pages in the same segment as the root layout must spell out the full title,
   * because a layout's title template never applies to its sibling page.
   */
  absoluteTitle?: boolean;
};

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PageSeo): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: fullTitle } : title,
    description,
    alternates: { canonical: path },
    // Nested segments replace the parent openGraph wholesale, so every page
    // repeats the shared fields instead of relying on inheritance.
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
  };
}
