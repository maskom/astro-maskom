export interface Framework {
    name: string;
    displayName: string;
    path: string;
    color: string;
}

export const frameworks: Framework[] = [
    { name: 'home', displayName: 'Home', path: '/', color: '#FF5D01' },
    { name: 'paket', displayName: 'Paket', path: '/#paket', color: '#61DAFB' },
];
