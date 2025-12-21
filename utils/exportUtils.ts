/**
 * Generate a safe filename for export
 */
export function generateExportFilename(
  prefix: string,
  brandName?: string,
  extension: string = "png"
): string {
  const safeBrandName = brandName?.replace(/[^a-z0-9]/gi, "_") || "brand";
  const timestamp = new Date().toISOString().split("T")[0];
  return `${prefix}_${safeBrandName}_${timestamp}.${extension}`;
}
