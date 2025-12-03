// API Configuration
const API_BASE = 'https://www.sankavollerei.com/comic';
const UNLIMITED_API = 'https://www.sankavollerei.com/comic/unlimited';
const SCROLL_API = 'https://www.sankavollerei.com/comic/scroll';

// DOM Elements
const loadingSpinner = document.getElementById('loading-spinner');
const errorMessage = document.getElementById('error-message');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const mobileOverlay = document.getElementById('mobile-overlay');
const themeToggle = document.getElementById('theme-toggle');

// State
let currentRoute = window.location.hash || '#home';
let currentComicSlug = null;
let currentChapterSlug = null;
let infinitePage = 1;
let infiniteLoading = false;
let scrollOffset = 0; // For scroll endpoint
let scrollHasMore = true;
let scrollBatchId = 0;

// Initialize App
function initApp() {
    setupEventListeners();
    loadTheme();
    handleRouteChange();
    window.addEventListener('hashchange', handleRouteChange);
}

function setupEventListeners() {
    navToggle.addEventListener('click', toggleMobileMenu);
    mobileOverlay.addEventListener('click', toggleMobileMenu);
    themeToggle.addEventListener('click', toggleTheme);

    // Slider navigation
    document.getElementById('popular-prev').addEventListener('click', () => scrollSlider('popular-slider', -300));
    document.getElementById('popular-next').addEventListener('click', () => scrollSlider('popular-slider', 300));

    // Search
    document.getElementById('search-input').addEventListener('input', debounce(handleSearch, 500));

    // Browse filters
    document.getElementById('type-filter').addEventListener('change', loadBrowse);
    document.getElementById('order-filter').addEventListener('change', loadBrowse);
    document.getElementById('genre-filter').addEventListener('change', loadBrowse);

    // Trending filters
    document.querySelectorAll('.trending-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.trending-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadTrending(e.target.dataset.period);
        });
    });

    // Reader navigation
    document.getElementById('prev-chapter').addEventListener('click', navigateChapter);
    document.getElementById('next-chapter').addEventListener('click', navigateChapter);
}

function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function handleRouteChange() {
    const route = window.location.hash || '#home';
    currentRoute = route;
    showLoading();

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));

    // Show loading spinner
    loadingSpinner.classList.remove('hidden');

    // Load appropriate page
    switch (route) {
        case '#home':
            loadHome();
            break;
        case '#search':
            document.getElementById('search-page').classList.remove('hidden');
            hideLoading();
            break;
        case '#genres':
            loadGenres();
            break;
        case '#browse':
            loadBrowse();
            break;
        case '#trending':
            loadTrending('daily');
            break;
        case '#random':
            loadRandom();
            break;
        case '#stats':
            loadStats();
            break;
        case '#infinite':
            loadInfinite();
            break;
        case '#realtime':
            loadRealtime();
            break;
        default:
            if (route.startsWith('#comic/')) {
                currentComicSlug = route.split('/')[1];
                loadComicDetail(currentComicSlug);
            } else if (route.startsWith('#read/')) {
                const parts = route.split('/');
                currentChapterSlug = parts[1];
                loadChapter(parts[1], parts[2]);
            } else {
                loadHome();
            }
    }
}

// API Functions
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(API_BASE + endpoint);
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showError();
        return null;
    }
}

async function fetchScrollAPI(offset = 0, batchId = 0) {
    try {
        const response = await fetch(`${SCROLL_API}?offset=${offset}&batch_id=${batchId}`);
        if (!response.ok) throw new Error('Scroll API request failed');
        return await response.json();
    } catch (error) {
        console.error('Scroll API Error:', error);
        showError();
        return null;
    }
}

// Loading and Error Handling
function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError() {
    hideLoading();
    errorMessage.classList.remove('hidden');
    setTimeout(() => errorMessage.classList.add('hidden'), 3000);
}

// Utility Functions
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

function scrollSlider(containerId, amount) {
    const container = document.getElementById(containerId);
    container.scrollBy({ left: amount, behavior: 'smooth' });
}

// Page Loading Functions
async function loadHome() {
    document.getElementById('home-page').classList.remove('hidden');
    
    // Use the new endpoints from the documentation
    const [latestData, popularData] = await Promise.all([
        fetchAPI('/comic/terbaru'),
        fetchAPI('/comic/populer')
    ]);

    if (!latestData || !popularData) return;

    renderSlider('popular-slider', popularData.comics || []);
    renderGrid('latest-grid', latestData.comics || []);
    
    // For ranking, we'll use the popular data as a proxy
    renderList('ranking-list', (popularData.comics || []).slice(0, 10));

    hideLoading();
}

