<?php
/**
 * Plugin Name: Global Site Settings
 * Plugin URI: https://belims.co.za
 * Description: Unified plugin for Belims site settings, ACF field groups, REST API endpoints, and third-party integrations (WooCommerce, FTG, BobGo, AI).
 * Version: 2.2.0
 * Author: Belims Team & Co Pilot
 * Author URI: https://belims.co.za
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: global-site-settings
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) exit;

define('GLOBAL_SITE_SETTINGS_VERSION', '2.2.0');
define('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP', '2026-02-20 03:30:39');
define('GLOBAL_SITE_SETTINGS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GLOBAL_SITE_SETTINGS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Get the current CORS origin based on environment setting
 */
function get_cors_origin() {
    $environment = get_option('belims_frontend_environment', 'production');
    
    if ($environment === 'development') {
        return 'http://localhost:3000';
    }
    
    // Default to production
    return 'https://belims-headless-react-app.netlify.app';
}

/**
 * Handle OPTIONS preflight requests FIRST (before WordPress does anything)
 */
add_action('init', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: ' . get_cors_origin());
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-WP-Nonce');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');
        status_header(200);
        exit;
    }
}, 0); // Priority 0 = runs before everything else

/**
 * Send CORS headers with every REST API response
 * This fires AFTER WordPress processes the request but BEFORE sending response
 */
add_filter('rest_pre_serve_request', function($served, $result, $request, $server) {
    // Use dynamic CORS origin based on environment setting
    header('Access-Control-Allow-Origin: ' . get_cors_origin());
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-WP-Nonce');
    header('Access-Control-Allow-Credentials: true');
    
    return $served;
}, 10, 4);

/**
 * Load includes
 */
function global_site_settings_init() {
    $files = [
        'includes/acf-field-groups.php',
        'includes/class-products-endpoint.php',
        'includes/class-categories-endpoint.php',
        'includes/class-ai-settings-endpoint.php',
        'includes/class-orders-endpoint.php',
        'includes/class-user-endpoint.php', // User registration & management
        'includes/class-user-admin-page.php', // User management admin UI
        'includes/class-ecommerce-settings.php', // Ecommerce policies (Returns, Warranty, Shipping)
        'includes/class-bundled-products.php', // Bundled Products for WooCommerce
        // FTG Sync integration
        'includes/ftg-sync/class-ftg-api.php',
        'includes/ftg-sync/class-ftg-sync-endpoint.php',
        // BobGo Shipping integration
        'includes/bobgo-shipping/init.php', // Clean REST endpoint leveraging uAfrica/BobGo plugin
        'includes/bobgo-shipping/class-bobgo-api.php',
        'includes/bobgo-shipping/class-bobgo-order-handler.php',
        'includes/bobgo-shipping/class-bobgo-webhook-endpoint.php',
        // PayFast Payment Gateway integration
        'includes/payfast/class-payfast-api.php',
        'includes/payfast/class-payfast-return-handler.php', // PayFast return redirect
        'includes/payfast/class-payfast-admin-page.php', // PayFast testing/admin page
    ];
    foreach ($files as $file) {
        $path = GLOBAL_SITE_SETTINGS_PLUGIN_DIR . $file;
        if (file_exists($path)) require_once $path;
    }

    add_action('rest_api_init', 'global_site_settings_register_endpoints');
    add_action('init', 'global_site_settings_register_product_taxonomies');
}
add_action('plugins_loaded', 'global_site_settings_init');

function global_site_settings_enqueue_maps_autocomplete() {
    $maps_api_key = get_option('ecommerce_google_maps_api_key', '');
    if ($maps_api_key === '') {
        return;
    }

    $maps_url = add_query_arg(
        array(
            'key' => $maps_api_key,
            'libraries' => 'places',
            'loading' => 'async',
            'callback' => 'globalSiteSettingsInitMapsAutocomplete',
        ),
        'https://maps.googleapis.com/maps/api/js'
    );

    wp_enqueue_script('global-site-settings-google-maps', $maps_url, array(), null, true);
    wp_add_inline_script(
        'global-site-settings-google-maps',
        'window.globalSiteSettingsInitMapsAutocomplete = function() {' .
            'if (typeof window._gssInitMaps === "function") {' .
                'window._gssInitMaps();' .
            '} else {' .
                'window._gssMapsReady = true;' .
            '}' .
        '};',
        'before'
    );
}

add_action('admin_enqueue_scripts', 'global_site_settings_enqueue_maps_autocomplete');

/**
 * Register custom user roles
 */
function global_site_settings_register_user_roles() {
    if (!get_role('contractor')) {
        $customer_role = get_role('customer');
        $capabilities = $customer_role ? $customer_role->capabilities : ['read' => true];
        add_role('contractor', 'Contractor', $capabilities);
    }
}
add_action('init', 'global_site_settings_register_user_roles');

/**
 * Register custom product taxonomies (Range, Color)
 * Must be registered on init hook for WordPress admin to recognize them
 */
function global_site_settings_register_product_taxonomies() {
    // Register product_range taxonomy
    if (!taxonomy_exists('product_range')) {
        register_taxonomy(
            'product_range',
            array('product'),
            array(
                'hierarchical' => true,
                'label' => 'Ranges',
                'labels' => array(
                    'name' => 'Ranges',
                    'singular_name' => 'Range',
                    'menu_name' => 'Ranges',
                    'all_items' => 'All Ranges',
                    'edit_item' => 'Edit Range',
                    'view_item' => 'View Range',
                    'update_item' => 'Update Range',
                    'add_new_item' => 'Add New Range',
                    'new_item_name' => 'New Range Name',
                    'parent_item' => 'Parent Range',
                    'parent_item_colon' => 'Parent Range:',
                    'search_items' => 'Search Ranges',
                    'not_found' => 'No ranges found',
                ),
                'show_ui' => true,
                'show_in_rest' => true,
                'show_admin_column' => true,
                'query_var' => true,
                'rewrite' => array('slug' => 'range'),
                'public' => true,
                'show_in_nav_menus' => true,
                'show_tagcloud' => true,
            )
        );
    }
    
    // Register product_color taxonomy
    if (!taxonomy_exists('product_color')) {
        register_taxonomy(
            'product_color',
            array('product'),
            array(
                'hierarchical' => true,
                'label' => 'Colors',
                'labels' => array(
                    'name' => 'Colors',
                    'singular_name' => 'Color',
                    'menu_name' => 'Colors',
                    'all_items' => 'All Colors',
                    'edit_item' => 'Edit Color',
                    'view_item' => 'View Color',
                    'update_item' => 'Update Color',
                    'add_new_item' => 'Add New Color',
                    'new_item_name' => 'New Color Name',
                    'parent_item' => 'Parent Color',
                    'parent_item_colon' => 'Parent Color:',
                    'search_items' => 'Search Colors',
                    'not_found' => 'No colors found',
                ),
                'show_ui' => true,
                'show_in_rest' => true,
                'show_admin_column' => true,
                'query_var' => true,
                'rewrite' => array('slug' => 'color'),
                'public' => true,
                'show_in_nav_menus' => true,
                'show_tagcloud' => true,
            )
        );
    }
}

/**
 * Enable ACF form on admin pages
 */
function global_site_settings_acf_form_head() {
    if (isset($_GET['page']) && $_GET['page'] === 'belims-site-settings') {
        acf_form_head();
    }
}
add_action('admin_init', 'global_site_settings_acf_form_head');

/**
 * AJAX handler to clear FTG credentials
 */
add_action('wp_ajax_clear_ftg_credentials', 'clear_ftg_credentials_handler');
function clear_ftg_credentials_handler() {
    check_ajax_referer('clear_ftg_creds', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Unauthorized');
        return;
    }

    // Clear all FTG-related ACF options
    update_field('ftg_email', '', 'option');
    update_field('ftg_password', '', 'option');
    update_field('ftg_collection_token', '', 'option');
    update_field('ftg_enabled', false, 'option');
    
    // Clear stored auth token
    delete_option('belims_ftg_auth_token');
    delete_option('belims_ftg_token_expiry');
    
    wp_send_json_success('FTG credentials cleared');
}

/**
 * Register system settings
 */
function global_site_settings_register_system_settings() {
    // Moved to ACF APIs Tab
}
add_action('admin_init', 'global_site_settings_register_system_settings');

/**
 * Register BobGo settings
 */
function global_site_settings_register_bobgo_settings() {
    register_setting('global_site_settings_bobgo', 'bobgo_environment');
    register_setting('global_site_settings_bobgo', 'bobgo_api_token');
    register_setting('global_site_settings_bobgo', 'bobgo_sandbox_api_token');
    register_setting('global_site_settings_bobgo', 'bobgo_auto_create_shipments');
}
add_action('admin_init', 'global_site_settings_register_bobgo_settings');

/**
 * AJAX handler to test BobGo connection
 */
add_action('wp_ajax_test_bobgo_connection', 'test_bobgo_connection_handler');
function test_bobgo_connection_handler() {
    check_ajax_referer('bobgo_nonce', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Unauthorized');
        return;
    }
    
    if (!class_exists('BobGo_API')) {
        wp_send_json_error('BobGo API not available');
        return;
    }

    $api = new BobGo_API();

    if (!$api->has_token()) {
        wp_send_json_error('API token is not configured');
        return;
    }

    $result = $api->test_connection();

    if (is_wp_error($result)) {
        wp_send_json_error('Connection failed: ' . $result->get_error_message());
        return;
    }

    wp_send_json_success('Connected to BobGo ' . ucfirst($api->get_environment()) . ' successfully!');
}

/**
 * Render a tiny BobGo environment badge in the bottom-right corner
 * for administrators (frontend and admin).
 */
function global_site_settings_render_bobgo_env_badge() {
    if (!is_user_logged_in() || !current_user_can('manage_options')) {
        return;
    }

    $env = get_option('bobgo_environment', 'production');
    $label = $env === 'sandbox' ? 'Sandbox' : 'Production';

    // Slightly different accent colors for clarity
    $bg_color = $env === 'sandbox' ? 'rgba(5, 150, 105, 0.95)' : 'rgba(37, 99, 235, 0.95)';

    echo '<div style="position:fixed; right:12px; bottom:12px; z-index:99999; font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;">'
        . '<div style="padding:6px 10px; font-size:11px; border-radius:999px; background:' . esc_attr($bg_color) . '; color:#ffffff; box-shadow:0 4px 10px rgba(15, 23, 42, 0.35);">'
        . '<strong>BobGo</strong>: ' . esc_html($label)
        . '</div>'
        . '</div>';
}
add_action('wp_footer', 'global_site_settings_render_bobgo_env_badge');
add_action('admin_footer', 'global_site_settings_render_bobgo_env_badge');

/**
 * Redirect homepage to login for headless CMS
 * DISABLED: This was causing login session issues
 */
// function belims_redirect_home_to_login() {
//     // Don't redirect admin pages, login page, or AJAX requests
//     if (is_admin() || $GLOBALS['pagenow'] === 'wp-login.php' || wp_doing_ajax()) {
//         return;
//     }
//     
//     // Redirect any frontend page to login if not logged in
//     if (!is_user_logged_in()) {
//         auth_redirect();
//         exit;
//     }
// }
// add_action('template_redirect', 'belims_redirect_home_to_login');

/**
 * Customize login page with Belims branding
 */
function belims_custom_login_styles() {
    wp_enqueue_style(
        'global-site-settings-login',
        GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/css/admin.css',
        array(),
        GLOBAL_SITE_SETTINGS_VERSION
    );
}
add_action('login_enqueue_scripts', 'belims_custom_login_styles');

/**
 * Change login logo URL
 */
function belims_login_logo_url() {
    return home_url();
}
add_filter('login_headerurl', 'belims_login_logo_url');

/**
 * Change login logo title
 */
function belims_login_logo_title() {
    return 'Belims Hardware - CMS Admin';
}
add_filter('login_headertext', 'belims_login_logo_title');

/**
 * Register endpoints
 */
function global_site_settings_register_endpoints() {
    $classes = [
        'Belims_Products_Endpoint',
        'Belims_Categories_Endpoint',
        'Belims_AI_Settings_Endpoint',
        'Belims_Orders_Endpoint',
        'User_Endpoint', // User registration & management
        'Belims_FTG_Sync_Endpoint',
        'BobGo_Shipping_Proxy_Endpoint',
    ];
    foreach ($classes as $class) {
        if (class_exists($class)) {
            $instance = new $class();
            if (method_exists($instance, 'register_routes')) $instance->register_routes();
        } elseif (class_exists($class) && method_exists($class, 'register_routes')) {
            // Static method support
            call_user_func([$class, 'register_routes']);
        }
    }
}

/**
 * Output dynamic admin color CSS based on ACF settings
 */
function global_site_settings_admin_color_css() {
    if (!function_exists('get_field')) {
        return;
    }
    
    $admin_colors = get_field('admin_dashboard_colors', 'option');
    
    if (!$admin_colors) {
        return; // Use default CSS colors
    }
    
    $admin_bar_bg = $admin_colors['admin_bar_bg'] ?? '#322783';
    $admin_menu_bg = $admin_colors['admin_menu_bg'] ?? '#322783';
    $admin_submenu_bg = $admin_colors['admin_submenu_bg'] ?? '#4a3fc2';
    $admin_menu_text = $admin_colors['admin_menu_text'] ?? '#ffffff';
    $admin_accent = $admin_colors['admin_accent'] ?? '#e40613';
    
    // Calculate darker shades for hover states
    $admin_accent_dark = adjust_brightness($admin_accent, -20);
    $admin_accent_darker = adjust_brightness($admin_accent, -40);
    
    ?>
    <style id="belims-admin-colors">
        :root {
            --belims-admin-bar-bg: <?php echo esc_attr($admin_bar_bg); ?>;
            --belims-admin-menu-bg: <?php echo esc_attr($admin_menu_bg); ?>;
            --belims-admin-submenu-bg: <?php echo esc_attr($admin_submenu_bg); ?>;
            --belims-admin-menu-text: <?php echo esc_attr($admin_menu_text); ?>;
            --belims-admin-accent: <?php echo esc_attr($admin_accent); ?>;
            --belims-admin-accent-dark: <?php echo esc_attr($admin_accent_dark); ?>;
            --belims-admin-accent-darker: <?php echo esc_attr($admin_accent_darker); ?>;
        }
        
        /* Apply custom colors to WordPress admin */
        #wpadminbar { background: var(--belims-admin-bar-bg) !important; }
        #wpadminbar .ab-item, #wpadminbar a.ab-item { color: var(--belims-admin-menu-text) !important; }
        #wpadminbar .ab-top-menu > li:hover > .ab-item { background: var(--belims-admin-submenu-bg) !important; }
        #wpadminbar .ab-submenu { background: var(--belims-admin-submenu-bg) !important; }
        #wpadminbar .quicklinks .menupop ul li a:hover { background: var(--belims-admin-menu-bg) !important; color: var(--belims-admin-accent) !important; }
        
        #adminmenu, #adminmenuback, #adminmenuwrap { background: var(--belims-admin-menu-bg) !important; }
        #adminmenu a { color: var(--belims-admin-menu-text) !important; }
        #adminmenu li.menu-top:hover { background-color: var(--belims-admin-submenu-bg) !important; }
        #adminmenu .wp-submenu { background: var(--belims-admin-submenu-bg) !important; }
        #adminmenu li.current a.menu-top { background: var(--belims-admin-accent) !important; }
        #adminmenu .wp-submenu a:hover { color: var(--belims-admin-accent) !important; }
        
        .wp-core-ui .button-primary { background: var(--belims-admin-accent) !important; border-color: var(--belims-admin-accent-dark) !important; }
        .wp-core-ui .button-primary:hover { background: var(--belims-admin-accent-dark) !important; }
        .wp-core-ui .button-primary:active { background: var(--belims-admin-accent-darker) !important; }
        
        a { color: var(--belims-admin-accent) !important; }
        a:hover { color: var(--belims-admin-accent-dark) !important; }
        
        input[type="text"]:focus, input[type="password"]:focus, input[type="email"]:focus, textarea:focus, select:focus {
            border-color: var(--belims-admin-accent) !important;
            box-shadow: 0 0 0 1px var(--belims-admin-accent) !important;
        }
        
        #adminmenu .awaiting-mod, #adminmenu .update-plugins { background: var(--belims-admin-accent) !important; }
        .nav-tab-active { color: var(--belims-admin-accent) !important; }
    </style>
    <?php
}
add_action('admin_head', 'global_site_settings_admin_color_css');

