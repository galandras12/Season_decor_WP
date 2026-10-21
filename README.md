# Season Decor 🍂❄️

Hangulatos WordPress plugin, amellyel az évszakok hangulatát varázsolhatod a weboldaladra. Az évszak a szerver (a webhely időzónája szerinti) ideje alapján kapcsol be magától.

| Évszak | Időszak | Állapot |
|---|---|---|
| ❄️ Tél | december – február | kész |
| 🍂 Ősz | szeptember – november | kész |
| 🌱 Tavasz | március – május | kész |
| ☀️ Nyár | június – augusztus | kész |
| 🎁 Ünnepek | karácsony, advent, hanuka, húsvét, télapó, újév | kész |

## Telepítés

A legegyszerűbb: töltsd le a `Release/` mappából az aktuális `season-decor-<verzió>.zip` fájlt, és a WordPressben a **Bővítmények → Új hozzáadása → Bővítmény feltöltése** menüben telepítsd. (Vagy másold a `season-decor/` mappát a `wp-content/plugins/` könyvtárba.) Kapcsold be a plugint, majd a **Season Decor** menüpontban állíthatsz mindent. Minimum: WordPress 5.8, PHP 7.2.

## Funkciók

**Tél**
- hóesés: egyedi vektoros hópehely, pixel kockák vagy hógömbök, előnézettel
- sebesség (lassú / közepes / gyors), intenzitás (kevés / közepes / sok / változó), véletlenszerű átlátszóság
- ráragadó hó a megadott elemeken; lehullik, ha az elem elmozdul, és egérrel elsöpörhető
- zúzmara, ha a látogató sokáig nem görget
- téli színek: fehér hó, kék jég, lombtalan barna fa

**Tavasz**
- apró fehér vagy rózsaszín virágok nyílnak véletlenszerű elemeken, majd elhervadnak
- ha az oldal sokáig mozdulatlan, a bal és jobb szél lentről felfelé kizöldül levelekkel és rózsaszín virágokkal
- apró fűszálak nőnek az oldal alján, és idővel beterítik az egész alját
- virágzó fa széle az oldal bal vagy jobb szélén, véletlenszerűen megjelenő levelekkel és virágokkal
- tavaszi színek: zöld, rózsaszín

**Nyár**
- a nap sugara a weboldal bal vagy jobb felső sarkában; a napkorong külön kikapcsolható, ilyenkor csak a sárgás fény látszik
- véletlenszerű elemeken megjelenő jégkockák, amik csöpögve elolvadnak
- az alsó sarokból induló strandlabda: véletlen sebességgel hol gurul, hol pattog
- nyári színek: narancssárga, citromsárga

**Ősz**
- hulló falevelek: egységes barna vagy az ősz színei (barna, sárga, halvány zöld)
- hullás módja: egyenes, fuvallatok, himbálózás (külön kapcsolhatók)
- a levelek megállnak az elemeken, és a képernyő alján avarkupacban halmozódnak
- néha átsétál egy kis süni a képernyő alján, a levelek megállnak a tüskéin
- őszi színek: sárga, halvány zöld, halvány barna

**Ünnepek** (a szerver ideje alapján)
- 🎄 Karácsony (dec. 1. – jan. 6.): fényfüzér az oldal tetején (vegyes, meleg fehér vagy hideg fehér), feldíszített karácsonyfa választható alsó sarokban
- 🕯️ Advent (első vasárnaptól dec. 24-ig): adventi koszorú, mindig a hétnek megfelelő számú égő gyertyával (3. a rózsaszín)
- 🕎 Hanuka (héber naptár szerint): hanukia, az aznap esti gyertyák számával; az új láng minden este 17:00 után gyullad meg
- 🐰 Húsvét (virágvasárnaptól húsvéthétfőig): elszaladó kis nyuszi, csipegető csibe, 1–3 színes, mintás tojás az elemeken vagy a képernyő alján
- 🎅 Télapó: december 6-án a képernyő alján átsétáló télapó zsákkal (félúton megáll és integet); december 24. és 26. között télapó szánnal, rénszarvasokkal és nagy ajándékdobozzal véletlenszerűen átrepül az oldalon, és ha rákattintasz, kihullik az ajándék, és leesik a képernyő aljára
- 🎆 Szilveszter (kizárólag dec. 31-én): fent középen először a jelenlegi, majd a következő évszám rajzolódik ki csillogó tűzijáték-szikrákból
- 🎉 Újév napja (kizárólag jan. 1-jén): az évszám a képernyő aljáról feljövő tűzijáték-rakéták szikráiból, véletlenszerű színű konfetti az oldal elemeiről, véletlenszerű színű és méretű szalagok az oldal tetején
- A karácsonyfa, az adventi koszorú és a hanukia soha nem takarják egymást: ha ugyanabba a sarokba kerülnének, egymás mellé rendeződnek.

A színek átszínezése akkor működik, ha a téma színpalettát ad meg (blokk témák és `editor-color-palette` támogatás).

## Cache kezelés

A **Season Decor → Cache kezelés** menüpontban (vagy a Cache kezelés fülön) állíthatod, hogy a látogatók a frissítések után ne az elavult, gyorsítótárazott oldalt lássák:

