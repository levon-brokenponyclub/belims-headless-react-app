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

// Add CORS headers for API access with credentials support
function add_cors_headers() {
    $allowed_origins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://belims-headless-react-app.netlify.app'
    ];
    
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header("Access-Control-Allow-Credentials: true");
    }
    
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit;
    }
}
add_action('init', 'add_cors_headers');

// Set secure cookie attributes for authentication
function set_auth_cookie_secure($logged_in_cookie, $expire, $expiration, $user_id, $scheme) {
    $secure = is_ssl();
    $httponly = true;
    
    // Set SameSite attribute
    $same_site = 'None'; // Required for cross-origin with credentials
    
    setcookie(
        LOGGED_IN_COOKIE,
        $logged_in_cookie,
        [
            'expires' => $expire,
            'path' => COOKIEPATH,
            'domain' => COOKIE_DOMAIN,
            'secure' => true, // Always true for SameSite=None
            'httponly' => $httponly,
            'samesite' => $same_site
        ]
    );
}
add_action('set_logged_in_cookie', 'set_auth_cookie_secure', 10, 5);