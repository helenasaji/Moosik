// Initialize Supabase client
const SUPABASE_URL = "https://pijczsbebhvdvqrmfcmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_CPJDJ_Mc6Rnu83kEQ41RFw_Tl5jxTjD";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const welcomeScreen = document.getElementById('welcomeScreen');
const mainApp = document.getElementById('mainApp');
const userNameInput = document.getElementById('userNameInput');
const enterAppBtn = document.getElementById('enterAppBtn');
const switchUserBtn = document.getElementById('switchUserBtn');
const greetingText = document.getElementById('greetingText');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const favoritesList = document.getElementById('favoritesList');
const playerContainer = document.getElementById('playerContainer');

let currentUser = "";
let cloudFavorites = [];

// Check local session state
const savedUser = localStorage.getItem('moosik_active_user');
if (savedUser) loginUser(savedUser);

enterAppBtn.addEventListener('click', handleLogin);
userNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

function handleLogin() {
    const nameTyped = userNameInput.value.trim();
    if (nameTyped) {
        localStorage.setItem('moosik_active_user', nameTyped);
        loginUser(nameTyped);
    }
}

switchUserBtn.addEventListener('click', () => {
    localStorage.removeItem('moosik_active_user');
    currentUser = "";
    cloudFavorites = [];
    playerContainer.style.display = "none";
    playerContainer.innerHTML = "";
    mainApp.style.display = "none";
    welcomeScreen.style.display = "block";
    userNameInput.value = "";
});

async function loginUser(name) {
    currentUser = name.toLowerCase(); 
    
    welcomeScreen.style.display = "none";
    mainApp.style.display = "block";
    
    greetingText.textContent = `${name}'s Moosik`; 
    
    await fetchCloudFavorites();
    searchDefaultMusic("Malayalam hits");
}

async function fetchCloudFavorites() {
    const { data, error } = await supabaseClient
        .from('user_favorites')
        .select('*')
        .eq('username', currentUser);

    if (!error && data) {
        cloudFavorites = data;
        renderFavorites();
    }
}

searchBtn.addEventListener('click', executeSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeSearch(); });

async function searchDefaultMusic(query) {
    resultsList.innerHTML = `<div class="status-msg">Loading music...</div>`;
    await fetchYouTubeTracks(query);
}

async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    await fetchYouTubeTracks(query);
}

async function fetchYouTubeTracks(query) {
    resultsList.innerHTML = `<div class="status-msg">Searching YouTube...</div>`;
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.error) {
            resultsList.innerHTML = `<div class="status-msg" style="color:#ff6b6b;">Error: ${data.error.message || data.error}</div>`;
            return;
        }
        
        if (!data.items || data.items.length === 0) {
            resultsList.innerHTML = `<div class="status-msg">No tracks found.</div>`;
            return;
        }

        const tracks = data.items.map(item => ({
            id: item.id.videoId,
            name: item.snippet.title,
            artist_name: item.snippet.channelTitle,
            image: item.snippet.thumbnails.medium.url,
            videoId: item.id.videoId
        }));
        
        displayTracks(tracks, resultsList);
    } catch (err) {
        resultsList.innerHTML = `<div class="status-msg" style="color:#ff6b6b;">Failed to reach backend server.</div>`;
    }
}

function displayTracks(tracks, container) {
    container.innerHTML = "";
    if (!tracks || tracks.length === 0) {
        container.innerHTML = `<div class="status-msg">No tracks found.</div>`;
        return;
    }

    tracks.forEach(track => {
        const isSaved = cloudFavorites.some(fav => fav.track_id === String(track.videoId));

        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        trackDiv.innerHTML = `
            <img src="${track.image}" alt="Cover" class="list-art">
            <div class="track-info" style="flex: 1; cursor: pointer;">
                <strong>${escapeHtml(track.name)}</strong>
                <span>${escapeHtml(track.artist_name)}</span>
            </div>
            <button type="button" class="save-btn" style="${isSaved ? 'background: rgba(46, 204, 113, 0.4); border-color: rgba(46, 204, 113, 0.6);' : ''}">
                ${isSaved ? 'Saved ✓' : 'Save'}
            </button>
        `;

        trackDiv.querySelector('.list-art').addEventListener('click', () => playYouTubeVideo(track.videoId));
        trackDiv.querySelector('.track-info').addEventListener('click', () => playYouTubeVideo(track.videoId));

        const saveBtn = trackDiv.querySelector('.save-btn');
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite({
                username: currentUser,
                track_id: String(track.videoId),
                title: track.name,
                artist: track.artist_name,
                artwork: track.image,
                stream_url: track.videoId
            }, saveBtn);
        });

        container.appendChild(trackDiv);
    });
}

function playYouTubeVideo(videoId, index = -1, isFavorite = false) {
    playerContainer.style.display = "block";
    const isPlaylist = isFavorite && index !== -1;
    
    // Inject the iframe AND the custom Next/Prev UI buttons if playing from favorites
    playerContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.9rem; font-weight: bold; color: var(--text-primary);">Now Playing</span>
            
            ${isPlaylist ? `
            <div style="display: flex; gap: 8px;">
                <button id="uiPrevBtn" style="padding: 4px 12px; font-size: 1rem; background: var(--panel-bg); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; cursor: pointer;">⏮</button>
                <button id="uiNextBtn" style="padding: 4px 12px; font-size: 1rem; background: var(--panel-bg); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; cursor: pointer;">⏭</button>
            </div>
            ` : ''}
        </div>
        
        <div style="position: relative; overflow: hidden; height: 200px; border-radius: 12px; background: #000;">
            <iframe 
                id="youtubePlayer"
                style="position: absolute; bottom: 0; left: 0; width: 100
