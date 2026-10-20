<?php
defined( 'ABSPATH' ) || exit;

/**
 * A látogatók által látott évszakos hangulat betöltése.
 */
class Season_Decor_Frontend {

	public function hooks() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
		add_filter( 'body_class', array( $this, 'body_class' ) );
	}

	/**
	 * Melyik évszak fut most? Egyszerre mindig csak egy.
	 *
	 * Az adminisztrátor a „Teszt mód” bekapcsolásával a saját oldalán a tesztelt
	 * évszakot látja, a látogatók közben a szerver ideje szerinti évszakot.
	 */
	public function active_season() {
		if ( current_user_can( 'manage_options' ) ) {
			foreach ( Season_Decor_Seasons::implemented() as $season ) {
				$s = Season_Decor_Settings::get( $season );
				if ( ! empty( $s['enabled'] ) && ! empty( $s['preview_admin_only'] ) ) {
					return $season;
				}
			}
		}

		$real = Season_Decor_Seasons::current();
		if ( in_array( $real, Season_Decor_Seasons::implemented(), true ) ) {
			$s = Season_Decor_Settings::get( $real );
			if ( ! empty( $s['enabled'] ) ) {
				return $real;
			}
		}
		return '';
	}

	public function body_class( $classes ) {
		$season = $this->active_season();
		if ( $season ) {
			$classes[] = 'season-decor-' . $season;
		}
		return $classes;
	}

	public function enqueue() {
		if ( is_feed() ) {
			return;
		}
		$season = $this->active_season();
		if ( ! $season ) {
			return;
		}

		$s = Season_Decor_Settings::get( $season );

		if ( 'spring' === $season ) {
			wp_enqueue_script( 'season-decor-spring', SEASON_DECOR_URL . 'assets/js/spring.js', array(), SEASON_DECOR_VERSION, true );
			wp_localize_script(
				'season-decor-spring',
				'SeasonDecorSpringConfig',
				array(
					'flowers'         => (bool) $s['flowers'],
					'flowerColor'     => $s['flower_color'],
					'flowerSelectors' => $s['stick_selectors'],
					'grow'            => (bool) $s['grow'],
					'growDelay'       => (int) $s['grow_delay'],
					'grass'           => (bool) $s['grass'],
				)
			);
		} elseif ( 'summer' === $season ) {
			wp_enqueue_script( 'season-decor-summer', SEASON_DECOR_URL . 'assets/js/summer.js', array(), SEASON_DECOR_VERSION, true );
			wp_localize_script(
				'season-decor-summer',
				'SeasonDecorSummerConfig',
				array(
					'sun'          => (bool) $s['sun'],
					'sunCorner'    => $s['sun_corner'],
					'ice'          => (bool) $s['ice'],
					'iceSelectors' => $s['stick_selectors'],
					'ball'         => (bool) $s['ball'],
				)
			);
		} elseif ( 'autumn' === $season ) {
			wp_enqueue_script( 'season-decor-autumn', SEASON_DECOR_URL . 'assets/js/autumn.js', array(), SEASON_DECOR_VERSION, true );
			wp_localize_script(
				'season-decor-autumn',
				'SeasonDecorAutumnConfig',
				array(
					'leafColor'      => $s['leaf_color'],
					'pile'           => (bool) $s['pile'],
					'pileSeconds'    => (int) $s['pile_seconds'],
					'stick'          => (bool) $s['stick'],
					'stickSelectors' => $s['stick_selectors'],
					'straight'       => (bool) $s['motion_straight'],
					'gusts'          => (bool) $s['motion_gusts'],
					'sway'           => (bool) $s['motion_sway'],
					'hedgehog'       => (bool) $s['hedgehog'],
				)
			);
		} else {
			wp_enqueue_script( 'season-decor-winter', SEASON_DECOR_URL . 'assets/js/winter.js', array(), SEASON_DECOR_VERSION, true );
			wp_localize_script(
				'season-decor-winter',
				'SeasonDecorWinterConfig',
				array(
					'type'           => $s['type'],
					'speed'          => $s['speed'],
					'intensity'      => $s['intensity'],
					'randomAlpha'    => (bool) $s['random_alpha'],
					'stick'          => (bool) $s['stick'],
					'stickSelectors' => $s['stick_selectors'],
					'frost'          => (bool) $s['frost'],
					'frostDelay'     => (int) $s['frost_delay'],
				)
			);
		}

		if ( ! empty( $s['colors'] ) ) {
			$css = Season_Decor_Colors::css( $season, $s['palette'] );
			if ( $css ) {
				wp_register_style( 'season-decor-theme', false, array(), SEASON_DECOR_VERSION );
				wp_enqueue_style( 'season-decor-theme' );
				wp_add_inline_style( 'season-decor-theme', $css );
			}
		}
	}
}
