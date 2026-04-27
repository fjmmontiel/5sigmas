export const DEFAULT_VIDEO_MOOD = "deep-night";

const MOOD_THEME = {
  "deep-night": {
    label: "Deep Night",
    bgTop: "#061120",
    bgBase: "#0a1324",
    bgBottom: "#0d1a31",
    accent1: "#26A69A",
    accent2: "#324AB2",
    accent3: "#FFB343",
    footerDim: "rgba(240,244,255,.30)",
    seriesTag: "rgba(240,244,255,.42)",
    subtitle: "rgba(240,244,255,.66)",
    decoShadow: "drop-shadow(0 30px 90px rgba(3, 10, 22, 0.52))",
  },
  "steel-mist": {
    label: "Steel Mist",
    bgTop: "#2e4f72",
    bgBase: "#284768",
    bgBottom: "#1d3755",
    accent1: "#a7d4f0",
    accent2: "#6f92ca",
    accent3: "#dcc08a",
    footerDim: "rgba(240,244,255,.40)",
    seriesTag: "rgba(240,244,255,.56)",
    subtitle: "rgba(240,244,255,.80)",
    decoShadow: "drop-shadow(0 24px 82px rgba(17, 35, 58, 0.40))",
  },
  "steel-dawn": {
    label: "Steel Dawn",
    bgTop: "#203955",
    bgBase: "#1b324d",
    bgBottom: "#12253d",
    accent1: "#8fc7eb",
    accent2: "#5679b8",
    accent3: "#d7b47a",
    footerDim: "rgba(240,244,255,.38)",
    seriesTag: "rgba(240,244,255,.52)",
    subtitle: "rgba(240,244,255,.76)",
    decoShadow: "drop-shadow(0 26px 88px rgba(13, 29, 52, 0.44))",
  },
  "steel-harbor": {
    label: "Steel Harbor",
    bgTop: "#1a314b",
    bgBase: "#162a42",
    bgBottom: "#102033",
    accent1: "#8bbede",
    accent2: "#5f7ead",
    accent3: "#c7a66f",
    footerDim: "rgba(240,244,255,.36)",
    seriesTag: "rgba(240,244,255,.50)",
    subtitle: "rgba(240,244,255,.72)",
    decoShadow: "drop-shadow(0 28px 90px rgba(10, 22, 40, 0.48))",
  },
  "steel-dusk": {
    label: "Steel Dusk",
    bgTop: "#15273d",
    bgBase: "#132235",
    bgBottom: "#0d1828",
    accent1: "#7daecc",
    accent2: "#536f99",
    accent3: "#b8945e",
    footerDim: "rgba(240,244,255,.33)",
    seriesTag: "rgba(240,244,255,.46)",
    subtitle: "rgba(240,244,255,.69)",
    decoShadow: "drop-shadow(0 30px 92px rgba(7, 15, 30, 0.54))",
  },
  "steel-night": {
    label: "Steel Night",
    bgTop: "#101c2d",
    bgBase: "#0e1827",
    bgBottom: "#09111d",
    accent1: "#759fc0",
    accent2: "#4a648d",
    accent3: "#ac8854",
    footerDim: "rgba(240,244,255,.30)",
    seriesTag: "rgba(240,244,255,.42)",
    subtitle: "rgba(240,244,255,.65)",
    decoShadow: "drop-shadow(0 32px 96px rgba(4, 10, 20, 0.58))",
  },
  "steel-teal": {
    label: "Steel Teal",
    bgTop: "#1a232b",
    bgBase: "#161e25",
    bgBottom: "#11171d",
    accent1: "#59b3a9",
    accent2: "#76b7d8",
    accent3: "#c7ab76",
    footerDim: "rgba(236,245,244,.33)",
    seriesTag: "rgba(236,245,244,.47)",
    subtitle: "rgba(236,245,244,.72)",
    decoShadow: "drop-shadow(0 30px 92px rgba(5, 15, 20, 0.54))",
  },
  "steel-amber": {
    label: "Steel Amber",
    bgTop: "#22262d",
    bgBase: "#1d2128",
    bgBottom: "#16191f",
    accent1: "#8bb8d8",
    accent2: "#c99158",
    accent3: "#6e88ad",
    footerDim: "rgba(244,240,233,.33)",
    seriesTag: "rgba(244,240,233,.48)",
    subtitle: "rgba(244,240,233,.72)",
    decoShadow: "drop-shadow(0 30px 92px rgba(8, 11, 16, 0.56))",
  },
  "amber-grid": {
    label: "Amber Haze",
    bgTop: "#201b19",
    bgBase: "#1b1716",
    bgBottom: "#171515",
    accent1: "#d8a35d",
    accent2: "#bb7140",
    accent3: "#7aa9d4",
    footerDim: "rgba(255,241,224,.32)",
    seriesTag: "rgba(255,241,224,.48)",
    subtitle: "rgba(245,235,223,.74)",
    decoShadow: "drop-shadow(0 28px 94px rgba(24, 10, 4, 0.58))",
  },
  "amber-steel": {
    label: "Amber Steel",
    bgTop: "#231d1b",
    bgBase: "#1f1b19",
    bgBottom: "#191716",
    accent1: "#d39a63",
    accent2: "#8aaece",
    accent3: "#b87549",
    footerDim: "rgba(245,237,228,.34)",
    seriesTag: "rgba(245,237,228,.49)",
    subtitle: "rgba(245,237,228,.73)",
    decoShadow: "drop-shadow(0 30px 92px rgba(17, 9, 7, 0.56))",
  },
  "teal-slate": {
    label: "Teal Slate",
    bgTop: "#172224",
    bgBase: "#141d1f",
    bgBottom: "#111719",
    accent1: "#3b9f96",
    accent2: "#74b7dd",
    accent3: "#8fd1c1",
    footerDim: "rgba(240,244,255,.31)",
    seriesTag: "rgba(233,247,244,.46)",
    subtitle: "rgba(233,247,244,.70)",
    decoShadow: "drop-shadow(0 30px 90px rgba(3, 15, 18, 0.56))",
  },
  "teal-amber": {
    label: "Teal Amber",
    bgTop: "#1b2220",
    bgBase: "#181d1c",
    bgBottom: "#151817",
    accent1: "#57aaa1",
    accent2: "#d0a060",
    accent3: "#7cb7ce",
    footerDim: "rgba(238,243,239,.33)",
    seriesTag: "rgba(238,243,239,.47)",
    subtitle: "rgba(238,243,239,.71)",
    decoShadow: "drop-shadow(0 30px 92px rgba(9, 13, 12, 0.56))",
  },
  "signal-bloom": {
    label: "Signal Bloom",
    bgTop: "#151a22",
    bgBase: "#131821",
    bgBottom: "#10141b",
    accent1: "#8abede",
    accent2: "#d7a55f",
    accent3: "#3b9f96",
    footerDim: "rgba(240,244,255,.34)",
    seriesTag: "rgba(240,244,255,.48)",
    subtitle: "rgba(240,244,255,.72)",
    decoShadow: "drop-shadow(0 32px 96px rgba(4, 12, 24, 0.60))",
  },
};

