const CASE_STUDY_STATUS_PATHS = {
  torus: "/Live/torus/TorusContent.json",
  blueprint: "/Live/blueprint/BlueprintContent.json",
  hcustomizer: "/Live/hcustomizer/HCustomizerContent.json",
  tolley: "/Live/tolley/TolleyContent.json",
};
const statusLoadByKind = new Map();

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

  const promise = fetch(path, { cache: "default" })
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

const COMING_SOON_IMG_SRC = "/Assets/ComingSoon.png";

const renderCardMedia = ({ kind = "", mediaRoot, media, isDisabled = false } = {}) => {
  void kind;
  void media;
  if (!mediaRoot) return;
  const img = document.createElement("img");
  img.className = "card-media-draft-placeholder";
  img.src = COMING_SOON_IMG_SRC;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  mediaRoot.append(img);
};

const CASE_STUDY_DATA_PATH = "/Live/caseStudyCard/caseStudyCard.json";

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
