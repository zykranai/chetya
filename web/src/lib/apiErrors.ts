import axios from 'axios';

/** Pull user-visible text from FastAPI `{"detail": ...}` payloads. */
export function extractFastApiDetail(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const d = (data as { detail?: unknown }).detail;
  if (typeof d === 'string') return d.trim() || undefined;
  if (Array.isArray(d) && d.length > 0) {
    const first = d[0];
    if (first && typeof first === 'object' && first !== null && 'msg' in first) {
      const msg = (first as { msg?: string }).msg;
      if (typeof msg === 'string' && msg.trim()) return msg.trim();
    }
  }
  return undefined;
}

/** Use server-provided copy when it already reads like a sentence (validation, quotas). */
function preferServerDetail(status: number | undefined, detail: string): boolean {
  if (!detail || detail.length > 600) return false;
  if (status === 403 || status === 422) return true;
  if (status === 400 && !/^validation error$/i.test(detail)) return true;
  return false;
}

/**
 * Map Axios/network failures to calm, non-jargony copy for end users.
 */
export function friendlyApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = extractFastApiDetail(error.response?.data);

    if (detail && preferServerDetail(status, detail)) {
      return detail;
    }

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return 'That took too long. Check your connection and try again.';
      }
      return (
        'We couldn’t reach Chetya’s servers. Check your internet connection. ' +
        'If the site just opened, wait a minute — the service may be waking up — then try again.'
      );
    }

    switch (status) {
      case 400:
        return detail || 'Something in that request wasn’t quite right. Please check your details and try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return detail || 'You can’t do that right now. Try signing in, or wait a bit and try again.';
      case 404:
        return 'We couldn’t find that resource. Refresh the page or go back and try again.';
      case 405:
        return (
          'We couldn’t complete sign-in — the app talked to the wrong address. ' +
          'Try refreshing the page. If this keeps happening, let us know.'
        );
      case 408:
      case 504:
        return 'The server took too long to respond. Please try again.';
      case 429:
        return 'Too many requests right now. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
        return 'Our servers are having trouble right now. Please try again in a few minutes.';
      default:
        if (detail) return detail;
        break;
    }
  }

  if (error instanceof Error && error.message && !/^request failed with status code/i.test(error.message)) {
    return error.message;
  }

  return 'Something went wrong. Please try again in a moment.';
}
