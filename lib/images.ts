// Build URLs to the Amsterdam city archive's public image CDN and record pages.
//
// The photographs are NOT ours — they belong to Stadsarchief Amsterdam and the
// credited rights holders. We only hot-link to the archive's own servers and
// link back to the original record. See README / CLAUDE.md.
//
// The seed `src` (a UUID filename like "854f….jpg") maps directly to the CDN.
// Only certain preset sizes exist; 350x350 and 1000x1000 are known-good.

const CDN = "https://images.memorix.nl/ams/thumb";

export type ThumbSize = "350x350" | "1000x1000";

/** Grid thumbnail (smaller) or detail image (larger). */
export function imageUrl(src: string, size: ThumbSize = "350x350"): string {
  return `${CDN}/${size}/${src}`;
}

export const thumbUrl = (src: string) => imageUrl(src, "350x350");
export const detailUrl = (src: string) => imageUrl(src, "1000x1000");

/** The original archive record page. Prefer the photo's stored `link`; fall
 *  back to the modern canonical detail URL built from the guid. */
export function archiveUrl(link: string, guid: string): string {
  if (link && /^https?:\/\//.test(link)) return link;
  return `https://archief.amsterdam/beeldbank/detail/${guid}`;
}

export const ARCHIVE_HOME = "https://archief.amsterdam/beeldbank/";
