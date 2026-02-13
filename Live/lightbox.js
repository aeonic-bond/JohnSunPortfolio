const OVERLAY_ID = "cs-lightbox-overlay";
const ZOOM_KEYS = new Set(["+", "=", "-", "_", "0"]);
const MEDIA_MIN_ZOOM = 1;
const MEDIA_MAX_ZOOM = 4;
const MEDIA_ZOOM_STEP = 0.15;

const isOverlayOpen = () => {
  const overlay = document.getElementById(OVERLAY_ID);
  return overlay?.getAttribute("aria-hidden") === "false";
};

const clampZoomValue = (value, min, max) => Math.min(max, Math.max(min, value));

const getMediaMount = () => {
  const overlay = ensureOverlay();
  return overlay.querySelector(".cs-lightbox-mediaMount");
};

const getMediaZoom = (mount) => Number(mount?.dataset.zoom ?? "1");

const setMediaZoom = (mount, zoom) => {
  if (!(mount instanceof HTMLElement)) return;
  const nextZoom = clampZoomValue(zoom, MEDIA_MIN_ZOOM, MEDIA_MAX_ZOOM);
  mount.dataset.zoom = String(nextZoom);
  mount.style.setProperty("--cs-lightbox-zoom", String(nextZoom));
};

const getMediaIntrinsicSize = (mediaElement) => {
  if (mediaElement instanceof HTMLImageElement) {
    if (mediaElement.naturalWidth > 0 && mediaElement.naturalHeight > 0) {
      return { width: mediaElement.naturalWidth, height: mediaElement.naturalHeight };
    }
    return null;
  }

  if (mediaElement instanceof HTMLVideoElement) {
    if (mediaElement.videoWidth > 0 && mediaElement.videoHeight > 0) {
      return { width: mediaElement.videoWidth, height: mediaElement.videoHeight };
    }
    return null;
  }

  return null;
};

const applyContainedMediaSize = (mediaMount) => {
  if (!(mediaMount instanceof HTMLElement)) return;
  const media = mediaMount.querySelector(".cs-lightbox-media");
  if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) return;

  const intrinsicSize = getMediaIntrinsicSize(media);
  if (!intrinsicSize) return;

  const mountRect = mediaMount.getBoundingClientRect();
  if (mountRect.width <= 0 || mountRect.height <= 0) return;

  const widthScale = mountRect.width / intrinsicSize.width;
  const heightScale = mountRect.height / intrinsicSize.height;
  const scale = Math.min(widthScale, heightScale);
  if (!Number.isFinite(scale) || scale <= 0) return;

  const widthPx = Math.floor(intrinsicSize.width * scale);
  const heightPx = Math.floor(intrinsicSize.height * scale);

  media.style.width = `${widthPx}px`;
  media.style.height = `${heightPx}px`;
  media.style.maxWidth = "none";
  media.style.maxHeight = "none";
};

const getSourceMediaAccessibleText = (sourceMedia) => {
  if (!(sourceMedia instanceof Element)) return "";

  const labelledBy = sourceMedia.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }

  const captionText = sourceMedia
    .closest(".cs-fig")
    ?.querySelector(".cs-fig-caption")
    ?.textContent?.trim();
  if (captionText) return captionText;

  if (sourceMedia instanceof HTMLImageElement) {
    return sourceMedia.alt || "";
  }

  return sourceMedia.getAttribute("aria-label") || "";
};

const createLightboxMediaElement = (sourceMedia) => {
  const accessibleText = getSourceMediaAccessibleText(sourceMedia);

  if (sourceMedia instanceof HTMLImageElement) {
    const image = document.createElement("img");
    image.className = "cs-lightbox-media";
    image.src = sourceMedia.currentSrc || sourceMedia.src;
    image.alt = accessibleText;
    return image;
  }

  if (sourceMedia instanceof HTMLVideoElement) {
    const video = document.createElement("video");
    video.className = "cs-lightbox-media";
    video.poster = sourceMedia.poster || "";
    video.preload = sourceMedia.preload || "metadata";
    video.controls = true;
    video.autoplay = false;
    video.loop = sourceMedia.loop;
    video.muted = sourceMedia.muted;
    video.playsInline = true;
    if (accessibleText) video.setAttribute("aria-label", accessibleText);

    const sourceTags = Array.from(sourceMedia.querySelectorAll("source"));
    if (sourceTags.length > 0) {
      for (const sourceTag of sourceTags) {
        const nextSource = document.createElement("source");
        nextSource.src = sourceTag.src;
        if (sourceTag.type) nextSource.type = sourceTag.type;
        video.append(nextSource);
      }
    } else {
      video.src = sourceMedia.currentSrc || sourceMedia.src;
    }

    return video;
  }

  return null;
};

