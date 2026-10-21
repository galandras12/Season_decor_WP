<?php
defined( 'ABSPATH' ) || exit;

/**
 * Ünnepek időszakai: karácsony, advent, hanuka és húsvét.
 *
 * Minden számítás a (kézi időeltolással korrigált) szerveridő alapján, a webhely
 * időzónájában történik.
 */
class Season_Decor_Holidays {

	/** Hanuka: ettől az órától (helyi idő, napnyugta körül) gyullad az aznapi új gyertya. */
	const HANUKKAH_HOUR = 17;

	public static function now() {
		return time() + Season_Decor_Settings::time_offset();
	}

	private static function day_index( $y, $m, $d ) {
		return (int) floor( gmmktime( 0, 0, 0, $m, $d, $y ) / DAY_IN_SECONDS );
	}

	private static function index_to_date( $idx ) {
		return gmdate( 'Y. m. d.', $idx * DAY_IN_SECONDS );
	}

	/** A mai nap sorszáma a webhely időzónájában. */
	private static function today( $ts ) {
		return self::day_index( (int) wp_date( 'Y', $ts ), (int) wp_date( 'n', $ts ), (int) wp_date( 'j', $ts ) );
	}

	/* ---------- Karácsony: december 1. – január 6. ---------- */

	public static function christmas_active( $ts = null ) {
		$ts    = null === $ts ? self::now() : $ts;
		$month = (int) wp_date( 'n', $ts );
		$day   = (int) wp_date( 'j', $ts );
		return 12 === $month || ( 1 === $month && $day <= 6 );
	}

	/* ---------- Újév ---------- */

	/** Szilveszter: kizárólag december 31-én. */
	public static function newyear_eve_active( $ts = null ) {
		$ts = null === $ts ? self::now() : $ts;
		return 12 === (int) wp_date( 'n', $ts ) && 31 === (int) wp_date( 'j', $ts );
	}

	/** Újév napja: kizárólag január 1-jén. */
	public static function newyear_day_active( $ts = null ) {
		$ts = null === $ts ? self::now() : $ts;
		return 1 === (int) wp_date( 'n', $ts ) && 1 === (int) wp_date( 'j', $ts );
	}

	public static function year( $ts = null ) {
		$ts = null === $ts ? self::now() : $ts;
		return (int) wp_date( 'Y', $ts );
	}

	/* ---------- Advent ---------- */

	/** Az advent első vasárnapjának napsorszáma az adott évben. */
	public static function advent_start( $year ) {
		$xmas = self::day_index( $year, 12, 25 );
		$dow  = (int) gmdate( 'w', $xmas * DAY_IN_SECONDS ); // 0 = vasárnap
		return $xmas - ( 0 === $dow ? 7 : $dow ) - 21;
	}

	/** Hány adventi gyertya ég most (0 = nincs advent). */
	public static function advent_candles( $ts = null ) {
		$ts    = null === $ts ? self::now() : $ts;
		$year  = (int) wp_date( 'Y', $ts );
		$today = self::today( $ts );
		$start = self::advent_start( $year );
		if ( $today < $start || $today > self::day_index( $year, 12, 24 ) ) {
			return 0;
		}
		return (int) min( 4, floor( ( $today - $start ) / 7 ) + 1 );
	}

	/* ---------- Hanuka ---------- */

	/**
	 * Kiszla 25. (a hanuka első napja) napsorszáma egy héber évben.
	 * Reingold–Dershowitz héber naptár algoritmus.
	 */
	private static function hebrew_elapsed_days( $year ) {
		$months = (int) floor( ( 235 * $year - 234 ) / 19 );
		$parts  = 12084 + 13753 * $months;
		$days   = 29 * $months + (int) floor( $parts / 25920 );
		return ( ( 3 * ( $days + 1 ) ) % 7 ) < 3 ? $days + 1 : $days;
	}

	private static function hebrew_new_year( $year ) {
		$ny0 = self::hebrew_elapsed_days( $year - 1 );
		$ny1 = self::hebrew_elapsed_days( $year );
		$ny2 = self::hebrew_elapsed_days( $year + 1 );
		if ( 356 === $ny2 - $ny1 ) {
			$corr = 2;
		} elseif ( 382 === $ny1 - $ny0 ) {
			$corr = 1;
		} else {
			$corr = 0;
		}
		// -1373427: a héber időszámítás kezdete R.D. napsorszámban; 719163 az 1970-01-01.
		return -1373427 + $ny1 + $corr - 719163;
	}

