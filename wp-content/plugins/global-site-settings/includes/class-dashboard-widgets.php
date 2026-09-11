<?php
/**
 * Dashboard Widgets: Website Speed Test, Order Processing Monitor, Live Inventory HUD
 *
 * Registers three custom WordPress dashboard widgets with AJAX-backed
 * dynamic behaviour for the Belims headless WooCommerce store.
 *
 * @package Global_Site_Settings
 */

if (!defined('ABSPATH')) exit;

class Belims_Dashboard_Widgets {

	const SPEED_TRANSIENT    = 'bpc_speed_test_results';
	const ORDER_TRANSIENT    = 'bpc_order_monitor_data';
	const INVENTORY_TRANSIENT = 'bpc_inventory_data';

	const NONCE_ACTION = 'bpc_dashboard_nonce';

	public function __construct() {
		add_action('wp_dashboard_setup',      array($this, 'register_widgets'));
		add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
		add_action('admin_init',            array($this, 'schedule_daily_speed_test'));
		add_action('bpc_daily_speed_test',  array($this, 'run_daily_speed_test'));
		add_action('wp_ajax_bpc_run_speed_test',    array($this, 'ajax_run_speed_test'));
		add_action('wp_ajax_bpc_inventory_refresh', array($this, 'ajax_inventory_refresh'));
		add_action('wp_ajax_bpc_save_threshold',    array($this, 'ajax_save_threshold'));
	}

	/* ======================================================================
	   Widget Registration
	====================================================================== */

	public function register_widgets() {
		// Speed Test — every admin
		if (current_user_can('manage_options') || current_user_can('manage_woocommerce')) {
			wp_add_dashboard_widget(
				'bpc_speed_test_widget',
				'Website Speed Test',
				array($this, 'render_speed_test_widget')
			);
		}

		// Order Processing Monitor — manage_woocommerce capability only
		if (current_user_can('manage_woocommerce')) {
			wp_add_dashboard_widget(
				'bpc_order_monitor_widget',
				'Order Processing Monitor',
				array($this, 'render_order_monitor_widget')
			);
		}

		// Live Inventory HUD — shop_manager or administrator roles
		if ($this->user_can_view_inventory()) {
			wp_add_dashboard_widget(
				'bpc_inventory_hud_widget',
				'Live Inventory HUD',
				array($this, 'render_inventory_hud_widget'),
				array($this, 'widget_controls')
			);
		}

		// Site Settings Summary — quick access to the full settings page
		if (current_user_can('manage_options')) {
			wp_add_dashboard_widget(
				'belims_site_settings_widget',
				'⚙️ Belims Site Settings',
				array($this, 'render_settings_summary_widget')
			);
		}
	}

