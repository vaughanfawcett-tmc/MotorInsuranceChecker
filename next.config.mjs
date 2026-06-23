/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Anthropic SDK and Prisma are server-only; keep them out of the client bundle.
  serverExternalPackages: ["@prisma/client", "@anthropic-ai/sdk"],
};

export default nextConfig;
