// API Configuration
const API_BASE = 'https://www.sankavollerei.com/comic';

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
    
    const data = await fetchAPI('/comic/homepage');
    if (!data) return;

    renderSlider('popular-slider', data.popular || []);
    renderGrid('latest-grid', data.latest || []);
    renderList('ranking-list', data.ranking || []);

    hideLoading();
}

async function loadGenres() {
    document.getElementById('genres-page').classList.remove('hidden');
    
    const data = await fetchAPI('/comic/genres');
    if (!data) return;

    const grid = document.getElementById('genres-grid');
    grid.innerHTML = '';
    
    (data.genres || []).forEach(genre => {
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

    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (order) params.append('order', order);
    if (genre) params.append('genre', genre);

    const data = await fetchAPI(`/comic/browse?${params}`);
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
            window.location.hash = `#read/${slug}/${chapter.slug}`;
        });
        chaptersList.appendChild(item);
    });

    hideLoading();
}

async function loadChapter(comicSlug, chapterSlug) {
    document.getElementById('read-page').classList.remove('hidden');
    
    const [chapterData, navData] = await Promise.all([
        fetchAPI(`/comic/chapter/${chapterSlug}`),
        fetchAPI(`/comic/chapter/${chapterSlug}/navigation`)
    ]);

    if (!chapterData) return;

    document.getElementById('reader-title').textContent = chapterData.title || 'Reading';
    currentChapterSlug = chapterSlug;

    const content = document.getElementById('reader-content');
    content.innerHTML = '';
    (chapterData.images || []).forEach(imgUrl => {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = 'Page';
        img.loading = 'lazy';
        content.appendChild(img);
    });

    // Update navigation
    if (navData) {
        document.getElementById('prev-chapter').onclick = () => {
            if (navData.prev) window.location.hash = `#read/${comicSlug}/${navData.prev}`;
        };
        document.getElementById('next-chapter').onclick = () => {
            if (navData.next) window.location.hash = `#read/${comicSlug}/${navData.next}`;
        };
    }

    hideLoading();
}

async function navigateChapter(e) {
    const direction = e.target.closest('#prev-chapter') ? 'prev' : 'next';
    if (!currentChapterSlug) return;

    const navData = await fetchAPI(`/comic/chapter/${currentChapterSlug}/navigation`);
    if (!navData) return;

    const newChapterSlug = navData[direction];
    if (newChapterSlug) {
        // Extract comic slug from current hash
        const comicSlug = currentRoute.split('/')[1];
        window.location.hash = `#read/${comicSlug}/${newChapterSlug}`;
    }
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
    
    const data = await fetchAPI(`/comic/trending?period=${period}`);
    if (!data) return;

    renderGrid('trending-grid', data.comics || []);

    hideLoading();
}

async function loadRandom() {
    document.getElementById('random-page').classList.remove('hidden');
    
    const data = await fetchAPI('/comic/random');
    if (!data) return;

    renderGrid('random-grid', data.comics || []);

    hideLoading();
}

async function loadStats() {
    document.getElementById('stats-page').classList.remove('hidden');
    
    const data = await fetchAPI('/comic/stats');
    if (!data) return;

    const grid = document.getElementById('stats-grid');
    grid.innerHTML = `
        <div class="stat-card">
            <h3>Total Komik</h3>
            <p>${data.total_comics || 0}</p>
        </div>
        <div class="stat-card">
            <h3>Total Chapter</h3>
            <p>${data.total_chapters || 0}</p>
        </div>
        <div class="stat-card">
            <h3>Situs Terintegrasi</h3>
            <p>${data.integrated_sites || 0}</p>
        </div>
        <div class="stat-card">
            <h3>Update Hari Ini</h3>
            <p>${data.daily_updates || 0}</p>
        </div>
    `;

    hideLoading();
}

async function loadInfinite() {
    document.getElementById('infinite-page').classList.remove('hidden');
    
    infinitePage = 1;
    infiniteLoading = false;
    document.getElementById('infinite-grid').innerHTML = '';
    document.getElementById('infinite-loader').classList.remove('hidden');

    const data = await fetchAPI(`/comic/infinite?page=${infinitePage}`);
    if (!data) return;

    renderGrid('infinite-grid', data.comics || []);
    infinitePage++;
    document.getElementById('infinite-loader').classList.add('hidden');

    // Setup infinite scroll
    window.addEventListener('scroll', handleInfiniteScroll);
}

async function handleInfiniteScroll() {
    if (infiniteLoading || window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        infiniteLoading = true;
        document.getElementById('infinite-loader').classList.remove('hidden');

        const data = await fetchAPI(`/comic/infinite?page=${infinitePage}`);
        if (!data) {
            infiniteLoading = false;
            return;
        }

        const grid = document.getElementById('infinite-grid');
        (data.comics || []).forEach(comic => {
            const item = createGridItem(comic);
            grid.appendChild(item);
        });

        infinitePage++;
        infiniteLoading = false;
        document.getElementById('infinite-loader').classList.add('hidden');
    }
}

async function loadRealtime() {
    document.getElementById('realtime-page').classList.remove('hidden');
    
    const data = await fetchAPI('/comic/realtime');
    if (!data) return;

    renderList('realtime-list', data.updates || []);

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
            <img src="${item.cover || ''}" alt="${item.title || ''}">
            <h4>${item.title || 'N/A'}</h4>
        `;
        sliderItem.addEventListener('click', () => {
            window.location.hash = `#comic/${item.slug}`;
        });
        itemsContainer.appendChild(sliderItem);
    });
}

function renderGrid(containerId, items) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    items.forEach(item => {
        const gridItem = createGridItem(item);
        container.appendChild(gridItem);
    });
}

function createGridItem(item) {
    const gridItem = document.createElement('div');
    gridItem.className = 'grid-item';
    gridItem.innerHTML = `
        <img src="${item.cover || ''}" alt="${item.title || ''}">
        <h4>${item.title || 'N/A'}</h4>
        <p>${item.type || ''} • ${item.chapter_count || 0} Ch</p>
    `;
    gridItem.addEventListener('click', () => {
        window.location.hash = `#comic/${item.slug}`;
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
            <img src="${item.cover || ''}" alt="${item.title || ''}">
            <div class="list-item-info">
                <h4>${item.title || 'N/A'}</h4>
                <p>${item.type || ''} • ${item.chapter_count || 0} Ch</p>
            </div>
        `;
        listItem.addEventListener('click', () => {
            window.location.hash = `#comic/${item.slug}`;
        });
        container.appendChild(listItem);
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