	public function render_settings_summary_widget() {
		if (!current_user_can('manage_options')) {
			return;
		}

		$acf_url = function_exists('get_field') ? get_field('headless_frontend_url', 'option') : '';
		$cors_origin = get_cors_origin();
		$environment = get_option('belims_frontend_environment', 'production');

		$woo_key = function_exists('get_field') ? get_field('woo_consumer_key', 'option') : '';
		$woo_secret = function_exists('get_field') ? get_field('woo_consumer_secret', 'option') : '';
		$gemini_key = function_exists('get_field') ? get_field('gemini_api_key', 'option') : '';
		$bobgo_key = function_exists('get_field') ? get_field('bobgo_api_key', 'option') : '';
		$payment_key = function_exists('get_field') ? get_field('payment_api_key', 'option') : '';

		$settings_url = admin_url('admin.php?page=belims-site-settings');

		?>
		<div class="bpc-settings-summary">
			<p class="bpc-settings-summary-intro">
				Quick status of the integrations configured in Global Site Settings.
			</p>

			<table class="bpc-settings-summary-table">
				<tbody>
					<tr>
						<td><strong>CORS Origin</strong></td>
						<td>
							<code><?php echo esc_html($cors_origin); ?></code>
							<?php if ($acf_url) : ?>
								<span class="bpc-settings-summary-note"> (from ACF)</span>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<td><strong>Frontend Environment</strong></td>
						<td><?php echo esc_html(ucfirst($environment)); ?></td>
					</tr>
					<tr>
						<td><strong>WooCommerce API</strong></td>
						<td>
							<?php if (!empty($woo_key) && !empty($woo_secret)) : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--success">Configured</span>
							<?php else : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--warning">Not configured</span>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<td><strong>AI / Gemini API</strong></td>
						<td>
							<?php if (!empty($gemini_key)) : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--success">Configured</span>
							<?php else : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--warning">Not configured</span>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<td><strong>BobGo API</strong></td>
						<td>
							<?php if (!empty($bobgo_key)) : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--success">Configured</span>
							<?php else : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--warning">Not configured</span>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<td><strong>Payment API</strong></td>
						<td>
							<?php if (!empty($payment_key)) : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--success">Configured</span>
							<?php else : ?>
								<span class="bpc-settings-summary-status bpc-settings-summary-status--warning">Not configured</span>
							<?php endif; ?>
						</td>
					</tr>
				</tbody>
			</table>

			<a href="<?php echo esc_url($settings_url); ?>" class="button button-primary bpc-settings-summary-button">
				Configure Settings <span aria-hidden="true">&rarr;</span>
			</a>
		</div>
		<?php
	}

	public function widget_controls($widget_id, $context) {
		if ($widget_id === 'bpc_inventory_hud_widget') {
			$threshold = get_option('bpc_low_stock_threshold', 5);
			echo '<label for="bpc-low-stock-threshold" style="font-size:13px;font-weight:600;">Low Stock Threshold: </label>';
			echo '<input type="number" id="bpc-low-stock-threshold" name="bpc_low_stock_threshold" value="' . esc_attr($threshold) . '" min="0" max="50" style="width:60px;padding:3px 6px;" />';
			echo '<button type="button" class="button button-secondary" id="bpc-save-threshold" style="margin-left:8px;font-size:12px;padding:3px 10px;">Save</button>';
			echo '<script>
				(function($){
					$("#bpc-save-threshold").on("click", function(){
						var val = parseInt($("#bpc-low-stock-threshold").val(),10);
						$.post(ajaxurl, {
							action: "bpc_save_threshold",
							threshold: val,
							nonce: "' . wp_create_nonce('bpc_save_threshold') . '"
						}, function(){ $("#bpc-low-stock-threshold").blur(); });
					});
				})(jQuery);
			</script>';
		}
	}

	private function user_can_view_inventory() {
		if (!is_user_logged_in()) return false;
		$user = wp_get_current_user();
		return in_array('shop_manager', $user->roles) || in_array('administrator', $user->roles);
	}

	/* ======================================================================
	   Asset Enqueue
	====================================================================== */

	public function enqueue_assets($hook) {
		if ($hook !== 'index.php') return;

		$js_file  = GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/js/dashboard-widgets.js';
		$css_file = GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/css/dashboard-widgets.css';

		wp_enqueue_style('bpc-dashboard-widgets', $css_file, array(), GLOBAL_SITE_SETTINGS_VERSION);
		wp_enqueue_script('bpc-dashboard-widgets', $js_file, array('jquery'), GLOBAL_SITE_SETTINGS_VERSION, true);

		wp_localize_script('bpc-dashboard-widgets', 'bpcDashboardData', array(
			'ajaxurl'       => admin_url('admin-ajax.php'),
			'nonce'         => wp_create_nonce(self::NONCE_ACTION),
			'speed_running' => __('Running speed test...', 'global-site-settings'),
			'speed_error'   => __('Test failed. Try again.', 'global-site-settings'),
		));
	}

	/* ======================================================================
	   1. SPEED TEST WIDGET
	====================================================================== */

