export default async function handler(req, res) {
    const query = req.query.q || "Malayalam hits";
    const apiKey = process.env.YOUTUBE_API_KEY;

    // Fallback mock items if API key isn't set yet, so your app never breaks
    const fallbackResults = {
        items: [
            {
                id: { videoId: "kJQP7kiw5Fk" },
                snippet: { title: "Thumbi Penne (Sample Track)", channelTitle: "Malayalam Melodies", thumbnails: { medium: { url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=80" } } }
            },
            {
                id: { videoId: "5qap5aO4i9A" },
                snippet: { title: "Acoustic Chill Vibes", channelTitle: "Vlog Music", thumbnails: { medium: { url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80" } } }
            },
            {
                id: { videoId: "jfKfPfyJRdk" },
                snippet: { title: "Kerala Monsoons Lo-Fi", channelTitle: "God's Own Country", thumbnails: { medium: { url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=80" } } }
            }
        ]
    };

    if (!apiKey) {
        return res.status(200).json(fallbackResults);
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            return res.status(200).json(fallbackResults);
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(200).json(fallbackResults);
    }
}
