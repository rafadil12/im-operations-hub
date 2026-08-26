import type { Metadata } from "next";

export const SITE_NAME = "IM One";
export const SITE_TAGLINE = "Intelligent Operations, One Platform";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "IM One is the intelligent operations platform for factory teams: Daily Operation, ITSM, Safety, Sparepart, analytics and master data in one place.";

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
  /** Segment title only — always rendered as "{title} | IM One". */
  title: string;
  description: string;
  /** Route path, resolved against metadataBase for canonical and og:url. */
  path: string;
};

/**
 * Build page metadata with an absolute document title.
 *
 * Always uses `title.absolute` so nested layouts that set their own title
 * do not clear the root `%s | IM One` template (Next.js replaces the child
 * template stash with `null` when a parent exports a plain string title).
 */
export function pageMetadata({ title, description, path }: PageSeo): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: { absolute: fullTitle },
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
