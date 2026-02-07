(() => {
  const ensureFontLoaded = () => {
    const id = "sandbox-font-crimson-text-700";
    if (document.getElementById(id)) return;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Crimson+Text:wght@700&display=swap";
    document.head.append(link);
  };

  const ensureTypographyStyles = () => {
    const id = "sandbox-typography-styles";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
.type-h2 {
  font: var(--type-h2, 700 28px/1 "Crimson Text", serif);
  letter-spacing: var(--type-h2-letter-spacing, 0px);
}
`.trim();
    document.head.append(style);
  };

  const typographyTokens = {
    h2: {
      fontFamily: '"Crimson Text", serif',
      fontSize: "28px",
      fontWeight: "700",
      lineHeight: "1",
      letterSpacing: "0px",
      get preset() {
        return `${this.fontWeight} ${this.fontSize}/${this.lineHeight} ${this.fontFamily}`;
      },
    },
  };

  const setRootToken = (name, value) => {
    document.documentElement.style.setProperty(name, value);
  };

  ensureFontLoaded();
  ensureTypographyStyles();

  setRootToken("--type-h2-font-family", typographyTokens.h2.fontFamily);
  setRootToken("--type-h2-font-size", typographyTokens.h2.fontSize);
  setRootToken("--type-h2-font-weight", typographyTokens.h2.fontWeight);
  setRootToken("--type-h2-line-height", typographyTokens.h2.lineHeight);
  setRootToken("--type-h2-letter-spacing", typographyTokens.h2.letterSpacing);
  setRootToken("--type-h2", typographyTokens.h2.preset);

  window.SandboxTokens = window.SandboxTokens || {};
  window.SandboxTokens.typography = typographyTokens;
})();
