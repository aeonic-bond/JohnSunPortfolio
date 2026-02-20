const SPLINE_CACHE_BUST = Date.now().toString();
const CASE_STUDY_STATUS_PATHS = {
  torus: "../torus/TorusContent.json",
  blueprint: "../blueprint/BlueprintContent.json",
  hcustomizer: "../hcustomizer/HCustomizerContent.json",
  tolley: "../tolley/TolleyContent.json",
};
const statusLoadByKind = new Map();
const prewarmedSplineUrls = new Set();

const withCacheBust = (url) => {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${SPLINE_CACHE_BUST}`;
};

const normalizeStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  if (status === "ready") return "ready";
  if (status === "draft") return "draft";
  return "";
};

const loadStatusForKind = async (kind = "") => {
  const normalizedKind = String(kind || "").trim().toLowerCase();
  if (!normalizedKind) return "";
  if (statusLoadByKind.has(normalizedKind)) return statusLoadByKind.get(normalizedKind);

  const path = CASE_STUDY_STATUS_PATHS[normalizedKind];
  if (!path) {
    statusLoadByKind.set(normalizedKind, Promise.resolve(""));
    return "";
  }

  const promise = fetch(path, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      return response.json();
    })
    .then((content) => normalizeStatus(content?.status))
    .catch((error) => {
      console.warn(`[case-study-status] Failed to load status for ${normalizedKind}.`, error);
      return "";
    });

  statusLoadByKind.set(normalizedKind, promise);
  return promise;
};

const getSplineUrlForViewport = (media = {}, desktopQuery) => {
  const isDesktop = Boolean(desktopQuery?.matches);
  if (isDesktop) {
    return withCacheBust(media?.splineUrlDesktop || media?.splineUrl || media?.splineUrlMobile);
  }
  return withCacheBust(media?.splineUrlMobile || media?.splineUrl || media?.splineUrlDesktop);
};

const collectSplineUrls = (media = {}) => {
  const urls = [
    withCacheBust(media?.splineUrlDesktop),
    withCacheBust(media?.splineUrlMobile),
    withCacheBust(media?.splineUrl),
  ];
  return urls.filter(Boolean);
};

const prewarmSplineUrl = (url) => {
  if (!url || prewarmedSplineUrls.has(url)) return;
  prewarmedSplineUrls.add(url);

  fetch(url, { mode: "no-cors", cache: "force-cache" }).catch(() => {
    // Best effort preload; viewer still loads the scene when mounted.
  });
};

const prewarmCaseStudySplineMedia = (items = []) => {
  for (const item of items) {
    const media = item?.media;
    if (!media || typeof media !== "object") continue;
    for (const url of collectSplineUrls(media)) {
      prewarmSplineUrl(url);
    }
  }
};

const renderSplineMedia = (mediaRoot, media = {}) => {
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const initialUrl = getSplineUrlForViewport(media, desktopQuery);
  if (!initialUrl) return;

  const spline = document.createElement("spline-viewer");
  spline.className = "card-media-layer";
  spline.setAttribute("url", initialUrl);
  mediaRoot.append(spline);

  const updateUrl = () => {
    const nextUrl = getSplineUrlForViewport(media, desktopQuery);
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

const renderCardMedia = ({ kind = "", mediaRoot, media } = {}) => {
  void kind;
  if (!mediaRoot) return;
  renderSplineMedia(mediaRoot, media);
};

const CASE_STUDY_DATA_PATH = "../caseStudyCard/caseStudyCard.json";

const loadCaseStudies = async () => {
  try {
    const response = await fetch(CASE_STUDY_DATA_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load ${CASE_STUDY_DATA_PATH}`);
    }

    const payload = await response.json();
    const rawItems = Array.isArray(payload) ? payload : payload?.items;
    const items = Array.isArray(rawItems) ? rawItems : [];

    const resolvedItems = await Promise.all(
      items.map(async (item = {}) => {
        const kind = String(item?.kind || "").trim().toLowerCase();
        const manualDisabled = item?.manualDisabled === true || kind === "aboutme";
        if (manualDisabled) {
          return {
            ...item,
            manualDisabled: true,
            status: "draft",
          };
        }

        const statusFromContent = await loadStatusForKind(kind);
        const status = statusFromContent || normalizeStatus(item?.status) || "draft";
        return { ...item, status };
      })
    );

    window.LiveCaseStudyData.items = resolvedItems;
    prewarmCaseStudySplineMedia(resolvedItems);
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
