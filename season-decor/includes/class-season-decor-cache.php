<?php
defined( 'ABSPATH' ) || exit;

/**
 * Gyorsítótár-kezelés: azt segít megelőzni, hogy a látogatók a frissítések után
 * a weboldal elavult, cache-elt verzióját lássák.
 *
 * 1. Cache-busting: a CSS és JS fájlok ?ver= paramétere a fájl módosítási idejéből
 *    vagy egy globális, növelhető tokenből áll, így a böngésző azonnal új fájlt kér.
 * 2. Egy gombbal frissíthető a token (és ürülnek az ismert gyorsítótár-pluginok).
 * 3. Opcionális HTTP no-cache fejlécek a kiválasztott oldaltípusokon.
 */
class Season_Decor_Cache {

	const OPTION = 'season_decor_cache';
	const ACTION = 'season_decor_bump_cache';

	/** @var Season_Decor_Frontend */
	private $frontend;

	public function __construct( Season_Decor_Frontend $frontend ) {
		$this->frontend = $frontend;
	}

	public function hooks() {
		add_action( 'plugins_loaded', array( $this, 'bump_on_plugin_update' ), 20 );
		add_action( 'upgrader_process_complete', array( $this, 'bump_after_upgrade' ), 10, 0 );
		add_action( 'admin_post_' . self::ACTION, array( $this, 'handle_bump' ) );

		if ( ! is_admin() ) {
			add_filter( 'style_loader_src', array( $this, 'filter_src' ), 9999, 2 );
			add_filter( 'script_loader_src', array( $this, 'filter_src' ), 9999, 2 );
			add_action( 'template_redirect', array( $this, 'send_nocache_headers' ), 1 );
		}
	}

	/* ---------- beállítások ---------- */

	public static function defaults() {
		return array(
			'enabled'           => 1,
			'scope'             => 'all',
			'mode'              => 'mtime',
			'token'             => 1,
			'last_bump'         => 0,
			'stored_version'    => '',
			'http_nocache'      => 0,
			'nocache_decor'     => 1,
			'nocache_home'      => 0,
			'nocache_singular'  => 0,
			'nocache_archive'   => 0,
		);
	}

	public static function get() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	public static function scopes() {
		return array(
			'all'    => __( 'Az oldal összes CSS és JS fájlja (téma, pluginok, Season Decor)', 'season-decor' ),
			'plugin' => __( 'Csak a Season Decor saját fájljai', 'season-decor' ),
		);
	}

	public static function modes() {
		return array(
			'mtime' => __( 'A fájl módosítási ideje (automatikus, a fájl változásakor új verzió)', 'season-decor' ),
			'token' => __( 'Egyedi, növekvő verziószám (csak a gombnyomásra változik)', 'season-decor' ),
		);
	}

