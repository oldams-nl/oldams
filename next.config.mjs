/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static site: `next build` emits out/ for S3 + CloudFront. No server.
  output: "export",
  // Historical images are hot-linked from the archive CDN via plain <img>, so
  // Next's image optimizer (which needs a server) is irrelevant — disable it.
  images: { unoptimized: true },
  // Type errors still fail the build; ESLint isn't wired up for this project.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
