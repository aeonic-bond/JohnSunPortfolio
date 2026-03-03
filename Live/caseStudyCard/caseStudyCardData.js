import * as THREE from 'three';

const CASE_STUDY_STATUS_PATHS = {
  torus: "/Live/torus/TorusContent.json",
  blueprint: "/Live/blueprint/BlueprintContent.json",
  hcustomizer: "/Live/hcustomizer/HCustomizerContent.json",
  tolley: "/Live/tolley/TolleyContent.json",
};
const statusLoadByKind = new Map();

// --- Three.js shared module state ---
// Each entry: { scene, camera, renderer, mesh, active, resizeObserver, visibilityObserver }
const _cards = new Map();
let _rafId = 0;

const startLoop = () => {
  if (_rafId) return;
  const tick = (time) => {
    _rafId = requestAnimationFrame(tick);
    for (const [, card] of _cards) {
      if (!card.active) continue;
      card.mesh.rotation.x = time * 0.0005;
      card.mesh.rotation.y = time * 0.001;
      card.renderer.render(card.scene, card.camera);
    }
  };
  _rafId = requestAnimationFrame(tick);
};

// --- Status loading ---

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

// --- Card media ---

const COMING_SOON_IMG_SRC = "/Assets/ComingSoon.png";

const renderCardMedia = ({ kind = "", mediaRoot, media, isDisabled = false } = {}) => {
  void media;
  if (!mediaRoot) return;

  if (isDisabled) {
    const img = document.createElement("img");
    img.className = "card-media-draft-placeholder";
    img.src = COMING_SOON_IMG_SRC;
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    mediaRoot.append(img);
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "card-media-layer";
  mediaRoot.append(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0x6688cc });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(3, 3, 5);
  scene.add(dirLight);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 3);

  const syncSize = () => {
    const w = mediaRoot.offsetWidth;
    const h = mediaRoot.offsetHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  // mediaRoot is off-DOM when renderCardMedia is called — defer the initial size sync
  // so it runs after the element is appended and has computed dimensions.
  requestAnimationFrame(syncSize);

  const resizeObserver = new ResizeObserver(syncSize);
  resizeObserver.observe(mediaRoot);

  // Start active so the first frame renders immediately once the element is in the DOM.
  // IntersectionObserver will flip active to false when the card leaves the viewport.
  const cardEntry = { scene, camera, renderer, mesh, active: true, resizeObserver };
  _cards.set(kind, cardEntry);

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const card = _cards.get(kind);
        if (!card) continue;
        card.active = entry.isIntersecting;
      }
    },
    { threshold: 0 }
  );
  visibilityObserver.observe(mediaRoot);
  cardEntry.visibilityObserver = visibilityObserver;

  startLoop();
};

// --- Data loading ---

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
