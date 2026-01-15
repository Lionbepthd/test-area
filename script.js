const API_BASE = "https://www.sankavollerei.com/anime/samehadaku";

// Fungsi ambil data dari API
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// Render daftar anime ke dalam elemen
function renderAnimeList(animes, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  animes.forEach(item => {
    const card = document.createElement("div");
    card.className = "anime-card";
    card.innerHTML = `
      <img src="${item.poster || 'https://via.placeholder.com/200x280'}" alt="${item.title}" />
      <div class="title">${item.title}</div>
      ${item.episodes ? `<div class="episodes">Ep ${item.episodes}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

// Load halaman home
async function loadHome() {
  const data = await fetchAPI("/home");

  if (data && data.recent && data.recent.animeList) {
    renderAnimeList(data.recent.animeList, "recentAnimeList");
  }

  if (data && data.top10 && data.top10.animeList) {
    renderAnimeList(data.top10.animeList, "top10AnimeList");
  }

  if (data && data.movie && data.movie.animeList) {
    renderAnimeList(data.movie.animeList, "movieList");
  }
}

// Cari anime
async function searchAnime() {
  const query = document.getElementById("searchInput").value;
  if (!query) return;

  window.location.href = `search.html?q=${encodeURIComponent(query)}`;
}

// Default load home
loadHome();
