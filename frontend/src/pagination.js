export function getPaginationItems(currentPage, totalPages) {
  const total = Math.max(0, Number(totalPages) || 0);
  if (total === 0) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const current = Math.min(Math.max(1, Number(currentPage) || 1), total);
  const pages = new Set([1, total, current]);

  if (current <= 4) {
    for (let page = 2; page <= 5; page += 1) pages.add(page);
  } else if (current >= total - 3) {
    for (let page = total - 4; page < total; page += 1) pages.add(page);
  } else {
    pages.add(current - 1);
    pages.add(current + 1);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  return sortedPages.flatMap((page, index) => {
    const previous = sortedPages[index - 1];
    if (!previous || page - previous === 1) return [page];
    return [{ type: "ellipsis", key: `ellipsis-${previous}-${page}` }, page];
  });
}
