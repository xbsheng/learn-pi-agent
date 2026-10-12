import type { MetadataRoute } from "next";
import { LEARNING_PATH } from "@/lib/constants";
import { SITE_URL, LOCALES } from "@/lib/site";

export const dynamic = "force-static";

const PATHS = ["", ...LEARNING_PATH.map((v) => `/${v}`), "/timeline", "/compare", "/layers"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const alternates = (path: string) => ({
    languages: Object.fromEntries(
      LOCALES.map((locale) => [locale, `${SITE_URL}/${locale}${path}/`])
    ),
  });

  return PATHS.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}/`,
      lastModified,
      alternates: alternates(path),
    }))
  );
}
