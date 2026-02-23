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
    paragraph.textContent = lines.join(" ");
    fragment.append(paragraph);
  }

  return fragment;
};

const normalizeParagraphSubsection = (value = {}) => {
  if (typeof value === "string") {
    return { subtitle: "", text: value.trim() };
  }

  if (!value || typeof value !== "object") {
    return { subtitle: "", text: "" };
  }

  return {
    subtitle: String(value.subtitle || value.title || value.header || "").trim(),
    text: String(value.text || value.body || "").trim(),
  };
};

const createParagraphSubsectionElement = (block = {}) => {
  const subsection = normalizeParagraphSubsection(block);
  const subsectionEl = document.createElement("div");
  subsectionEl.className = "cs-paragraph-subsection";

  if (subsection.subtitle) {
    const subtitleEl = document.createElement("h3");
    subtitleEl.className = "cs-paragraph-subtitle";
    subtitleEl.textContent = subsection.subtitle;
    subsectionEl.append(subtitleEl);
  }

  const bodyEl = document.createElement("div");
  bodyEl.className = "cs-paragraph";
  bodyEl.append(createBodyFragment(subsection.text || ""));
  subsectionEl.append(bodyEl);

  return subsectionEl;
};

const MODULE_MOUNT_STYLE_HREFS = [
  "/Sandbox/TBTokens.css",
  "/Sandbox/TBtypography.css",
  "/Sandbox/ModuleMount.css",
  "/Sandbox/ModuleDYOH.css",
];
let moduleMountAssetsPromise = null;

const ensureStylesheetLoaded = (href) =>
  new Promise((resolve) => {
    if (!href) {
      resolve();
      return;
    }

    const existing = document.querySelector(`link[data-module-mount-style="${href}"]`);
    if (existing instanceof HTMLLinkElement) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.moduleMountStyle = href;
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
    document.head.append(link);
  });

const ensureModuleMountAssets = async () => {
  if (!moduleMountAssetsPromise) {
    moduleMountAssetsPromise = Promise.all(
      MODULE_MOUNT_STYLE_HREFS.map((href) => ensureStylesheetLoaded(href))
    );
  }

  await moduleMountAssetsPromise;
  return import("/Sandbox/ModuleDYOH.js");
};

const createModuleMountElement = (block = {}) => {
  const moduleMountEl = document.createElement("div");
  moduleMountEl.className = "cs-module-mount";

  const mountNode = document.createElement("div");
  mountNode.className = "cs-module-mount__node";
  moduleMountEl.append(mountNode);

  const configSrc = String(block.src || block.configSrc || "/Sandbox/ModuleDYOH.json").trim();
  if (!configSrc) return moduleMountEl;

  void (async () => {
    try {
      const [{ createModuleDYOH }, response] = await Promise.all([
        ensureModuleMountAssets(),
        fetch(configSrc),
      ]);
      if (!response.ok) throw new Error(`Failed to load ${configSrc}`);
      const config = await response.json();
      createModuleDYOH(mountNode, config);
    } catch (error) {
      const message = document.createElement("p");
      message.className = "cs-module-mount__error";
      message.textContent = error instanceof Error ? error.message : "Unable to load interactive module.";
      mountNode.replaceChildren(message);
    }
  })();

  return moduleMountEl;
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

const SPLINE_VIEWER_SCRIPT_SRC = "https://unpkg.com/@splinetool/viewer@1.12.58/build/spline-viewer.js";
let splineViewerScriptPromise = null;
let splineNetworkHintsApplied = false;

const applySplineNetworkHints = () => {
  if (splineNetworkHintsApplied) return;
  splineNetworkHintsApplied = true;
  try {
    const { origin } = new URL(SPLINE_VIEWER_SCRIPT_SRC);
    const hintKey = origin.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    const existingPreconnect = document.querySelector(`link[data-spline-hint="preconnect-${hintKey}"]`);
    if (!existingPreconnect) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = origin;
      preconnect.crossOrigin = "anonymous";
      preconnect.dataset.splineHint = `preconnect-${hintKey}`;
      document.head.append(preconnect);
    }

    const existingDnsPrefetch = document.querySelector(`link[data-spline-hint="dns-${hintKey}"]`);
    if (!existingDnsPrefetch) {
      const dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = origin;
      dnsPrefetch.dataset.splineHint = `dns-${hintKey}`;
      document.head.append(dnsPrefetch);
    }
  } catch (error) {
    void error;
  }
};

