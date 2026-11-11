/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  webpack(config, { isServer, webpack }) {
    if (!isServer) {
      // PptxGenJS uses these modules only for Node file and network operations.
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^node:(fs|https)$/, (resource) => {
        if (resource.context.includes("pptxgenjs")) resource.request = resource.request.slice(5)
      }))
    }
    return config
  },
}

export default nextConfig