	public function render_speed_test_widget() {
		$results = $this->get_cached_speed_results();
		$score  = $results ? intval($results['score']) : null;
		$label  = $results ? $this->get_speed_label($score) : __('Not tested yet', 'global-site-settings');
		$color  = $results ? $this->get_speed_color($score) : '#9ca3af';
		$angle  = $results ? $this->get_speed_angle($score) : 0;
		$last   = $results ? date_i18n('F j, Y, g:i a', $results['timestamp']) : __('Never', 'global-site-settings');

		$cw = 28; // circumference of circle with r=9 (2πr ≈ 56.55)
		$offset_pct = $score !== null ? ($score / 100) : 0;

		printf(
			'<div class="bpc-speed-widget" data-score="%d">
				<div class="bpc-speed-header">
					<span class="bpc-speed-title">%s</span>
					<span class="bpc-speed-label" style="color:%s;">%s</span>
				</div>
				<div class="bpc-score-circle">
					<svg viewBox="0 0 36 36" class="bpc-score-svg">
						<path class="bpc-score-track" d="M18 18 m0 -14 a14 14 0 1 1 0 28 a14 14 0 1 1 0 -28"/>
						<path class="bpc-score-fill" d="M18 18 m0 -14 a14 14 0 1 1 0 28 a14 14 0 1 1 0 -28"
							stroke-dasharray="%d %d" stroke="%s" stroke-width="3"/>
						<text x="50%%" y="50%%" class="bpc-score-number" dy=".3em">%s</text>
					</svg>
				</div>
				<div class="bpc-speed-meta">
					<span class="bpc-last-test">Last tested: %s</span>
					<button class="button button-primary bpc-run-test" id="bpc-run-test" type="button">Run test now</button>
				</div>
			</div>',
			esc_attr($score ?? 0),
			esc_html__('Performance', 'global-site-settings'),
			esc_attr($color),
			esc_html($label),
			esc_attr(round($offset_pct * $cw, 2)),
			esc_attr($cw),
			esc_attr($color),
			esc_html($score !== null ? $score : '--'),
			esc_html($last)
		);
	}

	// Run the speed test (PageSpeed Insights API or fallback timing test)
	private function run_speed_test() {
		$url = get_frontend_url();
		$api_key = get_option('belims_pagespeed_api_key', '');

		if ($api_key) {
			$api_url = add_query_arg(array(
				'url'    => rawurlencode($url),
				'strategy' => 'mobile',
				'category' => 'performance',
				'key'     => $api_key,
			), 'https://www.googleapis.com/pagespeedonline/v5/runPageSpeed');

			$response = wp_remote_get($api_url, array('timeout' => 30));
			$body = wp_remote_retrieve_body($response);

			if (!is_wp_error($response) && $body) {
				$data = json_decode($body, true);
				if (isset($data['lighthouseResult']['categories']['performance']['score'])) {
					$score = round($data['lighthouseResult']['categories']['performance']['score'] * 100);
					$audits = $data['lighthouseResult']['audits'] ?? array();

					return array(
						'score'     => $score,
						'timestamp' => time(),
						'metrics'   => array(
							'fcp' => $this->extract_metric($audits, 'first-contentful-paint'),
							'LCP' => $this->extract_metric($audits, 'largest-contentful-paint'),
							'cls' => $this->extract_metric($audits, 'cumulative-layout-shift'),
							'fid' => $this->extract_metric($audits, 'max-potential-fid'),
						),
					);
				}
			}
		}

		// Fallback: simple page-load timing test
		return $this->run_timing_fallback($url);
	}

	private function run_timing_fallback($url) {
		$start = microtime(true);
		$response = wp_remote_get($url, array('timeout' => 15, 'sslverify' => false));
		$elapsed = microtime(true) - $start;

		if (is_wp_error($response)) {
			return null;
		}

		// Score based on response time: 0-1s=90s, 1-2s=70s, 2-3s=50s, 3-5s=30s, 5s+=10s
		if ($elapsed < 1) $score = 90;
		elseif ($elapsed < 2) $score = 70;
		elseif ($elapsed < 3) $score = 50;
		elseif ($elapsed < 5) $score = 30;
		else $score = 10;

		return array(
			'score'     => $score,
			'timestamp' => time(),
			'metrics'   => array(
				'fcp' => round($elapsed, 3) . 's',
				'method' => 'timing-fallback',
			),
		);
	}

