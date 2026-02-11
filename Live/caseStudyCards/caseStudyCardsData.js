const CASE_STUDIES = [
  {
    kind: "torus",
    title: "Torus",
    description: "Default decscription text",
    ctaLabel: "Read",
    href: "../torus/index.html",
    media: {
      splineUrlDesktop: "https://prod.spline.design/fVaatZpFg7arBTsd/scene.splinecode",
      splineUrlMobile: "https://prod.spline.design/XszHhs9AMXT7tGNa/scene.splinecode",
    },
  },
  {
    kind: "blueprint",
    title: "Blueprint",
    description: "Case study summary for Blueprint.",
    ctaLabel: "Read",
    media: {
      splineUrl: "https://prod.spline.design/5kxmLlprZtzzCVht/scene.splinecode",
    },
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

const SPLINE_CACHE_BUST = Date.now().toString();
const withCacheBust = (url) => {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${SPLINE_CACHE_BUST}`;
};

const renderTorusMedia = (mediaRoot, media = {}) => {
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const getUrl = () => {
    if (desktopQuery.matches) {
      return withCacheBust(media?.splineUrlDesktop || media?.splineUrl);
    }
    return withCacheBust(
      media?.splineUrlMobile || media?.splineUrlDesktop || media?.splineUrl,
    );
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

const renderBlueprintMedia = (mediaRoot, media = {}) => {
  const url = withCacheBust(media?.splineUrl);
  if (!url) return;

  const spline = document.createElement("spline-viewer");
  spline.className = "card_media_layer blueprint_spline";
  spline.setAttribute("url", url);
  mediaRoot.append(spline);
};

const MEDIA_RENDERERS = {
  blueprint: renderBlueprintMedia,
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
