import './style.css';

document.querySelector('#app').innerHTML = `
  <div class="glass-panel">
    <h1>Moosik Pro</h1>
    <div class="search-container">
        <input type="text" id="searchInput" placeholder="Search any song...">
        <button id="searchBtn">Find</button>
    </div>
    <audio id="audioPlayer" controls></audio>
    <div id="resultsList" class="results-container"></div>
  </div>
`;

const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const audioPlayer = document.getElementById('audioPlayer');

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
                    <div class="track-info">
                        <strong>${track.title}</strong>
                        <span>${track.user.name}</span>
                    </div>
                `;
                
                trackDiv.addEventListener('click', () => {
                    audioPlayer.src = streamUrl;
                    audioPlayer.play();
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

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