/**
 * Helper function to adjust color brightness
 */
function adjust_brightness($hex, $steps) {
    $hex = str_replace('#', '', $hex);
    $r = hexdec(substr($hex, 0, 2));
    $g = hexdec(substr($hex, 2, 2));
    $b = hexdec(substr($hex, 4, 2));
    
    $r = max(0, min(255, $r + $steps));
    $g = max(0, min(255, $g + $steps));
    $b = max(0, min(255, $b + $steps));
    
    return '#' . str_pad(dechex($r), 2, '0', STR_PAD_LEFT)
                . str_pad(dechex($g), 2, '0', STR_PAD_LEFT)
                . str_pad(dechex($b), 2, '0', STR_PAD_LEFT);
}

/**
 * Enqueue admin assets
 */
function global_site_settings_enqueue_admin_assets($hook) {
    // Only load on our settings page
    if ($hook !== 'toplevel_page_belims-site-settings') {
        return;
    }

    // Enqueue admin CSS (merged from admin.css and admin-refactor.css)
    wp_enqueue_style(
        'global-site-settings-admin',
        GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/css/admin.css',
        array(),
        GLOBAL_SITE_SETTINGS_VERSION
    );

    // Enqueue dashboard admin CSS (new modular styles)
    /* wp_enqueue_style(
        'global-site-settings-dashboard-admin',
        GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/css/dashboard-admin.css',
        array(),
        GLOBAL_SITE_SETTINGS_VERSION
    ); */

    // Enqueue admin JS (merged from admin.js and admin-tabs.js)
    wp_enqueue_script(
        'global-site-settings-admin',
        GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/js/admin.js',
        array('jquery'),
        GLOBAL_SITE_SETTINGS_VERSION,
        true
    );
    
    // Localize script with nonces and AJAX URL
    wp_localize_script('global-site-settings-admin', 'bpcAdminData', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'bobgo_nonce' => wp_create_nonce('bobgo_nonce'),
        'ftg_nonce' => wp_create_nonce('clear_ftg_creds'),
    ));
}
add_action('admin_enqueue_scripts', 'global_site_settings_enqueue_admin_assets');

/**
 * Hide default WordPress admin footer text/version on Site Settings page
 */
function global_site_settings_hide_wp_admin_footer($footer_text) {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;

    if ($screen && $screen->id === 'toplevel_page_belims-site-settings') {
        return '';
    }

    return $footer_text;
}
add_filter('admin_footer_text', 'global_site_settings_hide_wp_admin_footer', 99);

function global_site_settings_hide_wp_version_footer($version_text) {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;

    if ($screen && $screen->id === 'toplevel_page_belims-site-settings') {
        return '';
    }

    return $version_text;
}
add_filter('update_footer', 'global_site_settings_hide_wp_version_footer', 99);

/**
 * Add top-level menu (single page with tabs)
 */
function global_site_settings_admin_menus() {
    add_menu_page(
        'Site Settings',
        'Site Settings',
        'manage_options',
        'belims-site-settings',
        'global_site_settings_main_page',
        'dashicons-admin-settings',
        2
    );
}
add_action('admin_menu', 'global_site_settings_admin_menus');

/**
 * Main settings page with modern tabbed interface
 */
