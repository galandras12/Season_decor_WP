=== Season Decor ===
Requires at least: 5.8
Requires PHP: 7.2
Stable tag: 0.8.0
License: GPL-3.0-or-later

Évszakok hangulata a weboldaladon. A 0.4-es verzió a telet, a tavaszt, a nyarat és az őszt tartalmazza.

== Leírás ==
Tél (december–február, a szerver/webhely ideje szerint):
* hóesés: egyedi vektoros hópehely, pixel kockák vagy hógömbök, előnézettel
* sebesség (lassú/közepes/gyors) és intenzitás (kevés/közepes/sok/változó)
* véletlenszerű átlátszóság
* ráragadó hó a kiválasztott elemeken, ami animációra lehullik, egérrel elsöpörhető
* zúzmara, ha a látogató sokáig nem görget
* téli színek (fehér hó, kék jég, barna fa), ha a téma színpalettát ad meg

Ősz (szeptember–november):
* hulló falevelek: egységes barna vagy az ősz színei (barna, sárga, halvány zöld)
* hullás módja: egyenes, fuvallatok, himbálózás (külön kapcsolhatók)
* a levelek megállnak az elemeken, és a képernyő alján avarkupacban halmozódnak (megadott ideig)
* néha átsétál egy süni a képernyő alján, a levelek megállnak a tüskéin
* őszi színek (sárga, halvány zöld, halvány barna), ha a téma színpalettát ad meg

Nyár (június–augusztus):
* a nap sugara a weboldal bal vagy jobb felső sarkában
* véletlenszerű elemeken megjelenő, majd csöpögve elolvadó jégkockák
* az alsó sarokból induló, hol guruló, hol pattogó strandlabda
* nyári színek (narancssárga, citromsárga), ha a téma színpalettát ad meg

Tavasz (március–május):
* apró fehér / rózsaszín virágok nyílnak véletlenszerű elemeken, majd elhervadnak
* mozdulatlan oldalnál a bal és jobb szél lentről felfelé kizöldül (levelek, rózsaszín virágok)
* apró fűszálak nőnek az oldal alján, és idővel beterítik az egész alját
* tavaszi színek (zöld, rózsaszín), ha a téma színpalettát ad meg

Ünnepek:
* Karácsony (dec. 1. – jan. 6.): fényfüzér az oldal tetején (vegyes, meleg fehér vagy hideg fehér), feldíszített karácsonyfa az alsó sarokban
* Advent: adventi koszorú, a hétnek megfelelő számú égő gyertyával
* Hanuka: hanukia, az aznap esti gyertyákkal (a héber naptár szerint számolva)
* Húsvét: elszaladó nyuszi, csipegető csibe, véletlenszerű színes tojások
* Télapó: december 6-án a képernyő alján sétáló télapó; december 24–26. között átrepülő szán rénszarvasokkal és ajándékkal (kattintásra lehull az ajándék)
* Szilveszter (csak dec. 31-én): fent középen a jelenlegi, majd a következő évszám tűzijáték-csillogásból
* Újév napja (csak jan. 1-jén): az évszám a képernyő aljáról feljövő rakéták szikráiból, véletlenszerű konfetti az elemekről, színes szalagok az oldal tetején
* A karácsonyfa, a koszorú és a hanukia soha nem takarják egymást

== Teszt mód ==
Az adminisztrátor a „Teszt mód” kapcsolóval szezonon kívül is megnézheti az évszakot. Ekkor csak ő látja a tesztelt évszakot, a látogatók a szerver ideje szerintit.

== Megjegyzés ==
Oldalgyorsítótár (page cache) használatakor az évszakváltáskor érdemes a gyorsítótárat üríteni.

== Changelog ==
= 0.8.0 =
* Új: Télapó – sétáló télapó (dec. 6.), átrepülő szán rénszarvasokkal és kattintásra lehulló ajándékkal (dec. 24–26.).

= 0.7.0 =
* Új: Újév – szilveszteri évváltás tűzijáték-csillogásból (dec. 31.), évszám rakétákból, konfetti és színes szalagok (jan. 1.).

= 0.6.1 =
* Új: Cache kezelés – dinamikus ?ver= paraméter minden CSS és JS fájlon (fájl módosítási ideje vagy növekvő verziószám), „Minden gyorsítótár-verzió frissítése” gomb, opcionális HTTP no-cache fejlécek.

= 0.6.0 =
* Új: Ünnepek fül – karácsony (fényfüzér, karácsonyfa), advent (koszorú), hanuka (hanukia), húsvét (nyuszi, csibe, tojások).

= 0.5.0 =
* Nyár: a napkorong külön kikapcsolható, ilyenkor csak a nap sárgás fénye látszik.
* Tavasz: virágzó fa széle az oldal bal vagy jobb szélén, véletlenszerűen megjelenő levelekkel és virágokkal.
* Admin: animált „Most aktív” jelölés az éppen aktív évszak füle fölött.
* Új „Beállítások” fül: kézi időeltolás (nap, óra, perc), automatikus kitöltéssel a számítógép ideje alapján.
* Telepíthető ZIP a repó Release/ mappájában.

= 0.4.0 =
* Új: tavaszi hangulat (március–május): virágok, kizöldülő szélek, fű, tavaszi színek.

= 0.3.0 =
* Új: nyári hangulat (június–augusztus): nap, olvadó jégkockák, strandlabda, nyári színek.

= 0.2.1 =
* A süni mostantól nagyon kicsi és cuki: kerek test, nagy fej és szem, rózsaszín pofi.
* A süni hátán a levelek kicsinyítve ülnek.

= 0.2.0 =
* Új: őszi hangulat (szeptember–november).
* Új, modern admin felület évszakonként más színvilággal és élő előnézettel.

= 0.1.0 =
* Téli hangulat (december–február).
