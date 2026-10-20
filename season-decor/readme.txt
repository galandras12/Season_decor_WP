=== Season Decor ===
Requires at least: 5.8
Requires PHP: 7.2
Stable tag: 0.4.0
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

Ünnepek: későbbi verzióban.

== Teszt mód ==
Az adminisztrátor a „Teszt mód” kapcsolóval szezonon kívül is megnézheti az évszakot. Ekkor csak ő látja a tesztelt évszakot, a látogatók a szerver ideje szerintit.

== Megjegyzés ==
Oldalgyorsítótár (page cache) használatakor az évszakváltáskor érdemes a gyorsítótárat üríteni.

== Changelog ==
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