	private function extract_metric($audits, $key) {
		if (isset($audits[$key]['displayValue'])) {
			return $audits[$key]['displayValue'];
		}
		if (isset($audits[$key]['numericValue'])) {
			return round($audits[$key]['numericValue'] / 1000, 2) . 's';
		}
		return '—';
	}

	private function get_cached_speed_results() {
		$results = get_transient(self::SPEED_TRANSIENT);
		return is_array($results) ? $results : null;
	}

	private function cache_speed_results($results) {
		// Cache for 1 day (matches daily test frequency)
		set_transient(self::SPEED_TRANSIENT, $results, DAY_IN_SECONDS);
	}

	private function get_speed_label($score) {
		if ($score === null) return __('Not tested', 'global-site-settings');
		if ($score >= 90) return __('Good', 'global-site-settings');
		if ($score >= 50) return __('Needs Improvement', 'global-site-settings');
		return __('Poor', 'global-site-settings');
	}

	private function get_speed_color($score) {
		if ($score === null) return '#9ca3af';
		if ($score >= 90) return '#10b981';   // green
		if ($score >= 50) return '#f59e0b';   // amber
		return '#ef4444';                    // red
	}

	private function get_speed_angle($score) {
		// Used for CSS conic-gradient fallback (not currently active)
		return ($score / 100) * 360;
	}

	// AJAX handler — manual "Run test now"
	public function ajax_run_speed_test() {
		check_ajax_referer(self::NONCE_ACTION, 'nonce');

		if (!current_user_can('manage_options') && !current_user_can('manage_woocommerce')) {
			wp_send_json_error(array('message' => __('Unauthorized', 'global-site-settings')));
		}

		$results = $this->run_speed_test();

		if ($results) {
			$this->cache_speed_results($results);
			wp_send_json_success(array(
				'score'     => $results['score'],
				'label'     => $this->get_speed_label($results['score']),
				'color'     => $this->get_speed_color($results['score']),
				'last_test' => date_i18n('F j, Y, g:i a', $results['timestamp']),
				'metrics'   => $results['metrics'] ?? array(),
			));
		}

		wp_send_json_error(array('message' => __('Speed test failed. Please try again later.', 'global-site-settings')));
	}

	// Daily cron handler
	public function run_daily_speed_test() {
		$results = $this->run_speed_test();
		if ($results) {
			$this->cache_speed_results($results);
		}
	}

	public function schedule_daily_speed_test() {
		if (!wp_next_scheduled('bpc_daily_speed_test')) {
			wp_schedule_event(time(), 'daily', 'bpc_daily_speed_test');
		}
	}

	/* ======================================================================
	   2. ORDER PROCESSING MONITOR WIDGET
	====================================================================== */

