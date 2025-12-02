// Base API URL
const API_BASE = 'https://www.sankavollerei.com/anime/animasu';

// Current page state
let currentPage = 1;
let currentEndpoint = '';
let currentKeyword = '';

// Daftar endpoint yang menggunakan kunci 'animes'
// Berdasarkan pengamatan: popular, movies, ongoing, completed, latest, search, advanced-search, animelist, genre, character
// Endpoint lain (genre) kemungkinan besar menggunakan 'data' atau 'genres'
const ENDPOINTS_WITH_ANIMES = ['popular', 'movies', 'ongoing', 'completed', 'latest', 'search', 'advanced-search', 'animelist', 'genre', 'character'];

// Domain yang diizinkan untuk stream
const ALLOWED_STREAM_DOMAINS = ['www.blogger.com', 'mega.nz', 'filedon.co'];

// Load home page
async function loadHome() {
    showLoading();
    try {
        const response = await fetchData(`${API_BASE}/home`); // Tidak ada ?page=1
        // Struktur data home: ongoing, recent
        const ongoingAnime = response.ongoing || [];
        const recentAnime = response.recent || [];

        const content = `
            <div class="space-y-8">
                <section>
                    <h2 class="text-2xl font-bold mb-4 text-primary">Anime Ongoing</h2>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        ${renderAnimeCards(ongoingAnime, 'home')}
                    </div>
                </section>
                <section>
                    <h2 class="text-2xl font-bold mb-4 text-primary">Anime Terbaru (dari Home)</h2>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        ${renderAnimeCards(recentAnime, 'home')}
                    </div>
                </section>
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
    } catch (error) {
        showError(error);
    }
}

// Load popular anime - endpoint khusus dengan struktur animes
async function loadPopular() { // Hapus parameter page default
    currentEndpoint = 'popular';
    await loadAnimeList(`${API_BASE}/popular`, 'Anime Populer', 'animes'); // Tidak ada ?page=1
}

// Load ongoing anime - endpoint khusus dengan struktur animes
async function loadOngoing() { // Hapus parameter page default
    currentEndpoint = 'ongoing';
    await loadAnimeList(`${API_BASE}/ongoing`, 'Anime Ongoing', 'animes'); // Tidak ada ?page=1
}

// Load completed anime - endpoint khusus dengan struktur animes
async function loadCompleted() { // Hapus parameter page default
    currentEndpoint = 'completed';
    await loadAnimeList(`${API_BASE}/completed`, 'Anime Completed', 'animes'); // Tidak ada ?page=1
}

// Load latest anime - endpoint khusus dengan struktur animes
async function loadLatest() { // Hapus parameter page default
    currentEndpoint = 'latest';
    await loadAnimeList(`${API_BASE}/latest`, 'Anime Terbaru', 'animes'); // Tidak ada ?page=1
}

// Load movies - endpoint khusus dengan struktur animes
async function loadMovies() { // Hapus parameter page default
    currentEndpoint = 'movies';
    await loadAnimeList(`${API_BASE}/movies`, 'Anime Movie', 'animes'); // Tidak ada ?page=1
}

// Load genres
async function loadGenres() {
    showLoading();
    try {
        const response = await fetchData(`${API_BASE}/genres`);
        // Perbaikan: Gunakan 'genres' bukan 'data'
        const genres = response.genres || [];
        
        const content = `
            <h2 class="text-2xl font-bold mb-6 text-primary">Daftar Genre</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${genres.map(genre => `
                    <div class="bg-card p-4 rounded-lg text-center hover:bg-primary transition cursor-pointer" onclick="loadGenreAnime('${genre.slug}')">
                        <h3 class="font-semibold">${genre.name}</h3>
                        <p class="text-sm text-gray-400">${genre.count} anime</p>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
    } catch (error) {
        showError(error);
    }
}

// Load anime by genre
async function loadGenreAnime(slug) { // Hapus parameter page default
    currentEndpoint = `genre/${slug}`;
    // Endpoint genre kemungkinan besar menggunakan 'animes' (berdasarkan pengamatan /search, /animelist)
    await loadAnimeList(`${API_BASE}/genre/${slug}`, `Anime Genre: ${slug}`, 'animes'); // Tidak ada ?page=1
}

// Load characters
async function loadCharacters() {
    showLoading();
    try {
        const response = await fetchData(`${API_BASE}/characters`);
        // Gunakan 'characters' untuk data dari endpoint ini
        const characters = response.characters || [];
        
        const content = `
            <h2 class="text-2xl font-bold mb-6 text-primary">Daftar Karakter</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${characters.map(character => `
                    <div class="bg-card p-4 rounded-lg text-center hover:bg-primary transition cursor-pointer" onclick="loadCharacterAnime('${character.slug}')">
                        <h3 class="font-semibold">${character.name}</h3>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
    } catch (error) {
        showError(error);
    }
}

// Load anime by character (placeholder for now, assuming it returns 'animes')
async function loadCharacterAnime(slug) {
    currentEndpoint = `character/${slug}`;
    await loadAnimeList(`${API_BASE}/character/${slug}`, `Anime dengan Karakter: ${slug}`, 'animes'); // Asumsi 'animes'
}

// Load schedule
async function loadSchedule() {
    showLoading();
    try {
        const response = await fetchData(`${API_BASE}/schedule`);
        // Gunakan 'schedule' untuk data dari endpoint ini
        const schedule = response.schedule || {};
        
        // Daftar hari dalam bahasa Indonesia
        const dayNames = {
            "senin": "Senin",
            "selasa": "Selasa",
            "rabu": "Rabu",
            "kamis": "Kamis",
            "jum'at": "Jum'at",
            "sabtu": "Sabtu",
            "minggu": "Minggu",
            "random": "Acak"
        };

        let content = `<h2 class="text-2xl font-bold mb-6 text-primary">Jadwal Rilis Anime</h2>`;

        // Iterasi melalui setiap hari dalam schedule
        for (const [dayKey, animeList] of Object.entries(schedule)) {
            if (animeList.length > 0) { // Hanya tampilkan hari jika ada anime
                const dayName = dayNames[dayKey] || dayKey; // Gunakan nama lokal atau kunci asli jika tidak ditemukan
                content += `
                    <section class="mb-8">
                        <h3 class="text-xl font-bold mb-4 text-primary">${dayName}</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            ${renderAnimeCards(animeList)}
                        </div>
                    </section>
                `;
            }
        }

        document.getElementById('main-content').innerHTML = content;
    } catch (error) {
        showError(error);
    }
}


// Load alphabet list
async function loadAlphabet() {
    showLoading();
    try {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        
        const content = `
            <h2 class="text-2xl font-bold mb-6 text-primary">Daftar Anime A-Z</h2>
            <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-13 gap-2 mb-6">
                ${letters.map(letter => `
                    <button onclick="loadByLetter('${letter}')" class="btn-primary px-3 py-2 rounded-lg text-white font-medium hover:bg-red-700">
                        ${letter}
                    </button>
                `).join('')}
            </div>
            <div id="alphabet-content"></div>
        `;
        document.getElementById('main-content').innerHTML = content;
    } catch (error) {
        showError(error);
    }
}

// Load anime by letter
async function loadByLetter(letter) { // Hapus parameter page default
    currentEndpoint = `animelist?letter=${letter}`;
    // loadAnimeList akan menangani 'animelist' sebagai endpoint dengan animes
    await loadAnimeList(`${API_BASE}/animelist?letter=${letter}`, `Anime dengan huruf: ${letter}`, 'animes'); // Tidak ada ?page=1
}

// Show search page
function showSearchPage() {
    const content = `
        <h2 class="text-2xl font-bold mb-6 text-primary">Cari Anime</h2>
        <div class="mb-6">
            <div class="flex gap-2">
                <input type="text" id="search-input" placeholder="Masukkan judul anime..." class="flex-grow p-3 rounded-lg bg-card text-white border border-gray-600 focus:outline-none focus:border-primary">
                <button onclick="performSearch()" class="btn-primary px-6 py-3 rounded-lg text-white font-medium">
                    <i class="fas fa-search mr-2"></i> Cari
                </button>
            </div>
        </div>
        <div id="search-results"></div>
        
        <h3 class="text-xl font-bold mt-8 mb-4 text-primary">Pencarian Lanjutan</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <select id="genre-filter" class="p-3 rounded-lg bg-card text-white border border-gray-600 focus:outline-none focus:border-primary">
                <option value="">Semua Genre</option>
            </select>
            <select id="status-filter" class="p-3 rounded-lg bg-card text-white border border-gray-600 focus:outline-none focus:border-primary">
                <option value="">Semua Status</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
            </select>
        </div>
        <button onclick="performAdvancedSearch()" class="btn-primary px-6 py-3 rounded-lg text-white font-medium">
            <i class="fas fa-search mr-2"></i> Cari Lanjutan
        </button>
        <div id="advanced-results" class="mt-6"></div>
    `;
    document.getElementById('main-content').innerHTML = content;
    
    // Load genres for filter
    loadGenresForFilter();
}

// Load genres for search filter
async function loadGenresForFilter() {
    try {
        const response = await fetchData(`${API_BASE}/genres`);
        // Perbaikan: Gunakan 'genres' bukan 'data'
        const genres = response.genres || [];
        const select = document.getElementById('genre-filter');
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.slug;
            option.textContent = genre.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading genres for filter:', error);
    }
}

// Perform search
async function performSearch() {
    const keyword = document.getElementById('search-input').value.trim();
    if (!keyword) return;
    
    currentKeyword = keyword;
    currentEndpoint = `search/${keyword}`;
    // Endpoint search menggunakan 'animes'
    await loadAnimeList(`${API_BASE}/search/${keyword}`, `Hasil Pencarian: ${keyword}`, 'animes'); // Tidak ada ?page=1
}

// Perform advanced search
async function performAdvancedSearch() {
    const genre = document.getElementById('genre-filter').value;
    const status = document.getElementById('status-filter').value;
    
    let params = new URLSearchParams();
    if (genre) params.append('genres', genre);
    if (status) params.append('status', status);
    // Jangan tambahkan page=1 secara default di sini jika hanya mengambil halaman pertama
    
    currentEndpoint = `advanced-search?${params.toString()}`;
    // Endpoint advanced-search menggunakan 'animes'
    await loadAnimeList(`${API_BASE}/advanced-search?${params.toString()}`, 'Hasil Pencarian Lanjutan', 'animes');
}

// Load anime list (generic function) - menerima kunci array data
async function loadAnimeList(url, title, dataKey = 'data') {
    showLoading();
    try {
        const response = await fetchData(url);
        // Ambil data dari kunci yang ditentukan
        const animeList = response[dataKey] || [];
        const pagination = response.pagination || { currentPage: 1, hasNext: false, hasPrev: false };

        const content = `
            <h2 class="text-2xl font-bold mb-6 text-primary">${title}</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${renderAnimeCards(animeList)}
            </div>
        `;
        document.getElementById('main-content').innerHTML = content;
    } catch (error) {
        showError(error);
    }
}

// Render anime cards - tetap menggunakan tipe data untuk home
// Fungsi ini sekarang juga bisa menangani data dari schedule (tanpa 'type' rating)
function renderAnimeCards(animeList, type = 'standard') {
    return animeList.map(anime => {
        // Sesuaikan pengambilan data berdasarkan tipe
        const title = anime.title;
        const slug = anime.slug;
        // Untuk home, gambar dari 'poster', untuk standar/popular dari 'thumbnail'
        // Untuk schedule, hanya 'poster' yang tersedia
        const image = (type === 'home' ? anime.poster : (anime.thumbnail || anime.poster)) || 'https://via.placeholder.com/200x300'; // Fallback ke poster jika thumbnail tidak ada
        // Untuk home, episode dari 'episode', untuk standar/popular dari 'episodes' atau 'episode'
        // Untuk schedule, hanya 'episode' yang tersedia
        const episodes = (type === 'home' ? anime.episode : `${anime.episodes || anime.episode || '??'} Eps`) || '?? Eps';
        // Di movie, 'type' berisi rating, jadi kita gunakan rating di sana
        // Di endpoint animes (popular, movies, ongoing, completed, latest, search), 'type' bisa berisi rating (★ X.XX) atau tipe (TV, Movie)
        // Di endpoint data (genre), 'type' biasanya tipe (TV, Movie).
        // Di endpoint schedule, 'type' kosong.
        // Untuk menampilkan rating, kita periksa apakah type mengandung ★
        const rawTypeOrRating = anime.type || 'TV';
        const isRating = rawTypeOrRating.includes('★');
        const animeType = (type === 'home' || !isRating) ? rawTypeOrRating : (rawTypeOrRating.includes('Movie') ? 'Movie' : 'TV'); // Asumsi TV jika bukan Movie dan bukan rating
        const rating = isRating ? rawTypeOrRating : (anime.rating || ''); // Gunakan field type untuk rating jika mengandung ★
        // Untuk schedule, status_or_day berisi nomor episode atau info lain
        const status_or_day = anime.status_or_day || '';

        return `
            <div class="card-anime bg-card p-3 rounded-lg overflow-hidden fade-in">
                <div class="relative">
                    <img src="${image}" alt="${title}" class="w-full h-48 object-cover rounded-lg anime-poster cursor-pointer" onclick="showAnimeDetail('${slug}')">
                    <div class="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                        ${animeType}
                    </div>
                </div>
                <h3 class="font-semibold mt-2 text-sm line-clamp-2">${title}</h3>
                <div class="flex justify-between items-center mt-2 text-xs text-gray-400">
                    <span>${episodes}</span>
                    <span>${rating}</span> <!-- Tampilkan rating di sini -->
                </div>
                <div class="text-xs text-gray-500 mt-1">${status_or_day}</div>
            </div>
        `;
    }).join('');
}


// Show anime detail
async function showAnimeDetail(slug) {
    showLoading();
    try {
        const response = await fetchData(`${API_BASE}/detail/${slug}`);
        // Perbaikan: Gunakan 'detail' bukan 'data'
        const anime = response.detail || {};
        
        const episodes = anime.episodes || [];
        
        document.getElementById('detail-title').textContent = anime.title || 'Detail Anime';
        
        const content = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3">
                    <img src="${anime.poster || 'https://via.placeholder.com/300x400'}" alt="${anime.title}" class="w-full rounded-lg">
                </div>
                <div class="md:w-2/3">
                    <h3 class="text-xl font-bold mb-2">${anime.title}</h3>
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${(anime.genres || []).map(genre => `<span class="bg-primary px-3 py-1 rounded-full text-sm">${genre.name}</span>`).join('')}
                    </div>
                    <p class="text-gray-300 mb-4">${anime.synopsis || 'Deskripsi tidak tersedia.'}</p>
                    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div><strong>Status:</strong> ${anime.status || 'Tidak diketahui'}</div>
                        <div><strong>Tipe:</strong> ${anime.type || 'Tidak diketahui'}</div>
                        <div><strong>Jumlah Episode:</strong> ${anime.episodes ? anime.episodes.length : 'Tidak diketahui'}</div>
                        <div><strong>Rating:</strong> ${anime.rating || 'Tidak diketahui'}</div>
                    </div>
                </div>
            </div>
            <h4 class="text-xl font-bold mt-6 mb-4 text-primary">Daftar Episode</h4>
            <div class="space-y-2 max-h-60 overflow-y-auto">
                ${episodes.map(episode => `
                    <div class="episode-item bg-dark p-3 rounded-lg flex justify-between items-center">
                        <span>${episode.name || `Episode ${episode.number}`}</span>
                        <button onclick="showEpisode('${episode.slug}')" class="btn-primary px-3 py-1 rounded text-sm">
                            <i class="fas fa-play mr-1"></i> Tonton
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('detail-content').innerHTML = content;
        
        document.getElementById('detail-modal').classList.remove('hidden');
    } catch (error) {
        showError(error);
    }
}

// Show episode
async function showEpisode(slug) {
    showLoading();
    try {
        const response = await fetchData(`${API_BASE}/episode/${slug}`);
        // Endpoint /episode memiliki struktur data yang berbeda
        // Tidak ada 'data', langsung ke 'title', 'streams', 'downloads'
        const episodeTitle = response.title || 'Episode';
        const streams = response.streams || [];
        const downloads = response.downloads || [];
        
        document.getElementById('episode-title').textContent = episodeTitle;

        // Filter streams berdasarkan domain yang diizinkan
        const filteredStreams = streams.filter(stream => {
            try {
                const url = new URL(stream.url);
                return ALLOWED_STREAM_DOMAINS.includes(url.hostname);
            } catch (e) {
                // Jika URL tidak valid, abaikan
                return false;
            }
        });

        let content = '';

        if (filteredStreams.length > 0) {
            // Membuat iframe untuk stream pertama dari yang difilter
            const firstStreamUrl = filteredStreams[0].url;
            content += `
                <div class="aspect-video bg-black rounded-lg flex items-center justify-center">
                    <iframe class="player-iframe" src="${firstStreamUrl}" allowfullscreen></iframe>
                </div>
            `;

            // Membuat daftar link stream lainnya (yang difilter) sebagai tombol pilihan
            if (filteredStreams.length > 1) {
                content += `
                    <h3 class="text-xl font-bold mt-4">Pilihan Streaming:</h3>
                    <div class="flex flex-wrap gap-2">
                        ${filteredStreams.map((stream, index) => `
                            <button onclick="changeStream('${stream.url}')" class="btn-primary px-3 py-1 rounded text-sm">
                                ${stream.name}
                            </button>
                        `).join('')}
                    </div>
                `;
            }
        } else {
            content += '<p class="text-gray-400">Tautan streaming dari sumber yang diizinkan tidak tersedia.</p>';
        }

        // Tambahkan link download jika ada
        if (downloads.length > 0) {
            content += `
                <h3 class="text-xl font-bold mt-4">Link Download</h3>
                <div class="flex flex-wrap gap-2">
                    ${downloads.map(dl => `
                        <a href="${dl.url}" target="_blank" class="btn-primary px-4 py-2 rounded-lg text-white">
                            <i class="fas fa-download mr-2"></i> ${dl.name || 'Download'}
                        </a>
                    `).join('')}
                </div>
            `;
        }

        document.getElementById('episode-content').innerHTML = content;
        document.getElementById('episode-modal').classList.remove('hidden');
    } catch (error) {
        showError(error);
    }
}

// Fungsi untuk mengganti src iframe stream
function changeStream(newStreamUrl) {
    const iframe = document.querySelector('.player-iframe');
    if (iframe) {
        iframe.src = newStreamUrl;
    }
}


// Close modals
function closeModal() {
    document.getElementById('detail-modal').classList.add('hidden');
}

function closeEpisodeModal() {
    document.getElementById('episode-modal').classList.add('hidden');
}

// Fetch data from API
// Fungsi ini sekarang memeriksa dan menghapus ?page=1 atau &page=1 dari URL sebelum fetch
async function fetchData(url) {
    try {
        // Hapus ?page=1 atau &page=1 dari akhir URL atau sebelum parameter lain
        let cleanUrl = url.replace(/[?&]page=1(&|$)/, (match, p1) => {
            // Jika cocok dengan ?page=1& atau &page=1& (di tengah), ganti dengan tanda tanya atau tanda & sebelumnya
            if (match.endsWith('&')) {
                return p1; // p1 adalah karakter (& atau $) setelah page=1, jadi kembalikan &
            }
            // Jika cocok dengan ?page=1 atau &page=1 di akhir, hapus
            // Cari ? atau & sebelum page=1
            const lastParamIndex = url.lastIndexOf(match) - 1;
            if (url[lastParamIndex] === '?' || url[lastParamIndex] === '&') {
                return url[lastParamIndex]; // Kembalikan ? atau & sebelumnya
            }
            return ''; // Jika tidak ada sebelumnya (misalnya hanya ?page=1), hapus semua
        });

        // Jika URL berakhir dengan ? atau & karena penghapusan, hapus juga
        cleanUrl = cleanUrl.replace(/[?&]$/, '');

        // console.log("Fetching URL:", cleanUrl); // Untuk debugging

        const response = await fetch(cleanUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Show loading
function showLoading() {
    document.getElementById('main-content').innerHTML = `
        <div class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    `;
    // Juga untuk modal episode
     document.getElementById('episode-content').innerHTML = `
        <div class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    `;
}

// Show error
function showError(error) {
    document.getElementById('main-content').innerHTML = `
        <div class="text-center py-20">
            <h2 class="text-2xl font-bold text-red-500 mb-4">Error</h2>
            <p class="text-gray-300 mb-4">${error.message || 'Terjadi kesalahan saat memuat data.'}</p>
            <button onclick="loadHome()" class="btn-primary px-6 py-3 rounded-lg text-white font-medium">
                Kembali ke Home
            </button>
        </div>
    `;
    // Juga untuk modal episode
     document.getElementById('episode-content').innerHTML = `
        <div class="text-center py-20">
            <h2 class="text-2xl font-bold text-red-500 mb-4">Error</h2>
            <p class="text-gray-300 mb-4">${error.message || 'Terjadi kesalahan saat memuat data.'}</p>
            <button onclick="closeEpisodeModal()" class="btn-primary px-6 py-3 rounded-lg text-white font-medium">
                Tutup
            </button>
        </div>
    `;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadHome();
});

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
    if (event.state) {
        // Restore state if needed
    }
});
