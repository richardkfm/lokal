import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Surfaces accidental client-side state in the report tree early. The print
  // route must render fully server-side (see docs/adr/0002-print-first-pdf.md).
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
