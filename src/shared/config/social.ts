export interface SocialIconHint {
  host: string;
  label: string;
  icon: string;
}

export const SOCIAL_ICON_HINTS: SocialIconHint[] = [
  { host: 'github.com', label: 'GitHub', icon: 'gh' },
  { host: 'linkedin.com', label: 'LinkedIn', icon: 'in' },
  { host: 'twitter.com', label: 'Twitter', icon: 'tw' },
  { host: 'x.com', label: 'X', icon: 'x' },
  { host: 'mastodon.social', label: 'Mastodon', icon: 'm' },
  { host: 'bsky.app', label: 'Bluesky', icon: 'bs' },
];

export interface ResolvedSocialLink {
  href: string;
  label: string;
  icon: string;
}

export function resolveSocialLink(href: string): ResolvedSocialLink {
  for (const hint of SOCIAL_ICON_HINTS) {
    if (href.includes(hint.host)) {
      return { href, label: hint.label, icon: hint.icon };
    }
  }
  return { href, label: new URL(href).hostname, icon: 'link' };
}
