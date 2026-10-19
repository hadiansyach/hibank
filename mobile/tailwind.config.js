/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Calm Confidence Surface Hierarchy
        surface: "#FAF9F6",
        "surface-dim": "#DBDCD7",
        "surface-secondary": "#EFEDF3",
        "surface-elevated": "#FFFFFF",
        "surface-container-low": "#F4F3F0",
        "surface-container": "#EFEEEB",
        "surface-container-high": "#E9E8E5",
        "surface-container-highest": "#E3E2DF",

        // Brand Voice
        primary: "#4D39BF",
        "on-primary": "#FFFFFF",
        "primary-container": "#6654D9",
        "on-primary-container": "#ECE7FF",
        "primary-fixed": "#E5DEFF",

        // Secondary & Accents
        secondary: "#5B4DBF",
        "on-secondary": "#FFFFFF",
        "secondary-container": "#9689FF",
        "on-secondary-container": "#2C1390",
        "secondary-fixed": "#E4DFFF",
        "lavender-tint": "#EAE7FB",

        // Typography & Lines
        "text-primary": "#282734",
        "text-secondary": "#747280",
        "border-subtle": "#E5E2E9",
        outline: "#787585",
        "outline-variant": "#C9C4D6",

        // Subdued Semantics
        "success-bg": "#E8F1EA",
        "success-text": "#367A5A",
        "warning-bg": "#F4EDDF",
        "warning-text": "#946B32",
        "error-bg": "#F7E9E8",
        "error-text": "#B85358",
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
    },
  },
  plugins: [],
};
