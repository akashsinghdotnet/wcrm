<?php
/**
 * Admin Form Editor / Builder View with Advanced Styling & Column Widths.
 *
 * @package Wcrm
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

$is_edit     = ! empty( $form ) && ! empty( $form['id'] );
$form_id     = $is_edit ? intval( $form['id'] ) : 0;
$form_title  = $is_edit ? $form['title'] : '';
$form_fields = $is_edit && is_array( $form['fields'] ) ? $form['fields'] : array(
	array(
		'id'          => 'name',
		'type'        => 'text',
		'label'       => __( 'Full Name', 'wcrm' ),
		'placeholder' => __( 'Enter your full name', 'wcrm' ),
		'required'    => true,
		'width'       => '100%',
		'options'     => '',
	),
	array(
		'id'          => 'phone',
		'type'        => 'phone',
		'label'       => __( 'Phone Number', 'wcrm' ),
		'placeholder' => __( '+1 (555) 000-0000', 'wcrm' ),
		'required'    => true,
		'width'       => '50%',
		'options'     => '',
	),
	array(
		'id'          => 'email',
		'type'        => 'email',
		'label'       => __( 'Email Address', 'wcrm' ),
		'placeholder' => __( 'name@example.com', 'wcrm' ),
		'required'    => false,
		'width'       => '50%',
		'options'     => '',
	),
	array(
		'id'          => 'message',
		'type'        => 'textarea',
		'label'       => __( 'Message / Requirements', 'wcrm' ),
		'placeholder' => __( 'How can we help you?', 'wcrm' ),
		'required'    => false,
		'width'       => '100%',
		'options'     => '',
	),
);

$default_settings = array(
	'button_text'        => __( 'Submit', 'wcrm' ),
	'button_color'       => '#6366f1',
	'button_text_color'  => '#ffffff',
	'bg_color'           => '#ffffff',
	'text_color'         => '#0f172a',
	'border_color'       => '#e2e8f0',
	'border_width'       => '1px',
	'border_radius'      => '12px',
	'field_bg_color'     => '#f8fafc',
	'field_border_color' => '#cbd5e1',
	'field_text_color'   => '#0f172a',
	'success_message'    => __( 'Thank you! We have received your inquiry and will contact you shortly.', 'wcrm' ),
);

$form_settings = $is_edit && is_array( $form['settings'] ) ? array_merge( $default_settings, $form['settings'] ) : $default_settings;
?>
<div class="wrap wcrm-admin-wrap">
	<h1 class="wcrm-page-title">
		<?php echo $is_edit ? esc_html__( 'Edit Lead Form', 'wcrm' ) : esc_html__( 'Create New Lead Form', 'wcrm' ); ?>
		<a href="<?php echo esc_url( admin_url( 'admin.php?page=wcrm-forms' ) ); ?>" class="page-title-action">
			<?php esc_html_e( '← Back to All Forms', 'wcrm' ); ?>
		</a>
	</h1>

	<div class="wcrm-editor-layout">
		<!-- LEFT COLUMN: BUILDER & SETTINGS -->
		<div class="wcrm-editor-main">
			<input type="hidden" id="wcrm-form-id" value="<?php echo intval( $form_id ); ?>" />

			<div class="wcrm-card compact-card">
				<h2><?php esc_html_e( 'Form Title', 'wcrm' ); ?></h2>
				<input type="text" id="wcrm-form-title" value="<?php echo esc_attr( $form_title ); ?>" placeholder="<?php esc_attr_e( 'e.g. Website Contact Form', 'wcrm' ); ?>" class="regular-text widefat" />
				<p class="description"><?php esc_html_e( 'This title is for your internal identification.', 'wcrm' ); ?></p>
			</div>

			<div class="wcrm-card mt-4">
				<div class="wcrm-card-header">
					<h2><?php esc_html_e( 'Form Fields & Layout Columns', 'wcrm' ); ?></h2>
					<button type="button" id="wcrm-add-field-btn" class="button button-secondary">
						<span class="dashicons dashicons-plus-alt2"></span> <?php esc_html_e( 'Add Custom Field', 'wcrm' ); ?>
					</button>
				</div>
				<p class="description"><?php esc_html_e( 'Arrange fields into columns (e.g. set two fields to 50% to place them side by side). Custom field selections map automatically to your CRM lead notes!', 'wcrm' ); ?></p>

				<div id="wcrm-fields-list" class="wcrm-fields-list mt-4">
					<?php foreach ( $form_fields as $index => $field ) : ?>
						<?php
						$f_width       = isset( $field['width'] ) ? trim( strval( $field['width'] ) ) : '100%';
						if ( '50' === $f_width ) { $f_width = '50%'; }
						if ( '33' === $f_width || '33.3' === $f_width ) { $f_width = '33.3%'; }
						if ( '25' === $f_width ) { $f_width = '25%'; }
						$f_placeholder = isset( $field['placeholder'] ) ? $field['placeholder'] : '';
						?>
						<div class="wcrm-field-row" data-index="<?php echo intval( $index ); ?>">
							<div class="wcrm-field-drag-handle">
								<span class="dashicons dashicons-menu"></span>
							</div>
							<div class="wcrm-field-content">
								<div class="wcrm-field-grid">
									<div>
										<label><?php esc_html_e( 'Field Label', 'wcrm' ); ?></label>
										<input type="text" class="field-label" value="<?php echo esc_attr( $field['label'] ); ?>" required />
									</div>
									<div>
										<label><?php esc_html_e( 'Field Type', 'wcrm' ); ?></label>
										<select class="field-type">
											<option value="text" <?php selected( $field['type'], 'text' ); ?>><?php esc_html_e( 'Text (Single Line)', 'wcrm' ); ?></option>
											<option value="email" <?php selected( $field['type'], 'email' ); ?>><?php esc_html_e( 'Email', 'wcrm' ); ?></option>
											<option value="phone" <?php selected( $field['type'], 'phone' ); ?>><?php esc_html_e( 'Phone', 'wcrm' ); ?></option>
											<option value="textarea" <?php selected( $field['type'], 'textarea' ); ?>><?php esc_html_e( 'Textarea (Multi Line)', 'wcrm' ); ?></option>
											<option value="select" <?php selected( $field['type'], 'select' ); ?>><?php esc_html_e( 'Dropdown Menu', 'wcrm' ); ?></option>
											<option value="radio" <?php selected( $field['type'], 'radio' ); ?>><?php esc_html_e( 'Radio Buttons', 'wcrm' ); ?></option>
											<option value="checkbox" <?php selected( $field['type'], 'checkbox' ); ?>><?php esc_html_e( 'Checkboxes', 'wcrm' ); ?></option>
										</select>
									</div>
									<div>
										<label><?php esc_html_e( 'Column Width', 'wcrm' ); ?></label>
										<select class="field-width">
											<option value="100%" <?php selected( $f_width, '100%' ); ?>><?php esc_html_e( '100% (Full Width - 1 Col)', 'wcrm' ); ?></option>
											<option value="50%" <?php selected( $f_width, '50%' ); ?>><?php esc_html_e( '50% (Half Width - 2 Cols)', 'wcrm' ); ?></option>
											<option value="33.3%" <?php selected( $f_width, '33.3%' ); ?>><?php esc_html_e( '33.3% (One Third - 3 Cols)', 'wcrm' ); ?></option>
											<option value="25%" <?php selected( $f_width, '25%' ); ?>><?php esc_html_e( '25% (One Fourth - 4 Cols)', 'wcrm' ); ?></option>
										</select>
									</div>
									<div class="wcrm-checkbox-col">
										<label>
											<input type="checkbox" class="field-required" <?php checked( ! empty( $field['required'] ) ); ?> />
											<?php esc_html_e( 'Required', 'wcrm' ); ?>
										</label>
									</div>
								</div>
								<button type="button" class="button wcrm-remove-field-btn" title="<?php esc_attr_e( 'Remove Field', 'wcrm' ); ?>">
									<span class="dashicons dashicons-trash"></span>
								</button>

								<div class="wcrm-field-grid-sub mt-2">
									<div>
										<label><?php esc_html_e( 'Placeholder Text', 'wcrm' ); ?></label>
										<input type="text" class="field-placeholder" value="<?php echo esc_attr( $f_placeholder ); ?>" placeholder="<?php esc_attr_e( 'e.g. Enter value...', 'wcrm' ); ?>" />
									</div>
									<div class="wcrm-field-options-wrap" style="<?php echo in_array( $field['type'], array( 'select', 'radio', 'checkbox' ), true ) ? '' : 'display: none;'; ?>">
										<label><?php esc_html_e( 'Options (Comma separated)', 'wcrm' ); ?></label>
										<input type="text" class="field-options" value="<?php echo esc_attr( isset( $field['options'] ) ? $field['options'] : '' ); ?>" placeholder="e.g. Web Design, SEO, Cloud Hosting" />
									</div>
								</div>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>

			<div class="wcrm-card mt-4">
				<h2><?php esc_html_e( 'Advanced Form Styling & Color Palette', 'wcrm' ); ?></h2>
				<p class="description mb-3"><?php esc_html_e( 'Customize every visual aspect of your embedded form. Changes appear instantly in the Live Preview!', 'wcrm' ); ?></p>
				
				<div class="wcrm-styling-grid">
					<!-- Form Box Colors -->
					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Form Background Color', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-bg-color" value="<?php echo esc_attr( $form_settings['bg_color'] ); ?>" />
							<input type="text" id="wcrm-bg-color-hex" value="<?php echo esc_attr( $form_settings['bg_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Form Text Color (Labels)', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-text-color" value="<?php echo esc_attr( $form_settings['text_color'] ); ?>" />
							<input type="text" id="wcrm-text-color-hex" value="<?php echo esc_attr( $form_settings['text_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Form Border Color', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-border-color" value="<?php echo esc_attr( $form_settings['border_color'] ); ?>" />
							<input type="text" id="wcrm-border-color-hex" value="<?php echo esc_attr( $form_settings['border_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Form Border Width', 'wcrm' ); ?></label>
						<select id="wcrm-border-width" class="widefat">
							<option value="0px" <?php selected( $form_settings['border_width'], '0px' ); ?>>0px (No Border)</option>
							<option value="1px" <?php selected( $form_settings['border_width'], '1px' ); ?>>1px (Thin)</option>
							<option value="2px" <?php selected( $form_settings['border_width'], '2px' ); ?>>2px (Medium)</option>
							<option value="3px" <?php selected( $form_settings['border_width'], '3px' ); ?>>3px (Bold)</option>
						</select>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Form Border Radius', 'wcrm' ); ?></label>
						<select id="wcrm-border-radius" class="widefat">
							<option value="0px" <?php selected( $form_settings['border_radius'], '0px' ); ?>>0px (Square)</option>
							<option value="8px" <?php selected( $form_settings['border_radius'], '8px' ); ?>>8px (Subtle Rounded)</option>
							<option value="12px" <?php selected( $form_settings['border_radius'], '12px' ); ?>>12px (Modern Rounded)</option>
							<option value="16px" <?php selected( $form_settings['border_radius'], '16px' ); ?>>16px (Pill Rounded)</option>
							<option value="24px" <?php selected( $form_settings['border_radius'], '24px' ); ?>>24px (Extra Rounded)</option>
						</select>
					</div>

					<!-- Field Input Colors -->
					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Field Background Color', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-field-bg-color" value="<?php echo esc_attr( $form_settings['field_bg_color'] ); ?>" />
							<input type="text" id="wcrm-field-bg-color-hex" value="<?php echo esc_attr( $form_settings['field_bg_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Field Border Color', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-field-border-color" value="<?php echo esc_attr( $form_settings['field_border_color'] ); ?>" />
							<input type="text" id="wcrm-field-border-color-hex" value="<?php echo esc_attr( $form_settings['field_border_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Field Text Color', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-field-text-color" value="<?php echo esc_attr( $form_settings['field_text_color'] ); ?>" />
							<input type="text" id="wcrm-field-text-color-hex" value="<?php echo esc_attr( $form_settings['field_text_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<!-- Button Colors -->
					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Submit Button Background', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-button-color" value="<?php echo esc_attr( $form_settings['button_color'] ); ?>" />
							<input type="text" id="wcrm-button-color-hex" value="<?php echo esc_attr( $form_settings['button_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Submit Button Text Color', 'wcrm' ); ?></label>
						<div class="wcrm-color-picker-wrap">
							<input type="color" id="wcrm-button-text-color" value="<?php echo esc_attr( $form_settings['button_text_color'] ); ?>" />
							<input type="text" id="wcrm-button-text-color-hex" value="<?php echo esc_attr( $form_settings['button_text_color'] ); ?>" class="regular-text code" />
						</div>
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Submit Button Label', 'wcrm' ); ?></label>
						<input type="text" id="wcrm-button-text" value="<?php echo esc_attr( $form_settings['button_text'] ); ?>" class="regular-text widefat" />
					</div>

					<div class="wcrm-style-group">
						<label><?php esc_html_e( 'Success Message Text', 'wcrm' ); ?></label>
						<input type="text" id="wcrm-success-message" value="<?php echo esc_attr( $form_settings['success_message'] ); ?>" class="regular-text widefat" />
					</div>
				</div>
			</div>

			<div class="wcrm-button-row mt-4 mb-4">
				<button type="button" id="wcrm-save-form-btn" class="button button-primary button-large">
					<?php echo $is_edit ? esc_html__( 'Update Form', 'wcrm' ) : esc_html__( 'Save Form', 'wcrm' ); ?>
				</button>
			</div>

			<div id="wcrm-editor-status" class="wcrm-notice mt-4" style="display: none;"></div>
		</div>

		<!-- RIGHT COLUMN: LIVE INTERACTIVE PREVIEW -->
		<div class="wcrm-editor-sidebar">
			<div class="wcrm-card wcrm-sticky-preview">
				<div class="wcrm-card-header">
					<h2><?php esc_html_e( 'Live Form Preview', 'wcrm' ); ?></h2>
					<span class="wcrm-badge"><?php esc_html_e( 'Real-Time Layout', 'wcrm' ); ?></span>
				</div>
				<p class="description mb-3"><?php esc_html_e( 'This shows how your columns, colors, and borders will appear on your website.', 'wcrm' ); ?></p>
				
				<div id="wcrm-live-preview-box" class="wcrm-lead-form">
					<div id="wcrm-preview-fields" class="wcrm-form-fields">
						<!-- Dynamically populated by JS -->
					</div>
					<div class="wcrm-submit-wrapper">
						<button type="button" id="wcrm-preview-submit-btn" class="wcrm-submit-btn">
							<span class="wcrm-btn-text">Submit</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Template for cloning new fields -->
<template id="wcrm-field-template">
	<div class="wcrm-field-row">
		<div class="wcrm-field-drag-handle">
			<span class="dashicons dashicons-menu"></span>
		</div>
		<div class="wcrm-field-content">
			<div class="wcrm-field-grid">
				<div>
					<label><?php esc_html_e( 'Field Label', 'wcrm' ); ?></label>
					<input type="text" class="field-label" value="New Field" required />
				</div>
				<div>
					<label><?php esc_html_e( 'Field Type', 'wcrm' ); ?></label>
					<select class="field-type">
						<option value="text"><?php esc_html_e( 'Text (Single Line)', 'wcrm' ); ?></option>
						<option value="email"><?php esc_html_e( 'Email', 'wcrm' ); ?></option>
						<option value="phone"><?php esc_html_e( 'Phone', 'wcrm' ); ?></option>
						<option value="textarea"><?php esc_html_e( 'Textarea (Multi Line)', 'wcrm' ); ?></option>
						<option value="select"><?php esc_html_e( 'Dropdown Menu', 'wcrm' ); ?></option>
						<option value="radio"><?php esc_html_e( 'Radio Buttons', 'wcrm' ); ?></option>
						<option value="checkbox"><?php esc_html_e( 'Checkboxes', 'wcrm' ); ?></option>
					</select>
				</div>
				<div>
					<label><?php esc_html_e( 'Column Width', 'wcrm' ); ?></label>
					<select class="field-width">
						<option value="100%"><?php esc_html_e( '100% (Full Width - 1 Col)', 'wcrm' ); ?></option>
						<option value="50%"><?php esc_html_e( '50% (Half Width - 2 Cols)', 'wcrm' ); ?></option>
						<option value="33.3%"><?php esc_html_e( '33.3% (One Third - 3 Cols)', 'wcrm' ); ?></option>
						<option value="25%"><?php esc_html_e( '25% (One Fourth - 4 Cols)', 'wcrm' ); ?></option>
					</select>
				</div>
				<div class="wcrm-checkbox-col">
					<label>
						<input type="checkbox" class="field-required" />
						<?php esc_html_e( 'Required', 'wcrm' ); ?>
					</label>
				</div>
			</div>
			<button type="button" class="button wcrm-remove-field-btn" title="<?php esc_attr_e( 'Remove Field', 'wcrm' ); ?>">
				<span class="dashicons dashicons-trash"></span>
			</button>

			<div class="wcrm-field-grid-sub mt-2">
				<div>
					<label><?php esc_html_e( 'Placeholder Text', 'wcrm' ); ?></label>
					<input type="text" class="field-placeholder" value="" placeholder="<?php esc_attr_e( 'e.g. Enter value...', 'wcrm' ); ?>" />
				</div>
				<div class="wcrm-field-options-wrap" style="display: none;">
					<label><?php esc_html_e( 'Options (Comma separated)', 'wcrm' ); ?></label>
					<input type="text" class="field-options" value="" placeholder="e.g. Option 1, Option 2, Option 3" />
				</div>
			</div>
		</div>
	</div>
</template>
