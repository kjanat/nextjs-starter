import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Local emulations of bindings
initOpenNextCloudflareForDev();

// Remote emulations of bindings
/* initOpenNextCloudflareForDev({
 experimental: { remoteBindings: true }
}); */