async function loadGenres() {
    document.getElementById('genres-page').classList.remove('hidden');
    
    // The documentation doesn't list a direct endpoint for all genres.
    // We'll try the homepage or search for a common genre to get a list of available genres.
    // For now, let's assume a generic genre list isn't directly available from the API.
    // We'll simulate a list based on common genres found on komiku.org
    const commonGenres = [
        { name: 'Action', slug: 'action' },
        { name: 'Adventure', slug: 'adventure' },
        { name: 'Comedy', slug: 'comedy' },
        { name: 'Drama', slug: 'drama' },
        { name: 'Fantasy', slug: 'fantasy' },
        { name: 'Romance', slug: 'romance' },
        { name: 'Slice of Life', slug: 'slice-of-life' },
        { name: 'Supernatural', slug: 'supernatural' },
        { name: 'Mystery', slug: 'mystery' },
        { name: 'Psychological', slug: 'psychological' },
        { name: 'Sci-Fi', slug: 'sci-fi' },
        { name: 'Horror', slug: 'horror' },
        { name: 'Ecchi', slug: 'ecchi' },
        { name: 'Shounen', slug: 'shounen' },
        { name: 'Shoujo', slug: 'shoujo' },
        { name: 'Seinen', slug: 'seinen' },
        { name: 'Josei', slug: 'josei' }
    ];

    const grid = document.getElementById('genres-grid');
    grid.innerHTML = '';
    
    commonGenres.forEach(genre => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.innerHTML = `
            <div style="background-color: var(--primary-color); color: white; width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; border-radius: var(--border-radius); cursor: pointer;">
                <h3>${genre.name}</h3>
            </div>
        `;
        item.addEventListener('click', () => {
            window.location.hash = `#browse?genre=${genre.slug}`;
        });
        grid.appendChild(item);
    });

    hideLoading();
}

async function loadBrowse() {
    document.getElementById('browse-page').classList.remove('hidden');
    
    const type = document.getElementById('type-filter').value;
    const order = document.getElementById('order-filter').value;
    const genre = document.getElementById('genre-filter').value;

    // Construct query parameters for advanced search
    const params = new URLSearchParams();
    params.append('q', ''); // Required, but empty means all
    if (type) params.append('type', type);
    if (order) params.append('sort', order);
    if (genre) params.append('genre', genre);
    params.append('page', '1');
    params.append('limit', '50');

    const data = await fetchAPI(`/comic/advanced-search?${params}`);
    if (!data) return;

    renderGrid('browse-grid', data.comics || []);

    hideLoading();
}

async function loadComicDetail(slug) {
    document.getElementById('detail-page').classList.remove('hidden');
    
    const data = await fetchAPI(`/comic/comic/${slug}`);
    if (!data) return;

    document.getElementById('detail-cover').src = data.cover || '';
    document.getElementById('detail-title').textContent = data.title || 'N/A';
    document.getElementById('detail-synopsis').textContent = data.synopsis || 'No synopsis available';
    document.getElementById('detail-author').textContent = data.author ? `Author: ${data.author}` : '';
    document.getElementById('detail-type').textContent = data.type ? `Type: ${data.type}` : '';
    document.getElementById('detail-status').textContent = data.status ? `Status: ${data.status}` : '';

    const genresContainer = document.getElementById('detail-genres');
    genresContainer.innerHTML = '';
    (data.genres || []).forEach(genre => {
        const span = document.createElement('span');
        span.textContent = genre;
        genresContainer.appendChild(span);
    });

    const chaptersList = document.getElementById('chapters-list');
    chaptersList.innerHTML = '';
    (data.chapters || []).forEach(chapter => {
        const item = document.createElement('div');
        item.className = 'chapter-item';
        item.textContent = chapter.title || `Chapter ${chapter.number}`;
        item.addEventListener('click', () => {
            // The slug for the chapter is usually the segment from the original link
            // Assuming the structure is /manga/slug/chapter-segment
            const segment = chapter.link.split('/').pop();
            window.location.hash = `#read/${slug}/${segment}`;
        });
        chaptersList.appendChild(item);
    });

    hideLoading();
}

async function loadChapter(comicSlug, chapterSegment) {
    document.getElementById('read-page').classList.remove('hidden');
    
    // The chapter endpoint uses the segment, not a slug
    const chapterData = await fetchAPI(`/comic/chapter/${chapterSegment}`);
    if (!chapterData) return;

    document.getElementById('reader-title').textContent = chapterData.title || 'Reading';
    currentChapterSlug = chapterSegment;

    const content = document.getElementById('reader-content');
    content.innerHTML = '';
    (chapterData.images || []).forEach(imgUrl => {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = 'Page';
        img.loading = 'lazy';
        content.appendChild(img);
    });

    // Navigation for chapters is not directly provided by the /chapter endpoint
    // We would need to fetch the comic detail again or implement logic to determine next/prev
    // For simplicity in this implementation, we'll disable navigation buttons
    document.getElementById('prev-chapter').style.display = 'none';
    document.getElementById('next-chapter').style.display = 'none';

    hideLoading();
}

