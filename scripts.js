document.addEventListener('DOMContentLoaded', function() {
    const sections = [
        { id: 'hybrid-creations', waveformId: 'waveform-hybrid' },
        { id: 'one-more-time', waveformId: 'waveform-one-more-time' },
        { id: 'electronic-soundscapes', waveformId: 'waveform-electronic-soundscapes' },
        { id: 'the-velvet-rose', waveformId: 'waveform-velvet-rose' },
        { id: 'wildman', waveformId: 'waveform-wildman' }
    ];

    let currentWaveSurfer = null;
    let currentSectionElement = null;

    const initializeWaveSurfer = (container) => {
        return WaveSurfer.create({
            container: container,
            waveColor: 'rgb(120, 120, 120)', // Grey
            progressColor: 'rgb(200, 200, 200)', //White
            barWidth: 2,
            barGap: 3,
            barRadius: 2,
            height: 100, // Height of the waveform
        });
    };

    const updateTrackDetails = (waveSurfer, track, sectionElement) => {
        const src = track.getAttribute('data-src');
        const title = track.getAttribute('data-title');
        const artist = track.getAttribute('data-artist');
        const cover = track.getAttribute('data-cover');
        const currentTrackTitle = sectionElement.querySelector('.track-title-large');
        const currentTrackArtist = sectionElement.querySelector('.track-artist-large');
        const currentAlbumCover = sectionElement.querySelector('.album-cover-large');

        if (currentWaveSurfer && currentWaveSurfer !== waveSurfer) {
            currentWaveSurfer.pause();
        }

        waveSurfer.load(src);

        currentWaveSurfer = waveSurfer;
        currentSectionElement = sectionElement;
        currentTrackTitle.textContent = title;
        currentTrackArtist.textContent = artist;
        currentAlbumCover.src = cover;

        const tracks = sectionElement.querySelectorAll('.track');
        tracks.forEach(t => t.classList.remove('active'));
        track.classList.add('active');
    };

    sections.forEach(section => {
        const sectionElement = document.getElementById(section.id);
        const waveformContainer = sectionElement.querySelector(`#${section.waveformId}`);
        const waveSurfer = initializeWaveSurfer(waveformContainer);

        const initialTrack = sectionElement.querySelector('.track');
        if (initialTrack) {
            updateTrackDetails(waveSurfer, initialTrack, sectionElement);
        }

        const tracks = sectionElement.querySelectorAll('.track');
        tracks.forEach(track => {
            track.addEventListener('click', function() {
                updateTrackDetails(waveSurfer, this, sectionElement);
            });
        });

        // Prevent music from stopping when clicking on the waveform
        waveformContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Handle seeking within the waveform
        waveSurfer.on('seek', () => {
            waveSurfer.play();
        });
    });

    // Handle space bar for play/pause for the current WaveSurfer instance
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && currentWaveSurfer) {
            e.preventDefault();
            if (currentWaveSurfer.isPlaying()) {
                currentWaveSurfer.pause();
            } else {
                currentWaveSurfer.play();
            }
        }
    });
});