const bindFlowRowTrackerEvents = () => {
  if (flowTrackerEventsBound) return;
  flowTrackerEventsBound = true;

  window.addEventListener("scroll", scheduleFlowRowTrackerUpdate, { passive: true });
  window.addEventListener("resize", scheduleFlowRowTrackerUpdate);
  window.addEventListener("orientationchange", scheduleFlowRowTrackerUpdate);
};

let mediaCaptionCounter = 0;

const getMediaCaptionId = (blockId = "") => {
  const trimmedId = String(blockId || "").trim();
  if (trimmedId) return `${trimmedId}-caption`;
  mediaCaptionCounter += 1;
  return `cs-media-caption-${mediaCaptionCounter}`;
};

const normalizeMedia = (value, defaults = {}) => {
  if (!value || typeof value !== "object") return null;

  const type = value.type === "video" ? "video" : "image";
  const src = String(value.src || "").trim();
  if (!src) return null;

  const hasShowCaption = Object.prototype.hasOwnProperty.call(value, "showCaption");
  const fallbackShowCaption = defaults.showCaption !== undefined ? defaults.showCaption : true;
  const resolvedCaption = String(value.caption || value.label || value.alt || "").trim();

  return {
    type,
    src,
    poster: String(value.poster || "").trim(),
    caption: resolvedCaption,
    credit: String(value.credit || "").trim(),
    controls: value.controls !== false,
    autoplay: Boolean(value.autoplay),
    loop: Boolean(value.loop),
    muted: Boolean(value.muted),
    preload: String(value.preload || "metadata"),
    variant: String(value.variant || defaults.variant || "figure"),
    showCaption: hasShowCaption ? value.showCaption !== false : fallbackShowCaption,
  };
};

const createMediaElement = (media, className, captionId = "") => {
  if (!media?.src) return null;

  if (media.type === "video") {
    const video = document.createElement("video");
    video.className = className;
    video.src = media.src;
    video.poster = media.poster || "";
    video.preload = media.preload || "metadata";
    video.controls = media.controls !== false;
    video.autoplay = Boolean(media.autoplay);
    video.loop = Boolean(media.loop);
    video.muted = Boolean(media.muted);
    if (video.muted) video.setAttribute("muted", "");
    video.playsInline = true;
    if (captionId) {
      video.setAttribute("aria-labelledby", captionId);
    } else if (media.caption) {
      video.setAttribute("aria-label", media.caption);
    }
    return video;
  }

  const img = document.createElement("img");
  img.className = className;
  img.src = media.src;
  img.alt = captionId ? "" : media.caption || "";
  if (captionId) img.setAttribute("aria-labelledby", captionId);
  return img;
};

const normalizeFigureMedia = (figure = {}) => {
  const media = normalizeMedia(figure, { variant: "figure", showCaption: true });
  if (!media || media.type !== "video") return media;
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(figure, key);
  return {
    ...media,
    controls: hasOwn("controls") ? media.controls : false,
    autoplay: hasOwn("autoplay") ? media.autoplay : true,
    loop: hasOwn("loop") ? media.loop : true,
    muted: hasOwn("muted") ? media.muted : true,
  };
};

