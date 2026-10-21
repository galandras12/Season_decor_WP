<?php
defined( 'ABSPATH' ) || exit;

/**
 * Admin felület: évszak fülek és az évszakok beállításai.
 */
class Season_Decor_Admin {

	const PAGE = 'season-decor';
	const HOOK = 'toplevel_page_season-decor';
	const CACHE_PAGE = 'season-decor-cache';
	const CACHE_HOOK = 'season-decor_page_season-decor-cache';

	public function hooks() {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
		add_filter( 'admin_body_class', array( $this, 'body_class' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( SEASON_DECOR_FILE ), array( $this, 'action_links' ) );
	}

	public function menu() {
		add_menu_page(
			__( 'Season Decor', 'season-decor' ),
			__( 'Season Decor', 'season-decor' ),
			'manage_options',
			self::PAGE,
			array( $this, 'render' ),
			'dashicons-cloud',
			59
		);
		add_submenu_page( self::PAGE, __( 'Season Decor', 'season-decor' ), __( 'Évszakok és ünnepek', 'season-decor' ), 'manage_options', self::PAGE, array( $this, 'render' ) );
		add_submenu_page( self::PAGE, __( 'Cache kezelés', 'season-decor' ), __( 'Cache kezelés', 'season-decor' ), 'manage_options', self::CACHE_PAGE, array( $this, 'render' ) );
	}

	public function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=' . self::PAGE ) ) . '">' . esc_html__( 'Beállítások', 'season-decor' ) . '</a>' );
		return $links;
	}

	public function register_settings() {
		foreach ( Season_Decor_Seasons::implemented() as $season ) {
			register_setting(
				'season_decor_' . $season . '_group',
				Season_Decor_Settings::option_name( $season ),
				array(
					'type'              => 'array',
					'sanitize_callback' => Season_Decor_Settings::sanitize_for( $season ),
					'default'           => Season_Decor_Settings::defaults( $season ),
				)
			);
		}

		register_setting(
			'season_decor_holidays_group',
			Season_Decor_Settings::option_name( 'holidays' ),
			array(
				'type'              => 'array',
				'sanitize_callback' => Season_Decor_Settings::sanitize_for( 'holidays' ),
				'default'           => Season_Decor_Settings::defaults( 'holidays' ),
			)
		);

		register_setting(
			'season_decor_cache_group',
			Season_Decor_Cache::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( 'Season_Decor_Cache', 'sanitize' ),
				'default'           => Season_Decor_Cache::defaults(),
			)
		);

