# Arabisht nga shqipja

Platformë falas për të mësuar arabisht nga shqipja, sipas rrugës së librit **«العربية بين يديك»**: një njësi në javë, një mësim në ditë (15–20 min).

- 6 njësi të plota (6 javë): Përshëndetja, Familja, Banimi, Jeta e përditshme, Ushqimi, Namazi
- Çdo njësi ka 7 ditë: fjalor, dialogu 1, gramatika, fjalor + dialogu 2, përsëritje e përzier, fol dhe ndërto, testi i javës (80% për ta kaluar)
- Përsëritje e fjalëve me intervale (1, 2, 4, 7, 15, 30, 60 ditë)
- Zë arabisht në pajisje, fjalor me kërkim, faqe progresi me kalendar
- Kopje e progresit (shkarko / ngarko / kod) për ta kaluar në pajisje tjetër
- Punon pa internet dhe instalohet në telefon si aplikacion (PWA)
- Pa server, pa databazë, pa build: vetëm skedarë statikë → hosting falas

> Dialogët dhe ushtrimet janë shkruar posaçërisht për këtë platformë sipas temave të librit. Nuk janë kopje e tekstit të librit, i cili ka të drejta autori.

## Publikimi në Vercel (falas)

### Mënyra A: me GitHub (rekomandohet)
1. Krijo një repo të ri në GitHub (p.sh. `arabisht`) dhe ngarko të gjithë këtë dosje (Add file → Upload files).
2. Hyr në vercel.com me llogarinë e GitHub-it → **Add New… → Project** → zgjidh repon.
3. Te **Framework Preset** zgjidh **Other**. Lëre bosh *Build Command* dhe *Output Directory*.
4. Kliko **Deploy**. Pas ~30 sekondash e ke lidhjen, p.sh. `arabisht.vercel.app`.
5. Çdo ndryshim që e ngarkon në GitHub publikohet vetvetiu.

### Mënyra B: nga terminali
```bash
npm i -g vercel
cd arabisht-app
vercel          # herën e parë: përgjigju pyetjeve, pranoji vlerat e parazgjedhura
vercel --prod   # publikimi përfundimtar
```

### Provë lokale
```bash
cd arabisht-app
python3 -m http.server 8000
# hape http://localhost:8000
```

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

Pasi shton përmbajtje, ndrysho `VERSION` te `sw.js` (p.sh. `arabisht-v2`), që telefonat ta marrin versionin e ri.

## Struktura
```
index.html            faqja
assets/style.css      stilet (tema e çelët dhe e errët)
assets/app.js         logjika: mësimet, përsëritja, fjalori, progresi
assets/data.js        përmbajtja e njësive
sw.js                 puna pa internet
manifest.webmanifest  instalimi si aplikacion
vercel.json           konfigurimi i Vercel
icons/                ikonat
```

## Kufizime
- Progresi ruhet në shfletuesin e secilit përdorues (localStorage). Për ta kaluar në pajisje tjetër përdor “Progresi → Ruaje progresin”. Llogari me sinkronizim do të kërkonte backend (p.sh. Supabase, që ka plan falas).
- Zëri vjen nga pajisja (Web Speech API). Nëse nuk ka zë arabisht, shtoje te cilësimet e gjuhës në telefon ose përdor Chrome.