function global_site_settings_main_page() {
    // Load FTG sync page content function
    $ftg_file = GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/ftg-sync/admin-ftg-sync-page.php';
    if (file_exists($ftg_file)) {
        require_once $ftg_file;
    }
    
    // Load BobGo shipping page content function
    $bobgo_file = GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/bobgo-shipping/admin-bobgo-settings-page.php';
    if (file_exists($bobgo_file)) {
        require_once $bobgo_file;
    }

    // Handle dashboard toggles
    if (isset($_POST['save_ftg_enabled_dashboard']) && check_admin_referer('save_ftg_enabled_dashboard_action', 'ftg_enabled_dashboard_nonce')) {
        update_field('ftg_enabled', isset($_POST['ftg_enabled']) ? 1 : 0, 'option');
    }
    if (isset($_POST['save_bobgo_enabled_dashboard']) && check_admin_referer('save_bobgo_enabled_dashboard_action', 'bobgo_enabled_dashboard_nonce')) {
        update_field('bobgo_enabled', isset($_POST['bobgo_enabled']) ? 1 : 0, 'option');
    }

    // Integration statuses for dashboard summary
    $ftg_enabled = (bool) get_field('ftg_enabled', 'option');
    $bobgo_enabled = (bool) get_field('bobgo_enabled', 'option');
    
    // Load new dashboard template
    /* $dashboard_template = GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/dashboard-template.php';
    if (file_exists($dashboard_template)) {
        include $dashboard_template;
        return;
    } */
    ?>
    <div id="bpc-admin-root">
        <!-- Sidebar Navigation -->
        <div class="bpc-admin-sidebar">
            <div class="bpc-admin-logo">
                <h2>
                    Settings  
                </h2>
            </div>
            <nav class="bpc-admin-nav">
                <div class="bpc-nav-group-title">Overview</div>
                <a class="bpc-nav-item" data-tab="dashboard">
                    Dashboard
                </a>
                
                <div class="bpc-nav-group-title">Settings</div>
                <a class="bpc-nav-item" data-tab="branding">
                    Branding
                </a>
                <a class="bpc-nav-item" data-tab="ecommerce">
                    Ecommerce
                </a>
                
                <div class="bpc-nav-group-title">Integrations</div>
                <a class="bpc-nav-item" data-tab="ftg-sync">
                    FTG Sync
                </a>
                <a class="bpc-nav-item" data-tab="cors-security"> 
                    CORS & Security
                </a>
                <a class="bpc-nav-item" data-tab="woocommerce">
                    WooCommerce
                </a>
                <a class="bpc-nav-item" data-tab="bobgo-shipping">
                    BobGo Shipping
                </a>
                <a class="bpc-nav-item" data-tab="payment-gateways">
                    Payment Gateways
                </a>
                <a class="bpc-nav-item" data-tab="ai-services">
                    AI Services
                </a>
                
                <div class="bpc-nav-group-title">Tools</div>
                <a class="bpc-nav-item" data-tab="payfast-testing">
                    PayFast Testing
                </a>
            </nav>
            
            <div style="padding: 20px; border-top: 1px solid var(--bpc-border); margin-top: auto; color: var(--bpc-text-muted); font-size: 12px;">
                Version <?php echo GLOBAL_SITE_SETTINGS_VERSION; ?><br>By Broken Pony Club<br>For Belims Hardware
            </div>
        </div>

        <!-- Main Content -->
        <div class="bpc-admin-content">
            <!-- Dashboard Tab -->
            <div id="tab-dashboard" class="bpc-tab-content">
                
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">Belims Hardware</h2>
                        <p class="bpc-card-description">Site content & API management</p>
                    </div>
                    
                    <style>
                    .bpc-status-pill {
                        display: inline-flex;
                        align-items: center;
                        padding: 4px 10px;
                        border-radius: 999px;
                        font-size: 12px;
                        font-weight: 600;
                        line-height: 1;
                        border: 1px solid transparent;
                        gap: 6px;
                    }
                    .bpc-status-pill.enabled {
                        background: #ecfdf3;
                        color: #166534;
                        border-color: #bbf7d0;
                    }
                    .bpc-status-pill.disabled {
                        background: #fef2f2;
                        color: #991b1f;
                        border-color: #fecdd3;
                    }
                    .bpc-status-list {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                        gap: 12px;
                        margin: 0 0 24px;
                    }
                    .bpc-status-row {
                        border: 1px solid var(--bpc-border);
                        border-radius: 10px;
                        padding: 12px 14px;
                        background: #fff;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 12px;
                    }
                    .bpc-status-title {
                        font-weight: 600;
                        color: var(--bpc-text-primary);
                    }
                    </style>

                    <h3>Integration Status</h3>
                    <div class="bpc-status-list">
                        <div class="bpc-status-row">
                            <span class="bpc-status-title">Find The Gap</span>
                            <span class="bpc-status-pill <?php echo $ftg_enabled ? 'enabled' : 'disabled'; ?>">
                                <?php echo $ftg_enabled ? 'Enabled' : 'Disabled'; ?>
                            </span>
                        </div>
                        <div class="bpc-status-row">
                            <span class="bpc-status-title">BobGo Shipping</span>
                            <span class="bpc-status-pill <?php echo $bobgo_enabled ? 'enabled' : 'disabled'; ?>">
                                <?php echo $bobgo_enabled ? 'Enabled' : 'Disabled'; ?>
                            </span>
                        </div>
                    </div>
                    
                    

                    <div class="bpc-grid">
                        
                        <div class="bpc-panel">
                            <div>
                                <h4>Find The Gap</h4>
                                <p>Enable product sync with Find The Gap</p>
                            </div>
                            <form method="post" action="" class="feature-status">
                                <?php wp_nonce_field('save_ftg_enabled_dashboard_action', 'ftg_enabled_dashboard_nonce'); ?>
                                <input type="hidden" name="save_ftg_enabled_dashboard" value="1" />
                                <div class="status">
                                    <span>Status: </span>
                                    <span class="status-code" data-active-text="Active" data-inactive-text="Inactive">
                                        <span class="<?php echo $ftg_enabled ? 'active' : 'inactive'; ?>">
                                            <?php echo $ftg_enabled ? 'Active' : 'Inactive'; ?>
                                        </span>
                                    </span>
                                </div>
                                <div class="status-switch">
                                    <label for="ftg-enabled-toggle-dashboard" class="toggle-switch">
                                        <input type="checkbox" name="ftg_enabled" id="ftg-enabled-toggle-dashboard" value="1" <?php checked(1, $ftg_enabled); ?> />
                                        <div class="switch-track">
                                            <div class="switch-thumb"></div>
                                        </div>
                                    </label>
                                </div>
                            </form>
                        </div>  

                        <div class="bpc-panel">
                            <div>
                                <h4>BobGo Shipping</h4>
                                <p>Enable shipping integration with BobGo.</p>
                            </div>
                            <form method="post" action="" class="feature-status">
                                <?php wp_nonce_field('save_bobgo_enabled_dashboard_action', 'bobgo_enabled_dashboard_nonce'); ?>
                                <input type="hidden" name="save_bobgo_enabled_dashboard" value="1" />
                                <div class="status">
                                    <span>Status: </span>
                                    <span class="status-code" data-active-text="Active" data-inactive-text="Inactive">
                                        <span class="<?php echo $bobgo_enabled ? 'active' : 'inactive'; ?>">
                                            <?php echo $bobgo_enabled ? 'Active' : 'Inactive'; ?>
                                        </span>
                                    </span>
                                </div>
                                <div class="status-switch">
                                    <label for="bobgo-enabled-toggle-dashboard" class="toggle-switch">
                                        <input type="checkbox" name="bobgo_enabled" id="bobgo-enabled-toggle-dashboard" value="1" <?php checked(1, $bobgo_enabled); ?> />
                                        <div class="switch-track">
                                            <div class="switch-thumb"></div>
                                        </div>
                                    </label>
                                </div>
                            </form>
                        </div>  
                    </div>

                    <script>
                    jQuery(document).ready(function($) {
                        $('#ftg-enabled-toggle-dashboard').on('change', function() {
                            $(this).closest('form').trigger('submit');
                        });
                        $('#bobgo-enabled-toggle-dashboard').on('change', function() {
                            $(this).closest('form').trigger('submit');
                        });
                    });
                    </script>
                    
                    <h3>Quick Actions</h3>
                    <p class="bpc-actions">
                        <button class="bpc-btn-primary" onclick="jQuery('.bpc-nav-item[data-tab=\'ftg-sync\']').click()">
                            Go to FTG Sync
                        </button>
                        <button class="bpc-btn-primary" onclick="jQuery('.bpc-nav-item[data-tab=\'apis\']').click()">
                            Configure APIs
                        </button>
                        <button class="bpc-btn-primary" onclick="jQuery('.bpc-nav-item[data-tab=\'api-logs\']').click()">
                            View API Endpoints
                        </button>
                        <button type="button" id="ftg-brand-count" class="bpc-btn-secondary">
                            Check Ingco Count
                        </button>
                        <button type="button" id="belims-clear-cache" class="bpc-btn-secondary">
                            Clear Cache
                        </button>
                    </p>
                    <div id="ftg-brand-count-status" style="margin-top: 10px;"></div>

                    <script>
                    jQuery(document).ready(function($) {
                        $('#ftg-brand-count').on('click', function() {
                            var btn = $(this);
                            var status = $('#ftg-brand-count-status');
                            btn.prop('disabled', true).text('Checking...');
                            status.text('Fetching Ingco total from FTG...');
                            fetch('<?php echo rest_url('belims/v1/ftg/brand-count'); ?>?brand=Ingco')
                                .then(function(r) { return r.json(); })
                                .then(function(data) {
                                    btn.prop('disabled', false).text('Check Ingco Count');
                                    if (data && data.success) {
                                        status.html('Ingco products available in FTG: <strong>' + data.total_unique + '</strong> (pages fetched: ' + (data.pages_fetched || 0) + ')');
                                    } else {
                                        status.text('Unable to fetch count: ' + (data && data.message ? data.message : 'Unknown error'));
                                    }
                                })
                                .catch(function(err) {
                                    btn.prop('disabled', false).text('Check Ingco Count');
                                    status.text('Request failed: ' + err);
                                });
                        });

                        $('#belims-clear-cache').on('click', function() {
                            var cacheBuster = Math.floor(Math.random() * 1000000000);
                            var url = 'https://cms.belims.co.za/wp-admin/index.php?no-cache=' + cacheBuster;
                            window.open(url, '_blank');
                        });
                    });
                    </script>
                
            </div>

            <!-- FTG Sync Tab -->
            <div id="tab-ftg-sync" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">Find The Gap Integration</h2>
                        <p class="bpc-card-description">Configure FTG API credentials and sync products to WooCommerce.</p>
                    </div>
                    
                    <?php
                    // Handle form submission
                    if (isset($_POST['save_ftg_credentials']) && check_admin_referer('save_ftg_credentials_action', 'ftg_nonce')) {
                        update_field('ftg_enabled', isset($_POST['ftg_enabled']) ? 1 : 0, 'option');
                        if (isset($_POST['ftg_enabled'])) {
                            update_field('ftg_email', sanitize_email($_POST['ftg_email'] ?? ''), 'option');
                            update_field('ftg_password', $_POST['ftg_password'] ?? '', 'option');
                            update_field('ftg_collection_token', sanitize_text_field($_POST['ftg_collection_token'] ?? ''), 'option');
                        }
                        echo '<div class="notice notice-success inline" style="margin-bottom: 20px;"><p>✅ FTG credentials saved!</p></div>';
                    }
                    
                    // Get FTG credentials
                    $ftg_enabled = get_field('ftg_enabled', 'option');
                    $ftg_email = get_field('ftg_email', 'option');
                    $ftg_password = get_field('ftg_password', 'option');
                    $ftg_token = get_field('ftg_collection_token', 'option');
                    $last_sync = get_option('belims_ftg_last_sync');
                    $last_sync_text = $last_sync ? date_i18n('F j, Y, g:i a', $last_sync) : 'Never';
                    ?>
                    
                    <form method="post" action="">
                        <?php wp_nonce_field('save_ftg_credentials_action', 'ftg_nonce'); ?>
                        
                        <table class="bpc-modern-table">
                            <tr>
                                <th>Enable Find The Gap Integration</th>
                                <td>
                                    <label class="bpc-switch">
                                        <input type="checkbox" name="ftg_enabled" value="1" <?php checked(1, $ftg_enabled); ?> id="ftg-enabled-toggle" />
                                        <span class="bpc-slider"></span>
                                    </label>
                                    <p class="description">Enable product sync with Find The Gap</p>
                                </td>
                            </tr>
                        </table>
                        
                        <div id="ftg-credentials-section" style="<?php echo $ftg_enabled ? '' : 'display:none;'; ?>">
                            <table class="bpc-modern-table">
                                <tr>
                                    <th>FTG Account Email</th>
                                    <td>
                                        <input type="email" name="ftg_email" value="<?php echo esc_attr($ftg_email); ?>" class="regular-text" />
                                        <p class="description">Your Find The Gap account email</p>
                                    </td>
                                </tr>
                                <tr>
                                    <th>FTG Account Password</th>
                                    <td>
                                        <input type="password" name="ftg_password" value="<?php echo esc_attr($ftg_password); ?>" class="regular-text" />
                                        <p class="description">Your Find The Gap account password (stored securely)</p>
                                    </td>
                                </tr>
                                <tr>
                                    <th>FTG Collection Token</th>
                                    <td>
                                        <div style="display: flex; gap: 10px; align-items: flex-start;">
                                            <div style="flex: 1;">
                                                <input type="text" name="ftg_collection_token" id="ftg-token-input" value="<?php echo esc_attr($ftg_token); ?>" class="regular-text" />
                                                <p class="description">Your Find The Gap collection token</p>
                                            </div>
                                            <button type="button" id="get-ftg-token" class="button button-secondary" style="margin-top: 0;">
                                                🔑 Get Token
                                            </button>
                                        </div>
                                        <div id="token-status" style="margin-top: 10px;"></div>
                                    </td>
                                </tr>
                            </table>
                            
                            <div class="bpc-submit-bar">
                                <input type="submit" name="save_ftg_credentials" class="bpc-btn-primary" value="Save FTG Credentials" />
                            </div>
                        </div>
                    </form>
                    
                    <script>
                    jQuery(document).ready(function($) {
                        $('#ftg-enabled-toggle').on('change', function() {
                            if ($(this).is(':checked')) {
                                $('#ftg-credentials-section').slideDown();
                            } else {
                                $('#ftg-credentials-section').slideUp();
                            }
                        });
                        
                        // Get FTG Token button
                        $('#get-ftg-token').on('click', function() {
                            var btn = $(this);
                            var status = $('#token-status');
                            
                            var email = $('input[name="ftg_email"]').val();
                            var password = $('input[name="ftg_password"]').val();
                            
                            if (!email || !password) {
                                status.html('<p style="color: #d63638;">⚠️ Please enter email and password first.</p>');
                                return;
                            }
                            
                            btn.prop('disabled', true).text('Getting Token...');
                            status.html('<p>🔄 Fetching token from FTG...</p>');
                            
                            $.ajax({
                                url: '<?php echo rest_url('belims/v1/ftg/login'); ?>',
                                method: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ email: email, password: password }),
                                beforeSend: function(xhr) {
                                    xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                },
                                success: function(response) {
                                    btn.prop('disabled', false).text('🔑 Get Token');
                                    
                                    if (response.success && response.collection_token) {
                                        $('#ftg-token-input').val(response.collection_token);
                                        status.html('<p style="color: #00a32a;">✅ Token retrieved and saved automatically!</p>');
                                    } else {
                                        status.html('<p style="color: #d63638;">⚠️ ' + (response.message || 'Failed to retrieve token.') + '</p>');
                                    }
                                },
                                error: function(xhr) {
                                    btn.prop('disabled', false).text('🔑 Get Token');
                                    var errorMsg = xhr.responseJSON?.message || 'Unknown error';
                                    status.html('<p style="color: #d63638;">❌ ' + errorMsg + '</p>');
                                }
                            });
                        });
                    });
                    </script>
                    
                    <?php if ($ftg_enabled): ?>
                    <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid var(--bpc-border);">
                        <h3>Product Sync</h3>
                        <p>Last Sync: <strong><?php echo esc_html($last_sync_text); ?></strong></p>
                        
                        <?php if (!$ftg_token): ?>
                            <div class="notice notice-warning inline">
                                <p>⚠️ Please configure your FTG Collection Token above before syncing.</p>
                            </div>
                        <?php else: ?>
                            <div id="ftg-sync-controls">
                                <button type="button" id="ftg-test-connection" class="button button-secondary" style="margin-right: 10px;">
                                    🔗 Test Connection
                                </button>
                                <button type="button" id="ftg-inspect-product" class="button button-secondary" style="margin-right: 10px;">
                                    🔍 Inspect Product
                                </button>
                                <button type="button" id="ftg-test-sync" class="button button-secondary" style="margin-right: 10px;">
                                    ✅ Test Sync - Optimised
                                </button>
                                <button type="button" id="ftg-sync-products" class="button button-primary" style="margin-right: 10px;">
                                    🔄 Sync All Products
                                </button>
                                <button type="button" id="ftg-cleanup-attributes" class="button button-secondary" style="margin-right: 10px;">
                                    🧹 Cleanup Duplicate Attributes
                                </button>
                                <button type="button" id="ftg-disconnect" class="button button-secondary" style="margin-left: 10px; color: var(--belims-red) !important; border-color: var(--belims-red) !important;">
                                    🔌 Disconnect FTG
                                </button>
                                <div id="ftg-sync-status" style="margin-top: 15px;"></div>
                            </div>

                            <!-- Sync Specific Product by SKU -->
                            <div id="ftg-sync-sku-section" style="margin-top: 30px; padding: 20px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px;">
                                <h4 style="margin-top: 0;">Sync Specific Product by SKU</h4>
                                <p style="margin-top: 0; color: #666;">Enter a product SKU to sync just that product from FTG.</p>
                                <div style="display: flex; gap: 10px; align-items: flex-end;">
                                    <div style="flex: 1; max-width: 250px;">
                                        <label for="ftg-sku-input" style="display: block; margin-bottom: 5px; font-weight: 500;">Product SKU:</label>
                                        <input type="text" id="ftg-sku-input" placeholder="e.g., ING-12345" class="regular-text" />
                                    </div>
                                    <button type="button" id="ftg-sync-single-btn" class="button button-primary">
                                        ✅ Sync Product
                                    </button>
                                </div>
                                <div id="ftg-sync-single-result" style="margin-top: 15px;"></div>
                            </div>
                            
                            <style>
                            .ftg-progress-bar {
                                width: 100%;
                                height: 30px;
                                background: #f0f0f0;
                                border-radius: 15px;
                                overflow: hidden;
                                margin: 15px 0;
                                box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                            }
                            .ftg-progress-fill {
                                height: 100%;
                                background: linear-gradient(90deg, #0073aa 0%, #00a0d2 100%);
                                transition: width 0.3s ease;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-weight: 600;
                                font-size: 14px;
                            }
                            .ftg-progress-text {
                                text-align: center;
                                margin: 10px 0;
                                font-weight: 600;
                                color: #2271b1;
                            }
                            .ftg-sync-details {
                                margin-top: 20px;
                            }
                            .ftg-sync-details table {
                                margin-top: 10px;
                            }
                            .ftg-sync-details th {
                                text-align: center;
                                font-weight: 600;
                            }
                            .ftg-sync-details td {
                                text-align: center;
                                font-size: 18px;
                                font-weight: 600;
                            }
                            </style>
                            
                            <script>
                            jQuery(document).ready(function($) {
                                $('#ftg-cleanup-attributes').on('click', function() {
                                    if (!confirm('Clean up duplicate attributes (Range, Color)? This will remove duplicate attribute terms.')) return;
                                    
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    
                                    btn.prop('disabled', true).text('Cleaning...');
                                    status.html('<p>⏳ Cleaning up duplicate attributes...</p>');
                                    
                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/cleanup-attributes'); ?>',
                                        method: 'POST',
                                        contentType: 'application/json',
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('🧹 Cleanup Duplicate Attributes');
                                            
                                            if (response.success) {
                                                var reportHtml = '<div class="notice notice-success inline"><p>✅ Cleanup Complete</p>';
                                                reportHtml += '<ul style="margin: 10px 0 0 20px;">';
                                                for (var attr in response.report) {
                                                    reportHtml += '<li>' + attr + ': Removed ' + response.report[attr].duplicates_removed + 
                                                                  ' duplicates, ' + response.report[attr].terms_remaining + ' terms remaining</li>';
                                                }
                                                reportHtml += '</ul></div>';
                                                status.html(reportHtml);
                                            } else {
                                                status.html('<div class="notice notice-warning inline"><p>⚠️ ' + response.message + '</p></div>');
                                            }
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('🧹 Cleanup Duplicate Attributes');
                                            var errorMsg = xhr.responseJSON?.message || 'Cleanup failed';
                                            status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                        }
                                    });
                                });
                                
                                $('#ftg-disconnect').on('click', function() {
                                    if (!confirm('Disconnect from FTG? This will clear all saved credentials and tokens.')) return;
                                    
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    
                                    btn.prop('disabled', true).text('Disconnecting...');
                                    status.html('<p>Clearing FTG credentials...</p>');
                                    
                                    // Clear ACF fields
                                    $.ajax({
                                        url: ajaxurl,
                                        method: 'POST',
                                        data: {
                                            action: 'clear_ftg_credentials',
                                            nonce: '<?php echo wp_create_nonce('clear_ftg_creds'); ?>'
                                        },
                                        success: function(response) {
                                            if (response.success) {
                                                status.html('<div class="notice notice-success inline"><p>✅ Disconnected from FTG. Reloading page...</p></div>');
                                                setTimeout(function() {
                                                    window.location.reload();
                                                }, 1500);
                                            } else {
                                                btn.prop('disabled', false).text('🔌 Disconnect FTG');
                                                status.html('<div class="notice notice-error inline"><p>❌ Failed to disconnect</p></div>');
                                            }
                                        },
                                        error: function() {
                                            btn.prop('disabled', false).text('🔌 Disconnect FTG');
                                            status.html('<div class="notice notice-error inline"><p>❌ Failed to disconnect</p></div>');
                                        }
                                    });
                                });
                                
                                $('#ftg-test-connection').on('click', function() {
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    
                                    btn.prop('disabled', true).text('Testing...');
                                    status.html('<p>Testing FTG API connection...</p>');
                                    
                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/instances'); ?>',
                                        method: 'GET',
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('🔗 Test Connection');
                                            status.html('<div class="notice notice-success inline"><p>✅ Connection successful! Found ' + (response.length || 0) + ' FTG instances.</p></div>');
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('🔗 Test Connection');
                                            var errorMsg = xhr.responseJSON?.message || 'Connection failed';
                                            status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                        }
                                    });
                                });
                                
                                $('#ftg-inspect-product').on('click', function() {
                                    var sku = prompt('Enter product SKU to inspect:', 'RCKT1213');
                                    if (!sku) return;
                                    
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    
                                    btn.prop('disabled', true).text('Fetching...');
                                    status.html('<p>🔍 Fetching product: ' + sku + '</p>');
                                    
                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/product/'); ?>' + sku,
                                        method: 'GET',
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('🔍 Inspect Product');
                                            
                                            var html = '<div class="notice notice-success inline" style="max-height: 400px; overflow-y: auto;"><h4>✅ Product Found: ' + response.sku + '</h4>';
                                            html += '<p><strong>Name:</strong> ' + response.name + '</p>';
                                            html += '<p><strong>Price:</strong> R' + response.price.selling_price + ' (excl VAT) | R' + response.price.selling_price_with_vat.toFixed(2) + ' (incl VAT)</p>';
                                            html += '<p><strong>Stock:</strong> ' + response.stock.quantity + ' units</p>';
                                            html += '<p><strong>Category:</strong> ' + [response.category.category1, response.category.category2, response.category.category3].filter(Boolean).join(' > ') + '</p>';
                                            html += '<p><strong>Dimensions:</strong> ' + response.dimensions.length_cm + ' x ' + response.dimensions.width_cm + ' x ' + response.dimensions.height_cm + ' cm, ' + response.dimensions.weight_kg + ' kg</p>';
                                            html += '<p><strong>Brand:</strong> ' + (response.meta.brand || 'N/A') + '</p>';
                                            html += '<details style="margin-top: 10px;"><summary style="cursor: pointer; font-weight: 600;">View Raw Data</summary><pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">' + JSON.stringify(response.raw_data, null, 2) + '</pre></details>';
                                            html += '</div>';
                                            
                                            status.html(html);
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('🔍 Inspect Product');
                                            var errorMsg = xhr.responseJSON?.message || 'Product not found';
                                            status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                        }
                                    });
                                });
                                
                                $('#ftg-test-sync').on('click', function() {
                                    if (!confirm('Test sync 400 Ingco products from FTG?')) return;
                                    
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    
                                    btn.prop('disabled', true).text('Testing...');
                                    status.html('<p>⏳ Syncing 400 Ingco products from FTG in batches of 50...</p><div class="ftg-progress-bar"><div class="ftg-progress-fill" style="width: 0%">0%</div></div><p class="ftg-progress-text">Starting sync...</p>');
                                    
                                    // Track totals across all batches
                                    var totalSynced = 0;
                                    var totalSkipped = 0;
                                    var totalErrors = [];
                                    var allSyncedItems = [];
                                    var allSkippedItems = [];
                                    
                                    function syncBatch(offset) {
                                        var limit = 400;
                                        var batchSize = 50; // Process 50 products at a time
                                        
                                        $.ajax({
                                            url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                                            method: 'POST',
                                            data: JSON.stringify({
                                                collection_token: '<?php echo esc_js($ftg_token); ?>',
                                                limit: limit,
                                                offset: offset,
                                                batch_size: batchSize
                                            }),
                                            contentType: 'application/json',
                                            timeout: 90000,
                                            beforeSend: function(xhr) {
                                                xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                            },
                                            success: function(response) {
                                                if (response.success) {
                                                    // Accumulate results
                                                    totalSynced += response.synced || 0;
                                                    totalSkipped += response.skipped || 0;
                                                    if (response.errors && response.errors.length > 0) {
                                                        totalErrors = totalErrors.concat(response.errors);
                                                    }
                                                    if (response.synced_items && Array.isArray(response.synced_items)) {
                                                        allSyncedItems = allSyncedItems.concat(response.synced_items);
                                                    }
                                                    if (response.skipped_items && Array.isArray(response.skipped_items)) {
                                                        allSkippedItems = allSkippedItems.concat(response.skipped_items);
                                                    }
                                                    
                                                    // Update progress bar
                                                    var progress = response.progress || 0;
                                                    $('.ftg-progress-fill').css('width', progress + '%').text(progress + '%');
                                                    $('.ftg-progress-text').html('Syncing products... (' + totalSynced + ' synced so far)');
                                                    
                                                    // Continue to next batch if there are more products
                                                    if (response.has_more) {
                                                        syncBatch(response.next_offset);
                                                    } else {
                                                        // All done!
                                                        btn.prop('disabled', false).text('✅ Test Sync - Optimised');
                                                        $('.ftg-progress-fill').css('width', '100%').text('100%');
                                                        $('.ftg-progress-text').html('Sync complete!');
                                                        
                                                        var skippedMsg = totalSkipped > 0 ? '<br/><span style="color: #856404;">⚠️ Skipped ' + totalSkipped + ' products (no price/invalid data)</span>' : '';
                                                        var errorMsg = totalErrors.length > 0 ? '<br/><span style="color: #dc3232;">❌ ' + totalErrors.length + ' errors occurred</span>' : '';
                                                        var summaryHtml = '<div class="notice notice-success inline"><p>✅ Test sync completed! ' + totalSynced + ' Ingco products synced.' + skippedMsg + errorMsg + '<br/>Check WooCommerce → Products to see the imported items.</p></div>';

                                                        // Build details table
                                                        var detailsHtml = '<div class="ftg-sync-details">';
                                                        if (allSyncedItems.length > 0) {
                                                            detailsHtml += '<h4>Synced Products (' + allSyncedItems.length + ')</h4>';
                                                            var editBase = '<?php echo admin_url('post.php?action=edit&post='); ?>';
                                                            var ftgBase = 'https://my.ftgone.co.za/ftg/product/?q=';
                                                            allSyncedItems.forEach(function(item){
                                                                var name = item.name || '';
                                                                var sku = item.sku || '';
                                                                var pid = item.product_id || 0;
                                                                var price = (item.price && item.price > 0) ? ('R' + Number(item.price).toFixed(2)) : '-';
                                                                var cats = Array.isArray(item.categories) ? item.categories.join(' > ') : '';
                                                                var brand = item.brand || '';
                                                                var image = item.image || 'No';
                                                                var description = item.description || 'No';
                                                                var stock = (typeof item.stock !== 'undefined') ? item.stock : '';
                                                                var dims = '';
                                                                if (item.dimensions) {
                                                                    var d = item.dimensions;
                                                                    var parts = [];
                                                                    if (d.length) parts.push(d.length);
                                                                    if (d.width) parts.push(d.width);
                                                                    if (d.height) parts.push(d.height);
                                                                    dims = parts.length ? (parts.join(' x ') + ' ' + (d.unit || 'cm')) : '';
                                                                }
                                                                var weight = '';
                                                                if (item.weight) {
                                                                    var w = item.weight;
                                                                    if (typeof w.value !== 'undefined') {
                                                                        weight = w.value + ' ' + (w.unit || 'kg');
                                                                    }
                                                                }
                                                                var editLink = pid ? ('<a href="' + editBase + pid + '" target="_blank">Edit</a>') : '';
                                                                var ftgLink = sku ? ('<a href="' + ftgBase + encodeURIComponent(sku) + '" target="_blank">View in FTG</a>') : '';
                                                                // Top row: Product Title | Edit | View in FTG
                                                                detailsHtml += '<div class="ftg-item" style="padding:10px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;margin-bottom:10px;">';
                                                                detailsHtml += '<div class="ftg-item-top" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
                                                                    '<div class="ftg-item-title" style="font-weight:600;">' + name + '</div>' +
                                                                    '<div class="ftg-item-actions" style="display:flex;gap:12px;">' + editLink + (ftgLink ? (' | ' + ftgLink) : '') + '</div>' +
                                                                '</div>';
                                                                // Second row: compact details
                                                                var compact = '<code>' + sku + '</code>' +
                                                                    ' — Brand: ' + (brand || '-') +
                                                                    ' — Range: ' + (item.range || '-') +
                                                                    ' — Color: ' + (item.color || '-') +
                                                                    ' — Image: ' + (image || 'No') +
                                                                    ' — Description: ' + (description || 'No') +
                                                                    ' — Stock: ' + (stock !== '' ? stock : '-') +
                                                                    ' — Dimensions: ' + (dims || '-') +
                                                                    ' — Weight: ' + (weight || '-') +
                                                                    ' — Price: ' + (price || '-') +
                                                                    ' — Categories: ' + (cats || '-');
                                                                detailsHtml += '<div class="ftg-item-details" style="margin-top:8px;color:#334155;font-size:13px;">' + compact + '</div>';
                                                                detailsHtml += '</div>';
                                                            });
                                                        }
                                                        if (allSkippedItems.length > 0) {
                                                            detailsHtml += '<h4 style="margin-top:20px;">Skipped Products (' + allSkippedItems.length + ')</h4>';
                                                            detailsHtml += '<table class="widefat" style="margin-top:10px;">';
                                                            detailsHtml += '<thead><tr><th style="width:140px;">SKU</th><th>Reason</th></tr></thead><tbody>';
                                                            allSkippedItems.forEach(function(item){
                                                                var sku = item.sku || '';
                                                                var reason = item.reason || 'Skipped';
                                                                detailsHtml += '<tr><td><code>' + sku + '</code></td><td>' + reason + '</td></tr>';
                                                            });
                                                            detailsHtml += '</tbody></table>';
                                                        }
                                                        if (totalErrors.length > 0) {
                                                            detailsHtml += '<h4 style="margin-top:20px;">Errors (' + totalErrors.length + ')</h4>';
                                                            detailsHtml += '<div style="background:#fff3f3;border:1px solid #facccc;padding:10px;border-radius:4px;">';
                                                            detailsHtml += '<ul style="margin:0;">';
                                                            totalErrors.forEach(function(err){ detailsHtml += '<li>' + err + '</li>'; });
                                                            detailsHtml += '</ul></div>';
                                                        }
                                                        detailsHtml += '</div>';

                                                        status.html(summaryHtml + detailsHtml);
                                                    }
                                                } else {
                                                    btn.prop('disabled', false).text('✅ Test Sync - Optimised');
                                                    var message = response.message || 'Unknown error';
                                                    status.html('<div class="notice notice-warning inline"><p>⚠️ ' + message + '</p></div>');
                                                }
                                            },
                                            error: function(xhr) {
                                                btn.prop('disabled', false).text('✅ Test Sync - Optimised');
                                                var errorMsg = xhr.responseJSON?.message || 'Sync failed';
                                                status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                            }
                                        });
                                    }
                                    
                                    // Start with offset 0
                                    syncBatch(0);
                                });
                                
                                $('#ftg-sync-products').on('click', function() {
                                    if (!confirm('Start FULL FTG product sync? This may take several minutes and will sync ALL products.')) return;
                                    
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    var startTime = Date.now();
                                    
                                    btn.prop('disabled', true).text('Syncing...');
                                    status.html('<p>⏳ Starting full product sync from FTG...</p><div class="ftg-progress-bar"><div class="ftg-progress-fill" style="width: 0%">0%</div></div><p class="ftg-progress-text">Fetching products...</p>');
                                    
                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                                        method: 'POST',
                                        data: JSON.stringify({
                                            collection_token: '<?php echo esc_js($ftg_token); ?>',
                                            limit: 500
                                        }),
                                        contentType: 'application/json',
                                        timeout: 180000,
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('🔄 Sync All Products');
                                            
                                            if (response.success) {
                                                $('.ftg-progress-fill').css('width', '100%').text('100%');
                                                
                                                var totalTime = Math.round((Date.now() - startTime) / 1000);
                                                var skippedMsg = response.skipped > 0 ? ' (' + response.skipped + ' skipped)' : '';
                                                var errorMsg = response.errors && response.errors.length > 0 ? '<br/><span style="color: #dc3232;">⚠️ ' + response.errors.length + ' errors occurred. Check error log for details.</span>' : '';
                                                
                                                status.html('<div class="notice notice-success inline"><p>✅ Full sync completed in ' + totalTime + ' seconds!<br/>' + response.synced + ' products synced' + skippedMsg + errorMsg + '</p></div>');
                                                setTimeout(function() { location.reload(); }, 2000);
                                            } else {
                                                var errors = response.errors?.join(', ') || 'Unknown error';
                                                status.html('<div class="notice notice-error inline"><p>⚠️ Sync completed with errors: ' + errors + '</p></div>');
                                            }
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('🔄 Sync All Products');
                                            var errorMsg = xhr.responseJSON?.message || 'Sync failed';
                                            status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                        }
                                    });
                                });
                                
                                // Sync single product by SKU
                                $('#ftg-sync-single-btn').on('click', function() {
                                    var sku = $('#ftg-sku-input').val().trim();
                                    var btn = $(this);
                                    var resultDiv = $('#ftg-sync-single-result');
                                    
                                    if (!sku) {
                                        resultDiv.html('<div class="notice notice-error inline"><p>⚠️ Please enter a SKU</p></div>');
                                        return;
                                    }
                                    
                                    btn.prop('disabled', true).text('Syncing...');
                                    resultDiv.html('<p>⏳ Syncing product: ' + sku + '...</p>');
                                    
                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/sync/product'); ?>',
                                        method: 'POST',
                                        contentType: 'application/json',
                                        data: JSON.stringify({
                                            sku: sku,
                                            collection_token: '<?php echo esc_js($ftg_token); ?>'
                                        }),
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('✅ Sync Product');
                                            
                                            if (response.success) {
                                                var html = '<div class="notice notice-success inline"><p>✅ ' + response.message + '</p>';
                                                if (response.product_name) {
                                                    html += '<p><strong>Product:</strong> ' + response.product_name + '</p>';
                                                    html += '<p><strong>SKU:</strong> ' + response.sku + '</p>';
                                                }
                                                if (Array.isArray(response.updated_fields)) {
                                                    var updatedText = response.updated_fields.length ? response.updated_fields.join(', ') : 'No changes detected';
                                                    html += '<p><strong>Updated Fields:</strong> ' + updatedText + '</p>';
                                                }
                                                if (response.synced_data) {
                                                    var d = response.synced_data;
                                                    html += '<details style="margin-top: 10px;"><summary style="cursor: pointer; font-weight: 600;">View Synced Data</summary>';
                                                    html += '<div style="margin-top: 8px;">';
                                                    html += '<p><strong>Price:</strong> R' + (d.price_incl_vat || 0) + ' (incl VAT), R' + (d.price_excl_vat || 0) + ' (excl VAT)</p>';
                                                    html += '<p><strong>Stock:</strong> ' + (d.stock ?? '-') + '</p>';
                                                    if (d.weight && typeof d.weight.value !== 'undefined') {
                                                        html += '<p><strong>Weight:</strong> ' + d.weight.value + ' ' + (d.weight.unit || 'kg') + '</p>';
                                                    }
                                                    if (d.dimensions) {
                                                        html += '<p><strong>Dimensions:</strong> ' + (d.dimensions.length || '-') + ' x ' + (d.dimensions.width || '-') + ' x ' + (d.dimensions.height || '-') + ' ' + (d.dimensions.unit || 'cm') + '</p>';
                                                    }
                                                    html += '<p><strong>Brand:</strong> ' + (d.brand || '-') + '</p>';
                                                    html += '<p><strong>Range:</strong> ' + (d.range || '-') + '</p>';
                                                    html += '<p><strong>Color:</strong> ' + (d.color || '-') + '</p>';
                                                    if (Array.isArray(d.categories) && d.categories.length) {
                                                        html += '<p><strong>Categories:</strong> ' + d.categories.join(' > ') + '</p>';
                                                    }
                                                    if (d.short_description) {
                                                        html += '<p><strong>Short Description:</strong> ' + d.short_description + '</p>';
                                                    }
                                                    if (d.description) {
                                                        html += '<p><strong>Description:</strong> ' + d.description + '</p>';
                                                    }
                                                    html += '</div></details>';
                                                }
                                                html += '</div>';
                                                resultDiv.html(html);
                                                $('#ftg-sku-input').val('');
                                            } else {
                                                resultDiv.html('<div class="notice notice-error inline"><p>❌ ' + (response.message || 'Failed to sync product') + '</p></div>');
                                            }
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('✅ Sync Product');
                                            var errorMsg = (xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'Sync failed';
                                            resultDiv.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                        }
                                    });
                                });
                                
                                // Allow Enter key to trigger sync
                                $('#ftg-sku-input').on('keypress', function(e) {
                                    if (e.key === 'Enter' || e.keyCode === 13) {
                                        e.preventDefault();
                                        $('#ftg-sync-single-btn').click();
                                    }
                                });
                            });
                            </script>
                        <?php endif; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <?php /* BobGo Shipping Tab - Commented out, using official BobGo plugin for admin UI
            <div id="tab-bobgo-shipping" class="bpc-tab-content">
                <?php 
                if (function_exists('render_bobgo_shipping_settings_tab')) {
                    render_bobgo_shipping_settings_tab();
                } else {
                    echo '<div class="bpc-card"><p>BobGo settings not available.</p></div>';
                }
                ?>
            </div>
            */ ?>

            <!-- Branding Tab -->
            <div id="tab-branding" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">Branding Settings</h2>
                        <p class="bpc-card-description">Configure Site Settings Branding</p>
                    </div>
                    <?php 
                    if (function_exists('acf_form')) {
                        acf_form(array(
                            'post_id'    => 'options',
                            'field_groups' => array('group_belims_branding'),
                            'return'     => '',
                            'submit_value' => 'Save Branding Settings',
                        ));
                    } else {
                        echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
                    }
                    ?>
                </div>
            </div>

            <!-- Ecommerce Tab -->
            <div id="tab-ecommerce" class="bpc-tab-content">
                <?php
                // Include ecommerce policies admin page content
                if (class_exists('Ecommerce_Policies_Admin')) {
                    $ecommerce_admin = new Ecommerce_Policies_Admin();
                    $ecommerce_admin->render_inline_content();
                } else {
                    echo '<div class="bpc-card"><p>Ecommerce Policies module not loaded.</p></div>';
                }
                ?>
            </div>

            <!-- CORS & Security Tab -->
            <div id="tab-cors-security" class="bpc-tab-content">
                <!-- Environment Toggle Card -->
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">Frontend Environment</h2>
                        <p class="bpc-card-description">Switch between development and production frontends.</p>
                    </div>
                    
                    <?php
                    $current_env = get_option('belims_frontend_environment', 'production');
                    ?>
                    
                    <div class="bpc-panel bpc-inline">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 8px;">Active Environment: 
                                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; <?php echo $current_env === 'production' ? 'background: #d1fae5; color: #065f46;' : 'background: #fef3c7; color: #92400e;'; ?>">
                                    <?php echo ucfirst($current_env); ?>
                                </span>
                            </div>
                            <div style="font-size: 13px; color: #64748b;">
                                CORS Origin: <code style="background: white; padding: 2px 6px; border-radius: 3px;"><?php echo esc_html(get_cors_origin()); ?></code>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" id="switch-to-dev" class="button <?php echo $current_env === 'development' ? 'button-primary' : 'button-secondary'; ?>" style="white-space: nowrap;">
                                <span class="dashicons dashicons-laptop" style="margin-right: 5px;"></span>
                                Development
                            </button>
                            <button type="button" id="switch-to-prod" class="button <?php echo $current_env === 'production' ? 'button-primary' : 'button-secondary'; ?>" style="white-space: nowrap;">
                                <span class="dashicons dashicons-cloud" style="margin-right: 5px;"></span>
                                Production
                            </button>
                        </div>
                    </div>
                    
                    <div id="env-switch-status" style="margin-top: 15px;"></div>
                    
                    <script>
                    jQuery(document).ready(function($) {
                        $('#switch-to-dev').on('click', function() {
                            switchEnvironment('development', $(this));
                        });
                        
                        $('#switch-to-prod').on('click', function() {
                            switchEnvironment('production', $(this));
                        });
                        
                        function switchEnvironment(env, btn) {
                            var statusDiv = $('#env-switch-status');
                            statusDiv.html('<p>🔄 Switching to ' + env + '...</p>');
                            
                            $.ajax({
                                url: ajaxurl,
                                method: 'POST',
                                data: {
                                    action: 'switch_frontend_environment',
                                    environment: env,
                                    nonce: '<?php echo wp_create_nonce('switch_env_nonce'); ?>'
                                },
                                success: function(response) {
                                    if (response.success) {
                                        statusDiv.html('<div class="notice notice-success inline"><p>✅ Switched to ' + env + ' environment. CORS origin is now: <code>' + response.data.cors_origin + '</code></p></div>');
                                        setTimeout(function() {
                                            location.reload();
                                        }, 1500);
                                    } else {
                                        statusDiv.html('<div class="notice notice-error inline"><p>❌ Failed to switch environment.</p></div>');
                                    }
                                },
                                error: function() {
                                    statusDiv.html('<div class="notice notice-error inline"><p>❌ Error switching environment.</p></div>');
                                }
                            });
                        }
                    });
                    </script>
                </div>
                
                <!-- CORS Settings Card -->
                <div class="bpc-card" style="margin-top: 20px;">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">CORS Settings</h2>
                        <p class="bpc-card-description">Configure Cross-Origin Resource Sharing settings for headless frontend.</p>
                    </div>
                    
                    <?php 
                    // Debug: Show current CORS setting being used
                    $cors_field = function_exists('get_field') ? get_field('headless_frontend_url', 'option') : '';
                    $cors_option = get_option('belims_cors_origin', '');
                    $active_cors = !empty($cors_field) ? $cors_field : $cors_option;
                    
                    if (!empty($active_cors) || !empty($cors_field) || !empty($cors_option)) {
                        echo '<div class="bpc-callout bpc-callout--info" style="margin-bottom: 20px;">';
                        echo '<strong>Current Active CORS Setting:</strong><br>';
                        if (!empty($cors_field)) {
                            echo '<code style="background: white; padding: 2px 6px; border-radius: 3px;">' . esc_html($cors_field) . '</code> <span style="color: #1a7f37;">(from ACF)</span>';
                        } elseif (!empty($cors_option)) {
                            echo '<code style="background: white; padding: 2px 6px; border-radius: 3px;">' . esc_html($cors_option) . '</code> <span style="color: #9a6700;">(from legacy option - will be replaced when you save)</span>';
                        } else {
                            echo '<span style="color: #656d76;">(using defaults)</span>';
                        }
                        echo '</div>';
                    }
                    ?>
                    
                    <?php 
                    if (function_exists('acf_form')) {
                        // Show only CORS + Woo REST credentials here (exclude BobGo fields)
                        acf_form(array(
                            'post_id'      => 'options',
                            'fields'       => array(
                                'field_belims_headless_url',
                                'field_belims_suppress_logs',
                                'field_belims_woo_consumer_key',
                                'field_belims_woo_consumer_secret',
                            ),
                            'return'       => '',
                            'submit_value' => 'Save CORS Settings',
                        ));
                    } else {
                        echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
                    }
                    ?>
                </div>

                <!-- CORS Verification Card -->
                <div class="bpc-card" style="margin-top: 20px;">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">CORS Verification</h2>
                        <p class="bpc-card-description">Test and verify CORS configuration.</p>
                    </div>

                    <div class="bpc-actions" style="margin-bottom: 25px;">
                        <button type="button" id="test-cors-config" class="bpc-btn-primary">
                            <span class="dashicons dashicons-shield" style="margin-top: 3px;"></span> Verify CORS
                        </button>
                    </div>
                    
                    <div id="cors-verification-results" style="margin-top: 15px;"></div>

                    <script>
                    jQuery(document).ready(function($) {
                        // Verify CORS Config
                        $('#test-cors-config').on('click', function() {
                            var btn = $(this);
                            var results = $('#cors-verification-results');
                            var testOrigin = prompt("Enter a frontend URL to simulate a request from:", "https://belims-headless-react-app.netlify.app");
                            
                            if (!testOrigin) return;

                            btn.prop('disabled', true).html('Verifying...');
                            results.html('<p>🛡️ Verifying CORS headers for origin: <code>' + testOrigin + '</code>...</p>');

                            $.ajax({
                                url: '<?php echo rest_url('belims/v1/products'); ?>',
                                method: 'OPTIONS',
                                beforeSend: function(xhr) {
                                    xhr.setRequestHeader('Origin', testOrigin);
                                    xhr.setRequestHeader('Access-Control-Request-Method', 'GET');
                                },
                                complete: function(xhr) {
                                    btn.prop('disabled', false).html('<span class="dashicons dashicons-shield" style="margin-top: 3px;"></span> Verify CORS');
                                    
                                    var acao = xhr.getResponseHeader('Access-Control-Allow-Origin');
                                    var html = '<div style="padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff;">';
                                    html += '<h4 style="margin-top:0;">CORS Analysis:</h4>';
                                    
                                    if (acao === '*' || acao === testOrigin) {
                                        html += '<div style="color: #059669; font-weight: 600;">✅ Success! CORS is properly configured.</div>';
                                        html += '<div style="font-size: 12px; margin-top: 5px;">Response Header: <code>Access-Control-Allow-Origin: ' + acao + '</code></div>';
                                    } else {
                                        html += '<div style="color: #dc2626; font-weight: 600;">❌ CORS Mismatch</div>';
                                        html += '<div style="font-size: 12px; margin-top: 5px;">Server returned: <code>Access-Control-Allow-Origin: ' + (acao || 'NONE') + '</code></div>';
                                        html += '<div style="font-size: 12px; margin-top: 3px; color: #6b7280;">Make sure <code>' + testOrigin + '</code> is added to the "Allowed CORS Origins" field above and settings are saved.</div>';
                                    }
                                    html += '</div>';
                                    results.html(html);
                                }
                            });
                        });
                    });
                    </script>
                </div>
            </div>

            <!-- WooCommerce Tab -->
            <div id="tab-woocommerce" class="bpc-tab-content">
                <!-- Product Import Section -->
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">🔄 Product Description Import</h2>
                        <p class="bpc-card-description">Update/add product descriptions from a CSV file by SKU.</p>
                    </div>

                    <?php
                    // Handle product import
                    if (isset($_POST['import_products']) && check_admin_referer('import_products_action', 'import_nonce')) {
                        if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                            echo '<div class="notice notice-error inline" style="margin-bottom: 20px;"><p>❌ Error: Please select a valid CSV file.</p></div>';
                        } else {
                            $csv_file = $_FILES['csv_file']['tmp_name'];
                            
                            if (!is_readable($csv_file)) {
                                echo '<div class="notice notice-error inline" style="margin-bottom: 20px;"><p>❌ Error: Cannot read CSV file.</p></div>';
                            } else {
                                $handle = fopen($csv_file, 'r');
                                $header = fgetcsv($handle); // Skip header
                                
                                $updated = 0;
                                $created = 0;
                                $failed = 0;
                                
                                while (($row = fgetcsv($handle)) !== false) {
                                    $sku = trim($row[0] ?? '');
                                    $title = trim($row[1] ?? '');
                                    $description = trim($row[3] ?? '');
                                    
                                    if (empty($sku) || empty($description)) {
                                        $failed++;
                                        continue;
                                    }
                                    
                                    $product_id = wc_get_product_id_by_sku($sku);
                                    
                                    if ($product_id) {
                                        $product = wc_get_product($product_id);
                                        $product->set_description($description);
                                        $product->save();
                                        $updated++;
                                    } else {
                                        $product = new WC_Product_Simple();
                                        $product->set_sku($sku);
                                        $product->set_name($title);
                                        $product->set_description($description);
                                        $product->set_status('draft');
                                        $product->save();
                                        $created++;
                                    }
                                }
                                
                                fclose($handle);
                                
                                echo '<div class="notice notice-success inline" style="margin-bottom: 20px;">';
                                echo '<p>✅ Import Complete!</p>';
                                echo '<ul style="margin: 10px 0; padding-left: 20px;">';
                                echo '<li>✏️ Updated: <strong>' . $updated . '</strong> products</li>';
                                echo '<li>➕ Created: <strong>' . $created . '</strong> products (as draft)</li>';
                                echo '<li>⏭️  Skipped: <strong>' . $failed . '</strong> rows</li>';
                                echo '</ul>';
                                echo '</div>';
                            }
                        }
                    }
                    ?>

                    <form method="post" action="" enctype="multipart/form-data" class="bpc-panel">
                        <?php wp_nonce_field('import_products_action', 'import_nonce'); ?>
                        
                        <div style="margin-bottom: 20px;">
                            <label for="csv_file" style="display: block; margin-bottom: 8px; font-weight: 500;">
                                📁 Select CSV File:
                            </label>
                            <input type="file" name="csv_file" id="csv_file" accept=".csv" required style="display: block; margin-bottom: 10px;">
                            <p style="color: #64748b; font-size: 13px; margin: 10px 0;">
                                <strong>Required columns:</strong> SKU, Title, URL, Description, Status<br>
                                <strong>Example:</strong> <code>CGGLI2001, 20V Lithium-Ion Glue Gun, https://..., Model: CGGLI2001..., SUCCESS</code>
                            </p>
                        </div>

                        <div class="bpc-actions">
                            <input type="submit" name="import_products" class="bpc-btn-primary" value="🚀 Import Products" />
                            <span style="color: #64748b; font-size: 13px;">
                                Existing products updated, new products created as draft for review
                            </span>
                        </div>
                    </form>

                    <div class="bpc-callout bpc-callout--info" style="margin-top: 20px;">
                        <p style="margin: 0; font-size: 13px;">
                            <strong>ℹ️ How it works:</strong><br>
                            1. Prepare CSV with columns: SKU, Title, URL, Description, Status<br>
                            2. Upload the file above<br>
                            3. Existing products are updated by SKU<br>
                            4. New products are created as drafts (review in Products page before publishing)
                        </p>
                    </div>
                </div>

                <!-- Product Export Section -->
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">📥 Export Products to CSV</h2>
                        <p class="bpc-card-description">Export all WooCommerce products with descriptions to CSV format.</p>
                    </div>

                    <?php
                    // Handle product export
                    if (isset($_POST['export_products']) && check_admin_referer('export_products_action', 'export_nonce')) {
                        // Get all products
                        $products = wc_get_products([
                            'limit' => -1,
                            'status' => ['publish', 'draft'],
                        ]);
                        
                        if (empty($products)) {
                            echo '<div class="notice notice-warning inline" style="margin-bottom: 20px;"><p>⚠️ No products found to export.</p></div>';
                        } else {
                            // Generate CSV
                            ob_start();
                            $csv = fopen('php://output', 'w');
                            
                            // Write header
                            fputcsv($csv, ['SKU', 'Title', 'URL', 'Description', 'Price', 'Status']);
                            
                            // Write product rows
                            foreach ($products as $product) {
                                fputcsv($csv, [
                                    $product->get_sku(),
                                    $product->get_name(),
                                    get_permalink($product->get_id()),
                                    $product->get_description(),
                                    $product->get_price(),
                                    $product->get_status(),
                                ]);
                            }
                            
                            fclose($csv);
                            $csv_content = ob_get_clean();
                            
                            // Download file
                            header('Content-Type: text/csv; charset=utf-8');
                            header('Content-Disposition: attachment; filename="WooCommerce_Products_' . date('Y-m-d_H-i-s') . '.csv"');
                            echo $csv_content;
                            exit;
                        }
                    }
                    ?>

                    <form method="post" action="" class="bpc-panel">
                        <?php wp_nonce_field('export_products_action', 'export_nonce'); ?>
                        
                        <p style="color: #64748b; font-size: 13px; margin-bottom: 15px;">
                            Click the button below to export all products (published and draft) with their SKU, title, URL, description, price, and status.
                        </p>

                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button type="button" id="export-products-btn" class="bpc-btn-primary" style="cursor: pointer;">
                                📥 Export to CSV
                            </button>
                            <span style="color: #64748b; font-size: 13px;">
                                File will include all product information with descriptions
                            </span>
                        </div>
                    </form>

                    <script>
                    jQuery(document).ready(function($) {
                        $('#export-products-btn').on('click', function(e) {
                            e.preventDefault();
                            var btn = $(this);
                            var originalText = btn.html();
                            
                            btn.prop('disabled', true).html('⏳ Exporting...');
                            
                            // Download CSV via AJAX
                            window.location.href = '<?php echo admin_url('admin-ajax.php?action=export_woocommerce_products'); ?>';
                            
                            setTimeout(function() {
                                btn.prop('disabled', false).html(originalText);
                            }, 2000);
                        });
                    });
                    </script>

                    <div class="bpc-callout bpc-callout--info" style="margin-top: 20px;">
                        <p style="margin: 0; font-size: 13px;">
                            <strong>ℹ️ Export Details:</strong><br>
                            ✓ Includes all product SKUs and titles<br>
                            ✓ Exports full product descriptions<br>
                            ✓ Includes product URLs<br>
                            ✓ Captures current pricing<br>
                            ✓ Shows publication status<br>
                            ✓ File named: WooCommerce_Products_YYYY-MM-DD_HH-MM-SS.csv
                        </p>
                    </div>
                </div>

                <div class="bpc-card" style="margin-top: 30px;">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">WooCommerce Integration</h2>
                        <p class="bpc-card-description">REST API endpoints and WooCommerce settings.</p>
                    </div>

                    <h3 style="margin-top: 30px;">REST API Endpoints:</h3>
                    <ul style="font-family: monospace; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <li style="margin-bottom: 12px;">
                            <span style="display:inline-block; width: 60px; color: #64748b;">[GET]</span>
                            <a href="<?php echo rest_url('belims/v1/products'); ?>" target="_blank" style="color: #2563eb; text-decoration: none;">
                                <?php echo str_replace(home_url(), '', rest_url('belims/v1/products')); ?>
                            </a>
                        </li>
                        <li style="margin-bottom: 12px;">
                            <span style="display:inline-block; width: 60px; color: #64748b;">[GET]</span>
                            <a href="<?php echo rest_url('belims/v1/categories'); ?>" target="_blank" style="color: #2563eb; text-decoration: none;">
                                <?php echo str_replace(home_url(), '', rest_url('belims/v1/categories')); ?>
                            </a>
                        </li>
                        <li style="margin-bottom: 0;">
                            <span style="display:inline-block; width: 60px; color: #64748b;">[POST]</span>
                            <a href="<?php echo rest_url('belims/v1/orders'); ?>" target="_blank" style="color: #2563eb; text-decoration: none;">
                                <?php echo str_replace(home_url(), '', rest_url('belims/v1/orders')); ?>
                            </a>
                        </li>
                    </ul>

                    <div class="bpc-actions" style="margin-top: 25px;">
                        <button type="button" id="test-wc-endpoints" class="bpc-btn-primary">
                            <span class="dashicons dashicons-rest-api" style="margin-top: 3px;"></span> Test Endpoints
                        </button>
                    </div>
                    
                    <div id="wc-verification-results" style="margin-top: 15px;"></div>

                    <script>
                    jQuery(document).ready(function($) {
                        // Test WC API Endpoints
                        $('#test-wc-endpoints').on('click', function() {
                            var btn = $(this);
                            var results = $('#wc-verification-results');
                            
                            btn.prop('disabled', true).html('Testing...');
                            results.html('<p>🔄 Testing WooCommerce endpoints...</p>');
                            
                            var endpoints = [
                                '<?php echo rest_url('belims/v1/products'); ?>',
                                '<?php echo rest_url('belims/v1/categories'); ?>'
                            ];
                            
                            var completed = 0;
                            var html = '<div style="background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px;">';
                            html += '<h4 style="margin-top:0;">API Status:</h4>';
                            
                            endpoints.forEach(function(url) {
                                $.ajax({
                                    url: url,
                                    method: 'GET',
                                    success: function(response) {
                                        var count = Array.isArray(response) ? response.length : (response.data ? 'Obj' : '1');
                                        html += '<div style="margin-bottom: 8px; font-size: 13px; color: #059669;">✅ ' + url.replace("<?php echo rest_url(); ?>", "") + ' - OK (' + count + ' items)</div>';
                                    },
                                    error: function(xhr) {
                                        html += '<div style="margin-bottom: 8px; font-size: 13px; color: #dc2626;">❌ ' + url.replace("<?php echo rest_url(); ?>", "") + ' - Failed (' + xhr.status + ')</div>';
                                    },
                                    complete: function() {
                                        completed++;
                                        if (completed === endpoints.length) {
                                            html += '</div>';
                                            results.html(html);
                                            btn.prop('disabled', false).html('<span class="dashicons dashicons-rest-api" style="margin-top: 3px;"></span> Test Endpoints');
                                        }
                                    }
                                });
                            });
                        });
                    });
                    </script>
                </div>
            </div>

            <!-- BobGo Shipping Tab -->
            <div id="tab-bobgo-shipping" class="bpc-tab-content">
                <!-- BobGo Enable Toggle -->
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">BobGo Shipping Integration</h2>
                        <p class="bpc-card-description">Enable and configure BobGo shipping for your store.</p>
                    </div>
                    <?php
                    // Handle form submission for enable toggle
                    if (isset($_POST['save_bobgo_enabled']) && check_admin_referer('save_bobgo_enabled_action', 'bobgo_nonce')) {
                        update_field('bobgo_enabled', isset($_POST['bobgo_enabled']) ? 1 : 0, 'option');
                        echo '<div class="notice notice-success inline" style="margin-bottom: 20px;"><p>✅ BobGo settings saved!</p></div>';
                    }
                    
                    $bobgo_enabled = get_field('bobgo_enabled', 'option');
                    ?>
                    
                    <form method="post" action="">
                        <?php wp_nonce_field('save_bobgo_enabled_action', 'bobgo_nonce'); ?>
                        
                        <table class="bpc-modern-table">
                            <tr>
                                <th>Enable BobGo Integration</th>
                                <td>
                                    <label class="bpc-switch">
                                        <input type="checkbox" name="bobgo_enabled" value="1" <?php checked(1, $bobgo_enabled); ?> id="bobgo-enabled-toggle" />
                                        <span class="bpc-slider"></span>
                                    </label>
                                    <p class="description">Enable shipping integration with BobGo</p>
                                </td>
                            </tr>
                        </table>
                        
                        <div class="bpc-submit-bar">
                            <input type="submit" name="save_bobgo_enabled" class="bpc-btn-primary" value="Save Settings" />
                        </div>
                    </form>
                </div>
                
                <!-- BobGo Settings (shown only if enabled) -->
                <div id="bobgo-settings-section" style="<?php echo $bobgo_enabled ? '' : 'display:none;'; ?> margin-top: 20px;">
                    <?php 
                    if (function_exists('render_bobgo_shipping_settings_tab')) {
                        render_bobgo_shipping_settings_tab();
                    } else {
                        echo '<div class="bpc-card"><p>BobGo settings not available.</p></div>';
                    }
                    ?>
                </div>
                
                <script>
                jQuery(document).ready(function($) {
                    $('#bobgo-enabled-toggle').on('change', function() {
                        if ($(this).is(':checked')) {
                            $('#bobgo-settings-section').slideDown();
                        } else {
                            $('#bobgo-settings-section').slideUp();
                        }
                    });
                });
                </script>
            </div>

            <!-- Payment Gateways Tab -->
            <div id="tab-payment-gateways" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">Payment Gateways</h2>
                        <p class="bpc-card-description">Configure payment gateway integrations.</p>
                    </div>
                    
                    <div class="bpc-callout bpc-callout--warning" style="margin-bottom: 20px;">
                        <p style="margin: 0;">
                            <strong>💳 Payment Gateway Configuration:</strong><br>
                            Payment gateways are managed through WooCommerce settings.
                        </p>
                    </div>
                    
                    <h3>Active Payment Methods:</h3>
                    <p>Configure your payment gateways through WooCommerce:</p>
                    <ul>
                        <li><strong>Direct Bank Transfer</strong></li>
                        <li><strong>Cash on Delivery</strong></li>
                        <li><strong>PayFast</strong> (South African payment gateway)</li>
                        <li><strong>PayGate</strong></li>
                        <li><strong>Other WooCommerce payment plugins</strong></li>
                    </ul>
                    
                    <div class="bpc-actions" style="margin-top: 20px;">
                        <a href="<?php echo admin_url('admin.php?page=wc-settings&tab=checkout'); ?>" class="bpc-btn-primary">
                            Go to Payment Settings
                        </a>
                        <a href="#tab-payfast-testing" class="bpc-btn-secondary" style="margin-left: 10px;">
                            Open PayFast Testing Tools
                        </a>
                    </div>
                </div>
            </div>

            <!-- AI Services Tab -->
            <div id="tab-ai-services" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">AI Services</h2>
                        <p class="bpc-card-description">Configure AI-powered features and integrations.</p>
                    </div>
                    <?php
                    $ai_enabled = function_exists('get_field') ? (bool) get_field('gemini_enabled', 'option') : false;
                    $ai_key = function_exists('get_field') ? get_field('gemini_api_key', 'option') : '';
                    $ai_key_set = !empty($ai_key);
                    ?>

                    <div class="bpc-callout bpc-callout--accent" style="margin-bottom: 20px;">
                        <p style="margin: 0;">
                            <strong>🤖 AI Services:</strong><br>
                            Configure Gemini access for AI recommendations and assistants.
                        </p>
                    </div>

                    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
                            <strong>Status:</strong>
                            <span style="margin-left: 6px; color: <?php echo $ai_enabled ? '#166534' : '#991b1f'; ?>;">
                                <?php echo $ai_enabled ? 'Enabled' : 'Disabled'; ?>
                            </span>
                        </div>
                        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px;">
                            <strong>API Key:</strong>
                            <span style="margin-left: 6px; color: <?php echo $ai_key_set ? '#166534' : '#991b1f'; ?>;">
                                <?php echo $ai_key_set ? 'Set' : 'Missing'; ?>
                            </span>
                        </div>
                    </div>

                    <?php
                    if (function_exists('acf_form')) {
                        acf_form(array(
                            'post_id' => 'options',
                            'fields' => array(
                                'field_belims_gemini_enabled',
                                'field_belims_gemini_api_key',
                                'field_belims_ai_feature_toggles',
                            ),
                            'return' => '',
                            'submit_value' => 'Save AI Settings',
                        ));
                    } else {
                        echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
                    }
                    ?>
                </div>
            </div>

            <!-- PayFast Testing Tab -->
            <div id="tab-payfast-testing" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">PayFast Payment Testing</h2>
                        <p class="bpc-card-description">Test PayFast payment flows without placing real orders.</p>
                    </div>
                    
                    <?php
                    // Render PayFast testing content
                    if (class_exists('PayFast_Admin_Page')) {
                        PayFast_Admin_Page::render_page();
                    } else {
                        echo '<p>PayFast testing module not available.</p>';
                    }
                    ?>
                </div>
            </div>
        </div>
    </div>
    <?php
}