const normalizeHeroMedia = (hero = {}) =>
  normalizeMedia(
    hero.media || {
      type: hero.type || "image",
      src: hero.imageSrc || "",
      caption: hero.caption || hero.label || hero.imageAlt || "",
      poster: hero.poster || "",
      credit: hero.credit || "",
      controls: hero.controls,
      autoplay: hero.autoplay,
      loop: hero.loop,
      muted: hero.muted,
      preload: hero.preload,
      variant: "hero",
      showCaption: true,
    },
    { variant: "hero", showCaption: true }
  );

const normalizeHeroSpline = (hero = {}) => {
  const spline = hero?.spline;
  if (typeof spline === "string") {
    const srcDefault = spline.trim();
    if (!srcDefault) return null;
    return { srcDefault, srcDesktop: "", title: "", aspectRatio: "" };
  }

  if (spline && typeof spline === "object") {
    const srcDefault = String(
      spline.srcDefault || spline.srcMobile || spline.src || spline.url || ""
    ).trim();
    const srcDesktop = String(
      spline.srcDesktop || spline.src || spline.url || srcDefault
    ).trim();
    if (!srcDefault && !srcDesktop) return null;
    return {
      srcDefault,
      srcDesktop,
      title: String(spline.title || "").trim(),
      aspectRatio: String(spline.aspectRatio || "").trim(),
    };
  }
  return null;
};

const ensureSplineViewerScript = () => {
  if (customElements.get("spline-viewer")) return Promise.resolve();
  if (splineViewerScriptPromise) return splineViewerScriptPromise;
  applySplineNetworkHints();

  splineViewerScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SPLINE_VIEWER_SCRIPT_SRC}"]`);
    if (existing instanceof HTMLScriptElement) {
      if (customElements.get("spline-viewer")) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load spline-viewer script.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = SPLINE_VIEWER_SCRIPT_SRC;
    script.crossOrigin = "anonymous";
    script.fetchPriority = "high";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load spline-viewer script.")), {
      once: true,
    });
    document.head.append(script);
  }).catch((error) => {
    console.warn("[case-study-hero] Unable to load spline-viewer.", error);
  });

  return splineViewerScriptPromise;
};

const createMediaBlockElement = ({
  id = "",
  media = null,
  blockClassName = "cs-fig",
  mediaClassName = "cs-fig-image",
  includeCaption = true,
} = {}) => {
  const block = document.createElement("figure");
  block.className = blockClassName;
  block.id = id || "";

  const shouldRenderCaption =
    includeCaption &&
    media &&
    media.showCaption !== false &&
    (media.caption || media.credit);
  const captionId = shouldRenderCaption ? getMediaCaptionId(id) : "";

  const mediaEl = createMediaElement(media, mediaClassName, captionId);
  if (!mediaEl) return block;
  block.append(mediaEl);

  if (shouldRenderCaption) {
    const caption = document.createElement("figcaption");
    caption.className = "cs-fig-caption";
    caption.id = captionId;
    caption.textContent = [media.caption, media.credit].filter(Boolean).join(" | ");
    block.append(caption);
  }

  return block;
};

const createFigureElement = (figure = {}) => {
  const normalizedVariant = String(figure.variant || "large")
    .trim()
    .toLowerCase();
  const sizeVariant = normalizedVariant === "small" ? "small" : "large";

  return createMediaBlockElement({
    id: figure.id || "",
    media: normalizeFigureMedia(figure),
    blockClassName: `cs-fig cs-fig--${sizeVariant}`,
    mediaClassName: "cs-fig-image",
    includeCaption: true,
  });
};

