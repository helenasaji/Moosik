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
if (savedUser) {
    loginUser(savedUser);
}

enterAppBtn.addEventListener('click', () => {
    const nameTyped = userNameInput.value.trim();
    if (nameTyped) {
        localStorage.setItem('moosik_active_user', nameTyped);
        loginUser(nameTyped);
    }
});

switchUserBtn.addEventListener('click', () => {
    localStorage.removeItem('moosik_active_user');
    currentUser = "";
    audioPlayer.pause();
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

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    resultsList.innerHTML = "<p>Searching Audius...</p>";

    try {
        const hostRes = await fetch('https://api.audius.co');
        const hosts = await hostRes.json();
        const host = hosts.data[0]; 

        const res = await fetch(`${host}/v1/tracks/search?query=${query}&app_name=Moosik`);
        const data = await res.json();

        resultsList.innerHTML = "";

        if (data.data && data.data.length > 0) {
            data.data.slice(0, 5).forEach(track => {
                const artwork = track.artwork && track.artwork['150x150'] ? track.artwork['150x150'] : 'https://via.placeholder.com/150/222/FFF?text=Moosik';
                const streamUrl = `${host}/v1/tracks/${track.id}/stream?app_name=Moosik`;

                const trackDiv = document.createElement('div');
                trackDiv.className = 'track-item';
                trackDiv.innerHTML = `
                    <img src="${artwork}" alt="Cover" class="list-art">
                    <div class="track-info" style="flex: 1;">
                        <strong>${track.title}</strong>
                        <span>${track.user.name}</span>
                    </div>
                    <button class="save-btn" style="padding: 5px 10px; font-size: 0.8rem; background: rgba(45, 172, 252, 0.3); border: none; color: white; border-radius: 5px; cursor: pointer;">Save</button>
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
            resultsList.innerHTML = "<p>No tracks found.</p>";
        }
    } catch (error) {
        resultsList.innerHTML = "<p>Error loading music.</p>";
    }
});

function playSong(url) {
    audioPlayer.src = url;
    audioPlayer.play();
}

function getUserFavorites() {
    const masterDB = JSON.parse(localStorage.getItem('moosik_master_db')) || {};
    return masterDB[currentUser] || [];
}

function saveFavorite(songData) {
    const masterDB = JSON.parse(localStorage.getItem('moosik_master_db')) || {};
    
    if (!masterDB[currentUser]) {
        masterDB[currentUser] = [];
    }
    
    const userFavorites = masterDB[currentUser];
    const isAlreadySaved = userFavorites.some(fav => fav.id === songData.id);
    
    if (!isAlreadySaved) {
        userFavorites.push(songData);
        localStorage.setItem('moosik_master_db', JSON.stringify(masterDB));
        renderFavorites();
    }
}

function renderFavorites() {
    favoritesList.innerHTML = "";
    const userFavorites = getUserFavorites();
    
    if (userFavorites.length === 0) {
        favoritesList.innerHTML = `<p style='font-size: 0.85rem; color: #888;'>No favorites found for ${currentUser}.</p>`;
        return;
    }

    userFavorites.forEach((fav, index) => {
        const favDiv = document.createElement('div');
        favDiv.className = 'track-item';
        favDiv.innerHTML = `
            <img src="${fav.artwork}" alt="Cover" class="list-art">
            <div class="track-info" style="flex: 1;">
                <strong>${fav.title}</strong>
                <span>${fav.artist}</span>
            </div>
            <button class="remove-btn" style="padding: 5px 10px; font-size: 0.8rem; background: rgba(255,50,50,0.2); border: none; color: white; border-radius: 5px; cursor: pointer;">X</button>
        `;
        
        favDiv.querySelector('.list-art').addEventListener('click', () => playSong(fav.streamUrl));
        favDiv.querySelector('.track-info').addEventListener('click', () => playSong(fav.streamUrl));
        
        favDiv.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const masterDB = JSON.parse(localStorage.getItem('moosik_master_db'));
            masterDB[currentUser].splice(index, 1);
            localStorage.setItem('moosik_master_db', JSON.stringify(masterDB));
            renderFavorites();
        });

        favoritesList.appendChild(favDiv);
    });
}
