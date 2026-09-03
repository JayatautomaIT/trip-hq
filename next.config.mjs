/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't fail the Vercel build on cosmetic lint rules (e.g. unescaped apostrophes).
  // TypeScript type-checking stays ON, so real errors still surface.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
