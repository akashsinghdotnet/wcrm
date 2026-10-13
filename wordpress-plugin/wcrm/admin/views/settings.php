<?php
/**
 * Admin Settings View.
 *
 * @package Wcrm
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>
<div class="wrap wcrm-admin-wrap">
	<h1 class="wcrm-page-title">
		<span class="dashicons dashicons-networking"></span> <?php esc_html_e( 'Wcrm Settings', 'wcrm' ); ?>
	</h1>

	<?php
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
	if ( isset( $_GET['settings-updated'] ) && $_GET['settings-updated'] ) :
	?>
		<div class="wcrm-notice success mb-4">
			<strong>✔ <?php esc_html_e( 'Settings saved successfully!', 'wcrm' ); ?></strong>
			<?php esc_html_e( 'Your Company ID and CRM Webhook URL have been updated and are active.', 'wcrm' ); ?>
		</div>
	<?php endif; ?>

	<div class="wcrm-card">
		<form method="post" action="options.php" id="wcrm-settings-form">
			<?php
			settings_fields( 'wcrm_settings_group' );
			do_settings_sections( 'wcrm_settings_group' );
			?>

			<table class="form-table">
				<tr valign="top">
					<th scope="row">
						<label for="wcrm_company_id"><?php esc_html_e( 'Company ID', 'wcrm' ); ?></label>
					</th>
					<td>
						<input type="text" id="wcrm_company_id" name="wcrm_company_id" value="<?php echo esc_attr( $company_id ); ?>" class="regular-text" placeholder="e.g. 1f8e6c4a-..." required />
						<p class="description">
							<?php esc_html_e( 'Enter your Wcrm Company ID. You can find this in your Wcrm profile or admin settings.', 'wcrm' ); ?>
						</p>
					</td>
				</tr>

				<tr valign="top">
					<th scope="row">
						<label for="wcrm_api_url"><?php esc_html_e( 'CRM Webhook URL', 'wcrm' ); ?></label>
					</th>
					<td>
						<input type="url" id="wcrm_api_url" name="wcrm_api_url" value="<?php echo esc_url( $api_url ); ?>" class="regular-text" required />
						<p class="description">
							<?php esc_html_e( 'Default is https://api.wcrm.si/api/webhooks/website. Change only if using a custom server domain.', 'wcrm' ); ?>
						</p>
					</td>
				</tr>
			</table>

			<div class="wcrm-button-row">
				<?php submit_button( __( 'Save Settings', 'wcrm' ), 'primary', 'submit', false ); ?>
				
				<button type="button" id="wcrm-test-connection-btn" class="button button-secondary">
					<?php esc_html_e( 'Test Connection', 'wcrm' ); ?>
				</button>
			</div>
		</form>

		<div id="wcrm-connection-status" class="wcrm-notice" style="display: none;"></div>
	</div>

	<div class="wcrm-card mt-4">
		<h2><?php esc_html_e( 'How to display forms on your website', 'wcrm' ); ?></h2>
		<p><?php esc_html_e( '1. Go to the "All Forms" menu and create a custom lead form.', 'wcrm' ); ?></p>
		<p><?php esc_html_e( '2. Copy the generated shortcode (e.g., [wcrm_form id="1"]).', 'wcrm' ); ?></p>
		<p><?php esc_html_e( '3. Paste the shortcode into any WordPress Page, Post, Widget, Elementor, or Gutenberg Shortcode block.', 'wcrm' ); ?></p>
	</div>
</div>
