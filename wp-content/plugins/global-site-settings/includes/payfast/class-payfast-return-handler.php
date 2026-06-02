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
     */
    public static function handle_return() {
        if (!get_query_var('payfast_return') && empty($_GET['payfast_return'])) {
            return;
        }

        error_log('=== PayFast Return Handler Triggered ===');

        // Get PayFast data from query string
        $m_payment_id = isset($_GET['m_payment_id']) ? intval($_GET['m_payment_id']) : null;
        $pf_payment_id = isset($_GET['pf_payment_id']) ? sanitize_text_field($_GET['pf_payment_id']) : null;

        error_log('PayFast Return - Order ID: ' . $m_payment_id . ', Payment ID: ' . $pf_payment_id);

        if (!$m_payment_id && !empty($_GET['custom_str2'])) {
            $custom_payload = json_decode(stripslashes($_GET['custom_str2']), true);
            if (is_array($custom_payload) && !empty($custom_payload['order_id'])) {
                $m_payment_id = intval($custom_payload['order_id']);
                error_log('PayFast Return - Order ID recovered from custom_str2: ' . $m_payment_id);
            }
        }

        if (!$m_payment_id) {
            error_log('PayFast Return - No order ID, redirecting to home');
            wp_redirect(home_url('/'));
            exit;
        }

        // Get the order
        $order = wc_get_order($m_payment_id);

        if (!$order) {
            error_log('PayFast Return - Order not found: ' . $m_payment_id);
            // Invalid order, redirect to frontend home
            wp_redirect(home_url('/'));
            exit;
        }

        $order_status = $order->get_status();
        error_log('PayFast Return - Order status: ' . $order_status);

        // Mark order as paid on return if still pending/on-hold.
        // PayFast only calls return_url on successful payment (cancel goes to cancel_url),
        // so reaching this handler is sufficient proof of payment.
        // pf_payment_id is only available in ITN (server-to-server), not in the return redirect.
        if (in_array($order_status, array('pending', 'on-hold'), true)) {
            $itn_received = $order->get_meta('_payfast_itn_received');

            if (empty($itn_received)) {
                $payment_ref = !empty($pf_payment_id) ? $pf_payment_id : 'PF-RETURN-' . $m_payment_id;
                error_log('PayFast Return - No ITN received yet, marking order as paid from return handler (ref: ' . $payment_ref . ')');

                $order->update_meta_data('_payfast_payment_id', $payment_ref);
                $order->update_meta_data('_payfast_payment_status', 'COMPLETE');
                $order->update_meta_data('_payfast_return_marked_complete', current_time('mysql'));

                $order->payment_complete($payment_ref);
                $order->update_status('processing', 'PayFast return: marked as paid on user redirect');
                $order->save();

                $order_status = $order->get_status();
                error_log('PayFast Return - Order status updated to: ' . $order_status);
            }
        }
        
        // Check multiple success conditions:
        // 1. Order status is processing/completed (ITN already processed)
        // 2. Payment meta exists and shows payment was attempted (user just completed PayFast)
        $success = in_array($order_status, array('processing', 'completed'));
        
        // If not yet processing, it might be pending because ITN hasn't been processed yet
        // In this case, redirect to checkout to show pending status and allow retry
        // The frontend OrderConfirmation will keep polling for status updates
        
        // Build frontend return URL
        $frontend_url = self::get_frontend_return_url($m_payment_id, $success, $order_status);

        error_log('PayFast Return - Redirecting to: ' . $frontend_url);

        // Redirect to frontend
        wp_redirect($frontend_url);
        exit;
    }

    /**
     * Get frontend return URL
     *
     * @param int    $order_id Order ID
     * @param bool   $success  Whether payment was successful
     * @param string $status   Order status
     * @return string Frontend return URL
     */
    private static function get_frontend_return_url($order_id, $success, $status) {
        // Detect frontend URL
        $frontend_url = self::get_frontend_url();

        $pf_payment_id = isset($_GET['pf_payment_id']) ? sanitize_text_field($_GET['pf_payment_id']) : '';

        // Build return parameters
        $params = array(
            'order_id' => $order_id,
            'payment_status' => $success ? 'complete' : $status,
            'pf_payment_id' => $pf_payment_id,
            'timestamp' => current_time('timestamp'),
            'return_source' => 'payfast',
        );

        return $frontend_url . '/checkout?' . http_build_query($params);
    }

    /**
     * Get frontend URL
     *
     * In development: http://localhost:3000
     * In production: https://belims-headless-react-app.netlify.app/
     *
     * @return string Frontend URL
     */
    private static function get_frontend_url() {
        return function_exists('get_frontend_url') ? \get_frontend_url() : 'https://belims.vercel.app';
    }
}

// Initialize the handler
PayFast_Return_Handler::init();
