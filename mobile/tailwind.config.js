/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Canvas & Structural Layers
        "canvas": "#f7f8fa",
        "background": "#f7f8fa",
        "surface": "#f7f8fa",
        "surface-lowest": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "surface-low": "#f0f2f6",
        "surface-container-low": "#f0f2f6",
        "surface-container": "#e9edff",
        "surface-high": "#e1e8ff",
        "surface-container-high": "#e1e8ff",
        "surface-highest": "#d9e2fc",
        "surface-container-highest": "#d9e2fc",
        "surface-variant": "#d9e2fc",
        "surface-bright": "#ffffff",
        "surface-dim": "#d1daf4",
        "surface-tint": "#4c5e83",

        // Outlines & Dividers
        "outline": "#75777f",
        "outline-variant": "#e2e6ed",

        // Brand & Primary Midnight Navy
        "primary": "#001637",
        "primary-container": "#172b4d",
        "on-primary": "#ffffff",
        "on-primary-container": "#8093bb",
        "primary-fixed": "#d7e2ff",
        "primary-fixed-dim": "#b4c7f1",
        "on-primary-fixed": "#041b3c",
        "on-primary-fixed-variant": "#34476a",
        "inverse-primary": "#b4c7f1",

        // Interactive Electric Indigo
        "secondary": "#384cd3",
        "secondary-container": "#5366ed",
        "secondary-fixed": "#dfe0ff",
        "secondary-fixed-dim": "#bcc2ff",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#fffbff",
        "on-secondary-fixed": "#000c61",
        "on-secondary-fixed-variant": "#1c32be",

        // Micro-Accent Citrus Lime
        "tertiary": "#131900",
        "tertiary-container": "#262f00",
        "tertiary-fixed": "#d7f36a",
        "tertiary-fixed-dim": "#b7d24d",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#849d19",
        "on-tertiary-fixed": "#181e00",
        "on-tertiary-fixed-variant": "#3f4c00",

        // Typography Content
        "on-surface": "#172033",
        "on-surface-variant": "#697386",
        "inverse-surface": "#273044",
        "inverse-on-surface": "#edf0ff",
        "on-background": "#172033",

        // Status Feedback
        "success": {
          DEFAULT: "#176B4A",
          container: "#E5F6EE",
        },
        "success-container": "#E5F6EE",
        "error": {
          DEFAULT: "#A61B1B",
          container: "#FCE8E8",
        },
        "error-container": "#FCE8E8",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "warning": {
          DEFAULT: "#8A5B00",
          container: "#FFF4D6",
        },
        "warning-container": "#FFF4D6",
      },
      borderRadius: {
        control: "14px",
        card: "18px",
        hero: "22px",
        sheet: "28px",
      },
      boxShadow: {
        card: "0 4px 16px rgba(23, 43, 77, 0.04)",
        hero: "0 12px 28px rgba(23, 43, 77, 0.16)",
      },
      spacing: {
        "13": "3.25rem",
      },
    },
  },
  plugins: [],
};
