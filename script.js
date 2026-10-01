// Replace with your Jamendo Client ID from developer.jamendo.com
const CLIENT_ID = 'YOUR_JAMENDO_CLIENT_ID'; 

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
    titleText.textContent = "Searching...";
    artistText.textContent = "";

    try {
        // Fetch 1 random track based on the genre/tag searched
        const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=1&tags=${query}`);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const track = data.results[0];
            
            // Update the UI with the track details
            titleText.textContent = track.name;
            artistText.textContent = track.artist_name;
            coverImage.src = track.image;
            
            // Load the audio and play it automatically
            audioPlayer.src = track.audio;
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
