export const pymCodeFromTemplate = (embedSlug: string, embedUrl: string) => {
  return `<div id="${embedSlug}"></div><script type="text/javascript" src="//graphics.thomsonreuters.com/pym.min.js"></script><script type="text/javascript">new pym.Parent("${embedSlug}", "${embedUrl}", {});</script>`;
};
