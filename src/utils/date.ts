/**
 * Utility functions for strict DD-MM-YYYY date formatting
 */

/**
 * Formats any date string or Date object to DD-MM-YYYY format.
 * E.g., '2026-11-28' -> '28-11-2026'
 * E.g., '2026-11-28T14:30:00.000Z' -> '28-11-2026'
 */
export function formatToDDMMYYYY(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const str = String(dateInput).trim();

  // Already in DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    return `${day}-${month}-${year}`;
  }

  // Matches YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const yyyymmddMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yyyymmddMatch) {
    const year = yyyymmddMatch[1];
    const month = yyyymmddMatch[2].padStart(2, '0');
    const day = yyyymmddMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // Fallback to JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // If it's a descriptive date like "January 2027" or "Tentative", return as-is
  return str;
}

/**
 * Parses a date string (either DD-MM-YYYY or YYYY-MM-DD) into a timestamp for comparisons.
 */
export function parseDateToTime(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // Check DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    return new Date(year, month, day, 23, 59, 59).getTime();
  }

  // Check YYYY-MM-DD
  const yyyymmddMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    return new Date(year, month, day, 23, 59, 59).getTime();
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return null;
}

/**
 * Calculates days remaining until a given end date (supports DD-MM-YYYY).
 */
export function getDaysRemaining(endDateStr: string | undefined | null): number | null {
  const endTime = parseDateToTime(endDateStr);
  if (endTime === null) return null;

  const now = new Date();
  const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffTime = endTime - todayTime;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns today's date in DD-MM-YYYY format
 */
export function getTodayDDMMYYYY(): string {
  return formatToDDMMYYYY(new Date());
}

/**
 * Returns date in DD-MM-YYYY after specified number of days
 */
export function getDateAfterDaysDDMMYYYY(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatToDDMMYYYY(d);
}
