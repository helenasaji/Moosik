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

// Curated library (You can add any YouTube video ID here for Malayalam or global tracks!)
const YOUTUBE_TRACKS = [
    {
        id: "yt-1",
        name: "Thumbi Penne (Sample)",
        artist_name: "Malayalam Hits",
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=80",
        videoId: "kJQP7kiw5Fk" // Example placeholder video ID
    },
    {
        id: "yt-2",
        name: "Acoustic Chill Vibes",
        artist_name: "Vlog Music",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80",
        videoId: "5qap5aO4i9A"
    },
    {
        id: "yt-3",
        name: "Kerala Monsoons Lo-Fi",
        artist_name: "God's Own Country",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=80",
        videoId: "jfKfPfyJRdk"
    }
];

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
    loadDefaultTracks();
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

function loadDefaultTracks() {
    displayTracks(YOUTUBE_TRACKS);
}

searchBtn.addEventListener('click', executeSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeSearch(); });

function executeSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
        loadDefaultTracks();
        return;
    }
    
    const filtered = YOUTUBE_TRACKS.filter(track => 
        track.name.toLowerCase().includes(query) || 
        track.artist_name.toLowerCase().includes(query)
    );
    
    displayTracks(filtered);
}

function displayTracks(tracks) {
    resultsList.innerHTML = "";
    if (!tracks || tracks.length === 0) {
        resultsList.innerHTML = `<div class="status-msg">No tracks found. Try searching 'Malayalam' or 'Chill'.</div>`;
        return;
    }

    tracks.forEach(track => {
        const isSaved = cloudFavorites.some(fav => fav.track_id === String(track.id));

        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        trackDiv.innerHTML = `
            <img src="${track.image}" alt="Cover" class="list-art">
            <div class="track-info" style="flex: 1;">
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
                track_id: String(track.id),
                title: track.name,
                artist: track.artist_name,
                artwork: track.image,
                stream_url: track.videoId // storing videoId in stream_url field for cloud playback
            }, saveBtn);
        });

        resultsList.appendChild(trackDiv);
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
        const { error } = await supabaseClient.from('user_favorites').insert([songData]);
        if (!error) {
            buttonElement.textContent = "Saved ✓";
            buttonElement.style.background = "rgba(46, 204, 113, 0.4)";
            buttonElement.style.borderColor = "rgba(46, 204, 113, 0.6)";
            await fetchCloudFavorites();
        }
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
            <div class="track-info" style="flex: 1;">
                <strong>${escapeHtml(fav.title)}</strong>
                <span>${escapeHtml(fav.artist)}</span>
            </div>
            <button type="button" class="remove-btn">✕</button>
        `;

        // Clicking a favorite loads its YouTube video ID
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
                executeSearch();
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