- **Cache-busting:** minden CSS és JS fájl `?ver=` paramétere a fájl módosítási idejéből (alapértelmezett) vagy egy növelhető, egyedi verziószámból áll, így a böngésző azonnal új fájlt kér. Beállítható, hogy a webhely összes fájljára vagy csak a Season Decor fájljaira vonatkozzon. Külső (CDN) fájlokhoz nem nyúl.
- **„Minden gyorsítótár-verzió frissítése” gomb:** egy kattintással új globális verziószámot készít, és kiüríti az ismert gyorsítótár-pluginokat (WP Rocket, W3 Total Cache, WP Super Cache, LiteSpeed Cache, SG Optimizer, Autoptimize). Új verziószám automatikusan is készül, ha a plugin vagy bármely plugin/téma/WordPress frissül.
- **HTTP no-cache fejlécek (opcionális):** a kiválasztott oldaltípusokon (évszakos/ünnepi díszt futtató oldalak, kezdőlap, bejegyzések és oldalak, archívumok) `Cache-Control: no-store, no-cache, must-revalidate` fejlécet küld, és jelzi az oldal-gyorsítótár pluginoknak, hogy ne tárolják az oldalt.

## Időeltolás

Ha a szerver ideje vagy dátuma nem egyezik a valósággal, a **Beállítások** fülön kézzel korrigálhatod (nap, óra, perc). A „Kitöltés a számítógépem ideje alapján” gomb automatikusan kiszámolja az eltérést. Az évszakot a korrigált idő alapján választja ki a plugin.

## Az aktív évszak jelölése

Az admin felületen az éppen aktív évszak füle fölött animált „Most aktív” jelölés látszik.

## Kiadás készítése (fejlesztőknek)

A telepíthető ZIP-et a `python3 tools/build-release.py` parancs készíti el a `Release/` mappába (mindig csak az aktuális verzió marad ott).

## Teszt mód

Szezonon kívül az adminisztrátor a „Teszt mód” kapcsolóval megnézheti az évszakot. Ilyenkor csak ő látja, a látogatók a szerver ideje szerinti évszakot látják.

## Megjegyzések

- Oldal-gyorsítótár (page cache) esetén évszakváltáskor érdemes a gyorsítótárat üríteni.
- A „csökkentett mozgás” böngészőbeállítást használó látogatóknak az animációk nem indulnak el.

## Changelog

### 0.8.0
- Új: Télapó az Ünnepek fülön. Dec. 6.: sétáló télapó a képernyő alján. Dec. 24–26.: átrepülő szán rénszarvasokkal és nagy ajándékkal, amit kattintással le lehet ejteni. Mindkettő külön ki-be kapcsolható.

### 0.7.0
- Új: Újév az Ünnepek fülön. Szilveszter (dec. 31.): az évváltás tűzijáték-csillogásból, fent középen. Újév napja (jan. 1.): az évszám rakétákból, konfetti az elemekről, színes szalagok az oldal tetején. Mindegyik külön ki-be kapcsolható.

### 0.6.1
- Új: Cache kezelés (menüpont és fül): dinamikus verziószám a CSS/JS fájlokon, „Minden gyorsítótár-verzió frissítése” gomb, opcionális HTTP no-cache fejlécek.

### 0.6.0
- Új: Ünnepek fül (piros színvilággal): karácsonyi fényfüzér és karácsonyfa, adventi koszorú, hanukia, húsvéti nyuszi, csibe és tojások.
- Az advent, a hanuka (héber naptár) és a húsvét dátumait a plugin maga számolja ki a (korrigált) szerver idő alapján.

### 0.5.0
- Telepíthető ZIP a `Release/` mappában, build szkripttel (`tools/build-release.py`).
- Nyár: külön kikapcsolható a napkorong, csak a nap sárgás fénye is választható.
- Tavasz: virágzó fa széle (bal/jobb oldal), amelyen véletlenszerűen levelek és virágok jelennek meg, majd lehullanak.
- Admin: animált „Most aktív” jelölés az aktív évszak füle fölött.
- Admin: új Beállítások fül kézi időeltolással (nap/óra/perc) és automatikus kitöltéssel.

### 0.4.0
- Új: tavaszi hangulat (március–május): virágok, kizöldülő szélek, növekvő fű, tavaszi színek.
- Az admin felület tavaszi, zöld színvilágot kapott.

### 0.3.0
- Új: nyári hangulat (június–augusztus): nap sugara (bal/jobb felső sarok), olvadó jégkockák, strandlabda, nyári színek.
- Az admin felület nyári, citromsárga színvilágot kapott.

### 0.2.1
- A süni nagyon kicsi és cuki lett (kerek test, nagy fej és szem, rózsaszín pofi), a hátán a levelek kicsinyítve ülnek.
- Readme és changelog hozzáadva.

### 0.2.0
- Új: őszi hangulat (szeptember–november): levelek, fuvallatok, himbálózás, avarkupac, elemeken megálló levelek, süni, őszi színek.
- Új, modern admin felület: évszakonként más színvilág (tél kék, ősz barna, nyár citromsárga, tavasz zöld, ünnepek piros), élő előnézet.

### 0.1.0
- Téli hangulat: hóesés, ráragadó hó, zúzmara, téli színek.

## Licenc

GPL-3.0-or-later, lásd a `LICENSE` fájlt.