const setMediaFromFigure = (figureElement) => {
  if (!(figureElement instanceof Element)) return false;
  const mediaMount = getMediaMount();
  if (!(mediaMount instanceof HTMLElement)) return false;

  const sourceMedia = figureElement.querySelector(".cs-fig-image");
  const lightboxMedia = createLightboxMediaElement(sourceMedia);
  if (!lightboxMedia) return false;

  const syncMediaSize = () => applyContainedMediaSize(mediaMount);

  if (lightboxMedia instanceof HTMLImageElement) {
    lightboxMedia.addEventListener("load", syncMediaSize, { once: true });
  }
  if (lightboxMedia instanceof HTMLVideoElement) {
    lightboxMedia.addEventListener("loadedmetadata", syncMediaSize, { once: true });
  }

  mediaMount.replaceChildren(lightboxMedia);
  setMediaZoom(mediaMount, 1);
  applyContainedMediaSize(mediaMount);

  if (lightboxMedia instanceof HTMLImageElement && lightboxMedia.complete) {
    window.requestAnimationFrame(syncMediaSize);
  }

  return true;
};

const ensureOverlay = () => {
  let overlay = document.getElementById(OVERLAY_ID);
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.className = "cs-lightbox-overlay";
  overlay.setAttribute("aria-hidden", "true");
  const panel = document.createElement("div");
  panel.className = "cs-lightbox-panel";
  const panelHeader = document.createElement("div");
  panelHeader.className = "cs-lightbox-panelHeader";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "cs-lightbox-closeButton";
  closeButton.setAttribute("aria-label", "Close lightbox");
  const closeIcon = document.createElement("img");
  closeIcon.className = "cs-lightbox-closeIcon";
  closeIcon.src = "../../Assets/CloseButton.svg";
  closeIcon.alt = "";
  closeIcon.setAttribute("aria-hidden", "true");
  closeButton.append(closeIcon);
  closeButton.addEventListener("click", closeOverlay);
  panelHeader.append(closeButton);
  const mediaMount = document.createElement("div");
  mediaMount.className = "cs-lightbox-mediaMount";
  panel.append(panelHeader);
  panel.append(mediaMount);
  overlay.append(panel);
  document.body.append(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  return overlay;
};

const openOverlay = (figureElement) => {
  if (!setMediaFromFigure(figureElement)) return;
  const overlay = ensureOverlay();
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("cs-lightbox-active");

  window.requestAnimationFrame(() => {
    applyContainedMediaSize(getMediaMount());
  });
};

const closeOverlay = () => {
  const overlay = ensureOverlay();
  const mediaMount = getMediaMount();
  const mountedVideo = mediaMount?.querySelector("video");
  if (mountedVideo instanceof HTMLVideoElement) mountedVideo.pause();
  mediaMount?.replaceChildren();
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cs-lightbox-active");
};

const initLightbox = () => {
  ensureOverlay();

  // Delegate so dynamically rendered figures are supported.
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const figure = target.closest(".cs-fig");
    if (figure) {
      openOverlay(figure);
    }
  });

  // While overlay is open, prevent browser/page zoom gestures.
  document.addEventListener(
    "wheel",
    (event) => {
      if (!isOverlayOpen()) return;

      const overlay = ensureOverlay();
      const target = event.target;
      if (!(target instanceof Element) || !overlay.contains(target)) return;

      event.preventDefault();
      event.stopPropagation();

      if (!event.ctrlKey && !event.metaKey) return;

      const mediaMount = target.closest(".cs-lightbox-mediaMount");
      if (!(mediaMount instanceof HTMLElement)) return;

      const direction = event.deltaY < 0 ? 1 : -1;
      const currentZoom = getMediaZoom(mediaMount);
      const nextZoom = currentZoom + direction * MEDIA_ZOOM_STEP;
      setMediaZoom(mediaMount, nextZoom);
    },
    { passive: false }
  );

  for (const gestureEventName of ["gesturestart", "gesturechange", "gestureend"]) {
    document.addEventListener(
      gestureEventName,
      (event) => {
        if (!isOverlayOpen()) return;
        event.preventDefault();
      },
      { passive: false }
    );
  }

  window.addEventListener("resize", () => {
    if (!isOverlayOpen()) return;
    applyContainedMediaSize(getMediaMount());
  });

  document.addEventListener("keydown", (event) => {
    if (isOverlayOpen() && (event.ctrlKey || event.metaKey) && ZOOM_KEYS.has(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key !== "Escape") return;
    closeOverlay();
  });
};

window.LiveLightbox = { initLightbox };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLightbox, { once: true });
} else {
  initLightbox();
}
