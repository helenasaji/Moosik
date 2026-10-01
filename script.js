const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const coverImage = document.getElementById('coverImage');
const titleText = document.getElementById('titleText');
const artistText = document.getElementById('artistText');
const audioPlayer = document.getElementById('audioPlayer');

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    // Update UI to show loading state
    titleText.textContent = "Searching Audius...";
    artistText.textContent = "";

    try {
        // 1. Audius is decentralized, so we first ask for a healthy server node
        const hostRes = await fetch('https://api.audius.co');
        const hosts = await hostRes.json();
        const host = hosts.data[0]; // Pick the first available server

        // 2. Search for the track using the query (app_name is required by Audius, but it can be anything)
        const res = await fetch(`${host}/v1/tracks/search?query=${query}&app_name=Moosik`);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            const track = data.data[0];
            
            // 3. Update the UI with the track details
            titleText.textContent = track.title;
            artistText.textContent = track.user.name;
            
            // Check if artwork exists, otherwise use a placeholder
            if (track.artwork && track.artwork['480x480']) {
                coverImage.src = track.artwork['480x480'];
            } else {
                coverImage.src = "https://via.placeholder.com/180/222222/FFFFFF?text=Moosik";
            }
            
            // 4. Load the audio stream directly from the node and play it
            audioPlayer.src = `${host}/v1/tracks/${track.id}/stream?app_name=Moosik`;
            audioPlayer.play();
        } else {
            titleText.textContent = "No tracks found.";
            coverImage.src = "https://via.placeholder.com/180/222222/FFFFFF?text=Moosik";
        }
    } catch (error) {
        titleText.textContent = "Error loading music.";
        console.error("Audius API Error:", error);
    }
});