	public static function sanitize( $input ) {
		$current = self::get();
		$input   = is_array( $input ) ? $input : array();
		$out     = $current; // a token, az utolsó frissítés és a tárolt verzió nem szerkeszthető űrlapból

		foreach ( array( 'enabled', 'http_nocache', 'nocache_decor', 'nocache_home', 'nocache_singular', 'nocache_archive' ) as $key ) {
			$out[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
		}
		$scope        = isset( $input['scope'] ) ? sanitize_key( $input['scope'] ) : '';
		$mode         = isset( $input['mode'] ) ? sanitize_key( $input['mode'] ) : '';
		$out['scope'] = isset( self::scopes()[ $scope ] ) ? $scope : $current['scope'];
		$out['mode']  = isset( self::modes()[ $mode ] ) ? $mode : $current['mode'];
		return $out;
	}

	/* ---------- verziószám ---------- */

	/** Az új globális token: eggyel növeli a számlálót és rögzíti az időpontot. */
	public static function bump() {
		$s              = self::get();
		$s['token']     = (int) $s['token'] + 1;
		$s['last_bump'] = time();
		update_option( self::OPTION, $s );
		return $s;
	}

	public function bump_on_plugin_update() {
		$s = self::get();
		if ( SEASON_DECOR_VERSION !== $s['stored_version'] ) {
			$s = self::bump();
			$s['stored_version'] = SEASON_DECOR_VERSION;
			update_option( self::OPTION, $s );
		}
	}

	/** Bármely plugin/téma/WordPress frissítés után új verziószám. */
	public function bump_after_upgrade() {
		self::bump();
	}

	/**
	 * A ?ver= paraméter átírása a CSS/JS URL-eken.
	 *
	 * @param string $src    A fájl URL-je.
	 * @param string $handle A regisztrált azonosító.
	 */
	public function filter_src( $src, $handle = '' ) {
		$s = self::get();
		if ( empty( $s['enabled'] ) || ! is_string( $src ) || '' === $src ) {
			return $src;
		}
		if ( 'plugin' === $s['scope'] && 0 !== strpos( $src, SEASON_DECOR_URL ) ) {
			return $src;
		}

		$path = $this->local_path( $src );
		if ( null === $path ) {
			return $src; // külső (CDN) fájl: nem nyúlunk hozzá
		}

		if ( 'token' === $s['mode'] ) {
			$version = $s['token'] . '-' . $s['last_bump'];
		} else {
			$mtime = file_exists( $path ) ? (int) filemtime( $path ) : 0;
			if ( ! $mtime ) {
				// nincs helyi fájl (pl. dinamikusan generált): marad az eredeti verzió
				parse_str( (string) wp_parse_url( $src, PHP_URL_QUERY ), $query );
				$mtime = ! empty( $query['ver'] ) ? $query['ver'] : 1;
			}
			$version = $mtime . '-' . $s['token'];
		}
		return add_query_arg( 'ver', $version, remove_query_arg( 'ver', $src ) );
	}

	/**
	 * Az URL-hez tartozó helyi fájl elérési útja, vagy null, ha nem a saját webhely fájlja.
	 */
	private function local_path( $src ) {
		$clean = preg_replace( '/[?#].*$/', '', $src );
		$clean = preg_replace( '#^https?:#i', '', $clean ); // séma-független összehasonlítás

		$map = array(
			preg_replace( '#^https?:#i', '', content_url() ) => WP_CONTENT_DIR,
			preg_replace( '#^https?:#i', '', includes_url() ) => ABSPATH . WPINC . '/',
		);
		foreach ( $map as $url => $dir ) {
			$url = trailingslashit( $url );
			if ( 0 === strpos( $clean, $url ) ) {
				return trailingslashit( $dir ) . ltrim( substr( $clean, strlen( $url ) ), '/' );
			}
		}
		// relatív, gyökérhez viszonyított URL (pl. /wp-content/…)
		if ( 0 === strpos( $clean, '/' ) && 0 !== strpos( $clean, '//' ) ) {
			return ABSPATH . ltrim( $clean, '/' );
		}
		$site = trailingslashit( preg_replace( '#^https?:#i', '', site_url() ) );
		if ( 0 === strpos( $clean, $site ) ) {
			return ABSPATH . ltrim( substr( $clean, strlen( $site ) ), '/' );
		}
		return null;
	}

	/* ---------- gombnyomásra ---------- */

	public function handle_bump() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Ehhez nincs jogosultságod.', 'season-decor' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( self::ACTION );

		self::bump();
		$purged = $this->purge_known_caches();

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'      => Season_Decor_Admin::CACHE_PAGE,
					'sd_bumped' => 1,
					'sd_purged' => rawurlencode( implode( ',', $purged ) ),
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	/**
	 * Az ismert gyorsítótár-pluginok kiürítése, ha telepítve vannak.
	 *
	 * @return string[] A kiürített rendszerek nevei.
	 */
	private function purge_known_caches() {
		$done = array();
		if ( function_exists( 'rocket_clean_domain' ) ) {
			rocket_clean_domain();
			$done[] = 'WP Rocket';
		}
		if ( function_exists( 'w3tc_flush_all' ) ) {
			w3tc_flush_all();
			$done[] = 'W3 Total Cache';
		}
		if ( function_exists( 'wp_cache_clear_cache' ) ) {
			wp_cache_clear_cache();
			$done[] = 'WP Super Cache';
		}
		if ( has_action( 'litespeed_purge_all' ) ) {
			do_action( 'litespeed_purge_all' );
			$done[] = 'LiteSpeed Cache';
		}
		if ( function_exists( 'sg_cachepress_purge_cache' ) ) {
			sg_cachepress_purge_cache();
			$done[] = 'SG Optimizer';
		}
		if ( class_exists( 'autoptimizeCache' ) && method_exists( 'autoptimizeCache', 'clearall' ) ) {
			autoptimizeCache::clearall();
			$done[] = 'Autoptimize';
		}

		/** Saját kiürítő horog más rendszerek (CDN, szerver-gyorsítótár) számára. */
		do_action( 'season_decor_cache_purged' );
		return $done;
	}

	/* ---------- HTTP no-cache fejlécek ---------- */

	private function nocache_applies( $s ) {
		if ( is_feed() || is_robots() || is_trackback() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return false;
		}
		if ( ! empty( $s['nocache_decor'] ) && ( $this->frontend->active_season() || $this->frontend->holiday_config() ) ) {
			return true;
		}
		if ( ! empty( $s['nocache_home'] ) && ( is_front_page() || is_home() ) ) {
			return true;
		}
		if ( ! empty( $s['nocache_singular'] ) && is_singular() ) {
			return true;
		}
		if ( ! empty( $s['nocache_archive'] ) && ( is_archive() || is_search() || is_404() ) ) {
			return true;
		}
		return false;
	}

	public function send_nocache_headers() {
		$s = self::get();
		if ( empty( $s['http_nocache'] ) || ! $this->nocache_applies( $s ) || headers_sent() ) {
			return;
		}
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
			define( 'DONOTCACHEPAGE', true ); // a legtöbb oldal-gyorsítótár plugin tiszteletben tartja
		}
		add_filter(
			'nocache_headers',
			static function ( $headers ) {
				$headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
				return $headers;
			}
		);
		nocache_headers();
	}
}
