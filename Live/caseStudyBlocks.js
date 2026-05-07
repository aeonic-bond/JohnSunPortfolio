const appendStyledText = (el, text) => {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const strong = document.createElement("strong");
      strong.textContent = parts[i];
      el.append(strong);
    } else if (parts[i]) {
      el.append(document.createTextNode(parts[i]));
    }
  }
};

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
        appendStyledText(item, line.replace(/^- /, ""));
        list.append(item);
      }
      fragment.append(list);
      continue;
    }

    const numberedLines = lines.filter((line) => /^\d+\.\s/.test(line));
    if (numberedLines.length === lines.length && lines.length > 0) {
      const list = document.createElement("ol");
      for (const line of lines) {
        const item = document.createElement("li");
        appendStyledText(item, line.replace(/^\d+\.\s/, ""));
        list.append(item);
      }
      fragment.append(list);
      continue;
    }

    const paragraph = document.createElement("p");
    appendStyledText(paragraph, lines.join(" "));
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
  "/Live/viewToggle/viewToggle.css",
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

  const headerText = String(block.header || "").trim();
  if (headerText) {
    const header = document.createElement("h2");
    header.className = "cs-section-header";
    header.textContent = headerText;
    moduleMountEl.append(header);
  }

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
    if (video.autoplay) video.setAttribute("autoplay", "");
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

const normalizeFigureMedia = (figure = {}) =>
  normalizeMedia(figure, { variant: "figure", showCaption: true });

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


const createMediaBlockElement = ({
  id = "",
  media = null,
  blockClassName = "cs-fig",
  mediaClassName = "cs-fig-mount",
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
    mediaClassName: "cs-fig-mount",
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
      mediaClassName: "cs-fig-mount",
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
    mediaClassName: "cs-fig-mount cs-hero-image",
    includeCaption: true,
  });

const createHeroVisualElement = (hero = {}) => createHeroMediaElement(hero);