	/** Kiszla 25. napsorszáma (1970-01-01 = 0) az adott gregorián év végén kezdődő héber évben. */
	public static function hanukkah_day( $gregorian_year ) {
		$year   = $gregorian_year + 3761;
		$ny     = self::hebrew_new_year( $year );
		$length = self::hebrew_new_year( $year + 1 ) - $ny;
		$heshvan = ( 5 === $length % 10 ) ? 30 : 29;
		return $ny + 30 + $heshvan + 24;
	}

	/** Hanuka: hányadik esti gyertya ég most (0 = nincs hanuka). */
	public static function hanukkah_night( $ts = null ) {
		$ts    = null === $ts ? self::now() : $ts;
		$year  = (int) wp_date( 'Y', $ts );
		$today = self::today( $ts );
		$hour  = (int) wp_date( 'G', $ts );
		foreach ( array( $year, $year - 1 ) as $y ) {
			$first_evening = self::hanukkah_day( $y ) - 1; // az első gyertyát az előző este gyújtják
			$night         = ( $today - $first_evening ) + ( $hour >= self::HANUKKAH_HOUR ? 1 : 0 );
			if ( $night >= 1 && $night <= 8 ) {
				return $night;
			}
		}
		return 0;
	}

	/* ---------- Húsvét ---------- */

	/** A húsvétvasárnap napsorszáma (nyugati/gregorián húsvét). */
	public static function easter_day( $y ) {
		$a = $y % 19;
		$b = intdiv( $y, 100 );
		$c = $y % 100;
		$d = intdiv( $b, 4 );
		$e = $b % 4;
		$f = intdiv( $b + 8, 25 );
		$g = intdiv( $b - $f + 1, 3 );
		$h = ( 19 * $a + $b - $d - $g + 15 ) % 30;
		$i = intdiv( $c, 4 );
		$k = $c % 4;
		$l = ( 32 + 2 * $e + 2 * $i - $h - $k ) % 7;
		$m = intdiv( $a + 11 * $h + 22 * $l, 451 );
		$month = intdiv( $h + $l - 7 * $m + 114, 31 );
		$day   = ( ( $h + $l - 7 * $m + 114 ) % 31 ) + 1;
		return self::day_index( $y, $month, $day );
	}

	/** Húsvét időszaka: virágvasárnaptól húsvéthétfőig. */
	public static function easter_active( $ts = null ) {
		$ts     = null === $ts ? self::now() : $ts;
		$today  = self::today( $ts );
		$easter = self::easter_day( (int) wp_date( 'Y', $ts ) );
		return $today >= $easter - 7 && $today <= $easter + 1;
	}

	/* ---------- Összefoglalók az admin felületnek ---------- */

	public static function any_active( $ts = null ) {
		return self::christmas_active( $ts ) || self::advent_candles( $ts ) > 0 || self::hanukkah_night( $ts ) > 0 || self::easter_active( $ts ) || self::newyear_eve_active( $ts ) || self::newyear_day_active( $ts );
	}

	/**
	 * A következő (vagy éppen zajló) ünnepek dátumai, szöveges formában.
	 */
	public static function upcoming( $ts = null ) {
		$ts    = null === $ts ? self::now() : $ts;
		$year  = (int) wp_date( 'Y', $ts );
		$today = self::today( $ts );

		$advent = self::advent_start( $year );
		if ( $today > self::day_index( $year, 12, 24 ) ) {
			$advent = self::advent_start( $year + 1 );
		}
		$hanukkah = self::hanukkah_day( $year ) + 7;
		$hy       = $year;
		if ( $today > $hanukkah + 1 ) {
			$hy = $year + 1;
		}
		$easter = self::easter_day( $year );
		if ( $today > $easter + 1 ) {
			$easter = self::easter_day( $year + 1 );
		}

		return array(
			'advent'   => self::index_to_date( $advent ),
			'hanukkah' => self::index_to_date( self::hanukkah_day( $hy ) - 1 ),
			'easter'   => self::index_to_date( $easter ),
		);
	}
}
