# Season Decor 🍂❄️

Hangulatos WordPress plugin, amellyel az évszakok hangulatát varázsolhatod a weboldaladra. Az évszak a szerver (a webhely időzónája szerinti) ideje alapján kapcsol be magától.

| Évszak | Időszak | Állapot |
|---|---|---|
| ❄️ Tél | december – február | kész |
| 🍂 Ősz | szeptember – november | kész |
| 🌱 Tavasz | március – május | kész |
| ☀️ Nyár | június – augusztus | kész |
| 🎁 Ünnepek | – | hamarosan |

## Telepítés

A `season-decor/` mappát másold a `wp-content/plugins/` könyvtárba (vagy csomagold ZIP-be és töltsd fel), kapcsold be, majd a **Season Decor** menüpontban állíthatsz mindent. Minimum: WordPress 5.8, PHP 7.2.

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
- tavaszi színek: zöld, rózsaszín

**Nyár**
- a nap sugara a weboldal bal vagy jobb felső sarkában
- véletlenszerű elemeken megjelenő jégkockák, amik csöpögve elolvadnak
- az alsó sarokból induló strandlabda: véletlen sebességgel hol gurul, hol pattog
- nyári színek: narancssárga, citromsárga

**Ősz**
- hulló falevelek: egységes barna vagy az ősz színei (barna, sárga, halvány zöld)
- hullás módja: egyenes, fuvallatok, himbálózás (külön kapcsolhatók)
- a levelek megállnak az elemeken, és a képernyő alján avarkupacban halmozódnak
- néha átsétál egy kis süni a képernyő alján, a levelek megállnak a tüskéin
- őszi színek: sárga, halvány zöld, halvány barna

A színek átszínezése akkor működik, ha a téma színpalettát ad meg (blokk témák és `editor-color-palette` támogatás).

## Teszt mód

Szezonon kívül az adminisztrátor a „Teszt mód” kapcsolóval megnézheti az évszakot. Ilyenkor csak ő látja, a látogatók a szerver ideje szerinti évszakot látják.

## Megjegyzések

- Oldal-gyorsítótár (page cache) esetén évszakváltáskor érdemes a gyorsítótárat üríteni.
- A „csökkentett mozgás” böngészőbeállítást használó látogatóknak az animációk nem indulnak el.

## Changelog

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