async function navigateChapter(e) {
    // Chapter navigation requires fetching the comic detail to get the full chapter list
    // This is complex and requires more state management than implemented here
    // For now, this feature is disabled or requires a more complex implementation
    console.warn('Chapter navigation not fully implemented with current API structure.');
}

async function handleSearch(e) {
    const query = e.target.value.trim();
    if (!query) {
        document.getElementById('search-results').innerHTML = '';
        return;
    }

    const data = await fetchAPI(`/comic/search?q=${encodeURIComponent(query)}`);
    if (!data) return;

    renderGrid('search-results', data.comics || []);
}

async function loadTrending(period = 'daily') {
    document.getElementById('trending-page').classList.remove('hidden');
    
    // The documentation doesn't specify a direct trending endpoint with period filters.
    // We'll use the populer endpoint as a proxy for trending.
    const data = await fetchAPI('/comic/populer');
    if (!data) return;

    renderGrid('trending-grid', data.comics || []);

    hideLoading();
}

async function loadRandom() {
    document.getElementById('random-page').classList.remove('hidden');
    
    // The documentation doesn't specify a direct random endpoint.
    // We'll use the unlimited endpoint with a small max_pages and randomize
    const data = await fetchAPI('/comic/unlimited?max_pages=1&aggressive=false');
    if (!data) return;

    // Take a random sample of 10 from the results
    const comics = data.comics || [];
    const shuffled = [...comics].sort(() => 0.5 - Math.random());
    const randomComics = shuffled.slice(0, 10);

    renderGrid('random-grid', randomComics);

    hideLoading();
}

async function loadStats() {
    document.getElementById('stats-page').classList.remove('hidden');
    
    const [statsData, comparisonData] = await Promise.all([
        fetchAPI('/comic/stats'),
        fetchAPI('/comic/comparison')
    ]);

    const grid = document.getElementById('stats-grid');
    if (comparisonData && comparisonData.performance_ratio) {
        grid.innerHTML = `
            <div class="stat-card">
                <h3>Total Komik</h3>
                <p>${statsData?.total_comics || 0}</p>
            </div>
            <div class="stat-card">
                <h3>Total Chapter</h3>
                <p>${statsData?.total_chapters || 0}</p>
            </div>
            <div class="stat-card">
                <h3>Situs Terintegrasi</h3>
                <p>${statsData?.integrated_sites || 0}</p>
            </div>
            <div class="stat-card">
                <h3>Update Hari Ini</h3>
                <p>${statsData?.daily_updates || 0}</p>
            </div>
            <div class="stat-card">
                <h3>Perbandingan Data</h3>
                <p>${comparisonData.performance_ratio.data_multiplier || 'N/A'}</p>
            </div>
            <div class="stat-card">
                <h3>Perbaikan Kinerja</h3>
                <p>${comparisonData.performance_ratio.improvement || 'N/A'}%</p>
            </div>
        `;
    } else {
        grid.innerHTML = `
            <div class="stat-card">
                <h3>Total Komik</h3>
                <p>${statsData?.total_comics || 0}</p>
            </div>
            <div class="stat-card">
                <h3>Total Chapter</h3>
                <p>${statsData?.total_chapters || 0}</p>
            </div>
            <div class="stat-card">
                <h3>Situs Terintegrasi</h3>
                <p>${statsData?.integrated_sites || 0}</p>
            </div>
            <div class="stat-card">
                <h3>Update Hari Ini</h3>
                <p>${statsData?.daily_updates || 0}</p>
            </div>
        `;
    }

    hideLoading();
}

async function loadInfinite() {
    document.getElementById('infinite-page').classList.remove('hidden');
    
    // Reset scroll state
    scrollOffset = 0;
    scrollHasMore = true;
    scrollBatchId = 0;
    infiniteLoading = false;
    document.getElementById('infinite-grid').innerHTML = '';
    document.getElementById('infinite-loader').classList.remove('hidden');

    const data = await fetchScrollAPI(scrollOffset, scrollBatchId);
    if (!data) return;

    renderGrid('infinite-grid', data.comics || []);
    
    // Update scroll state
    if (data.scroll_info) {
        scrollOffset = data.scroll_info.next_offset;
        scrollHasMore = data.scroll_info.has_more;
        scrollBatchId = data.scroll_info.batch_id;
    } else {
        // Fallback if scroll_info is missing
        scrollOffset += 20;
        scrollHasMore = false;
    }

    document.getElementById('infinite-loader').classList.add('hidden');

    // Setup infinite scroll
    window.addEventListener('scroll', handleInfiniteScroll);
}

