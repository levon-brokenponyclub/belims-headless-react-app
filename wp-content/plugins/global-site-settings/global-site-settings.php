<?php
/**
 * Plugin Name: Global Site Settings
 * Plugin URI: https://belims.co.za
 * Description: Unified plugin for Belims site settings, ACF field groups, REST API endpoints, and third-party integrations (WooCommerce, FTG, BobGo, AI).
 * Version: 2.0.0
 * Author: Belims Team & Co Pilot
 * Author URI: https://belims.co.za
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: global-site-settings
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GLOBAL_SITE_SETTINGS_VERSION', '2.0.0');
define('GLOBAL_SITE_SETTINGS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GLOBAL_SITE_SETTINGS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Initialize the plugin
 */
function global_site_settings_init() {
    // Load ACF field groups (site settings)
    if (file_exists(GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/acf-field-groups.php')) {
        require_once GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/acf-field-groups.php';
    }

    // Load REST API endpoint classes
    $endpoints = [
        'class-products-endpoint.php',
        'class-categories-endpoint.php',
        'class-orders-endpoint.php',
        'class-ftg-api.php',
        'class-ftg-sync-endpoint.php',
    ];

    foreach ($endpoints as $endpoint) {
        $file_path = GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/' . $endpoint;
        if (file_exists($file_path)) {
            require_once $file_path;
        }
    }

    // Register REST API endpoints
    add_action('rest_api_init', 'global_site_settings_register_endpoints');
}
add_action('plugins_loaded', 'global_site_settings_init');

/**
 * Register all REST API endpoints
 */
function global_site_settings_register_endpoints() {
    // Products endpoint
    if (class_exists('Belims_Products_Endpoint')) {
        $products_endpoint = new Belims_Products_Endpoint();
        $products_endpoint->register_routes();
    }

    // Categories endpoint
    if (class_exists('Belims_Categories_Endpoint')) {
        $categories_endpoint = new Belims_Categories_Endpoint();
        $categories_endpoint->register_routes();
    }

    // Orders endpoint
    if (class_exists('Belims_Orders_Endpoint')) {
        $orders_endpoint = new Belims_Orders_Endpoint();
        $orders_endpoint->register_routes();
    }

    // FTG sync endpoint
    if (class_exists('Belims_FTG_Sync_Endpoint')) {
        $ftg_sync_endpoint = new Belims_FTG_Sync_Endpoint();
        $ftg_sync_endpoint->register_routes();
    }
}

/**
 * Activation hook
 */
function global_site_settings_activate() {
    // Flush rewrite rules
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'global_site_settings_activate');

/**
 * Deactivation hook
 */
function global_site_settings_deactivate() {
    // Flush rewrite rules
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'global_site_settings_deactivate');
