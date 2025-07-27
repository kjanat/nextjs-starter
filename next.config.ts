import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Use remote bindings for D1 database access in development
// This enables hot reload while still having access to D1
initOpenNextCloudflareForDev({
  experimental: { remoteBindings: true },
});
