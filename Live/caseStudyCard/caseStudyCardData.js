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

const CASE_STUDY_DATA_PATH = "../caseStudyCard/caseStudyCard.json";

const loadCaseStudies = async () => {
  try {
    const response = await fetch(CASE_STUDY_DATA_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load ${CASE_STUDY_DATA_PATH}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : payload?.items;
    window.LiveCaseStudyData.items = Array.isArray(items) ? items : [];
  } catch (error) {
    console.error(error);
    window.LiveCaseStudyData.items = [];
  }

  return window.LiveCaseStudyData.items;
};

window.LiveCaseStudyData = window.LiveCaseStudyData || {};
window.LiveCaseStudyData.items = window.LiveCaseStudyData.items || [];
window.LiveCaseStudyData.renderCardMedia = renderCardMedia;
window.LiveCaseStudyData.loadCaseStudies = loadCaseStudies;
