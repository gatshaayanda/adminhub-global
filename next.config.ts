import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // UploadThing
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ufs.sh",
        pathname: "/**",
      },

      // Existing old Pixabay blog images
      {
        protocol: "https",
        hostname: "cdn.pixabay.com",
        pathname: "/**",
      },

      // Older Firebase Storage images, if any still exist
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },

  // Keep this if you still want builds to pass even with TS errors
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;