# Kassapanka Beat

Metronomo visivo + setlist per il batterista dei Kassapanka. Ispirato a Ironbeat.

- **Carica PDF**: legge la scaletta (una riga per canzone) ed estrae titolo, BPM e tempo (es. `7/4`).
  Prima dell'import mostra una schermata di revisione per correggere/escludere le righe.
  Formati riconosciuti, per esempio: `1. Titolo - 140 bpm`, `Titolo 140`, `Titolo | 3:45 | 120`.
  Serve un PDF con testo selezionabile (le scansioni non vengono lette).
- BPM e tempo modificabili a mano, tap tempo, click audio opzionale (di default spento).
- Schermo sempre acceso mentre suona; funziona offline una volta installata (PWA).
- La setlist è salvata nel browser del dispositivo.

## Sviluppo

```sh
npm install
npm run dev     # sviluppo
npm test        # test del parser della scaletta
npm run build   # build in dist/
```

Il deploy su GitHub Pages parte da solo a ogni push su `main` (`.github/workflows/deploy.yml`).