/**
 * AJAX handler for product export
 */
add_action('wp_ajax_export_woocommerce_products', function() {
    // Check if user is logged in and is an admin
    if (!is_user_logged_in() || !current_user_can('manage_options')) {
        wp_die('Unauthorized - Admin access required', 403);
    }
    
    // Get all products
    $products = wc_get_products([
        'limit' => -1,
        'status' => ['publish', 'draft'],
    ]);
    
    if (empty($products)) {
        wp_die('No products found', 400);
    }
    
    // Generate CSV in memory
    ob_start();
    $output = fopen('php://output', 'w');
    
    // Write header
    fputcsv($output, ['SKU', 'Title', 'URL', 'Description', 'Price', 'Status']);
    
    // Write product rows
    foreach ($products as $product) {
        fputcsv($output, [
            $product->get_sku(),
            $product->get_name(),
            get_permalink($product->get_id()),
            $product->get_description(),
            $product->get_price(),
            $product->get_status(),
        ]);
    }
    
    fclose($output);
    $csv_content = ob_get_clean();
    
    // Send as download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="WooCommerce_Products_' . date('Y-m-d_H-i-s') . '.csv"');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    echo $csv_content;
    wp_die();
});

/**
 * Also register for nopriv (logged-out users) - will check capability
 */
