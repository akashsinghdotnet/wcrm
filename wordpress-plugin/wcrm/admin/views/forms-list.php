<?php
/**
 * Admin Forms List View.
 *
 * @package Wcrm
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
?>
<div class="wrap wcrm-admin-wrap">
	<h1 class="wp-heading-inline">
		<span class="dashicons dashicons-list-view"></span> <?php esc_html_e( 'All Forms', 'wcrm' ); ?>
	</h1>
	<a href="<?php echo esc_url( admin_url( 'admin.php?page=wcrm-form-editor' ) ); ?>" class="page-title-action">
		<?php esc_html_e( 'Add New Form', 'wcrm' ); ?>
	</a>
	<hr class="wp-header-end">

	<?php if ( empty( $forms ) ) : ?>
		<div class="wcrm-empty-state">
			<span class="dashicons dashicons-welcome-add-page"></span>
			<h2><?php esc_html_e( 'No lead forms created yet', 'wcrm' ); ?></h2>
			<p><?php esc_html_e( 'Create your first custom form to start capturing leads directly into your Wcrm dashboard.', 'wcrm' ); ?></p>
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=wcrm-form-editor' ) ); ?>" class="button button-primary button-large">
				<?php esc_html_e( 'Create First Form', 'wcrm' ); ?>
			</a>
		</div>
	<?php else : ?>
		<table class="wp-list-table widefat fixed striped table-view-list">
			<thead>
				<tr>
					<th class="manage-column column-title"><?php esc_html_e( 'Form Title', 'wcrm' ); ?></th>
					<th class="manage-column"><?php esc_html_e( 'Shortcode', 'wcrm' ); ?></th>
					<th class="manage-column"><?php esc_html_e( 'Fields Count', 'wcrm' ); ?></th>
					<th class="manage-column"><?php esc_html_e( 'Submissions', 'wcrm' ); ?></th>
					<th class="manage-column"><?php esc_html_e( 'Created On', 'wcrm' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $forms as $form ) : ?>
					<?php
					$edit_url   = admin_url( 'admin.php?page=wcrm-form-editor&id=' . intval( $form['id'] ) );
					$shortcode  = '[wcrm_form id="' . intval( $form['id'] ) . '"]';
					$field_cnt  = is_array( $form['fields'] ) ? count( $form['fields'] ) : 0;
					$date_str   = date_i18n( get_option( 'date_format' ), strtotime( $form['created_at'] ) );
					?>
					<tr id="wcrm-form-row-<?php echo intval( $form['id'] ); ?>">
						<td class="title column-title has-row-actions">
							<strong><a href="<?php echo esc_url( $edit_url ); ?>"><?php echo esc_html( $form['title'] ); ?></a></strong>
							<div class="row-actions">
								<span class="edit">
									<a href="<?php echo esc_url( $edit_url ); ?>"><?php esc_html_e( 'Edit', 'wcrm' ); ?></a> |
								</span>
								<span class="delete">
									<a href="#" class="wcrm-delete-form-link text-danger" data-id="<?php echo intval( $form['id'] ); ?>"><?php esc_html_e( 'Delete', 'wcrm' ); ?></a>
								</span>
							</div>
						</td>
						<td>
							<div class="wcrm-shortcode-box">
								<input type="text" readonly value="<?php echo esc_attr( $shortcode ); ?>" class="wcrm-shortcode-input" onclick="this.select();" />
								<button type="button" class="button button-small wcrm-copy-shortcode-btn" data-shortcode="<?php echo esc_attr( $shortcode ); ?>">
									<?php esc_html_e( 'Copy', 'wcrm' ); ?>
								</button>
							</div>
						</td>
						<td><?php echo intval( $field_cnt ); ?></td>
						<td><?php echo intval( $form['submissions_count'] ); ?></td>
						<td><?php echo esc_html( $date_str ); ?></td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
	<?php endif; ?>
</div>
