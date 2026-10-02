# terramelos engine

A day, in sound. A small, dependency-free sound engine that turns earthquake records into 60 seconds of stereo Float32 PCM at 24,000 Hz. No network, DOM, Web Audio context, presets, or random numbers are required to render audio.

## Use

```sh
npm install
npm test
```

```js
import { renderDay } from './dist/index.js';
const audio = renderDay({
  date: '2024-05-10',
  quakes: [{ time: Date.parse('2024-05-10T06:00:00Z'),
    mag: 4.7, depth: 35, lat: -15, lon: 167, place: 'Vanuatu' }]
});
// audio.left and audio.right: Float32Array(1_440_000)
// audio.sampleRate: 24000; audio.duration: 60
```

Input must describe one UTC day using a valid YYYY-MM-DD date, finite numeric fields, chronological records, and magnitudes of at least 2.5. `time` is a Unix timestamp in milliseconds, `depth` is in kilometers, and coordinates are in degrees. Input validation, USGS retrieval, and playback belong to the caller. Keep the array order stable: ties use the first record. Events outside the UTC day do not trigger sounds but still contribute to key and mode selection; filter them before calling.

`compose` exposes the original `{L, R, rate, events}` result. `dayKey`, `coordinateChord`, and `playbackEvents` expose the mappings for inspection. `renderDay` returns only the PCM channels and timing metadata.

## Mapping and intent

- The strongest earthquake's longitude selects one of 12 roots in circle-of-fifths order, in 30-degree sectors. Neighboring sectors select related keys.
- Mean depth selects Dorian below 35 km, Aeolian below 70 km, and Phrygian at 70 km or deeper. Depth progressively darkens the harmony.
- Latitude selects I–VII for a four-voice seventh-chord pad. Each 4-second window uses its strongest earthquake's coordinates, starting at the first event in the window. Empty windows add no pad. Pad volume is fixed.
- Longitude shapes pad harmonics and stereo position. Stereo echoes sustain the atmosphere.
- Every earthquake triggers a kick at its unquantized recorded time. Magnitude sets amplitude, depth sets duration, and longitude selects I, II, III, V, or VII. Absolute-value pitch mapping is east–west symmetric except at JavaScript rounding boundaries; panning retains the longitude sign.
- The stereo mix is normalized with a limited boost, then receives a 0.4-second fade-in and a 2-second fade-out.

Presets and suggested dates were removed so the instrument does not recommend or rank days associated with real loss. The same mapping applies to every day. Determinism keeps the musical decisions traceable to records, rather than hidden randomness.

## Determinism tests

Tests hash both channels using SHA-256 over a canonical little-endian representation of every Float32 sample. Rendering independent copies of the same fixture must produce identical hashes. Tests also verify non-silent finite output, exact duration, empty-day silence, sensitivity to input changes, and key/mode boundaries.

This guarantees repeatability for identical ordered input in the same JavaScript runtime. USGS revisions can change the input. JavaScript transcendental functions may differ slightly across engines, so cross-runtime bit-identical hashes are not promised.

## Specification and ownership

[Full liner notes](https://terramelos.hirotadaiwane.chatgpt.site/liner-notes) describe the sound specification. The site currently requires owner access; the mapping above remains available independently.

Engine source: MIT, see LICENSE. The terramelos website, layout, colors, logo, assets, and seismograph UI are not included in this repository and are not covered by this license. All rights reserved for the website.

Concept and sound design: Hirotada Iwane. Earthquake data source: USGS ComCat (not bundled). Built with ChatGPT Sites / Codex. This repository contains the engine only and does not publish the website or an npm package.
