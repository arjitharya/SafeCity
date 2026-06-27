# SafeCity 🛡️

A location-aware **citizen-safety app** for Japan. SafeCity keeps a resident safe in an
emergency, then doubles as a lightweight civic toolkit for everyday city life.

Built with **React 19 + Vite + Tailwind + framer-motion + Leaflet**. Everything runs in the
browser — location, AI and audio stay on-device.

## Safety (primary)

- **Panic alarm** — full-screen flashing siren synthesised with the Web Audio API (+ haptics) to attract attention when you're in danger.
- **One-tap emergency calls** — 110 / 119 / 118 and disaster voicemail (171).
- **Share my live location** — sends an SOS map pin to your saved emergency contacts via the native share sheet, SMS, or clipboard.
- **Nearby help map** — interactive OpenStreetMap (Leaflet) plotting the nearest hospitals, police, fire stations, pharmacies and evacuation shelters via the free Overpass API.
- **Earthquakes** — live USGS feed of recent quakes near you, with magnitude, depth, distance and tsunami flags.
- **Alerts & news** — disaster/safety headlines first, location-aware (Google News RSS).
- **Be prepared** — action guides (quake, tsunami, fire, typhoon, first-aid/CPR) and an emergency-kit checklist.
- **Emergency contacts (ICE)** — stored locally, one-tap dial.

## City services (secondary)

The original civic tools live under a secondary section: waste-collection schedule & sorting,
air quality & weather, municipal issue reporting, transport, energy grid, and an on-device
AI assistant (local Ollama).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

## Data sources

Open-Meteo (weather & air quality), Nominatim (reverse geocoding), Overpass / OpenStreetMap
(nearby places + map tiles), USGS (earthquakes), Google News RSS (headlines), and a local
Ollama bridge for the AI assistant. No API keys required.
