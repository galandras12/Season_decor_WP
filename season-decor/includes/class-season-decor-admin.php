<?php
defined( 'ABSPATH' ) || exit;

/**
 * Admin felület: évszak fülek és a téli beállítások.
 */
class Season_Decor_Admin {

	const PAGE = 'season-decor';
	const HOOK = 'toplevel_page_season-decor';

	public function hooks() {
		add_action( 'admin_menu', array( $this, 'menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
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
		register_setting(
			'season_decor_winter_group',
			Season_Decor_Settings::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( 'Season_Decor_Settings', 'sanitize' ),
				'default'           => Season_Decor_Settings::defaults(),
			)
		);
	}

	public function assets( $hook ) {
		if ( self::HOOK !== $hook ) {
			return;
		}
		wp_enqueue_style( 'season-decor-admin', SEASON_DECOR_URL . 'assets/css/admin.css', array(), SEASON_DECOR_VERSION );
		wp_enqueue_script( 'season-decor-winter', SEASON_DECOR_URL . 'assets/js/winter.js', array(), SEASON_DECOR_VERSION, true );
		wp_enqueue_script( 'season-decor-admin', SEASON_DECOR_URL . 'assets/js/admin.js', array( 'season-decor-winter' ), SEASON_DECOR_VERSION, true );
	}

	private function tabs() {
		return array(
			'winter'   => array( __( 'Tél', 'season-decor' ), true ),
			'spring'   => array( __( 'Tavasz', 'season-decor' ), false ),
			'summer'   => array( __( 'Nyár', 'season-decor' ), false ),
			'autumn'   => array( __( 'Ősz', 'season-decor' ), false ),
			'holidays' => array( __( 'Ünnepek', 'season-decor' ), false ),
		);
	}

	public function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap season-decor-wrap">
			<h1><?php esc_html_e( 'Season Decor', 'season-decor' ); ?> <span class="sd-version">v<?php echo esc_html( SEASON_DECOR_VERSION ); ?></span></h1>

			<h2 class="nav-tab-wrapper">
				<?php foreach ( $this->tabs() as $key => $tab ) : ?>
					<?php if ( $tab[1] ) : ?>
						<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE . '&tab=' . $key ) ); ?>" class="nav-tab nav-tab-active"><?php echo esc_html( $tab[0] ); ?></a>
					<?php else : ?>
						<span class="nav-tab sd-tab-disabled" aria-disabled="true" title="<?php esc_attr_e( 'Hamarosan, egy későbbi verzióban érkezik.', 'season-decor' ); ?>"><?php echo esc_html( $tab[0] ); ?></span>
					<?php endif; ?>
				<?php endforeach; ?>
			</h2>

			<?php $this->render_winter(); ?>
		</div>
		<?php
	}

	private function name( $key ) {
		return Season_Decor_Settings::OPTION . '[' . $key . ']';
	}

	private function render_winter() {
		$s       = Season_Decor_Settings::get();
		$active  = Season_Decor_Seasons::is_active( 'winter' );
		$months  = array( 1 => 'január', 2 => 'február', 3 => 'március', 4 => 'április', 5 => 'május', 6 => 'június', 7 => 'július', 8 => 'augusztus', 9 => 'szeptember', 10 => 'október', 11 => 'november', 12 => 'december' );
		$current = $months[ Season_Decor_Seasons::current_month() ];
		$support = Season_Decor_Colors::theme_palette();
		?>
		<div class="sd-status <?php echo $active ? 'is-active' : 'is-idle'; ?>">
			<?php
			if ( $active ) {
				/* translators: %s: hónap neve */
				printf( esc_html__( '❄️ A téli hangulat most aktív (a szerver ideje szerint %s van). A tél decembertől februárig tart.', 'season-decor' ), esc_html( $current ) );
			} else {
				/* translators: %s: hónap neve */
				printf( esc_html__( 'A tél decembertől februárig tart, most %s van, ezért a látogatók még nem látják. Az alábbi „Teszt mód” bekapcsolásával te már most megnézheted.', 'season-decor' ), esc_html( $current ) );
			}
			?>
		</div>

		<form method="post" action="options.php" class="sd-form">
			<?php settings_fields( 'season_decor_winter_group' ); ?>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Téli hangulat', 'season-decor' ); ?></th>
					<td>
						<label><input type="checkbox" name="<?php echo esc_attr( $this->name( 'enabled' ) ); ?>" value="1" <?php checked( $s['enabled'] ); ?>> <?php esc_html_e( 'Bekapcsolva (decembertől februárig)', 'season-decor' ); ?></label><br>
						<label><input type="checkbox" name="<?php echo esc_attr( $this->name( 'preview_admin_only' ) ); ?>" value="1" <?php checked( $s['preview_admin_only'] ); ?>> <?php esc_html_e( 'Teszt mód: szezonon kívül is látszik, de csak a bejelentkezett adminisztrátoroknak', 'season-decor' ); ?></label>
					</td>
				</tr>

				<tr>
					<th scope="row"><label for="sd-type"><?php esc_html_e( 'Hulló részecskék', 'season-decor' ); ?></label></th>
					<td>
						<div class="sd-preview-row">
							<div>
								<select id="sd-type" name="<?php echo esc_attr( $this->name( 'type' ) ); ?>">
									<?php foreach ( Season_Decor_Settings::types() as $value => $label ) : ?>
										<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $s['type'], $value ); ?>><?php echo esc_html( $label ); ?></option>
									<?php endforeach; ?>
								</select>
								<p class="description"><?php esc_html_e( 'Az előnézet a beállításaid szerint él: az egérrel végigsöpörhetsz a hófedte elemeken.', 'season-decor' ); ?></p>
							</div>
							<div class="sd-preview" id="sd-preview">
								<canvas id="sd-preview-canvas"></canvas>
								<div class="sd-demo-card">
									<strong><?php esc_html_e( 'Téli hangulat', 'season-decor' ); ?></strong>
									<p><?php esc_html_e( 'Előnézet', 'season-decor' ); ?></p>
									<span class="sd-demo-btn"><?php esc_html_e( 'Gomb', 'season-decor' ); ?></span>
								</div>
							</div>
						</div>
					</td>
				</tr>

				<tr>
					<th scope="row"><label for="sd-speed"><?php esc_html_e( 'Hóesés sebessége', 'season-decor' ); ?></label></th>
					<td>
						<select id="sd-speed" name="<?php echo esc_attr( $this->name( 'speed' ) ); ?>">
							<?php foreach ( Season_Decor_Settings::speeds() as $value => $label ) : ?>
								<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $s['speed'], $value ); ?>><?php echo esc_html( $label ); ?></option>
							<?php endforeach; ?>
						</select>
					</td>
				</tr>

				<tr>
					<th scope="row"><label for="sd-intensity"><?php esc_html_e( 'Hóesés intenzitása', 'season-decor' ); ?></label></th>
					<td>
						<select id="sd-intensity" name="<?php echo esc_attr( $this->name( 'intensity' ) ); ?>">
							<?php foreach ( Season_Decor_Settings::intensities() as $value => $label ) : ?>
								<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $s['intensity'], $value ); ?>><?php echo esc_html( $label ); ?></option>
							<?php endforeach; ?>
						</select>
					</td>
				</tr>

				<tr>
					<th scope="row"><?php esc_html_e( 'Átlátszóság', 'season-decor' ); ?></th>
					<td>
						<label><input type="checkbox" id="sd-random-alpha" name="<?php echo esc_attr( $this->name( 'random_alpha' ) ); ?>" value="1" <?php checked( $s['random_alpha'] ); ?>> <?php esc_html_e( 'Minden részecske véletlenszerű átlátszósággal jelenjen meg (ha ki van kapcsolva, mind egyforma)', 'season-decor' ); ?></label>
					</td>
				</tr>

				<tr>
					<th scope="row"><?php esc_html_e( 'Ráragadó hó', 'season-decor' ); ?></th>
					<td>
						<label><input type="checkbox" id="sd-stick" name="<?php echo esc_attr( $this->name( 'stick' ) ); ?>" value="1" <?php checked( $s['stick'] ); ?>> <?php esc_html_e( 'A hó megragad egyes elemeken (fejléc, képek, gombok…), hófedte elemek lesznek', 'season-decor' ); ?></label>
						<p class="description"><?php esc_html_e( 'A rárakódott hó lekerül, ha az elem elmozdul (animáció), vagy ha az egérmutatóval elsöpröd.', 'season-decor' ); ?></p>
						<div class="sd-sub" data-sd-depends="sd-stick">
							<label for="sd-selectors"><?php esc_html_e( 'Hófedte elemek (CSS szelektorok, vesszővel elválasztva)', 'season-decor' ); ?></label>
							<textarea id="sd-selectors" name="<?php echo esc_attr( $this->name( 'stick_selectors' ) ); ?>" rows="3" class="large-text code"><?php echo esc_textarea( $s['stick_selectors'] ); ?></textarea>
						</div>
					</td>
				</tr>

				<tr>
					<th scope="row"><?php esc_html_e( 'Zúzmara', 'season-decor' ); ?></th>
					<td>
						<label><input type="checkbox" id="sd-frost" name="<?php echo esc_attr( $this->name( 'frost' ) ); ?>" value="1" <?php checked( $s['frost'] ); ?>> <?php esc_html_e( 'Ha a látogató sokáig görgetés nélkül nézi az oldalt, az oldal szélei lassan zúzmarásodni kezdenek', 'season-decor' ); ?></label>
						<p class="description"><?php esc_html_e( 'Görgetésre, gépelésre vagy kattintásra a zúzmara gyorsan elolvad.', 'season-decor' ); ?></p>
						<div class="sd-sub" data-sd-depends="sd-frost">
							<label for="sd-frost-delay"><?php esc_html_e( 'Ennyi másodperc mozdulatlanság után kezdődjön:', 'season-decor' ); ?></label>
							<input type="number" id="sd-frost-delay" name="<?php echo esc_attr( $this->name( 'frost_delay' ) ); ?>" value="<?php echo esc_attr( $s['frost_delay'] ); ?>" min="5" max="600" step="1" class="small-text">
						</div>
					</td>
				</tr>

				<tr>
					<th scope="row"><?php esc_html_e( 'Téli színek', 'season-decor' ); ?></th>
					<td>
						<label><input type="checkbox" id="sd-colors" name="<?php echo esc_attr( $this->name( 'colors' ) ); ?>" value="1" <?php checked( $s['colors'] ); ?>> <?php esc_html_e( 'A weboldal színeit is átszínezi a választott téli árnyalatra', 'season-decor' ); ?></label>
						<?php if ( $support ) : ?>
							<p class="description sd-support is-ok">
								<?php
								/* translators: %d: a témától talált színek száma */
								printf( esc_html__( '✔ A témád támogatja (%d színt találtunk a paletta­ján).', 'season-decor' ), count( $support ) );
								?>
							</p>
						<?php else : ?>
							<p class="description sd-support is-no"><?php esc_html_e( '✖ A jelenlegi téma nem ad meg színpalettát, ezért a színek nem módosíthatók (a hóesés ettől még működik).', 'season-decor' ); ?></p>
						<?php endif; ?>
						<div class="sd-sub sd-palettes" data-sd-depends="sd-colors">
							<?php foreach ( Season_Decor_Colors::palettes() as $value => $label ) : ?>
								<label class="sd-palette">
									<input type="radio" name="<?php echo esc_attr( $this->name( 'palette' ) ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $s['palette'], $value ); ?>>
									<span class="sd-palette-name"><?php echo esc_html( $label ); ?></span>
									<span class="sd-swatches">
										<?php foreach ( Season_Decor_Colors::swatches( $value ) as $hex ) : ?>
											<i style="background:<?php echo esc_attr( $hex ); ?>"></i>
										<?php endforeach; ?>
									</span>
								</label>
							<?php endforeach; ?>
						</div>
					</td>
				</tr>
			</table>

			<?php submit_button( __( 'Mentés', 'season-decor' ) ); ?>
		</form>
		<?php
	}
}
