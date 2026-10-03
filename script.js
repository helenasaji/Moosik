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
    currentUser = name;
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

function playYouTubeVideo(videoId) {
    playerContainer.style.display = "block";
    if (ytPlayer && ytPlayer.loadVideoById) {
        ytPlayer.loadVideoById(videoId);
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
            .eq('track_id', songData.track_id); // Deletes only this specific track for this user[span_1](start_span)[span_1](end_span)[span_2](start_span)[span_2](end_span)
            
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

}

function renderFavorites() {
    favoritesList.innerHTML = "";
    if (cloudFavorites.length === 0) {
        favoritesList.innerHTML = `<div class="status-msg">No cloud favorites yet.</div>`;
        return;
    }

    cloudFavorites.forEach((fav) => {
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

        favDiv.querySelector('.list-art').addEventListener('click', () => playYouTubeVideo(fav.stream_url));
        favDiv.querySelector('.track-info').addEventListener('click', () => playYouTubeVideo(fav.stream_url));

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
