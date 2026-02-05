const API_BASE = "https://www.sankavollerei.com/anime/anoboy";

// Toggle Theme
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  themeToggle.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
});

// Ambil data rilisan terbaru dan populer saat halaman dimuat
window.onload = () => {
  // Tampilkan Rilisan Terbaru (dari /home)
  fetch(`${API_BASE}/home`)
    .then(response => response.json())
    .then(data => {
      // Akses data.anime_list
      const animes = data.anime_list || data.data?.anime_list || [];
      displayAnimeCards(animes, document.getElementById('latestEpisodes'));
    })
    .catch(err => console.error("Gagal memuat data terbaru:", err));

  // Tampilkan Anime Populer (misalnya ambil dari halaman 2 atau acak dari home)
  fetch(`${API_BASE}/home?page=2`)
    .then(response => response.json())
    .then(data => {
      const animes = data.anime_list || data.data?.anime_list || [];
      // Ambil beberapa dari tengah sebagai contoh "populer"
      const popularAnimes = animes.slice(5, 12);
      displayAnimeCards(popularAnimes, document.getElementById('popularAnime'));
    })
    .catch(err => console.error("Gagal memuat anime populer:", err));

  // Event listener untuk tombol Riwayat
  document.querySelector('.nav-link[href="#riwayat"]').addEventListener('click', (e) => {
    e.preventDefault();
    showRiwayat();
  });
};

// Fungsi untuk menampilkan kartu anime
function displayAnimeCards(animes, container) {
  container.innerHTML = "";
  animes.forEach(anime => {
    // Struktur dari /home dan /search bisa berbeda sedikit
    const title = anime.title || 'N/A';
    const poster = anime.poster || 'https://placehold.co/200x280?text=No+Image';
    // Episode mungkin tidak ada di /search
    const episode = anime.episode || 'N/A';
    const slug = anime.slug; // Slug untuk detail atau episode

    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => {
      // Simpan ke riwayat
      addToHistory({ title, poster, episode, slug });
      // Tampilkan detail anime (berdasarkan slug judul, bukan slug episode)
      // Ambil slug judul dari slug episode (misal: ...-episode-5 -> ... )
      const titleSlug = extractTitleSlug(slug);
      showAnimeDetail(titleSlug);
    };
    card.innerHTML = `
      <img src="${poster}" alt="${title}">
      <h4>${title}</h4>
      <p>Episode: ${episode}</p>
    `;
    container.appendChild(card);
  });
}

// Fungsi bantu: Ekstrak slug judul dari slug episode
function extractTitleSlug(episodeSlug) {
  // Contoh: "one-piece-episode-100" -> "one-piece"
  // Regex: hapus bagian "-episode-[angka]" dan seterusnya
  return episodeSlug.replace(/-episode-\d+.*/, '');
}

// Fungsi untuk menampilkan detail anime
function showAnimeDetail(slug) {
  // Gunakan slug dari judul, bukan episode
  fetch(`${API_BASE}/anime/${slug}`)
    .then(response => response.json())
    .then(data => {
      // Struktur berubah: data.detail
      const anime = data.detail;
      // Struktur detail bisa berbeda, sesuaikan
      const title = anime.title || anime.judul || 'N/A';
      const poster = anime.poster || anime.thumb || anime.image || 'https://placehold.co/200x280?text=No+Image';
      const genres = anime.genres?.map(g => g.name).join(', ') || 'N/A';
      const status = anime.info?.status || 'N/A';
      const synopsis = anime.synopsis || 'Tidak tersedia.';
      // Daftar episode sekarang dari episode_list
      const episodes = anime.episode_list || [];

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <img src="${poster}" alt="${title}" style="max-width: 300px; border-radius: 8px;">
          <h2>${title}</h2>
          <p><strong>Genres:</strong> ${genres}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Synopsis:</strong> ${synopsis}</p>
          <h3>Daftar Episode:</h3>
          <div class="episode-list">
            ${episodes.map(ep => `
              <button class="ep-btn" onclick="loadEpisode('${ep.slug}', '${ep.title}')">${ep.title}</button>
            `).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Close Modal
      modal.querySelector('.close').onclick = () => modal.remove();
      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };
    })
    .catch(err => console.error("Gagal memuat detail anime:", err));
}

// Fungsi untuk menampilkan video stream episode
function loadEpisode(episodeSlug, episodeTitle) {
  fetch(`${API_BASE}/episode/${episodeSlug}`)
    .then(response => response.json())
    .then(data => {
      // Ambil stream pertama
      const stream = data.streams[0];
      if (!stream) {
        alert("Tidak ada stream tersedia untuk episode ini.");
        return;
      }

      const videoUrl = stream.url;
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>${episodeTitle}</h2>
          <iframe src="${videoUrl}" width="100%" height="500px" frameborder="0" allowfullscreen></iframe>
        </div>
      `;
      document.body.appendChild(modal);

      // Close Modal
      modal.querySelector('.close').onclick = () => modal.remove();
      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };
    })
    .catch(err => console.error("Gagal memuat stream episode:", err));
}

// Fungsi untuk menambahkan ke riwayat
function addToHistory(anime) {
  let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  // Hapus duplikat jika ada
  history = history.filter(item => item.slug !== anime.slug);
  history.unshift(anime); // Tambahkan ke awal array
  localStorage.setItem('watchHistory', JSON.stringify(history));
}

// Fungsi untuk menampilkan halaman Riwayat
function showRiwayat() {
  const history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  if (history.length === 0) {
    alert("Belum ada riwayat.");
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Riwayat Tontonan</h2>
      <div id="riwayat-list" class="card-grid"></div>
    </div>
  `;
  document.body.appendChild(modal);

  // Tampilkan daftar riwayat
  const riwayatList = document.getElementById('riwayat-list');
  history.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'card';
    card.onclick = () => {
      showAnimeDetail(anime.slug);
    };
    card.innerHTML = `
      <img src="${anime.poster}" alt="${anime.title}">
      <h4>${anime.title}</h4>
      <p>Episode: ${anime.episode || 'N/A'}</p>
    `;
    riwayatList.appendChild(card);
  });

  // Close Modal
  modal.querySelector('.close').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// Event listener untuk pencarian
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  // Encode query agar aman untuk URL (misalnya: One Piece -> one%20piece)
  const encodedQuery = encodeURIComponent(query);

  fetch(`${API_BASE}/search/${encodedQuery}`)
    .then(response => response.json())
    .then(data => {
      // Asumsi struktur data pencarian juga sama: data.anime_list
      // Tapi data ini tidak memiliki episode, jadi card akan menampilkan 'N/A'
      const animes = data.anime_list || data.data?.anime_list || [];
      displayAnimeCards(animes, document.getElementById('searchResults'));
      document.getElementById('results').style.display = 'block';
    })
    .catch(err => console.error("Error saat pencarian:", err));
});

// Tambahkan event listener ke input Enter
document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('searchBtn').click();
  }
});
