<?php
/**
 * REST API endpoints for Belims Site Settings
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Register REST API endpoints
add_action('rest_api_init', 'belims_register_rest_endpoints');

function belims_register_rest_endpoints() {
    // Site settings endpoint
    register_rest_route('belims/v1', '/site-settings', array(
        'methods' => 'GET',
        'callback' => 'belims_get_site_settings_api',
        'permission_callback' => '__return_true'
    ));
    
    // Notification bar endpoint
    register_rest_route('belims/v1', '/notification', array(
        'methods' => 'GET',
        'callback' => 'belims_get_notification_api',
        'permission_callback' => '__return_true'
    ));
    
    // AI features endpoint
    register_rest_route('belims/v1', '/ai-features', array(
        'methods' => 'GET',
        'callback' => 'belims_get_ai_features_api',
        'permission_callback' => '__return_true'
    ));
    
    // Shipping calculator endpoint
    register_rest_route('belims/v1', '/calculate-shipping', array(
        'methods' => 'POST',
        'callback' => 'belims_calculate_shipping_api',
        'permission_callback' => '__return_true',
        'args' => array(
            'cart_total' => array(
                'required' => true,
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            ),
            'express' => array(
                'default' => false,
                'validate_callback' => function($param) {
                    return is_bool($param) || in_array($param, ['true', 'false', '1', '0']);
                }
            )
        )
    ));
}

/**
 * Get all site settings for API
 */
function belims_get_site_settings_api() {
    $logo = belims_get_site_logo();
    $favicon = belims_get_site_favicon();
    
    return array(
        'branding' => array(
            'logo' => $logo ? $logo['url'] : null,
            'logo_alt' => $logo ? $logo['alt'] : '',
            'favicon' => $favicon ? $favicon['url'] : null,
            'tagline' => belims_get_site_tagline(),
            'colors' => belims_get_brand_colors(),
            'company_name' => belims_get_company_name()
        ),
        'contact' => array(
            'phone' => belims_get_business_phone(),
            'email' => belims_get_business_email(),
            'address' => belims_get_business_address()
        ),
        'ecommerce' => array(
            'currency_symbol' => belims_get_currency_symbol(),
            'free_shipping_threshold' => belims_get_free_shipping_threshold(),
            'delivery_fee' => belims_get_delivery_fee(),
            'express_delivery_fee' => belims_get_express_delivery_fee()
        ),
        'notifications' => array(
            'enabled' => belims_is_notification_enabled(),
            'message' => belims_get_notification_message(),
            'type' => belims_get_notification_type()
        ),
        'features' => array(
            'ai_paint_assistant' => belims_is_ai_feature_enabled('paint_assistant'),
            'ai_delivery_optimizer' => belims_is_ai_feature_enabled('delivery_optimizer'),
            'ai_price_matching' => belims_is_ai_feature_enabled('price_matching')
        )
    );
}

/**
 * Get notification bar settings
 */
function belims_get_notification_api() {
    return array(
        'enabled' => belims_is_notification_enabled(),
        'message' => belims_get_notification_message(),
        'type' => belims_get_notification_type()
    );
}

/**
 * Get AI features settings
 */
function belims_get_ai_features_api() {
    return array(
        'paint_assistant' => belims_is_ai_feature_enabled('paint_assistant'),
        'delivery_optimizer' => belims_is_ai_feature_enabled('delivery_optimizer'),
        'price_matching' => belims_is_ai_feature_enabled('price_matching'),
        'gemini_available' => !empty(belims_get_gemini_api_key())
    );
}

/**
 * Calculate shipping costs
 */
function belims_calculate_shipping_api($request) {
    $cart_total = floatval($request['cart_total']);
    $express = filter_var($request['express'], FILTER_VALIDATE_BOOLEAN);
    
    $shipping_fee = belims_calculate_delivery_fee($cart_total, $express);
    $is_free_shipping = belims_check_free_shipping($cart_total);
    
    return array(
        'cart_total' => $cart_total,
        'shipping_fee' => $shipping_fee,
        'is_free_shipping' => $is_free_shipping,
        'express_shipping' => $express,
        'total' => $cart_total + $shipping_fee,
        'free_shipping_threshold' => belims_get_free_shipping_threshold(),
        'currency_symbol' => belims_get_currency_symbol()
    );
}