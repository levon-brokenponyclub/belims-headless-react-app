<?php
/**
 * Helper functions for Belims Site Settings
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Site Branding Functions
 */
function belims_get_site_logo() {
    return get_field('site_logo', 'option');
}

function belims_get_site_favicon() {
    return get_field('site_favicon', 'option');
}

function belims_get_site_tagline() {
    return get_field('site_tagline', 'option') ?: get_bloginfo('description');
}

function belims_get_brand_colors() {
    return get_field('brand_colors', 'option');
}

/**
 * Contact Information Functions
 */
function belims_get_company_name() {
    return get_field('company_name', 'option') ?: get_bloginfo('name');
}

function belims_get_business_phone() {
    return get_field('phone_number', 'option');
}

function belims_get_business_email() {
    return get_field('email_address', 'option') ?: get_option('admin_email');
}

function belims_get_business_address() {
    return get_field('physical_address', 'option');
}

/**
 * E-commerce Functions
 */
function belims_get_currency_symbol() {
    return get_field('currency_symbol', 'option') ?: 'R';
}

function belims_get_free_shipping_threshold() {
    return get_field('free_shipping_threshold', 'option') ?: 1000;
}

function belims_get_delivery_fee() {
    return get_field('delivery_fee', 'option') ?: 150;
}

function belims_get_express_delivery_fee() {
    return get_field('express_delivery_fee', 'option') ?: 300;
}

/**
 * Notification Functions
 */
function belims_is_notification_enabled() {
    return get_field('notification_enabled', 'option');
}

function belims_get_notification_message() {
    return get_field('notification_message', 'option');
}

function belims_get_notification_type() {
    return get_field('notification_type', 'option') ?: 'promo';
}

/**
 * AI Features Functions
 */
function belims_get_gemini_api_key() {
    return get_field('gemini_api_key', 'option');
}

function belims_get_ai_features_settings() {
    return get_field('ai_features', 'option');
}

function belims_is_ai_feature_enabled($feature) {
    $ai_features = belims_get_ai_features_settings();
    switch($feature) {
        case 'paint_assistant':
            return $ai_features['ai_paint_assistant_enabled'] ?? false;
        case 'delivery_optimizer':
            return $ai_features['ai_delivery_optimizer_enabled'] ?? false;
        case 'price_matching':
            return $ai_features['ai_price_matching_enabled'] ?? false;
        default:
            return false;
    }
}

/**
 * Utility Functions
 */
function belims_format_price($amount) {
    $currency = belims_get_currency_symbol();
    return $currency . number_format($amount, 2);
}

function belims_check_free_shipping($cart_total) {
    $threshold = belims_get_free_shipping_threshold();
    return $cart_total >= $threshold;
}

function belims_calculate_delivery_fee($cart_total, $express = false) {
    if (belims_check_free_shipping($cart_total)) {
        return 0;
    }
    
    return $express ? belims_get_express_delivery_fee() : belims_get_delivery_fee();
}

/**
 * API Configuration Functions
 */
function belims_get_api_settings() {
    return array(
        'headless_frontend_url' => get_field('headless_frontend_url', 'option'),
        'bobgo' => belims_get_bobgo_settings(),
        'payment' => belims_get_payment_settings(),
        'gemini' => belims_get_gemini_settings(),
    );
}

function belims_get_bobgo_settings() {
    return array(
        'enabled' => get_field('bobgo_enabled', 'option'),
        'api_url' => get_field('bobgo_api_url', 'option'),
        'channel_id' => get_field('bobgo_channel_id', 'option'),
        // API key is intentionally not returned to frontend
    );
}

function belims_get_payment_settings() {
    return array(
        'gateway' => get_field('payment_gateway', 'option') ?: 'payfast',
        // API keys are intentionally not returned to frontend
    );
}

function belims_get_gemini_settings() {
    return array(
        'enabled' => get_field('gemini_enabled', 'option'),
        // API key is intentionally not returned to frontend
    );
}

/**
 * Check if API is configured
 */
function belims_is_bobgo_configured() {
    $settings = belims_get_bobgo_settings();
    return $settings['enabled'] && !empty($settings['api_url']) && !empty($settings['channel_id']);
}

function belims_is_gemini_configured() {
    return !empty(get_field('gemini_api_key', 'option'));
}