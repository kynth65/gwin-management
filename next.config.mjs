/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.shopify.com",
      },
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
