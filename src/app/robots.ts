import type { MetadataRoute } from "next";

// Internal operations tool: no crawler should index any route.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
