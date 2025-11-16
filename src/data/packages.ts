// Package categories for different use cases
export type PackageCategory = 'home' | 'soho' | 'corporate' | 'landing';
export type PackageType = 'main' | 'detailed' | 'landing';

// Base package interface with all common properties
export interface BasePackage {
  id: string;
  name: string;
  description: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  category: PackageCategory;
  type: PackageType;
}

// Enhanced package interface for main showcase packages
export interface Package extends BasePackage {
  displayName?: string;
  badge?: string;
  highlights?: string[];
  accent?: string;
  glow?: string;
  featured?: boolean;
  popular?: boolean;
}

// Contact information
export const contactInfo = {
  whatsapp: 'https://wa.me/6283867803521',
  contactLink: '#contact',
} as const;

// Unified package data - single source of truth
export const allPackages: Package[] = [
  // Main showcase packages (type: 'main')
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
    features: [
      'Kecepatan hingga 50 Mbps',
      'Unlimited Kuota',
      'Dukungan Teknis 24/7',
      'Instalasi Gratis',
    ],
    ctaText: 'Konsultasi via WhatsApp',
    ctaLink: contactInfo.whatsapp,
    category: 'home',
    type: 'main',
    featured: false,
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
    price: 'Mulai dari Rp 750.000/bulan',
    features: [
      'Kecepatan hingga 200 Mbps',
      'Jaminan Bandwidth',
      'IP Publik Statis',
      'SLA 99.5%',
    ],
    ctaText: 'Konsultasi via WhatsApp',
    ctaLink: contactInfo.whatsapp,
    category: 'soho',
    type: 'main',
    featured: true,
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
    features: [
      'Kecepatan hingga 1 Gbps',
      'SLA 99.9%',
      'Managed Service',
      'Dedicated Infrastructure',
    ],
    ctaText: 'Konsultasi via WhatsApp',
    ctaLink: contactInfo.whatsapp,
    category: 'corporate',
    type: 'main',
    featured: false,
  },

  // Detailed home packages (type: 'detailed')
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
    category: 'home',
    type: 'detailed',
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
    category: 'home',
    type: 'detailed',
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
    category: 'home',
    type: 'detailed',
  },

  // Detailed SOHO packages (type: 'detailed')
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
    category: 'soho',
    type: 'detailed',
  },
  {
    id: 'soho-business',
    name: 'Paket Business',
    description:
      'Deskripsi singkat paket Business untuk SOHO. Solusi lengkap untuk bisnis menengah.',
    price: 'Rp 1.500.000',
    features: [
      'Kecepatan hingga 200 Mbps',
      'SLA 99.5%',
      'Dedicated Support',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
    category: 'soho',
    type: 'detailed',
  },
  {
    id: 'soho-enterprise',
    name: 'Paket Enterprise',
    description:
      'Deskripsi singkat paket Enterprise untuk SOHO. Performa maksimal untuk bisnis besar.',
    price: 'Rp 3.000.000',
    features: [
      'Kecepatan hingga 500 Mbps',
      'SLA 99.9%',
      'Managed Service',
    ],
    ctaText: 'Pilih Paket',
    ctaLink: contactInfo.contactLink,
    category: 'soho',
    type: 'detailed',
  },

  // Detailed corporate packages (type: 'detailed')
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
    category: 'corporate',
    type: 'detailed',
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
    category: 'corporate',
    type: 'detailed',
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
    category: 'corporate',
    type: 'detailed',
  },

  // Landing page packages (type: 'landing')
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
    category: 'landing',
    type: 'landing',
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
    category: 'landing',
    type: 'landing',
    popular: true,
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
    category: 'landing',
    type: 'landing',
  },
];

// Utility functions for package filtering and sorting
export function getPackagesByCategory(category: PackageCategory): Package[] {
  return allPackages.filter(pkg => pkg.category === category);
}

export function getPackagesByType(type: PackageType): Package[] {
  return allPackages.filter(pkg => pkg.type === type);
}

export function getMainPackages(): Package[] {
  return getPackagesByType('main');
}

export function getHomePackages(): Package[] {
  return getPackagesByCategory('home').filter(pkg => pkg.type === 'detailed');
}

export function getSohoPackages(): Package[] {
  return getPackagesByCategory('soho').filter(pkg => pkg.type === 'detailed');
}

export function getCorporatePackages(): Package[] {
  return getPackagesByCategory('corporate').filter(pkg => pkg.type === 'detailed');
}

export function getLandingPackages(): Package[] {
  return getPackagesByType('landing');
}

export function getFeaturedPackages(): Package[] {
  return allPackages.filter(pkg => pkg.featured);
}

export function getPopularPackages(): Package[] {
  return allPackages.filter(pkg => pkg.popular);
}

export function getPackageById(id: string): Package | undefined {
  return allPackages.find(pkg => pkg.id === id);
}

// Legacy exports for backward compatibility
export const packages = getMainPackages();
export const homeAccessPackages = getHomePackages();
export const sohoPackages = getSohoPackages();
export const corporatePackages = getCorporatePackages();
export const landingPackages = getLandingPackages();

// Validation functions
export function validatePackage(pkg: any): pkg is Package {
  return (
    typeof pkg === 'object' &&
    pkg !== null &&
    typeof pkg.id === 'string' &&
    typeof pkg.name === 'string' &&
    typeof pkg.description === 'string' &&
    typeof pkg.price === 'string' &&
    Array.isArray(pkg.features) &&
    typeof pkg.ctaText === 'string' &&
    typeof pkg.ctaLink === 'string' &&
    ['home', 'soho', 'corporate', 'landing'].includes(pkg.category) &&
    ['main', 'detailed', 'landing'].includes(pkg.type)
  );
}

export function validatePackages(pkgList: any[]): pkgList is Package[] {
  return Array.isArray(pkgList) && pkgList.every(validatePackage);
}