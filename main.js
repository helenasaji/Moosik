import './style.css';

// 1. Update the UI to include a Favorites section
document.querySelector('#app').innerHTML = `
  <div class="glass-panel">
    <h1>Moosik Pro</h1>
    <div class="search-container">
        <input type="text" id="searchInput" placeholder="Search any song...">
        <button id="searchBtn">Find</button>
    </div>
    
    <audio id="audioPlayer" controls></audio>
    
    <div id="resultsList" class="results-container"></div>
    
    <div class="favorites-section">
        <h2 style="font-size: 1.2rem; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">❤️️ My Favorites</h2>
        <div id="favoritesList" class="results-container"></div>
    </div>
  </div>
`;

const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const favoritesList = document.getElementById('favoritesList');
const audioPlayer = document.getElementById('audioPlayer');

// 2. Load saved favorites from local storage when the app opens
let favorites = JSON.parse(localStorage.getItem('moosik_favorites')) || [];
renderFavorites();

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    resultsList.innerHTML = "<p>Searching...</p>";

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
                    <button class="save-btn" style="padding: 5px 10px; font-size: 0.8rem;">Save</button>
                `;
                
                // Click the image or text to play
                trackDiv.querySelector('.list-art').addEventListener('click', () => playSong(streamUrl));
                trackDiv.querySelector('.track-info').addEventListener('click', () => playSong(streamUrl));

                // Click the save button to add to favorites
                trackDiv.querySelector('.save-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevents the song from playing when you just want to save it
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

// 3. Logic to save the song permanently
function saveFavorite(songData) {
    // Check if the song is already in the list
    const isAlreadySaved = favorites.some(fav => fav.id === songData.id);
    
    if (!isAlreadySaved) {
        favorites.push(songData);
        // Save to browser memory
        localStorage.setItem('moosik_favorites', JSON.stringify(favorites));
        renderFavorites();
    }
}

// 4. Logic to display the saved songs
function renderFavorites() {
    favoritesList.innerHTML = "";
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = "<p style='font-size: 0.85rem; color: #888;'>No favorites yet. Search and save some!</p>";
        return;
    }

    favorites.forEach((fav, index) => {
        const favDiv = document.createElement('div');
        favDiv.className = 'track-item';
        favDiv.innerHTML = `
            <img src="${fav.artwork}" alt="Cover" class="list-art">
            <div class="track-info" style="flex: 1;">
                <strong>${fav.title}</strong>
                <span>${fav.artist}</span>
            </div>
            <button class="remove-btn" style="padding: 5px 10px; font-size: 0.8rem; background: rgba(255,50,50,0.2);">X</button>
        `;
        
        favDiv.querySelector('.list-art').addEventListener('click', () => playSong(fav.streamUrl));
        favDiv.querySelector('.track-info').addEventListener('click', () => playSong(fav.streamUrl));
        
        // Remove from favorites
        favDiv.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            favorites.splice(index, 1);
            localStorage.setItem('moosik_favorites', JSON.stringify(favorites));
            renderFavorites();
        });

        favoritesList.appendChild(favDiv);
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
