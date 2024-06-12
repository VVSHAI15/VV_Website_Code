document.addEventListener('DOMContentLoaded', () => {
    const audioElement = document.getElementById('main-audio');
    const audioSource = document.getElementById('audio-source');
    const tracks = document.querySelectorAll('.track');

    tracks.forEach(track => {
        track.addEventListener('click', () => {
            const trackSrc = track.getAttribute('data-src');
            audioSource.src = trackSrc;
            audioElement.load();
            audioElement.play();

            // Update UI to show the active track (optional)
            tracks.forEach(t => t.classList.remove('active'));
            track.classList.add('active');
        });
    });
});
