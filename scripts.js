document.addEventListener('DOMContentLoaded', function() {
    const tracks = document.querySelectorAll('.track');
    const audioPlayer = document.getElementById('main-audio');
    const audioSource = document.getElementById('audio-source');
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackArtist = document.getElementById('current-track-artist');
    const currentAlbumCover = document.getElementById('current-album-cover');

    const updateTrackDetails = (track) => {
        const src = track.getAttribute('data-src');
        const title = track.getAttribute('data-title');
        const artist = track.getAttribute('data-artist');
        const cover = track.getAttribute('data-cover');

        audioSource.src = src;
        audioPlayer.load();
        audioPlayer.play();

        currentTrackTitle.textContent = title;
        currentTrackArtist.textContent = artist;
        currentAlbumCover.src = cover;

        tracks.forEach(t => t.classList.remove('active'));
        track.classList.add('active');
    };

    const initialTrack = document.querySelector('.track.active');
    if (initialTrack) {
        updateTrackDetails(initialTrack);
    }

    tracks.forEach(track => {
        track.addEventListener('click', function() {
            updateTrackDetails(this);
        });

        track.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                updateTrackDetails(this);
            }
        });
    });

    tracks.forEach(track => track.setAttribute('tabindex', '0'));
});
