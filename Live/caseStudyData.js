const CASE_STUDIES = [
  {
    kind: "torus",
    title: "Torus",
    description: "Default decscription text",
    ctaLabel: "Read",
    media: {
      splineUrlDesktop: "https://prod.spline.design/fVaatZpFg7arBTsd/scene.splinecode",
      splineUrlMobile: "https://prod.spline.design/XszHhs9AMXT7tGNa/scene.splinecode",
    },
  },
  {
    kind: "sphere",
    title: "Sphere",
    description: "Case study summary for Sphere.",
    ctaLabel: "Read",
  },
  {
    kind: "cube",
    title: "Cube",
    description: "Case study summary for Cube.",
    ctaLabel: "Read",
  },
  {
    kind: "cone",
    title: "Cone",
    description: "Case study summary for Cone.",
    ctaLabel: "Read",
  },
];

const renderTorusMedia = (mediaRoot, media = {}) => {
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const getUrl = () => {
    if (desktopQuery.matches) return media?.splineUrlDesktop || media?.splineUrl;
    return media?.splineUrlMobile || media?.splineUrlDesktop || media?.splineUrl;
  };

  const initialUrl = getUrl();
  if (!initialUrl) return;

  const spline = document.createElement("spline-viewer");
  spline.className = "card_media_layer torus_spline";
  spline.setAttribute("url", initialUrl);
  mediaRoot.append(spline);

  const updateUrl = () => {
    const nextUrl = getUrl();
    if (nextUrl && nextUrl !== spline.getAttribute("url")) {
      spline.setAttribute("url", nextUrl);
    }
  };

  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", updateUrl);
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(updateUrl);
  }
};

const MEDIA_RENDERERS = {
  torus: renderTorusMedia,
};

const renderCardMedia = ({ kind = "", mediaRoot, media } = {}) => {
  if (!mediaRoot) return;
  const render = MEDIA_RENDERERS[kind];
  if (render) render(mediaRoot, media);
};

window.LiveCaseStudyData = window.LiveCaseStudyData || {};
window.LiveCaseStudyData.items = CASE_STUDIES;
window.LiveCaseStudyData.renderCardMedia = renderCardMedia;
