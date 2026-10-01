// Initialize Supabase client safely in browser
const SUPABASE_URL = "https://pijczsbebhvdvqrmfcmu.supabase.co";
const SUPABASE_KEY = "sb_publishable_CPJDJ_Mc6Rnu83kEQ41RFw_Tl5jxTjD";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const JAMENDO_CLIENT_ID = "3a261f5d";

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
const audioPlayer = document.getElementById('audioPlayer');

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
    audioPlayer.pause();
    audioPlayer.src = "";
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
    loadJamendoTrending();
}

// Fetch user favorites from Supabase SQL Database
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

// Load Jamendo Trending Music on start
async function loadJamendoTrending() {
    resultsList.innerHTML = `<div class="status-msg">Loading Jamendo music...</div>`;
    try {
        const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=6&include=musicinfo`);
        const data = await res.json();
        displayTracks(data.results);
    } catch (err) {
        resultsList.innerHTML = `<div class="status-msg">Use search above to find tracks.</div>`;
    }
}

searchBtn.addEventListener('click', executeSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeSearch(); });

async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    resultsList.innerHTML = `<div class="status-msg">Searching Jamendo...</div>`;
    try {
        const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=6&search=${encodeURIComponent(query)}`);
        const data = await res.json();
        displayTracks(data.results);
    } catch (err) {
        resultsList.innerHTML = `<div class="status-msg">Network error. Try again.</div>`;
    }
}

function displayTracks(tracks) {
    resultsList.innerHTML = "";
    if (!tracks || tracks.length === 0) {
        resultsList.innerHTML = `<div class="status-msg">No tracks found.</div>`;
        return;
    }

    tracks.forEach(track => {
        const artwork = track.image || 'https://via.placeholder.com/150/1a1a24/ffffff?text=Moosik';
        const streamUrl = track.audio;
        const isSaved = cloudFavorites.some(fav => fav.track_id === String(track.id));

        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-item';
        trackDiv.innerHTML = `
            <img src="${artwork}" alt="Cover" class="list-art">
            <div class="track-info" style="flex: 1;">
                <strong>${escapeHtml(track.name)}</strong>
                <span>${escapeHtml(track.artist_name)}</span>
            </div>
            <button type="button" class="save-btn" style="${isSaved ? 'background: rgba(46, 204, 113, 0.4); border-color: rgba(46, 204, 113, 0.6);' : ''}">
                ${isSaved ? 'Saved ✓' : 'Save'}
            </button>
        `;

        trackDiv.querySelector('.list-art').addEventListener('click', () => playSong(streamUrl));
        trackDiv.querySelector('.track-info').addEventListener('click', () => playSong(streamUrl));

        const saveBtn = trackDiv.querySelector('.save-btn');
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite({
                username: currentUser,
                track_id: String(track.id),
                title: track.name,
                artist: track.artist_name,
                artwork,
                stream_url: streamUrl
            }, saveBtn);
        });

        resultsList.appendChild(trackDiv);
    });
}

function playSong(url) {
    audioPlayer.src = url;
    audioPlayer.play().catch(() => {});
}

async function toggleFavorite(songData, buttonElement) {
    const isAlreadySaved = cloudFavorites.some(fav => fav.track_id === songData.track_id);

    if (!isAlreadySaved) {
        // Insert into Supabase SQL Database
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

        favDiv.querySelector('.list-art').addEventListener('click', () => playSong(fav.stream_url));
        favDiv.querySelector('.track-info').addEventListener('click', () => playSong(fav.stream_url));

        favDiv.querySelector('.remove-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            // Delete row from Supabase SQL Database
            const { error } = await supabaseClient
                .from('user_favorites')
                .delete()
                .eq('username', currentUser)
                .eq('track_id', fav.track_id);

            if (!error) {
                await fetchCloudFavorites();
                if (searchInput.value.trim()) {
                    executeSearch();
                } else {
                    loadJamendoTrending();
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
