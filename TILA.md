# TILA — projektin triage

Viimeisin ajo: 2026-07-02 (aamu-triage, read-only)

## 🔴 Kriittiset (rikki nyt)
_CI punaisella, tuotanto rikki, testit kaatuu. Vaatii huomiota heti._

- (ei mitään) — CI vihreä, 72 backend-testiä läpi, frontend build onnistuu, tuotanto pystyssä.

## 🟡 Korjattavat (pitäisi hoitaa pian)
_Bugit, epäonnistuneet testit, auki olevat issuet joilla on merkitystä._

- ~~Lint kaatuu 3 virheeseen~~ **KORJATTU 2026-07-02**: eriytettiin `usePortfolio.ts` (hook + context) omaan tiedostoon → react-refresh vihreä; `DEFAULT_PORTFOLIO` ei enää exportattu; `Scenarios.tsx` setState-in-effect dokumentoitu kohdennetulla disablella. Lint exit 0, build + 72 testiä läpi. JÄLKI: CI ei edelleenkään aja lintiä — harkitse `npm run lint` lisäämistä `ci.yml`:ään ettei velka pääse taas kertymään huomaamatta.

## 🔵 Seurattavat (ei kiire)
_Teknistä velkaa, epäselvyyksiä, "pitäisi joskus katsoa"._

- **CI Python 3.11 vs. lokaali 3.13** — MISSÄ: `.github/workflows/ci.yml:15`. MIKSI: versioero voi peittää bugin joka näkyy vain toisessa. EHDOTUS: yhtenäistä CI:n Python-versio lokaaliin (3.13) tai päinvastoin.
- **Frontend JS-bundle 665 kB (> 500 kB varoitus)** — MISSÄ: `frontend` build. MIKSI: iso bundle hidastaa ensilatausta; portfolio-projektissa suorituskyky on osa vaikutelmaa. EHDOTUS: harkitse `import()`-koodinjakoa (esim. Recharts/näkymät laiskasti).
- **Testien StarletteDeprecationWarning (httpx)** — MISSÄ: pytest-ajo. MIKSI: tuleva rikkova muutos riippuvuudessa. EHDOTUS: seuraa; päivitä kun `httpx2`-migraatio on ajankohtainen.
- **v2-branch on täysin mergattu mainiin (0 committia edellä)** — MISSÄ: `git branch`. MIKSI: turha haara joka voi hämmentää. EHDOTUS: poista `v2` (lokaali + origin) kun varmistat ettei sitä enää tarvita.
- **`linkedin-postaus-v2.md` untracked repon juuressa** — MISSÄ: repon juuri. MIKSI: portfolio-/markkinointimateriaalia, ei koodia; roikkuu committamatta. EHDOTUS: päätä — .gitignoreen, committaa `docs/`:iin, tai siirrä pois reposta. Liittyy avoimeen LinkedIn-postaus-tehtävään.

## ✅ Ei toimenpiteitä tällä kierroksella
_Agentti kirjaa tähän jos mitään huomionarvoista ei löytynyt._

- Avoimia issueita: 0. Avoimia PR:iä: 0. Viimeisin commit 2026-06-12 (~3 vk hiljaista), ei regressioita sen jälkeen.

---

## Ajohistoria (uusin ylimpänä)
_Agentti lisää yhden rivin per ajo: päivämäärä + yhteenveto._

- 2026-07-02 — Korjattu lint-löydös: react-refresh eriytetty (`usePortfolio.ts`), setState-in-effect dokumentoitu. Lint exit 0, build + 72 testiä läpi.
- 2026-07-02 — Ensimmäinen triage: ei kriittisiä. CI vihreä, 72 testiä läpi. 1 korjattava (lint kaatuu, CI ei lintaa), 5 seurattavaa (Python-versioero, iso bundle, deprecation, stale v2-branch, untracked LinkedIn-md).
