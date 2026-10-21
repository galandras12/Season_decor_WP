<?php
defined( 'ABSPATH' ) || exit;

/**
 * Az évszakok beállításainak tárolása, alapértékei és szanálása.
 */
class Season_Decor_Settings {

	const OPTION_PREFIX = 'season_decor_';

	const GENERAL = 'season_decor_general';

	/**
	 * Általános beállítások: kézi időeltolás (nap, óra, perc).
	 */
	public static function general_defaults() {
		return array(
			'offset_days'    => 0,
			'offset_hours'   => 0,
			'offset_minutes' => 0,
		);
	}

	public static function general() {
		$saved = get_option( self::GENERAL, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::general_defaults() );
	}

	public static function sanitize_general( $input ) {
		$input = is_array( $input ) ? $input : array();
		$limit = array(
			'offset_days'    => 366,
			'offset_hours'   => 23,
			'offset_minutes' => 59,
		);
		$out = array();
		foreach ( $limit as $key => $max ) {
			$value       = isset( $input[ $key ] ) ? (int) $input[ $key ] : 0;
			$out[ $key ] = max( -$max, min( $max, $value ) );
		}
		return $out;
	}

	/**
	 * A kézi időeltolás másodpercben.
	 */
	public static function time_offset() {
		$g = self::general();
		return (int) $g['offset_days'] * DAY_IN_SECONDS + (int) $g['offset_hours'] * HOUR_IN_SECONDS + (int) $g['offset_minutes'] * MINUTE_IN_SECONDS;
	}

	public static function option_name( $season ) {
		return self::OPTION_PREFIX . $season;
	}

	public static function defaults( $season = 'winter' ) {
		$selectors = '.site-header, header, .wp-block-button__link, .button, .wp-block-image img, .wp-block-post-featured-image img, article img, .widget, .card';

		if ( 'autumn' === $season ) {
			return array(
				'enabled'            => 1,
				'preview_admin_only' => 0,
				'leaf_color'         => 'mixed',
				'pile'               => 1,
				'pile_seconds'       => 60,
				'stick'              => 1,
				'stick_selectors'    => $selectors,
				'motion_straight'    => 1,
				'motion_gusts'       => 1,
				'motion_sway'        => 1,
				'hedgehog'           => 1,
				'colors'             => 0,
				'palette'            => 'yellow',
			);
		}

		if ( 'holidays' === $season ) {
			return array(
				'enabled'            => 1,
				'preview_admin_only' => 0,
				'lights'             => 1,
				'lights_color'       => 'mixed',
				'tree'               => 1,
				'tree_corner'        => 'left',
				'advent'             => 1,
				'advent_corner'      => 'right',
				'hanukkah'           => 1,
				'hanukkah_corner'    => 'right',
				'bunny'              => 1,
				'chick'              => 1,
				'eggs'               => 1,
				'santa_walk'         => 1,
				'santa_sleigh'       => 1,
				'ny_eve'             => 1,
				'ny_rockets'         => 1,
				'ny_confetti'        => 1,
				'ny_streamers'       => 1,
				'stick_selectors'    => $selectors,
			);
		}

		if ( 'spring' === $season ) {
			return array(
				'enabled'            => 1,
				'preview_admin_only' => 0,
				'flowers'            => 1,
				'flower_color'       => 'mixed',
				'stick_selectors'    => $selectors,
				'grow'               => 1,
				'grow_delay'         => 30,
				'grass'              => 1,
				'tree'               => 0,
				'tree_side'          => 'right',
				'colors'             => 0,
				'palette'            => 'green',
			);
		}

		if ( 'summer' === $season ) {
			return array(
				'enabled'            => 1,
				'preview_admin_only' => 0,
				'sun'                => 1,
				'sun_corner'         => 'right',
				'sun_disc'           => 1,
				'ice'                => 1,
				'stick_selectors'    => $selectors,
				'ball'               => 1,
				'colors'             => 0,
				'palette'            => 'orange',
			);
		}

		return array(
			'enabled'            => 1,
			'preview_admin_only' => 0,
			'type'               => 'snowflake',
			'speed'              => 'medium',
			'intensity'          => 'medium',
			'random_alpha'       => 1,
			'stick'              => 1,
			'stick_selectors'    => $selectors,
			'frost'              => 0,
			'frost_delay'        => 30,
			'colors'             => 0,
			'palette'            => 'snow',
		);
	}

	public static function types() {
		return array(
			'snowflake' => __( 'Vektoros, mindig egyedi hópehely ❄️', 'season-decor' ),
			'pixel'     => __( 'Apró pixel kockák', 'season-decor' ),
			'ball'      => __( 'Apró hógömbök', 'season-decor' ),
		);
	}

	public static function speeds() {
		return array(
			'slow'   => __( 'Lassú', 'season-decor' ),
			'medium' => __( 'Közepes', 'season-decor' ),
			'fast'   => __( 'Gyors', 'season-decor' ),
		);
	}

	public static function intensities() {
		return array(
			'low'     => __( 'Kevés hó', 'season-decor' ),
			'medium'  => __( 'Közepes mennyiségű hó', 'season-decor' ),
			'high'    => __( 'Sok hó', 'season-decor' ),
			'varying' => __( 'Változó (hol több, hol kevesebb esik)', 'season-decor' ),
		);
	}

