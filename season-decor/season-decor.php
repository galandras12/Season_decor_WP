<?php
/**
 * Plugin Name:       Season Decor
 * Description:       Évszakok hangulata a weboldaladon. A 0.2-es verzió a téli (december–február) és az őszi (szeptember–november) hangulatot tartalmazza.
 * Version:           0.2.0
 * Requires at least: 5.8
 * Requires PHP:      7.2
 * License:           GPL-3.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       season-decor
 */

defined( 'ABSPATH' ) || exit;

define( 'SEASON_DECOR_VERSION', '0.2.0' );
define( 'SEASON_DECOR_FILE', __FILE__ );
define( 'SEASON_DECOR_DIR', plugin_dir_path( __FILE__ ) );
define( 'SEASON_DECOR_URL', plugin_dir_url( __FILE__ ) );

require_once SEASON_DECOR_DIR . 'includes/class-season-decor-seasons.php';
require_once SEASON_DECOR_DIR . 'includes/class-season-decor-settings.php';
require_once SEASON_DECOR_DIR . 'includes/class-season-decor-colors.php';
require_once SEASON_DECOR_DIR . 'includes/class-season-decor-frontend.php';
require_once SEASON_DECOR_DIR . 'includes/class-season-decor-admin.php';

add_action(
	'plugins_loaded',
	static function () {
		load_plugin_textdomain( 'season-decor', false, dirname( plugin_basename( SEASON_DECOR_FILE ) ) . '/languages' );

		( new Season_Decor_Frontend() )->hooks();
		if ( is_admin() ) {
			( new Season_Decor_Admin() )->hooks();
		}
	}
);
