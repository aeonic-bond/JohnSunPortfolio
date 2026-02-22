const createCtaButton = ({ label = "Read", disabled = false } = {}) => {
  const container = document.createElement("div");
  container.className = "card-cta-container";

  const button = document.createElement("button");
  button.className = "card-cta";
  button.type = "button";
  button.textContent = label;

  if (disabled) {
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
  }

  container.append(button);
  return { container, button };
};

window.LivePrimitives = window.LivePrimitives || {};
window.LivePrimitives.createCtaButton = createCtaButton;