const MOOD_SCENES = {
  "deep-night": {
    bodyBg: [
      "radial-gradient(circle at 83% 18%, rgba(50,74,178,0.24) 0%, transparent 28%)",
      "radial-gradient(circle at 14% 92%, rgba(38,166,154,0.14) 0%, transparent 24%)",
      "linear-gradient(180deg, rgba(255,255,255,.02) 0%, transparent 20%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 50%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "radial-gradient(circle at 80% 20%, rgba(124,199,255,.12) 0%, transparent 24%)",
      "radial-gradient(circle at 18% 86%, rgba(38,166,154,.07) 0%, transparent 22%)",
      "linear-gradient(180deg, rgba(255,255,255,.018) 0%, transparent 34%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 50%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(circle, rgba(50,74,178,.48) 0%, rgba(38,166,154,.16) 36%, transparent 72%)",
    auraInset: "auto -110px -110px auto",
    auraSize: "760px",
    auraOpacity: ".14",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.020) 1px, transparent 1px)",
      "radial-gradient(ellipse at 76% 24%, rgba(124,199,255,.035) 0%, transparent 40%)",
    ].join(",\n      "),
    textureSize: "72px 72px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(110deg, transparent 0%, rgba(124,199,255,.02) 58%, transparent 100%)",
    titleGlow: "none",
  },
  "steel-mist": {
    bodyBg: [
      "linear-gradient(180deg, rgba(255,255,255,.16) 0%, transparent 20%)",
      "radial-gradient(circle at 16% 10%, rgba(255,255,255,.22) 0%, transparent 26%)",
      "radial-gradient(circle at 86% 28%, rgba(167,212,240,.18) 0%, transparent 24%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(145deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.03) 24%, transparent 40%)",
      "radial-gradient(circle at 16% 12%, rgba(255,255,255,.16) 0%, transparent 22%)",
      "linear-gradient(90deg, rgba(167,212,240,.09) 0%, transparent 38%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(255,255,255,.24) 0%, rgba(167,212,240,.16) 32%, transparent 72%)",
    auraInset: "-180px auto auto -120px",
    auraSize: "920px 620px",
    auraOpacity: ".18",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.024) 1px, transparent 1px)",
      "radial-gradient(ellipse at 18% 14%, rgba(255,255,255,.10) 0%, transparent 32%)",
    ].join(",\n      "),
    textureSize: "84px 84px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(120deg, rgba(255,255,255,.05) 0%, transparent 28%, transparent 100%)",
    titleGlow: "0 10px 26px rgba(255,255,255,.05)",
  },
  "steel-dawn": {
    bodyBg: [
      "linear-gradient(180deg, rgba(255,255,255,.12) 0%, transparent 22%)",
      "radial-gradient(circle at 18% 8%, rgba(255,255,255,.18) 0%, transparent 28%)",
      "radial-gradient(circle at 88% 34%, rgba(139,214,255,.16) 0%, transparent 26%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(145deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.02) 26%, transparent 42%)",
      "radial-gradient(circle at 14% 10%, rgba(255,255,255,.18) 0%, transparent 24%)",
      "linear-gradient(90deg, rgba(139,214,255,.10) 0%, transparent 40%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(255,255,255,.28) 0%, rgba(139,214,255,.18) 30%, transparent 72%)",
    auraInset: "-180px auto auto -120px",
    auraSize: "920px 620px",
    auraOpacity: ".20",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.022) 1px, transparent 1px)",
      "radial-gradient(ellipse at 14% 12%, rgba(255,255,255,.08) 0%, transparent 32%)",
    ].join(",\n      "),
    textureSize: "80px 80px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(120deg, rgba(255,255,255,.04) 0%, transparent 28%, transparent 100%)",
    titleGlow: "0 10px 28px rgba(255,255,255,.05)",
  },
  "steel-harbor": {
    bodyBg: [
      "linear-gradient(180deg, rgba(255,255,255,.10) 0%, transparent 20%)",
      "radial-gradient(circle at 16% 10%, rgba(255,255,255,.14) 0%, transparent 24%)",
      "radial-gradient(circle at 86% 30%, rgba(139,190,222,.14) 0%, transparent 24%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(145deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.02) 24%, transparent 40%)",
      "radial-gradient(circle at 14% 10%, rgba(255,255,255,.11) 0%, transparent 22%)",
      "linear-gradient(90deg, rgba(139,190,222,.08) 0%, transparent 36%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(255,255,255,.18) 0%, rgba(139,190,222,.14) 30%, transparent 72%)",
    auraInset: "-160px auto auto -120px",
    auraSize: "860px 600px",
    auraOpacity: ".16",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.020) 1px, transparent 1px)",
      "radial-gradient(ellipse at 16% 12%, rgba(255,255,255,.06) 0%, transparent 30%)",
    ].join(",\n      "),
    textureSize: "82px 82px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(120deg, rgba(255,255,255,.03) 0%, transparent 28%, transparent 100%)",
    titleGlow: "0 10px 24px rgba(255,255,255,.04)",
  },
  "steel-dusk": {
    bodyBg: [
      "linear-gradient(180deg, rgba(255,255,255,.06) 0%, transparent 18%)",
      "radial-gradient(circle at 18% 10%, rgba(255,255,255,.08) 0%, transparent 22%)",
      "radial-gradient(circle at 86% 28%, rgba(125,174,204,.12) 0%, transparent 22%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(145deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.015) 22%, transparent 38%)",
      "radial-gradient(circle at 14% 10%, rgba(255,255,255,.08) 0%, transparent 20%)",
      "linear-gradient(90deg, rgba(125,174,204,.07) 0%, transparent 34%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(255,255,255,.12) 0%, rgba(125,174,204,.12) 30%, transparent 72%)",
    auraInset: "-140px auto auto -100px",
    auraSize: "820px 560px",
    auraOpacity: ".14",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.018) 1px, transparent 1px)",
      "radial-gradient(ellipse at 16% 12%, rgba(255,255,255,.045) 0%, transparent 30%)",
    ].join(",\n      "),
    textureSize: "80px 80px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(120deg, rgba(255,255,255,.025) 0%, transparent 28%, transparent 100%)",
    titleGlow: "0 8px 20px rgba(255,255,255,.03)",
  },
  "steel-night": {
    bodyBg: [
      "linear-gradient(180deg, rgba(255,255,255,.04) 0%, transparent 18%)",
      "radial-gradient(circle at 18% 10%, rgba(255,255,255,.05) 0%, transparent 20%)",
      "radial-gradient(circle at 84% 26%, rgba(117,159,192,.10) 0%, transparent 20%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(145deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.012) 20%, transparent 36%)",
      "radial-gradient(circle at 14% 10%, rgba(255,255,255,.05) 0%, transparent 18%)",
      "linear-gradient(90deg, rgba(117,159,192,.06) 0%, transparent 32%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(255,255,255,.08) 0%, rgba(117,159,192,.10) 30%, transparent 72%)",
    auraInset: "-120px auto auto -90px",
    auraSize: "780px 520px",
    auraOpacity: ".12",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.016) 1px, transparent 1px)",
      "radial-gradient(ellipse at 16% 12%, rgba(255,255,255,.035) 0%, transparent 28%)",
    ].join(",\n      "),
    textureSize: "78px 78px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(120deg, rgba(255,255,255,.018) 0%, transparent 28%, transparent 100%)",
    titleGlow: "0 8px 18px rgba(255,255,255,.02)",
  },
  "steel-teal": {
    bodyBg: [
      "linear-gradient(180deg, rgba(255,255,255,.04) 0%, transparent 18%)",
      "radial-gradient(circle at 18% 10%, rgba(118,183,216,.08) 0%, transparent 22%)",
      "radial-gradient(circle at 84% 24%, rgba(89,179,169,.10) 0%, transparent 22%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(145deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.012) 22%, transparent 36%)",
      "radial-gradient(circle at 16% 12%, rgba(118,183,216,.06) 0%, transparent 20%)",
      "linear-gradient(90deg, rgba(89,179,169,.05) 0%, transparent 34%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(118,183,216,.10) 0%, rgba(89,179,169,.08) 32%, transparent 72%)",
    auraInset: "-130px auto auto -96px",
    auraSize: "780px 540px",
    auraOpacity: ".14",
    textureBg: [
      "radial-gradient(circle, rgba(236,245,244,.018) 1px, transparent 1px)",
      "radial-gradient(ellipse at 18% 14%, rgba(89,179,169,.05) 0%, transparent 30%)",
    ].join(",\n      "),
    textureSize: "78px 78px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(118deg, rgba(118,183,216,.018) 0%, transparent 28%, transparent 100%)",
    titleGlow: "0 8px 18px rgba(89,179,169,.03)",
  },
  "steel-amber": {
    bodyBg: [
      "linear-gradient(180deg, rgba(255,255,255,.04) 0%, transparent 18%)",
      "radial-gradient(circle at 18% 10%, rgba(139,184,216,.08) 0%, transparent 22%)",
      "radial-gradient(circle at 84% 78%, rgba(201,145,88,.10) 0%, transparent 24%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(145deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.012) 22%, transparent 36%)",
      "radial-gradient(circle at 16% 12%, rgba(139,184,216,.06) 0%, transparent 20%)",
      "linear-gradient(90deg, rgba(201,145,88,.045) 0%, transparent 34%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(139,184,216,.12) 0%, rgba(201,145,88,.10) 34%, transparent 72%)",
    auraInset: "-138px auto auto -100px",
    auraSize: "800px 540px",
    auraOpacity: ".14",
    textureBg: [
      "radial-gradient(circle, rgba(244,240,233,.018) 1px, transparent 1px)",
      "radial-gradient(ellipse at 82% 82%, rgba(201,145,88,.05) 0%, transparent 30%)",
    ].join(",\n      "),
    textureSize: "78px 78px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(112deg, rgba(201,145,88,.016) 0%, transparent 26%, transparent 100%)",
    titleGlow: "0 8px 18px rgba(201,145,88,.03)",
  },
  "amber-grid": {
    bodyBg: [
      "linear-gradient(180deg, rgba(216,163,93,.035) 0%, transparent 16%)",
      "radial-gradient(circle at 78% 88%, rgba(216,163,93,.14) 0%, transparent 24%)",
      "linear-gradient(180deg, rgba(187,113,64,.04) 0%, transparent 34%, rgba(216,163,93,.05) 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 52%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(180deg, rgba(216,163,93,.03) 0%, transparent 18%)",
      "radial-gradient(circle at 80% 76%, rgba(216,163,93,.11) 0%, transparent 22%)",
      "linear-gradient(0deg, rgba(187,113,64,.05) 0%, transparent 34%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(216,163,93,.18) 0%, rgba(187,113,64,.08) 34%, transparent 72%)",
    auraInset: "auto -140px -100px auto",
    auraSize: "900px 500px",
    auraOpacity: ".16",
    textureBg: [
      "radial-gradient(circle, rgba(255,241,224,.020) 1px, transparent 1px)",
      "radial-gradient(ellipse at 80% 82%, rgba(216,163,93,.08) 0%, transparent 34%)",
    ].join(",\n      "),
    textureSize: "76px 76px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(90deg, transparent 0%, transparent 56%, rgba(216,163,93,.018) 100%)",
    titleGlow: "0 10px 30px rgba(216,163,93,.04)",
  },
  "amber-steel": {
    bodyBg: [
      "linear-gradient(180deg, rgba(216,163,93,.035) 0%, transparent 16%)",
      "radial-gradient(circle at 78% 84%, rgba(211,154,99,.12) 0%, transparent 24%)",
      "radial-gradient(circle at 18% 14%, rgba(138,174,206,.08) 0%, transparent 24%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 50%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(180deg, rgba(216,163,93,.03) 0%, transparent 18%)",
      "radial-gradient(circle at 78% 76%, rgba(211,154,99,.08) 0%, transparent 22%)",
      "linear-gradient(90deg, rgba(138,174,206,.04) 0%, transparent 30%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(211,154,99,.14) 0%, rgba(138,174,206,.10) 34%, transparent 72%)",
    auraInset: "auto -126px -96px auto",
    auraSize: "840px 500px",
    auraOpacity: ".14",
    textureBg: [
      "radial-gradient(circle, rgba(245,237,228,.018) 1px, transparent 1px)",
      "radial-gradient(ellipse at 18% 12%, rgba(138,174,206,.045) 0%, transparent 30%)",
    ].join(",\n      "),
    textureSize: "76px 76px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(96deg, transparent 0%, transparent 54%, rgba(211,154,99,.016) 100%)",
    titleGlow: "0 8px 20px rgba(211,154,99,.03)",
  },
  "teal-slate": {
    bodyBg: [
      "radial-gradient(ellipse at 72% 28%, rgba(59,159,150,.10) 0%, transparent 24%)",
      "linear-gradient(90deg, rgba(59,159,150,.045) 0%, transparent 24%, transparent 100%)",
      "linear-gradient(180deg, rgba(255,255,255,.02) 0%, transparent 18%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 52%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(90deg, rgba(59,159,150,.08) 0%, rgba(59,159,150,.02) 18%, transparent 34%)",
      "radial-gradient(ellipse at 74% 26%, rgba(143,209,193,.07) 0%, transparent 22%)",
      "linear-gradient(180deg, rgba(255,255,255,.018) 0%, transparent 30%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 50%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(59,159,150,.16) 0%, rgba(116,183,221,.08) 34%, transparent 72%)",
    auraInset: "100px -180px auto auto",
    auraSize: "540px 840px",
    auraOpacity: ".16",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.018) 1px, transparent 1px)",
      "radial-gradient(ellipse at 72% 30%, rgba(59,159,150,.06) 0%, transparent 34%)",
    ].join(",\n      "),
    textureSize: "84px 84px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(90deg, rgba(59,159,150,.022) 0%, transparent 24%, transparent 100%)",
    titleGlow: "0 10px 28px rgba(59,159,150,.05)",
  },
  "teal-amber": {
    bodyBg: [
      "radial-gradient(ellipse at 72% 28%, rgba(87,170,161,.10) 0%, transparent 22%)",
      "radial-gradient(circle at 20% 82%, rgba(208,160,96,.09) 0%, transparent 20%)",
      "linear-gradient(180deg, rgba(255,255,255,.018) 0%, transparent 18%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 50%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "linear-gradient(90deg, rgba(87,170,161,.06) 0%, rgba(87,170,161,.02) 18%, transparent 34%)",
      "radial-gradient(circle at 76% 78%, rgba(208,160,96,.07) 0%, transparent 20%)",
      "linear-gradient(180deg, rgba(255,255,255,.015) 0%, transparent 28%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 50%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(ellipse, rgba(87,170,161,.12) 0%, rgba(208,160,96,.09) 34%, transparent 72%)",
    auraInset: "90px -150px auto auto",
    auraSize: "560px 760px",
    auraOpacity: ".14",
    textureBg: [
      "radial-gradient(circle, rgba(238,243,239,.018) 1px, transparent 1px)",
      "radial-gradient(ellipse at 78% 80%, rgba(208,160,96,.04) 0%, transparent 28%)",
    ].join(",\n      "),
    textureSize: "82px 82px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(100deg, rgba(87,170,161,.016) 0%, transparent 26%, rgba(208,160,96,.014) 100%)",
    titleGlow: "0 8px 18px rgba(87,170,161,.03)",
  },
  "signal-bloom": {
    bodyBg: [
      "radial-gradient(circle at 82% 16%, rgba(138,190,222,.14) 0%, transparent 22%)",
      "radial-gradient(circle at 18% 84%, rgba(215,165,95,.11) 0%, transparent 20%)",
      "linear-gradient(120deg, rgba(255,255,255,.04) 0%, transparent 24%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 50%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    beatBg: [
      "radial-gradient(circle at 80% 18%, rgba(138,190,222,.10) 0%, transparent 22%)",
      "radial-gradient(circle at 24% 78%, rgba(215,165,95,.07) 0%, transparent 18%)",
      "linear-gradient(100deg, rgba(255,255,255,.05) 0%, transparent 22%, transparent 100%)",
      "linear-gradient(180deg, var(--vm-bg-top) 0%, var(--vm-bg-base) 48%, var(--vm-bg-bottom) 100%)",
    ].join(",\n      "),
    auraBg: "radial-gradient(circle, rgba(138,190,222,.16) 0%, rgba(215,165,95,.10) 38%, transparent 70%)",
    auraInset: "-90px -60px auto auto",
    auraSize: "700px",
    auraOpacity: ".14",
    textureBg: [
      "radial-gradient(circle, rgba(240,244,255,.020) 1px, transparent 1px)",
      "radial-gradient(circle at 80% 18%, rgba(138,190,222,.045) 0%, transparent 30%)",
    ].join(",\n      "),
    textureSize: "74px 74px, 100% 100%",
    texturePosition: "0 0, 0 0",
    frameOverlay: "linear-gradient(115deg, rgba(255,255,255,.025) 0%, transparent 28%, rgba(138,190,222,.016) 100%)",
    titleGlow: "0 10px 28px rgba(138,190,222,.05)",
  },
};

export const VIDEO_MOODS = Object.fromEntries(
  Object.entries(MOOD_THEME).map(([id, mood]) => [id, { id, ...mood }]),
);

export const VIDEO_MOOD_SETS = {
  "steel-family": [
    "steel-mist",
    "steel-dawn",
    "steel-harbor",
    "steel-dusk",
    "steel-night",
  ],
  winners: [
    "steel-mist",
    "steel-dawn",
    "steel-harbor",
    "steel-dusk",
    "steel-night",
    "deep-night",
  ],
  "hybrid-family": [
    "amber-grid",
    "teal-slate",
    "steel-teal",
    "steel-amber",
    "amber-steel",
    "teal-amber",
    "signal-bloom",
  ],
  expanded: [
    "steel-mist",
    "steel-dawn",
    "steel-harbor",
    "steel-dusk",
    "steel-night",
    "amber-grid",
    "teal-slate",
    "steel-teal",
    "steel-amber",
    "amber-steel",
    "teal-amber",
    "deep-night",
  ],
};

export const VIDEO_SERIES_MOOD_RECIPES = {
  "datacenters-espacio": {
    label: "Infraestructura acero con calor contenido",
    canonical: "steel-harbor",
    presentation: "steel-harbor",
    article_rotation: ["steel-harbor", "steel-dawn", "steel-night", "steel-amber", "steel-teal"],
  },
  "from-cave-to-agi": {
    label: "Historia cálida-industrial",
    canonical: "amber-steel",
    presentation: "amber-steel",
    article_rotation: ["amber-steel", "amber-grid", "steel-dawn", "steel-dusk", "steel-harbor"],
  },
  "fundamentos-ia-iag": {
    label: "Editorial claro de base steel",
    canonical: "steel-dawn",
    presentation: "steel-dawn",
    article_rotation: ["steel-dawn", "steel-mist", "steel-harbor", "teal-slate"],
  },
  "ia-pib-bienestar-energia": {
    label: "Economía física con tensión ámbar",
    canonical: "steel-amber",
    presentation: "steel-amber",
    article_rotation: ["steel-amber", "amber-grid", "amber-steel", "steel-harbor", "steel-dawn"],
  },
  "modelos-razonadores": {
    label: "Sobriedad oscura con frío analítico",
    canonical: "steel-night",
    presentation: "steel-night",
    article_rotation: ["steel-night", "deep-night", "steel-teal", "teal-slate", "steel-dusk"],
  },
  "multimodalidad-iag": {
    label: "Frío multimodal con acentos controlados",
    canonical: "teal-slate",
    presentation: "teal-slate",
    article_rotation: ["teal-slate", "steel-teal", "steel-dawn", "signal-bloom", "steel-harbor"],
  },
};

export function resolveVideoMood(name = DEFAULT_VIDEO_MOOD) {
  return VIDEO_MOODS[name] || VIDEO_MOODS[DEFAULT_VIDEO_MOOD];
}

export function listVideoMoods() {
  return Object.values(VIDEO_MOODS);
}

export function listVideoMoodSets() {
  return Object.entries(VIDEO_MOOD_SETS).map(([id, moods]) => ({ id, moods: [...moods] }));
}

export function resolveVideoMoodSet(name) {
  return VIDEO_MOOD_SETS[name] ? [...VIDEO_MOOD_SETS[name]] : null;
}

export function listVideoMoodRecipes() {
  return Object.entries(VIDEO_SERIES_MOOD_RECIPES).map(([series, recipe]) => ({
    series,
    ...recipe,
    article_rotation: [...recipe.article_rotation],
  }));
}

export function resolveSeriesVideoRecipe(seriesName) {
  return VIDEO_SERIES_MOOD_RECIPES[seriesName] || null;
}

export function resolveSeriesVideoRecipeMoods(seriesName) {
  const recipe = resolveSeriesVideoRecipe(seriesName);
  if (!recipe) return [DEFAULT_VIDEO_MOOD];
  return [...new Set([recipe.canonical, recipe.presentation, ...recipe.article_rotation].filter(Boolean))];
}

export function resolveSeriesVideoMood(seriesName, options = {}) {
  const { role = "article" } = options;
  const recipe = resolveSeriesVideoRecipe(seriesName);
  if (!recipe) return DEFAULT_VIDEO_MOOD;
  const canonical = recipe.canonical || recipe.presentation || recipe.article_rotation?.[0] || DEFAULT_VIDEO_MOOD;
  if (role !== "article") return canonical;
  return canonical;
}

function moodScene(id) {
  return MOOD_SCENES[id] || MOOD_SCENES[DEFAULT_VIDEO_MOOD];
}

export function videoMoodStyles(name = DEFAULT_VIDEO_MOOD) {
  const mood = resolveVideoMood(name);
  const scene = moodScene(name);

  return `
  /* VIDEO_MOOD_START: ${name} */
  :root {
    --vm-bg-top: ${mood.bgTop};
    --vm-bg-base: ${mood.bgBase};
    --vm-bg-bottom: ${mood.bgBottom};
    --vm-accent-1: ${mood.accent1};
    --vm-accent-2: ${mood.accent2};
    --vm-accent-3: ${mood.accent3};
    --vm-footer-dim: ${mood.footerDim};
    --vm-series-tag: ${mood.seriesTag};
    --vm-subtitle: ${mood.subtitle};
    --vm-deco-shadow: ${mood.decoShadow};
  }

  html, body {
    background:
      ${scene.bodyBg};
  }

  body[data-video-mood="${name}"] .beat {
    background:
      ${scene.beatBg};
  }

  body[data-video-mood="${name}"] .beat::before {
    inset: ${scene.auraInset};
    width: ${scene.auraSize.split(" ")[0]};
    height: ${scene.auraSize.split(" ")[1] || scene.auraSize.split(" ")[0]};
    background: ${scene.auraBg};
    opacity: ${scene.auraOpacity};
  }

  body[data-video-mood="${name}"] .beat::after {
    background-image:
      ${scene.textureBg},
      ${scene.frameOverlay};
    background-size: ${scene.textureSize}, 100% 100%;
    background-position: ${scene.texturePosition}, 0 0;
  }

  body[data-video-mood="${name}"] .accent-bar {
    background: linear-gradient(90deg, var(--vm-accent-1) 0%, var(--vm-accent-2) 46%, var(--vm-accent-3) 100%);
    box-shadow: 0 0 28px rgba(255,255,255,.04);
  }

  body[data-video-mood="${name}"] .footer-label {
    color: var(--vm-footer-dim);
  }

  body[data-video-mood="${name}"] .footer-logo {
    background: linear-gradient(135deg, var(--vm-accent-1) 0%, var(--vm-accent-2) 48%, var(--vm-accent-3) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  body[data-video-mood="${name}"] .opening .series-tag {
    color: var(--vm-series-tag);
  }

  body[data-video-mood="${name}"] .opening .subtitle {
    color: var(--vm-subtitle);
  }

  body[data-video-mood="${name}"] .opening .main-title {
    text-shadow: ${scene.titleGlow};
  }

  body[data-video-mood="${name}"] .deco-svg {
    filter: var(--vm-deco-shadow);
  }
  /* VIDEO_MOOD_END */
`;
}

export function applyVideoMoodToHtml(html, name = DEFAULT_VIDEO_MOOD) {
  const moodCss = videoMoodStyles(name);
  let next = html;

  if (/\/\* VIDEO_MOOD_START:[\s\S]*?VIDEO_MOOD_END \*\//.test(next)) {
    next = next.replace(/\/\* VIDEO_MOOD_START:[\s\S]*?VIDEO_MOOD_END \*\//, moodCss.trim());
  } else if (next.includes("</style>")) {
    next = next.replace("</style>", `${moodCss}\n</style>`);
  }

  if (/<body[^>]*\sdata-video-mood="[^"]+"[^>]*>/.test(next)) {
    next = next.replace(/(<body[^>]*\s)data-video-mood="[^"]+"([^>]*>)/, `$1data-video-mood="${name}"$2`);
  } else {
    next = next.replace(/<body([^>]*)>/, `<body$1 data-video-mood="${name}">`);
  }

  return next;
}
