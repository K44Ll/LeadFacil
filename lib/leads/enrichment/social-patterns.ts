import { normalizeHttpUrl } from "@/lib/leads/utils/normalize-url";

export const SOCIAL_NETWORKS = {
  instagram: { hosts: ["instagram.com"], preferredPath: null },
  facebook: { hosts: ["facebook.com", "fb.com"], preferredPath: null },
  linkedin: { hosts: ["linkedin.com"], preferredPath: "/company/" },
  tiktok: { hosts: ["tiktok.com"], preferredPath: null },
  youtube: { hosts: ["youtube.com", "youtu.be"], preferredPath: null },
  twitter: { hosts: ["x.com", "twitter.com"], preferredPath: null },
  threads: { hosts: ["threads.net"], preferredPath: null },
  telegram: { hosts: ["t.me", "telegram.me"], preferredPath: null },
} as const;

export type SocialNetwork = keyof typeof SOCIAL_NETWORKS;

const IGNORED_PATHS = new Set([
  "",
  "/",
  "/share",
  "/sharer",
  "/intent",
  "/dialog",
  "/plugins",
]);

export function identifySocialUrl(value: string) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) return null;
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const entry = Object.entries(SOCIAL_NETWORKS).find(([, config]) =>
    config.hosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    ),
  );
  if (!entry || IGNORED_PATHS.has(url.pathname.toLowerCase())) return null;
  url.search = "";
  url.hash = "";
  return { network: entry[0] as SocialNetwork, url: url.toString() };
}
