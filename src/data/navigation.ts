export interface Framework {
  name: string;
  displayName: string;
  path: string;
  color: string;
}

export const frameworks: Framework[] = [
  { name: 'home', displayName: 'Home', path: '/', color: '#FF5D01' },
  {
    name: 'area-layanan',
    displayName: 'Area Layanan',
    path: '/area-layanan',
    color: '#61DAFB',
  },
  {
    name: 'layanan',
    displayName: 'Layanan',
    path: '/layanan',
    color: '#61DAFB',
  },
  {
    name: 'status',
    displayName: 'Network Status',
    path: '/status',
    color: '#4CAF50',
  },
  {
    name: 'tentang-kami',
    displayName: 'Tentang Kami',
    path: '/tentang-kami',
    color: '#61DAFB',
  },
  { name: 'kontak', displayName: 'Kontak', path: '/kontak', color: '#61DAFB' },
  {
    name: 'dukungan',
    displayName: 'Dukungan',
    path: '/dukungan',
    color: '#61DAFB',
  },
];
