# Mëso Arabisht

Platformë falas për të mësuar arabisht nga shqipja, sipas rrugës së librit **«العربية بين يديك»**: një njësi në javë, një mësim në ditë (15–20 min).

- **Llogari me emër dhe fjalëkalim.** Progresi ruhet në server dhe sinkronizohet vetë në çdo pajisje. Pa email, pa kode, pa skedarë JSON. Kush nuk do llogari mund të vazhdojë pa të (progresi mbetet në pajisje dhe kalon në llogari kur ta krijojë).
- **Motivim:** seri ditësh me flakë, ngrirje që e mbrojnë serinë (fitohet një çdo 7 ditë, maksimumi 2), XP, qëllim ditor, 13 medalje, kalendar dhe grafik javor.
- **Renditja:** Sot, Java (e hënë–e diel), Muaji dhe Gjithsej, sipas XP-së. Podium për 3 të parët, top 50 dhe vendi yt. Kush nuk do të duket e çaktivizon te Profili. XP-ja numërohet deri në 3000 në ditë; administratori mund të heqë nga renditja kë mashtron. Llogaritet sipas orës së Kosovës (`APP_TZ`, parazgjedhur `Europe/Belgrade`).
- **Grupet:** te Renditja → “Grup i ri”: emri i grupit dhe emrat e shokëve. Secili merr ftesë dhe e pranon ose e refuzon; mund të dalë kur të dojë. Grupi ka renditjen e vet (sot, java, muaji, gjithsej). Krijuesi fton, heq anëtarë, e riemërton ose e fshin. Deri në 50 anëtarë për grup dhe 20 grupe për përdorues.
- **5 tema:** Oaza, Shkretëtira, Trëndafili, Smeraldi, Mesnata, plus Automatike (sipas telefonit).
- **UI:** panel përgjigjeje që del nga poshtë, tinguj (të sintetizuar, pa skedarë), dridhje në telefon, konfeti, karta përsëritjeje që kthehen, seri përgjigjesh të sakta (combo), shirit navigimi poshtë në telefon.
- **4 nivele = 4 librat e serisë**, me nga 16 njësi sipas temave të librave. Niveli 1 (16 njësi) është i plotë; nivelet 2–4 i mbush administratori.
- **Sistemi ndryshon me nivelin:** Niveli 1 me dialogë dhe transliterim; Niveli 2 me dialog + tekst leximi; Nivelet 3–4 me tekste, nahv dhe shprehje, pa transliterim (te paneli: “Sistemi i nivelit”).
- **Nivelet me test:** çdo nivel ka njësitë e veta dhe mbyllet me **testin e nivelit** (pragu vendoset nga administratori, parazgjedhur 80%). Kur e kalon, hapet niveli tjetër. Kush di më shumë shtyp **“Kalo me test”** dhe, nëse e kalon, fillon direkt nga niveli tjetër.
- **Paneli i administratorit:** shton, riemërton, rendit dhe fshin nivelet; shton, ndryshon, zhvendos dhe fshin njësitë (fjalor, dialogë, gramatikë, ushtrime); shkarkon/ngarkon programin si JSON. Ndryshimet ruhen në server dhe nxënësit i shohin menjëherë.
- **Menaxhimi i përdoruesve** (Admin → Përdoruesit): lista me kërkim dhe filtra (aktivë, administratorë, të bllokuar, jashtë renditjes), me XP, serinë, nivelet dhe ditën e fundit aktive. Veprimet: fjalëkalim i ri i përkohshëm (i shfaqet adminit për t'ia dhënë përdoruesit), nxjerrje nga të gjitha pajisjet, bllokim/zhbllokim, heqje/rikthim në renditje, fshirje e llogarisë. Administratori kryesor (nga `ADMIN_USERS`) mund t'u japë ose t'u heqë të tjerëve të drejtën e administratorit; administratorët e tjerë nuk mund të prekin njëri-tjetrin.
- Çdo njësi × 7 ditë: fjalor, dialogu 1, gramatika, fjalor + dialogu 2, përsëritje e përzier, fol dhe ndërto, testi i javës (80% për ta kaluar).
- Përsëritje me intervale (1, 2, 4, 7, 15, 30, 60 ditë), zë arabisht në pajisje, fjalor me kërkim.
- PWA: instalohet në telefon dhe punon pa internet (sinkronizohet kur kthehet lidhja). Butoni **“Shkarko”** (kryefaqja, Profili, faqja e hyrjes) tregon hapat për iPhone/iPad (Safari, Chrome, Instagram/Facebook) dhe në Android instalon me një prekje. Linku `/#install` hap drejtpërdrejt udhëzuesin, i mirë për t’ua dërguar të tjerëve.

> Dialogët dhe ushtrimet janë shkruar posaçërisht për këtë platformë sipas temave të librit. Nuk janë kopje e tekstit të librit, i cili ka të drejta autori.

## Publikimi në Vercel (falas)

1. Ngarkoje repon në GitHub dhe importoje te vercel.com (**Add New… → Project**, Framework Preset: **Other**, pa Build Command).
2. **Lidhe databazën (një herë):** te projekti në Vercel → **Storage → Create Database → Upstash for Redis** (plani falas) → **Connect** me projektin. Vercel i shton vetë variablat `KV_REST_API_URL` dhe `KV_REST_API_TOKEN` (pranohen edhe `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
3. **Administratori:** te **Settings → Environment Variables** shto `ADMIN_USERS` me emrat e përdoruesve administratorë, të ndarë me presje (p.sh. `riad,ardit`). Ata e shohin skedën **Admin** pasi hyjnë.
4. **Redeploy.** Gati: `/api/auth`, `/api/progress` dhe `/api/curriculum` punojnë.

Pa hapin 2, aplikacioni hapet, por krijimi i llogarisë kthen mesazhin “Ruajtja në server nuk është lidhur ende”. Mënyra pa llogari punon gjithsesi.

## Provë lokale
```bash
node dev-server.js        # http://localhost:8000  (Node 18+)
```
Për administrator lokal: `ADMIN_USERS=emri node dev-server.js` (PowerShell: `$env:ADMIN_USERS='emri'; node dev-server.js`), pastaj krijo llogari me atë emër.

Shërben faqen dhe API-në. Llogaritë ruhen te `.data/db.json` (vetëm për provë, nuk publikohet). XAMPP/Apache nuk e ekzekuton API-në (është Node), prandaj përdor këtë server ose `vercel dev`.

## Si funksionon llogaria
- Fjalëkalimet ruhen me `scrypt` + kripë. Seancat janë token të rastësishëm (në server ruhet vetëm hash-i), që skadojnë pas 180 ditësh.
- Kufizime: 10 përpjekje hyrjeje për 15 min për çdo emër, 20 llogari në orë për çdo IP.
- Kur dy pajisje kanë progres, ai **bashkohet** (mësimet, fjalët, XP, nivelet, medaljet), nuk mbishkruhet. Cilësimet merren nga pajisja e ndryshuar së fundi.
- Te Profili: ndrysho fjalëkalimin, fshi llogarinë, fillo nga e para.

## Shtimi i njësive të reja
Mënyra më e lehtë: **paneli Admin** në aplikacion. Aty çdo fushë shkruhet një element për rresht, me fushat të ndara me `|` (p.sh. `كِتَابٌ | Libër | kitābun`).

Programi parazgjedhur (kur administratori s'ka ruajtur ende asgjë, ose pas “Rikthe parazgjedhjen”) është te `assets/data.js`: `window.LEVELS` jep nivelet (`id`, `t` emri, `d` përshkrimi, `pass` pragu, `m` sistemi: `dialog` / `read` / `text`, `units` numrat e njësive), `window.UNITS` njësitë. Çdo njësi është një objekt:

| Fusha | Çka përmban |
|---|---|
| `n, ar, sq` | numri, titulli arabisht, titulli shqip |
| `A`, `B` | fjalori i ditës 1 dhe i ditës 4: `['arabisht me harakat','shqip','transliterim']` |
| `D1`, `D2` | dialogët ose tekstet e leximit: `t` titulli, `l` rreshtat `[folësi, arabisht, shqip]` (te teksti folësi është bosh), `q` pyetjet |
| `G` | gramatika: `t` titulli, `h` shpjegimi (HTML), `ex` ushtrimet |
| `build` | fjali për t'u ndërtuar: `['shqip', ['fjala1','fjala2',…]]` |
| `say` | ushtrime të foluri: `['detyra shqip','përgjigjja arabisht']` |

Te pyetjet `{p:'pyetja', o:[…], ar:1}` **opsioni i parë është gjithmonë i sakti** (radha përzihet vetë). `ar:1` do të thotë që opsionet janë arabisht.

Pasi ndryshon `data.js`, ndrysho `VERSION` te `sw.js` (p.sh. `arabisht-v3`), që telefonat ta marrin versionin e ri.

## Struktura
```
index.html            faqja
assets/style.css      stilet dhe 5 temat
assets/app.js         logjika: llogaria, nivelet, mësimet, testet, seria, XP, përsëritja, fjalori, progresi, paneli Admin
assets/data.js        programi parazgjedhur: nivelet dhe njësitë
api/auth.js           regjistrimi, hyrja, dalja, fjalëkalimi, fshirja
api/progress.js       leximi / ruajtja e progresit (me bashkim)
api/curriculum.js     programi mësimor: lexohet nga të gjithë, ndryshohet vetëm nga administratori
api/leaderboard.js    renditja (sot, java, muaji, gjithsej) dhe renditja e grupit
api/groups.js         grupet: krijimi, ftesat, pranimi, dalja, menaxhimi (logjika te api/_groups.js)
api/_lib.js           ruajtja (Upstash Redis ose skedar lokal), fjalëkalimet, seancat
dev-server.js         server për provë lokale
sw.js                 puna pa internet
manifest.webmanifest  instalimi si aplikacion
```

## Kufizime
- Nëse harrohet fjalëkalimi, nuk ka rikthim me email (nuk ka email). Mund të shtohet më vonë.
- Zëri vjen nga pajisja (Web Speech API). Nëse nuk ka zë arabisht, shtoje te cilësimet e gjuhës në telefon ose përdor Chrome.
