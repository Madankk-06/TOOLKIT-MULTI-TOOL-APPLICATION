const TERMS_ACCEPTED_KEY = 'toolkit_terms_accepted_v1';

export function isTermsAccepted(userId: string): boolean {
  if (!userId) return false;
  try {
    const data = JSON.parse(localStorage.getItem(TERMS_ACCEPTED_KEY) || '{}');
    return !!data[userId];
  } catch {
    return false;
  }
}

export function markTermsAccepted(userId: string): void {
  if (!userId) return;
  try {
    const data = JSON.parse(localStorage.getItem(TERMS_ACCEPTED_KEY) || '{}');
    data[userId] = { acceptedAt: new Date().toISOString() };
    localStorage.setItem(TERMS_ACCEPTED_KEY, JSON.stringify(data));
  } catch {}
}
