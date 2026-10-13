<?php
/**
 * Plugin Name: Wcrm
 * Description: Connect your WordPress website to Wcrm. Visually build unlimited lead capture forms with custom dropdowns, options, and fields that automatically sync to your CRM dashboard.
 * Version: 1.0.0
 * Author: Wcrm
 * Author URI: https://wcrm.si
 * License: GPL-2.0+
 * Text Domain: wcrm
 *
 * @package Wcrm
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WCRM_VERSION', '2.6.2.' . time() );
define( 'WCRM_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WCRM_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WCRM_DEFAULT_API_URL', 'https://api.wcrm.si/api/webhooks/website' );

// Include Database Helper
require_once WCRM_PLUGIN_DIR . 'includes/class-wcrm-db.php';

// Include Admin Class
if ( is_admin() ) {
	require_once WCRM_PLUGIN_DIR . 'admin/class-wcrm-admin.php';
	new Wcrm_Admin();
}

// Include Public Class
require_once WCRM_PLUGIN_DIR . 'public/class-wcrm-public.php';
new Wcrm_Public();

/**
 * Activation Hook: Create forms table.
 */
function wcrm_activate_plugin() {
	Wcrm_DB::create_table();

	// Set or correct default API URL
	$current_url = get_option( 'wcrm_api_url', '' );
	if ( empty( $current_url ) || strpos( $current_url, 'app.wcrm.si' ) !== false ) {
		update_option( 'wcrm_api_url', WCRM_DEFAULT_API_URL );
	}
}
register_activation_hook( __FILE__, 'wcrm_activate_plugin' );
