export const ModuleMount = {
  name: "module-mount",
  create(contentNode = null) {
    const root = document.createElement("div");
    root.className = "module-mount";
    if (contentNode) root.appendChild(contentNode);
    return root;
  },
};