add_action('wp_ajax_nopriv_export_woocommerce_products', function() {
    wp_die('Unauthorized - Admin access required', 403);
});

/**
 * Activation / Deactivation hooks
 */
function global_site_settings_activate() { flush_rewrite_rules(); }
register_activation_hook(__FILE__, 'global_site_settings_activate');

function global_site_settings_deactivate() { flush_rewrite_rules(); }
register_deactivation_hook(__FILE__, 'global_site_settings_deactivate');

/**
 * Add "View in FTG" action link to WooCommerce Products list
 */
function belims_add_ftg_view_row_action($actions, $post) {
    if ($post->post_type !== 'product') {
        return $actions;
    }

    $sku = '';
    if (function_exists('wc_get_product')) {
        $product = wc_get_product($post->ID);
        if ($product) {
            $sku = $product->get_sku();
        }
    }
    if (empty($sku)) {
        // Fallback to meta
        $sku = get_post_meta($post->ID, '_sku', true);
        if (empty($sku)) {
            $sku = get_post_meta($post->ID, '_ftg_product_code', true);
        }
    }

    if (!empty($sku)) {
        $ftg_url = 'https://my.ftgone.co.za/ftg/product/?q=' . rawurlencode($sku);
        $actions['view_in_ftg'] = '<a href="' . esc_url($ftg_url) . '" target="_blank" rel="noopener">View in FTG</a>';
        
        // Add Sync Product action
        $sync_url = wp_nonce_url(
            admin_url('admin-ajax.php?action=belims_sync_single_product&product_id=' . $post->ID),
            'sync_product_nonce'
        );
        $actions['sync_product'] = '<a href="' . esc_url($sync_url) . '" class="belims-sync-single-product" data-product-id="' . $post->ID . '" data-sku="' . esc_attr($sku) . '">Sync Product</a>';
    }

    return $actions;
}
add_filter('post_row_actions', 'belims_add_ftg_view_row_action', 10, 2);