const createFigMatrixElement = (block = {}) => {
  const wrapper = document.createElement("div");
  const variantKey = String(block.variant || "")
    .trim()
    .toLowerCase();
  const normalizedVariant =
    variantKey === "mobilescreens" || variantKey === "mobile-screens"
      ? "mobile-screens"
      : "";
  wrapper.className = `cs-fig-matrix${normalizedVariant ? ` cs-fig-matrix--${normalizedVariant}` : ""}`;
  wrapper.dataset.blockType = "figMatrix";
  if (typeof block.id === "string" && block.id.trim()) {
    wrapper.id = block.id.trim();
  }

  const rawFigures = Array.isArray(block.figures)
    ? block.figures
    : Array.isArray(block.items)
      ? block.items
      : [];
  const figures = rawFigures
    .filter((figure) => figure && typeof figure === "object")
    .slice(0, 4);

  for (const figure of figures) {
    const media = normalizeFigureMedia(figure);
    if (!media?.src) continue;
    const figureEl = createMediaBlockElement({
      id: figure.id || "",
      media,
      blockClassName: "cs-fig cs-fig--matrix-item",
      mediaClassName: "cs-fig-image",
      includeCaption: true,
    });
    wrapper.append(figureEl);
  }

  return wrapper;
};

const createHeroMediaElement = (hero = {}) =>
  createMediaBlockElement({
    media: normalizeHeroMedia(hero),
    blockClassName: "cs-fig cs-fig--hero",
    mediaClassName: "cs-fig-image cs-hero-image",
    includeCaption: true,
  });

const createHeroSplineEmbedElement = (spline = {}, hero = {}) => {
  const desktopQuery = window.matchMedia("(min-width: 1024px)");
  const getUrl = () =>
    desktopQuery.matches
      ? (spline.srcDesktop || spline.srcDefault || "")
      : (spline.srcDefault || spline.srcDesktop || "");
  const initialUrl = getUrl();
  if (!initialUrl) return null;

  const ariaLabel = spline.title || hero?.title || "Interactive 3D scene";
  const makeViewer = (url) => {
    const v = document.createElement("spline-viewer");
    v.className = "cs-hero-spline-embed";
    v.setAttribute("url", url);
    v.setAttribute("aria-label", ariaLabel);
    return v;
  };
  let viewer = makeViewer(initialUrl);
  const updateUrl = () => {
    const nextUrl = getUrl();
    if (!nextUrl || nextUrl === viewer.getAttribute("url")) return;
    const next = makeViewer(nextUrl);
    viewer.replaceWith(next);
    viewer = next;
  };
  if (typeof desktopQuery.addEventListener === "function") {
    desktopQuery.addEventListener("change", updateUrl);
  } else if (typeof desktopQuery.addListener === "function") {
    desktopQuery.addListener(updateUrl);
  }
  const ready = ensureSplineViewerScript().then(() => {
    updateUrl();
  });
  return { element: viewer, ready };
};

const createHeroVisualElement = (hero = {}) => {
  const spline = normalizeHeroSpline(hero);
  if (!spline) return createHeroMediaElement(hero);

  const block = document.createElement("figure");
  block.className = "cs-fig cs-fig--hero";

  const frame = document.createElement("div");
  frame.className = "cs-hero-media-mount";
  if (spline.aspectRatio) {
    frame.style.setProperty("--cs-hero-spline-aspect", spline.aspectRatio);
  }

  const embed = createHeroSplineEmbedElement(spline, hero);
  if (!embed) return createHeroMediaElement(hero);
  const { element: embedEl, ready } = embed;
  frame.append(embedEl);
  Promise.resolve(ready).then(() => {
    frame.classList.add("is-ready");
  });
  block.append(frame);

  return block;
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
    return src ? { type: "image", src, alt: "", variant: "" } : null;
  }

  if (value && typeof value === "object") {
    const type = value.type === "video" ? "video" : "image";
    const src = String(value.src || "").trim();
    const alt = String(value.caption || value.label || value.alt || "").trim();
    const poster = String(value.poster || "").trim();
    const variant = String(value.variant || "").trim().toLowerCase();
    if (!src) return null;
    return { type, src, alt, poster, variant };
  }

  return null;
};

