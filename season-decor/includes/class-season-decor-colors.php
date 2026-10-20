<?php
defined( 'ABSPATH' ) || exit;

/**
 * Téli színek: a téma saját színpalettájának átszínezése.
 *
 * A téma palettájának minden színét a kiválasztott téli árnyalat felé hangoljuk
 * úgy, hogy a színek egymáshoz viszonyított világossága megmaradjon (a világos
 * háttér világos, a sötét szöveg sötét marad), így az olvashatóság nem sérül.
 */
class Season_Decor_Colors {

	public static function palettes() {
		return array(
			'snow' => __( 'Fehér hó', 'season-decor' ),
			'ice'  => __( 'Kék jég', 'season-decor' ),
			'tree' => __( 'Lombtalan barna fa', 'season-decor' ),
		);
	}

	/**
	 * Az árnyalat paraméterei: hue (0–360), saturation (0–1), a világosság tartománya.
	 */
	private static function params() {
		return array(
			'snow' => array( 'h' => 210, 's' => 0.30, 'lmin' => 0.10, 'lmax' => 0.985 ),
			'ice'  => array( 'h' => 205, 's' => 0.80, 'lmin' => 0.12, 'lmax' => 0.95 ),
			'tree' => array( 'h' => 24, 's' => 0.42, 'lmin' => 0.13, 'lmax' => 0.94 ),
		);
	}

	/**
	 * Az admin felületen mutatott színminták.
	 */
	public static function swatches( $palette ) {
		$out = array();
		foreach ( array( '#ffffff', '#e6e6e6', '#9a9a9a', '#e0306a', '#222222' ) as $hex ) {
			$out[] = self::transform( $hex, $palette );
		}
		return array_filter( $out );
	}

	/**
	 * A témától kapott színpaletta (slug => szín) hex/rgb színekre szűrve.
	 */
	public static function theme_palette() {
		$colors = array();

		if ( function_exists( 'wp_get_global_settings' ) ) {
			$palette = wp_get_global_settings( array( 'color', 'palette' ) );
			if ( is_array( $palette ) ) {
				// Régebbi/újabb WP-nél eredet szerint csoportosított, vagy sima lista.
				$lists = isset( $palette['theme'] ) || isset( $palette['default'] ) || isset( $palette['custom'] ) ? $palette : array( $palette );
				foreach ( $lists as $origin => $list ) {
					if ( 'default' === $origin || ! is_array( $list ) ) {
						continue; // A WordPress alap palettáját nem bántjuk.
					}
					foreach ( $list as $item ) {
						if ( is_array( $item ) && isset( $item['slug'], $item['color'] ) ) {
							$colors[ sanitize_html_class( $item['slug'] ) ] = (string) $item['color'];
						}
					}
				}
			}
		}

		$support = get_theme_support( 'editor-color-palette' );
		if ( is_array( $support ) && ! empty( $support[0] ) && is_array( $support[0] ) ) {
			foreach ( $support[0] as $item ) {
				if ( is_array( $item ) && isset( $item['slug'], $item['color'] ) ) {
					$colors[ sanitize_html_class( $item['slug'] ) ] = (string) $item['color'];
				}
			}
		}

		return array_filter(
			$colors,
			static function ( $color, $slug ) {
				return '' !== $slug && null !== self::parse( $color );
			},
			ARRAY_FILTER_USE_BOTH
		);
	}

	public static function is_supported() {
		return count( self::theme_palette() ) > 0;
	}

	/**
	 * A kiválasztott téli színekhez tartozó CSS (üres, ha a téma nem támogatja).
	 */
	public static function css( $palette ) {
		$map = self::theme_palette();
		if ( ! $map || ! isset( self::params()[ $palette ] ) ) {
			return '';
		}

		$vars    = '';
		$classes = '';
		foreach ( $map as $slug => $color ) {
			$new = self::transform( $color, $palette );
			if ( null === $new ) {
				continue;
			}
			$vars    .= "--wp--preset--color--{$slug}:{$new} !important;";
			$classes .= ".has-{$slug}-color{color:{$new} !important;}";
			$classes .= ".has-{$slug}-background-color{background-color:{$new} !important;}";
			$classes .= ".has-{$slug}-border-color{border-color:{$new} !important;}";
		}

		return $vars ? ":root,body{{$vars}}{$classes}" : '';
	}

