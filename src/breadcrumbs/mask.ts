const MASK = "[masked]";
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const BEARER = /(Bearer\s+)\S+/gi;
const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;

/** Replaces JWTs, bearer tokens and email addresses with `[masked]`. */
export function maskPii(text: string): string {
  return text.replace(JWT, MASK).replace(BEARER, `$1${MASK}`).replace(EMAIL, MASK);
}

/** Drops the query string and fragment; request parameters often carry tokens. */
export function stripUrl(url: string): string {
  return url.split(/[?#]/)[0] ?? url;
}
