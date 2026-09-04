import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@venture-os/core", "@venture-os/schema", "@venture-os/ui", "@venture-os/config"],
};

export default config;
