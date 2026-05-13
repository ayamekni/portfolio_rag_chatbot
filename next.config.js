/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node'],
  },
};

module.exports = nextConfig;
