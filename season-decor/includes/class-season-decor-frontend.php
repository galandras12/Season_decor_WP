<?php
defined( 'ABSPATH' ) || exit;

/**
 * A látogatók által látott téli hangulat betöltése.
 */
class Season_Decor_Frontend {

	public function hooks() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue' ) );
		add_filter( 'body_class', array( $this, 'body_class' ) );
	}

	/**
	 * Fut-e most a téli hangulat? Szezonban mindenkinek, szezonon kívül
	 * csak a teszt módot bekapcsolva és csak adminisztrátoroknak.
	 */
	public function should_run() {
		$settings = Season_Decor_Settings::get();
		if ( empty( $settings['enabled'] ) ) {
			return false;
		}
		if ( Season_Decor_Seasons::is_active( 'winter' ) ) {
			return true;
		}
		return ! empty( $settings['preview_admin_only'] ) && current_user_can( 'manage_options' );
	}

	public function body_class( $classes ) {
		if ( $this->should_run() ) {
			$classes[] = 'season-decor-winter';
		}
		return $classes;
	}

	public function enqueue() {
		if ( is_feed() || ! $this->should_run() ) {
			return;
		}

		$s = Season_Decor_Settings::get();

		wp_enqueue_script( 'season-decor-winter', SEASON_DECOR_URL . 'assets/js/winter.js', array(), SEASON_DECOR_VERSION, true );
		wp_localize_script(
			'season-decor-winter',
			'SeasonDecorWinterConfig',
			array(
				'type'          => $s['type'],
				'speed'         => $s['speed'],
				'intensity'     => $s['intensity'],
				'randomAlpha'   => (bool) $s['random_alpha'],
				'stick'         => (bool) $s['stick'],
				'stickSelectors' => $s['stick_selectors'],
				'frost'         => (bool) $s['frost'],
				'frostDelay'    => (int) $s['frost_delay'],
			)
		);

		if ( ! empty( $s['colors'] ) ) {
			$css = Season_Decor_Colors::css( $s['palette'] );
			if ( $css ) {
				wp_register_style( 'season-decor-winter', false, array(), SEASON_DECOR_VERSION );
				wp_enqueue_style( 'season-decor-winter' );
				wp_add_inline_style( 'season-decor-winter', $css );
			}
		}
	}
}