const createHeroGalleryElement = (hero = {}) => {
  const GAP = 16;

  const items = Array.isArray(hero.gallery)
    ? hero.gallery.filter((item) => item?.src)
    : [];

  const wrapper = document.createElement("div");
  wrapper.className = "cs-hero-gallery";

  if (!items.length) return wrapper;

  const track = document.createElement("div");
  track.className = "cs-hero-gallery-track";

  const makeFrame = (item, ariaHidden = false) => {
    const frame = document.createElement("div");
    frame.className = "cs-hero-gallery-frame";
    if (ariaHidden) frame.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.className = "cs-hero-gallery-img";
    img.src = item.src;
    img.alt = item.alt || "";
    frame.append(img);
    return frame;
  };

  // track order: [clone(N-1), frame0..frameN-1, clone(0), clone(1)]
  const frames = items.map((item) => makeFrame(item));
  const clonePrev = makeFrame(items[items.length - 1], true);
  const cloneNext0 = makeFrame(items[0], true);
  const cloneNext1 = makeFrame(items[1] || items[0], true);
  const allFrames = [clonePrev, ...frames, cloneNext0, cloneNext1];

  const platform = document.createElement("div");
  platform.className = "cs-hero-gallery-platform";

  track.append(...allFrames);
  wrapper.append(platform, track);

  // domIndex 1 = first real frame
  let domIndex = 1;
  let interval = null;
  let transitioning = false;

  const getOffset = (index) => {
    const frameWidth = allFrames[0].offsetWidth;
    const containerWidth = wrapper.offsetWidth;
    return containerWidth / 2 - frameWidth / 2 - index * (frameWidth + GAP);
  };

  const applyTransform = (offset) => {
    track.style.transform = `translateX(${offset}px) translateZ(0)`;
  };

  const updateOverlays = () => {
    allFrames.forEach((frame, i) => {
      frame.classList.remove("cs-hero-gallery-frame--left", "cs-hero-gallery-frame--right");
      const dist = i - domIndex;
      if (dist === -1) frame.classList.add("cs-hero-gallery-frame--left");
      else if (dist === 1) frame.classList.add("cs-hero-gallery-frame--right");
    });
  };

  const snapTo = (index) => {
    track.style.transition = "none";
    wrapper.classList.add("cs-hero-gallery--snap");
    domIndex = index;
    applyTransform(getOffset(domIndex));
    updateOverlays();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      track.style.transition = "";
      wrapper.classList.remove("cs-hero-gallery--snap");
    }));
  };

  const updateTrack = (animated = true) => {
    if (!animated) { snapTo(domIndex); return; }
    applyTransform(getOffset(domIndex));
    const prev   = allFrames[domIndex - 1];
    const center = allFrames[domIndex];
    const next   = allFrames[domIndex + 1];
    if (prev)   { prev.classList.remove("cs-hero-gallery-frame--right");  prev.classList.add("cs-hero-gallery-frame--left"); }
    if (center) { center.classList.remove("cs-hero-gallery-frame--left", "cs-hero-gallery-frame--right"); }
    if (next)   { next.classList.remove("cs-hero-gallery-frame--left");   next.classList.add("cs-hero-gallery-frame--right"); }
  };

  track.addEventListener("transitionend", (e) => {
    if (e.target !== track || e.propertyName !== "transform") return;
    if (domIndex === items.length + 1) snapTo(1);
    setTimeout(() => { transitioning = false; }, 500);
  });

  const updatePlatform = () => {
    const frame = allFrames[domIndex];
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const spacer = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--spacer-300")) || 8;
    platform.style.left   = `${frameRect.left - wrapperRect.left - spacer}px`;
    platform.style.top    = `${frameRect.top  - wrapperRect.top  - spacer}px`;
    platform.style.width  = `${frameRect.width  + spacer * 2}px`;
    platform.style.height = `${frameRect.height + spacer * 2}px`;
  };

  const ro = new ResizeObserver(() => {
    updateTrack(false);
    requestAnimationFrame(updatePlatform);
  });
  ro.observe(wrapper);

  if (items.length > 1) {
    const advance = () => {
      if (transitioning) return;
      transitioning = true;
      domIndex++;
      updateTrack(true);
    };

    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!interval) interval = setInterval(advance, 1200);
        } else {
          clearInterval(interval);
          interval = null;
        }
      }
    }, { threshold: 0.8 });

    io.observe(wrapper);
  }

  return wrapper;
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

    const quoteWithCite = block.match(/^([""].*[""])\s*-\s*(.+)$/);
    const quoteOnly = /^[""].*[""]$/.test(block);
    const titleWithOptionalBody = block.match(/^([^"\n].*?)\s+-\s*(.*)$/);

    if (quoteWithCite || quoteOnly) {
      const quoteText = (quoteWithCite ? quoteWithCite[1] : block).replace(/^([""])|([""])$/g, "");
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

const makeFigRowFrame = (frameData = {}) => {
  const figures = Array.isArray(frameData.figures) && frameData.figures.length > 0
    ? frameData.figures
    : frameData.figure?.src
      ? [frameData.figure]
      : [];

  const frameEl = document.createElement("div");
  frameEl.className = "cs-fig-row-frame";

  const mediaEl = document.createElement("div");
  mediaEl.className = "cs-fig-row-frame__media";

  const imgEls = figures.map((fig, i) => {
    const img = document.createElement("img");
    img.className = "cs-fig-row-media-img";
    img.src = fig.src || "";
    img.alt = fig.alt || fig.caption || "";
    img.loading = "lazy";
    if (i > 0) img.hidden = true;
    mediaEl.append(img);
    return img;
  });

  frameEl.append(mediaEl);

  if (figures.length === 1 && figures[0].caption) {
    const caption = document.createElement("figcaption");
    caption.className = "cs-fig-caption";
    caption.textContent = figures[0].caption;
    frameEl.append(caption);
  }

  if (figures.length > 1) {
    let activeIndex = 0;
    const pillsEl = document.createElement("div");
    pillsEl.className = "cs-fig-row-frame__pills";

    const toggleEl = document.createElement("div");
    toggleEl.className = "view-toggle";
    toggleEl.setAttribute("role", "group");

    const selectorEl = document.createElement("div");
    selectorEl.className = "view-toggle__selector";
    toggleEl.append(selectorEl);

    const btnEls = figures.map((fig, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "view-toggle__button" + (i === 0 ? " is-selected" : "");
      btn.textContent = fig.label || String(i + 1);
      btn.setAttribute("aria-pressed", String(i === 0));
      btn.addEventListener("click", () => {
        if (i === activeIndex) return;
        imgEls[activeIndex].hidden = true;
        btnEls[activeIndex].classList.remove("is-selected");
        btnEls[activeIndex].setAttribute("aria-pressed", "false");
        activeIndex = i;
        imgEls[i].hidden = false;
        btnEls[i].classList.add("is-selected");
        btnEls[i].setAttribute("aria-pressed", "true");
        selectorEl.style.transform = `translateX(${i * 100}%)`;
      });
      toggleEl.append(btn);
      return btn;
    });
    selectorEl.style.transform = "translateX(0%)";
    pillsEl.append(toggleEl);
    frameEl.append(pillsEl);
  }

  return frameEl;
};

const createFigRowElement = (block = {}) => {
  const isStacking = block.variant === "stacking" && Array.isArray(block.frames) && block.frames.length > 0;

  const rowEl = document.createElement("div");
  rowEl.className = isStacking ? "cs-fig-row cs-fig-row--stacking" : "cs-fig-row";

  const mediaEl = document.createElement("div");
  mediaEl.className = "cs-fig-row-media";

  if (isStacking) {
    for (const frame of block.frames) {
      mediaEl.append(makeFigRowFrame(frame));
    }
    setTimeout(() => {
      const frameEls = Array.from(mediaEl.querySelectorAll(".cs-fig-row-frame"));
      if (frameEls.length < 2 || !rowEl.isConnected) return;
      const update = () => {
        const stickyTop = parseFloat(getComputedStyle(frameEls[0]).top) || 88;
        const frameHeight = frameEls[0].offsetHeight || 560;
        const triggerAt = stickyTop + frameHeight * 0.85;
        for (let i = 1; i < frameEls.length; i++) {
          const top = frameEls[i].getBoundingClientRect().top;
          const covered = top < triggerAt;
          frameEls[i - 1].classList.toggle("is-covered", covered);
          if (i >= 2) frameEls[i - 2].classList.toggle("is-deeply-covered", covered);
        }
      };
      window.addEventListener("scroll", update, { passive: true });
      update();
    }, 0);
  } else {
    mediaEl.append(makeFigRowFrame(block));
  }

  const textEl = document.createElement("div");
  textEl.className = "cs-fig-row-text";

  if (isStacking) {
    for (const frame of block.frames) {
      const textFrameEl = document.createElement("div");
      textFrameEl.className = "cs-fig-row-text-frame";
      if (frame.header) {
        const headerEl = document.createElement("h2");
        headerEl.className = "cs-fig-row-header";
        headerEl.textContent = frame.header;
        textFrameEl.append(headerEl);
      }
      if (frame.intro) {
        const introEl = document.createElement("div");
        introEl.className = "cs-fig-row-intro";
        introEl.append(createBodyFragment(String(frame.intro).trim()));
        textFrameEl.append(introEl);
      }
      const bodyText = String(frame.text || "").trim();
      if (bodyText) {
        const bodyEl = document.createElement("div");
        bodyEl.className = "cs-fig-row-body";
        bodyEl.append(createBodyFragment(bodyText));
        textFrameEl.append(bodyEl);
      }
      textEl.append(textFrameEl);
    }
  } else {
    const hg = block.headerGroup;
    if (hg?.header) {
      const headerEl = document.createElement("h2");
      headerEl.className = "cs-fig-row-header";
      headerEl.textContent = hg.header;
      textEl.append(headerEl);
    }
    if (hg?.intro) {
      const introEl = document.createElement("div");
      introEl.className = "cs-fig-row-intro";
      introEl.append(createBodyFragment(String(hg.intro).trim()));
      textEl.append(introEl);
    }
    const bodyText = String(block.text || "").trim();
    if (bodyText) {
      const bodyEl = document.createElement("div");
      bodyEl.className = "cs-fig-row-body";
      bodyEl.append(createBodyFragment(bodyText));
      textEl.append(bodyEl);
    }
  }

  rowEl.append(mediaEl, textEl);
  return rowEl;
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

const createProtoFlowElement = (block = {}) => {
  const el = document.createElement("div");
  el.className = "cs-proto-flow";

  const titleText = String(block.title || "").trim();
  if (titleText) {
    const title = document.createElement("h2");
    title.className = "cs-proto-flow-title";
    title.textContent = titleText;
    el.append(title);
  }

  const screens = Array.isArray(block.screens) ? block.screens : [];
  if (screens.length > 0) {
    const track = document.createElement("div");
    track.className = "cs-proto-flow-track";

    let orientationDetected = false;
    for (const screen of screens) {
      const screenEl = document.createElement("div");
      screenEl.className = "cs-proto-flow-screen";

      const imgWrap = document.createElement("div");
      imgWrap.className = "cs-proto-flow-img-wrap";

      if (screen.src) {
        const img = document.createElement("img");
        img.className = "cs-proto-flow-img";
        img.src = screen.src;
        img.alt = screen.label || "";
        img.loading = "lazy";
        if (!orientationDetected) {
          orientationDetected = true;
          const checkOrientation = () => {
            if (img.naturalHeight > img.naturalWidth) {
              el.classList.add("cs-proto-flow--portrait");
            }
          };
          if (img.complete && img.naturalWidth > 0) {
            checkOrientation();
          } else {
            img.addEventListener("load", checkOrientation, { once: true });
          }
        }
        imgWrap.append(img);
      }

      screenEl.append(imgWrap);

      const labelText = String(screen.label || "").trim();
      if (labelText) {
        const label = document.createElement("p");
        label.className = "cs-proto-flow-label";
        label.textContent = labelText;
        screenEl.append(label);
      }

      track.append(screenEl);
    }

    el.append(track);

    if (screens.length > 1) {
      const COOLDOWN_MS = 1800;

      let triggered  = false;
      let cooldownId = null;

      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !triggered && !cooldownId && track.scrollLeft === 0) {
            triggered  = true;
            cooldownId = setTimeout(() => { cooldownId = null; }, COOLDOWN_MS);
            const firstItem = track.firstElementChild;
            if (firstItem) {
              const gap = parseFloat(getComputedStyle(track).columnGap) || 12;
              track.scrollBy({ left: firstItem.offsetWidth + gap, behavior: "smooth" });
            }
          } else if (!entry.isIntersecting) {
            triggered = false;
          }
        }
      }, { rootMargin: "0px 0px -65% 0px", threshold: 0 });

      observer.observe(el);
    }
  }

  return el;
};
