<?php
/**
 * PayFast Payment Gateway API Endpoints
 *
 * @package GlobalSiteSettings
 * @subpackage PayFast
 */

if (!defined('ABSPATH')) {
    exit;
}

class PayFast_API {

    /**
     * Register REST endpoints
     */
    public static function register_endpoints() {
        // Get PayFast configuration
        register_rest_route('belims/v1', '/payfast/config', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_payfast_config'),
            'permission_callback' => '__return_true',
        ));

        // Initiate payment
        register_rest_route('belims/v1', '/payfast/initiate-payment', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'initiate_payment'),
            'permission_callback' => '__return_true',
        ));

        // Verify payment
        register_rest_route('belims/v1', '/payfast/verify-payment/(?P<order_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'verify_payment'),
            'permission_callback' => '__return_true',
        ));

        // Get payment status
        register_rest_route('belims/v1', '/payfast/payment-status/(?P<order_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_payment_status'),
            'permission_callback' => '__return_true',
        ));

        // ITN Callback (Instant Transaction Notification)
        register_rest_route('belims/v1', '/payfast/itn', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'handle_itn'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Get PayFast Configuration
     */
    public static function get_payfast_config() {
        // Get PayFast settings from WooCommerce
        $payfast_settings = get_option('woocommerce_payfast_settings', array());

        return rest_ensure_response(array(
            'merchantId' => $payfast_settings['merchant_id'] ?? '',
            'merchantKey' => $payfast_settings['merchant_key'] ?? '',
            'passPhrase' => $payfast_settings['pass_phrase'] ?? '',
            'testMode' => !empty($payfast_settings['testmode']) && $payfast_settings['testmode'] === 'yes',
            'returnUrl' => home_url('/payfast-return'),
            'cancelUrl' => home_url('/payfast-cancel'),
            'notifyUrl' => rest_url('belims/v1/payfast/itn'),
        ));
    }

    /**
     * Initiate PayFast Payment
     */
    public static function initiate_payment($request) {
        $params = $request->get_json_params();

        $order_id = $params['order_id'] ?? null;
        $amount = $params['amount'] ?? null;
        $currency = $params['currency'] ?? 'ZAR';
        $customer_email = $params['customer_email'] ?? '';
        $customer_name = $params['customer_name'] ?? '';
        $customer_phone = $params['customer_phone'] ?? '';

        if (!$order_id || !$amount) {
            return new WP_Error('missing_params', 'Order ID and amount are required', array('status' => 400));
        }

        // Get the WooCommerce order
        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('order_not_found', 'Order not found', array('status' => 404));
        }

        // Get PayFast settings
        $payfast_settings = get_option('woocommerce_payfast_settings', array());

        if (empty($payfast_settings['merchant_id']) || empty($payfast_settings['merchant_key'])) {
            return new WP_Error('payfast_config_missing', 'PayFast not configured', array('status' => 500));
        }

        // Build PayFast data (without passphrase and user_agent)
        // user_agent is used only for signature calculation, NOT sent in URL
        $payfast_data = array(
            'merchant_id' => $payfast_settings['merchant_id'],
            'merchant_key' => $payfast_settings['merchant_key'],
            'return_url' => home_url('/payfast-return'),
            'cancel_url' => home_url('/payfast-cancel'),
            'notify_url' => rest_url('belims/v1/payfast/itn'),
            'name_first' => sanitize_text_field($customer_name ? explode(' ', $customer_name)[0] : ''),
            'name_last' => sanitize_text_field($customer_name ? end(explode(' ', $customer_name)) : ''),
            'email_address' => sanitize_email($customer_email),
            'cell_number' => sanitize_text_field($customer_phone),
            'm_payment_id' => $order_id,
            'amount' => number_format((float)$amount, 2, '.', ''),
            'item_name' => 'Order #' . $order_id,
            'item_description' => 'Belims Hardware Order',
            'custom_str1' => $order->get_order_key(),
            'custom_str2' => json_encode(array(
                'order_id' => $order_id,
                'store_url' => home_url(),
            )),
        );

        // Generate signature (with user_agent for calculation but NOT included in URL)
        $signature = self::generate_payfast_signature($payfast_data, $_SERVER['HTTP_USER_AGENT'] ?? '');
        $payfast_data['signature'] = $signature;

        // Build redirect URL (user_agent NOT included in query string)
        $is_test_mode = !empty($payfast_settings['testmode']) && $payfast_settings['testmode'] === 'yes';
        $payfast_url = $is_test_mode
            ? 'https://sandbox.payfast.co.za/eng/process'
            : 'https://www.payfast.co.za/eng/process';

        // Build query string (signature added but NOT passphrase)
        $redirect_url = $payfast_url . '?' . http_build_query($payfast_data);

        // Store payment pending state in order meta
        $order->update_meta_data('_payfast_payment_initiated', current_time('mysql'));
        $order->save();

        return rest_ensure_response(array(
            'success' => true,
            'order_id' => $order_id,
            'redirect_url' => $redirect_url,
            'payfast_url' => $redirect_url,
            'test_mode' => $is_test_mode,
        ));
    }

    /**
     * Generate PayFast Signature
     * 
     * Based on the official WooCommerce PayFast plugin implementation
     * 
     * Steps:
     * 1. Add passphrase to data before sorting
     * 2. Sort keys alphabetically
     * 3. Build string: key=urlencode(value)&key=urlencode(value)&...
     * 4. Remove trailing &
     * 5. MD5 hash
     */
    public static function generate_payfast_signature($data, $user_agent = '') {
        // Remove signature from data if present
        unset($data['signature']);

        // Add user_agent for signature calculation (not sent in URL)
        if (!empty($user_agent)) {
            $data['user_agent'] = $user_agent;
        }

        // Get passphrase from settings
        $payfast_settings = get_option('woocommerce_payfast_settings', array());
        
        // Add passphrase BEFORE sorting (per official plugin)
        if (!empty($payfast_settings['pass_phrase'])) {
            $data['passphrase'] = $payfast_settings['pass_phrase'];
        }

        // Sort keys alphabetically
        ksort($data);

        // Build signature string using urlencode (per official plugin)
        $parameter_string = '';
        foreach ($data as $key => $value) {
            // Skip empty values and signature field
            if (!empty($value) && $key !== 'signature') {
                $parameter_string .= $key . '=' . urlencode((string)$value) . '&';
            }
        }

        // Remove trailing ampersand
        $parameter_string = rtrim($parameter_string, '&');

        return md5($parameter_string);
    }

    /**
     * Verify Payment
     */
    public static function verify_payment($request) {
        $order_id = $request->get_param('order_id');

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('order_not_found', 'Order not found', array('status' => 404));
        }

        // Check order status/payment status
        $payment_method = $order->get_payment_method();
        $order_status = $order->get_status();
        $payfast_payment_id = $order->get_meta('_payfast_payment_id');
        $payfast_status = $order->get_meta('_payfast_payment_status');

        $is_paid = in_array($order_status, array('processing', 'completed'));

        return rest_ensure_response(array(
            'success' => $is_paid,
            'order_id' => $order_id,
            'order_status' => $order_status,
            'payment_status' => $payfast_status,
            'transaction_id' => $payfast_payment_id,
            'paid' => $is_paid,
        ));
    }

    /**
     * Get Payment Status
     */
    public static function get_payment_status($request) {
        $order_id = $request->get_param('order_id');

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('order_not_found', 'Order not found', array('status' => 404));
        }

        $order_status = $order->get_status();
        $payfast_status = $order->get_meta('_payfast_payment_status') ?: 'pending';

        // Map WooCommerce status to payment status
        if (in_array($order_status, array('processing', 'completed'))) {
            $payment_status = 'paid';
        } elseif ($order_status === 'failed' || $order_status === 'cancelled') {
            $payment_status = 'failed';
        } else {
            $payment_status = 'pending';
        }

        return rest_ensure_response(array(
            'order_id' => $order_id,
            'payment_status' => $payment_status,
            'order_status' => $order_status,
            'transaction_id' => $order->get_meta('_payfast_payment_id'),
            'message' => 'Order ' . $order_status,
        ));
    }

    /**
     * Handle PayFast ITN (Instant Transaction Notification)
     *
     * PayFast sends POST data to confirm payment
     */
    public static function handle_itn($request) {
        // Get POST data
        $post_data = $request->get_json_params();

        if (empty($post_data)) {
            // Try form data
            $post_data = $_POST; // phpcs:ignore WordPress.Security.NonceVerification.Missing
        }

        // Log ITN
        self::log_itn($post_data);

        // Verify signature
        if (!self::verify_itn_signature($post_data)) {
            do_action('payfast_itn_signature_failed', $post_data);
            return new WP_Error('invalid_signature', 'Invalid signature', array('status' => 403));
        }

        // Get order ID from m_payment_id
        $order_id = isset($post_data['m_payment_id']) ? intval($post_data['m_payment_id']) : null;
        $payfast_payment_id = isset($post_data['pf_payment_id']) ? $post_data['pf_payment_id'] : null;
        $payment_status = isset($post_data['payment_status']) ? $post_data['payment_status'] : null;

        if (!$order_id) {
            do_action('payfast_itn_invalid_order', $post_data);
            return new WP_Error('invalid_order', 'Invalid order', array('status' => 400));
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            do_action('payfast_itn_order_not_found', $order_id, $post_data);
            return new WP_Error('order_not_found', 'Order not found', array('status' => 404));
        }

        // Update order meta with PayFast data
        $order->update_meta_data('_payfast_payment_id', $payfast_payment_id);
        $order->update_meta_data('_payfast_payment_status', $payment_status);
        $order->update_meta_data('_payfast_itn_received', current_time('mysql'));

        // Handle payment status
        if ($payment_status === 'COMPLETE') {
            // Payment successful
            $order->payment_complete($payfast_payment_id);
            $order->update_status('processing', 'PayFast payment completed');
            do_action('payfast_payment_complete', $order, $post_data);
        } elseif ($payment_status === 'FAILED' || $payment_status === 'CANCELLED') {
            // Payment failed
            $order->update_status('failed', 'PayFast payment failed or cancelled');
            do_action('payfast_payment_failed', $order, $post_data);
        } else {
            // Pending
            $order->update_status('pending', 'PayFast payment pending: ' . $payment_status);
            do_action('payfast_payment_pending', $order, $post_data);
        }

        $order->save();

        return rest_ensure_response(array(
            'success' => true,
            'order_id' => $order_id,
            'payment_status' => $payment_status,
        ));
    }

    /**
     * Verify ITN Signature
     * 
     * Matches the official WooCommerce PayFast plugin implementation
     */
    public static function verify_itn_signature($data) {
        $payfast_settings = get_option('woocommerce_payfast_settings', array());

        // Get signature from data
        $signature = isset($data['signature']) ? $data['signature'] : '';

        if (empty($signature)) {
            return false;
        }

        // Remove signature from data
        unset($data['signature']);

        // Add passphrase BEFORE sorting (per official plugin)
        if (!empty($payfast_settings['pass_phrase'])) {
            $data['passphrase'] = $payfast_settings['pass_phrase'];
        }

        // Sort keys alphabetically
        ksort($data);

        // Build parameter string using urlencode
        $parameter_string = '';
        foreach ($data as $key => $value) {
            // Skip empty values
            if (!empty($value)) {
                $parameter_string .= $key . '=' . urlencode((string)$value) . '&';
            }
        }

        // Remove trailing ampersand
        $parameter_string = rtrim($parameter_string, '&');

        $expected_signature = md5($parameter_string);

        return hash_equals($signature, $expected_signature);
    }

    /**
     * Log ITN for debugging
     */
    public static function log_itn($data) {
        if (function_exists('wc_get_logger')) {
            $logger = wc_get_logger();
            $logger->info('PayFast ITN Received', array(
                'source' => 'payfast-api',
                'data' => $data,
            ));
        }
    }
}

// Register endpoints when REST API loads
add_action('rest_api_init', array('PayFast_API', 'register_endpoints'));
