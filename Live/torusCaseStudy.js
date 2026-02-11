const root = document.getElementById("case-study-root");

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

  if (figure.src) {
    const img = document.createElement("img");
    img.className = "cs-fig-image";
    img.src = figure.src;
    img.alt = figure.alt || "";
    fig.append(img);
  }

  if (figure.caption || figure.credit) {
    const caption = document.createElement("figcaption");
    caption.className = "cs-fig-caption type-body2";
    caption.textContent = [figure.caption, figure.credit].filter(Boolean).join(" | ");
    fig.append(caption);
  }

  return fig;
};

const renderCaseStudy = (content = {}) => {
  if (!root) return;

  const figureMap = new Map((content.figures || []).map((figure) => [figure.id, figure]));
  const article = document.createElement("article");
  article.className = "cs-article";

  const hero = document.createElement("header");
  hero.className = "cs-hero";

  const title = document.createElement("h1");
  title.className = "cs-title";
  title.textContent = content.hero?.title || "";

  const subtitle = document.createElement("p");
  subtitle.className = "cs-subtitle";
  subtitle.textContent = content.hero?.subtitle || "";

  hero.append(title, subtitle);
  article.append(hero);

  for (const sectionData of content.sections || []) {
    const section = document.createElement("section");
    section.className = "cs-section";
    section.id = sectionData.id || "";

    const header = document.createElement("h2");
    header.className = "cs-section-header";
    header.textContent = sectionData.header || "";

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "cs-section-body";
    bodyWrap.append(createBodyFragment(sectionData.body || ""));

    section.append(header, bodyWrap);

    for (const figureId of sectionData.figureIds || []) {
      const figure = figureMap.get(figureId);
      if (!figure) continue;
      section.append(createFigureElement(figure));
    }

    article.append(section);
  }

  root.replaceChildren(article);
};

fetch("./TorusContent.json")
  .then((response) => {
    if (!response.ok) throw new Error("Failed to load TorusContent.json");
    return response.json();
  })
  .then((content) => {
    renderCaseStudy(content);
  })
  .catch((error) => {
    if (!root) return;
    const message = document.createElement("p");
    message.className = "type-body1";
    message.textContent = error.message;
    root.replaceChildren(message);
  });
