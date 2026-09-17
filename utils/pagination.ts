/** Matches Django REST Framework default page size in CRM-api-1. */
export const DEFAULT_PAGE_SIZE = 20;

export function totalPagesFromCount(count: number, pageSize = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, count) / pageSize));
}

/** Numbered page buttons with ellipsis, same algorithm as CRM-project list pages. */
export function getPaginationItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push('ellipsis');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
}
