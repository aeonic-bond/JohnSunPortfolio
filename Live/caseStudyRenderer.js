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

const createFigureElement = (figure = {}) => {
  const fig = document.createElement("figure");
  fig.className = "cs-fig";
  fig.id = figure.id || "";
  const hasImage = Boolean(figure.src);

  if (hasImage) {
    const img = document.createElement("img");
    img.className = "cs-fig-image";
    img.src = figure.src;
    img.alt = figure.alt || "";
    fig.append(img);
  }

  if (hasImage && (figure.caption || figure.credit)) {
    const caption = document.createElement("figcaption");
    caption.className = "cs-fig-caption type-body2";
    caption.textContent = [figure.caption, figure.credit].filter(Boolean).join(" | ");
    fig.append(caption);
  }

  return fig;
};

const createBulletItemTextElement = (value) => {
  const content = document.createElement("div");
  content.className = "cs-bullet-item-text";

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
    const titleWithBody = block.match(/^([^"\n].*?)\s+-\s+(.+)$/);

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

    if (titleWithBody) {
      const title = document.createElement("h3");
      title.className = "cs-bullet-item-title";
      title.textContent = titleWithBody[1].trim();
      content.append(title);

      const paragraph = document.createElement("p");
      paragraph.className = "cs-bullet-item-text-block";
      paragraph.textContent = titleWithBody[2].trim();
      content.append(paragraph);
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

  let items = [];
  if (Array.isArray(bulletRow)) {
    items = bulletRow;
  } else if (typeof bulletRow === "string") {
    items = [bulletRow];
  } else if (bulletRow && typeof bulletRow === "object" && Array.isArray(bulletRow.items)) {
    items = bulletRow.items;
  } else if (bulletRow && typeof bulletRow === "object" && typeof bulletRow.text === "string") {
    items = [bulletRow.text];
  }

  const itemCount = Math.max(1, items.length);
  for (let i = 0; i < itemCount; i += 1) {
    const bulletItemEl = document.createElement("div");
    bulletItemEl.className = "cs-bullet-item";
    const bulletItemCounterEl = document.createElement("div");
    bulletItemCounterEl.className = "cs-bullet-item-counter";
    bulletItemCounterEl.textContent = String(i + 1);

    const bulletItemTextEl = createBulletItemTextElement(items[i]);
    bulletItemEl.append(bulletItemCounterEl, bulletItemTextEl);
    bulletRowEl.append(bulletItemEl);
  }

  return bulletRowEl;
};

const renderCaseStudy = (content = {}, root) => {
  if (!root) return;

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
    }

    for (const figureId of sectionData.figureIds || []) {
      const figure = figureMap.get(figureId);
      if (!figure) continue;
      section.append(createFigureElement(figure));
    }

    sectionsAll.append(section);
  }

  root.replaceChildren(hero, sectionsAll);
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
