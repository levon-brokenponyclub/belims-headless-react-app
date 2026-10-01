<?php
/**
 * PayFast Return URL Handler
 *
 * Handles redirect from PayFast back to frontend after payment
 *
 * @package GlobalSiteSettings
 * @subpackage PayFast
 */

if (!defined('ABSPATH')) {
    exit;
}

class PayFast_Return_Handler {

    /**
     * Register rewrite rules and template handler
     */
    public static function init() {
        add_action('init', array(__CLASS__, 'add_rewrite_rule'));
        add_action('template_redirect', array(__CLASS__, 'handle_return'));
    }

    /**
     * Add rewrite rule for /payfast-return
     */
    public static function add_rewrite_rule() {
        add_rewrite_rule(
            '^payfast-return/?$',
            'index.php?payfast_return=1',
            'top'
        );

        add_rewrite_tag('%payfast_return%', '([^/]+)');
    }

    /**
     * Handle PayFast return redirect
     *
     * Only sends the customer back to the storefront their order came from.
     * It never changes the order: payment is confirmed solely by the ITN
     * (PayFast_API::handle_itn). The storefront polls payment status until then.
     */
    public static function handle_return() {
        if (!get_query_var('payfast_return') && empty($_GET['payfast_return'])) {
            return;
        }

        $order_id = isset($_GET['m_payment_id']) ? intval($_GET['m_payment_id']) : 0;
        $key = isset($_GET['key']) ? sanitize_text_field(wp_unslash($_GET['key'])) : '';

        $order = $order_id ? wc_get_order($order_id) : false;
        $key_valid = $order && $key !== '' && hash_equals($order->get_order_key(), $key);

        if (!$order) {
            wp_redirect(get_frontend_url());
            exit;
        }

        $params = array(
            'order_id' => $order_id,
            'payment_status' => $order->is_paid() ? 'complete' : $order->get_status(),
            'timestamp' => current_time('timestamp'),
            'return_source' => 'payfast',
        );
        // The key lets the storefront read this order; only pass it on when the caller already had it
        if ($key_valid) {
            $params['order_key'] = $key;
        }

        wp_redirect(belims_order_frontend_url($order) . '/checkout?' . http_build_query($params));
        exit;
    }
}

// Initialize the handler
PayFast_Return_Handler::init();
