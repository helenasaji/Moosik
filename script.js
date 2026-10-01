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
    audioPlayer.pause();
    audioPlayer.src = "";
    mainApp.style.display = "none";
    welcomeScreen.style.display = "block";
    userNameInput.value = "";
});

function loginUser(name) {
    currentUser = name;
    welcomeScreen.style.display = "none";
    mainApp.style.display = "block";
    greetingText.textContent = `${name}'s Moosik`;
    renderFavorites();
}

searchBtn.addEventListener('click', executeSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') executeSearch(); });

async function executeSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    resultsList.innerHTML = `<div class="status-msg">Searching Audius...</div>`;
    try {
        const hostRes = await fetch('https://api.audius.co');
        const hosts = await hostRes.json();
        const host = hosts.data[0];
        const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=Moosik`);
        const data = await res.json();
        resultsList.innerHTML = "";

        if (data.data && data.data.length > 0) {
            data.data.slice(0, 5).forEach(track => {
                const artwork = track.artwork && track.artwork['150x150'] ? track.artwork['150x150'] : 'https://via.placeholder.com/150/1a1a24/ffffff?text=Moosik';
                const streamUrl = `${host}/v1/tracks/${track.id}/stream?app_name=Moosik`;
                const trackDiv = document.createElement('div');
                trackDiv.className = 'track-item';
                trackDiv.innerHTML = `
                    <img src="${artwork}" alt="Cover" class="list-art">
                    <div class="track-info" style="flex: 1;">
                        <strong>${escapeHtml(track.title)}</strong>
                        <span>${escapeHtml(track.user.name)}</span>
                    </div>
                    <button type="button" class="save-btn">Save</button>
                `;
                trackDiv.querySelector('.list-art').addEventListener('click', () => playSong(streamUrl));
                trackDiv.querySelector('.track-info').addEventListener('click', () => playSong(streamUrl));
                trackDiv.querySelector('.save-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    saveFavorite({ id: track.id, title: track.title, artist: track.user.name, artwork, streamUrl });
                });
                resultsList.appendChild(trackDiv);
            });
        } else {
            resultsList.innerHTML = `<div class="status-msg">No tracks found.</div>`;
        }
    } catch (err) {
        resultsList.innerHTML = `<div class="status-msg">Error connecting to network. Try again.</div>`;
    }
}

function playSong(url) {
    audioPlayer.src = url;
    audioPlayer.play().catch(() => {});
}

function getUserFavorites() {
    const masterDB = JSON.parse(localStorage.getItem('moosik_master_db')) || {};
    return masterDB[currentUser] || [];
}

function saveFavorite(songData) {
    const masterDB = JSON.parse(localStorage.getItem('moosik_master_db')) || {};
    if (!masterDB[currentUser]) masterDB[currentUser] = [];
    const exists = masterDB[currentUser].some(fav => fav.id === songData.id);
    if (!exists) {
        masterDB[currentUser].push(songData);
        localStorage.setItem('moosik_master_db', JSON.stringify(masterDB));
        renderFavorites();
    }
}

function renderFavorites() {
    favoritesList.innerHTML = "";
    const userFavorites = getUserFavorites();
    if (userFavorites.length === 0) {
        favoritesList.innerHTML = `<div class="status-msg">No favorites yet.</div>`;
        return;
    }
    userFavorites.forEach((fav, index) => {
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
        favDiv.querySelector('.list-art').addEventListener('click', () => playSong(fav.streamUrl));
        favDiv.querySelector('.track-info').addEventListener('click', () => playSong(fav.streamUrl));
        favDiv.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const masterDB = JSON.parse(localStorage.getItem('moosik_master_db')) || {};
            if (masterDB[currentUser]) {
                masterDB[currentUser].splice(index, 1);
                localStorage.setItem('moosik_master_db', JSON.stringify(masterDB));
                renderFavorites();
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
