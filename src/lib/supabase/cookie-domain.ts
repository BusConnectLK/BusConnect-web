/**
 * Shares the Supabase session cookie across every busconnect.lk subdomain
 * (www, partner, admin) so signing in once works everywhere — an operator
 * signed in on the main site is already signed in on partner.busconnect.lk.
 *
 * Only applied in real production: setting `Domain=.busconnect.lk` on
 * localhost or a *.vercel.app preview URL makes the browser reject the
 * cookie outright (its actual host doesn't match that domain), which would
 * break auth entirely in dev and previews rather than just not sharing it.
 */
export const COOKIE_DOMAIN =
  process.env.VERCEL_ENV === 'production' ? '.busconnect.lk' : undefined;