	/**
	 * Egy szín átszínezése a téli árnyalatra.
	 *
	 * @return string|null Hex vagy rgba() szín, null ha nem értelmezhető.
	 */
	public static function transform( $color, $palette ) {
		$params = self::params();
		$rgba   = self::parse( $color );
		if ( null === $rgba || ! isset( $params[ $palette ] ) ) {
			return null;
		}
		$p = $params[ $palette ];

		list( , , $l ) = self::rgb_to_hsl( $rgba[0], $rgba[1], $rgba[2] );

		$new_l = $p['lmin'] + $l * ( $p['lmax'] - $p['lmin'] );
		$new_s = $p['s'] * ( 1 - 0.85 * abs( 2 * $l - 1 ) );
		list( $r, $g, $b ) = self::hsl_to_rgb( $p['h'], $new_s, $new_l );

		if ( $rgba[3] < 1 ) {
			return sprintf( 'rgba(%d,%d,%d,%s)', $r, $g, $b, rtrim( rtrim( number_format( $rgba[3], 3, '.', '' ), '0' ), '.' ) );
		}
		return sprintf( '#%02x%02x%02x', $r, $g, $b );
	}

	/**
	 * #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() értelmezése.
	 *
	 * @return array|null [r, g, b, a]
	 */
	private static function parse( $color ) {
		$color = strtolower( trim( (string) $color ) );

		if ( preg_match( '/^#([0-9a-f]{3,4})$/', $color, $m ) ) {
			$h = $m[1];
			$a = 4 === strlen( $h ) ? hexdec( $h[3] . $h[3] ) / 255 : 1;
			return array( hexdec( $h[0] . $h[0] ), hexdec( $h[1] . $h[1] ), hexdec( $h[2] . $h[2] ), $a );
		}
		if ( preg_match( '/^#([0-9a-f]{6})([0-9a-f]{2})?$/', $color, $m ) ) {
			$a = isset( $m[2] ) && '' !== $m[2] ? hexdec( $m[2] ) / 255 : 1;
			return array( hexdec( substr( $m[1], 0, 2 ) ), hexdec( substr( $m[1], 2, 2 ) ), hexdec( substr( $m[1], 4, 2 ) ), $a );
		}
		if ( preg_match( '/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,\/]+([\d.]+))?\s*\)$/', $color, $m ) ) {
			$a = isset( $m[4] ) ? max( 0, min( 1, (float) $m[4] ) ) : 1;
			return array( min( 255, (int) $m[1] ), min( 255, (int) $m[2] ), min( 255, (int) $m[3] ), $a );
		}
		return null;
	}

	private static function rgb_to_hsl( $r, $g, $b ) {
		$r /= 255;
		$g /= 255;
		$b /= 255;
		$max = max( $r, $g, $b );
		$min = min( $r, $g, $b );
		$l   = ( $max + $min ) / 2;
		if ( $max === $min ) {
			return array( 0, 0, $l );
		}
		$d = $max - $min;
		$s = $l > 0.5 ? $d / ( 2 - $max - $min ) : $d / ( $max + $min );
		if ( $max === $r ) {
			$h = ( $g - $b ) / $d + ( $g < $b ? 6 : 0 );
		} elseif ( $max === $g ) {
			$h = ( $b - $r ) / $d + 2;
		} else {
			$h = ( $r - $g ) / $d + 4;
		}
		return array( $h * 60, $s, $l );
	}

	private static function hsl_to_rgb( $h, $s, $l ) {
		$h = fmod( $h, 360 ) / 360;
		if ( $s <= 0 ) {
			$v = (int) round( $l * 255 );
			return array( $v, $v, $v );
		}
		$q  = $l < 0.5 ? $l * ( 1 + $s ) : $l + $s - $l * $s;
		$p  = 2 * $l - $q;
		$to = static function ( $t ) use ( $p, $q ) {
			if ( $t < 0 ) {
				$t += 1;
			}
			if ( $t > 1 ) {
				$t -= 1;
			}
			if ( $t < 1 / 6 ) {
				return $p + ( $q - $p ) * 6 * $t;
			}
			if ( $t < 1 / 2 ) {
				return $q;
			}
			if ( $t < 2 / 3 ) {
				return $p + ( $q - $p ) * ( 2 / 3 - $t ) * 6;
			}
			return $p;
		};
		return array(
			(int) round( $to( $h + 1 / 3 ) * 255 ),
			(int) round( $to( $h ) * 255 ),
			(int) round( $to( $h - 1 / 3 ) * 255 ),
		);
	}
}
