export const ModuleMount = {
  name: "module-mount",
  create(contentNode = null) {
    const root = document.createElement("div");
    root.className = "module-mount";
    const prompt = document.createElement("p");
    prompt.className = "module-mount__prompt";
    prompt.textContent = "interactive module - please try";
    root.appendChild(prompt);
    if (contentNode) root.appendChild(contentNode);
    return root;
  },
};