const normalizeBulletItem = (item) => {
  if (typeof item === "string") {
    return { text: item, stamp: null };
  }

  if (Array.isArray(item)) {
    const [text = "", maybeStamp = "", legacyCaption = ""] = item;
    const stamp =
      typeof maybeStamp === "object"
        ? normalizeStamp(maybeStamp)
        : normalizeStamp({ src: maybeStamp, caption: legacyCaption });
    return {
      text: String(text).trim(),
      stamp,
    };
  }

  if (item && typeof item === "object") {
    const text = item.text ?? item.body ?? item.value ?? "";
    const stamp = normalizeStamp(
      item.stamp ??
        item.image ??
        { src: item.imageSrc, caption: item.imageCaption ?? item.imageAlt }
    );
    return {
      text: String(text).trim(),
      stamp,
    };
  }

  return { text: "", stamp: null };
};

const normalizeProgressMatrixPairs = (progressMatrix) => {
  const rawItems = normalizeRowItems(progressMatrix);
  const pairs = [];

  for (const item of rawItems) {
    if (Array.isArray(item)) {
      const [primary = "", secondary = "", third = "", fourth = ""] = item;
      const stamp =
        typeof third === "object"
          ? normalizeStamp(third)
          : normalizeStamp({ src: third, caption: fourth });

      pairs.push({
        primary: String(primary).trim(),
        secondary: String(secondary).trim(),
        primaryStamp: null,
        secondaryStamp: stamp,
      });
      continue;
    }

    if (item && typeof item === "object") {
      const primary = item.primary ?? "";
      const secondary = item.secondary ?? "";
      const primaryStamp = normalizeStamp(item.primaryStamp ?? null);
      const secondaryStamp = normalizeStamp(item.secondaryStamp ?? item.stamp ?? null);
      pairs.push({
        primary: String(primary).trim(),
        secondary: String(secondary).trim(),
        primaryStamp,
        secondaryStamp,
      });
      continue;
    }

    if (typeof item === "string") {
      const match = item.match(/^(.*?)\s+-\s+(.*)$/);
      if (match) {
        pairs.push({
          primary: match[1].trim(),
          secondary: match[2].trim(),
          primaryStamp: null,
          secondaryStamp: null,
        });
      } else {
        pairs.push({
          primary: item.trim(),
          secondary: "",
          primaryStamp: null,
          secondaryStamp: null,
        });
      }
    }
  }

  return pairs.filter(
    (pair) =>
      pair.primary ||
      pair.secondary ||
      pair.primaryStamp ||
      pair.secondaryStamp
  );
};

const normalizeProgressRowItem = (item) => {
  if (typeof item === "string") {
    return { text: item, stamps: [] };
  }

  if (Array.isArray(item)) {
    const [text = "", first = null, second = null] = item;
    const stamps = [normalizeStamp(first), normalizeStamp(second)].filter(Boolean);
    return {
      text: String(text).trim(),
      stamps: stamps.slice(0, 2),
    };
  }

  if (item && typeof item === "object") {
    const text = String(item.text ?? "").trim();
    const stamps = [];

    if (Array.isArray(item.stamps)) {
      for (const stamp of item.stamps) {
        const normalized = normalizeStamp(stamp);
        if (normalized) stamps.push(normalized);
      }
    } else {
      const first = normalizeStamp(item.stamp);
      const second = normalizeStamp(item.stamp2);
      if (first) stamps.push(first);
      if (second) stamps.push(second);
    }

    return { text, stamps: stamps.slice(0, 2) };
  }

  return { text: "", stamps: [] };
};

