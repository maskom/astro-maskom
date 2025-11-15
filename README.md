# Maskom Network Website

Sumber kode untuk situs [maskom.co.id](https://maskom.co.id) dibangun menggunakan [UltimateAstroTemplate](https://github.com/Marve10s/UltimateAstroTemplate).

Maskom Indonesia adalah penyedia layanan internet terkemuka yang berkomitmen untuk menghadirkan konektivitas cepat, stabil, dan andal kepada seluruh pelanggan di Indonesia.

## Struktur Proyek

```text
src/
├── components/     # Komponen UI yang dapat digunakan kembali
├── layouts/        # Layout template untuk halaman
├── pages/          # Halaman website (routing otomatis)
├── data/           # Data statis untuk navigasi dan konfigurasi
└── styles/         # File CSS global
```

## Halaman Utama

- `index.astro` - Halaman beranda
- `tentang-kami.astro` - Informasi tentang perusahaan
- `layanan.astro` - Paket layanan internet
- `area-layanan.astro` - Cakupan area layanan
- `dukungan.astro` - Dukungan pelanggan
- `kontak.astro` - Informasi kontak

## Paket Layanan

### Untuk Pengguna Rumah

1. **Home Access - Paket A** - 10 Mbps @ Rp 200.000/bulan
2. **Home Access - Paket B** - 25 Mbps @ Rp 350.000/bulan
3. **Home Access - Paket C** - 50 Mbps @ Rp 500.000/bulan

### Untuk Bisnis Kecil dan Menengah (SOHO)

1. **SOHO - Paket Pro** - 100 Mbps @ Rp 750.000/bulan
2. **SOHO - Paket Business** - 200 Mbps @ Rp 1.500.000/bulan
3. **SOHO - Paket Enterprise** - 500 Mbps @ Rp 3.000.000/bulan

### Untuk Perusahaan dan Enterprise

1. **Corporate - Paket Business** - 500 Mbps @ Rp 2.500.000/bulan
2. **Corporate - Paket Enterprise** - 1 Gbps @ Rp 5.000.000/bulan
3. **Corporate - Solusi Custom** - Bandwidth Sesuai Kebutuhan

## Pengembangan

```bash
npm install
npm run dev
```

Server pengembangan akan berjalan di `http://localhost:4321`

## Build untuk Produksi

```bash
npm run build
```

File hasil build akan tersedia di direktori `dist/`

## Deployment ke Cloudflare Pages

1. Hubungkan repositori ini di dashboard Cloudflare Pages.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Pratinjau lokal (opsional):

```bash
npm run pages:dev
```

## Kontribusi

1. Fork repositori ini
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

## Lisensi

Proyek ini merupakan properti dari Maskom Indonesia.
