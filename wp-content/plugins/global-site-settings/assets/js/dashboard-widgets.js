/**
 * Belims Dashboard Widgets JavaScript
 * Handles: Speed Test (Run now), Inventory HUD (Search, Export, Refresh)
 */

(function ($) {
	"use strict";

	var BPCWidgets = {
		init: function () {
			this.initSpeedTest();
			this.initInventoryHUD();
		},

		/* ================================================================
		   SPEED TEST WIDGET
		================================================================ */

		initSpeedTest: function () {
			var self = this;

			$('#bpc-run-test').on('click', function (e) {
				e.preventDefault();
				self.runSpeedTest();
			});
		},

		runSpeedTest: function () {
			var $btn = $('#bpc-run-test');
			var $widget = $('.bpc-speed-widget');
			var originalText = $btn.text();

			$btn.prop('disabled', true).text(bpcDashboardData.speed_running);
			$widget.addClass('bpc-testing');

			$.ajax({
				url: bpcDashboardData.ajaxurl,
				type: 'POST',
				data: {
					action: 'bpc_run_speed_test',
					nonce: bpcDashboardData.nonce,
				},
				timeout: 60000,
				success: function (response) {
					if (response.success && response.data) {
						BPCWidgets.updateScoreDisplay(response.data);
					} else {
						$widget.find('.bpc-score-number').text('—');
						alert(bpcDashboardData.speed_error);
					}
				},
				error: function () {
					alert(bpcDashboardData.speed_error);
				},
				complete: function () {
					$btn.prop('disabled', false).text(originalText);
					$widget.removeClass('bpc-testing');
				}
			});
		},

		updateScoreDisplay: function (data) {
			var score = data.score || 0;
			var color = data.color || '#9ca3af';
			var label = data.label || '';
			var lastTest = data.last_test || '';
			var circumference = 28; // 2 * Math.PI * 4.5 ≈ 28.27, rounded to 28

			var offset = circumference - (score / 100) * circumference;

			var $svg = $('.bpc-score-svg');
			var $fill = $svg.find('.bpc-score-fill');
			var $number = $svg.find('.bpc-score-number');

			// Update fill color
			$fill.attr('stroke', color);
			$fill.css('stroke-dasharray', circumference + ', ' + circumference);
			$fill.css('stroke-dashoffset', offset);

			// Update number
			$number.text(score);

			// Update label
			$('.bpc-speed-label').text(label).css('color', color);

			// Update last test time
			$('.bpc-last-test').text('Last tested: ' + lastTest);

			// Update data attribute
			$('.bpc-speed-widget').attr('data-score', score);
		},

		/* ================================================================
		   INVENTORY HUD WIDGET
		================================================================ */

		initInventoryHUD: function () {
			var self = this;

			// Search filter
			$('#bpc-inventory-search').on('input', function () {
				var term = $(this).val().toLowerCase();
				$('.bpc-inventory-row').each(function () {
					var name = $(this).data('name') || '';
					var sku = $(this).data('sku') || '';
					if (name.indexOf(term) > -1 || sku.indexOf(term) > -1) {
						$(this).show();
					} else {
						$(this).hide();
					}
				});
			});

			// Refresh button
			$('#bpc-inventory-refresh').on('click', function (e) {
				e.preventDefault();
				self.refreshInventory();
			});

			// Export to CSV
			$('#bpc-inventory-export').on('click', function (e) {
				e.preventDefault();
				self.exportCSV();
			});

			// Save threshold
			$('#bpc-save-threshold').on('click', function () {
				var val = parseInt($('#bpc-low-stock-threshold').val(), 10);
				if (isNaN(val) || val < 0) val = 5;

				$.post(bpcDashboardData.ajaxurl, {
					action: 'bpc_save_threshold',
					threshold: val,
					nonce: wp_create_nonce('bpc_save_threshold')
				}, function (resp) {
					if (resp.success) {
						$('.bpc-inventory-hud').attr('data-threshold', val);
						self.updateLowStockHighlight();
					}
				});
			});

			// Threshold slider live-update on Enter key
			$('#bpc-low-stock-threshold').on('change', function () {
				var val = parseInt($(this).val(), 10);
				if (isNaN(val) || val < 0) val = 5;
				$(this).val(val);
				$('.bpc-inventory-hud').attr('data-threshold', val);
				self.updateLowStockHighlight();
			});
		},

		refreshInventory: function () {
			var $btn = $('#bpc-inventory-refresh');
			var $wrapper = $('.bpc-inventory-table-wrapper');
			var $tbody = $('#bpc-inventory-body');
			var threshold = parseInt($('.bpc-inventory-hud').attr('data-threshold'), 10) || 5;

			$btn.prop('disabled', true);
			$wrapper.addClass('bpc-loading');

			$.ajax({
				url: bpcDashboardData.ajaxurl,
				type: 'POST',
				data: {
					action: 'bpc_inventory_refresh',
					threshold: threshold,
					nonce: bpcDashboardData.nonce,
				},
				timeout: 30000,
				success: function (response) {
					if (response.success && response.data) {
						var data = response.data;
						$tbody.html(data.rows);
						$('.bpc-low-stock-number').text(data.low_stock_count);
						$('.bpc-total-products').text(data.product_count + ' products total');
						$wrapper.removeClass('bpc-loading');
					}
				},
				error: function () {
					$wrapper.removeClass('bpc-loading');
				},
				complete: function () {
					$btn.prop('disabled', false);
				}
			});
		},

		updateLowStockHighlight: function () {
			var threshold = parseInt($('.bpc-inventory-hud').attr('data-threshold'), 10) || 5;
			var lowCount = 0;

			$('.bpc-inventory-row').each(function () {
				var $row = $(this);
				// Check if the stock cell contains a numeric value
				var stockText = $row.find('td:eq(2)').text().trim();
				var stockVal = parseInt(stockText, 10);

				if (!isNaN(stockVal) && stockVal < threshold) {
					$row.addClass('bpc-low-stock-row');
					lowCount++;
				} else if (!isNaN(stockVal) && stockVal >= threshold) {
					$row.removeClass('bpc-low-stock-row');
				}
			});

			$('.bpc-low-stock-number').text(lowCount);
		},

		exportCSV: function () {
			var rows = [];
			rows.push(['Product Name', 'SKU', 'Stock Level', 'Price']);

			$('.bpc-inventory-row:visible').each(function () {
				var cells = $(this).find('td');
				rows.push([
					$(cells[0]).text().trim(),
					$(cells[1]).text().trim(),
					$(cells[2]).text().trim(),
					$(cells[3]).text().trim()
				]);
			});

			var csvContent = rows.map(function (row) {
				return row.map(function (cell) {
					var value = String(cell == null ? '' : cell);
					return '"' + value.replace(/"/g, '""') + '"';
				}).join(',');
			}).join('\n');

			var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			var url = URL.createObjectURL(blob);
			var datePart = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
			var filename = 'belims-inventory-' + datePart + '.csv';

			var link = document.createElement('a');
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}
	};

	$(document).ready(function () {
		BPCWidgets.init();
	});

})(jQuery);
