import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Class material uploads (Aula virtual P1) go through a Server Action, so
    // the request body limit must clear the 25 MiB bucket limit plus multipart
    // overhead. Keep this in sync with the `class-materials` bucket.
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
