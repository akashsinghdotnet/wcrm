<?php
/**
 * Public Controller & Shortcode Handler for Wcrm Lead Forms.
 *
 * @package Wcrm
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Wcrm_Public {

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_shortcode( 'wcrm_form', array( $this, 'render_shortcode' ) );

		add_action( 'wp_ajax_submit_wcrm_form', array( $this, 'ajax_submit_form' ) );
		add_action( 'wp_ajax_nopriv_submit_wcrm_form', array( $this, 'ajax_submit_form' ) );

		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );
	}

	/**
	 * Register frontend CSS/JS assets.
	 */
	public function register_assets() {
		wp_enqueue_style(
			'wcrm-form-css',
			WCRM_PLUGIN_URL . 'public/assets/css/form.css',
			array(),
			WCRM_VERSION
		);

		wp_enqueue_script(
			'wcrm-form-js',
			WCRM_PLUGIN_URL . 'public/assets/js/form.js',
			array( 'jquery' ),
			WCRM_VERSION,
			true
		);

		wp_localize_script(
			'wcrm-form-js',
			'wcrm_public',
			array(
				'ajax_url' => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'wcrm_public_nonce' ),
			)
		);
	}

	/**
	 * Render [wcrm_form id="1"] shortcode.
	 *
	 * @param array $atts Shortcode attributes.
	 */
	public function render_shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'id' => 0,
			),
			$atts,
			'wcrm_form'
		);

		$form_id = intval( $atts['id'] );
		if ( $form_id <= 0 ) {
			return '<p class="wcrm-form-error">' . esc_html__( 'Invalid Wcrm Form ID.', 'wcrm' ) . '</p>';
		}

		$form = Wcrm_DB::get_form( $form_id );
		if ( ! $form ) {
			return '<p class="wcrm-form-error">' . esc_html__( 'Wcrm Form not found.', 'wcrm' ) . '</p>';
		}

		$fields   = is_array( $form['fields'] ) ? $form['fields'] : array();
		$settings = is_array( $form['settings'] ) ? $form['settings'] : array();

		$button_text       = ! empty( $settings['button_text'] ) ? $settings['button_text'] : __( 'Submit', 'wcrm' );
		$button_color      = ! empty( $settings['button_color'] ) ? $settings['button_color'] : '#6366f1';
		$button_text_color = ! empty( $settings['button_text_color'] ) ? $settings['button_text_color'] : '#ffffff';
		$bg_color          = ! empty( $settings['bg_color'] ) ? $settings['bg_color'] : '#ffffff';
		$text_color        = ! empty( $settings['text_color'] ) ? $settings['text_color'] : '#0f172a';
		$border_color      = ! empty( $settings['border_color'] ) ? $settings['border_color'] : '#e2e8f0';
		$border_width      = isset( $settings['border_width'] ) ? $settings['border_width'] : '1px';
		$border_radius     = isset( $settings['border_radius'] ) ? $settings['border_radius'] : '12px';
		$field_bg_color    = ! empty( $settings['field_bg_color'] ) ? $settings['field_bg_color'] : '#f8fafc';
		$field_border_col  = ! empty( $settings['field_border_color'] ) ? $settings['field_border_color'] : '#cbd5e1';
		$field_text_col    = ! empty( $settings['field_text_color'] ) ? $settings['field_text_color'] : '#0f172a';

		$form_style  = "background-color: {$bg_color}; color: {$text_color}; ";
		$form_style .= '0px' === $border_width ? 'border: none; ' : "border: {$border_width} solid {$border_color}; ";
		$form_style .= "border-radius: {$border_radius}; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);";

		$input_style = "background-color: {$field_bg_color}; color: {$field_text_col}; border: 1px solid {$field_border_col}; border-radius: 6px;";

		ob_start();
		?>
		<div class="wcrm-form-wrapper" id="wcrm-form-wrapper-<?php echo intval( $form_id ); ?>">
			<form class="wcrm-lead-form" data-form-id="<?php echo intval( $form_id ); ?>" style="<?php echo esc_attr( $form_style ); ?>" novalidate>
				<input type="hidden" name="form_id" value="<?php echo intval( $form_id ); ?>" />

				<div class="wcrm-form-fields">
					<?php foreach ( $fields as $field ) : ?>
						<?php
						$field_id       = isset( $field['id'] ) ? $field['id'] : '';
						$field_label    = isset( $field['label'] ) ? $field['label'] : '';
						$field_type     = isset( $field['type'] ) ? $field['type'] : 'text';
						$field_required = ! empty( $field['required'] );
						$field_width    = ! empty( $field['width'] ) ? trim( strval( $field['width'] ) ) : '100%';
						$placeholder    = ! empty( $field['placeholder'] ) ? $field['placeholder'] : '';
						$options_str    = isset( $field['options'] ) ? $field['options'] : '';
						$options        = array_filter( array_map( 'trim', explode( ',', $options_str ) ) );

						$col_class   = 'wcrm-col-100';
						if ( '50%' === $field_width || '50' === $field_width ) {
							$col_class = 'wcrm-col-50';
						} elseif ( '33.3%' === $field_width || '33%' === $field_width || '33' === $field_width ) {
							$col_class = 'wcrm-col-33';
						} elseif ( '25%' === $field_width || '25' === $field_width ) {
							$col_class = 'wcrm-col-25';
						}
						?>
						<div class="wcrm-form-group wcrm-field-type-<?php echo esc_attr( $field_type ); ?> <?php echo esc_attr( $col_class ); ?>">
							<label for="wcrm-field-<?php echo intval( $form_id ); ?>-<?php echo esc_attr( $field_id ); ?>" style="color: <?php echo esc_attr( $text_color ); ?>;">
								<?php echo esc_html( $field_label ); ?>
								<?php if ( $field_required ) : ?>
									<span class="wcrm-required-mark">*</span>
								<?php endif; ?>
							</label>

							<?php if ( 'textarea' === $field_type ) : ?>
								<textarea
									id="wcrm-field-<?php echo intval( $form_id ); ?>-<?php echo esc_attr( $field_id ); ?>"
									name="<?php echo esc_attr( $field_id ); ?>"
									class="wcrm-input"
									style="<?php echo esc_attr( $input_style ); ?>"
									placeholder="<?php echo esc_attr( $placeholder ); ?>"
									rows="4"
									<?php echo $field_required ? 'required' : ''; ?>
								></textarea>

							<?php elseif ( 'select' === $field_type ) : ?>
								<select
									id="wcrm-field-<?php echo intval( $form_id ); ?>-<?php echo esc_attr( $field_id ); ?>"
									name="<?php echo esc_attr( $field_id ); ?>"
									class="wcrm-input"
									style="<?php echo esc_attr( $input_style ); ?>"
									<?php echo $field_required ? 'required' : ''; ?>
								>
									<option value=""><?php echo esc_html( $placeholder ? $placeholder : __( 'Select an option', 'wcrm' ) ); ?></option>
									<?php foreach ( $options as $opt ) : ?>
										<option value="<?php echo esc_attr( $opt ); ?>"><?php echo esc_html( $opt ); ?></option>
									<?php endforeach; ?>
								</select>

							<?php elseif ( 'radio' === $field_type ) : ?>
								<div class="wcrm-options-list">
									<?php foreach ( $options as $idx => $opt ) : ?>
										<label class="wcrm-radio-label" style="color: <?php echo esc_attr( $text_color ); ?>;">
											<input
												type="radio"
												name="<?php echo esc_attr( $field_id ); ?>"
												value="<?php echo esc_attr( $opt ); ?>"
												<?php echo ( 0 === $idx && $field_required ) ? 'required' : ''; ?>
											/>
											<?php echo esc_html( $opt ); ?>
										</label>
									<?php endforeach; ?>
								</div>

							<?php elseif ( 'checkbox' === $field_type ) : ?>
								<div class="wcrm-options-list">
									<?php foreach ( $options as $opt ) : ?>
										<label class="wcrm-checkbox-label" style="color: <?php echo esc_attr( $text_color ); ?>;">
											<input
												type="checkbox"
												name="<?php echo esc_attr( $field_id ); ?>[]"
												value="<?php echo esc_attr( $opt ); ?>"
											/>
											<?php echo esc_html( $opt ); ?>
										</label>
									<?php endforeach; ?>
								</div>

							<?php else : ?>
								<input
									type="<?php echo esc_attr( 'phone' === $field_type ? 'tel' : $field_type ); ?>"
									id="wcrm-field-<?php echo intval( $form_id ); ?>-<?php echo esc_attr( $field_id ); ?>"
									name="<?php echo esc_attr( $field_id ); ?>"
									class="wcrm-input"
									style="<?php echo esc_attr( $input_style ); ?>"
									placeholder="<?php echo esc_attr( $placeholder ); ?>"
									<?php echo $field_required ? 'required' : ''; ?>
								/>
							<?php endif; ?>
						</div>
					<?php endforeach; ?>
				</div>

				<div class="wcrm-submit-wrapper">
					<button
						type="submit"
						class="wcrm-submit-btn"
						style="background-color: <?php echo esc_attr( $button_color ); ?>; color: <?php echo esc_attr( $button_text_color ); ?>;"
					>
						<span class="wcrm-btn-text"><?php echo esc_html( $button_text ); ?></span>
						<span class="wcrm-spinner" style="display: none;"></span>
					</button>
				</div>

				<div class="wcrm-alert" style="display: none;"></div>
			</form>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * AJAX Handler for form submissions.
	 */
	public function ajax_submit_form() {
		check_ajax_referer( 'wcrm_public_nonce', 'nonce' );

		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$form_id = isset( $_POST['form_id'] ) ? intval( $_POST['form_id'] ) : 0;
		if ( $form_id <= 0 ) {
			wp_send_json_error( array( 'message' => __( 'Invalid form ID.', 'wcrm' ) ) );
		}

		$form = Wcrm_DB::get_form( $form_id );
		if ( ! $form ) {
			wp_send_json_error( array( 'message' => __( 'Form not found.', 'wcrm' ) ) );
		}

		$company_id = get_option( 'wcrm_company_id', '' );
		$api_url    = get_option( 'wcrm_api_url', WCRM_DEFAULT_API_URL );

		// Auto-correct app.wcrm.si to api.wcrm.si
		if ( strpos( $api_url, 'app.wcrm.si' ) !== false ) {
			$api_url = str_replace( 'app.wcrm.si', 'api.wcrm.si', $api_url );
			update_option( 'wcrm_api_url', $api_url );
		}

		if ( empty( $company_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Wcrm Company ID is not configured by the administrator.', 'wcrm' ) ) );
		}

		$fields     = is_array( $form['fields'] ) ? $form['fields'] : array();
		$settings   = is_array( $form['settings'] ) ? $form['settings'] : array();
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
		$form_data_raw = isset( $_POST['data'] ) ? (array) $_POST['data'] : array();
		$form_data     = map_deep( wp_unslash( $form_data_raw ), 'sanitize_textarea_field' );

		// Extract standard fields & accumulate custom fields
		$name          = '';
		$email         = '';
		$phone         = '';
		$custom_lines  = array();

		foreach ( $fields as $field ) {
			$fid      = $field['id'];
			$flabel   = $field['label'];
			$ftype    = $field['type'];
			$fval     = isset( $form_data[ $fid ] ) ? $form_data[ $fid ] : '';

			if ( is_array( $fval ) ) {
				$fval_str = implode( ', ', array_map( 'sanitize_text_field', $fval ) );
			} else {
				$fval_str = sanitize_text_field( $fval );
			}

			// Validate required
			if ( ! empty( $field['required'] ) && '' === $fval_str ) {
				wp_send_json_error(
					array(
						'message' => sprintf(
							/* translators: %s: Field label */
							__( 'Please fill out the required field: %s', 'wcrm' ),
							$flabel
						),
					)
				);
			}

			// Check if standard field
			$lower_label = strtolower( $flabel );
			if ( empty( $name ) && ( 'name' === $lower_label || 'full name' === $lower_label || 'your name' === $lower_label || ( 'text' === $ftype && '' === $name ) ) ) {
				$name = $fval_str;
			} elseif ( empty( $email ) && ( 'email' === $ftype || 'email' === $lower_label || 'email address' === $lower_label ) ) {
				$email = $fval_str;
			} elseif ( empty( $phone ) && ( 'phone' === $ftype || 'phone number' === $lower_label || 'mobile' === $lower_label || 'contact number' === $lower_label ) ) {
				$phone = $fval_str;
			} else {
				// Custom field -> add to notes/message
				if ( '' !== $fval_str ) {
					$custom_lines[] = "{$flabel}: {$fval_str}";
				}
			}
		}

		if ( empty( $name ) ) {
			$name = __( 'Website Visitor', 'wcrm' );
		}

		// Compose message body
		$notes_body = '';
		if ( ! empty( $custom_lines ) ) {
			$notes_body .= implode( "\n", $custom_lines ) . "\n---\n";
		}
		$notes_body .= sprintf(
			/* translators: %s: Form title */
			__( "[Submitted via WordPress Form: '%s']", 'wcrm' ),
			$form['title']
		);

		// Prepare payload for Wcrm backend
		$payload = array(
			'companyId' => $company_id,
			'name'      => $name,
			'phone'     => $phone,
			'email'     => $email,
			'message'   => $notes_body,
		);

		// Send to CRM Webhook
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
			wp_send_json_error( array( 'message' => __( 'Could not connect to Wcrm server. Please try again later.', 'wcrm' ) ) );
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		if ( $status_code === 200 || $status_code === 201 ) {
			// Increment submissions count
			Wcrm_DB::increment_submissions( $form_id );

			$success_msg = ! empty( $settings['success_message'] )
				? $settings['success_message']
				: __( 'Thank you! We have received your inquiry.', 'wcrm' );

			wp_send_json_success( array( 'message' => $success_msg ) );
		} else {
			$body = wp_remote_retrieve_body( $response );
			$data = json_decode( $body, true );
			$err  = isset( $data['message'] ) ? $data['message'] : __( 'Submission failed.', 'wcrm' );
			wp_send_json_error( array( 'message' => $err ) );
		}
	}
}
