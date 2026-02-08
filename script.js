// CONFIG
const API_BASE = 'https://www.sankavollerei.com';

// DOM
const mainContent = document.getElementById('main-content');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// STATE
let notificationsEnabled = false;

// PAGES
const pages = {
    home: () => renderPage('home'),
    ongoing: () => renderPage('ongoing'),
    completed: () => renderPage('completed'),
    schedule: () => renderPage('schedule'),
    history: renderHistoryPage,
};

// INIT
document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.slice(1) || 'home';
    if (hash.startsWith('search?q=')) {
        const query = decodeURIComponent(hash.split('q=')[1]);
        loadSearchPage(query);
    } else if (hash.startsWith('anime/')) {
        const slug = hash.split('anime/')[1];
        loadDetailPage(slug);
    } else if (hash.startsWith('episode/')) {
        const slug = hash.split('episode/')[1];
        loadEpisodePage(slug);
    } else {
        const page = hash.split('/')[0] || 'home';
        loadPage(page);
    }

    // NAV LISTENERS
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            loadPage(page);
        });
    });

    // SEARCH
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) loadSearchPage(query);    });

    searchInput.addEventListener('input', debounce(() => {
        const query = searchInput.value.trim();
        if (query.length >= 2) loadSearchPage(query);
    }, 300));
});

// UTILS
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        return null;
    }
}

function loadPage(pageName) {
    if (pages[pageName]) {
        history.pushState({page: pageName}, '', `#${pageName}`);
        pages[pageName]();
    }
}

// NOTIFICATIONS
async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        notificationsEnabled = true;
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") notificationsEnabled = true;
    }
}
function showNotification(title, body) {
    if (notificationsEnabled) {
        new Notification(title, { body });
    }
}

// WATCH HISTORY
const HISTORY_KEY = 'lionime_watch_history';
const MAX_HISTORY = 20;

function saveToHistory(animeTitle, episodeTitle, episodeSlug, posterUrl = '') {
    try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        if (history.length > 0 && history[0].slug === episodeSlug) return;
        const newItem = { anime: animeTitle, episode: episodeTitle, slug: episodeSlug, poster: posterUrl, timestamp: Date.now() };
        history.unshift(newItem);
        if (history.length > MAX_HISTORY) history.pop();
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('Gagal menyimpan history:', e);
    }
}

function getWatchHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} hari lalu`;
    if (hours > 0) return `${hours} jam lalu`;
    if (minutes > 0) return `${minutes} menit lalu`;
    return 'Baru saja';
}

// RENDER FUNCTIONS
async function renderPage(type) {
    mainContent.innerHTML = `<h2 class="page-title">${
        type === 'ongoing' ? 'Sedang Tayang' :
        type === 'completed' ? 'Sudah Tamat' :
        type === 'schedule' ? 'Jadwal Rilis' :         type.charAt(0).toUpperCase() + type.slice(1)
    }</h2>`;

    let endpoint = '';
    if (type === 'home') {
        endpoint = `${API_BASE}/anime/oploverz/home?page=1`;
    } else if (type === 'ongoing') {
        endpoint = `${API_BASE}/anime/oploverz/ongoing?page=1`;
    } else if (type === 'completed') {
        endpoint = `${API_BASE}/anime/oploverz/completed?page=1`;
    } else if (type === 'schedule') {
        const data = await fetchData(`${API_BASE}/anime/oploverz/schedule`);
        if (data && data.schedule) renderSchedule(data.schedule);
        else showError('Gagal memuat jadwal.');
        return;
    }

    // SKELETON
    if (type === 'home') {
        mainContent.innerHTML += '<div class="banner-section"><div class="skeleton banner-skeleton"></div></div>';
    }
    mainContent.innerHTML += '<div class="anime-grid">' + Array.from({length: 12}, _ => '<div class="skeleton"></div>').join('') + '</div>';

    const data = await fetchData(endpoint);
    if (data) {
        if (type === 'schedule') return;
        const list = data.anime_list || (type === 'home' ? data.anime_list : []);
        if (list) {
            renderAnimeGrid(list, type);
            if ((type === 'ongoing' || type === 'completed') && data.pagination?.hasNext) {
                mainContent.innerHTML += `<div class="pagination"><button id="load-more-btn">Muat Lebih Banyak</button></div>`;
                document.getElementById('load-more-btn').addEventListener('click', () => loadMorePage(type, 2));
            }
        }
        if (type === 'home' && list && list.length > 0) {
            const featured = list[0];
            const bannerHTML = `
                <div class="banner-section">
                    <div class="banner-card" onclick="loadDetailPage('${featured.slug}')">
                        <img src="${featured.poster.trim()}" alt="${featured.title}" class="banner-img">
                        <div class="banner-overlay">
                            <h2>${featured.title}</h2>
                            <p>${featured.episode} • ${featured.type}</p>
                        </div>
                    </div>
                </div>
            `;
            document.querySelector('.anime-grid').insertAdjacentHTML('beforebegin', bannerHTML);
        }
    } else {        showEmptyState();
    }
}

function renderAnimeGrid(animes, pageType = 'home') {
    const grid = document.querySelector('.anime-grid');
    if (!grid) return;
    grid.innerHTML = animes.map(anime => {
        let slug = anime.slug;
        if (slug === 'anime' && anime.oploverz_url) {
            const url = new URL(anime.oploverz_url.trim());
            slug = url.pathname.split('/').filter(Boolean).pop() || anime.slug;
        }
        let statusDisplay = 'Ongoing';
        if (anime.status === 'Completed' || anime.episode === 'Completed') statusDisplay = 'Selesai';
        return `
            <div class="anime-card" onclick="loadDetailPage('${slug}')">
                <img src="${(anime.poster || '').trim()}" alt="${anime.title}" onerror="this.src='https://via.placeholder.com/247x350/111827/8b5cf6?text=No+Image'">
                <div class="card-info">
                    <h3>${anime.title}</h3>
                    <span class="status-badge">${statusDisplay}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function loadMorePage(pageType, nextPage) {
    const btn = document.getElementById('load-more-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Memuat...';
    const url = `${API_BASE}/anime/oploverz/${pageType}?page=${nextPage}`;
    const data = await fetchData(url);
    if (data && data.anime_list) {
        const grid = document.querySelector('.anime-grid');
        if (grid) {
            grid.innerHTML += data.anime_list.map(anime => {
                let slug = anime.slug;
                if (slug === 'anime' && anime.oploverz_url) {
                    const url = new URL(anime.oploverz_url.trim());
                    slug = url.pathname.split('/').filter(Boolean).pop() || anime.slug;
                }
                let statusDisplay = 'Ongoing';
                if (anime.status === 'Completed' || anime.episode === 'Completed') statusDisplay = 'Selesai';
                return `
                    <div class="anime-card" onclick="loadDetailPage('${slug}')">
                        <img src="${(anime.poster || '').trim()}" alt="${anime.title}" onerror="this.src='https://via.placeholder.com/247x350/111827/8b5cf6?text=No+Image'">
                        <div class="card-info">
                            <h3>${anime.title}</h3>                            <span class="status-badge">${statusDisplay}</span>
                        </div>
                    </div>
                `;
            }).join('');
            if (!data.pagination?.hasNext) btn.remove();
            else {
                btn.disabled = false;
                btn.textContent = 'Muat Lebih Banyak';
            }
        }
    } else {
        btn.textContent = 'Gagal';
        setTimeout(() => btn.remove(), 2000);
    }
}

function renderSchedule(scheduleData) {
    const lastSnapshot = getSavedScheduleSnapshot();
    if (hasNewEpisode(lastSnapshot, scheduleData)) {
        if (notificationsEnabled) {
            const total = Object.values(scheduleData).flat().length;
            showNotification("Anime Baru Rilis!", `Ada ${total} jadwal yang diperbarui.`);
        }
        saveScheduleSnapshot(scheduleData);
    }

    mainContent.innerHTML = `
        <div class="page-header">
            <h2 class="page-title">Jadwal Rilis</h2>
            <button id="notify-btn" class="notify-btn">🔔 Aktifkan Notifikasi</button>
        </div>
    `;

    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayNames = {sunday:'Minggu',monday:'Senin',tuesday:'Selasa',wednesday:'Rabu',thursday:'Kamis',friday:'Jumat',saturday:'Sabtu'};
    let html = '';
    days.forEach(day => {
        const animes = scheduleData[day];
        if (animes && animes.length > 0) {
            html += `<div class="schedule-day"><h3>${dayNames[day]}</h3><div class="schedule-list">`;
            html += animes.map(a => `
                <div class="anime-card schedule-card" onclick="loadDetailPage('${a.slug}')">
                    <img src="https://i0.wp.com/oploverz.pro/wp-content/uploads/manga-images/thumbnail/${a.slug}.jpg?resize=247,350" alt="${a.title}" onerror="this.src='https://via.placeholder.com/247x350/111827/8b5cf6?text=No+Image'">
                    <div class="card-info">
                        <h3>${a.title}</h3>
                        <p class="episode-time">${a.episode_info}</p>
                    </div>
                </div>
            `).join('');            html += '</div></div>';
        }
    });
    mainContent.innerHTML += html;

    document.getElementById('notify-btn').addEventListener('click', async () => {
        await requestNotificationPermission();
        if (notificationsEnabled) {
            document.getElementById('notify-btn').textContent = '✅ Aktif';
            document.getElementById('notify-btn').disabled = true;
        }
    });
}

function getSavedScheduleSnapshot() {
    const saved = localStorage.getItem('scheduleLastSnapshot');
    return saved ? JSON.parse(saved) : null;
}

function saveScheduleSnapshot(data) {
    localStorage.setItem('scheduleLastSnapshot', JSON.stringify(data));
}

function hasNewEpisode(oldData, newData) {
    if (!oldData) return true;
    for (const day in newData) {
        const oldList = oldData[day] || [];
        const newList = newData[day] || [];
        if (newList.length !== oldList.length) return true;
        for (let i = 0; i < newList.length; i++) {
            const oldEp = extractEpisodeNumber(oldList[i]?.episode_info);
            const newEp = extractEpisodeNumber(newList[i]?.episode_info);
            if (newEp > oldEp) return true;
        }
    }
    return false;
}

function extractEpisodeNumber(info) {
    if (!info) return 0;
    const match = info.match(/\((\d+)\)/);
    return match ? parseInt(match[1], 10) : 0;
}

async function loadSearchPage(query) {
    history.replaceState({page: 'search', query}, '', `#search?q=${encodeURIComponent(query)}`);
    mainContent.innerHTML = `<h2 class="page-title">Hasil Pencarian: "${query}"</h2><div class="anime-grid">${Array.from({length: 8}, _ => '<div class="skeleton"></div>').join('')}</div>`;
    const data = await fetchData(`${API_BASE}/anime/oploverz/search/${encodeURIComponent(query)}`);
    if (data && data.anime_list && data.anime_list.length > 0) {
        renderAnimeGrid(data.anime_list, 'search');    } else {
        mainContent.innerHTML = `<h2 class="page-title">Hasil Pencarian: "${query}"</h2><div class="empty-state">Tidak ada anime ditemukan.</div>`;
    }
}

async function loadDetailPage(slug) {
    history.pushState({page: 'detail', slug}, '', `#anime/${slug}`);
    mainContent.innerHTML = `<div class="detail-banner"><div class="skeleton banner-skeleton"></div></div><div class="detail-info-container"><div class="skeleton" style="height:200px;margin:1rem 0;"></div></div>`;
    const data = await fetchData(`${API_BASE}/anime/oploverz/anime/${slug}`);
    if (data && data.detail) renderDetailPage(data.detail, slug);
    else showError('Gagal memuat detail.');
}

function renderDetailPage(anime, animeSlug) {
    const info = anime.info || {};
    const genres = anime.genres?.map(g => g.name).join(', ') || '–';
    const statusDisplay = info.status === 'Completed' ? 'Selesai' : 'Sedang Tayang';

    // Simpan episode list ke localStorage untuk navigasi
    localStorage.setItem(`episodes_${animeSlug}`, JSON.stringify(anime.episode_list));

    let episodesHTML = '';
    if (anime.episode_list && anime.episode_list.length > 0) {
        const sorted = [...anime.episode_list].sort((a, b) => extractEpisodeNumber(b.episode) - extractEpisodeNumber(a.episode));
        episodesHTML = sorted.map(ep => `
            <div class="episode-card" onclick="loadEpisodePage('${ep.slug}')">
                <span class="ep-number">${ep.episode}</span>
                <span class="ep-date">${ep.release_date}</span>
            </div>
        `).join('');
    } else episodesHTML = '<p class="empty-state">Belum ada episode.</p>';

    mainContent.innerHTML = `
        <div class="detail-banner">
            <img src="${anime.poster}" alt="${anime.title}" class="banner-img">
            <div class="banner-overlay">
                <h1>${anime.title}</h1>
                <p>${info.type} • ${statusDisplay}</p>
            </div>
        </div>
        <div class="detail-info-container">
            <div class="detail-poster"><img src="${anime.poster}" alt="${anime.title}"></div>
            <div class="detail-info">
                <h2>Informasi</h2>
                <p><strong>Status:</strong> ${statusDisplay}</p>
                <p><strong>Studio:</strong> ${info.studio || '–'}</p>
                <p><strong>Durasi:</strong> ${info.duration || '–'}</p>
                <p><strong>Musim:</strong> ${info.season || '–'}</p>
                <p><strong>Tipe:</strong> ${info.type || '–'}</p>
                <p><strong>Genre:</strong> ${genres}</p>                <p><strong>Rilis:</strong> ${info.released_on || '–'}</p>
                <p><strong>Update:</strong> ${info.updated_on || '–'}</p>
            </div>
        </div>
        <div class="synopsis-section">
            <h2>Sinopsis</h2>
            <p>${anime.synopsis.replace(/^Sinopsis:\s*/, '')}</p>
        </div>
        <div class="episodes-section">
            <h2>Daftar Episode</h2>
            <div class="episodes-grid">${episodesHTML}</div>
        </div>
    `;
}

async function loadEpisodePage(slug) {
    history.pushState({page: 'episode', slug}, '', `#episode/${slug}`);
    mainContent.innerHTML = `<div class="player-skeleton"></div><div class="server-list-skeleton"></div><div class="nav-episode-skeleton"></div>`;
    const data = await fetchData(`${API_BASE}/anime/oploverz/episode/${slug}`);
    if (data) renderEpisodePage(data);
    else showError('Gagal memuat episode.');
}

function renderEpisodePage(episodeData) {
    const { episode_title, streams, slug: currentSlug } = episodeData;

    let animeTitle = episode_title;
    if (episode_title.includes(' Episode ')) {
        animeTitle = episode_title.split(' Episode ')[0];
    } else if (episode_title.includes(' Episode')) {
        animeTitle = episode_title.split(' Episode')[0];
    }

    // Ambil slug anime dari URL hash atau ekstrak
    const pathParts = window.location.hash.split('/');
    let animeSlug = pathParts[2] || extractAnimeSlugFromEpisodeSlug(currentSlug);

    // Ambil episode list dari localStorage
    const episodesKey = `episodes_${animeSlug}`;
    const episodeList = JSON.parse(localStorage.getItem(episodesKey) || '[]');

    const currentIndex = episodeList.findIndex(ep => ep.slug === currentSlug);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < episodeList.length - 1;
    const prevSlug = hasPrev ? episodeList[currentIndex - 1].slug : null;
    const nextSlug = hasNext ? episodeList[currentIndex + 1].slug : null;

    // Simpan ke history
    saveToHistory(animeTitle, episode_title, currentSlug);
    // Render UI
    let serverListHTML = '';
    if (streams && streams.length > 0) {
        serverListHTML = streams.map((stream, idx) => `
            <button class="server-btn" data-url="${(stream.url || '').trim()}">${stream.name || 'Server ' + (idx + 1)}</button>
        `).join('');
    }

    mainContent.innerHTML = `
        <h2 class="page-title">${episode_title}</h2>
        <div class="video-player">
            <iframe src="${(streams[0]?.url || '').trim()}" frameborder="0" allowfullscreen></iframe>
        </div>
        ${serverListHTML ? `
        <div class="server-section">
            <h3>Pilih Server:</h3>
            <div class="server-list">${serverListHTML}</div>
        </div>` : ''}
        <div class="episode-nav">
            <button id="prev-ep" ${!hasPrev ? 'disabled' : ''}>← Sebelumnya</button>
            <span>Episode</span>
            <button id="next-ep" ${!hasNext ? 'disabled' : ''}>Berikutnya →</button>
        </div>
    `;

    // Event listener server
    document.querySelectorAll('.server-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            const iframe = document.querySelector('.video-player iframe');
            if (iframe && url) {
                iframe.src = url;
                document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Navigasi
    if (hasPrev) {
        document.getElementById('prev-ep').addEventListener('click', () => {
            loadEpisodePage(prevSlug);
        });
    }
    if (hasNext) {
        document.getElementById('next-ep').addEventListener('click', () => {
            loadEpisodePage(nextSlug);
        });
    }
}
function extractAnimeSlugFromEpisodeSlug(episodeSlug) {
    if (!episodeSlug) return '';
    const parts = episodeSlug.split('-');
    let i = 0;
    while (i < parts.length) {
        if (parts[i] === 'episode' || /^\d+$/.test(parts[i])) break;
        i++;
    }
    return parts.slice(0, i).join('-') || episodeSlug;
}

function renderHistoryPage() {
    const history = getWatchHistory();
    mainContent.innerHTML = '<h2 class="page-title">Riwayat Tontonan</h2>';
    if (history.length === 0) {
        mainContent.innerHTML += '<div class="empty-state">Belum ada riwayat tontonan.</div>';
        return;
    }
    let html = '<div class="history-list">';
    history.forEach(item => {
        html += `
            <div class="history-item" onclick="loadEpisodePage('${item.slug}')">
                <div class="history-info">
                    <div class="history-anime">${item.anime}</div>
                    <div class="history-episode">${item.episode}</div>
                    <div class="history-time">${formatTimeAgo(item.timestamp)}</div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    mainContent.innerHTML += html;
}

function showError(msg) {
    mainContent.innerHTML = `<div class="error-state">${msg}</div>`;
}

function showEmptyState() {
    mainContent.innerHTML = `<div class="empty-state">Data tidak ditemukan.</div>`;
}
