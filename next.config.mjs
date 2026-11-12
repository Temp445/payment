/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
