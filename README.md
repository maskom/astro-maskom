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

1. **Paket Rumah Basic** - Mulai dari 10 Mbps
2. **Paket Rumah Premium** - Hingga 50 Mbps
3. **Paket Bisnis Enterprise** - Hingga 100 Mbps

*Untuk informasi harga terkini, silakan hubungi tim sales kami.*

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
