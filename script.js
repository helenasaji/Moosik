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
let isMp3Mode = false;

// YouTube API Callback
window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('youtubePlayer', {
        height: '200',
        width: '100%',
        videoId: '',
        playerVars: { 'autoplay': 1, 'controls': 1 }
    });
};

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
    // Force the database to use lowercase internally so all casing variations match exactly
    currentUser = name.toLowerCase(); 
    
    welcomeScreen.style.display = "none";
    mainApp.style.display = "block";
    
    // Use the originally typed name just for the visual greeting on screen
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
        
        // This will print the exact Google Cloud error on your screen if the key is blocked!
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
    
    // We completely removed the buggy "playlistString" logic here 
    // so it will only ever play the exact song you clicked.

    playerContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.9rem; font-weight: bold; color: var(--text-primary);">Now Playing</span>
            <button id="modeToggleBtn" style="padding: 6px 12px; font-size: 0.75rem; background: var(--panel-bg); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 8px; cursor: pointer;">
                Switch to MP3 Mode
            </button>
        </div>
        
        <div id="audioWrapper" style="display: none; text-align: center; padding: 15px; background: var(--track-bg); border-radius: 12px 12px 0 0; border: 1px solid var(--border-color); border-bottom: none;">
           <div style="font-size: 2rem; margin-bottom: 5px;">🎵</div>
           <div style="color: var(--text-primary); font-weight: 600;">Audio Playing</div>
        </div>

        <div id="videoWrapper" style="position: relative; overflow: hidden; height: 200px; border-radius: 12px; transition: height 0.3s ease; background: #000;">
            <iframe 
                id="youtubePlayer"
                style="position: absolute; bottom: 0; left: 0; width: 100%; height: 200px;"
                src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>
    `;

    updatePlayerMode();

    document.getElementById('modeToggleBtn').addEventListener('click', () => {
        isMp3Mode = !isMp3Mode;
        updatePlayerMode();
    });
}

function updatePlayerMode() {
    const videoWrapper = document.getElementById('videoWrapper');
    const audioWrapper = document.getElementById('audioWrapper');
    const modeBtn = document.getElementById('modeToggleBtn');

    if (!videoWrapper || !audioWrapper || !modeBtn) return;

    if (isMp3Mode) {
        // Show the MP3 UI graphic on top
        audioWrapper.style.display = "block";
        // Crop the video frame to exactly 45px to only show the control bar
        videoWrapper.style.height = "45px";
        // Flatten the top corners so it connects seamlessly to the audio UI above it
        videoWrapper.style.borderRadius = "0 0 12px 12px";
        modeBtn.textContent = "Switch to Video Mode";
    } else {
        // Hide MP3 UI
        audioWrapper.style.display = "none";
        // Restore full video height
        videoWrapper.style.height = "200px";
        // Restore rounded corners all around
        videoWrapper.style.borderRadius = "12px";
        modeBtn.textContent = "Switch to MP3 Mode";
    }
}

async function toggleFavorite(songData, buttonElement) {
    const isAlreadySaved = cloudFavorites.some(fav => fav.track_id === songData.track_id);

    if (!isAlreadySaved) {
        // Step 1: It is NOT saved yet, so we Insert/Save it
        const { error } = await supabaseClient.from('user_favorites').insert([songData]);
        
        if (error) {
            console.error("Supabase Save Error Details:", error);
            alert("Could not save: " + error.message);
            return;
        }

        // Make button green to indicate it is saved
        buttonElement.textContent = "Saved ✓";
        buttonElement.style.background = "rgba(46, 204, 113, 0.4)";
        buttonElement.style.borderColor = "rgba(46, 204, 113, 0.6)";
        
    } else {
        // Step 2: It IS already saved, so we Delete/Remove it
        const { error } = await supabaseClient
            .from('user_favorites')
            .delete()
            .eq('username', songData.username)
            .eq('track_id', songData.track_id); // Deletes only this specific track for this user
            
        if (error) {
            console.error("Supabase Delete Error Details:", error);
            alert("Could not remove: " + error.message);
            return;
        }

        // Reset button back to the default "Save" state
        buttonElement.textContent = "Save";
        buttonElement.style.background = "";
        buttonElement.style.borderColor = "";
    }
    
    // Refresh the cloud favorites list after either action so the sidebar updates instantly
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

        // We pass the index and 'true' here to let the player know this is from the favorites list
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
        // Add a physical swinging effect on click
        themeBulb.style.transform = "rotate(15deg)";
        setTimeout(() => {
            themeBulb.style.transform = "rotate(0deg)";
        }, 300);

        // Toggle the theme
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('moosik_theme', newTheme);
    });
}
