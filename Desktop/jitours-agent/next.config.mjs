/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR lets a second dev server (e.g. for QA) run without overwriting the main .next build.
const nextConfig = { distDir: process.env.NEXT_DIST_DIR || ".next" };

export default nextConfig;
