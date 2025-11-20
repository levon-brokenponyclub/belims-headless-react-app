<?php
/**
 * Helper functions to get ACF options values
 * Use these functions in your theme to access site settings
 */

// Site Branding
function get_site_logo() {
    return get_field('site_logo', 'option');
}

function get_site_favicon() {
    return get_field('site_favicon', 'option');
}

function get_site_tagline() {
    return get_field('site_tagline', 'option') ?: get_bloginfo('description');
}

function get_brand_colors() {
    return get_field('brand_colors', 'option');
}

// Contact Information
function get_company_name() {
    return get_field('company_name', 'option') ?: get_bloginfo('name');
}

function get_business_phone() {
    return get_field('phone_number', 'option');
}

function get_business_email() {
    return get_field('email_address', 'option') ?: get_option('admin_email');
}

function get_business_address() {
    return get_field('physical_address', 'option');
}

function get_business_hours() {
    return get_field('business_hours', 'option');
}

// E-commerce Settings
function get_currency_symbol() {
    return get_field('currency_symbol', 'option') ?: 'R';
}

function get_free_shipping_threshold() {
    return get_field('free_shipping_threshold', 'option') ?: 1000;
}

function get_delivery_fee() {
    return get_field('delivery_fee', 'option') ?: 150;
}

function get_express_delivery_fee() {
    return get_field('express_delivery_fee', 'option') ?: 300;
}

function get_store_locations() {
    return get_field('store_locations', 'option');
}

// Social Media
function get_social_media_links() {
    return get_field('social_media', 'option');
}

function get_google_analytics_id() {
    return get_field('google_analytics_id', 'option');
}

function get_google_maps_api_key() {
    return get_field('google_maps_api_key', 'option');
}

// Newsletter
function get_newsletter_settings() {
    return get_field('newsletter_settings', 'option');
}

// Notifications
function get_notification_bar() {
    return get_field('notification_bar', 'option');
}

function is_maintenance_mode() {
    $maintenance = get_field('maintenance_mode', 'option');
    return $maintenance['maintenance_enabled'] ?? false;
}

function get_maintenance_message() {
    $maintenance = get_field('maintenance_mode', 'option');
    return $maintenance['maintenance_message'] ?? 'We are currently performing scheduled maintenance. Please check back soon!';
}

// AI & Integrations
function get_gemini_api_key() {
    return get_field('gemini_api_key', 'option');
}

function get_weather_api_key() {
    return get_field('weather_api_key', 'option');
}

function get_ai_features_settings() {
    return get_field('ai_features', 'option');
}

function is_ai_feature_enabled($feature) {
    $ai_features = get_ai_features_settings();
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

// REST API endpoint to get all site settings for headless frontend
function register_site_settings_endpoint() {
    register_rest_route('belims/v1', '/site-settings', array(
        'methods' => 'GET',
        'callback' => 'get_site_settings_for_api',
        'permission_callback' => '__return_true'
    ));
}

function get_site_settings_for_api() {
    return array(
        'branding' => array(
            'logo' => get_site_logo(),
            'favicon' => get_site_favicon(),
            'tagline' => get_site_tagline(),
            'colors' => get_brand_colors(),
            'company_name' => get_company_name()
        ),
        'contact' => array(
            'phone' => get_business_phone(),
            'email' => get_business_email(),
            'address' => get_business_address(),
            'hours' => get_business_hours()
        ),
        'ecommerce' => array(
            'currency_symbol' => get_currency_symbol(),
            'free_shipping_threshold' => get_free_shipping_threshold(),
            'delivery_fee' => get_delivery_fee(),
            'express_delivery_fee' => get_express_delivery_fee(),
            'store_locations' => get_store_locations()
        ),
        'social' => array(
            'links' => get_social_media_links(),
            'google_analytics' => get_google_analytics_id()
        ),
        'notifications' => array(
            'notification_bar' => get_notification_bar(),
            'maintenance_mode' => is_maintenance_mode(),
            'maintenance_message' => get_maintenance_message()
        ),
        'features' => array(
            'ai_paint_assistant' => is_ai_feature_enabled('paint_assistant'),
            'ai_delivery_optimizer' => is_ai_feature_enabled('delivery_optimizer'),
            'ai_price_matching' => is_ai_feature_enabled('price_matching')
        ),
        'newsletter' => get_newsletter_settings()
    );
}

add_action('rest_api_init', 'register_site_settings_endpoint');