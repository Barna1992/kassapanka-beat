# Kassapanka Beat

Metronomo visivo + setlist per il batterista dei Kassapanka. Ispirato a Ironbeat.

- **Carica PDF**: legge la scaletta ed estrae le canzoni. Se le righe sono numerate
  (`1. Titolo – Artista`) prende solo quelle, saltando nome del gruppo e data.
  Se nel PDF ci sono i BPM li usa (`Titolo – 140 bpm`, `Titolo – 140`, `Titolo | 3:45 | 120`).
  Prima dell'import mostra una schermata di revisione per correggere/escludere le righe.
  Serve un PDF con testo selezionabile (le scansioni non vengono lette).
- **Memoria BPM**: quando il batterista cambia BPM o tempo di un brano, l'app se lo ricorda
  per titolo e lo riapplica alle scalette successive. Priorità: PDF → ricordato → 120 (da impostare).
- BPM e tempo modificabili a mano, tap tempo, click audio opzionale (di default spento).
- Schermo sempre acceso mentre suona; funziona offline una volta installata (PWA).
- Setlist e memoria BPM sono salvate nel browser del dispositivo.

## Sviluppo

```sh
npm install
npm run dev     # sviluppo
npm test        # test del parser della scaletta
npm run build   # build in dist/
```

Il deploy su GitHub Pages parte da solo a ogni push su `main` (`.github/workflows/deploy.yml`).
