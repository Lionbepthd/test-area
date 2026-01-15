const API_BASE = "https://www.sankavollerei.com/anime/samehadaku";

// Fungsi ambil data dari API
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching ", error);
  }
}

// Tampilkan daftar anime
function renderAnimeList(animes) {
  const container = document.getElementById("animeList");
  container.innerHTML = "";

  animes.forEach((item) => {
    const card = document.createElement("div");
    card.className = "anime-card";
    card.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/200x280'}" alt="${item.title}" />
      <div class="title">${item.title}</div>
    `;
    container.appendChild(card);
  });
}

// Load halaman home
async function loadHome() {
  const data = await fetchAPI("/home");
  if (data && data.recent) renderAnimeList(data.recent.slice(0, 12)); // Ambil 12 terbaru
}

// Cari anime
async function searchAnime() {
  const query = document.getElementById("searchInput").value;
  if (!query) return;

  const data = await fetchAPI(`/search?q=${encodeURIComponent(query)}`);
  if (data && data.results) renderAnimeList(data.results);
}

// Load ongoing
async function loadOngoing() {
  const data = await fetchAPI("/ongoing");
  if (data && data.results) renderAnimeList(data.results);
}

// Load popular
async function loadPopular() {
  const data = await fetchAPI("/popular");
  if (data && data.results) renderAnimeList(data.results);
}

// Load jadwal
async function loadSchedule() {
  alert("Fitur jadwal belum diimplementasikan sepenuhnya.");
}

// Default load home
loadHome();
