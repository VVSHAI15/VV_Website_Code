#!/usr/bin/env python3
"""
Generate waveform peak data for the reel.

Reads every track in data/tracks.json, decodes it with ffmpeg to raw PCM,
downsamples to a fixed number of amplitude peaks, and writes data/peaks.json
keyed by the track's `src`. The site draws waveforms from this JSON instantly —
no in-browser audio decode required.

Re-run this whenever you add or replace a track:
    python3 scripts/gen_peaks.py

Requires: ffmpeg on PATH.
"""

import json
import os
import struct
import subprocess
import sys

PEAKS = 240          # bars per waveform
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def track_peaks(path):
    """Decode `path` to mono 16-bit PCM and reduce to PEAKS normalized values."""
    proc = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-i", path,
         "-ac", "1", "-filter:a", "aresample=8000", "-f", "s16le", "-"],
        capture_output=True,
    )
    raw = proc.stdout
    count = len(raw) // 2
    if count == 0:
        return None
    samples = struct.unpack("<%dh" % count, raw[:count * 2])

    bucket = max(1, count // PEAKS)
    out = []
    for i in range(PEAKS):
        start = i * bucket
        chunk = samples[start:start + bucket]
        peak = max((abs(s) for s in chunk), default=0)
        out.append(peak)

    hi = max(out) or 1
    return [round(p / hi, 3) for p in out]


def main():
    with open(os.path.join(ROOT, "data", "tracks.json")) as f:
        tracks = json.load(f)

    peaks = {}
    for t in tracks:
        src = t["src"]
        full = os.path.join(ROOT, src)
        if not os.path.exists(full):
            print("  ! missing: %s" % src, file=sys.stderr)
            continue
        data = track_peaks(full)
        if data is None:
            print("  ! no audio: %s" % src, file=sys.stderr)
            continue
        peaks[src] = data
        print("  ok  %-32s %d peaks" % (t.get("title", src), len(data)))

    out_path = os.path.join(ROOT, "data", "peaks.json")
    with open(out_path, "w") as f:
        json.dump(peaks, f, separators=(",", ":"))
    print("\nwrote %s (%d tracks)" % (out_path, len(peaks)))


if __name__ == "__main__":
    main()
