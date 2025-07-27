/**
 * Pagination utilities
 */

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page: unknown,
  perPage: unknown,
): { page: number; perPage: number } {
  const defaultPage = 1;
  const defaultPerPage = 20;
  const maxPerPage = 100;

  let validPage = defaultPage;
  let validPerPage = defaultPerPage;

  if (typeof page === "string" || typeof page === "number") {
    const parsed = Number(page);
    if (!Number.isNaN(parsed) && parsed > 0) {
      validPage = Math.floor(parsed);
    }
  }

  if (typeof perPage === "string" || typeof perPage === "number") {
    const parsed = Number(perPage);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= maxPerPage) {
      validPerPage = Math.floor(parsed);
    }
  }

  return { page: validPage, perPage: validPerPage };
}
