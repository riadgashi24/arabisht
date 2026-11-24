# Mëso Arabisht

Platformë falas për të mësuar arabisht nga shqipja, sipas rrugës së librit **«العربية بين يديك»**: një njësi në javë, një mësim në ditë (15–20 min).

- **Llogari me emër dhe fjalëkalim.** Progresi ruhet në server dhe sinkronizohet vetë në çdo pajisje. Pa email, pa kode, pa skedarë JSON. Kush nuk do llogari mund të vazhdojë pa të (progresi mbetet në pajisje dhe kalon në llogari kur ta krijojë).
- **Motivim:** seri ditësh me flakë, ngrirje që e mbrojnë serinë (fitohet një çdo 7 ditë, maksimumi 2), XP, qëllim ditor, 13 medalje, kalendar dhe grafik javor.
- **5 tema:** Oaza, Shkretëtira, Trëndafili, Smeraldi, Mesnata, plus Automatike (sipas telefonit).
- **UI:** panel përgjigjeje që del nga poshtë, tinguj (të sintetizuar, pa skedarë), dridhje në telefon, konfeti, karta përsëritjeje që kthehen, seri përgjigjesh të sakta (combo), shirit navigimi poshtë në telefon.
- 6 njësi × 7 ditë: fjalor, dialogu 1, gramatika, fjalor + dialogu 2, përsëritje e përzier, fol dhe ndërto, testi i javës (80% për ta kaluar).
- Përsëritje me intervale (1, 2, 4, 7, 15, 30, 60 ditë), zë arabisht në pajisje, fjalor me kërkim.
- PWA: instalohet në telefon dhe punon pa internet (sinkronizohet kur kthehet lidhja).

> Dialogët dhe ushtrimet janë shkruar posaçërisht për këtë platformë sipas temave të librit. Nuk janë kopje e tekstit të librit, i cili ka të drejta autori.

## Publikimi në Vercel (falas)

1. Ngarkoje repon në GitHub dhe importoje te vercel.com (**Add New… → Project**, Framework Preset: **Other**, pa Build Command).
2. **Lidhe databazën (një herë):** te projekti në Vercel → **Storage → Create Database → Upstash for Redis** (plani falas) → **Connect** me projektin. Vercel i shton vetë variablat `KV_REST_API_URL` dhe `KV_REST_API_TOKEN` (pranohen edhe `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
3. **Redeploy.** Gati: `/api/auth` dhe `/api/progress` punojnë.

Pa hapin 2, aplikacioni hapet, por krijimi i llogarisë kthen mesazhin “Ruajtja në server nuk është lidhur ende”. Mënyra pa llogari punon gjithsesi.

## Provë lokale
```bash
node dev-server.js        # http://localhost:8000  (Node 18+)
```
Shërben faqen dhe API-në. Llogaritë ruhen te `.data/db.json` (vetëm për provë, nuk publikohet). XAMPP/Apache nuk e ekzekuton API-në (është Node), prandaj përdor këtë server ose `vercel dev`.

## Si funksionon llogaria
- Fjalëkalimet ruhen me `scrypt` + kripë. Seancat janë token të rastësishëm (në server ruhet vetëm hash-i), që skadojnë pas 180 ditësh.
- Kufizime: 10 përpjekje hyrjeje për 15 min për çdo emër, 20 llogari në orë për çdo IP.
- Kur dy pajisje kanë progres, ai **bashkohet** (mësimet, fjalët, XP, medaljet), nuk mbishkruhet. Cilësimet merren nga pajisja e ndryshuar së fundi.
- Te Profili: ndrysho fjalëkalimin, fshi llogarinë, fillo nga e para.

## Shtimi i njësive të reja
Gjithë përmbajtja është te `assets/data.js`. Çdo njësi është një objekt:

| Fusha | Çka përmban |
|---|---|
| `n, ar, sq` | numri, titulli arabisht, titulli shqip |
| `A`, `B` | fjalori i ditës 1 dhe i ditës 4: `['arabisht me harakat','shqip','transliterim']` |
| `D1`, `D2` | dialogët: `t` titulli, `l` rreshtat `[folësi, arabisht, shqip]`, `q` pyetjet |
| `G` | gramatika: `t` titulli, `h` shpjegimi (HTML), `ex` ushtrimet |
| `build` | fjali për t'u ndërtuar: `['shqip', ['fjala1','fjala2',…]]` |
| `say` | ushtrime të foluri: `['detyra shqip','përgjigjja arabisht']` |

Te pyetjet `{p:'pyetja', o:[…], ar:1}` **opsioni i parë është gjithmonë i sakti** (radha përzihet vetë). `ar:1` do të thotë që opsionet janë arabisht.

Pasi shton përmbajtje, ndrysho `VERSION` te `sw.js` (p.sh. `arabisht-v3`), që telefonat ta marrin versionin e ri.

## Struktura
```
index.html            faqja
assets/style.css      stilet dhe 5 temat
assets/app.js         logjika: llogaria, mësimet, seria, XP, përsëritja, fjalori, progresi
assets/data.js        përmbajtja e njësive
api/auth.js           regjistrimi, hyrja, dalja, fjalëkalimi, fshirja
api/progress.js       leximi / ruajtja e progresit (me bashkim)
api/_lib.js           ruajtja (Upstash Redis ose skedar lokal), fjalëkalimet, seancat
dev-server.js         server për provë lokale
sw.js                 puna pa internet
manifest.webmanifest  instalimi si aplikacion
```

## Kufizime
- Nëse harrohet fjalëkalimi, nuk ka rikthim me email (nuk ka email). Mund të shtohet më vonë.
- Zëri vjen nga pajisja (Web Speech API). Nëse nuk ka zë arabisht, shtoje te cilësimet e gjuhës në telefon ose përdor Chrome.
