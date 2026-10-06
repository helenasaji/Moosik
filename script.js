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
let ytPlayer = null;

// Track current active index for custom JS playlist progression
let currentPlaylistIndex = -1;
let activePlaylistSource = [];

// YouTube API Callback
window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('youtubePlayer', {
        height: '200',
        width: '100%',
        videoId: '',
        playerVars: { 'autoplay': 1, 'controls': 1 },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
};

function onPlayerStateChange(event) {
    // When a video finishes playing (State 0), automatically play the next song in the playlist
    if (event.data === YT.PlayerState.ENDED) {
        if (activePlaylistSource.length > 0 && currentPlaylistIndex !== -1 && currentPlaylistIndex < activePlaylistSource.length - 1) {
            currentPlaylistIndex++;
            const nextSong = activePlaylistSource[currentPlaylistIndex];
            playYouTubeVideo(nextSong.stream_url, currentPlaylistIndex, true);
        }
    }
}

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
    if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
    playerContainer.style.display = "none";
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
    
    // Track playlist metadata for JavaScript-based auto-play
    if (isFavorite && index !== -1) {
        currentPlaylistIndex = index;
        activePlaylistSource = cloudFavorites;
    } else {
        currentPlaylistIndex = -1;
        activePlaylistSource = [];
    }

    // Load the video natively through the API to prevent iframe reloading and glitches
    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
        ytPlayer.loadVideoById(videoId);
    } else {
        // Initial setup structure
        playerContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 0.9rem; font-weight: bold; color: var(--text-primary);">Now Playing</span>
            </div>
            <div style="position: relative; overflow: hidden; height: 200px; border-radius: 12px; background: #000;">
                <div id="youtubePlayer"></div>
            </div>
        `;
        
        ytPlayer = new YT.Player('youtubePlayer', {
            height: '200',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'controls': 1 },
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    }
}

async function toggleFavorite(songData, buttonElement) {
    const isAlreadySaved = cloudFavorites.some(fav => fav.track_id === songData.track_id);

    if (!isAlreadySaved) {
        const { error } = await supabaseClient.from('user_favorites').insert([songData]);
        
        if (error) {
            console.error("Supabase Save Error Details:", error);
            alert("Could not save: " + error.message);
            return;
        }

        buttonElement.textContent = "Saved ✓";
        buttonElement.style.background = "rgba(46, 204, 113, 0.4)";
        buttonElement.style.borderColor = "rgba(46, 204, 113, 0.6)";
        
    } else {
        const { error } = await supabaseClient
            .from('user_favorites')
            .delete()
            .eq('username', songData.username)
            .eq('track_id', songData.track_id);
            
        if (error) {
            console.error("Supabase Delete Error Details:", error);
            alert("Could not remove: " + error.message);
            return;
        }

        buttonElement.textContent = "Save";
        buttonElement.style.background = "";
        buttonElement.style.borderColor = "";
    }
    
    await fetchCloudFavorites();
}

function renderFavorites() {
    favoritesList.innerHTML = "";
    if (cloudFavorites.length === 0) {
        favoritesList.innerHTML = `<div class="status-msg">No cloud favorites yet.</div>`;
        return;
    }

    cloudFavorites.forEach((fav, index) => {
        const favDiv = document.createElement('div');
        favDiv.className = 'track-item';
        favDiv.innerHTML = `
            <img src="${fav.artwork}" alt="Cover" class="list-art">
            <div class="track-info" style="flex: 1; cursor: pointer;">
                <strong>${escapeHtml(fav.title)}</strong>
                <span>${escapeHtml(fav.artist)}</span>
            </div>
            <button type="button" class="remove-btn">✕</button>
        `;

        favDiv.querySelector('.list-art').addEventListener('click', () => playYouTubeVideo(fav.stream_url, index, true));
        favDiv.querySelector('.track-info').addEventListener('click', () => playYouTubeVideo(fav.stream_url, index, true));

        favDiv.querySelector('.remove-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const { error } = await supabaseClient
                .from('user_favorites')
                .delete()
                .eq('username', currentUser)
                .eq('track_id', fav.track_id);

            if (!error) {
                await fetchCloudFavorites();
                if (searchInput.value.trim()) {
                    executeSearch();
                }
            }
        });

        favoritesList.appendChild(favDiv);
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Theme Bulb Logic
const themeBulb = document.getElementById('themeBulb');
const savedTheme = localStorage.getItem('moosik_theme') || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

document.documentElement.setAttribute('data-theme', savedTheme);

if (themeBulb) {
    themeBulb.addEventListener('click', () => {
        themeBulb.style.transform = "rotate(15deg)";
        setTimeout(() => {
            themeBulb.style.transform = "rotate(0deg)";
        }, 300);

        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('moosik_theme', newTheme);
    });
}
