/**
 * Frontend Form AJAX Submission Script.
 */

(function ($) {
	'use strict';

	$(document).ready(function () {

		$(document).on('submit', '.wcrm-lead-form', function (e) {
			e.preventDefault();

			const $form = $(this);
			const $btn = $form.find('.wcrm-submit-btn');
			const $btnText = $btn.find('.wcrm-btn-text');
			const $spinner = $btn.find('.wcrm-spinner');
			const $alert = $form.find('.wcrm-alert');

			const formId = $form.data('form-id');

			// Serialize form data into an object
			const formDataArr = $form.serializeArray();
			const dataObj = {};

			$.each(formDataArr, function (i, field) {
				if (field.name === 'form_id') {
					return;
				}

				// Support array fields like checkboxes (field_name[])
				if (field.name.endsWith('[]')) {
					const key = field.name.slice(0, -2);
					if (!dataObj[key]) {
						dataObj[key] = [];
					}
					dataObj[key].push(field.value);
				} else {
					dataObj[field.name] = field.value;
				}
			});

			$btn.prop('disabled', true);
			$spinner.show();
			$btnText.css('opacity', '0.7');
			$alert.hide().removeClass('success error');

			$.ajax({
				url: wcrm_public.ajax_url,
				type: 'POST',
				data: {
					action: 'submit_wcrm_form',
					nonce: wcrm_public.nonce,
					form_id: formId,
					data: dataObj
				},
				success: function (res) {
					$btn.prop('disabled', false);
					$spinner.hide();
					$btnText.css('opacity', '1');

					if (res.success) {
						$form[0].reset();
						$alert.addClass('success').text(res.data.message).fadeIn();
					} else {
						$alert.addClass('error').text(res.data.message || 'Error sending message.').fadeIn();
					}
				},
				error: function () {
					$btn.prop('disabled', false);
					$spinner.hide();
					$btnText.css('opacity', '1');
					$alert.addClass('error').text('Network error: Could not reach the server. Please try again.').fadeIn();
				}
			});
		});

	});

})(jQuery);
