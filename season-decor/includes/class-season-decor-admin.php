<?php
defined( 'ABSPATH' ) || exit;

/**
 * Admin felület: évszak fülek és az évszakok beállításai.
 */
class Season_Decor_Admin {

	const PAGE = 'season-decor';
	const HOOK = 'toplevel_page_season-decor';

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
	}

	/**
	 * Az éppen megnyitott fül (csak elkészült évszak lehet).
	 */
	private function current_tab() {
		$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		if ( in_array( $tab, Season_Decor_Seasons::implemented(), true ) ) {
			return $tab;
		}
		// Alapból az éppen aktuális évszak, ha már elkészült.
		$current = Season_Decor_Seasons::current();
		return in_array( $current, Season_Decor_Seasons::implemented(), true ) ? $current : 'winter';
	}

	public function body_class( $classes ) {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && self::HOOK === $screen->id ) {
			$classes .= ' sd-theme-' . $this->current_tab();
		}
		return $classes;
	}

	public function assets( $hook ) {
		if ( self::HOOK !== $hook ) {
			return;
		}
		$tab = $this->current_tab();
		wp_enqueue_style( 'season-decor-admin', SEASON_DECOR_URL . 'assets/css/admin.css', array(), SEASON_DECOR_VERSION );
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
			'holidays' => array( __( 'Ünnepek', 'season-decor' ), '🎁', in_array( 'holidays', $ready, true ) ),
		);
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
					<span><?php echo esc_html( $tabs[ $tab ][1] ); ?></span><span><?php echo esc_html( $tabs[ $tab ][1] ); ?></span><span><?php echo esc_html( $tabs[ $tab ][1] ); ?></span><span><?php echo esc_html( $tabs[ $tab ][1] ); ?></span><span><?php echo esc_html( $tabs[ $tab ][1] ); ?></span>
				</div>
			</header>

			<nav class="sd-tabs" aria-label="<?php esc_attr_e( 'Évszakok', 'season-decor' ); ?>">
				<?php foreach ( $tabs as $key => $t ) : ?>
					<?php if ( $t[2] ) : ?>
						<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE . '&tab=' . $key ) ); ?>" class="sd-tab sd-tab-<?php echo esc_attr( $key ); ?><?php echo $key === $tab ? ' is-active' : ''; ?>"<?php echo $key === $tab ? ' aria-current="page"' : ''; ?>>
							<span class="sd-tab-emoji"><?php echo esc_html( $t[1] ); ?></span><?php echo esc_html( $t[0] ); ?>
						</a>
					<?php else : ?>
						<span class="sd-tab sd-tab-<?php echo esc_attr( $key ); ?> is-disabled" aria-disabled="true" title="<?php esc_attr_e( 'Hamarosan, egy későbbi verzióban érkezik.', 'season-decor' ); ?>">
							<span class="sd-tab-dot"></span><?php echo esc_html( $t[0] ); ?>
						</span>
					<?php endif; ?>
				<?php endforeach; ?>
			</nav>

			<?php
			$this->render_status( $tab );
			if ( 'autumn' === $tab ) {
				$this->render_autumn();
			} elseif ( 'summer' === $tab ) {
				$this->render_summer();
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

	/* ---------- nyár ---------- */

	private function render_summer() {
		$season = 'summer';
		$s      = Season_Decor_Settings::get( $season );
		$this->form_open( $season );

		$this->test_mode( $season, $s );

		$this->card_open( '☀️', __( 'Nap', 'season-decor' ) );
		$this->toggle( $season, $s, 'sun', __( 'Látszódjon a nap sugara', 'season-decor' ), __( 'A nap lassan hullámzó sugarai a weboldal felső sarkából sütnek be.', 'season-decor' ), 'sd-sun' );
		?>
		<div class="sd-sub sd-choices" data-sd-depends="sd-sun">
			<?php foreach ( Season_Decor_Settings::sun_corners() as $value => $label ) : ?>
				<label class="sd-choice">
					<input type="radio" name="<?php echo esc_attr( $this->name( $season, 'sun_corner' ) ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['sun_corner'], $value ); ?>>
					<span class="sd-choice-name"><?php echo esc_html( $label ); ?></span>
				</label>
			<?php endforeach; ?>
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
