import { BookInput } from '../types/library';

export interface StarterBookSeed extends BookInput {
  id: string;
}

export const STARTER_BOOKS: StarterBookSeed[] = [
  {
    id: 'book_filosofi_teras',
    title: 'Filosofi Ruang Sunyi',
    author: 'Nadia Kusuma',
    isbn: '978-602-481-214-0',
    category: 'Filsafat',
    publishedYear: 2024,
    pages: 268,
    synopsis:
      'Refleksi kontemporer mengenai bagaimana ketenangan batin, kejelasan berpikir, dan kesadaran ruang membentuk ketahanan mental di tengah arus informasi modern.',
    coverUrl: '/src/assets/images/cover_filosofi_teras_1795657964060.jpg',
    totalCopies: 5,
    availableCopies: 5,
    loanDurationDays: 7,
    digitalReadExcerpt:
      'Bab 1 — Ambang Ketenangan\n\nDi balik riuh rendah kota yang tak pernah tertidur, selalu ada satu halaman sunyi tempat pikiran dapat meletakkan bebannya. Kebijaksanaan bukan lahir dari banyaknya suara yang kita dengar, melainkan dari keberanian untuk memilah mana yang layak menetap.\n\nKetika kita memasuki sebuah teras di pagi hari, cahaya tidak pernah tergesa-gesa menyapu lantai batu. Ia merayap perlahan, memberi bentuk pada tiap sudut tanpa menuntut perhatian. Prinsip yang sama berlaku bagi kejernihan berpikir: beri jeda sebelum bereaksi, amati tanpa terburu menghakimi, dan temukan kendali pada apa yang benar-benar berada di tangan kita.',
  },
  {
    id: 'book_seni_minimalis',
    title: 'Estetika Garis & Ceri',
    author: 'Kenji Takahashi',
    isbn: '978-623-712-098-4',
    category: 'Desain & Seni',
    publishedYear: 2023,
    pages: 214,
    synopsis:
      'Panduan prinsip desain grafis dan komposisi minimalis yang memadukan keheningan ruang negatif dengan satu aksen warna yang bermakna.',
    coverUrl: '/src/assets/images/cover_seni_minimalis_1795657964551.jpg',
    totalCopies: 4,
    availableCopies: 4,
    loanDurationDays: 7,
    digitalReadExcerpt:
      'Bab 1 — Disiplin Pengurangan\n\nMinimalisme bukanlah kekosongan yang dingin; ia adalah kejujuran terhadap fungsi dan proporsi. Setiap elemen visual yang bertahan di atas kertas harus mampu menjawab satu pertanyaan sederhana: apa yang hilang jika elemen ini ditiadakan?\n\nDalam tradisi cetak editorial, ruang putih bukan sisa halaman yang belum terisi. Ruang putih adalah napas yang memungkinkan tipografi berbicara dengan wibawa dan ketenangan.',
  },
  {
    id: 'book_arsitektur_cahaya',
    title: 'Arsitektur & Cahaya Pagi',
    author: 'Raka Pradipta',
    isbn: '978-602-910-552-3',
    category: 'Arsitektur',
    publishedYear: 2022,
    pages: 312,
    synopsis:
      'Kajian mendalam tentang interaksi material batu kapur, kayu tropis, dan orientasi cahaya alami dalam bangunan perpustakaan publik modern.',
    coverUrl: '/src/assets/images/cover_arsitektur_cahaya_1795657964755.jpg',
    totalCopies: 3,
    availableCopies: 3,
    loanDurationDays: 14,
    digitalReadExcerpt:
      'Bab 1 — Geometri Sinar\n\nSebuah ruang baca yang baik dirancang bukan dari penempatan rak semata, tetapi dari bagaimana cahaya pagi jatuh di atas meja kayu tanpa menyilaukan mata pembaca. Dinding batu yang tebal menahan panas siang, sementara kisi-kisi vertikal memecah cahaya menjadi ritme bayangan yang terukur.\n\nKetika arsitektur menghormati sunyi, pembaca dapat tenggelam dalam halaman demi halaman tanpa merasa terasing dari waktu.',
  },
  {
    id: 'book_algoritma_sunyi',
    title: 'Orbit Sistem Informasi',
    author: 'Dr. Aris Wibowo',
    isbn: '978-623-554-118-9',
    category: 'Teknologi',
    publishedYear: 2025,
    pages: 384,
    synopsis:
      'Pengantar arsitektur sistem informasi perpustakaan modern, katalogisasi terstruktur, dan perancangan basis data yang tangguh dan mudah dirawat.',
    coverUrl: '/src/assets/images/cover_algoritma_sunyi_1795657964844.jpg',
    totalCopies: 6,
    availableCopies: 6,
    loanDurationDays: 7,
    digitalReadExcerpt:
      'Bab 1 — Keteraturan Sirkulasi\n\nSetiap perpustakaan, baik fisik maupun digital, berdiri di atas dua janji utama: informasi harus mudah ditemukan dan ketersediaan koleksi harus selalu akurat. Di balik antarmuka yang tenang, sistem pencatatan transaksi bekerja layaknya orbit yang presisi—memastikan setiap buku yang dipinjam dan dikembalikan tercatat tanpa celah.\n\nKeandalan sistem bukanlah soal kerumitan fitur, melainkan konsistensi data yang menjaga kepercayaan anggota.',
  },
  {
    id: 'book_catatan_musim',
    title: 'Catatan Burung di Musim Semi',
    author: 'Larasati Mahardika',
    isbn: '978-602-773-409-1',
    category: 'Sastra',
    publishedYear: 2024,
    pages: 196,
    synopsis:
      'Kumpulan prosa liris tentang perjalanan seorang pustakawan muda yang merawat arsip surat lama di sebuah kota pesisir yang tenang.',
    coverUrl: '/src/assets/images/cover_catatan_musim_1795657965661.jpg',
    totalCopies: 4,
    availableCopies: 4,
    loanDurationDays: 7,
    digitalReadExcerpt:
      'Bagian I — Surat dari Rak Ketujuh\n\nSetiap pagi pukul tujuh lewat seperempat, burung kecil itu hinggap di ranting depan jendela ruang arsip. Di dalam ruangan beraroma kertas tua dan tinta kering, aku belajar bahwa cerita tidak pernah benar-benar berakhir; ia hanya menunggu seseorang membuka sampulnya kembali.\n\nDi antara ribuan judul yang tertata rapi, selalu ada satu buku yang terasa seperti ditulis khusus untuk hari ini.',
  },
  {
    id: 'book_sejarah_aksara',
    title: 'Sejarah Aksara & Manuskrip',
    author: 'Prof. Hendra Wijaya',
    isbn: '978-602-331-840-7',
    category: 'Sejarah',
    publishedYear: 2021,
    pages: 420,
    synopsis:
      'Penelusuran evolusi aksara Nusantara dan tradisi penyalinan naskah kuno hingga transformasi perpustakaan menuju era arsip digital.',
    coverUrl: '/src/assets/images/cover_sejarah_aksara_1795657965851.jpg',
    totalCopies: 3,
    availableCopies: 3,
    loanDurationDays: 14,
    digitalReadExcerpt:
      'Bab 1 — Jejak Tinta di Atas Lontar dan Kertas\n\nJauh sebelum mesin cetak hadir, para penyalin naskah menjaga ingatan peradaban dengan ketekunan luar biasa. Setiap goresan pena bukan sekadar catatan peristiwa, melainkan jembatan lintas generasi.\n\nKini, perpustakaan digital melanjutkan tugas mulia tersebut dengan memperluas akses pengetahuan tanpa menghilangkan rasa hormat terhadap ketelitian arsip.',
  },
];
