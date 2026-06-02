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

// Add CORS headers for API access with credentials support.
// REST API CORS is handled separately via rest_pre_serve_request to avoid
// "headers already sent" conflicts with WordPress's own header pipeline.
function add_cors_headers() {
    // Skip for REST API requests — handled by belims_rest_cors_headers()
    if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
        return;
    }

    if ( headers_sent() ) {
        return;
    }

    $allowed_origins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://belims-headless-react-app.netlify.app'
    ];

    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

    if (in_array($origin, $allowed_origins)) {
        @header("Access-Control-Allow-Origin: {$origin}");
        @header("Access-Control-Allow-Credentials: true");
    }

    @header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    @header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-WP-Nonce");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit;
    }
}
add_action('init', 'add_cors_headers');

// CORS headers for REST API — hooked into WordPress's REST pre-serve pipeline
// so they are always set correctly without "headers already sent" issues.
add_filter('rest_pre_serve_request', function($served, $result, $request, $server) {
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
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-WP-Nonce");

    return $served;
}, 10, 4);

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

// Force login — redirect all non-authenticated visitors to the login page
function belims_force_login() {
    if (
        is_user_logged_in() ||
        ( defined( 'DOING_AJAX' ) && DOING_AJAX ) ||
        ( defined( 'DOING_CRON' ) && DOING_CRON ) ||
        ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ||
        ( defined( 'WP_CLI' ) && WP_CLI )
    ) {
        return;
    }

    wp_redirect( 'https://cms.belims.co.za/wp-login.php' );
    exit;
}
add_action( 'template_redirect', 'belims_force_login' );

// Enqueue login page styles
function belims_login_styles() {
    wp_enqueue_style(
        'belims-login',
        get_stylesheet_directory_uri() . '/assets/css/login.css',
        [],
        '1.0.0'
    );
}
add_action( 'login_enqueue_scripts', 'belims_login_styles' );