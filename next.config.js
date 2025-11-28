/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Use custom build directory only for local development to avoid OneDrive locking
  ...(process.env.NODE_ENV !== 'production' && { distDir: '.next-dev' })
}

module.exports = nextConfig