/**
 * AJAX Handler: Sync Single Product from FTG
 */
function belims_sync_single_product_ajax() {
    check_ajax_referer('sync_product_nonce', '_wpnonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => 'Permission denied'));
    }
    
    $product_id = intval($_POST['product_id']);
    $product = wc_get_product($product_id);
    
    if (!$product) {
        wp_send_json_error(array('message' => 'Product not found'));
    }
    
    $sku = $product->get_sku();
    if (empty($sku)) {
        wp_send_json_error(array('message' => 'Product has no SKU'));
    }
    
    // Get FTG token
    $ftg_token = get_option('belims_ftg_collection_token');
    if (empty($ftg_token)) {
        wp_send_json_error(array('message' => 'FTG not connected. Please connect FTG first.'));
    }
    
    // Sync single product
    require_once GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/ftg-sync/class-ftg-sync-endpoint.php';
    $sync_endpoint = new Belims_FTG_Sync_Endpoint();
    
    $result = $sync_endpoint->sync_single_product_by_sku($ftg_token, $sku);
    
    if ($result['success']) {
        wp_send_json_success(array(
            'message' => 'Product synced successfully!',
            'product_name' => $result['product_name'],
            'sku' => $sku
        ));
    } else {
        wp_send_json_error(array(
            'message' => $result['message'] ?? 'Failed to sync product'
        ));
    }
}
add_action('wp_ajax_belims_sync_single_product', 'belims_sync_single_product_ajax');

