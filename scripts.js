document.addEventListener('DOMContentLoaded', function() {
    const section = {
        id: 'hybrid-creations',
        waveformId: 'waveform-hybrid'
    };

    let currentWaveSurfer = null;
    let currentSectionElement = null;

    const initializeWaveSurfer = (container) => {
        return WaveSurfer.create({
            container: container,
            waveColor: 'rgb(120, 120, 120)', // Grey
            progressColor: 'rgb(200, 200, 200)', // White
            barWidth: 2,
            barGap: 3,
            barRadius: 2,
            height: 100 // Height of the waveform
        });
    };

    const updateTrackDetails = (waveSurfer, track, sectionElement) => {
        const src = track.getAttribute('data-src');
        const title = track.getAttribute('data-title');
        const currentTrackTitle = sectionElement.querySelector('.track-title-large');

        if (currentWaveSurfer && currentWaveSurfer !== waveSurfer) {
            currentWaveSurfer.pause();
        }

        waveSurfer.load(src);

        currentWaveSurfer = waveSurfer;
        currentSectionElement = sectionElement;
        currentTrackTitle.textContent = title;

        const tracks = sectionElement.querySelectorAll('.track');
        tracks.forEach(t => t.classList.remove('active'));
        track.classList.add('active');
    };

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

    // Play/pause button functionality
    const playPauseBtn = document.getElementById('play-pause-btn');
    playPauseBtn.addEventListener('click', function() {
        if (currentWaveSurfer) {
            if (currentWaveSurfer.isPlaying()) {
                currentWaveSurfer.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            } else {
                currentWaveSurfer.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
        }
    });

    // Handle space bar for play/pause for the current WaveSurfer instance
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && currentWaveSurfer) {
            e.preventDefault();
            if (currentWaveSurfer.isPlaying()) {
                currentWaveSurfer.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            } else {
                currentWaveSurfer.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
        }
    });
});
