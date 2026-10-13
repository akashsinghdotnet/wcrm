<?php
/**
 * Database Management for Wcrm Lead Forms.
 *
 * @package Wcrm
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Wcrm_DB {

	/**
	 * Get table name with WordPress prefix.
	 */
	public static function get_table_name() {
		global $wpdb;
		return $wpdb->prefix . 'wcrm_forms';
	}

	/**
	 * Create database table on plugin activation.
	 */
	public static function create_table() {
		global $wpdb;
		$table_name = self::get_table_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE $table_name (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			title varchar(255) NOT NULL,
			fields longtext NOT NULL,
			settings longtext NOT NULL,
			views_count int(11) DEFAULT 0,
			submissions_count int(11) DEFAULT 0,
			created_at datetime DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY  (id)
		) $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	/**
	 * Get all forms.
	 */
	public static function get_forms() {
		global $wpdb;
		$table_name = self::get_table_name();
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$results = $wpdb->get_results( "SELECT * FROM {$table_name} ORDER BY created_at DESC", ARRAY_A );

		if ( ! $results ) {
			return array();
		}

		foreach ( $results as &$row ) {
			$row['fields']   = json_decode( $row['fields'], true );
			$row['settings'] = json_decode( $row['settings'], true );
		}

		return $results;
	}

	/**
	 * Get a single form by ID.
	 *
	 * @param int $id Form ID.
	 */
	public static function get_form( $id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table_name} WHERE id = %d", $id ), ARRAY_A );

		if ( ! $row ) {
			return null;
		}

		$row['fields']   = json_decode( $row['fields'], true );
		$row['settings'] = json_decode( $row['settings'], true );

		return $row;
	}

	/**
	 * Save a form (Insert or Update).
	 *
	 * @param array $data Form data array.
	 * @param int   $id   Optional form ID for updates.
	 */
	public static function save_form( $data, $id = 0 ) {
		global $wpdb;
		$table_name = self::get_table_name();

		$fields_json   = is_string( $data['fields'] ) ? $data['fields'] : wp_json_encode( $data['fields'] );
		$settings_json = is_string( $data['settings'] ) ? $data['settings'] : wp_json_encode( $data['settings'] );

		$row_data = array(
			'title'    => sanitize_text_field( $data['title'] ),
			'fields'   => $fields_json,
			'settings' => $settings_json,
		);

		$format = array( '%s', '%s', '%s' );

		if ( $id > 0 ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->update(
				$table_name,
				$row_data,
				array( 'id' => intval( $id ) ),
				$format,
				array( '%d' )
			);
			return intval( $id );
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->insert(
				$table_name,
				$row_data,
				$format
			);
			return $wpdb->insert_id;
		}
	}

	/**
	 * Delete a form by ID.
	 *
	 * @param int $id Form ID.
	 */
	public static function delete_form( $id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return $wpdb->delete(
			$table_name,
			array( 'id' => intval( $id ) ),
			array( '%d' )
		);
	}

	/**
	 * Increment form submissions count.
	 *
	 * @param int $id Form ID.
	 */
	public static function increment_submissions( $id ) {
		global $wpdb;
		$table_name = self::get_table_name();
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->query( $wpdb->prepare( "UPDATE {$table_name} SET submissions_count = submissions_count + 1 WHERE id = %d", $id ) );
	}
}
