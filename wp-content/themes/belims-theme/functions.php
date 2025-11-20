<?php
/**
 * Belims Theme Functions
 */

// Add theme support for post thumbnails
add_theme_support('post-thumbnails');

// Enqueue styles and scripts
function belims_theme_assets() {
    wp_enqueue_style('theme-style', get_stylesheet_uri());
}
add_action('wp_enqueue_scripts', 'belims_theme_assets');

// Add CORS headers for API access
function add_cors_headers() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
}
add_action('init', 'add_cors_headers');