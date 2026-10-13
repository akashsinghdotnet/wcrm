/**
 * Admin Interactive Script for Wcrm Lead Forms.
 * Includes Real-Time Live Preview & Multi-Column Width Builder.
 */

(function ($) {
	'use strict';

	$(document).ready(function () {

		/* ========================================================
		 * 1. Test Webhook Connection
		 * ======================================================== */
		$('#wcrm-test-connection-btn').on('click', function (e) {
			e.preventDefault();
			const $btn = $(this);
			const companyId = $('#wcrm_company_id').val().trim();
			const apiUrl = $('#wcrm_api_url').val().trim();
			const $status = $('#wcrm-connection-status');

			if (!companyId) {
				alert('Please enter your Company ID first.');
				return;
			}

			$btn.prop('disabled', true).text('Testing...');
			$status.hide().removeClass('success error');

			$.ajax({
				url: wcrm_admin.ajax_url,
				type: 'POST',
				data: {
					action: 'wcrm_test_connection',
					nonce: wcrm_admin.nonce,
					company_id: companyId,
					api_url: apiUrl
				},
				success: function (res) {
					$btn.prop('disabled', false).text('Test Connection');
					if (res.success) {
						$status.addClass('success').text(res.data.message).fadeIn();
					} else {
						$status.addClass('error').text(res.data.message || 'Connection failed.').fadeIn();
					}
				},
				error: function (xhr) {
					$btn.prop('disabled', false).text('Test Connection');
					$status.addClass('error').text('AJAX error: Could not reach WordPress backend.').fadeIn();
				}
			});
		});

		/* ========================================================
		 * 2. Dynamic Form Builder - Add / Remove Fields
		 * ======================================================== */
		$('#wcrm-add-field-btn').on('click', function (e) {
			e.preventDefault();
			const templateHtml = $('#wcrm-field-template').html();
			if (templateHtml) {
				$('#wcrm-fields-list').append(templateHtml);
				updateLivePreview();
			}
		});

		$(document).on('click', '.wcrm-remove-field-btn', function (e) {
			e.preventDefault();
			if ($('#wcrm-fields-list .wcrm-field-row').length <= 1) {
				alert('A form must have at least one field.');
				return;
			}
			$(this).closest('.wcrm-field-row').remove();
			updateLivePreview();
		});

		$(document).on('change', '.field-type', function () {
			const type = $(this).val();
			const $row = $(this).closest('.wcrm-field-row');
			const $optionsWrap = $row.find('.wcrm-field-options-wrap');

			if (['select', 'radio', 'checkbox'].indexOf(type) !== -1) {
				$optionsWrap.slideDown(200);
			} else {
				$optionsWrap.slideUp(200);
			}
			updateLivePreview();
		});

		$(document).on('input change', '.field-label, .field-width, .field-required, .field-placeholder, .field-options', function () {
			updateLivePreview();
		});

		/* ========================================================
		 * 3. Color Picker Hex Input Sync & Preview
		 * ======================================================== */
		function bindColorSync(pickerId, hexId) {
			$(pickerId).on('input change', function () {
				$(hexId).val($(this).val());
				updateLivePreview();
			});
			$(hexId).on('input change', function () {
				const val = $(this).val().trim();
				if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
					$(pickerId).val(val);
					updateLivePreview();
				}
			});
		}

		bindColorSync('#wcrm-bg-color', '#wcrm-bg-color-hex');
		bindColorSync('#wcrm-text-color', '#wcrm-text-color-hex');
		bindColorSync('#wcrm-border-color', '#wcrm-border-color-hex');
		bindColorSync('#wcrm-field-bg-color', '#wcrm-field-bg-color-hex');
		bindColorSync('#wcrm-field-border-color', '#wcrm-field-border-color-hex');
		bindColorSync('#wcrm-field-text-color', '#wcrm-field-text-color-hex');
		bindColorSync('#wcrm-button-color', '#wcrm-button-color-hex');
		bindColorSync('#wcrm-button-text-color', '#wcrm-button-text-color-hex');

		$('#wcrm-border-width, #wcrm-border-radius, #wcrm-button-text').on('input change', function () {
			updateLivePreview();
		});

		/* ========================================================
		 * 4. Real-Time Live Form Preview Render
		 * ======================================================== */
		function updateLivePreview() {
			if (!$('#wcrm-live-preview-box').length) return;

			const bgColor         = $('#wcrm-bg-color').val() || '#ffffff';
			const textColor       = $('#wcrm-text-color').val() || '#0f172a';
			const borderColor     = $('#wcrm-border-color').val() || '#e2e8f0';
			const borderWidth     = $('#wcrm-border-width').val() || '1px';
			const borderRadius    = $('#wcrm-border-radius').val() || '12px';
			const fieldBgColor    = $('#wcrm-field-bg-color').val() || '#f8fafc';
			const fieldBorderCol  = $('#wcrm-field-border-color').val() || '#cbd5e1';
			const fieldTextColor  = $('#wcrm-field-text-color').val() || '#0f172a';
			const btnColor        = $('#wcrm-button-color').val() || '#6366f1';
			const btnTextColor    = $('#wcrm-button-text-color').val() || '#ffffff';
			const btnText         = $('#wcrm-button-text').val() || 'Submit';

			// Style Preview Container
			const $previewBox = $('#wcrm-live-preview-box');
			$previewBox.css({
				'background-color': bgColor,
				'color': textColor,
				'border': borderWidth === '0px' ? 'none' : borderWidth + ' solid ' + borderColor,
				'border-radius': borderRadius,
				'padding': '24px',
				'box-shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
			});

			// Style Button
			const $previewBtn = $('#wcrm-preview-submit-btn');
			$previewBtn.css({
				'background-color': btnColor,
				'color': btnTextColor,
				'border': 'none',
				'border-radius': borderRadius === '0px' ? '0px' : '8px',
				'padding': '12px 24px',
				'font-weight': '600',
				'cursor': 'pointer',
				'width': '100%'
			});
			$previewBtn.find('.wcrm-btn-text').text(btnText);

			// Render Fields
			const $fieldsContainer = $('#wcrm-preview-fields');
			$fieldsContainer.empty().css({
				'display': 'flex',
				'flex-wrap': 'wrap',
				'gap': '14px',
				'margin-bottom': '20px'
			});

			$('#wcrm-fields-list .wcrm-field-row').each(function () {
				const label       = $(this).find('.field-label').val() || 'Field';
				const type        = $(this).find('.field-type').val() || 'text';
				const width       = $(this).find('.field-width').val() || '100%';
				const required    = $(this).find('.field-required').is(':checked');
				const placeholder = $(this).find('.field-placeholder').val() || '';
				const options     = $(this).find('.field-options').val() || '';

				// Compute calc width
				let flexBasis = '100%';
				if (width === '50%') flexBasis = 'calc(50% - 7px)';
				else if (width === '33.3%') flexBasis = 'calc(33.333% - 10px)';
				else if (width === '25%') flexBasis = 'calc(25% - 11px)';

				let fieldInputHtml = '';
				const fieldStyle = `background-color: ${fieldBgColor}; color: ${fieldTextColor}; border: 1px solid ${fieldBorderCol}; border-radius: 6px; padding: 10px 12px; width: 100%; box-sizing: border-box;`;

				if (type === 'textarea') {
					fieldInputHtml = `<textarea style="${fieldStyle}" rows="3" placeholder="${placeholder}" readonly></textarea>`;
				} else if (type === 'select') {
					const opts = options.split(',').map(o => `<option>${o.trim()}</option>`).join('');
					fieldInputHtml = `<select style="${fieldStyle}" readonly><option value="">-- Select --</option>${opts}</select>`;
				} else if (type === 'radio' || type === 'checkbox') {
					const opts = options.split(',').filter(o => o.trim()).map(o => `
						<label style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; margin-right: 12px;">
							<input type="${type}" disabled /> ${o.trim()}
						</label>
					`).join('');
					fieldInputHtml = `<div style="padding: 6px 0;">${opts || '<em style="color: #94a3b8; font-size: 12px;">No options set</em>'}</div>`;
				} else {
					fieldInputHtml = `<input type="text" style="${fieldStyle}" placeholder="${placeholder}" readonly />`;
				}

				const fieldHtml = `
					<div class="wcrm-preview-field-item" style="flex: 0 0 ${flexBasis}; max-width: ${flexBasis};">
						<label style="display: block; font-weight: 600; font-size: 13px; color: ${textColor}; margin-bottom: 6px;">
							${label} ${required ? '<span style="color: #ef4444;">*</span>' : ''}
						</label>
						${fieldInputHtml}
					</div>
				`;
				$fieldsContainer.append(fieldHtml);
			});
		}

		// Initial live preview render
		updateLivePreview();

		/* ========================================================
		 * 5. Save Form (Insert / Update)
		 * ======================================================== */
		$('#wcrm-save-form-btn').on('click', function (e) {
			e.preventDefault();
			const $btn = $(this);
			const formId = $('#wcrm-form-id').val();
			const title = $('#wcrm-form-title').val().trim();
			const $status = $('#wcrm-editor-status');

			if (!title) {
				alert('Please enter a Form Title.');
				$('#wcrm-form-title').focus();
				return;
			}

			// Gather fields
			const fields = [];
			$('#wcrm-fields-list .wcrm-field-row').each(function (idx) {
				const label = $(this).find('.field-label').val().trim() || ('Field ' + (idx + 1));
				const type = $(this).find('.field-type').val();
				const width = $(this).find('.field-width').val() || '100%';
				const required = $(this).find('.field-required').is(':checked');
				const placeholder = $(this).find('.field-placeholder').val().trim();
				const options = $(this).find('.field-options').val().trim();

				const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + idx;

				fields.push({
					id: id,
					label: label,
					type: type,
					width: width,
					required: required,
					placeholder: placeholder,
					options: options
				});
			});

			if (fields.length === 0) {
				alert('Please add at least one field.');
				return;
			}

			// Gather settings
			const settings = {
				button_text: $('#wcrm-button-text').val().trim() || 'Submit',
				button_color: $('#wcrm-button-color').val() || '#6366f1',
				button_text_color: $('#wcrm-button-text-color').val() || '#ffffff',
				bg_color: $('#wcrm-bg-color').val() || '#ffffff',
				text_color: $('#wcrm-text-color').val() || '#0f172a',
				border_color: $('#wcrm-border-color').val() || '#e2e8f0',
				border_width: $('#wcrm-border-width').val() || '1px',
				border_radius: $('#wcrm-border-radius').val() || '12px',
				field_bg_color: $('#wcrm-field-bg-color').val() || '#f8fafc',
				field_border_color: $('#wcrm-field-border-color').val() || '#cbd5e1',
				field_text_color: $('#wcrm-field-text-color').val() || '#0f172a',
				success_message: $('#wcrm-success-message').val().trim() || 'Thank you! We have received your inquiry.'
			};

			$btn.prop('disabled', true).text('Saving...');
			$status.hide().removeClass('success error');

			$.ajax({
				url: wcrm_admin.ajax_url,
				type: 'POST',
				data: {
					action: 'wcrm_save_form',
					nonce: wcrm_admin.nonce,
					id: formId,
					title: title,
					fields: JSON.stringify(fields),
					settings: JSON.stringify(settings)
				},
				success: function (res) {
					$btn.prop('disabled', false).text('Save Form');
					if (res.success) {
						$status.addClass('success').text(res.data.message).fadeIn();
						setTimeout(function () {
							window.location.href = 'admin.php?page=wcrm-forms';
						}, 1000);
					} else {
						$status.addClass('error').text(res.data.message || 'Failed to save form.').fadeIn();
					}
				},
				error: function () {
					$btn.prop('disabled', false).text('Save Form');
					$status.addClass('error').text('AJAX error while saving form.').fadeIn();
				}
			});
		});

		/* ========================================================
		 * 6. Delete Form
		 * ======================================================== */
		$(document).on('click', '.wcrm-delete-form-link', function (e) {
			e.preventDefault();
			const id = $(this).data('id');
			if (!confirm(wcrm_admin.confirm_delete)) {
				return;
			}

			const $row = $('#wcrm-form-row-' + id);

			$.ajax({
				url: wcrm_admin.ajax_url,
				type: 'POST',
				data: {
					action: 'wcrm_delete_form',
					nonce: wcrm_admin.nonce,
					id: id
				},
				success: function (res) {
					if (res.success) {
						$row.fadeOut(300, function () {
							$(this).remove();
							if ($('.wp-list-table tbody tr').length === 0) {
								location.reload();
							}
						});
					} else {
						alert(res.data.message || 'Could not delete form.');
					}
				}
			});
		});

		/* ========================================================
		 * 7. Copy Shortcode Button
		 * ======================================================== */
		$(document).on('click', '.wcrm-copy-shortcode-btn', function (e) {
			e.preventDefault();
			const shortcode = $(this).data('shortcode');
			const $btn = $(this);

			if (navigator.clipboard) {
				navigator.clipboard.writeText(shortcode).then(function () {
					const oldText = $btn.text();
					$btn.text('Copied!');
					setTimeout(function () {
						$btn.text(oldText);
					}, 1500);
				});
			}
		});

	});

})(jQuery);
