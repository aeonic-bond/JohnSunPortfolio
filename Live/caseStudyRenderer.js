const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let flowTrackerRafId = 0;
let flowTrackerEventsBound = false;

const updateFlowRowTrackers = () => {
  const thresholdY = window.innerHeight * 0.5;
  const flowRows = document.querySelectorAll(".cs-flow-row");

  for (const flowRow of flowRows) {
    const rect = flowRow.getBoundingClientRect();
    const height = Math.max(rect.height, 1);
    const progress = clamp((thresholdY - rect.top) / height, 0, 1);
    flowRow.style.setProperty("--tracker-progress", progress.toString());
  }
};

const scheduleFlowRowTrackerUpdate = () => {
  if (flowTrackerRafId) return;
  flowTrackerRafId = window.requestAnimationFrame(() => {
    flowTrackerRafId = 0;
    updateFlowRowTrackers();
  });
};


const bindFlowRowTrackerEvents = () => {
  if (flowTrackerEventsBound) return;
  flowTrackerEventsBound = true;

  window.addEventListener("scroll", scheduleFlowRowTrackerUpdate, { passive: true });
  window.addEventListener("resize", scheduleFlowRowTrackerUpdate);
  window.addEventListener("orientationchange", scheduleFlowRowTrackerUpdate);
};

const renderCaseStudy = (content = {}, root) => {
  if (!root) return;
  bindHeaderBarEvents();
  updateHeaderBarStickyState();
  bindFlowRowTrackerEvents();
  const sectionsGroup = document.createElement("article");
  sectionsGroup.className = "cs-sections";

  const hero = document.createElement("header");
  hero.className = "cs-div-intro";

  const title = document.createElement("h1");
  title.className = "cs-title";
  title.textContent = content.hero?.title || "";

  const subtitle = document.createElement("p");
  subtitle.className = "cs-subtitle";
  subtitle.textContent = content.hero?.subtitle || "";

  const introText = document.createElement("div");
  introText.className = "cs-div-intro-text";
  introText.append(title, subtitle);

  hero.append(introText);

  const heroData = content.hero || {};
  const heroMedia = Array.isArray(heroData.gallery)
    ? createHeroGalleryElement(heroData)
    : createHeroVisualElement(heroData);
  if (heroMedia.firstChild) hero.append(heroMedia);
  for (const sectionData of content.sections || []) {
    const section = document.createElement("section");
    section.className = "cs-div-section";
    section.id = sectionData.id || "";

    const headerText = String(sectionData.header || "").trim();
    const intro = String(sectionData.intro || "").trim();
    if (headerText) {
      const header = document.createElement("h2");
      header.className = "cs-section-header";
      header.textContent = headerText;
      if (intro) {
        const headerGroup = document.createElement("div");
        headerGroup.className = "cs-section-header-group";
        const introPara = document.createElement("div");
        introPara.className = "cs-paragraph";
        introPara.append(createBodyFragment(intro));
        headerGroup.append(header, introPara);
        section.append(headerGroup);
      } else {
        section.append(header);
      }
    }

    const blocks = Array.isArray(sectionData.blocks) ? sectionData.blocks : [];
    const remainingBlocks = blocks;
    for (const block of remainingBlocks) {
      if (!block || typeof block !== "object") continue;

      if (block.type === "paragraph") {
        const bodyWrap = document.createElement("div");
        bodyWrap.className = "cs-paragraph";
        bodyWrap.append(createBodyFragment(block.text || ""));
        section.append(bodyWrap);
        continue;
      }

      if (block.type === "paragraph-subsection" || block.type === "paragraphSubsection") {
        section.append(createParagraphSubsectionElement(block));
        continue;
      }

      if (block.type === "bulletRow") {
        section.append(createBulletRowElement(block.items || block));
        continue;
      }

      if (block.type === "flowRow") {
        section.append(createFlowRowElement(block.items || block));
        continue;
      }

      if (block.type === "iconGrid") {
        section.append(createIconGridElement(block.items || block));
        continue;
      }

      if (block.type === "figure") {
        const inlineFigure =
          block.figure && typeof block.figure === "object"
            ? block.figure
            : null;
        if (inlineFigure) section.append(createFigureElement(inlineFigure));
        continue;
      }

      if (block.type === "progressMatrix") {
        section.append(createProgressMatrixElement(block));
      }

      if (block.type === "progressRow") {
        section.append(createProgressRowElement(block));
        continue;
      }

      if (block.type === "moduleMount" || block.type === "module-mount") {
        section.append(createModuleMountElement(block));
        continue;
      }

      if (block.type === "figMatrix" || block.type === "fig-matrix") {
        section.append(createFigMatrixElement(block));
        continue;
      }

      if (block.type === "figRow") {
        section.append(createFigRowElement(block));
        continue;
      }

      if (block.type === "prototypeFlow" || block.type === "protoFlow") {
        section.append(createProtoFlowElement(block));
        continue;
      }
    }

    sectionsGroup.append(section);
  }

  root.replaceChildren(hero, sectionsGroup);
  scheduleFlowRowTrackerUpdate();
};

const loadCaseStudyInto = (root, contentPath) => {
  if (!root || !contentPath) return;

  fetch(contentPath)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${contentPath}`);
      return response.json();
    })
    .then(async (content) => {
      setWindowActiveIDFromContent(content);
      const navItems = await loadNavItems();
      const navItem = findHeaderNavItem(content, navItems);
      if (navItem?.title) {
        document.title = `${navItem.title} Case Study`;
        root.setAttribute("aria-label", `${navItem.title} Case Study`);
      }
      applyHeaderBarContent(content, navItems);
      renderCaseStudy(content, root);
    })
    .catch((error) => {
      const message = document.createElement("p");
      message.className = "cs-load-error";
      message.textContent = error.message;
      root.replaceChildren(message);
    });
};

window.LiveCaseStudyRenderer = {
  renderCaseStudy,
  loadCaseStudyInto,
};

// --- Page Mounting (Per-Case-Study Configuration) ---
// Each case study page sets `data-content-src` on `#case-study-root`.
// Example in HTML:
// <article id="case-study-root" data-content-src="./TorusContent.json"></article>
const mountRoot = document.getElementById("case-study-root");
const mountContentPath = mountRoot?.dataset?.contentSrc || "";
if (mountRoot && mountContentPath) {
  loadCaseStudyInto(mountRoot, mountContentPath);
}
