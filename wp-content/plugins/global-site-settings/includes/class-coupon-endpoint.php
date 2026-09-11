<?php
/**
 * Coupon Validation REST API Endpoint
 *
 * Provides a simple endpoint to validate WooCommerce coupon codes.
 *
 * @package Global_Site_Settings
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Coupon_Endpoint {

    public function register_routes() {
        register_rest_route('belims/v1', '/coupons', array(
            'methods' => 'GET',
            'callback' => array($this, 'validate_coupon'),
            'permission_callback' => '__return_true',
        ));
    }

    public function validate_coupon($request) {
        $code = isset($_GET['code']) ? sanitize_text_field($_GET['code']) : '';

        if (empty($code)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Coupon code is required.',
            ), 400);
        }

        $coupon = new WC_Coupon($code);

        if (!$coupon->get_id()) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Invalid or expired coupon code.',
            ), 404);
        }

        if (!$coupon->is_valid()) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => $coupon->get_error_message() ?: 'This coupon is not valid.',
            ), 400);
        }

        return new WP_REST_Response(array(
            'success' => true,
            'coupon' => array(
                'code' => $coupon->get_code(),
                'discount_type' => $coupon->get_discount_type(),
                'amount' => (string) $coupon->get_amount(),
                'description' => $coupon->get_description(),
                'expiry_date' => $coupon->get_date_expires() ? $coupon->get_date_expires()->date('Y-m-d H:i:s') : null,
            ),
        ), 200);
    }
}
