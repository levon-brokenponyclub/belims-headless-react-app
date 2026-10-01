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
            'args' => array(
                'key' => array('type' => 'string', 'required' => true),
            ),
        ));

        // Get payment status
        register_rest_route('belims/v1', '/payfast/payment-status/(?P<order_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_payment_status'),
            'permission_callback' => '__return_true',
            'args' => array(
                'key' => array('type' => 'string', 'required' => true),
            ),
        ));

        // ITN Callback (Instant Transaction Notification)
        register_rest_route('belims/v1', '/payfast/itn', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'handle_itn'),
            'permission_callback' => '__return_true',
        ));

        // Testing endpoint: Mark order as paid (admin only)
        register_rest_route('belims/v1', '/payfast/test/mark-paid/(?P<order_id>\d+)', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'test_mark_paid'),
            'permission_callback' => function() {
                return current_user_can('manage_options');
            },
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
            'testMode' => !empty($payfast_settings['testmode']) && $payfast_settings['testmode'] === 'yes',
            'returnUrl' => home_url('/?payfast_return=1'),
            'cancelUrl' => (function_exists('get_frontend_url') ? \get_frontend_url() : 'https://belims.vercel.app') . '/checkout',
            'notifyUrl' => rest_url('belims/v1/payfast/itn'),
        ));
    }

    /**
     * Initiate PayFast Payment
     */
    public static function initiate_payment($request) {
        $params = $request->get_json_params();

        $order_id = $params['order_id'] ?? null;
        $order_key = isset($params['order_key']) ? sanitize_text_field($params['order_key']) : '';
        $currency = $params['currency'] ?? 'ZAR';
        $customer_email = $params['customer_email'] ?? '';
        $customer_name = $params['customer_name'] ?? '';
        $customer_phone = $params['customer_phone'] ?? '';

        if (!$order_id || $order_key === '') {
            return new WP_Error('missing_params', 'Order ID and order key are required', array('status' => 400));
        }

        // Get the WooCommerce order (the key proves the caller placed it)
        $order = wc_get_order($order_id);
        if (!$order || !hash_equals($order->get_order_key(), $order_key)) {
            return new WP_Error('order_not_found', 'Order not found', array('status' => 404));
        }

        if (!$order->has_status(array('pending', 'failed'))) {
            return new WP_Error('order_not_payable', 'This order cannot be paid', array('status' => 409));
        }

        // Charge what the order totals — never an amount supplied by the browser
        $amount = (float) $order->get_total();

        // Get PayFast settings
        $payfast_settings = get_option('woocommerce_payfast_settings', array());

        if (empty($payfast_settings['merchant_id']) || empty($payfast_settings['merchant_key'])) {
            return new WP_Error('payfast_config_missing', 'PayFast not configured', array('status' => 500));
        }

        // Build PayFast data (without passphrase and user_agent)
        // Passphrase is used only for signature calculation, NOT sent in URL
        // user_agent is NOT used in signature for redirect URL method
        $name_parts = explode(' ', $customer_name);
        $return_url = add_query_arg(
            array(
                'payfast_return' => '1',
                'm_payment_id' => $order_id,
                'key' => $order->get_order_key(),
            ),
            home_url('/')
        );

        $payfast_data = array(
            'merchant_id' => $payfast_settings['merchant_id'],
            'merchant_key' => $payfast_settings['merchant_key'],
            'return_url' => $return_url,
            'cancel_url' => belims_order_frontend_url($order) . '/checkout',
            'notify_url' => rest_url('belims/v1/payfast/itn'),
            'name_first' => sanitize_text_field($name_parts[0] ?? ''),
            'name_last' => sanitize_text_field($name_parts[1] ?? ''),
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

        // Generate signature (passphrase added internally, user_agent NOT used)
        $signature = self::generate_payfast_signature($payfast_data);
        $payfast_data['signature'] = $signature;

        // Build redirect URL
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
     * 
     * Note: user_agent is NOT included in signature for redirect URL method
     */
    public static function generate_payfast_signature($data, $user_agent = '') {
        // Remove signature and user_agent from data
        unset($data['signature']);
        unset($data['user_agent']);

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
        if (!$order || !\Belims_Orders_Endpoint::can_access_order($order, $request->get_param('key'))) {
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
        if (!$order || !\Belims_Orders_Endpoint::can_access_order($order, $request->get_param('key'))) {
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
     * The only path that marks an order paid. Checks, in order: signature,
     * order + order key, amount, then PayFast's own validation endpoint.
     * Repeated ITNs for an already-paid order are acknowledged without changes.
     */
    public static function handle_itn($request) {
        // Form-encoded POST in the order PayFast sent it (unslashed) — the signature depends on that order
        $post_data = $request->get_body_params();
        if (empty($post_data) || !is_array($post_data)) {
            $post_data = (array) $request->get_json_params();
        }

        self::log_itn($post_data);

        if (!self::verify_itn_signature($post_data)) {
            error_log('PayFast ITN: signature verification failed for m_payment_id ' . ($post_data['m_payment_id'] ?? '?'));
            do_action('payfast_itn_signature_failed', $post_data);
            return new WP_Error('invalid_signature', 'Invalid signature', array('status' => 403));
        }

        $order_id = isset($post_data['m_payment_id']) ? intval($post_data['m_payment_id']) : 0;
        $payfast_payment_id = isset($post_data['pf_payment_id']) ? sanitize_text_field($post_data['pf_payment_id']) : '';
        $payment_status = isset($post_data['payment_status']) ? strtoupper(sanitize_text_field($post_data['payment_status'])) : '';

        $order = $order_id ? wc_get_order($order_id) : false;
        if (!$order || !hash_equals($order->get_order_key(), (string) ($post_data['custom_str1'] ?? ''))) {
            error_log('PayFast ITN: unknown order or order key mismatch for m_payment_id ' . $order_id);
            do_action('payfast_itn_invalid_order', $post_data);
            return new WP_Error('invalid_order', 'Invalid order', array('status' => 400));
        }

        // Already paid — acknowledge so PayFast stops retrying, change nothing
        if ($order->is_paid()) {
            return rest_ensure_response(array('success' => true, 'order_id' => $order_id, 'payment_status' => 'already_paid'));
        }

        $amount_gross = isset($post_data['amount_gross']) ? (float) $post_data['amount_gross'] : -1;
        if (abs($amount_gross - (float) $order->get_total()) > 0.01) {
            $order->add_order_note(sprintf('PayFast ITN rejected: amount %s does not match order total %s.', $post_data['amount_gross'] ?? '?', $order->get_total()));
            error_log('PayFast ITN: amount mismatch for order ' . $order_id);
            return new WP_Error('amount_mismatch', 'Amount mismatch', array('status' => 400));
        }

        if (!self::validate_itn_with_payfast($post_data)) {
            error_log('PayFast ITN: PayFast server validation failed for order ' . $order_id);
            return new WP_Error('itn_not_valid', 'ITN could not be validated with PayFast', array('status' => 400));
        }

        $order->update_meta_data('_payfast_payment_id', $payfast_payment_id);
        $order->update_meta_data('_payfast_payment_status', $payment_status);
        $order->update_meta_data('_payfast_itn_received', current_time('mysql'));
        $order->save();

        if ($payment_status === 'COMPLETE') {
            $order->payment_complete($payfast_payment_id);
            $order->add_order_note('PayFast payment completed (ITN verified). PayFast ID: ' . $payfast_payment_id);
            do_action('payfast_payment_complete', $order, $post_data);
        } elseif ($payment_status === 'FAILED' || $payment_status === 'CANCELLED') {
            $order->update_status('failed', 'PayFast payment failed or cancelled (ITN).');
            do_action('payfast_payment_failed', $order, $post_data);
        } else {
            $order->update_status('pending', 'PayFast payment pending: ' . $payment_status);
            do_action('payfast_payment_pending', $order, $post_data);
        }

        return rest_ensure_response(array(
            'success' => true,
            'order_id' => $order_id,
            'payment_status' => $payment_status,
        ));
    }

    /**
     * Build the ITN parameter string: fields in the order PayFast posted them,
     * up to (not including) the signature, values urlencoded, empty values kept.
     */
    private static function itn_param_string($data) {
        $parts = array();
        foreach ($data as $key => $value) {
            if ($key === 'signature') {
                break;
            }
            $parts[] = $key . '=' . urlencode((string) $value);
        }
        return implode('&', $parts);
    }

    /**
     * Verify ITN Signature — md5(param string + "&passphrase=…"), per PayFast's ITN spec.
     */
    public static function verify_itn_signature($data) {
        $signature = isset($data['signature']) ? (string) $data['signature'] : '';
        if ($signature === '') {
            return false;
        }

        $payfast_settings = get_option('woocommerce_payfast_settings', array());
        $passphrase = trim((string) ($payfast_settings['pass_phrase'] ?? ''));

        $param_string = self::itn_param_string($data);
        if ($passphrase !== '') {
            $param_string .= '&passphrase=' . urlencode($passphrase);
        }

        return hash_equals(md5($param_string), $signature);
    }

    /**
     * Confirm the ITN with PayFast's server-side validation endpoint.
     */
    private static function validate_itn_with_payfast($data) {
        $payfast_settings = get_option('woocommerce_payfast_settings', array());
        $is_test_mode = !empty($payfast_settings['testmode']) && $payfast_settings['testmode'] === 'yes';
        $host = $is_test_mode ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za';

        $response = wp_remote_post($host . '/eng/query/validate', array(
            'body' => self::itn_param_string($data),
            'timeout' => 15,
            'headers' => array('Content-Type' => 'application/x-www-form-urlencoded'),
        ));

        if (is_wp_error($response)) {
            error_log('PayFast ITN: validation request error — ' . $response->get_error_message());
            return false;
        }

        return trim(wp_remote_retrieve_body($response)) === 'VALID';
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

    /**
     * Testing endpoint: Mark order as paid (simulates successful payment)
     * For testing the return flow without actually processing payments
     */
    public static function test_mark_paid($request) {
        $order_id = $request->get_param('order_id');

        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_Error('order_not_found', 'Order not found', array('status' => 404));
        }

        // Simulate PayFast ITN by updating order meta and status
        $test_payment_id = 'test-' . $order_id . '-' . time();
        
        $order->update_meta_data('_payfast_payment_id', $test_payment_id);
        $order->update_meta_data('_payfast_payment_status', 'COMPLETE');
        $order->update_meta_data('_payfast_itn_received', current_time('mysql'));
        $order->update_meta_data('_payfast_test_payment', 'yes'); // Mark as test
        $order->save();

        // Mark as paid
        $order->payment_complete($test_payment_id);
        $order->update_status('processing', 'Test payment marked as complete');
        
        error_log('PayFast TEST: Order ' . $order_id . ' marked as paid (test mode)');

        return rest_ensure_response(array(
            'success' => true,
            'order_id' => $order_id,
            'status' => 'processing',
            'payment_id' => $test_payment_id,
            'message' => 'Order marked as paid (test mode)',
        ));
    }
}

// Register endpoints when REST API loads
add_action('rest_api_init', array('PayFast_API', 'register_endpoints'));
