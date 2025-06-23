/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["socket.io"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add output configuration for standalone deployment
  output: "standalone",
  // Ensure proper handling of API routes
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "/api/socket/:path*",
      },
    ]
  },
}

module.exports = nextConfig