	public function render_order_monitor_widget() {
		$data = $this->get_order_revenue_data();
		$generated = date_i18n('F j, Y, g:i a', $data['generated_at']);

		$completed_html     = wp_strip_all_tags(wc_price($data['completed_total']));
		$pending_html        = wp_strip_all_tags(wc_price($data['pending_total']));
		$at_risk_html        = wp_strip_all_tags(wc_price($data['at_risk_total']));
		$total_html          = wp_strip_all_tags(wc_price($data['grand_total']));

		$completed_pct  = $data['grand_total'] > 0 ? round(($data['completed_total'] / $data['grand_total']) * 100) : 0;
		$pending_pct     = $data['grand_total'] > 0 ? round(($data['pending_total'] / $data['grand_total']) * 100) : 0;
		$at_risk_pct     = $data['grand_total'] > 0 ? round(($data['at_risk_total'] / $data['grand_total']) * 100) : 0;

		$completed_color  = '#10b981';
		$pending_color    = '#f59e0b';
		$at_risk_color    = $data['at_risk_total'] > 0 ? '#ef4444' : '#9ca3af';

		$risk_class = $data['at_risk_total'] > 0 ? 'bpc-risk-card' : '';

		$at_risk_orders_url = admin_url('edit.php?post_type=shop_order&status=wc-failed,wc-cancelled,wc-pending,wc-on-hold');

		printf(
			'<div class="bpc-order-monitor">
				<div class="bpc-monitor-header">
					<h3>%s</h3>
					<span class="bpc-monitor-period">%s</span>
				</div>

				<div class="bpc-monitor-grid">
					<div class="bpc-monitor-card" style="--card-color:%s;">
						<div class="bpc-card-icon"><span class="dashicons dashicons-yes"></span></div>
						<div class="bpc-card-title">%s</div>
						<div class="bpc-card-amount">%s</div>
						<div class="bpc-card-bar">
							<div class="bpc-progress" style="width:%d%%;background:%s;"></div>
						</div>
						<div class="bpc-card-perc">%d%% of total</div>
					</div>

					<div class="bpc-monitor-card" style="--card-color:%s;">
						<div class="bpc-card-icon"><span class="dashicons dashicons-clock"></span></div>
						<div class="bpc-card-title">%s</div>
						<div class="bpc-card-amount">%s</div>
						<div class="bpc-card-bar">
							<div class="bpc-progress" style="width:%d%%;background:%s;"></div>
						</div>
						<div class="bpc-card-perc">%d%% of total</div>
					</div>

					<div class="bpc-monitor-card %s" style="--card-color:%s;">
						<div class="bpc-card-icon"><span class="dashicons dashicons-warning"></span></div>
						<div class="bpc-card-title">%s</div>
						<div class="bpc-card-amount" style="color:%s;font-weight:bold;">%s</div>
						<div class="bpc-card-bar">
							<div class="bpc-progress" style="width:%d%%;background:%s;"></div>
						</div>
						<div class="bpc-card-perc" style="color:%s;font-weight:bold;">%d%% of total</div>
					</div>
				</div>

				<div class="bpc-monitor-footer">
					<span class="bpc-generated-time">%s</span>
					<a href="%s" class="button button-primary">%s</a>
				</div>
			</div>',
			esc_html__('Revenue Overview (Last 7 Days)', 'global-site-settings'),
			esc_html__('Analyzing orders from the last 7 days', 'global-site-settings'),
			$completed_color,
			esc_html__('Completed', 'global-site-settings'),
			$completed_html,
			$completed_pct,
			$completed_color,
			$completed_pct,
			$pending_color,
			esc_html__('Pending Action', 'global-site-settings'),
			$pending_html,
			$pending_pct,
			$pending_color,
			$pending_pct,
			esc_attr($risk_class),
			$at_risk_color,
			esc_html__('Revenue at Risk', 'global-site-settings'),
			$at_risk_color,
			$at_risk_html,
			$at_risk_pct,
			$at_risk_color,
			$at_risk_color,
			$at_risk_pct,
			sprintf(__('Last updated: %s', 'global-site-settings'), $generated),
			esc_url($at_risk_orders_url),
			esc_html__('View At-Risk Orders', 'global-site-settings'),
			esc_html($total_html)
		);
	}

