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
        if (!get_query_var('payfast_return')) {
            return;
        }

        // Get PayFast data from query string
        $m_payment_id = isset($_GET['m_payment_id']) ? intval($_GET['m_payment_id']) : null;
        $pf_payment_id = isset($_GET['pf_payment_id']) ? sanitize_text_field($_GET['pf_payment_id']) : null;

        if (!$m_payment_id) {
            wp_redirect(home_url('/'));
            exit;
        }

        // Get the order
        $order = wc_get_order($m_payment_id);

        if (!$order) {
            // Invalid order, redirect to frontend home
            wp_redirect(home_url('/'));
            exit;
        }

        $order_status = $order->get_status();
        
        // Check multiple success conditions:
        // 1. Order status is processing/completed (ITN already processed)
        // 2. Payment meta exists and shows payment was attempted (user just completed PayFast)
        $success = in_array($order_status, array('processing', 'completed'));
        
        // If not yet processing, it might be pending because ITN hasn't been processed yet
        // In this case, redirect to checkout to show pending status and allow retry
        // The frontend OrderConfirmation will keep polling for status updates
        
        // Build frontend return URL
        $frontend_url = self::get_frontend_return_url($m_payment_id, $success, $order_status);

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

        // Build return parameters
        $params = array(
            'order_id' => $order_id,
            'payment_status' => $success ? 'complete' : $status,
            'timestamp' => current_time('timestamp'),
        );

        // Add success/error path
        if ($success) {
            return $frontend_url . '/order-confirmation?' . http_build_query($params);
        } else {
            return $frontend_url . '/checkout?' . http_build_query($params) . '&error=payment_failed';
        }
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
        // Production frontend URL
        $frontend_url = 'https://belims-headless-react-app.netlify.app';
        
        // Check if we're in development/local environment
        if (defined('WP_DEBUG') && WP_DEBUG) {
            // Get frontend URL from environment or use default
            $env_frontend_url = getenv('FRONTEND_URL');
            if ($env_frontend_url) {
                return rtrim($env_frontend_url, '/');
            }

            // Default development URL
            if (strpos($_SERVER['HTTP_HOST'], 'localhost') !== false || 
                strpos($_SERVER['HTTP_HOST'], '.local') !== false) {
                $frontend_url = 'http://localhost:3000';
            }
        }

        return rtrim($frontend_url, '/');
    }
}

// Initialize the handler
PayFast_Return_Handler::init();
