import { ExamNotification } from '../types/exam';

export interface LinkConfirmationStatus {
  confirmed: boolean;
  available: boolean;
  reason: string;
  applyOnlineStatus: 'verified' | 'warning' | 'error' | 'missing' | 'unchecked';
  notificationPdfStatus: 'verified' | 'warning' | 'error' | 'missing' | 'unchecked';
  missingLinks: string[];
}

/**
 * Validates whether mandatory links (Apply Online Direct Link & Official Notification PDF)
 * are available AND confirmed.
 *
 * Requirements:
 * 1. Available: Both links must be non-empty and start with http:// or https://.
 * 2. Confirmed: Both links must be tested by the verification service, valid, and not in an error state.
 *
 * If either link is missing or unconfirmed, the exam is NOT confirmed and must not reside in the approval queue.
 */
export function checkExamLinksConfirmed(exam: Partial<ExamNotification>): LinkConfirmationStatus {
  const applyUrl = exam.links?.applyOnline?.trim() || '';
  const pdfUrl = exam.links?.notificationPdf?.trim() || '';

  const missingLinks: string[] = [];
  if (!applyUrl) missingLinks.push('Apply Online Direct Link');
  if (!pdfUrl) missingLinks.push('Official Notification PDF');

  const isValidUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const applyValidSyntax = isValidUrl(applyUrl);
  const pdfValidSyntax = isValidUrl(pdfUrl);

  if (!applyValidSyntax && applyUrl) {
    missingLinks.push('Apply Online (Invalid URL syntax)');
  }
  if (!pdfValidSyntax && pdfUrl) {
    missingLinks.push('Official PDF (Invalid URL syntax)');
  }

  const available = applyUrl !== '' && pdfUrl !== '' && applyValidSyntax && pdfValidSyntax;

  if (!available) {
    return {
      confirmed: false,
      available: false,
      reason: `Mandatory links not available: ${missingLinks.join(', ')}`,
      applyOnlineStatus: !applyUrl ? 'missing' : (!applyValidSyntax ? 'error' : 'unchecked'),
      notificationPdfStatus: !pdfUrl ? 'missing' : (!pdfValidSyntax ? 'error' : 'unchecked'),
      missingLinks
    };
  }

  const verif = exam.linkVerification;

  if (!verif) {
    return {
      confirmed: false,
      available: true,
      reason: 'Mandatory links have not been verified yet.',
      applyOnlineStatus: 'unchecked',
      notificationPdfStatus: 'unchecked',
      missingLinks: []
    };
  }

  const applyCheck = verif.applyOnline;
  const pdfCheck = verif.notificationPdf;

  const applyStatus = applyCheck?.status || 'unchecked';
  const pdfStatus = pdfCheck?.status || 'unchecked';

  if (!applyCheck || applyStatus === 'unchecked') {
    return {
      confirmed: false,
      available: true,
      reason: 'Apply Online link verification is unconfirmed (unchecked).',
      applyOnlineStatus: 'unchecked',
      notificationPdfStatus: pdfStatus,
      missingLinks: []
    };
  }

  if (applyStatus === 'error' || applyCheck.valid === false) {
    return {
      confirmed: false,
      available: true,
      reason: `Apply Online link failed verification: ${applyCheck.message || 'Broken link or unreachable host'}.`,
      applyOnlineStatus: 'error',
      notificationPdfStatus: pdfStatus,
      missingLinks: []
    };
  }

  if (!pdfCheck || pdfStatus === 'unchecked') {
    return {
      confirmed: false,
      available: true,
      reason: 'Official Notification PDF verification is unconfirmed (unchecked).',
      applyOnlineStatus: applyStatus,
      notificationPdfStatus: 'unchecked',
      missingLinks: []
    };
  }

  if (pdfStatus === 'error' || pdfCheck.valid === false) {
    return {
      confirmed: false,
      available: true,
      reason: `Official Notification PDF failed verification: ${pdfCheck.message || 'Broken link or unreachable host'}.`,
      applyOnlineStatus: applyStatus,
      notificationPdfStatus: 'error',
      missingLinks: []
    };
  }

  // Both links exist, are reachable or warnings (WAF), and not in error
  return {
    confirmed: true,
    available: true,
    reason: 'Both Apply Online Direct Link and Official Notification PDF are verified and confirmed.',
    applyOnlineStatus: applyStatus,
    notificationPdfStatus: pdfStatus,
    missingLinks: []
  };
}
