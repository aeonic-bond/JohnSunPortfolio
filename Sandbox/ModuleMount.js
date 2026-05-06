import { createViewToggle } from "/Live/viewToggle/viewToggle.js";

export const ModuleMount = {
  name: "module-mount",
  create(contentNode = null, { initialView = "mobile" } = {}) {
    const root = document.createElement("div");
    root.className = "module-mount";
    root.dataset.view = initialView;

    const header = document.createElement("div");
    header.className = "module-mount__header";

    const prompt = document.createElement("p");
    prompt.className = "module-mount__prompt";
    prompt.textContent = "Interactive Demo";
    header.appendChild(prompt);

    const moduleNode = contentNode?.classList?.contains("module-dyoh")
      ? contentNode
      : contentNode?.querySelector?.(".module-dyoh");

    const toggle = createViewToggle({
      initialView,
      onChange: (view) => {
        root.dataset.view = view;
        moduleNode?.moduleDyohApi?.setVariant(view);
      },
    });
    header.appendChild(toggle);

    root.appendChild(header);
    if (contentNode) root.appendChild(contentNode);
    return root;
  },
};