		register_setting(
			'season_decor_general_group',
			Season_Decor_Settings::GENERAL,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( 'Season_Decor_Settings', 'sanitize_general' ),
				'default'           => Season_Decor_Settings::general_defaults(),
			)
		);
	}

	/**
	 * Az éppen megnyitott fül (csak elkészült évszak lehet).
	 */
	private function current_tab() {
		if ( isset( $_GET['page'] ) && self::CACHE_PAGE === sanitize_key( wp_unslash( $_GET['page'] ) ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			return 'cache';
		}
		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		if ( in_array( $tab, array( 'settings', 'holidays', 'cache' ), true ) || in_array( $tab, Season_Decor_Seasons::implemented(), true ) ) {
			return $tab;
		}
		// Alapból az éppen aktuális évszak, ha már elkészült.
		$current = Season_Decor_Seasons::current();
		return in_array( $current, Season_Decor_Seasons::implemented(), true ) ? $current : 'winter';
	}

	public function body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && in_array( $screen->id, array( self::HOOK, self::CACHE_HOOK ), true ) ) {
			$classes .= ' sd-theme-' . $this->current_tab();
		}
		return $classes;
	}

	public function assets( $hook ) {
		if ( ! in_array( $hook, array( self::HOOK, self::CACHE_HOOK ), true ) ) {
			return;
		}
		$tab = $this->current_tab();
		wp_enqueue_style( 'season-decor-admin', SEASON_DECOR_URL . 'assets/css/admin.css', array(), SEASON_DECOR_VERSION );
		if ( 'cache' === $tab ) {
			wp_enqueue_script( 'season-decor-admin', SEASON_DECOR_URL . 'assets/js/admin.js', array(), SEASON_DECOR_VERSION, true );
			return;
		}
		if ( 'settings' === $tab ) {
			wp_enqueue_script( 'season-decor-settings', SEASON_DECOR_URL . 'assets/js/settings.js', array(), SEASON_DECOR_VERSION, true );
			wp_localize_script(
				'season-decor-settings',
				'SeasonDecorTime',
				array(
					'siteWall' => $this->site_wall_time(),
					'seasons'  => array(
						'winter' => __( 'Tél', 'season-decor' ),
						'spring' => __( 'Tavasz', 'season-decor' ),
						'summer' => __( 'Nyár', 'season-decor' ),
						'autumn' => __( 'Ősz', 'season-decor' ),
					),
				)
			);
			return;
		}
		wp_enqueue_script( 'season-decor-engine', SEASON_DECOR_URL . 'assets/js/' . $tab . '.js', array(), SEASON_DECOR_VERSION, true );
		wp_enqueue_script( 'season-decor-admin', SEASON_DECOR_URL . 'assets/js/admin.js', array( 'season-decor-engine' ), SEASON_DECOR_VERSION, true );
	}

	/**
	 * Fülek: kulcs => [címke, emoji, elkészült-e].
	 */
	private function tabs() {
		$ready = Season_Decor_Seasons::implemented();
		return array(
			'winter'   => array( __( 'Tél', 'season-decor' ), '❄️', in_array( 'winter', $ready, true ) ),
			'spring'   => array( __( 'Tavasz', 'season-decor' ), '🌱', in_array( 'spring', $ready, true ) ),
			'summer'   => array( __( 'Nyár', 'season-decor' ), '☀️', in_array( 'summer', $ready, true ) ),
			'autumn'   => array( __( 'Ősz', 'season-decor' ), '🍂', in_array( 'autumn', $ready, true ) ),
			'holidays' => array( __( 'Ünnepek', 'season-decor' ), '🎁', true ),
		);
	}

	/**
	 * A webhely időzónája szerinti „falióra” idő (eltolás nélkül) másodpercben,
	 * hogy a böngésző saját falióra idejével összehasonlítható legyen.
	 */
	private function site_wall_time() {
		return time() + (int) wp_timezone()->getOffset( new DateTimeImmutable( 'now' ) );
	}

	private function months() {
		return array( 1 => 'január', 2 => 'február', 3 => 'március', 4 => 'április', 5 => 'május', 6 => 'június', 7 => 'július', 8 => 'augusztus', 9 => 'szeptember', 10 => 'október', 11 => 'november', 12 => 'december' );
	}

	public function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$tab  = $this->current_tab();
		$tabs = $this->tabs();
		?>
		<div class="wrap season-decor-wrap sd-theme-<?php echo esc_attr( $tab ); ?>">
			<header class="sd-hero">
				<div class="sd-hero-text">
					<h1><?php esc_html_e( 'Season Decor', 'season-decor' ); ?> <span class="sd-version">v<?php echo esc_html( SEASON_DECOR_VERSION ); ?></span></h1>
					<p><?php esc_html_e( 'Varázsold az évszakok hangulatát a weboldaladra.', 'season-decor' ); ?></p>
				</div>
				<div class="sd-hero-art" aria-hidden="true">
					<?php $emoji = isset( $tabs[ $tab ] ) ? $tabs[ $tab ][1] : ( 'cache' === $tab ? '🧹' : '⚙️' ); ?>
					<span><?php echo esc_html( $emoji ); ?></span><span><?php echo esc_html( $emoji ); ?></span><span><?php echo esc_html( $emoji ); ?></span><span><?php echo esc_html( $emoji ); ?></span><span><?php echo esc_html( $emoji ); ?></span>
				</div>
			</header>

			<nav class="sd-tabs" aria-label="<?php esc_attr_e( 'Évszakok', 'season-decor' ); ?>">
				<?php $now_season = Season_Decor_Seasons::current(); ?>
				<?php foreach ( $tabs as $key => $t ) : ?>
					<?php if ( $t[2] ) : ?>
						<?php if ( $key === $now_season || ( 'holidays' === $key && Season_Decor_Holidays::any_active() ) ) : ?>
							<span class="sd-tab-wrap sd-tab-<?php echo esc_attr( $key ); ?>"><span class="sd-now" title="<?php esc_attr_e( 'Ez most aktív a szerver ideje szerint.', 'season-decor' ); ?>"><?php esc_html_e( 'Most aktív', 'season-decor' ); ?></span>
						<?php else : ?>
							<span class="sd-tab-wrap sd-tab-<?php echo esc_attr( $key ); ?>">
						<?php endif; ?>
						<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE . '&tab=' . $key ) ); ?>" class="sd-tab sd-tab-<?php echo esc_attr( $key ); ?><?php echo $key === $tab ? ' is-active' : ''; ?>"<?php echo $key === $tab ? ' aria-current="page"' : ''; ?>>
							<span class="sd-tab-emoji"><?php echo esc_html( $t[1] ); ?></span><?php echo esc_html( $t[0] ); ?>
						</a></span>
					<?php else : ?>
						<span class="sd-tab sd-tab-<?php echo esc_attr( $key ); ?> is-disabled" aria-disabled="true" title="<?php esc_attr_e( 'Hamarosan, egy későbbi verzióban érkezik.', 'season-decor' ); ?>">
							<span class="sd-tab-dot"></span><?php echo esc_html( $t[0] ); ?>
						</span>
					<?php endif; ?>
				<?php endforeach; ?>
				<span class="sd-tab-wrap sd-tab-wrap-end"><a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE . '&tab=settings' ) ); ?>" class="sd-tab sd-tab-settings<?php echo 'settings' === $tab ? ' is-active' : ''; ?>"<?php echo 'settings' === $tab ? ' aria-current="page"' : ''; ?>><span class="sd-tab-emoji">⚙️</span><?php esc_html_e( 'Beállítások', 'season-decor' ); ?></a></span>
				<span class="sd-tab-wrap"><a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::CACHE_PAGE ) ); ?>" class="sd-tab sd-tab-settings<?php echo 'cache' === $tab ? ' is-active' : ''; ?>"<?php echo 'cache' === $tab ? ' aria-current="page"' : ''; ?>><span class="sd-tab-emoji">🧹</span><?php esc_html_e( 'Cache kezelés', 'season-decor' ); ?></a></span>
			</nav>

			<?php
			if ( 'settings' === $tab ) {
				$this->render_settings();
			} elseif ( 'cache' === $tab ) {
				$this->render_cache();
			} elseif ( 'holidays' === $tab ) {
				$this->render_holidays_status();
				$this->render_holidays();
			} else {
				$this->render_status( $tab );
			}
			if ( in_array( $tab, array( 'settings', 'holidays', 'cache' ), true ) ) {
				$noop = true; // Ezek a fülek fent már megjelentek.
			} elseif ( 'autumn' === $tab ) {
				$this->render_autumn();
			} elseif ( 'summer' === $tab ) {
				$this->render_summer();
			} elseif ( 'spring' === $tab ) {
				$this->render_spring();
			} else {
				$this->render_winter();
			}
			?>
		</div>
		<?php
	}

	/* ---------- közös elemek ---------- */

	private function name( $season, $key ) {
		return Season_Decor_Settings::option_name( $season ) . '[' . $key . ']';
	}

	private function render_status( $season ) {
		$active  = Season_Decor_Seasons::is_active( $season );
		$current = $this->months()[ Season_Decor_Seasons::current_month() ];
		$ranges  = array(
			'winter' => array( __( 'A tél', 'season-decor' ), __( 'decembertől februárig', 'season-decor' ) ),
			'spring' => array( __( 'A tavasz', 'season-decor' ), __( 'márciustól májusig', 'season-decor' ) ),
			'summer' => array( __( 'A nyár', 'season-decor' ), __( 'júniustól augusztusig', 'season-decor' ) ),
			'autumn' => array( __( 'Az ősz', 'season-decor' ), __( 'szeptembertől novemberig', 'season-decor' ) ),
		);
		list( $name, $range ) = $ranges[ $season ];
		?>
		<div class="sd-status <?php echo $active ? 'is-active' : 'is-idle'; ?>">
			<span class="sd-status-dot"></span>
			<div>
				<?php
				if ( $active ) {
					/* translators: 1: évszak neve (A tél / Az ősz), 2: időszak, 3: hónap neve */
					printf( esc_html__( '%1$s hangulata most aktív: az időszak %2$s tart, a szerver ideje szerint most %3$s van.', 'season-decor' ), esc_html( $name ), esc_html( $range ), esc_html( $current ) );
				} else {
					/* translators: 1: évszak neve, 2: időszak, 3: hónap neve */
					printf( esc_html__( '%1$s %2$s tart, most %3$s van, ezért a látogatók még nem látják. A „Teszt mód” bekapcsolásával te már most megnézheted.', 'season-decor' ), esc_html( $name ), esc_html( $range ), esc_html( $current ) );
				}
				?>
			</div>
		</div>
		<?php
	}

	private function card_open( $icon, $title, $desc = '' ) {
		?>
		<section class="sd-card">
			<header class="sd-card-head">
				<span class="sd-card-icon" aria-hidden="true"><?php echo esc_html( $icon ); ?></span>
				<div>
					<h2><?php echo esc_html( $title ); ?></h2>
					<?php if ( $desc ) : ?><p><?php echo esc_html( $desc ); ?></p><?php endif; ?>
				</div>
			</header>
			<div class="sd-card-body">
		<?php
	}

	private function card_close() {
		echo '</div></section>';
	}

	private function toggle( $season, $s, $key, $label, $desc = '', $id = '' ) {
		?>
		<label class="sd-toggle">
			<input type="checkbox" <?php echo $id ? 'id="' . esc_attr( $id ) . '"' : ''; ?> name="<?php echo esc_attr( $this->name( $season, $key ) ); ?>" value="1" <?php checked( ! empty( $s[ $key ] ) ); ?>>
			<span class="sd-switch" aria-hidden="true"></span>
			<span class="sd-toggle-text"><b><?php echo esc_html( $label ); ?></b><?php if ( $desc ) : ?><small><?php echo esc_html( $desc ); ?></small><?php endif; ?></span>
		</label>
		<?php
	}

	private function select( $season, $s, $key, $label, $options ) {
		?>
		<div class="sd-field">
			<label for="sd-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label>
			<select id="sd-<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $this->name( $season, $key ) ); ?>">
				<?php foreach ( $options as $value => $text ) : ?>
					<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $s[ $key ], $value ); ?>><?php echo esc_html( $text ); ?></option>
				<?php endforeach; ?>
			</select>
		</div>
		<?php
	}

	private function selectors_field( $season, $s, $id ) {
		?>
		<div class="sd-sub" data-sd-depends="<?php echo esc_attr( $id ); ?>">
			<label for="sd-selectors"><?php esc_html_e( 'Érintett elemek (CSS szelektorok, vesszővel elválasztva)', 'season-decor' ); ?></label>
			<textarea id="sd-selectors" name="<?php echo esc_attr( $this->name( $season, 'stick_selectors' ) ); ?>" rows="3" class="code"><?php echo esc_textarea( $s['stick_selectors'] ); ?></textarea>
		</div>
		<?php
	}

	private function test_mode( $season, $s ) {
		$this->card_open( '⚡', __( 'Bekapcsolás', 'season-decor' ) );
		$this->toggle( $season, $s, 'enabled', __( 'Bekapcsolva az időszakban', 'season-decor' ), '' );
		$this->toggle( $season, $s, 'preview_admin_only', __( 'Teszt mód', 'season-decor' ), __( 'Szezonon kívül is látszik, de csak neked, a bejelentkezett adminisztrátornak. A látogatók a szerver ideje szerinti évszakot látják.', 'season-decor' ) );
		$this->card_close();
	}

	private function colors_card( $season, $s, $title, $toggle_label ) {
		$support = Season_Decor_Colors::theme_palette();
		$this->card_open( '🎨', $title, __( 'A téma saját színpalettáját hangolja át, az olvashatóság megmarad.', 'season-decor' ) );
		$this->toggle( $season, $s, 'colors', $toggle_label, '', 'sd-colors' );
		if ( $support ) {
			/* translators: %d: a témától talált színek száma */
			echo '<p class="sd-support is-ok">' . esc_html( sprintf( __( '✔ A témád támogatja (%d színt találtunk a palettáján).', 'season-decor' ), count( $support ) ) ) . '</p>';
		} else {
			echo '<p class="sd-support is-no">' . esc_html__( '✖ A jelenlegi téma nem ad meg színpalettát, ezért a színek nem módosíthatók (a hangulat ettől még működik).', 'season-decor' ) . '</p>';
		}
		?>
		<div class="sd-sub sd-choices" data-sd-depends="sd-colors">
			<?php foreach ( Season_Decor_Colors::palettes( $season ) as $value => $label ) : ?>
				<label class="sd-choice">
					<input type="radio" name="<?php echo esc_attr( $this->name( $season, 'palette' ) ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['palette'], $value ); ?>>
					<span class="sd-choice-name"><?php echo esc_html( $label ); ?></span>
					<span class="sd-swatches">
						<?php foreach ( Season_Decor_Colors::swatches( $season, $value ) as $hex ) : ?>
							<i style="background:<?php echo esc_attr( $hex ); ?>"></i>
						<?php endforeach; ?>
					</span>
				</label>
			<?php endforeach; ?>
		</div>
		<?php
		$this->card_close();
	}

	private function form_open( $season ) {
		?>
		<form method="post" action="options.php" class="sd-form" data-season="<?php echo esc_attr( $season ); ?>" data-option="<?php echo esc_attr( Season_Decor_Settings::option_name( $season ) ); ?>">
			<?php settings_fields( 'season_decor_' . $season . '_group' ); ?>
			<div class="sd-layout">
				<div class="sd-main">
		<?php
	}

	private function form_close() {
		?>
				</div>
				<aside class="sd-side">
					<div class="sd-side-sticky">
						<div class="sd-card sd-preview-card">
							<header class="sd-card-head"><span class="sd-card-icon" aria-hidden="true">👁️</span><div><h2><?php esc_html_e( 'Élő előnézet', 'season-decor' ); ?></h2><p><?php esc_html_e( 'A beállításaid szerint él. Az egérrel végigsöpörhetsz a fedett elemeken.', 'season-decor' ); ?></p></div></header>
							<div class="sd-preview" id="sd-preview">
								<canvas id="sd-preview-canvas"></canvas>
								<div class="sd-demo-card">
									<strong><?php esc_html_e( 'Weboldal elem', 'season-decor' ); ?></strong>
									<p><?php esc_html_e( 'Előnézet', 'season-decor' ); ?></p>
									<span class="sd-demo-btn"><?php esc_html_e( 'Gomb', 'season-decor' ); ?></span>
								</div>
							</div>
						</div>
						<?php submit_button( __( 'Beállítások mentése', 'season-decor' ), 'primary large sd-save', 'submit', false ); ?>
					</div>
				</aside>
			</div>
		</form>
		<?php
	}

	/* ---------- tél ---------- */

	private function render_winter() {
		$season = 'winter';
		$s      = Season_Decor_Settings::get( $season );
		$this->form_open( $season );

		$this->test_mode( $season, $s );

		$this->card_open( '❄️', __( 'Hóesés', 'season-decor' ) );
		$this->select( $season, $s, 'type', __( 'Hulló részecskék', 'season-decor' ), Season_Decor_Settings::types() );
		$this->select( $season, $s, 'speed', __( 'Sebesség', 'season-decor' ), Season_Decor_Settings::speeds() );
		$this->select( $season, $s, 'intensity', __( 'Intenzitás', 'season-decor' ), Season_Decor_Settings::intensities() );
		$this->toggle( $season, $s, 'random_alpha', __( 'Véletlenszerű átlátszóság', 'season-decor' ), __( 'Minden részecske más-más átlátszósággal jelenik meg. Kikapcsolva mind egyforma.', 'season-decor' ), 'sd-random-alpha' );
		$this->card_close();

		$this->card_open( '🏔️', __( 'Ráragadó hó', 'season-decor' ) );
		$this->toggle( $season, $s, 'stick', __( 'A hó megragad egyes elemeken', 'season-decor' ), __( 'Hófedte lesz a fejléc, a képek, a gombok… A hó lehullik, ha az elem elmozdul, vagy ha az egérmutatóval elsöpröd.', 'season-decor' ), 'sd-stick' );
		$this->selectors_field( $season, $s, 'sd-stick' );
		$this->card_close();

		$this->card_open( '🧊', __( 'Zúzmara', 'season-decor' ) );
		$this->toggle( $season, $s, 'frost', __( 'Lassan zúzmarásodó oldal', 'season-decor' ), __( 'Ha a látogató sokáig görgetés nélkül nézi az oldalt, a szélei lassan befagynak. Görgetésre, gépelésre vagy kattintásra a zúzmara gyorsan elolvad.', 'season-decor' ), 'sd-frost' );
		?>
		<div class="sd-sub" data-sd-depends="sd-frost">
			<div class="sd-field">
				<label for="sd-frost-delay"><?php esc_html_e( 'Ennyi másodperc mozdulatlanság után kezdődjön', 'season-decor' ); ?></label>
				<input type="number" id="sd-frost-delay" name="<?php echo esc_attr( $this->name( $season, 'frost_delay' ) ); ?>" value="<?php echo esc_attr( $s['frost_delay'] ); ?>" min="5" max="600" step="1">
			</div>
		</div>
		<?php
		$this->card_close();

		$this->colors_card( $season, $s, __( 'Téli színek', 'season-decor' ), __( 'A weboldal színeit is átszínezi a választott téli árnyalatra', 'season-decor' ) );

		$this->form_close();
	}

	/* ---------- cache kezelés ---------- */

	private function render_cache() {
		$s    = Season_Decor_Cache::get();
		$name = Season_Decor_Cache::OPTION;
		$last = $s['last_bump'] ? wp_date( 'Y. m. d. H:i', (int) $s['last_bump'] ) : __( 'még nem volt', 'season-decor' );

		// phpcs:disable WordPress.Security.NonceVerification
		if ( isset( $_GET['sd_bumped'] ) ) {
			$purged = isset( $_GET['sd_purged'] ) ? array_filter( array_map( 'sanitize_text_field', explode( ',', rawurldecode( wp_unslash( $_GET['sd_purged'] ) ) ) ) ) : array();
			echo '<div class="sd-status is-active"><span class="sd-status-dot"></span><div>' . esc_html__( '✔ Az új verziószám elkészült, a böngészők a következő oldalbetöltéskor új CSS és JS fájlokat kérnek.', 'season-decor' );
			if ( $purged ) {
				/* translators: %s: kiürített gyorsítótár-pluginok neve */
				echo '<br><small>' . esc_html( sprintf( __( 'Kiürítve: %s', 'season-decor' ), implode( ', ', $purged ) ) ) . '</small>';
			}
			echo '</div></div>';
		}
		// phpcs:enable
		?>
		<div class="sd-layout sd-layout-single">
			<div class="sd-main">

				<section class="sd-card">
					<header class="sd-card-head">
						<span class="sd-card-icon" aria-hidden="true">🔄</span>
						<div>
							<h2><?php esc_html_e( 'Minden gyorsítótár-verzió frissítése', 'season-decor' ); ?></h2>
							<p><?php esc_html_e( 'Új globális verziószámot készít, így a böngészők (és a statikus fájlokat gyorsítótárazó rendszerek) eldobják a régi CSS és JS fájlokat.', 'season-decor' ); ?></p>
						</div>
					</header>
					<div class="sd-card-body">
						<div class="sd-clocks">
							<div class="sd-clock"><small><?php esc_html_e( 'Jelenlegi verziószám', 'season-decor' ); ?></small><b><?php echo esc_html( $s['token'] ); ?></b></div>
							<div class="sd-clock"><small><?php esc_html_e( 'Utolsó frissítés', 'season-decor' ); ?></small><b><?php echo esc_html( $last ); ?></b></div>
							<div class="sd-clock"><small><?php esc_html_e( 'Állapot', 'season-decor' ); ?></small><b><?php echo $s['enabled'] ? esc_html__( 'Bekapcsolva', 'season-decor' ) : esc_html__( 'Kikapcsolva', 'season-decor' ); ?></b></div>
						</div>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<input type="hidden" name="action" value="<?php echo esc_attr( Season_Decor_Cache::ACTION ); ?>">
							<?php wp_nonce_field( Season_Decor_Cache::ACTION ); ?>
							<?php submit_button( __( 'Minden gyorsítótár-verzió frissítése', 'season-decor' ), 'primary large sd-save', 'submit', false ); ?>
						</form>
						<p class="sd-hint"><?php esc_html_e( 'Automatikusan is új verziószám készül, amikor a Season Decor frissül, vagy amikor bármely plugin, téma vagy a WordPress frissítése lefut. Az ismert gyorsítótár-pluginokat (WP Rocket, W3 Total Cache, WP Super Cache, LiteSpeed Cache, SG Optimizer, Autoptimize) a gomb ki is üríti.', 'season-decor' ); ?></p>
					</div>
				</section>

				<form method="post" action="options.php" class="sd-form sd-settings-form">
					<?php settings_fields( 'season_decor_cache_group' ); ?>

					<section class="sd-card">
						<header class="sd-card-head">
							<span class="sd-card-icon" aria-hidden="true">🏷️</span>
							<div>
								<h2><?php esc_html_e( 'Cache-busting a CSS és JS fájlokon', 'season-decor' ); ?></h2>
								<p><?php esc_html_e( 'Minden stíluslaphoz és szkripthez dinamikus ?ver= paraméter kerül, így az új fájlt a böngésző azonnal letölti.', 'season-decor' ); ?></p>
							</div>
						</header>
						<div class="sd-card-body">
							<?php $this->cache_toggle( $name, $s, 'enabled', __( 'Dinamikus verziószám bekapcsolva', 'season-decor' ), __( 'A külső (CDN) fájlokhoz nem nyúl, csak a saját webhely fájljaihoz.', 'season-decor' ), 'sd-cache-enabled' ); ?>
							<div class="sd-sub" data-sd-depends="sd-cache-enabled">
								<?php $this->cache_select( $name, $s, 'scope', __( 'Mely fájlokra vonatkozzon?', 'season-decor' ), Season_Decor_Cache::scopes() ); ?>
								<?php $this->cache_select( $name, $s, 'mode', __( 'A verziószám forrása', 'season-decor' ), Season_Decor_Cache::modes() ); ?>
							</div>
						</div>
					</section>

					<section class="sd-card">
						<header class="sd-card-head">
							<span class="sd-card-icon" aria-hidden="true">🚫</span>
							<div>
								<h2><?php esc_html_e( 'HTTP no-cache fejlécek', 'season-decor' ); ?></h2>
								<p><?php esc_html_e( 'Megtiltja, hogy a böngésző tárolja a kiválasztott oldalakat (Cache-Control: no-store, no-cache, must-revalidate).', 'season-decor' ); ?></p>
							</div>
						</header>
						<div class="sd-card-body">
							<?php $this->cache_toggle( $name, $s, 'http_nocache', __( 'No-cache fejlécek küldése', 'season-decor' ), __( 'Az oldal-gyorsítótár pluginoknak a DONOTCACHEPAGE jelzést is elküldi. Használata lassíthatja az oldalt, ezért csak ott kapcsold be, ahol szükséges.', 'season-decor' ), 'sd-nocache' ); ?>
							<div class="sd-sub" data-sd-depends="sd-nocache">
								<b><?php esc_html_e( 'Mely oldalakon?', 'season-decor' ); ?></b>
								<?php $this->cache_toggle( $name, $s, 'nocache_decor', __( 'Ahol évszakos vagy ünnepi dísz fut', 'season-decor' ), __( 'Ajánlott: az ilyen oldalak tartalma a dátumtól függ, ezért nem szabad elavult példányt mutatni.', 'season-decor' ) ); ?>
								<?php $this->cache_toggle( $name, $s, 'nocache_home', __( 'Kezdőlap és blog főoldal', 'season-decor' ) ); ?>
								<?php $this->cache_toggle( $name, $s, 'nocache_singular', __( 'Bejegyzések és oldalak', 'season-decor' ) ); ?>
								<?php $this->cache_toggle( $name, $s, 'nocache_archive', __( 'Archívumok, keresés és 404 oldal', 'season-decor' ) ); ?>
							</div>
						</div>
					</section>

					<?php submit_button( __( 'Beállítások mentése', 'season-decor' ), 'primary large sd-save', 'submit', false ); ?>
				</form>
			</div>
		</div>
		<?php
	}

	private function cache_toggle( $name, $s, $key, $label, $desc = '', $id = '' ) {
		?>
		<label class="sd-toggle">
			<input type="checkbox" <?php echo $id ? 'id="' . esc_attr( $id ) . '"' : ''; ?> name="<?php echo esc_attr( $name . '[' . $key . ']' ); ?>" value="1" <?php checked( ! empty( $s[ $key ] ) ); ?>>
			<span class="sd-switch" aria-hidden="true"></span>
			<span class="sd-toggle-text"><b><?php echo esc_html( $label ); ?></b><?php if ( $desc ) : ?><small><?php echo esc_html( $desc ); ?></small><?php endif; ?></span>
		</label>
		<?php
	}

	private function cache_select( $name, $s, $key, $label, $options ) {
		?>
		<div class="sd-field">
			<label for="sd-cache-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label>
			<select id="sd-cache-<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $name . '[' . $key . ']' ); ?>">
				<?php foreach ( $options as $value => $text ) : ?>
					<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $s[ $key ], $value ); ?>><?php echo esc_html( $text ); ?></option>
				<?php endforeach; ?>
			</select>
		</div>
		<?php
	}

	/* ---------- ünnepek ---------- */

	private function render_holidays_status() {
		$items = array(
			__( 'Karácsony', 'season-decor' ) => Season_Decor_Holidays::christmas_active() ? __( 'aktív', 'season-decor' ) : '',
			__( 'Advent', 'season-decor' )    => Season_Decor_Holidays::advent_candles() ? sprintf( /* translators: %d: égő gyertyák száma */ __( '%d égő gyertya', 'season-decor' ), Season_Decor_Holidays::advent_candles() ) : '',
			__( 'Hanuka', 'season-decor' )    => Season_Decor_Holidays::hanukkah_night() ? sprintf( /* translators: %d: hanuka éjszaka sorszáma */ __( '%d. gyertya', 'season-decor' ), Season_Decor_Holidays::hanukkah_night() ) : '',
			__( 'Húsvét', 'season-decor' )    => Season_Decor_Holidays::easter_active() ? __( 'aktív', 'season-decor' ) : '',
			__( 'Újév', 'season-decor' )      => Season_Decor_Holidays::newyear_eve_active() ? __( 'szilveszter', 'season-decor' ) : ( Season_Decor_Holidays::newyear_day_active() ? __( 'január 1.', 'season-decor' ) : '' ),
		);
		$dates = Season_Decor_Holidays::upcoming();
		$active = array_filter( $items );
		?>
		<div class="sd-status <?php echo $active ? 'is-active' : 'is-idle'; ?>">
			<span class="sd-status-dot"></span>
			<div>
				<?php if ( $active ) : ?>
					<?php esc_html_e( 'Most aktív ünnepek (a szerver ideje szerint):', 'season-decor' ); ?>
					<?php foreach ( $active as $name => $state ) : ?>
						<span class="sd-chip"><?php echo esc_html( $name . ': ' . $state ); ?></span>
					<?php endforeach; ?>
				<?php else : ?>
					<?php esc_html_e( 'Jelenleg nincs aktív ünnep a szerver ideje szerint. A „Teszt mód” bekapcsolásával te már most megnézheted a díszeket.', 'season-decor' ); ?>
				<?php endif; ?>
				<br>
				<small class="sd-dates">
					<?php
					/* translators: 1: advent első vasárnapja, 2: hanuka első gyertyagyújtás, 3: húsvétvasárnap */
					printf( esc_html__( 'Következő dátumok: advent első vasárnapja %1$s · hanuka első gyertyája %2$s (este) · húsvétvasárnap %3$s · újév: december 31. és január 1.', 'season-decor' ), esc_html( $dates['advent'] ), esc_html( $dates['hanukkah'] ), esc_html( $dates['easter'] ) );
					?>
				</small>
			</div>
		</div>
		<?php
	}

	private function render_holidays() {
		$season = 'holidays';
		$s      = Season_Decor_Settings::get( $season );
		$this->form_open( $season );

		$this->card_open( '⚡', __( 'Bekapcsolás', 'season-decor' ) );
		$this->toggle( $season, $s, 'enabled', __( 'Ünnepi díszek bekapcsolva', 'season-decor' ), __( 'Az egyes díszek csak a saját ünnepük idején jelennek meg, a szerver ideje alapján.', 'season-decor' ) );
		$this->toggle( $season, $s, 'preview_admin_only', __( 'Teszt mód', 'season-decor' ), __( 'Az ünnepi díszek időszakon kívül is látszanak, de csak neked, a bejelentkezett adminisztrátornak.', 'season-decor' ) );
		$this->card_close();

		$this->card_open( '🎄', __( 'Karácsony', 'season-decor' ), __( 'December 1-jétől január 6-ig.', 'season-decor' ) );
		$this->toggle( $season, $s, 'lights', __( 'Karácsonyi fényfüzér az oldal tetején', 'season-decor' ), __( 'Villódzó izzók füzére a weboldal felső szélén.', 'season-decor' ), 'sd-lights' );
		?>
		<div class="sd-sub" data-sd-depends="sd-lights">
			<?php $this->select( $season, $s, 'lights_color', __( 'A fények színe', 'season-decor' ), Season_Decor_Settings::lights_colors() ); ?>
		</div>
		<?php
		$this->toggle( $season, $s, 'tree', __( 'Karácsonyfa fényekkel és díszekkel', 'season-decor' ), __( 'Egy kis feldíszített fa áll az oldal alsó sarkában.', 'season-decor' ), 'sd-tree' );
		?>
		<div class="sd-sub" data-sd-depends="sd-tree">
			<?php $this->select( $season, $s, 'tree_corner', __( 'A karácsonyfa helye', 'season-decor' ), Season_Decor_Settings::bottom_corners() ); ?>
		</div>
		<?php
		$this->card_close();

		$this->card_open( '🕯️', __( 'Advent', 'season-decor' ), __( 'Advent első vasárnapjától december 24-ig. Minden adventi héten eggyel több gyertya ég.', 'season-decor' ) );
		$this->toggle( $season, $s, 'advent', __( 'Adventi koszorú égő gyertyákkal', 'season-decor' ), __( 'Négy gyertya, a harmadik rózsaszín. Mindig automatikusan az adott vasárnapnak megfelelő számú gyertya gyullad meg.', 'season-decor' ), 'sd-advent' );
		?>
		<div class="sd-sub" data-sd-depends="sd-advent">
			<?php $this->select( $season, $s, 'advent_corner', __( 'Az adventi koszorú helye', 'season-decor' ), Season_Decor_Settings::bottom_corners() ); ?>
		</div>
		<?php
		$this->card_close();

		$this->card_open( '🕎', __( 'Hanuka', 'season-decor' ), __( 'A nyolc napos fényünnep, a héber naptár szerint számolva.', 'season-decor' ) );
		$this->toggle( $season, $s, 'hanukkah', __( 'Hanukia a nap gyertyáival', 'season-decor' ), __( 'A shamash és az aznapi számú gyertya ég. Az új láng minden este 17:00 után gyullad meg, a szokásoknak megfelelően az újabb gyertyák balról kerülnek be.', 'season-decor' ), 'sd-hanukkah' );
		?>
		<div class="sd-sub" data-sd-depends="sd-hanukkah">
			<?php $this->select( $season, $s, 'hanukkah_corner', __( 'A hanukia helye', 'season-decor' ), Season_Decor_Settings::bottom_corners() ); ?>
		</div>
		<p class="sd-hint"><?php esc_html_e( 'Ha több dísz (karácsonyfa, adventi koszorú, hanukia) ugyanabba a sarokba kerülne, a plugin automatikusan egymás mellé rendezi őket, így soha nem takarják egymást.', 'season-decor' ); ?></p>
		<?php
		$this->card_close();

		$this->card_open( '🐰', __( 'Húsvét', 'season-decor' ), __( 'Virágvasárnaptól húsvéthétfőig.', 'season-decor' ) );
		$this->toggle( $season, $s, 'bunny', __( 'Elszaladó kis nyuszi', 'season-decor' ), __( 'Néha egy cuki nyuszi szökdécselve átszalad a képernyő alján.', 'season-decor' ) );
		$this->toggle( $season, $s, 'chick', __( 'Kis csibe', 'season-decor' ), __( 'Egy sárga csibe véletlenszerű oldalon bejön pár lépést, csipeget, körülnéz, majd ugyanazon az oldalon kisétál.', 'season-decor' ) );
		$this->toggle( $season, $s, 'eggs', __( 'Húsvéti tojások', 'season-decor' ), __( 'Véletlenszerűen 1–3 különböző színű és mintájú tojás jelenik meg az elemeken vagy a képernyő alján, majd maguktól eltűnnek.', 'season-decor' ), 'sd-eggs' );
		$this->card_close();

		$this->card_open( '🎆', __( 'Szilveszter', 'season-decor' ), __( 'Kizárólag december 31-én jelenik meg.', 'season-decor' ) );
		$this->toggle( $season, $s, 'ny_eve', __( 'Az évváltás tűzijáték-csillogásból', 'season-decor' ), __( 'Fent középen először a jelenlegi, majd a következő évszám rajzolódik ki csillogó tűzijáték-szikrákból.', 'season-decor' ) );
		$this->card_close();

		$this->card_open( '🎉', __( 'Újév napja', 'season-decor' ), __( 'Kizárólag január 1-jén jelenik meg.', 'season-decor' ) );
		$this->toggle( $season, $s, 'ny_rockets', __( 'Az új évszám tűzijáték-rakétákból', 'season-decor' ), __( 'A képernyő aljáról feljövő rakéták kirobbanása rajzolja ki az évszámot.', 'season-decor' ) );
		$this->toggle( $season, $s, 'ny_confetti', __( 'Konfetti', 'season-decor' ), __( 'Véletlenszerűen egy-egy weblap-elemről véletlenszerű színű konfetti hullik.', 'season-decor' ) );
		$this->toggle( $season, $s, 'ny_streamers', __( 'Színes szalagok', 'season-decor' ), __( 'Az oldal tetején véletlenszerű színű és méretű szalagok lógnak le.', 'season-decor' ) );
		$this->card_close();

		$this->card_open( '🎯', __( 'Érintett elemek', 'season-decor' ), __( 'A húsvéti tojások és az újévi konfetti ezekről az elemekről indulnak.', 'season-decor' ) );
		?>
		<div class="sd-sub">
			<label for="sd-selectors"><?php esc_html_e( 'Elemek (CSS szelektorok, vesszővel elválasztva)', 'season-decor' ); ?></label>
			<textarea id="sd-selectors" name="<?php echo esc_attr( $this->name( $season, 'stick_selectors' ) ); ?>" rows="3" class="code"><?php echo esc_textarea( $s['stick_selectors'] ); ?></textarea>
		</div>
		<?php
		$this->card_close();

		$this->form_close();
	}

	/* ---------- általános beállítások ---------- */

	private function render_settings() {
		$g    = Season_Decor_Settings::general();
		$name = Season_Decor_Settings::GENERAL;
		?>
		<form method="post" action="options.php" class="sd-form sd-settings-form">
			<?php settings_fields( 'season_decor_general_group' ); ?>
			<div class="sd-layout sd-layout-single">
				<div class="sd-main">
					<section class="sd-card">
						<header class="sd-card-head">
							<span class="sd-card-icon" aria-hidden="true">🕒</span>
							<div>
								<h2><?php esc_html_e( 'Időeltolás', 'season-decor' ); ?></h2>
								<p><?php esc_html_e( 'Ha a szerver ideje vagy dátuma nem egyezik a valósággal, itt kézzel korrigálhatod. Az évszakot a korrigált idő alapján választja ki a plugin.', 'season-decor' ); ?></p>
							</div>
						</header>
						<div class="sd-card-body">
							<div class="sd-clocks">
								<div class="sd-clock"><small><?php esc_html_e( 'Szerver ideje (a webhely időzónájában)', 'season-decor' ); ?></small><b id="sd-clock-site">–</b></div>
								<div class="sd-clock"><small><?php esc_html_e( 'A te számítógéped ideje', 'season-decor' ); ?></small><b id="sd-clock-browser">–</b></div>
								<div class="sd-clock"><small><?php esc_html_e( 'Eltérés', 'season-decor' ); ?></small><b id="sd-clock-diff">–</b></div>
							</div>
							<div class="sd-offset-row">
								<div class="sd-field"><label for="sd-off-days"><?php esc_html_e( 'Nap', 'season-decor' ); ?></label>
									<input type="number" id="sd-off-days" name="<?php echo esc_attr( $name ); ?>[offset_days]" value="<?php echo esc_attr( $g['offset_days'] ); ?>" min="-366" max="366" step="1"></div>
								<div class="sd-field"><label for="sd-off-hours"><?php esc_html_e( 'Óra', 'season-decor' ); ?></label>
									<input type="number" id="sd-off-hours" name="<?php echo esc_attr( $name ); ?>[offset_hours]" value="<?php echo esc_attr( $g['offset_hours'] ); ?>" min="-23" max="23" step="1"></div>
								<div class="sd-field"><label for="sd-off-minutes"><?php esc_html_e( 'Perc', 'season-decor' ); ?></label>
									<input type="number" id="sd-off-minutes" name="<?php echo esc_attr( $name ); ?>[offset_minutes]" value="<?php echo esc_attr( $g['offset_minutes'] ); ?>" min="-59" max="59" step="1"></div>
							</div>
							<p class="sd-hint"><?php esc_html_e( 'Pozitív érték előre, negatív érték hátra tolja a szerver idejét.', 'season-decor' ); ?></p>
							<div class="sd-btn-row">
								<button type="button" class="button sd-btn-ghost" id="sd-auto-offset"><?php esc_html_e( 'Kitöltés a számítógépem ideje alapján', 'season-decor' ); ?></button>
								<button type="button" class="button sd-btn-ghost" id="sd-reset-offset"><?php esc_html_e( 'Nullázás', 'season-decor' ); ?></button>
							</div>
							<div class="sd-sub" id="sd-offset-result"></div>
						</div>
					</section>
					<?php submit_button( __( 'Beállítások mentése', 'season-decor' ), 'primary large sd-save', 'submit', false ); ?>
				</div>
			</div>
		</form>
		<?php
	}

	/* ---------- tavasz ---------- */

	private function render_spring() {
		$season = 'spring';
		$s      = Season_Decor_Settings::get( $season );
		$this->form_open( $season );

		$this->test_mode( $season, $s );

		$this->card_open( '🌸', __( 'Virágok', 'season-decor' ) );
		$this->toggle( $season, $s, 'flowers', __( 'Apró virágok nyílnak az oldalon', 'season-decor' ), __( 'Véletlenszerű helyeken apró virágok nyílnak, majd egy idő után elhervadnak.', 'season-decor' ), 'sd-flowers' );
		?>
		<div class="sd-sub" data-sd-depends="sd-flowers">
			<div class="sd-choices">
				<?php foreach ( Season_Decor_Settings::flower_colors() as $value => $label ) : ?>
					<label class="sd-choice">
						<input type="radio" name="<?php echo esc_attr( $this->name( $season, 'flower_color' ) ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['flower_color'], $value ); ?>>
						<span class="sd-choice-name"><?php echo esc_html( $label ); ?></span>
						<span class="sd-swatches">
							<?php foreach ( 'white' === $value ? array( '#ffffff' ) : ( 'pink' === $value ? array( '#ff9cc2' ) : array( '#ffffff', '#ff9cc2' ) ) as $hex ) : ?>
								<i style="background:<?php echo esc_attr( $hex ); ?>"></i>
							<?php endforeach; ?>
						</span>
					</label>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
		$this->selectors_field( $season, $s, 'sd-flowers' );
		$this->card_close();

		$this->card_open( '🌿', __( 'Kizöldülő szélek', 'season-decor' ) );
		$this->toggle( $season, $s, 'grow', __( 'Mozdulatlan oldalnál kizöldül a bal és a jobb szél', 'season-decor' ), __( 'Ha az oldal sokáig áll egy helyben, a két szélén lassan, lentről felfelé levelek és rózsaszín virágok nőnek. Görgetésre, gépelésre vagy kattintásra gyorsan visszahúzódnak.', 'season-decor' ), 'sd-grow' );
		?>
		<div class="sd-sub" data-sd-depends="sd-grow">
			<div class="sd-field">
				<label for="sd-grow-delay"><?php esc_html_e( 'Ennyi másodperc mozdulatlanság után kezdődjön', 'season-decor' ); ?></label>
				<input type="number" id="sd-grow-delay" name="<?php echo esc_attr( $this->name( $season, 'grow_delay' ) ); ?>" value="<?php echo esc_attr( $s['grow_delay'] ); ?>" min="5" max="600" step="1">
			</div>
		</div>
		<?php
		$this->card_close();

		$this->card_open( '🌳', __( 'Virágzó fa', 'season-decor' ) );
		$this->toggle( $season, $s, 'tree', __( 'Egy fa széle látszik az oldal szélén', 'season-decor' ), __( 'Egy fa ágai nyúlnak be az oldal szélén, amelyeken véletlenszerűen levelek és virágok jelennek meg, majd lehullanak.', 'season-decor' ), 'sd-tree' );
		?>
		<div class="sd-sub" data-sd-depends="sd-tree">
			<div class="sd-choices">
				<?php foreach ( Season_Decor_Settings::tree_sides() as $value => $label ) : ?>
					<label class="sd-choice">
						<input type="radio" name="<?php echo esc_attr( $this->name( $season, 'tree_side' ) ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['tree_side'], $value ); ?>>
						<span class="sd-choice-name"><?php echo esc_html( $label ); ?></span>
					</label>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
		$this->card_close();

		$this->card_open( '🌱', __( 'Fű', 'season-decor' ) );
		$this->toggle( $season, $s, 'grass', __( 'Fűszálak nőnek az oldal alján', 'season-decor' ), __( 'Apró zöld fűszálak jelennek meg véletlenszerűen a weboldal alján, és idővel (kb. másfél perc alatt) beterítik az egész alját.', 'season-decor' ) );
		$this->card_close();

		$this->colors_card( $season, $s, __( 'Tavaszi színek', 'season-decor' ), __( 'A weboldal színeit is átszínezi: zöld vagy rózsaszín', 'season-decor' ) );

		$this->form_close();
	}

	/* ---------- nyár ---------- */

	private function render_summer() {
		$season = 'summer';
		$s      = Season_Decor_Settings::get( $season );
		$this->form_open( $season );

		$this->test_mode( $season, $s );

		$this->card_open( '☀️', __( 'Nap', 'season-decor' ) );
		$this->toggle( $season, $s, 'sun', __( 'Látszódjon a nap sugara', 'season-decor' ), __( 'A nap lassan hullámzó sugarai a weboldal felső sarkából sütnek be.', 'season-decor' ), 'sd-sun' );
		?>
		<div class="sd-sub" data-sd-depends="sd-sun">
			<?php $this->toggle( $season, $s, 'sun_disc', __( 'A nap korongja is látszódjon', 'season-decor' ), __( 'Kikapcsolva csak a nap sárgás fénye és sugarai látszanak, a napkorong alakja nem.', 'season-decor' ) ); ?>
			<div class="sd-choices">
			<?php foreach ( Season_Decor_Settings::sun_corners() as $value => $label ) : ?>
				<label class="sd-choice">
					<input type="radio" name="<?php echo esc_attr( $this->name( $season, 'sun_corner' ) ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['sun_corner'], $value ); ?>>
					<span class="sd-choice-name"><?php echo esc_html( $label ); ?></span>
				</label>
			<?php endforeach; ?>
			</div>
		</div>
		<?php
		$this->card_close();

		$this->card_open( '🧊', __( 'Jégkockák', 'season-decor' ) );
		$this->toggle( $season, $s, 'ice', __( 'Jégkockák jelennek meg az elemeken', 'season-decor' ), __( 'Véletlenszerű elemeken jégkockák tűnnek fel, amik véletlenszerű idő után csöpögve elolvadnak.', 'season-decor' ), 'sd-ice' );
		$this->selectors_field( $season, $s, 'sd-ice' );
		$this->card_close();

		$this->card_open( '🏖️', __( 'Strandlabda', 'season-decor' ) );
		$this->toggle( $season, $s, 'ball', __( 'Néha átgurul egy strandlabda', 'season-decor' ), __( 'A bal vagy a jobb alsó sarokból véletlenszerű sebességgel indul, hol gurul, hol pattog a weboldal alján.', 'season-decor' ) );
		$this->card_close();

		$this->colors_card( $season, $s, __( 'Nyári színek', 'season-decor' ), __( 'A weboldal színeit is átszínezi: narancssárga vagy citromsárga', 'season-decor' ) );

		$this->form_close();
	}

	/* ---------- ősz ---------- */

	private function render_autumn() {
		$season = 'autumn';
		$s      = Season_Decor_Settings::get( $season );
		$this->form_open( $season );

		$this->test_mode( $season, $s );

		$this->card_open( '🍁', __( 'Falevelek színe', 'season-decor' ) );
		?>
		<div class="sd-choices">
			<?php foreach ( Season_Decor_Settings::leaf_colors() as $value => $label ) : ?>
				<label class="sd-choice">
					<input type="radio" name="<?php echo esc_attr( $this->name( $season, 'leaf_color' ) ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['leaf_color'], $value ); ?>>
					<span class="sd-choice-name"><?php echo esc_html( $label ); ?></span>
					<span class="sd-swatches">
						<?php foreach ( 'brown' === $value ? array( '#8b5a2b' ) : array( '#8b5a2b', '#c2842d', '#e3bd3c', '#9db46a', '#bccc8c' ) as $hex ) : ?>
							<i style="background:<?php echo esc_attr( $hex ); ?>"></i>
						<?php endforeach; ?>
					</span>
				</label>
			<?php endforeach; ?>
		</div>
		<?php
		$this->card_close();

		$this->card_open( '🍃', __( 'Hullás módja', 'season-decor' ), __( 'Több is bekapcsolható, a levelek vegyesen mozognak.', 'season-decor' ) );
		$this->toggle( $season, $s, 'motion_straight', __( 'Egyenesen hulló levelek', 'season-decor' ), __( 'A levelek egyenesen, forogva esnek lefelé.', 'season-decor' ) );
		$this->toggle( $season, $s, 'motion_gusts', __( 'Fuvallatok', 'season-decor' ), __( 'Néha egy-egy fuvallat odébb fújja a leveleket (az elemeken megállt leveleket is).', 'season-decor' ) );
		$this->toggle( $season, $s, 'motion_sway', __( 'Himbálózó levelek', 'season-decor' ), __( 'Egy-egy levél ide-oda himbálózva hullik le.', 'season-decor' ) );
		$this->card_close();

		$this->card_open( '🧱', __( 'Levelek az elemeken', 'season-decor' ) );
		$this->toggle( $season, $s, 'stick', __( 'A falevelek megállnak egyes elemeken', 'season-decor' ), __( 'Egy ideig pihennek az elemeken, aztán tovább esnek. Lehullanak, ha az elem elmozdul, vagy ha az egérrel meglököd őket.', 'season-decor' ), 'sd-stick' );
		$this->selectors_field( $season, $s, 'sd-stick' );
		$this->card_close();

		$this->card_open( '🍂', __( 'Lehullott levelek', 'season-decor' ) );
		$this->toggle( $season, $s, 'pile', __( 'A lehullott levelek megmaradnak és halmozódnak', 'season-decor' ), __( 'A képernyő alján egyre magasabb avarkupac épül, majd a levelek bizonyos idő után eltűnnek.', 'season-decor' ), 'sd-pile' );
		?>
		<div class="sd-sub" data-sd-depends="sd-pile">
			<div class="sd-field">
				<label for="sd-pile-seconds"><?php esc_html_e( 'Ennyi másodpercig maradnak meg a levelek', 'season-decor' ); ?></label>
				<input type="number" id="sd-pile-seconds" name="<?php echo esc_attr( $this->name( $season, 'pile_seconds' ) ); ?>" value="<?php echo esc_attr( $s['pile_seconds'] ); ?>" min="10" max="900" step="1">
			</div>
		</div>
		<?php
		$this->card_close();

		$this->card_open( '🦔', __( 'Süni', 'season-decor' ) );
		$this->toggle( $season, $s, 'hedgehog', __( 'Néha elsétál egy süni', 'season-decor' ), __( 'Egy kis süni lassan átsétál a képernyő alján az egyik szélétől a másikig. A rá hulló levelek megállnak a tüskéin.', 'season-decor' ) );
		$this->card_close();

		$this->colors_card( $season, $s, __( 'Őszi színek', 'season-decor' ), __( 'A weboldal színeit is átszínezi: sárga, halvány zöld vagy halvány barna', 'season-decor' ) );

		$this->form_close();
	}
}
