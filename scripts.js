document.addEventListener('DOMContentLoaded', function() {
    const allSections = document.querySelectorAll('.content');
    let currentAudioPlayer = null;

    allSections.forEach(section => {
        const tracks = section.querySelectorAll('.track');
        const audioPlayer = section.querySelector('audio');
        const audioSource = section.querySelector('audio source');
        const currentTrackTitle = section.querySelector('.track-title-large');
        const currentTrackArtist = section.querySelector('.track-artist-large');
        const currentAlbumCover = section.querySelector('.album-cover-large');

        // Function to update the currently playing track details
        const updateTrackDetails = (track) => {
            const src = track.getAttribute('data-src');
            const title = track.getAttribute('data-title');
            const artist = track.getAttribute('data-artist');
            const cover = track.getAttribute('data-cover');

            audioSource.src = src;
            audioPlayer.load();

            // Pause current audio player if there's any
            if (currentAudioPlayer && currentAudioPlayer !== audioPlayer) {
                currentAudioPlayer.pause();
            }

            // Set current audio player and play the track
            currentAudioPlayer = audioPlayer;
            audioPlayer.play();

            currentTrackTitle.textContent = title;
            currentTrackArtist.textContent = artist;
            currentAlbumCover.src = cover;

            tracks.forEach(t => t.classList.remove('active'));
            track.classList.add('active');
        };

        // Initial track setup (but do not play)
        const initialTrack = section.querySelector('.track.active');
        if (initialTrack) {
            updateTrackDetails(initialTrack);
            audioPlayer.pause(); // Ensure it does not play on load
        }

        tracks.forEach(track => {
            track.addEventListener('click', function() {
                updateTrackDetails(this);
            });
        });
    });
});
