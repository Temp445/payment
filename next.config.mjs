/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = {
        level: "error",
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: "/subscriptions",
        destination: "/orders",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
