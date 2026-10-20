<?php
defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'season_decor_winter' );
delete_option( 'season_decor_autumn' );
delete_option( 'season_decor_summer' );
delete_option( 'season_decor_spring' );
delete_option( 'season_decor_general' );
