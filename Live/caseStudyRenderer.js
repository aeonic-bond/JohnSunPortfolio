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
  return createMediaBlockElement({
    id: figure.id || "",
    media: normalizeFigureMedia(figure),
    blockClassName: "cs-fig",
    mediaClassName: "cs-fig-image",
    includeCaption: true,
  });
};

const createHeroMediaElement = (hero = {}) =>
  createMediaBlockElement({
    media: normalizeHeroMedia(hero),
    blockClassName: "cs-fig cs-fig--hero",
    mediaClassName: "cs-fig-image cs-hero-image",
    includeCaption: true,
  });

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

const normalizeProgressPairs = (progressRow, options = {}) => {
  const isThreeBlocks = Boolean(options.isThreeBlocks);
  const rawItems = normalizeRowItems(progressRow);
  const pairs = [];

  for (const item of rawItems) {
    if (Array.isArray(item)) {
      const [primary = "", secondary = "", third = "", fourth = "", fifth = "", sixth = ""] = item;
      let tertiary = "";
      let stamp = null;
      let primaryStamp = null;
      let secondaryStamp = null;
      let tertiaryStamp = null;

      if (isThreeBlocks) {
        tertiary = typeof third === "string" ? third.trim() : "";
        primaryStamp = normalizeStamp(
          (fourth && typeof fourth === "object" ? fourth : null) ??
            (typeof fourth === "string" ? { src: fourth, caption: "" } : null)
        );
        secondaryStamp = normalizeStamp(
          (fifth && typeof fifth === "object" ? fifth : null) ??
            (typeof fifth === "string" ? { src: fifth, caption: "" } : null)
        );
        tertiaryStamp = normalizeStamp(
          (sixth && typeof sixth === "object" ? sixth : null) ??
            (typeof sixth === "string" ? { src: sixth, caption: "" } : null)
        );
      } else {
        stamp =
          typeof third === "object"
            ? normalizeStamp(third)
            : normalizeStamp({ src: third, caption: fourth });
      }

      pairs.push({
        primary: String(primary).trim(),
        secondary: String(secondary).trim(),
        tertiary: String(tertiary).trim(),
        primaryStamp,
        secondaryStamp,
        tertiaryStamp,
        stamp,
      });
      continue;
    }

    if (item && typeof item === "object") {
      const primary =
        item.primary ??
        item.Primary ??
        item.left ??
        item.title ??
        item.label ??
        "";
      const secondary =
        item.secondary ??
        item.Secondary ??
        item.right ??
        item.value ??
        item.detail ??
        "";
      const tertiary =
        item.tertiary ??
        item.Tertiary ??
        item.third ??
        item.extra ??
        "";
      const primaryStamp = normalizeStamp(
        item.primaryStamp ??
          item.PrimaryStamp ??
          { src: item.primaryImageSrc, caption: item.primaryImageCaption ?? item.primaryImageAlt }
      );
      const secondaryStamp = normalizeStamp(
        item.secondaryStamp ??
          item.SecondaryStamp ??
          { src: item.secondaryImageSrc, caption: item.secondaryImageCaption ?? item.secondaryImageAlt }
      );
      const tertiaryStamp = normalizeStamp(
        item.tertiaryStamp ??
          item.TertiaryStamp ??
          { src: item.tertiaryImageSrc, caption: item.tertiaryImageCaption ?? item.tertiaryImageAlt }
      );
      const stamp = normalizeStamp(
        item.stamp ??
          item.Stamp ??
          item.image ??
          { src: item.imageSrc, caption: item.imageCaption ?? item.imageAlt }
      );
      pairs.push({
        primary: String(primary).trim(),
        secondary: String(secondary).trim(),
        tertiary: String(tertiary).trim(),
        primaryStamp,
        secondaryStamp,
        tertiaryStamp,
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
          tertiary: "",
          primaryStamp: null,
          secondaryStamp: null,
          tertiaryStamp: null,
          stamp: null,
        });
      } else {
        pairs.push({
          primary: item.trim(),
          secondary: "",
          tertiary: "",
          primaryStamp: null,
          secondaryStamp: null,
          tertiaryStamp: null,
          stamp: null,
        });
      }
    }
  }

  return pairs.filter(
    (pair) =>
      pair.primary ||
      pair.secondary ||
      pair.tertiary ||
      pair.primaryStamp ||
      pair.secondaryStamp ||
      pair.tertiaryStamp ||
      pair.stamp
  );
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
  const rawVariant =
    progressRow && typeof progressRow === "object"
      ? progressRow.variant || progressRow.layout || ""
      : "";
  const normalizedVariant = String(rawVariant)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (
    normalizedVariant === "3-blocks" ||
    normalizedVariant === "3blocks" ||
    normalizedVariant === "three-blocks"
  ) {
    progressRowEl.classList.add("cs-progress-row--3-blocks");
  }
  const isThreeBlocks = progressRowEl.classList.contains("cs-progress-row--3-blocks");

  const itemsAllEl = document.createElement("div");
  itemsAllEl.className = "cs-progress-row-itemsAll";

  for (const pair of normalizeProgressPairs(progressRow, { isThreeBlocks })) {
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

    if (isThreeBlocks) {
      const chevronEl2 = document.createElement("span");
      chevronEl2.className = "cs-progress-row-chevron cs-progress-row-chevron--secondary";
      chevronEl2.setAttribute("aria-hidden", "true");
      chevronEl2.textContent = "⌄";

      const primaryElText = primaryEl;
      const secondaryElText = secondaryEl;
      const tertiaryElText = createItemTextElement(
        pair.tertiary,
        "cs-progress-row-item-tertiary"
      );
      const primaryBlockEl = document.createElement("div");
      primaryBlockEl.className = "cs-progress-row-item-primary-block";
      const primaryStampEl = createStampElement(
        pair.primaryStamp ? { variant: "small", ...pair.primaryStamp } : null,
        "cs-stamp cs-progress-row-item-stamp-small"
      );
      if (primaryStampEl) primaryBlockEl.append(primaryStampEl);
      primaryBlockEl.append(primaryElText);

      const secondaryBlockEl = document.createElement("div");
      secondaryBlockEl.className = "cs-progress-row-item-secondary-block";
      const secondaryStampValue = pair.secondaryStamp || pair.stamp;
      const secondaryStampEl = createStampElement(
        secondaryStampValue ? { variant: "small", ...secondaryStampValue } : null,
        "cs-stamp cs-progress-row-item-stamp-small"
      );
      if (secondaryStampEl) secondaryBlockEl.append(secondaryStampEl);
      secondaryBlockEl.append(secondaryElText);

      const tertiaryBlockEl = document.createElement("div");
      tertiaryBlockEl.className = "cs-progress-row-item-tertiary-block";
      const tertiaryStampEl = createStampElement(
        pair.tertiaryStamp ? { variant: "small", ...pair.tertiaryStamp } : null,
        "cs-stamp cs-progress-row-item-stamp-small"
      );
      if (tertiaryStampEl) tertiaryBlockEl.append(tertiaryStampEl);
      tertiaryBlockEl.append(tertiaryElText);

      itemEl.append(primaryBlockEl, chevronEl, secondaryBlockEl, chevronEl2, tertiaryBlockEl);
    } else {
      itemEl.append(primaryEl, chevronEl, secondaryAllEl);
    }

    itemsAllEl.append(itemEl);
  }

  progressRowEl.append(itemsAllEl);
  return progressRowEl;
};

const renderCaseStudy = (content = {}, root) => {
  if (!root) return;
  bindFlowRowTrackerEvents();
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

  hero.append(introText);

  const heroMedia = createHeroMediaElement(content.hero || {});
  if (heroMedia.firstChild) hero.append(heroMedia);
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

        if (block.type === "iconGrid") {
          section.append(createIconGridElement(block.items || block));
          continue;
        }

        if (block.type === "figure" || block.type === "fig") {
          const inlineFigure =
            block.figure && typeof block.figure === "object"
              ? block.figure
              : null;
          if (inlineFigure) section.append(createFigureElement(inlineFigure));
          continue;
        }

        if (block.type === "progressRow") {
          section.append(createProgressRowElement(block));
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

      for (const iconGrid of sectionData.iconGrids || []) {
        section.append(createIconGridElement(iconGrid));
      }

      for (const progressRow of sectionData.progressRows || []) {
        section.append(createProgressRowElement(progressRow));
      }
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