/**
 * Enqueue admin scripts for single product sync
 */
function belims_enqueue_product_sync_script($hook) {
    if ($hook !== 'edit.php') {
        return;
    }
    
    $screen = get_current_screen();
    if ($screen->post_type !== 'product') {
        return;
    }
    
    ?>
    <script type="text/javascript">
    jQuery(document).ready(function($) {
        // Handle sync product button click
        $('.sync-product-button').on('click', function(e) {
            e.preventDefault();
            
            var $button = $(this);
            var productId = $button.data('product-id');
            var nonce = $button.data('nonce');
            
            if (!confirm('Sync this product from FTG?')) {
                return;
            }
            
            // Show loading state
            var originalText = $button.text();
            $button.text('Syncing...').prop('disabled', true);
            
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'belims_sync_single_product',
                    product_id: productId,
                    _wpnonce: nonce
                },
                success: function(response) {
                    if (response.success) {
                        alert('✓ Product synced successfully: ' + response.data.product_name);
                        $button.text('✓ Synced');
                        $button.css('color', '#00a32a');
                        setTimeout(function() {
                            location.reload();
                        }, 1500);
                    } else {
                        alert('Error: ' + (response.data.message || 'Unknown error'));
                        $button.text(originalText).prop('disabled', false);
                    }
                },
                error: function(xhr) {
                    console.error('AJAX error:', xhr);
                    alert('Error: Failed to sync product. Please try again.');
                    $button.text(originalText).prop('disabled', false);
                }
            });
        });
    });
    </script>
    <?php
}
add_action('admin_footer', 'belims_enqueue_product_sync_script');

/**
 * Add FTG Sync Status to Product Publish Box
 */
function belims_add_ftg_sync_status_to_publish_box() {
    global $post;
    
    if ($post->post_type !== 'product') {
        return;
    }
    
    // Get product SKU
    $sku = '';
    if (function_exists('wc_get_product')) {
        $product = wc_get_product($post->ID);
        if ($product) {
            $sku = $product->get_sku();
        }
    }
    if (empty($sku)) {
        $sku = get_post_meta($post->ID, '_sku', true);
        if (empty($sku)) {
            $sku = get_post_meta($post->ID, '_ftg_product_code', true);
        }
    }
    
    // Check if product is synced with FTG
    $ftg_last_sync = get_post_meta($post->ID, '_ftg_last_sync', true);
    $ftg_product_code = get_post_meta($post->ID, '_ftg_product_code', true);
    
    $is_synced = !empty($ftg_last_sync) || !empty($ftg_product_code);
    $sync_status = $is_synced ? 'Synced' : 'Not Synced';
    
    ?>
    <div class="misc-pub-section misc-pub-ftg-sync">
        <span class="dashicons dashicons-update" style="color: <?php echo $is_synced ? '#00a32a' : '#999'; ?>;"></span>
        Sync Status: <strong><?php echo esc_html($sync_status); ?></strong>
        <?php if ($is_synced && !empty($sku)): ?>
            <a href="<?php echo esc_url('https://my.ftgone.co.za/ftg/product/?q=' . rawurlencode($sku)); ?>" target="_blank" rel="noopener" class="edit-ftg-sync">View</a>
            |
            <a href="#" class="sync-product-button" data-product-id="<?php echo intval($post->ID); ?>" data-nonce="<?php echo esc_attr(wp_create_nonce('sync_product_nonce')); ?>">Sync Product</a>
        <?php endif; ?>
    </div>
    <?php
}
add_action('post_submitbox_misc_actions', 'belims_add_ftg_sync_status_to_publish_box');

/**
 * Output deployment timestamp to browser console for verification
 * Helps identify if auto-deployment was successful or if cache issues exist
 */
function belims_output_deployment_info() {
    $version = defined('GLOBAL_SITE_SETTINGS_VERSION') ? GLOBAL_SITE_SETTINGS_VERSION : 'unknown';
    $timestamp = defined('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP') ? GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP : 'unknown';
    $output = sprintf('Global Site Settings v%s (deployed: %s)', $version, $timestamp);
    ?>
    <script>
        console.log('<?php echo esc_js($output); ?>');
        console.log('Deployment verification: Global Site Settings plugin loaded successfully');
    </script>
    <?php
}
add_action('admin_footer', 'belims_output_deployment_info');
add_action('wp_footer', 'belims_output_deployment_info');

// ============= DRY RUN IMPORT FEATURE =============

/**
 * Normalize CSV status values to valid WooCommerce post statuses.
 */
if (!function_exists('belims_normalize_import_status')) {
    function belims_normalize_import_status($raw_status) {
        $status = strtolower(trim((string) $raw_status));

        if ($status === '' || $status === 'success' || $status === 'ok' || $status === 'active') {
            return 'publish';
        }

        $allowed = ['publish', 'draft', 'pending', 'private'];
        if (in_array($status, $allowed, true)) {
            return $status;
        }

        return 'publish';
    }
}

/**
 * Find existing product for import update (SKU first, then exact title fallback).
 */
if (!function_exists('belims_find_product_id_for_update')) {
    function belims_find_product_id_for_update($sku, $title, $url = '') {
        $sku = trim((string) $sku);
        $title = trim((string) $title);
        $url = trim((string) $url);

        if ($sku !== '') {
            $product_id = wc_get_product_id_by_sku($sku);
            if (!empty($product_id)) {
                return intval($product_id);
            }
        }

        if ($title !== '') {
            $posts = get_posts([
                'post_type' => 'product',
                'post_status' => ['publish', 'draft', 'pending', 'private', 'trash'],
                'posts_per_page' => 1,
                'fields' => 'ids',
                'title' => $title,
            ]);
            if (!empty($posts)) {
                return intval($posts[0]);
            }
        }

        if ($url !== '') {
            $path = wp_parse_url($url, PHP_URL_PATH);
            if (!empty($path)) {
                $slug = trim(basename(rtrim($path, '/')));
                if ($slug !== '') {
                    $post = get_page_by_path($slug, OBJECT, 'product');
                    if ($post && isset($post->ID)) {
                        return intval($post->ID);
                    }
                }
            }
        }

        return 0;
    }
}

/**
 * Dry run preview - show what will be imported without actually importing
 */
add_action('wp_ajax_import_dry_run', function() {
    check_ajax_referer('import_nonce', 'nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['error' => 'Unauthorized']);
    }
    if (empty($_FILES['csv_file'])) {
        wp_send_json_error(['error' => 'No file uploaded']);
    }
    
    $file = $_FILES['csv_file'];
    $products_preview = [];
    $total_count = 0;
    
    if (($handle = fopen($file['tmp_name'], 'r')) !== false) {
        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            wp_send_json_error(['error' => 'Invalid or empty CSV file']);
        }

        $normalize_header = function($value) {
            $value = preg_replace('/^\xEF\xBB\xBF/', '', (string) $value);
            return strtolower(trim($value));
        };

        $header_map = [];
        foreach ($header as $index => $name) {
            $header_map[$normalize_header($name)] = $index;
        }

        $sku_index = $header_map['sku'] ?? null;
        $title_index = $header_map['title'] ?? null;
        $description_index = $header_map['description'] ?? null;

        if ($sku_index === null || $title_index === null || $description_index === null) {
            fclose($handle);
            wp_send_json_error(['error' => 'CSV missing required columns: SKU, Title, Description']);
        }

        $preview_count = 0;
        
        while (($row = fgetcsv($handle)) !== false && $preview_count < 5) {
            $sku = isset($row[$sku_index]) ? trim($row[$sku_index]) : '';
            $title = isset($row[$title_index]) ? trim($row[$title_index]) : '';
            $description = isset($row[$description_index]) ? trim($row[$description_index]) : '';
            
            if ($sku || $title) {
                $desc_preview = wp_strip_all_tags($description);
                if (strlen($desc_preview) > 150) $desc_preview = substr($desc_preview, 0, 150) . '...';
                
                $products_preview[] = [
                    'sku' => $sku,
                    'title' => $title,
                    'description_preview' => $desc_preview
                ];
                $preview_count++;
            }
            $total_count++;
        }
        
        while (($row = fgetcsv($handle)) !== false) $total_count++;
        fclose($handle);
    }
    
    wp_send_json([
        'success' => true,
        'total_products' => $total_count,
        'preview_products' => $products_preview
    ]);
});

/**
 * Execute actual import after user confirms dry run preview
 */
add_action('wp_ajax_import_execute', function() {
    check_ajax_referer('import_nonce', 'nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['error' => 'Unauthorized']);
    }
    if (empty($_FILES['csv_file'])) {
        wp_send_json_error(['error' => 'No file uploaded']);
    }
    
    $file = $_FILES['csv_file'];
    $imported = 0;
    $updated = 0;
    $skipped = 0;
    $not_found = 0;
    
    if (($handle = fopen($file['tmp_name'], 'r')) !== false) {
        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            wp_send_json_error(['error' => 'Invalid or empty CSV file']);
        }

        $normalize_header = function($value) {
            $value = preg_replace('/^\xEF\xBB\xBF/', '', (string) $value);
            return strtolower(trim($value));
        };

        $header_map = [];
        foreach ($header as $index => $name) {
            $header_map[$normalize_header($name)] = $index;
        }

        $sku_index = $header_map['sku'] ?? null;
        $title_index = $header_map['title'] ?? null;
        $url_index = $header_map['url'] ?? null;
        $description_index = $header_map['description'] ?? null;
        $status_index = $header_map['status'] ?? null;

        if ($sku_index === null || $title_index === null || $description_index === null) {
            fclose($handle);
            wp_send_json_error(['error' => 'CSV missing required columns: SKU, Title, Description']);
        }
        
        while (($row = fgetcsv($handle)) !== false) {
            $sku = isset($row[$sku_index]) ? trim($row[$sku_index]) : '';
            $title = isset($row[$title_index]) ? trim($row[$title_index]) : '';
            $url = ($url_index !== null && isset($row[$url_index])) ? trim($row[$url_index]) : '';
            $description = isset($row[$description_index]) ? trim($row[$description_index]) : '';
            $status = ($status_index !== null && isset($row[$status_index])) ? trim($row[$status_index]) : 'publish';
            $status = belims_normalize_import_status($status);
            
            if (!$sku || !$title) {
                $skipped++;
                continue;
            }
            
            // Update-only mode: find existing product by SKU, then title fallback
            $product_id = belims_find_product_id_for_update($sku, $title, $url);
            
            if ($product_id) {
                if (get_post_status($product_id) === 'trash') {
                    wp_untrash_post($product_id);
                }
                // Update existing product
                $product = wc_get_product($product_id);
                $product->set_name($title);
                if (!empty($sku)) {
                    $product->set_sku($sku);
                }
                $product->set_description($description);
                $product->set_status($status);
                $product->save();
                $updated++;
            } else {
                // Strict update-only mode: do not create new products
                $not_found++;
                $skipped++;
            }
        }
        
        fclose($handle);
    }
    
    wp_send_json([
        'success' => true,
        'imported' => $imported,
        'updated' => $updated,
        'skipped' => $skipped,
        'not_found' => $not_found,
        'message' => "Import complete (update-only). Updated {$updated} existing, Skipped {$skipped}, Not found {$not_found}. No new products were created."
    ]);
});

/**
 * Start batch import session (stores rows in transient and returns session info)
 */
add_action('wp_ajax_import_start_batch', function() {
    check_ajax_referer('import_nonce', 'nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['error' => 'Unauthorized']);
    }
    if (empty($_FILES['csv_file'])) {
        wp_send_json_error(['error' => 'No file uploaded']);
    }

    $file = $_FILES['csv_file'];
    $rows = [];

    if (($handle = fopen($file['tmp_name'], 'r')) === false) {
        wp_send_json_error(['error' => 'Unable to open CSV file']);
    }

    $header = fgetcsv($handle);
    if ($header === false) {
        fclose($handle);
        wp_send_json_error(['error' => 'Invalid or empty CSV file']);
    }

    $normalize_header = function($value) {
        $value = preg_replace('/^\xEF\xBB\xBF/', '', (string) $value);
        return strtolower(trim($value));
    };

    $header_map = [];
    foreach ($header as $index => $name) {
        $header_map[$normalize_header($name)] = $index;
    }

    $sku_index = $header_map['sku'] ?? null;
    $title_index = $header_map['title'] ?? null;
    $url_index = $header_map['url'] ?? null;
    $description_index = $header_map['description'] ?? null;
    $status_index = $header_map['status'] ?? null;

    if ($sku_index === null || $title_index === null || $description_index === null) {
        fclose($handle);
        wp_send_json_error(['error' => 'CSV missing required columns: SKU, Title, Description']);
    }

    while (($row = fgetcsv($handle)) !== false) {
        $rows[] = [
            'sku' => isset($row[$sku_index]) ? trim($row[$sku_index]) : '',
            'title' => isset($row[$title_index]) ? trim($row[$title_index]) : '',
            'url' => ($url_index !== null && isset($row[$url_index])) ? trim($row[$url_index]) : '',
            'description' => isset($row[$description_index]) ? trim($row[$description_index]) : '',
            'status' => belims_normalize_import_status(($status_index !== null && isset($row[$status_index])) ? trim($row[$status_index]) : 'publish'),
        ];
    }
    fclose($handle);

    $session_id = 'import_batch_' . get_current_user_id() . '_' . wp_generate_password(12, false, false);
    $payload = [
        'rows' => $rows,
        'total' => count($rows),
        'offset' => 0,
        'imported' => 0,
        'updated' => 0,
        'skipped' => 0,
        'not_found' => 0,
    ];

    set_transient($session_id, $payload, 2 * HOUR_IN_SECONDS);

    wp_send_json([
        'success' => true,
        'session_id' => $session_id,
        'total' => $payload['total'],
    ]);
});

/**
 * Process next batch chunk for active import session
 */
