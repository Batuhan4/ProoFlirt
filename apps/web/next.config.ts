import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

const baseConfig: NextConfig = {
  reactStrictMode: true
};

const withPWAFn = withPWA({
  dest: "public",
  disable: false,
  register: true,
  skipWaiting: true
});

export default isDev ? baseConfig : withPWAFn(baseConfig);