async function handleInfiniteScroll() {
    if (infiniteLoading || !scrollHasMore || window.innerHeight + window.scrollY < document.body.offsetHeight - 1000) {
        return;
    }

    infiniteLoading = true;
    document.getElementById('infinite-loader').classList.remove('hidden');

    const data = await fetchScrollAPI(scrollOffset, scrollBatchId);
    if (!data) {
        infiniteLoading = false;
        return;
    }

    const grid = document.getElementById('infinite-grid');
    (data.comics || []).forEach(comic => {
        const item = createGridItem(comic);
        grid.appendChild(item);
    });

    // Update scroll state
    if (data.scroll_info) {
        scrollOffset = data.scroll_info.next_offset;
        scrollHasMore = data.scroll_info.has_more;
        scrollBatchId = data.scroll_info.batch_id;
    } else {
        // Fallback if scroll_info is missing
        scrollOffset += 20;
        scrollHasMore = false;
    }

    infiniteLoading = false;
    document.getElementById('infinite-loader').classList.add('hidden');
}

async function loadRealtime() {
    document.getElementById('realtime-page').classList.remove('hidden');
    
    const data = await fetchAPI('/comic/realtime');
    if (!data) return;

    // The realtime endpoint returns 'comics' instead of 'updates'
    renderList('realtime-list', data.comics || []);

    hideLoading();
}

// Rendering Functions
function renderSlider(containerId, items) {
    const container = document.getElementById(containerId);
    const itemsContainer = container.querySelector('.slider-items');
    itemsContainer.innerHTML = '';

    items.forEach(item => {
        const sliderItem = document.createElement('div');
        sliderItem.className = 'slider-item';
        sliderItem.innerHTML = `
            <img src="${item.image || item.cover || ''}" alt="${item.title || ''}">
            <h4>${item.title || 'N/A'}</h4>
        `;
        sliderItem.addEventListener('click', () => {
            // Prefer slug, fallback to extracting from link for scroll/unlimited data
            let slug = item.slug;
            if (!slug && item.link) {
                // Extract slug from the link (e.g., from "https://komiku.org/manga/omniscient-readers-viewpoint/ ")
                // to "omniscient-readers-viewpoint"
                const match = item.link.match(/\/manga\/([^\/]+)\//);
                slug = match ? match[1] : null;
            }
            if (slug) {
                window.location.hash = `#comic/${slug}`;
            }
        });
        itemsContainer.appendChild(sliderItem);
    });
}

function renderGrid(containerId, items) {
    const container = document.getElementById(containerId);
    items.forEach(item => {
        const gridItem = createGridItem(item);
        container.appendChild(gridItem);
    });
}

function createGridItem(item) {
    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';
    
    // Adapt for different data structures
    const title = item.title || item.name || 'N/A';
    // Prefer 'cover' for standard endpoints, 'image' for scroll/unlimited/popular
    const cover = item.cover || item.image || '';
    // Chapter count or info
    const chapter = item.chapter || `${item.chapter_count || 0} Ch`;

    gridItem.innerHTML = `
        <img src="${cover}" alt="${title}">
        <h4>${title}</h4>
        <p>${item.type || ''} • ${chapter}</p>
    `;
    gridItem.addEventListener('click', () => {
        // Prefer slug, fallback to extracting from link for scroll/unlimited data
        let slug = item.slug;
        if (!slug && item.link) {
            // Extract slug from the link (e.g., from "https://komiku.org/manga/omniscient-readers-viewpoint/ ")
            // to "omniscient-readers-viewpoint"
            const match = item.link.match(/\/manga\/([^\/]+)\//);
            slug = match ? match[1] : null;
        }
        if (slug) {
            window.location.hash = `#comic/${slug}`;
        } else {
            // If no slug can be determined, navigate to the source page if available
            if (item.source_page) {
                window.open(item.source_page, '_blank');
            }
        }
    });
    return gridItem;
}

function renderList(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    items.forEach((item, index) => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.innerHTML = `
            <span style="font-weight: bold; color: var(--primary-color); min-width: 30px;">${index + 1}</span>
            <img src="${item.cover || item.image || ''}" alt="${item.title || ''}">
            <div class="list-item-info">
                <h4>${item.title || 'N/A'}</h4>
                <p>${item.type || ''} • ${item.chapter_count || 0} Ch</p>
            </div>
        `;
        listItem.addEventListener('click', () => {
            // Prefer slug, fallback to extracting from link for scroll/unlimited data
            let slug = item.slug;
            if (!slug && item.link) {
                // Extract slug from the link (e.g., from "https://komiku.org/manga/omniscient-readers-viewpoint/ ")
                // to "omniscient-readers-viewpoint"
                const match = item.link.match(/\/manga\/([^\/]+)\//);
                slug = match ? match[1] : null;
            }
            if (slug) {
                window.location.hash = `#comic/${slug}`;
            }
        });
        container.appendChild(listItem);
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