	public static function leaf_colors() {
		return array(
			'brown' => __( 'Egységes barna levelek', 'season-decor' ),
			'mixed' => __( 'Az ősz színei: barna, sárga és halvány zöld', 'season-decor' ),
		);
	}

	public static function flower_colors() {
		return array(
			'mixed' => __( 'Fehér és rózsaszín vegyesen', 'season-decor' ),
			'white' => __( 'Fehér virágok', 'season-decor' ),
			'pink'  => __( 'Rózsaszín virágok', 'season-decor' ),
		);
	}

	public static function lights_colors() {
		return array(
			'mixed' => __( 'Vegyes színű', 'season-decor' ),
			'warm'  => __( 'Meleg fehér (sárgás)', 'season-decor' ),
			'cool'  => __( 'Hideg fehér (kékes)', 'season-decor' ),
		);
	}

	public static function bottom_corners() {
		return array(
			'left'  => __( 'Bal alsó sarok', 'season-decor' ),
			'right' => __( 'Jobb alsó sarok', 'season-decor' ),
		);
	}

	public static function tree_sides() {
		return array(
			'left'  => __( 'Bal oldal', 'season-decor' ),
			'right' => __( 'Jobb oldal', 'season-decor' ),
		);
	}

	public static function sun_corners() {
		return array(
			'left'  => __( 'Bal felső sarok', 'season-decor' ),
			'right' => __( 'Jobb felső sarok', 'season-decor' ),
		);
	}

	public static function get( $season = 'winter' ) {
		$saved = get_option( self::option_name( $season ), array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults( $season ) );
	}

	public static function sanitize_for( $season ) {
		return static function ( $input ) use ( $season ) {
			return Season_Decor_Settings::sanitize( $input, $season );
		};
	}

	public static function sanitize( $input, $season = 'winter' ) {
		$defaults = self::defaults( $season );
		$input    = is_array( $input ) ? $input : array();
		$out      = array();

		foreach ( $defaults as $key => $default ) {
			if ( is_int( $default ) && in_array( $default, array( 0, 1 ), true ) && ! in_array( $key, array( 'frost_delay', 'pile_seconds' ), true ) ) {
				$out[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
			}
		}

		if ( isset( $defaults['palette'] ) ) {
			$out['palette'] = self::pick( $input, 'palette', Season_Decor_Colors::palettes( $season ), $defaults['palette'] );
		}

		$selectors = isset( $input['stick_selectors'] ) ? (string) $input['stick_selectors'] : $defaults['stick_selectors'];
		$selectors = preg_replace( '/[^\w\s,.#>:\-\[\]="\'*+~()^$|\/]/u', '', $selectors );
		$selectors = trim( preg_replace( '/\s+/', ' ', $selectors ) );
		$out['stick_selectors'] = '' === $selectors ? $defaults['stick_selectors'] : substr( $selectors, 0, 600 );

		if ( 'holidays' === $season ) {
			$out['lights_color']    = self::pick( $input, 'lights_color', self::lights_colors(), $defaults['lights_color'] );
			$out['tree_corner']     = self::pick( $input, 'tree_corner', self::bottom_corners(), $defaults['tree_corner'] );
			$out['advent_corner']   = self::pick( $input, 'advent_corner', self::bottom_corners(), $defaults['advent_corner'] );
			$out['hanukkah_corner'] = self::pick( $input, 'hanukkah_corner', self::bottom_corners(), $defaults['hanukkah_corner'] );
			return $out;
		}

		if ( 'spring' === $season ) {
			$out['flower_color'] = self::pick( $input, 'flower_color', self::flower_colors(), $defaults['flower_color'] );
			$out['tree_side']    = self::pick( $input, 'tree_side', self::tree_sides(), $defaults['tree_side'] );
			$delay               = isset( $input['grow_delay'] ) ? (int) $input['grow_delay'] : $defaults['grow_delay'];
			$out['grow_delay']   = max( 5, min( 600, $delay ) );
			return $out;
		}

		if ( 'summer' === $season ) {
			$out['sun_corner'] = self::pick( $input, 'sun_corner', self::sun_corners(), $defaults['sun_corner'] );
			return $out;
		}

		if ( 'autumn' === $season ) {
			$out['leaf_color'] = self::pick( $input, 'leaf_color', self::leaf_colors(), $defaults['leaf_color'] );
			$seconds           = isset( $input['pile_seconds'] ) ? (int) $input['pile_seconds'] : $defaults['pile_seconds'];
			$out['pile_seconds'] = max( 10, min( 900, $seconds ) );
			return $out;
		}

		$out['type']      = self::pick( $input, 'type', self::types(), $defaults['type'] );
		$out['speed']     = self::pick( $input, 'speed', self::speeds(), $defaults['speed'] );
		$out['intensity'] = self::pick( $input, 'intensity', self::intensities(), $defaults['intensity'] );

		$delay              = isset( $input['frost_delay'] ) ? (int) $input['frost_delay'] : $defaults['frost_delay'];
		$out['frost_delay'] = max( 5, min( 600, $delay ) );

		return $out;
	}

	private static function pick( $input, $key, $allowed, $fallback ) {
		$value = isset( $input[ $key ] ) ? sanitize_key( $input[ $key ] ) : '';
		return isset( $allowed[ $value ] ) ? $value : $fallback;
	}
}
