export type ThemeColors = {
  bg: string;
  textMain: string;
  textSub: string;
  accent: string;
};

export type Theme = {
  key: string;
  name: string;
  colors: ThemeColors;
};

export const presetThemes: Theme[] = [
  {
    key: "serika-dark",
    name: "serika dark",
    colors: { bg: "#323437", textMain: "#d1d0c5", textSub: "#646669", accent: "#e2b714" },
  },
  {
    key: "carbon",
    name: "carbon",
    colors: { bg: "#313131", textMain: "#f5e6c8", textSub: "#585858", accent: "#f66e0d" },
  },
  {
    key: "nord",
    name: "nord",
    colors: { bg: "#242933", textMain: "#d8dee9", textSub: "#68809a", accent: "#88c0d0" },
  },
  {
    key: "monokai",
    name: "monokai",
    colors: { bg: "#272822", textMain: "#d6d6d6", textSub: "#75715e", accent: "#a6e22e" },
  },
  {
    key: "dracula",
    name: "dracula",
    colors: { bg: "#282a36", textMain: "#f8f8f2", textSub: "#6272a4", accent: "#bd93f9" },
  },
  {
    key: "botanical",
    name: "botanical",
    colors: { bg: "#7b9e87", textMain: "#eaf1e8", textSub: "#495e4b", accent: "#eaf1e8" },
  },
  {
    key: "light",
    name: "light",
    colors: { bg: "#fafafa", textMain: "#1a1a1a", textSub: "#a1a1aa", accent: "#18181b" },
  },
];

export const defaultTheme = presetThemes[0]; // serika dark
