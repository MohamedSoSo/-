import type { Config } from "tailwindcss";
import { bbqPreset } from "@bbq/config/tailwind.preset";

const config: Config = {
  presets: [bbqPreset as Config],
  content: ["./app/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