	private function get_order_revenue_data() {
		$cached = get_transient(self::ORDER_TRANSIENT);
		if (is_array($cached) && isset($cached['generated_at'])) {
			return $cached;
		}

		$statuses = array(
			'completed'    => array('wc-completed', 'wc-processing'),
			'pending'      => array('wc-pending', 'wc-on-hold'),
			'failed'       => array('wc-failed', 'wc-cancelled'),
		);

		$period = 'last_7_days';
		$totals = array('completed' => 0.0, 'pending' => 0.0, 'failed' => 0.0);

		foreach ($statuses as $group => $status_list) {
			$orders = wc_get_orders(array(
				'status'    => $status_list,
				'date_created' => 'last_7_days',
				'limit'     => -1,
			));

			foreach ($orders as $order) {
				// Use get_total() to sum revenue as specified
				$totals[$group] += (float) $order->get_total();
			}
		}

		$grand_total  = array_sum($totals);
		$data = array(
			'completed_total'  => $totals['completed'],
			'pending_total'    => $totals['pending'],
			'at_risk_total'    => $totals['failed'],
			'grand_total'      => $grand_total,
			'generated_at'     => time(),
		);

		set_transient(self::ORDER_TRANSIENT, $data, 5 * MINUTE_IN_SECONDS);

		return $data;
	}

	/* ======================================================================
	   3. LIVE INVENTORY HUD WIDGET
	====================================================================== */

	public function render_inventory_hud_widget() {
		$threshold = get_option('bpc_low_stock_threshold', 5);
		$products = $this->get_inventory_data();

		$product_count = count($products);
		$low_stock_count = 0;

		ob_start();
		?>
		<div class="bpc-inventory-hud" data-threshold="<?php echo esc_attr($threshold); ?>">
			<div class="bpc-inventory-controls">
				<div class="bpc-inventory-search">
					<input type="text" id="bpc-inventory-search" placeholder="<?php esc_attr_e('Search by product name or SKU...', 'global-site-settings'); ?>" />
				</div>
				<div class="bpc-inventory-actions">
					<button type="button" class="button button-secondary" id="bpc-inventory-refresh">
						<span class="dashicons dashicons-refresh"></span> <?php esc_html_e('Refresh', 'global-site-settings'); ?>
					</button>
					<button type="button" class="button button-primary" id="bpc-inventory-export">
						<span class="dashicons dashicons-download"></span> <?php esc_html_e('Export to CSV', 'global-site-settings'); ?>
					</button>
				</div>
			</div>

			<div class="bpc-inventory-summary">
				<span class="bpc-low-stock-count">
					<span class="dashicons dashicons-warning" style="color:#ef4444;"></span>
					<span id="bpc-low-stock-number"><?php echo esc_html($low_stock_count); ?></span> products below threshold
				</span>
				<span class="bpc-total-products"><?php echo esc_html($product_count); ?> products total</span>
			</div>

			<div class="bpc-inventory-table-wrapper">
				<table class="bpc-inventory-table widefat" cellspacing="0">
					<thead>
						<tr>
							<th><?php esc_html_e('Product Name', 'global-site-settings'); ?></th>
							<th><?php esc_html_e('SKU', 'global-site-settings'); ?></th>
							<th><?php esc_html_e('Stock Level', 'global-site-settings'); ?></th>
							<th><?php esc_html_e('Price', 'global-site-settings'); ?></th>
						</tr>
					</thead>
					<tbody id="bpc-inventory-body">
						<?php foreach ($products as $product): 
							$is_low = $product['stock'] < $threshold;
							$row_class = $is_low ? 'bpc-low-stock-row' : '';
							if ($is_low) $low_stock_count++;
						?>
							<tr class="bpc-inventory-row <?php echo esc_attr($row_class); ?>" 
								data-name="<?php echo esc_attr(strtolower($product['name'])); ?>" 
								data-sku="<?php echo esc_attr(strtolower($product['sku'])); ?>">
								<td><?php echo esc_html($product['name']); ?></td>
								<td><?php echo esc_html($product['sku']); ?></td>
								<td><?php echo esc_html($product['stock_display']); ?></td>
								<td><?php echo esc_html($product['price_display']); ?></td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
			</div>

			<?php if (empty($products)): ?>
				<p class="bpc-inventory-empty"><?php esc_html_e('No products found.', 'global-site-settings'); ?></p>
			<?php endif; ?>
		</div>

		<script>
		document.getElementById('bpc-low-stock-number').textContent = document.querySelectorAll('.bpc-low-stock-row').length;
		</script>
		<?php

		echo ob_get_clean();
	}

