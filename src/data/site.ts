import { env } from '../lib/env';

// Only for Astro page
export const siteConfig = {
  title: env.SITE_NAME,
  description: env.SITE_DESCRIPTION,
};

export const home = {
  title: env.SITE_NAME,
  subtitle: "Internet Cepat & Andal",
  description:
    "Internet dedicated stabil untuk rumah, kantor, dan enterprise di seluruh Indonesia.",
  features: [
    {
      title: "Jaringan Pribadi",
      description: "Koneksi dedicated tanpa batas pemakaian",
    },
    {
      title: "Dukungan 24/7",
      description: "Tim support siap membantu kapan pun",
    },
    {
      title: "Skalabel",
      description: "Paket untuk kebutuhan rumahan hingga enterprise",
    },
  ],
  stats: [
    {
      value: "99%",
      label: "Uptime",
    },
    {
      value: "24/7",
      label: "Support",
    },
    {
      value: "1000+",
      label: "Pelanggan",
    },
  ],
};
