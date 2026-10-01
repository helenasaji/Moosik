const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const coverImage = document.getElementById('coverImage');
const titleText = document.getElementById('titleText');
const artistText = document.getElementById('artistText');
const audioPlayer = document.getElementById('audioPlayer');

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    titleText.textContent = "Searching Audius...";
    artistText.textContent = "";

    try {
        // 1. Connect to a public Audius server (no account needed)
        const hostRes = await fetch('https://api.audius.co');
        const hosts = await hostRes.json();
        const host = hosts.data[0]; 

        // 2. Search for the track using the Moosik app name
        const res = await fetch(`${host}/v1/tracks/search?query=${query}&app_name=Moosik`);
        const data = await res.json();

        if (data.data && data.data.length > 0) {
            const track = data.data[0];
            
            // 3. Update the UI
            titleText.textContent = track.title;
            artistText.textContent = track.user.name;
            
            if (track.artwork && track.artwork['480x480']) {
                coverImage.src = track.artwork['480x480'];
            } else {
                coverImage.src = "https://via.placeholder.com/180/222222/FFFFFF?text=Moosik";
            }
            
            // 4. Play the music
            audioPlayer.src = `${host}/v1/tracks/${track.id}/stream?app_name=Moosik`;
            audioPlayer.play();
        } else {
            titleText.textContent = "No tracks found.";
            coverImage.src = "https://via.placeholder.com/180/222222/FFFFFF?text=Moosik";
        }
    } catch (error) {
        titleText.textContent = "Error loading music.";
        console.error(error);
    }
});
