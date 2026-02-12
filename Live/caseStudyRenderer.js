const createBodyFragment = (body = "") => {
  const fragment = document.createDocumentFragment();
  const blocks = body.split("\n\n").map((block) => block.trim()).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const bulletLines = lines.filter((line) => line.startsWith("- "));
    const allBullets = bulletLines.length === lines.length && lines.length > 0;

    if (allBullets) {
      const list = document.createElement("ul");
      for (const line of lines) {
        const item = document.createElement("li");
        item.textContent = line.replace(/^- /, "");
        list.append(item);
      }
      fragment.append(list);
      continue;
    }

    const paragraph = document.createElement("p");
    paragraph.className = "type-body1";
    paragraph.textContent = lines.join(" ");
    fragment.append(paragraph);
  }

  return fragment;
};

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

const createFigureElement = (figure = {}) => {
  const fig = document.createElement("figure");
  fig.className = "cs-fig";
  fig.id = figure.id || "";
  const hasSource = Boolean(figure.src);
  const mediaType = figure.type === "video" ? "video" : "image";

  if (hasSource) {
    if (mediaType === "video") {
      const video = document.createElement("video");
      video.className = "cs-fig-image";
      video.src = figure.src;
      video.poster = figure.poster || "";
      video.preload = figure.preload || "metadata";
      video.controls = figure.controls !== false;
      video.autoplay = Boolean(figure.autoplay);
      video.loop = Boolean(figure.loop);
      video.muted = Boolean(figure.muted);
      video.playsInline = true;
      if (figure.alt) video.setAttribute("aria-label", figure.alt);
      fig.append(video);
    } else {
      const img = document.createElement("img");
      img.className = "cs-fig-image";
      img.src = figure.src;
      img.alt = figure.alt || "";
      fig.append(img);
    }
  }

  if (hasSource && (figure.caption || figure.credit)) {
    const caption = document.createElement("figcaption");
    caption.className = "cs-fig-caption";
    caption.textContent = [figure.caption, figure.credit].filter(Boolean).join(" | ");
    fig.append(caption);
  }

  return fig;
};

const normalizeRowItems = (row) => {
  if (Array.isArray(row)) return row;
  if (typeof row === "string") return [row];
  if (row && typeof row === "object" && Array.isArray(row.items)) return row.items;
  if (row && typeof row === "object" && typeof row.text === "string") return [row.text];
  return [];
};

const normalizeStamp = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const src = value.trim();
    return src ? { type: "image", src, alt: "" } : null;
  }

  if (value && typeof value === "object") {
    const type = value.type === "video" ? "video" : "image";
    const src = String(value.src || "").trim();
    const alt = String(value.alt || "").trim();
    const poster = String(value.poster || "").trim();
    if (!src) return null;
    return { type, src, alt, poster };
  }

  return null;
};

const normalizeBulletItem = (item) => {
  if (typeof item === "string") {
    return { text: item, stamp: null };
  }

  if (Array.isArray(item)) {
    const [text = "", maybeStamp = "", legacyAlt = ""] = item;
    const stamp =
      typeof maybeStamp === "object"
        ? normalizeStamp(maybeStamp)
        : normalizeStamp({ src: maybeStamp, alt: legacyAlt });
    return {
      text: String(text).trim(),
      stamp,
    };
  }

  if (item && typeof item === "object") {
    const text = item.text ?? item.body ?? item.value ?? "";
    const stamp = normalizeStamp(
      item.stamp ?? item.image ?? { src: item.imageSrc, alt: item.imageAlt }
    );
    return {
      text: String(text).trim(),
      stamp,
    };
  }

  return { text: "", stamp: null };
};

const normalizeProgressPairs = (progressRow) => {
  const rawItems = normalizeRowItems(progressRow);
  const pairs = [];

  for (const item of rawItems) {
    if (Array.isArray(item)) {
      const [primary = "", secondary = "", maybeStamp = "", legacyAlt = ""] = item;
      const stamp =
        typeof maybeStamp === "object"
          ? normalizeStamp(maybeStamp)
          : normalizeStamp({ src: maybeStamp, alt: legacyAlt });
      pairs.push({
        primary: String(primary).trim(),
        secondary: String(secondary).trim(),
        stamp,
      });
      continue;
    }

    if (item && typeof item === "object") {
      const primary = item.primary ?? item.left ?? item.title ?? item.label ?? "";
      const secondary = item.secondary ?? item.right ?? item.value ?? item.detail ?? "";
      const stamp = normalizeStamp(
        item.stamp ?? item.image ?? { src: item.imageSrc, alt: item.imageAlt }
      );
      pairs.push({
        primary: String(primary).trim(),
        secondary: String(secondary).trim(),
        stamp,
      });
      continue;
    }

    if (typeof item === "string") {
      const match = item.match(/^(.*?)\s+-\s+(.*)$/);
      if (match) {
        pairs.push({
          primary: match[1].trim(),
          secondary: match[2].trim(),
          stamp: null,
        });
      } else {
        pairs.push({
          primary: item.trim(),
          secondary: "",
          stamp: null,
        });
      }
    }
  }

  return pairs.filter((pair) => pair.primary || pair.secondary || pair.stamp);
};

