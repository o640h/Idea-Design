import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating indicator overlaps the editor; errors still open the overlay.
  devIndicators: false,
};

export default nextConfig;
