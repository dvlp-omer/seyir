/** Seyir tanıtım sayfası — Tailwind ayarları. Renkler uygulamanın kimliğinden:
 *  derin deniz (obsidyen zemin), su/camgöbeği vurgu, logodaki turuncu. */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "Consolas", "monospace"],
      },
      colors: {
        obsidyen: "#05070a",
        derin: "#0b1620",
        su: { 300: "#8be3ee", 400: "#5fd3e0", 500: "#2bb8c9", 600: "#1d8fa0" },
        dumen: { 400: "#ff8a52", 500: "#ee6a2f" },
      },
      keyframes: {
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(6%,-4%,0) scale(1.08)" },
          "66%": { transform: "translate3d(-5%,5%,0) scale(.95)" },
        },
        kayan: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        parilti: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        imlec: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0 } },
      },
      animation: {
        aurora: "aurora 18s ease-in-out infinite",
        "aurora-yavas": "aurora 26s ease-in-out infinite reverse",
        kayan: "kayan 40s linear infinite",
        parilti: "parilti 6s linear infinite",
        imlec: "imlec 1s step-end infinite",
      },
    },
  },
  plugins: [],
};