const createStampElement = (stamp, className = "cs-stamp") => {
  const normalized = normalizeStamp(stamp);
  if (!normalized) return null;

  const stampEl = document.createElement("div");
  stampEl.className = className;

  if (normalized.type === "video") {
    const video = document.createElement("video");
    video.className = "cs-stamp-content";
    video.src = normalized.src;
    video.poster = normalized.poster || "";
    video.preload = "metadata";
    video.controls = true;
    video.playsInline = true;
    video.muted = true;
    video.loop = false;
    if (normalized.alt) video.setAttribute("aria-label", normalized.alt);
    stampEl.append(video);
    return stampEl;
  }

  const image = document.createElement("img");
  image.className = "cs-stamp-content";
  image.src = normalized.src;
  image.alt = normalized.alt || "";
  stampEl.append(image);
  return stampEl;
};

const createItemTextElement = (value, rootClassName = "cs-bullet-item-text") => {
  const content = document.createElement("div");
  content.className = rootClassName;

  const rawText = typeof value === "string" ? value.trim() : "";
  if (!rawText) {
    const paragraph = document.createElement("p");
    paragraph.className = "cs-bullet-item-text-block";
    paragraph.textContent = "";
    content.append(paragraph);
    return content;
  }

  const blocks = rawText.split("\n\n").map((block) => block.trim()).filter(Boolean);
  for (const block of blocks) {
    const quoteWithCite = block.match(/^(["“].*["”])\s*-\s*(.+)$/);
    const quoteOnly = /^["“].*["”]$/.test(block);
    const titleWithOptionalBody = block.match(/^([^"\n].*?)\s+-\s*(.*)$/);

    if (quoteWithCite || quoteOnly) {
      const quoteText = (quoteWithCite ? quoteWithCite[1] : block).replace(/^(["“])|(["”])$/g, "");
      const quote = document.createElement("blockquote");
      quote.className = "cs-bullet-item-quote";
      quote.textContent = quoteText;
      content.append(quote);

      if (quoteWithCite) {
        const cite = document.createElement("cite");
        cite.className = "cs-bullet-item-cite";
        cite.textContent = quoteWithCite[2];
        content.append(cite);
      }
      continue;
    }

    if (titleWithOptionalBody) {
      const title = document.createElement("h3");
      title.className = "cs-bullet-item-title";
      title.textContent = titleWithOptionalBody[1].trim();
      content.append(title);

      const bodyText = titleWithOptionalBody[2].trim();
      if (bodyText) {
        const paragraph = document.createElement("p");
        paragraph.className = "cs-bullet-item-text-block";
        paragraph.textContent = bodyText;
        content.append(paragraph);
      }
      continue;
    }

    const paragraph = document.createElement("p");
    paragraph.className = "cs-bullet-item-text-block";
    paragraph.textContent = block;
    content.append(paragraph);
  }

  return content;
};

const createBulletRowElement = (bulletRow) => {
  const bulletRowEl = document.createElement("div");
  bulletRowEl.className = "cs-bullet-row";

  const items = normalizeRowItems(bulletRow);

  const itemCount = Math.max(1, items.length);
  for (let i = 0; i < itemCount; i += 1) {
    const itemData = normalizeBulletItem(items[i]);
    const bulletItemEl = document.createElement("div");
    bulletItemEl.className = "cs-bullet-item";
    const bulletItemCounterEl = document.createElement("div");
    bulletItemCounterEl.className = "cs-bullet-item-counter";
    bulletItemCounterEl.textContent = String(i + 1);

    const bulletItemTextEl = createItemTextElement(itemData.text);

    if (itemData.stamp) {
      bulletItemEl.classList.add("cs-bullet-item--with-image");
      const stampEl = createStampElement(itemData.stamp, "cs-stamp cs-bullet-item-stamp");
      if (stampEl) {
        bulletItemEl.append(bulletItemCounterEl, stampEl, bulletItemTextEl);
      } else {
        bulletItemEl.append(bulletItemCounterEl, bulletItemTextEl);
      }
    } else {
      bulletItemEl.append(bulletItemCounterEl, bulletItemTextEl);
    }

    bulletRowEl.append(bulletItemEl);
  }

  return bulletRowEl;
};

const createFlowRowElement = (flowRow) => {
  const flowRowEl = document.createElement("div");
  flowRowEl.className = "cs-flow-row";
  const flowTrackerEl = document.createElement("div");
  flowTrackerEl.className = "cs-flow-row-tracker";
  const flowItemsAllEl = document.createElement("div");
  flowItemsAllEl.className = "cs-flow-row-itemsAll";

  const items = normalizeRowItems(flowRow);
  const itemCount = Math.max(1, items.length);

  for (let i = 0; i < itemCount; i += 1) {
    const flowItemEl = document.createElement("div");
    flowItemEl.className = "cs-flow-row-item";

    const flowTextEl = createItemTextElement(items[i], "cs-flow-row-item-text");
    flowItemEl.append(flowTextEl);
    flowItemsAllEl.append(flowItemEl);
  }

  flowRowEl.append(flowTrackerEl, flowItemsAllEl);
  return flowRowEl;
};

const createProgressRowElement = (progressRow) => {
  const progressRowEl = document.createElement("div");
  progressRowEl.className = "cs-progress-row";

  const itemsAllEl = document.createElement("div");
  itemsAllEl.className = "cs-progress-row-itemsAll";

  for (const pair of normalizeProgressPairs(progressRow)) {
    const itemEl = document.createElement("div");
    itemEl.className = "cs-progress-row-item";

    const primaryEl = createItemTextElement(
      pair.primary,
      "cs-progress-row-item-primary"
    );

    const chevronEl = document.createElement("span");
    chevronEl.className = "cs-progress-row-chevron";
    chevronEl.setAttribute("aria-hidden", "true");
    chevronEl.textContent = "⌄";

    const secondaryEl = createItemTextElement(
      pair.secondary,
      "cs-progress-row-item-secondary"
    );

    const secondaryAllEl = document.createElement("div");
    secondaryAllEl.className = "cs-progress-row-div-secondaryAll";
    secondaryAllEl.append(secondaryEl);

    if (pair.stamp) {
      const stampEl = createStampElement(pair.stamp, "cs-stamp cs-progress-row-item-stamp");
      if (stampEl) secondaryAllEl.append(stampEl);
    }

    itemEl.append(primaryEl, chevronEl, secondaryAllEl);

    itemsAllEl.append(itemEl);
  }

  progressRowEl.append(itemsAllEl);
  return progressRowEl;
};

const renderCaseStudy = (content = {}, root) => {
  if (!root) return;
  bindFlowRowTrackerEvents();

  const figureMap = new Map((content.figures || []).map((figure) => [figure.id, figure]));
  const sectionsAll = document.createElement("article");
  sectionsAll.className = "cs-div-sectionsALL";

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

  const heroImageSrc = content.hero?.imageSrc || "";
  const heroImageAlt = content.hero?.imageAlt || "";

  hero.append(introText);

  if (heroImageSrc) {
    const heroImage = document.createElement("img");
    heroImage.className = "cs-hero-image";
    heroImage.src = heroImageSrc;
    heroImage.alt = heroImageAlt;
    hero.append(heroImage);
  }
  for (const sectionData of content.sections || []) {
    const section = document.createElement("section");
    section.className = "cs-div-section";
    section.id = sectionData.id || "";

    const header = document.createElement("h2");
    header.className = "cs-section-header";
    header.textContent = sectionData.header || "";

    if (Array.isArray(sectionData.blocks) && sectionData.blocks.length > 0) {
      section.append(header);
      for (const block of sectionData.blocks) {
        if (!block || typeof block !== "object") continue;

        if (block.type === "paragraph") {
          const bodyWrap = document.createElement("div");
          bodyWrap.className = "cs-section-body";
          bodyWrap.append(createBodyFragment(block.text || ""));
          section.append(bodyWrap);
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

        if (block.type === "progressRow") {
          section.append(createProgressRowElement(block.items || block));
        }
      }
    } else {
      const bodyWrap = document.createElement("div");
      bodyWrap.className = "cs-section-body";
      bodyWrap.append(createBodyFragment(sectionData.body || ""));

      const sectionText = document.createElement("div");
      sectionText.className = "cs-div-section-text";
      sectionText.append(header, bodyWrap);

      section.append(sectionText);

      for (const bulletRow of sectionData.bulletRows || []) {
        section.append(createBulletRowElement(bulletRow));
      }

      for (const flowRow of sectionData.flowRows || []) {
        section.append(createFlowRowElement(flowRow));
      }

      for (const progressRow of sectionData.progressRows || []) {
        section.append(createProgressRowElement(progressRow));
      }
    }

    for (const figureId of sectionData.figureIds || []) {
      const figure = figureMap.get(figureId);
      if (!figure) continue;
      section.append(createFigureElement(figure));
    }

    sectionsAll.append(section);
  }

  root.replaceChildren(hero, sectionsAll);
  scheduleFlowRowTrackerUpdate();
};

const loadCaseStudyInto = (root, contentPath) => {
  if (!root || !contentPath) return;

  fetch(contentPath)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${contentPath}`);
      return response.json();
    })
    .then((content) => {
      renderCaseStudy(content, root);
    })
    .catch((error) => {
      const message = document.createElement("p");
      message.className = "type-body1";
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
