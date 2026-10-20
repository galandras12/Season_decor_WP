<?php
defined( 'ABSPATH' ) || exit;

/**
 * A téli beállítások tárolása, alapértékei és szanálása.
 */
class Season_Decor_Settings {

	const OPTION = 'season_decor_winter';

	public static function defaults() {
		return array(
			'enabled'           => 1,
			'preview_admin_only' => 0,
			'type'              => 'snowflake',
			'speed'             => 'medium',
			'intensity'         => 'medium',
			'random_alpha'      => 1,
			'stick'             => 1,
			'stick_selectors'   => '.site-header, header, .wp-block-button__link, .button, .wp-block-image img, .wp-block-post-featured-image img, article img, .widget, .card',
			'frost'             => 0,
			'frost_delay'       => 30,
			'colors'            => 0,
			'palette'           => 'snow',
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

	public static function get() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	public static function sanitize( $input ) {
		$defaults = self::defaults();
		$input    = is_array( $input ) ? $input : array();
		$out      = array();

		foreach ( array( 'enabled', 'preview_admin_only', 'random_alpha', 'stick', 'frost', 'colors' ) as $key ) {
			$out[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
		}

		$out['type']      = self::pick( $input, 'type', self::types(), $defaults['type'] );
		$out['speed']     = self::pick( $input, 'speed', self::speeds(), $defaults['speed'] );
		$out['intensity'] = self::pick( $input, 'intensity', self::intensities(), $defaults['intensity'] );
		$out['palette']   = self::pick( $input, 'palette', Season_Decor_Colors::palettes(), $defaults['palette'] );

		$selectors = isset( $input['stick_selectors'] ) ? (string) $input['stick_selectors'] : $defaults['stick_selectors'];
		$selectors = preg_replace( '/[^\w\s,.#>:\-\[\]="\'*+~()^$|\/]/u', '', $selectors );
		$selectors = trim( preg_replace( '/\s+/', ' ', $selectors ) );
		$out['stick_selectors'] = '' === $selectors ? $defaults['stick_selectors'] : substr( $selectors, 0, 600 );

		$delay              = isset( $input['frost_delay'] ) ? (int) $input['frost_delay'] : $defaults['frost_delay'];
		$out['frost_delay'] = max( 5, min( 600, $delay ) );

		return $out;
	}

	private static function pick( $input, $key, $allowed, $fallback ) {
		$value = isset( $input[ $key ] ) ? sanitize_key( $input[ $key ] ) : '';
		return isset( $allowed[ $value ] ) ? $value : $fallback;
	}
}
