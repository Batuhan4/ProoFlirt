import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const baseConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@prooflirt/sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "aggregator.walrus.xyz"
      },
      {
        protocol: "https",
        hostname: "aggregator.walrus-testnet.walrus.space"
      }
    ]
  }
};

const withPWAFn = withPWA({
  dest: "public",
  disable: false,
  register: true,
  skipWaiting: true
});

export default isDev ? baseConfig : withPWAFn(baseConfig);
