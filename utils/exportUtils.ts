/**
 * Sanitize a string to be safe for filenames
 * Converts to lowercase and replaces spaces and special characters with hyphens
 */
function sanitizeForFilename(str: string | undefined | null): string {
  if (!str) return "unknown";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gi, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generate filename for funnel heatmap export
 * Format: surfacemap-dot-cc-[BRAND]-[USE CASE]-[TARGET MARKET]-[UTCDATE].png
 */
export function generateFunnelExportFilename(
  brandName?: string,
  useCase?: string,
  targetMarket?: string,
  extension: string = "png"
): string {
  const brand = sanitizeForFilename(brandName);
  const useCaseSafe = sanitizeForFilename(useCase);
  const market = sanitizeForFilename(targetMarket);
  const utcDate = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "-")
    .split("Z")[0];

  return `surfacemap-dot-cc-${brand}-${useCaseSafe}-${market}-${utcDate}.${extension}`;
}
