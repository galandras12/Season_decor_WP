<?php
defined( 'ABSPATH' ) || exit;

/**
 * Évszak meghatározás a szerver (a webhely időzónája szerinti) ideje alapján.
 */
class Season_Decor_Seasons {

	/**
	 * Évszakok és a hozzájuk tartozó hónapok. A 0.1-es verzióban csak a tél működik,
	 * a többi a későbbi verziók helye.
	 */
	public static function months() {
		return array(
			'winter' => array( 12, 1, 2 ),
			'spring' => array( 3, 4, 5 ),
			'summer' => array( 6, 7, 8 ),
			'autumn' => array( 9, 10, 11 ),
		);
	}

	/**
	 * Az aktuális hónap (1–12) a webhely időzónájában.
	 */
	public static function current_month() {
		$month = (int) wp_date( 'n' );

		/**
		 * Teszteléshez felülírható az aktuális hónap.
		 *
		 * @param int $month 1–12.
		 */
		return (int) apply_filters( 'season_decor_current_month', $month );
	}

	/**
	 * Az éppen aktuális évszak kulcsa.
	 */
	public static function current() {
		$month = self::current_month();
		foreach ( self::months() as $season => $months ) {
			if ( in_array( $month, $months, true ) ) {
				return $season;
			}
		}
		return '';
	}

	public static function is_active( $season ) {
		return self::current() === $season;
	}
}