add_action('wp_ajax_import_process_batch', function() {
    check_ajax_referer('import_nonce', 'nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['error' => 'Unauthorized']);
    }

    $session_id = isset($_POST['session_id']) ? sanitize_text_field(wp_unslash($_POST['session_id'])) : '';
    $batch_size = isset($_POST['batch_size']) ? max(1, min(200, intval($_POST['batch_size']))) : 25;

    if (empty($session_id)) {
        wp_send_json_error(['error' => 'Missing session_id']);
    }

    $payload = get_transient($session_id);
    if (!$payload || !isset($payload['rows'])) {
        wp_send_json_error(['error' => 'Import session expired or not found']);
    }

    $rows = $payload['rows'];
    $total = intval($payload['total']);
    $offset = intval($payload['offset']);

    $end = min($offset + $batch_size, $total);

    for ($i = $offset; $i < $end; $i++) {
        $row = $rows[$i];
        $sku = $row['sku'];
        $title = $row['title'];
        $url = isset($row['url']) ? $row['url'] : '';
        $description = $row['description'];
        $status = belims_normalize_import_status($row['status'] ?? 'publish');

        if (!$sku || !$title) {
            $payload['skipped']++;
            continue;
        }

        $product_id = belims_find_product_id_for_update($sku, $title, $url);

        if ($product_id) {
            if (get_post_status($product_id) === 'trash') {
                wp_untrash_post($product_id);
            }
            $product = wc_get_product($product_id);
            if ($product) {
                $product->set_name($title);
                if (!empty($sku)) {
                    $product->set_sku($sku);
                }
                $product->set_description($description);
                $product->set_status($status);
                $product->save();
                $payload['updated']++;
            } else {
                $payload['skipped']++;
            }
        } else {
            $payload['not_found'] = intval($payload['not_found']) + 1;
            $payload['skipped']++;
        }
    }

    $payload['offset'] = $end;
    $done = $end >= $total;
    $progress = $total > 0 ? round(($end / $total) * 100, 1) : 100;

    if ($done) {
        delete_transient($session_id);
    } else {
        set_transient($session_id, $payload, 2 * HOUR_IN_SECONDS);
    }

    wp_send_json([
        'success' => true,
        'done' => $done,
        'total' => $total,
        'processed' => $end,
        'progress' => $progress,
        'imported' => intval($payload['imported']),
        'updated' => intval($payload['updated']),
        'skipped' => intval($payload['skipped']),
        'not_found' => intval($payload['not_found']),
    ]);
});

/**
 * One-click restore of trashed products matching SKUs in uploaded CSV.
 */
add_action('wp_ajax_import_restore_trashed_skus', function() {
    check_ajax_referer('import_nonce', 'nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['error' => 'Unauthorized']);
    }
    if (empty($_FILES['csv_file'])) {
        wp_send_json_error(['error' => 'No file uploaded']);
    }

    $file = $_FILES['csv_file'];
    if (($handle = fopen($file['tmp_name'], 'r')) === false) {
        wp_send_json_error(['error' => 'Unable to open CSV file']);
    }

    $header = fgetcsv($handle);
    if ($header === false) {
        fclose($handle);
        wp_send_json_error(['error' => 'Invalid or empty CSV file']);
    }

    $normalize_header = function($value) {
        $value = preg_replace('/^\xEF\xBB\xBF/', '', (string) $value);
        return strtolower(trim($value));
    };

    $header_map = [];
    foreach ($header as $index => $name) {
        $header_map[$normalize_header($name)] = $index;
    }

    $sku_index = $header_map['sku'] ?? null;
    $status_index = $header_map['status'] ?? null;
    if ($sku_index === null) {
        fclose($handle);
        wp_send_json_error(['error' => 'CSV missing required column: SKU']);
    }

    $sku_status_map = [];
    while (($row = fgetcsv($handle)) !== false) {
        $sku = isset($row[$sku_index]) ? trim($row[$sku_index]) : '';
        if (!$sku) {
            continue;
        }
        $raw_status = ($status_index !== null && isset($row[$status_index])) ? trim($row[$status_index]) : 'publish';
        $sku_status_map[$sku] = belims_normalize_import_status($raw_status);
    }
    fclose($handle);

    if (empty($sku_status_map)) {
        wp_send_json_error(['error' => 'No valid SKUs found in CSV']);
    }

    $restored = 0;
    $updated = 0;
    $not_found = 0;
    $already_active = 0;

    foreach ($sku_status_map as $sku => $normalized_status) {
        $posts = get_posts([
            'post_type' => 'product',
            'post_status' => ['trash', 'publish', 'draft', 'pending', 'private'],
            'posts_per_page' => 1,
            'fields' => 'ids',
            'meta_query' => [
                [
                    'key' => '_sku',
                    'value' => $sku,
                    'compare' => '=',
                ]
            ],
        ]);

        if (empty($posts)) {
            $not_found++;
            continue;
        }

        $product_id = intval($posts[0]);
        $current_status = get_post_status($product_id);

        if ($current_status === 'trash') {
            wp_untrash_post($product_id);
            $restored++;
        } else {
            $already_active++;
        }

        $product = wc_get_product($product_id);
        if ($product) {
            $product->set_status($normalized_status);
            $product->save();
            $updated++;
        }
    }

    wp_send_json([
        'success' => true,
        'restored' => $restored,
        'updated' => $updated,
        'already_active' => $already_active,
        'not_found' => $not_found,
        'message' => "Restore complete. Restored {$restored} trashed products; updated status for {$updated}; already active: {$already_active}; not found: {$not_found}."
    ]);
});

/**
 * Add Import menu and UI
 */
add_action('admin_menu', function() {
    add_menu_page(
        'Product Import Preview',
        'Product Import',
        'manage_options',
        'product-import-preview',
        function() {
            ?>
            <div class="wrap">
                <h1>Product Import with Preview</h1>
                
                <div style="max-width: 800px; margin: 30px 0;">
                    <h2 style="background: #f0f0f0; padding: 15px; border-radius: 5px;">Step 1: Upload CSV & Preview</h2>
                    <form id="import-dry-run-form" enctype="multipart/form-data" style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <table class="form-table">
                            <tr>
                                <th><label for="csv_file">CSV File:</label></th>
                                <td>
                                    <input type="file" id="csv_file" name="csv_file" accept=".csv" required style="padding: 10px;">
                                    <p class="description" style="margin-top: 10px;">INGCO_Products_199_with_Descriptions_FROM_HTML.csv</p>
                                </td>
                            </tr>
                        </table>
                        <?php wp_nonce_field('import_nonce', 'nonce'); ?>
                        <button type="button" class="button button-primary" id="dry-run-btn" style="padding: 8px 20px; font-size: 14px;">👁 Preview Import</button>
                    </form>
                </div>
                
                <!-- Preview Results -->
                <div id="preview-results" style="display: none; max-width: 800px; background: #e8f5e9; padding: 20px; border-radius: 5px; border: 2px solid #4caf50;">
                    <h2 style="color: #2e7d32;">✓ Preview Ready: <span id="total-products-span" style="color: #1565c0;">0</span> Products Found</h2>
                    
                    <div style="background: white; border-radius: 3px; padding: 15px; margin: 15px 0; max-height: 500px; overflow-y: auto;">
                        <strong style="display: block; margin-bottom: 15px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">Sample Products (first 5):</strong>
                        <div id="products-preview-list"></div>
                    </div>
                    
                    <button type="button" class="button button-success" id="confirm-import-btn" style="padding: 10px 30px; font-size: 14px; margin-right: 10px;">✓ Confirm & Import All</button>
                    <button type="button" class="button" id="cancel-import-btn" style="padding: 10px 30px; font-size: 14px;">✗ Cancel</button>
                    <button type="button" class="button" id="restore-trashed-btn" style="padding: 10px 30px; font-size: 14px; margin-left: 10px; border-color: #b45309; color: #92400e;">↺ Restore Imported Trashed SKUs</button>
                </div>
                
                <!-- Import Status -->
                <div id="import-status" style="display: none; max-width: 800px; background: #fff3cd; padding: 20px; border-radius: 5px; border: 2px solid #ffc107;">
                    <h2 style="color: #856404;">✓ Import Complete!</h2>
                    <div id="import-results-text" style="font-size: 16px; line-height: 1.8; margin-top: 15px;"></div>
                </div>

                <!-- Import Progress -->
                <div id="import-progress" style="display: none; max-width: 800px; background: #e8f0fe; padding: 20px; border-radius: 5px; border: 2px solid #3b82f6; margin-top: 20px;">
                    <h2 style="color: #1d4ed8; margin-bottom: 12px;">Import in Progress</h2>
                    <div style="height: 14px; background: #dbeafe; border-radius: 999px; overflow: hidden;">
                        <div id="import-progress-bar" style="width: 0%; height: 100%; background: #2563eb; transition: width 0.2s ease;"></div>
                    </div>
                    <div id="import-progress-text" style="margin-top: 10px; font-weight: 600; color: #1e3a8a;">0%</div>
                </div>
            </div>
            
            <style>
                .product-preview-item {
                    background: #f9f9f9;
                    padding: 15px;
                    margin: 10px 0;
                    border-left: 5px solid #4caf50;
                    border-radius: 3px;
                }
                .product-sku {
                    font-weight: bold;
                    color: #1565c0;
                    font-size: 13px;
                    text-transform: uppercase;
                }
                .product-title {
                    font-weight: bold;
                    margin: 6px 0;
                    font-size: 15px;
                }
                .product-desc {
                    color: #555;
                    font-size: 13px;
                    margin-top: 8px;
                    line-height: 1.5;
                }
            </style>
            
            <script>
            jQuery(document).ready(function($) {
                $('#dry-run-btn').click(function() {
                    var formData = new FormData($('#import-dry-run-form')[0]);
                    formData.append('action', 'import_dry_run');
                    
                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: formData,
                        contentType: false,
                        processData: false,
                        success: function(response) {
                            var data = (typeof response === 'string') ? JSON.parse(response) : response;
                            if (data.success) {
                                $('#total-products-span').text(data.total_products);
                                
                                var html = '';
                                $.each(data.preview_products, function(i, product) {
                                    html += '<div class="product-preview-item">';
                                    html += '<div class="product-sku">SKU: ' + product.sku + '</div>';
                                    html += '<div class="product-title">' + product.title + '</div>';
                                    html += '<div class="product-desc"><strong>Description:</strong> ' + product.description_preview + '</div>';
                                    html += '</div>';
                                });
                                if (!html) {
                                    html = '<div class="product-preview-item"><div class="product-title">No sample rows available. Check CSV columns: SKU, Title, Description.</div></div>';
                                }
                                
                                $('#products-preview-list').html(html);
                                $('#preview-results').show();
                            } else {
                                alert('Error: ' + (data.error || 'Unknown error'));
                            }
                        },
                        error: function(xhr) {
                            alert('Preview failed: ' + (xhr.responseText || 'Server error'));
                        }
                    });
                });
                
                $('#confirm-import-btn').click(function() {
                    if (!confirm('Import ' + $('#total-products-span').text() + ' products? This cannot be undone.')) return;
                    
                    $('#confirm-import-btn').prop('disabled', true).text('⏳ Importing...');

                    var startForm = new FormData($('#import-dry-run-form')[0]);
                    startForm.append('action', 'import_start_batch');

                    $('#import-progress').show();
                    $('#import-progress-bar').css('width', '0%');
                    $('#import-progress-text').text('Starting import...');

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: startForm,
                        contentType: false,
                        processData: false,
                        success: function(response) {
                            var startData = (typeof response === 'string') ? JSON.parse(response) : response;
                            if (!startData.success) {
                                alert('Import start failed: ' + (startData.error || 'Unknown error'));
                                $('#confirm-import-btn').prop('disabled', false).text('✓ Confirm & Import All');
                                $('#import-progress').hide();
                                return;
                            }

                            var sessionId = startData.session_id;
                            var batchSize = 25;

                            function runBatch() {
                                $.ajax({
                                    url: ajaxurl,
                                    type: 'POST',
                                    data: {
                                        action: 'import_process_batch',
                                        nonce: $('#import-dry-run-form input[name="nonce"]').val(),
                                        session_id: sessionId,
                                        batch_size: batchSize
                                    },
                                    success: function(batchResp) {
                                        var data = (typeof batchResp === 'string') ? JSON.parse(batchResp) : batchResp;
                                        if (!data.success) {
                                            alert('Batch import failed: ' + (data.error || 'Unknown error'));
                                            $('#confirm-import-btn').prop('disabled', false).text('✓ Confirm & Import All');
                                            return;
                                        }

                                        $('#import-progress-bar').css('width', data.progress + '%');
                                        $('#import-progress-text').text(
                                            data.progress + '% (' + data.processed + '/' + data.total + ') — Updated: ' + data.updated + ', Skipped: ' + data.skipped + ', Not found: ' + (data.not_found || 0)
                                        );

                                        if (data.done) {
                                            $('#preview-results').hide();
                                            $('#import-results-text').html(
                                                '<strong style="color: green; font-size: 18px;">✓ Success! Batch update complete (no new products created).</strong><br><br>' +
                                                '<span style="font-size: 15px;">' +
                                                '✓ <strong style="color: #1565c0;">' + data.updated + ' existing products updated</strong><br>' +
                                                '⊘ <strong>' + data.skipped + ' rows skipped</strong><br><br>' +
                                                '⚠ <strong>' + (data.not_found || 0) + ' rows not matched to existing products</strong><br><br>' +
                                                '</span>' +
                                                '<em>Next: Go to Products to verify or Export tab to verify descriptions.</em>'
                                            );
                                            $('#import-status').show();
                                            $('#confirm-import-btn').prop('disabled', false).text('✓ Confirm & Import All');
                                        } else {
                                            runBatch();
                                        }
                                    },
                                    error: function(xhr) {
                                        alert('Batch import request failed: ' + (xhr.responseText || 'Server error'));
                                        $('#confirm-import-btn').prop('disabled', false).text('✓ Confirm & Import All');
                                    }
                                });
                            }

                            runBatch();
                        },
                        error: function(xhr) {
                            alert('Import start failed: ' + (xhr.responseText || 'Server error'));
                            $('#confirm-import-btn').prop('disabled', false).text('✓ Confirm & Import All');
                            $('#import-progress').hide();
                        }
                    });
                });
                
                $('#cancel-import-btn').click(function() {
                    $('#preview-results').hide();
                    $('#import-dry-run-form')[0].reset();
                });

                $('#restore-trashed-btn').click(function() {
                    if (!confirm('Restore trashed products by SKU from this CSV now?')) return;

                    $('#restore-trashed-btn').prop('disabled', true).text('↺ Restoring...');

                    var restoreForm = new FormData($('#import-dry-run-form')[0]);
                    restoreForm.append('action', 'import_restore_trashed_skus');

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: restoreForm,
                        contentType: false,
                        processData: false,
                        success: function(response) {
                            var data = (typeof response === 'string') ? JSON.parse(response) : response;
                            if (data.success) {
                                alert(data.message);
                            } else {
                                alert('Restore failed: ' + (data.error || 'Unknown error'));
                            }
                            $('#restore-trashed-btn').prop('disabled', false).text('↺ Restore Imported Trashed SKUs');
                        },
                        error: function(xhr) {
                            alert('Restore failed: ' + (xhr.responseText || 'Server error'));
                            $('#restore-trashed-btn').prop('disabled', false).text('↺ Restore Imported Trashed SKUs');
                        }
                    });
                });
            });
            </script>
            <?php
        },
        'dashicons-upload',
        25
    );
});
