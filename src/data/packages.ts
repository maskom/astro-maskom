export interface BasePackage {
  id: string;
  name: string;
  description: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
}

export interface Package extends BasePackage {
  displayName?: string;
  badge?: string;
  highlights?: string[];
  accent?: string;
  glow?: string;
  featured?: boolean;
}

export const contactInfo = {
  whatsapp: 'https://wa.me/6283867803521',
  contactLink: '#contact',
} as const;

export const packages: Package[] = [
  {
    id: 'home-access',
    name: 'Home Access',
    displayName: 'Home Access',
    badge: 'Rumah & keluarga',
    description:
      'Koneksi fiber simetris untuk kebutuhan hiburan dan produktivitas keluarga tanpa takut kuota habis.',
    highlights: [
      'Dedicated bandwidth',
      'Unlimited + tanpa FUP',
      'Instalasi dan maintenance cepat',
    ],
    accent: '#6366f1',
    glow: 'rgba(99,102,241,0.75)',
    price: 'Mulai dari Rp 200.000/bulan',
    features: [],
    ctaText: 'Konsultasi via WhatsApp',
    ctaLink: contactInfo.whatsapp,
  },
  {
    id: 'soho',
    name: 'SOHO',
    displayName: 'Small Office Home Office',
    badge: 'Small Office Home Office',
    description:
      'Stabilitas jaringan bisnis rumahan dengan SLA jelas agar kolaborasi dan transaksi daring tetap lancar.',
    highlights: [
      'IP publik statis opsional',
      'Monitoring 24/7',
      'Prioritas support engineer',
    ],
    accent: '#0ea5e9',
    glow: 'rgba(14,165,233,0.75)',
    featured: true,
    price: 'Mulai dari Rp 750.000/bulan',
    features: [],
    ctaText: 'Konsultasi via WhatsApp',
    ctaLink: contactInfo.whatsapp,
  },
  {
    id: 'corporate',
    name: 'Corporate',
    displayName: 'Corporate',
    badge: 'Perusahaan & enterprise',
    description:
      'Infrastruktur terkelola dengan kapasitas tinggi, redundancy, dan dukungan managed service profesional.',
    highlights: [
      'SLA premium & failover',
      'Integrasi VPN/MPLS',
      'Tim account manager dedikasi',
    ],
    accent: '#06b6d4',
    glow: 'rgba(6,182,212,0.75)',
    price: 'Mulai dari Rp 2.500.000/bulan',
    features: [],
    ctaText: 'Konsultasi via WhatsApp',
    ctaLink: contactInfo.whatsapp,
  },
];

export const homeAccessPackages: Package[] = [
  {
    id: 'home-a',
    name: 'Paket A',
    description:
      'Deskripsi singkat paket A untuk Home Access. Cocok untuk penggunaan rumahan.',
    price: 'Rp 200.000',
    features: [
      'Kecepatan hingga 10 Mbps',
      'Unlimited Kuota',
      'Dukungan Teknis 24/7',
    ],
    ctaText: 'Chat WhatsApp',
    ctaLink: contactInfo.whatsapp,
  },
  {
    id: 'home-b',
    name: 'Paket B',
    description:
      'Deskripsi singkat paket B untuk Home Access. Lebih cepat dan stabil.',
    price: 'Rp 350.000',
    features: [
      'Kecepatan hingga 25 Mbps',
      'Unlimited Kuota',
      'Dukungan Teknis Prioritas',
    ],
    ctaText: 'Chat WhatsApp',
    ctaLink: contactInfo.whatsapp,
  },
  {
    id: 'home-c',
    name: 'Paket C',
    description:
      'Deskripsi singkat paket C untuk Home Access. Performa terbaik untuk keluarga besar.',
    price: 'Rp 500.000',
    features: [
      'Kecepatan hingga 50 Mbps',
      'Unlimited Kuota',
      'Dukungan Teknis Premium',
    ],
    ctaText: 'Chat WhatsApp',
    ctaLink: contactInfo.whatsapp,
  },
];

export const sohoPackages: Package[] = [
  {
    id: 'soho-pro',
    name: 'Paket Pro',
    description:
      'Deskripsi singkat paket Pro untuk SOHO. Ideal untuk startup dan bisnis kecil.',
    price: 'Rp 750.000',
    features: [
      'Kecepatan hingga 100 Mbps',
      'Jaminan Bandwidth',
      'IP Publik Statis',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
  {
    id: 'soho-business',
    name: 'Paket Business',
    description:
      'Deskripsi singkat paket Business untuk SOHO. Solusi lengkap untuk bisnis menengah.',
    price: 'Rp 1.500.000',
    features: ['Kecepatan hingga 200 Mbps', 'SLA 99.5%', 'Dedicated Support'],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
  {
    id: 'soho-enterprise',
    name: 'Paket Enterprise',
    description:
      'Deskripsi singkat paket Enterprise untuk SOHO. Performa maksimal untuk bisnis besar.',
    price: 'Rp 3.000.000',
    features: ['Kecepatan hingga 500 Mbps', 'SLA 99.9%', 'Managed Service'],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
];

export const corporatePackages: Package[] = [
  {
    id: 'corporate-business',
    name: 'Paket Business',
    description:
      'Deskripsi singkat paket Business untuk Corporate. Solusi handal untuk perusahaan.',
    price: 'Rp 2.500.000',
    features: [
      'Kecepatan hingga 500 Mbps',
      'SLA 99.9%',
      'IP Publik Statis + Monitoring Jaringan',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
  {
    id: 'corporate-enterprise',
    name: 'Paket Enterprise',
    description:
      'Deskripsi singkat paket Enterprise untuk Corporate. Infrastruktur terkelola penuh.',
    price: 'Rp 5.000.000',
    features: [
      'Kecepatan hingga 1 Gbps',
      'SLA 99.95%',
      'Managed Service + Security',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
  {
    id: 'corporate-custom',
    name: 'Solusi Custom',
    description:
      'Solusi jaringan khusus yang disesuaikan dengan kebutuhan spesifik perusahaan Anda.',
    price: 'Custom',
    features: [
      'Bandwidth Sesuai Kebutuhan',
      'SLA Custom',
      'Dedicated Infrastructure',
    ],
    ctaText: 'Konsultasi',
    ctaLink: contactInfo.contactLink,
  },
];

export const landingPackages: Package[] = [
  {
    id: 'home-basic',
    name: 'Paket Rumah Basic',
    description:
      'Browsing & Streaming Ringan, Cocok untuk 1-2 Pengguna, Pemasangan Gratis',
    price: 'Rp 150.000',
    features: [
      'Browsing & Streaming Ringan',
      'Cocok untuk 1-2 Pengguna',
      'Pemasangan Gratis',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
  {
    id: 'home-premium',
    name: 'Paket Rumah Premium',
    description:
      'Streaming HD & Gaming Online, Cocok untuk 3-5 Pengguna, Pemasangan Gratis, Prioritas Dukungan',
    price: 'Rp 300.000',
    features: [
      'Streaming HD & Gaming Online',
      'Cocok untuk 3-5 Pengguna',
      'Pemasangan Gratis',
      'Prioritas Dukungan',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
  {
    id: 'business-enterprise',
    name: 'Paket Bisnis Enterprise',
    description:
      'Kinerja Tinggi untuk Bisnis, SLA Terjamin, Dukungan 24/7, IP Publik Statis',
    price: 'Rp 750.000',
    features: [
      'Kinerja Tinggi untuk Bisnis',
      'SLA Terjamin',
      'Dukungan 24/7',
      'IP Publik Statis',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
  },
];
