<?php
/**
 * Admin Controller for Wcrm Lead Forms.
 *
 * @package Wcrm
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Wcrm_Admin {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_admin_menus' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );

		// AJAX Handlers
		add_action( 'wp_ajax_wcrm_save_form', array( $this, 'ajax_save_form' ) );
		add_action( 'wp_ajax_wcrm_delete_form', array( $this, 'ajax_delete_form' ) );
		add_action( 'wp_ajax_wcrm_test_connection', array( $this, 'ajax_test_connection' ) );
	}

	/**
	 * Register WordPress Admin menus.
	 */
	public function register_admin_menus() {
		add_menu_page(
			__( 'Wcrm Forms', 'wcrm' ),
			__( 'Wcrm', 'wcrm' ),
			'manage_options',
			'wcrm-forms',
			array( $this, 'render_forms_list_page' ),
			'dashicons-share-alt',
			30
		);

		add_submenu_page(
			'wcrm-forms',
			__( 'All Forms', 'wcrm' ),
			__( 'All Forms', 'wcrm' ),
			'manage_options',
			'wcrm-forms',
			array( $this, 'render_forms_list_page' )
		);

		add_submenu_page(
			'wcrm-forms',
			__( 'Add New Form', 'wcrm' ),
			__( 'Add New Form', 'wcrm' ),
			'manage_options',
			'wcrm-form-editor',
			array( $this, 'render_form_editor_page' )
		);

		add_submenu_page(
			'wcrm-forms',
			__( 'Settings', 'wcrm' ),
			__( 'Settings', 'wcrm' ),
			'manage_options',
			'wcrm-settings',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Register plugin settings.
	 */
	public function register_settings() {
		register_setting( 'wcrm_settings_group', 'wcrm_company_id', 'sanitize_text_field' );
		register_setting( 'wcrm_settings_group', 'wcrm_api_url', 'esc_url_raw' );
	}

	/**
	 * Enqueue admin scripts & styles on plugin pages.
	 *
	 * @param string $hook_suffix Current admin page hook.
	 */
	public function enqueue_admin_assets( $hook_suffix ) {
		if ( strpos( $hook_suffix, 'wcrm' ) === false ) {
			return;
		}

		wp_enqueue_style(
			'wcrm-admin-css',
			WCRM_PLUGIN_URL . 'admin/assets/admin.css',
			array(),
			WCRM_VERSION
		);

		wp_enqueue_script(
			'wcrm-admin-js',
			WCRM_PLUGIN_URL . 'admin/assets/admin.js',
			array( 'jquery' ),
			WCRM_VERSION,
			true
		);

		wp_localize_script(
			'wcrm-admin-js',
			'wcrm_admin',
			array(
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'wcrm_admin_nonce' ),
				'confirm_delete' => __( 'Are you sure you want to delete this form?', 'wcrm' ),
			)
		);
	}

	/**
	 * Render All Forms page.
	 */
	public function render_forms_list_page() {
		$forms = Wcrm_DB::get_forms();
		include WCRM_PLUGIN_DIR . 'admin/views/forms-list.php';
	}

	/**
	 * Render Add/Edit Form page.
	 */
	public function render_form_editor_page() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$form_id = isset( $_GET['id'] ) ? intval( $_GET['id'] ) : 0;
		$form    = $form_id > 0 ? Wcrm_DB::get_form( $form_id ) : null;
		include WCRM_PLUGIN_DIR . 'admin/views/form-editor.php';
	}

	/**
	 * Render Settings page.
	 */
	public function render_settings_page() {
		$company_id = get_option( 'wcrm_company_id', '' );
		$api_url    = get_option( 'wcrm_api_url', WCRM_DEFAULT_API_URL );
		include WCRM_PLUGIN_DIR . 'admin/views/settings.php';
	}

	/**
	 * AJAX: Save or update a form.
	 */
	public function ajax_save_form() {
		check_ajax_referer( 'wcrm_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'Permission denied.', 'wcrm' ) ) );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$title    = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$id       = isset( $_POST['id'] ) ? intval( $_POST['id'] ) : 0;
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$fields_raw = isset( $_POST['fields'] ) ? json_decode( wp_unslash( $_POST['fields'] ), true ) : array();
		$fields     = is_array( $fields_raw ) ? map_deep( $fields_raw, 'sanitize_textarea_field' ) : array();
		
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$settings_raw = isset( $_POST['settings'] ) ? json_decode( wp_unslash( $_POST['settings'] ), true ) : array();
		$settings     = is_array( $settings_raw ) ? map_deep( $settings_raw, 'sanitize_textarea_field' ) : array();

		if ( empty( $title ) ) {
			wp_send_json_error( array( 'message' => __( 'Form title is required.', 'wcrm' ) ) );
		}

		if ( empty( $fields ) || ! is_array( $fields ) ) {
			wp_send_json_error( array( 'message' => __( 'At least one field is required.', 'wcrm' ) ) );
		}

		$saved_id = Wcrm_DB::save_form(
			array(
				'title'    => $title,
				'fields'   => $fields,
				'settings' => $settings,
			),
			$id
		);

		if ( $saved_id ) {
			wp_send_json_success(
				array(
					'id'      => $saved_id,
					'message' => __( 'Form saved successfully!', 'wcrm' ),
				)
			);
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to save form.', 'wcrm' ) ) );
		}
	}

	/**
	 * AJAX: Delete a form.
	 */
	public function ajax_delete_form() {
		check_ajax_referer( 'wcrm_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'Permission denied.', 'wcrm' ) ) );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$id = isset( $_POST['id'] ) ? intval( $_POST['id'] ) : 0;

		if ( $id <= 0 ) {
			wp_send_json_error( array( 'message' => __( 'Invalid form ID.', 'wcrm' ) ) );
		}

		$deleted = Wcrm_DB::delete_form( $id );

		if ( $deleted ) {
			wp_send_json_success( array( 'message' => __( 'Form deleted.', 'wcrm' ) ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to delete form.', 'wcrm' ) ) );
		}
	}

	/**
	 * AJAX: Test CRM Webhook Connection.
	 */
	public function ajax_test_connection() {
		check_ajax_referer( 'wcrm_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'Permission denied.', 'wcrm' ) ) );
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$company_id = isset( $_POST['company_id'] ) ? sanitize_text_field( wp_unslash( $_POST['company_id'] ) ) : get_option( 'wcrm_company_id' );
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$api_url    = isset( $_POST['api_url'] ) ? esc_url_raw( wp_unslash( $_POST['api_url'] ) ) : get_option( 'wcrm_api_url', WCRM_DEFAULT_API_URL );

		// Auto-correct app.wcrm.si to api.wcrm.si
		if ( strpos( $api_url, 'app.wcrm.si' ) !== false ) {
			$api_url = str_replace( 'app.wcrm.si', 'api.wcrm.si', $api_url );
			update_option( 'wcrm_api_url', $api_url );
		}

		if ( empty( $company_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Please enter your Company ID first.', 'wcrm' ) ) );
		}

		// Send a test payload using standard whitelisted DTO properties
		$payload = array(
			'companyId' => $company_id,
			'name'      => 'WordPress Plugin Test Lead',
			'phone'     => '+910000000000',
			'email'     => 'test-connection@wcrm.si',
			'message'   => '[WordPress Plugin Test Connection - Do Not Create Lead]',
		);

		$response = wp_remote_post(
			$api_url,
			array(
				'method'      => 'POST',
				'timeout'     => 15,
				'headers'     => array(
					'Content-Type' => 'application/json',
				),
				'body'        => wp_json_encode( $payload ),
				'data_format' => 'body',
			)
		);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( array( 'message' => 'Connection failed: ' . $response->get_error_message() ) );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );
		$data        = json_decode( $body, true );

		if ( $status_code === 201 || $status_code === 200 ) {
			wp_send_json_success( array( 'message' => __( 'Connection Successful! Your Company ID is verified and connected (no test lead created).', 'wcrm' ) ) );
		} else {
			$err_msg = isset( $data['message'] ) ? ( is_array( $data['message'] ) ? implode( ', ', $data['message'] ) : $data['message'] ) : 'HTTP ' . $status_code;
			if ( $status_code === 500 ) {
				$err_msg .= ' (' . __( 'Please verify that your Company ID is correct and exists in Wcrm.', 'wcrm' ) . ')';
			}
			wp_send_json_error( array( 'message' => 'CRM responded with error: ' . $err_msg ) );
		}
	}
}
