/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/trpc$/, "") || "http://localhost:8000";
    return [
      {
        source: "/trpc/:path*",
        destination: `${apiUrl}/trpc/:path*`,
      },
    ];
  },
};

export default nextConfig;