const createStampElement = (stamp, className = "cs-stamp") => {
  const normalized = normalizeStamp(stamp);
  if (!normalized) return null;

  const stampEl = document.createElement("div");
  stampEl.className = className;
  if (normalized.variant === "small") {
    stampEl.classList.add("cs-stamp--small");
  }

  if (normalized.type === "video") {
    const video = document.createElement("video");
    video.className = "cs-stamp-content";
    video.src = normalized.src;
    video.poster = normalized.poster || "";
    video.preload = "metadata";
    video.controls = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute("muted", "");
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

const createItemTextElement = (
  value,
  rootClassName = "cs-bullet-item-text",
  options = {}
) => {
  const titleClassName = options.titleClassName || "cs-bullet-item-title";
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
  for (const rawBlock of blocks) {
    const overlinePrefix = rawBlock.match(/^\(([^)]+)\)\s*(.*)$/);
    const block = overlinePrefix ? overlinePrefix[2].trim() : rawBlock;

    if (overlinePrefix) {
      const overline = document.createElement("span");
      overline.className = "cs-item-overline";
      overline.textContent = overlinePrefix[1].trim();
      content.append(overline);
      if (!block) continue;
    }

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
      title.className = titleClassName;
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

const createIconGridElement = (iconGrid) => {
  const iconGridEl = document.createElement("div");
  iconGridEl.className = "cs-icon-grid";

  const items = normalizeRowItems(iconGrid);
  const itemCount = Math.max(1, items.length);
  const columnCount =
    itemCount <= 2
      ? itemCount
      : Math.min(3, Math.ceil(itemCount / 2));

  iconGridEl.style.setProperty("--cs-icon-grid-cols", String(columnCount));
  iconGridEl.dataset.iconGridCount = String(itemCount);

  for (let i = 0; i < itemCount; i += 1) {
    const itemData = normalizeBulletItem(items[i]);
    const iconGridItemEl = document.createElement("div");
    iconGridItemEl.className = "cs-icon-grid-item";

    const iconGridItemTextEl = createItemTextElement(
      itemData.text,
      "cs-icon-grid-item-text",
      { titleClassName: "cs-icon-grid-item-title" }
    );

    const iconGridStamp = itemData.stamp
      ? { variant: "small", ...itemData.stamp }
      : null;
    const stampEl = createStampElement(iconGridStamp, "cs-stamp cs-icon-grid-item-stamp");

    if (stampEl) {
      iconGridItemEl.append(stampEl, iconGridItemTextEl);
    } else {
      const placeholderStamp = document.createElement("div");
      placeholderStamp.className = "cs-stamp cs-stamp--small cs-icon-grid-item-stamp cs-stamp--placeholder";
      placeholderStamp.setAttribute("aria-hidden", "true");
      iconGridItemEl.append(placeholderStamp, iconGridItemTextEl);
    }

    iconGridEl.append(iconGridItemEl);
  }

  return iconGridEl;
};

const createFlowRowElement = (flowRow) => {
  const flowRowEl = document.createElement("div");
  flowRowEl.className = "cs-flow-row";
  const flowTrackerEl = document.createElement("div");
  flowTrackerEl.className = "cs-flow-row-tracker";
  flowTrackerEl.setAttribute("aria-hidden", "true");
  const flowItemsGroupEl = document.createElement("div");
  flowItemsGroupEl.className = "cs-flow-row-items-group";

  const items = normalizeRowItems(flowRow);
  const itemCount = Math.max(1, items.length);

  for (let i = 0; i < itemCount; i += 1) {
    const flowItemEl = document.createElement("div");
    flowItemEl.className = "cs-flow-row-item";

    const flowTextEl = createItemTextElement(items[i], "cs-flow-row-item-text");
    flowItemEl.append(flowTextEl);
    flowItemsGroupEl.append(flowItemEl);
  }

  flowRowEl.append(flowTrackerEl, flowItemsGroupEl);
  return flowRowEl;
};

const createProgressMatrixElement = (progressMatrix) => {
  const progressMatrixEl = document.createElement("div");
  progressMatrixEl.className = "cs-progress-matrix";

  const itemsGroupEl = document.createElement("div");
  itemsGroupEl.className = "cs-progress-matrix-items-group";

  for (const pair of normalizeProgressMatrixPairs(progressMatrix)) {
    const itemEl = document.createElement("div");
    itemEl.className = "cs-progress-matrix-item";

    const primaryEl = createItemTextElement(
      pair.primary,
      "cs-progress-matrix-item-primary"
    );

    const primaryGroupEl = document.createElement("div");
    primaryGroupEl.className = "cs-progress-matrix-primary-block";
    primaryGroupEl.append(primaryEl);

    if (pair.primaryStamp) {
      const primaryStampEl = createStampElement(pair.primaryStamp, "cs-stamp cs-progress-matrix-item-stamp");
      if (primaryStampEl) primaryGroupEl.append(primaryStampEl);
    }

    const chevronEl = document.createElement("span");
    chevronEl.className = "cs-progress-matrix-chevron";
    chevronEl.setAttribute("aria-hidden", "true");
    chevronEl.textContent = "⌄";

    const secondaryEl = createItemTextElement(
      pair.secondary,
      "cs-progress-matrix-item-secondary"
    );

    const secondaryGroupEl = document.createElement("div");
    secondaryGroupEl.className = "cs-progress-matrix-secondary-block";
    secondaryGroupEl.append(secondaryEl);

    if (pair.secondaryStamp) {
      const stampEl = createStampElement(pair.secondaryStamp, "cs-stamp cs-progress-matrix-item-stamp");
      if (stampEl) secondaryGroupEl.append(stampEl);
    }

    itemEl.append(primaryGroupEl, chevronEl, secondaryGroupEl);

    itemsGroupEl.append(itemEl);
  }

  progressMatrixEl.append(itemsGroupEl);
  return progressMatrixEl;
};

const createProgressRowElement = (progressRow) => {
  const progressRowEl = document.createElement("div");
  progressRowEl.className = "cs-progress-row";

  const items = normalizeRowItems(progressRow).slice(0, 5);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const itemData = normalizeProgressRowItem(item);
    const itemEl = document.createElement("div");
    itemEl.className = "cs-progress-row-item";

    const stampsEl = document.createElement("div");
    stampsEl.className = "cs-progress-row-item-stamps-group";
    for (const stamp of itemData.stamps) {
      const stampEl = createStampElement(stamp, "cs-stamp cs-progress-row-item-stamp");
      if (stampEl) stampsEl.append(stampEl);
    }
    if (stampsEl.childElementCount > 0) itemEl.append(stampsEl);

    const textEl = createItemTextElement(itemData.text, "cs-progress-row-item-text");
    itemEl.append(textEl);

    progressRowEl.append(itemEl);

    if (i < items.length - 1) {
      const chevronEl = document.createElement("span");
      chevronEl.className = "cs-progress-row-chevron";
      chevronEl.setAttribute("aria-hidden", "true");
      chevronEl.textContent = "⌄";
      progressRowEl.append(chevronEl);
    }
  }

  return progressRowEl;
};

const renderCaseStudy = (content = {}, root) => {
  if (!root) return;
  if (normalizeHeroSpline(content.hero || {})) {
    void ensureSplineViewerScript();
  }
  bindHeaderBarEvents();
  updateHeaderBarStickyState();
  bindFlowRowTrackerEvents();
  const sectionsGroup = document.createElement("article");
  sectionsGroup.className = "cs-sections-group";

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

  const heroMedia = createHeroVisualElement(content.hero || {});
  if (heroMedia.firstChild) hero.append(heroMedia);
  for (const sectionData of content.sections || []) {
    const section = document.createElement("section");
    section.className = "cs-div-section";
    section.id = sectionData.id || "";

    const header = document.createElement("h2");
    header.className = "cs-section-header";
    header.textContent = sectionData.header || "";

    section.append(header);
    const blocks = Array.isArray(sectionData.blocks) ? sectionData.blocks : [];
    for (const block of blocks) {
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
      const heroSpline = normalizeHeroSpline(content?.hero || {});
      if (heroSpline) {
        const urlsToWarm = [...new Set([heroSpline.srcDefault, heroSpline.srcDesktop].filter(Boolean))];
        for (const url of urlsToWarm) {
          fetch(url, { mode: "no-cors", cache: "force-cache" }).catch(() => {});
        }
      }
      setWindowActiveIDFromContent(content);
      const navItems = await loadHeaderNavItems();
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
