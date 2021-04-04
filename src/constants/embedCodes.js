export const pymCodeFromTemplate = (embedSlug, embedUrl) => {
  return `<div id="${embedSlug}"></div><script type="text/javascript">new pym.Parent("${embedSlug}", "${embedUrl}", {});</script>`;
};