	private function get_inventory_data() {
		$cached = get_transient(self::INVENTORY_TRANSIENT);
		if (is_array($cached) && !empty($cached)) {
			return $cached;
		}

		if (!class_exists('WooCommerce')) {
			return array();
		}

		$products = array();

		$args = array(
			'limit'    => -1,
			'status'   => 'any',
			'orderby'  => 'title',
			'order'    => 'ASC',
			'return'   => 'array',
		);

		$wc_products = wc_get_products($args);

		foreach ($wc_products as $product) {
			$products[] = $this->format_product_for_table($product);

			// Include variations for variable products
			if ($product->is_type('variable')) {
				$variations = $product->get_available_variations();
				foreach ($variations as $variation_data) {
					$variation_id = $variation_data['variation_id'] ?? 0;
					$variation = wc_get_product($variation_id);
					if ($variation) {
						$products[] = $this->format_product_for_table($variation);
					}
				}
			}
		}

		// Cache for 5 minutes
		set_transient(self::INVENTORY_TRANSIENT, $products, 5 * MINUTE_IN_SECONDS);

		return $products;
	}

	private function format_product_for_table($product) {
		$manage_stock = $product->get_manage_stock();
		$stock = $manage_stock ? (int) $product->get_stock_quantity() : null;

		return array(
			'id'            => $product->get_id(),
			'name'          => $product->get_name(),
			'sku'           => $product->get_sku() ?: __('N/A', 'global-site-settings'),
			'stock'         => $stock,
			'stock_display' => $manage_stock ? esc_html($stock) : __('Unlimited', 'global-site-settings'),
			'price_display' => wp_strip_all_tags(wc_price($product->get_price())),
			'price'         => $product->get_price(),
		);
	}

	public function ajax_inventory_refresh() {
		check_ajax_referer(self::NONCE_ACTION, 'nonce');

		if (!current_user_can('manage_woocommerce') && !current_user_can('manage_options')) {
			wp_send_json_error(array('message' => __('Unauthorized', 'global-site-settings')));
		}

		// Force refresh — delete the cached transient so data is re-fetched
		delete_transient(self::INVENTORY_TRANSIENT);

		$threshold = isset($_POST['threshold']) ? intval($_POST['threshold']) : get_option('bpc_low_stock_threshold', 5);

		$products = $this->get_inventory_data();

		$rows = '';
		foreach ($products as $product) {
			$is_low = $product['stock'] !== null && $product['stock'] < $threshold;
			$row_class = $is_low ? 'bpc-low-stock-row' : '';
			$rows .= sprintf(
				'<tr class="bpc-inventory-row %s" data-name="%s" data-sku="%s">
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
					<td>%s</td>
				</tr>',
				esc_attr($row_class),
				esc_attr(strtolower($product['name'])),
				esc_attr(strtolower($product['sku'])),
				esc_html($product['name']),
				esc_html($product['sku']),
				esc_html($product['stock_display']),
				esc_html($product['price_display'])
			);
		}

		$low_stock_count = 0;
		foreach ($products as $product) {
			if ($product['stock'] !== null && $product['stock'] < $threshold) {
				$low_stock_count++;
			}
		}

		wp_send_json_success(array(
			'rows'            => $rows,
			'product_count'   => count($products),
			'low_stock_count' => $low_stock_count,
			'threshold'       => $threshold,
		));
	}

	// AJAX handler for saving the low stock threshold
	public function ajax_save_threshold() {
		check_ajax_referer('bpc_save_threshold', 'nonce');

		if (!current_user_can('manage_options')) {
			wp_send_json_error(array('message' => __('Unauthorized', 'global-site-settings')));
		}

		$threshold = isset($_POST['threshold']) ? max(0, intval($_POST['threshold'])) : 5;
		update_option('bpc_low_stock_threshold', $threshold);

		wp_send_json_success(array('threshold' => $threshold));
	}
}

// Initialize
new Belims_Dashboard_Widgets();
