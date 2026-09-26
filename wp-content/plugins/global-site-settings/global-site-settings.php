<?php
/**
 * Plugin Name: Global Site Settings
 * Plugin URI: https://belims.co.za
 * Description: Unified plugin for Belims site settings, ACF field groups, REST API endpoints, and third-party integrations (WooCommerce, FTG, BobGo, AI).
 * Version: 2.4.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: global-site-settings
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) exit;

define('GLOBAL_SITE_SETTINGS_VERSION', '2.4.0');
define('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP', '2026-09-10 19:56:35');
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

    $acf_url = function_exists('get_field') ? get_field('headless_frontend_url', 'option') : '';
    if ($acf_url) {
        return rtrim($acf_url, '/');
    }

    return 'https://belims.vercel.app';
}

function get_frontend_url() {
    $acf_url = function_exists('get_field') ? get_field('headless_frontend_url', 'option') : '';
    if ($acf_url) {
        return rtrim($acf_url, '/');
    }

    $environment = get_option('belims_frontend_environment', 'production');
    if ($environment === 'development') {
        $env_url = getenv('FRONTEND_URL');
        if ($env_url) return rtrim($env_url, '/');
        return 'http://localhost:3000';
    }

    return 'https://belims.vercel.app';
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
        'includes/class-coupon-endpoint.php', // Coupon validation
        'includes/class-firebase-phone-auth.php',  // Firebase Phone Authentication
        'includes/class-firebase-google-auth.php', // Firebase Google Authentication
        'includes/class-user-admin-page.php', // User management admin UI
        'includes/class-ecommerce-settings.php', // Ecommerce policies (Returns, Warranty, Shipping)
        'includes/class-bundled-products.php', // Bundled Products for WooCommerce
        // FTG Sync integration
        'includes/ftg-sync/class-ftg-api.php',
        'includes/ftg-sync/class-ftg-sync-endpoint.php',
        // BobGo Shipping integration
        'includes/bobgo-shipping/init.php', // Clean REST endpoint leveraging uAfrica/BobGo plugin
        'includes/bobgo-shipping/class-bobgo-api.php',
        // class-bobgo-order-handler.php disabled — BobGo receives orders via its WC webhook
        // subscription (uafrica_service_code meta → WC webhook → BobGo). Direct API requires
        // API keys which the current BobGo plan does not support.
        'includes/bobgo-shipping/class-bobgo-webhook-endpoint.php',
         // PayFast Payment Gateway integration
        'includes/payfast/class-payfast-api.php',
        'includes/payfast/class-payfast-return-handler.php', // PayFast return redirect
        'includes/payfast/class-payfast-admin-page.php', // PayFast testing/admin page
        // Dashboard Widgets
        'includes/class-dashboard-widgets.php',
    ];
    foreach ($files as $file) {
        $path = GLOBAL_SITE_SETTINGS_PLUGIN_DIR . $file;
        if (file_exists($path)) require_once $path;
    }

    // Instantiate dashboard widgets class
    if (class_exists('Belims_Dashboard_Widgets')) {
        new Belims_Dashboard_Widgets();
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
 * AJAX: Switch frontend environment (development / production)
 */
add_action('wp_ajax_switch_frontend_environment', 'switch_frontend_environment_handler');
function switch_frontend_environment_handler() {
    check_ajax_referer('switch_env_nonce', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error('Unauthorized');
        return;
    }

    $env = sanitize_text_field($_POST['environment'] ?? '');
    if (!in_array($env, array('development', 'production'), true)) {
        wp_send_json_error('Invalid environment');
        return;
    }

    update_option('belims_frontend_environment', $env);

    wp_send_json_success(array(
        'environment' => $env,
        'cors_origin' => get_cors_origin(),
    ));
}

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
 * AJAX: Check an order's BobGo sync state
 */
add_action('wp_ajax_belims_check_order_sync', 'belims_check_order_sync_handler');
function belims_check_order_sync_handler() {
    check_ajax_referer('bobgo_nonce', 'nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Unauthorized');
        return;
    }

    $order_id = intval($_POST['order_id'] ?? 0);
    if (!$order_id) {
        wp_send_json_error('No order ID supplied');
        return;
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        wp_send_json_error('Order #' . $order_id . ' not found');
        return;
    }

    $shipping_items = [];
    foreach ($order->get_items('shipping') as $item) {
        $shipping_items[] = [
            'method_title' => $item->get_method_title(),
            'method_id'    => $item->get_method_id(),
            'total'        => $order->get_currency() . ' ' . $item->get_total(),
            'service_code' => $item->get_meta('bobgo_service_level'),
        ];
    }

    $bobgo_shipment_id  = $order->get_meta('_bobgo_shipment_id');
    $bobgo_tracking_url = $order->get_meta('_bobgo_tracking_url');
    $bobgo_order_ref    = $order->get_meta('_bobgo_order_reference');

    wp_send_json_success([
        'order_id'         => $order_id,
        'order_status'     => $order->get_status(),
        'shipping_items'   => $shipping_items,
        'bobgo_synced'     => !empty($bobgo_shipment_id),
        'shipment_id'      => $bobgo_shipment_id ?: '—',
        'tracking_url'     => $bobgo_tracking_url ?: '—',
        'order_reference'  => $bobgo_order_ref ?: '—',
    ]);
}

/**
 * AJAX: Manually trigger BobGo order sync
 */
add_action('wp_ajax_belims_trigger_order_sync', 'belims_trigger_order_sync_handler');
function belims_trigger_order_sync_handler() {
    check_ajax_referer('bobgo_nonce', 'nonce');
    if (!current_user_can('manage_options')) {
        wp_send_json_error('Unauthorized');
        return;
    }

    $order_id = intval($_POST['order_id'] ?? 0);
    if (!$order_id) {
        wp_send_json_error('No order ID supplied');
        return;
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        wp_send_json_error('Order #' . $order_id . ' not found');
        return;
    }

    if (!class_exists('BobGo_Order_Handler')) {
        wp_send_json_error('BobGo_Order_Handler class not available');
        return;
    }

    // Fix legacy orders where method_id was not saved (pre-fix orders have blank method_id).
    // is_bobgo_shipping() checks method_id, so patch it now so the sync can proceed.
    $patched = false;
    foreach ($order->get_items('shipping') as $item) {
        if (empty($item->get_method_id())) {
            $item->set_method_id('bobgo_shipping');
            $item->save();
            $patched = true;
        }
    }

    // Clear the WC order-items cache so create_bobgo_order() reads the patched data, not the cached copy.
    wp_cache_delete('order-items-' . $order_id, 'orders');
    clean_post_cache($order_id);

    $handler = new BobGo_Order_Handler();
    $handler->create_bobgo_order($order_id);

    // create_bobgo_order() saves _bobgo_order_id on success (shipment is a separate step).
    $order = wc_get_order($order_id);
    $bobgo_order_id = $order->get_meta('_bobgo_order_id');
    if ($bobgo_order_id) {
        $msg = 'BobGo order created: ' . $bobgo_order_id;
        if ($patched) $msg .= ' (legacy order — method_id was patched)';
        wp_send_json_success($msg);
    } else {
        wp_send_json_error('Sync ran but no BobGo order ID was saved. Check order #' . $order_id . ' notes for details.');
    }
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
        'Belims_Coupon_Endpoint', // Coupon validation
        'Belims_Firebase_Phone_Auth',  // Firebase Phone Authentication
        'Belims_Firebase_Google_Auth', // Firebase Google Authentication
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

        .wp-core-ui .button-primary { background: var(--belims-admin-accent) !important; border-color: var(--belims-admin-accent-dark) !important; color: #ffffff !important; }
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
                    Products
                </a>
                <a class="bpc-nav-item" data-tab="bobgo-shipping">
                    Shipping
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

                    <?php
                    // Gather additional status data for dashboard
                    $firebase_configured  = defined('BELIMS_FIREBASE_API_KEY') && BELIMS_FIREBASE_API_KEY !== '';
                    $jwt_configured       = defined('JWT_AUTH_SECRET_KEY') && JWT_AUTH_SECRET_KEY !== '';
                    $payfast_merchant_id  = get_option('payfast_merchant_id', '');
                    $payfast_configured   = !empty($payfast_merchant_id);
                    $gemini_key           = function_exists('get_field') ? get_field('gemini_api_key', 'option') : '';
                    $ai_configured        = !empty($gemini_key);
                    $bobgo_token          = get_option('bobgo_api_token', '');
                    $bobgo_configured     = !empty($bobgo_token);
                    $bobgo_env            = get_option('bobgo_environment', 'production');
                    $ftg_token_exists     = function_exists('get_field') ? !empty(get_field('ftg_collection_token', 'option')) : false;
                    $last_sync_ts         = belims_get_ftg_last_sync_timestamp();
                    $last_sync_label      = $last_sync_ts > 0 ? date_i18n('F j, Y, g:i a', $last_sync_ts) : 'Never';
                    $frontend_url         = get_frontend_url();
                    $cors_origin          = get_cors_origin();
                    $environment          = get_option('belims_frontend_environment', 'production');
                    $php_version          = PHP_VERSION;
                    $wp_version           = get_bloginfo('version');
                    $wc_active            = class_exists('WooCommerce');
                    $wc_version           = $wc_active ? WC()->version : null;
                    $api_base             = rest_url('belims/v1');
                    ?>

                    <style>
                    .bpc-dash-header {
                        display: flex; align-items: flex-start; justify-content: space-between;
                        gap: 16px; margin-bottom: 28px;
                    }
                    .bpc-dash-header h1 {
                        margin: 0; font-size: 22px; font-weight: 700;
                        color: var(--bpc-text-main);
                    }
                    .bpc-dash-header p { margin: 4px 0 0; font-size: 13px; color: var(--bpc-text-muted); }
                    .bpc-env-badge {
                        display: inline-flex; align-items: center; gap: 6px;
                        padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 600;
                        border: 1px solid; white-space: nowrap;
                    }
                    .bpc-env-badge.development {
                        background: #fef3c7; color: #92400e; border-color: #fde68a;
                    }
                    .bpc-env-badge.production {
                        background: #ecfdf5; color: #065f46; border-color: #a7f3d0;
                    }
                    /* Status strip */
                    .bpc-status-strip {
                        display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 12px; margin-bottom: 28px;
                    }
                    .bpc-status-chip {
                        background: #fff; border: 1px solid var(--bpc-border); border-radius: 10px;
                        padding: 14px 16px; display: flex; flex-direction: column; gap: 4px;
                    }
                    .bpc-status-chip-label { font-size: 11px; font-weight: 600; text-transform: uppercase;
                        letter-spacing: .05em; color: var(--bpc-text-muted); }
                    .bpc-status-chip-value { font-size: 14px; font-weight: 600; color: var(--bpc-text-main); }
                    .bpc-status-chip-value a { color: inherit; text-decoration: none; }
                    .bpc-status-chip-value a:hover { text-decoration: underline; }
                    /* Section headings */
                    .bpc-dash-section-title {
                        font-size: 11px; font-weight: 800; text-transform: uppercase;
                        letter-spacing: .08em; color: #475569;
                        margin: 32px 0 14px; padding-bottom: 8px;
                        border-bottom: 1px solid var(--bpc-border);
                    }
                    /* Integration grid */
                    .bpc-integrations-grid {
                        display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                        gap: 14px; margin-bottom: 4px;
                    }
                    .bpc-integration-card {
                        background: #fff; border: 1px solid var(--bpc-border); border-radius: 12px;
                        padding: 18px 20px; transition: border-color .15s, box-shadow .15s;
                    }
                    .bpc-integration-card:hover {
                        border-color: var(--belims-primary);
                        box-shadow: 0 0 0 3px rgba(50,39,131,.06);
                    }
                    .bpc-integration-card-head {
                        display: flex; align-items: center; justify-content: space-between; gap: 8px;
                        margin-bottom: 8px;
                    }
                    .bpc-integration-card-head h4 { margin: 0; font-size: 14px; font-weight: 600; color: var(--bpc-text-main); }
                    .bpc-integration-meta { font-size: 12px; color: var(--bpc-text-muted); margin-bottom: 12px; min-height: 16px; }
                    .bpc-integration-link {
                        display: inline-flex; align-items: center; gap: 4px;
                        padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
                        color: var(--belims-primary); border: 1.5px solid var(--belims-primary);
                        text-decoration: none; cursor: pointer;
                        transition: background .15s, color .15s;
                    }
                    .bpc-integration-link:hover {
                        background: var(--belims-primary); color: #fff !important;
                        text-decoration: none;
                    }
                    /* Settings nav grid */
                    .bpc-settings-grid {
                        display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                        gap: 12px;
                    }
                    .bpc-settings-tile {
                        background: #fff; border: 1px solid var(--bpc-border); border-radius: 10px;
                        padding: 16px 40px 16px 18px; cursor: pointer;
                        transition: border-color .15s, box-shadow .15s;
                        text-decoration: none; display: block; position: relative;
                    }
                    .bpc-settings-tile:hover {
                        border-color: var(--belims-primary);
                        box-shadow: 0 0 0 3px rgba(50,39,131,.07);
                        text-decoration: none;
                    }
                    .bpc-settings-tile::after {
                        content: '→'; position: absolute; right: 16px; top: 50%;
                        transform: translateY(-50%); font-size: 14px;
                        color: var(--belims-text-muted); opacity: 0;
                        transition: opacity .15s, right .15s;
                    }
                    .bpc-settings-tile:hover::after { opacity: 1; right: 12px; }
                    .bpc-settings-tile-icon { font-size: 22px; margin-bottom: 8px; display: block; }
                    .bpc-settings-tile-label { font-size: 13px; font-weight: 600; color: var(--bpc-text-main); margin-bottom: 4px; }
                    .bpc-settings-tile-desc { font-size: 12px; color: var(--bpc-text-muted); line-height: 1.4; }
                    /* Quick tools row */
                    .bpc-quick-tools { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 32px; }
                    /* API table */
                    .bpc-api-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    .bpc-api-table thead th {
                        text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 700;
                        text-transform: uppercase; letter-spacing: .05em; color: var(--bpc-text-muted);
                        border-bottom: 1px solid var(--bpc-border); background: #f8fafc;
                    }
                    .bpc-api-table tbody td {
                        padding: 9px 12px; border-bottom: 1px solid var(--bpc-border);
                        vertical-align: middle;
                    }
                    .bpc-api-table tbody tr:last-child td { border-bottom: none; }
                    .bpc-api-table tbody tr:hover td { background: #f8fafc; }
                    .bpc-method-badge {
                        display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px;
                        font-weight: 700; font-family: monospace; letter-spacing: .03em;
                    }
                    .bpc-method-badge.get  { background: #dbeafe; color: #1e40af; }
                    .bpc-method-badge.post { background: #dcfce7; color: #166534; }
                    .bpc-method-badge.put  { background: #fef9c3; color: #854d0e; }
                    .bpc-method-badge.delete { background: #fee2e2; color: #991b1b; }
                    .bpc-api-url { font-family: monospace; font-size: 12px; color: var(--bpc-text-main); }
                    /* Auth badges for API table */
                    .bpc-auth-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
                    .bpc-auth-badge--public { background: #dcfce7; color: #166534; }
                    .bpc-auth-badge--jwt    { background: #dbeafe; color: #1e40af; }
                    .bpc-auth-badge--admin  { background: #ede9fe; color: #7c3aed; }
                    /* Integration status pills */
                    .bpc-pill {
                        display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px;
                        border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid;
                    }
                    .bpc-pill.ok    { background: #ecfdf5; color: #166534; border-color: #bbf7d0; }
                    .bpc-pill.warn  { background: #fef3c7; color: #92400e; border-color: #fde68a; }
                    .bpc-pill.error { background: #fee2e2; color: #991b1b; border-color: #fecdd3; }
                    </style>

                    <!-- Header -->
                    <div class="bpc-dash-header">
                        <div>
                            <h1>Belims Hardware CMS</h1>
                            <p>Global Site Settings v<?php echo GLOBAL_SITE_SETTINGS_VERSION; ?> &nbsp;·&nbsp; by Broken Pony Club</p>
                        </div>
                        <span class="bpc-env-badge <?php echo esc_attr($environment); ?>">
                            <?php echo $environment === 'development' ? '⚡ Development' : '✅ Production'; ?>
                        </span>
                    </div>

                    <!-- System status strip -->
                    <div class="bpc-status-strip">
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">WordPress</span>
                            <span class="bpc-status-chip-value">v<?php echo esc_html($wp_version); ?></span>
                        </div>
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">WooCommerce</span>
                            <span class="bpc-status-chip-value">
                                <?php if ($wc_active): ?>v<?php echo esc_html($wc_version); ?>
                                <?php else: ?><span style="color:#991b1b;">Not active</span><?php endif; ?>
                            </span>
                        </div>
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">PHP</span>
                            <span class="bpc-status-chip-value">v<?php echo esc_html($php_version); ?></span>
                        </div>
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">CORS Origin</span>
                            <span class="bpc-status-chip-value" style="font-size:12px;word-break:break-all;"><?php echo esc_html($cors_origin); ?></span>
                        </div>
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">Frontend URL</span>
                            <span class="bpc-status-chip-value" style="font-size:12px;">
                                <a href="<?php echo esc_url($frontend_url); ?>" target="_blank"><?php echo esc_html($frontend_url); ?></a>
                            </span>
                        </div>
                    </div>

                    <!-- Integrations -->
                    <div class="bpc-dash-section-title">Integrations</div>
                    <div class="bpc-integrations-grid">

                        <!-- FTG Sync -->
                        <div class="bpc-integration-card">
                            <div class="bpc-integration-card-head">
                                <h4>🔄 FTG Sync</h4>
                                <form method="post" style="margin:0;">
                                    <?php wp_nonce_field('save_ftg_enabled_dashboard_action', 'ftg_enabled_dashboard_nonce'); ?>
                                    <input type="hidden" name="save_ftg_enabled_dashboard" value="1" />
                                    <label class="toggle-switch">
                                        <input type="checkbox" name="ftg_enabled" id="ftg-enabled-toggle-dashboard" value="1" <?php checked(1, $ftg_enabled); ?> />
                                        <div class="switch-track"><div class="switch-thumb"></div></div>
                                    </label>
                                </form>
                            </div>
                            <p class="bpc-integration-meta">
                                <?php if ($ftg_enabled && $ftg_token_exists): ?>
                                    Last sync: <?php echo esc_html($last_sync_label); ?>
                                <?php elseif ($ftg_enabled): ?>
                                    <span style="color:#92400e;">Token not configured</span>
                                <?php else: ?>
                                    Disabled
                                <?php endif; ?>
                            </p>
                            <a class="bpc-integration-link" onclick="jQuery('.bpc-nav-item[data-tab=\'ftg-sync\']').click()">
                                Configure →
                            </a>
                        </div>

                        <!-- BobGo Shipping -->
                        <div class="bpc-integration-card">
                            <div class="bpc-integration-card-head">
                                <h4>🚚 BobGo Shipping</h4>
                                <form method="post" style="margin:0;">
                                    <?php wp_nonce_field('save_bobgo_enabled_dashboard_action', 'bobgo_enabled_dashboard_nonce'); ?>
                                    <input type="hidden" name="save_bobgo_enabled_dashboard" value="1" />
                                    <label class="toggle-switch">
                                        <input type="checkbox" name="bobgo_enabled" id="bobgo-enabled-toggle-dashboard" value="1" <?php checked(1, $bobgo_enabled); ?> />
                                        <div class="switch-track"><div class="switch-thumb"></div></div>
                                    </label>
                                </form>
                            </div>
                            <p class="bpc-integration-meta">
                                <?php if ($bobgo_enabled && $bobgo_configured): ?>
                                    <span class="bpc-pill ok">● <?php echo ucfirst($bobgo_env); ?></span>
                                <?php elseif ($bobgo_enabled): ?>
                                    <span style="color:#92400e;">API token missing</span>
                                <?php else: ?>
                                    Disabled
                                <?php endif; ?>
                            </p>
                            <a class="bpc-integration-link" onclick="jQuery('.bpc-nav-item[data-tab=\'bobgo-shipping\']').click()">
                                Configure →
                            </a>
                        </div>

                        <!-- Firebase Phone Auth -->
                        <div class="bpc-integration-card">
                            <div class="bpc-integration-card-head">
                                <h4>📱 Firebase Auth</h4>
                                <?php if ($firebase_configured && $jwt_configured): ?>
                                    <span class="bpc-pill ok">Active</span>
                                <?php elseif ($firebase_configured): ?>
                                    <span class="bpc-pill warn">JWT missing</span>
                                <?php else: ?>
                                    <span class="bpc-pill error">Not configured</span>
                                <?php endif; ?>
                            </div>
                            <p class="bpc-integration-meta">
                                Phone OTP sign-in via Firebase<br>
                                <?php echo $jwt_configured ? '✓ JWT secret set' : '<span style="color:#92400e;">JWT_AUTH_SECRET_KEY not set</span>'; ?>
                            </p>
                            <a class="bpc-integration-link" href="https://console.firebase.google.com" target="_blank">
                                Firebase Console ↗
                            </a>
                        </div>

                        <!-- Payment Gateway -->
                        <div class="bpc-integration-card">
                            <div class="bpc-integration-card-head">
                                <h4>💳 Payment Gateway</h4>
                                <?php if ($payfast_configured): ?>
                                    <span class="bpc-pill ok">PayFast</span>
                                <?php else: ?>
                                    <span class="bpc-pill warn">Not set</span>
                                <?php endif; ?>
                            </div>
                            <p class="bpc-integration-meta">
                                <?php echo $payfast_configured ? 'Merchant ID: ' . esc_html(substr($payfast_merchant_id, 0, 4)) . '****' : 'PayFast not configured'; ?>
                            </p>
                            <a class="bpc-integration-link" onclick="jQuery('.bpc-nav-item[data-tab=\'payment-gateways\']').click()">
                                Configure →
                            </a>
                        </div>

                        <!-- AI Services -->
                        <div class="bpc-integration-card">
                            <div class="bpc-integration-card-head">
                                <h4>🤖 AI Services</h4>
                                <?php if ($ai_configured): ?>
                                    <span class="bpc-pill ok">Gemini</span>
                                <?php else: ?>
                                    <span class="bpc-pill error">Not configured</span>
                                <?php endif; ?>
                            </div>
                            <p class="bpc-integration-meta">
                                Google Gemini for product descriptions
                            </p>
                            <a class="bpc-integration-link" onclick="jQuery('.bpc-nav-item[data-tab=\'ai-services\']').click()">
                                Configure →
                            </a>
                        </div>

                    </div>

                    <!-- Settings quick links -->
                    <div class="bpc-dash-section-title">Settings</div>
                    <div class="bpc-settings-grid">
                        <?php
                        $settings_tiles = [
                            ['tab' => 'branding',         'icon' => '🎨', 'label' => 'Branding',          'desc' => 'Logo, colors, frontend URL and environment'],
                            ['tab' => 'ecommerce',        'icon' => '🛒', 'label' => 'Ecommerce',         'desc' => 'Returns, warranty and shipping policies'],
                            ['tab' => 'cors-security',    'icon' => '🔒', 'label' => 'CORS & Security',   'desc' => 'Allowed origins and REST API security'],
                            ['tab' => 'woocommerce',      'icon' => '🏪', 'label' => 'WooCommerce',       'desc' => 'WooCommerce API and product description import'],
                            ['tab' => 'ftg-sync',         'icon' => '🔄', 'label' => 'FTG Sync',          'desc' => 'Find The Gap product catalogue sync'],
                            ['tab' => 'bobgo-shipping',   'icon' => '🚚', 'label' => 'BobGo Shipping',    'desc' => 'Shipping rates, tracking and sandbox mode'],
                            ['tab' => 'payment-gateways', 'icon' => '💳', 'label' => 'Payment Gateways',  'desc' => 'PayFast credentials and checkout config'],
                            ['tab' => 'ai-services',      'icon' => '🤖', 'label' => 'AI Services',       'desc' => 'Gemini AI key for product descriptions'],
                            ['tab' => 'payfast-testing',  'icon' => '🧪', 'label' => 'PayFast Testing',   'desc' => 'Test payment flows in sandbox mode'],
                        ];
                        foreach ($settings_tiles as $tile): ?>
                            <a class="bpc-settings-tile" onclick="jQuery('.bpc-nav-item[data-tab=\'<?php echo esc_js($tile['tab']); ?>\']').click(); return false;" href="#">
                                <span class="bpc-settings-tile-icon"><?php echo $tile['icon']; ?></span>
                                <div class="bpc-settings-tile-label"><?php echo esc_html($tile['label']); ?></div>
                                <div class="bpc-settings-tile-desc"><?php echo esc_html($tile['desc']); ?></div>
                            </a>
                        <?php endforeach; ?>
                    </div>

                    <!-- REST API endpoints -->
                    <div class="bpc-dash-section-title">REST API Endpoints <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:12px;margin-left:6px;"><?php echo esc_html(rtrim($api_base, '/')); ?></span></div>
                    <div class="bpc-card" style="padding:0;overflow:hidden;">
                        <table class="bpc-api-table">
                            <thead>
                                <tr>
                                    <th style="width:70px;">Method</th>
                                    <th>Endpoint</th>
                                    <th>Description</th>
                                    <th style="width:90px;">Auth</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $endpoints = [
                                    // Auth
                                    ['POST', '/auth/firebase-phone',  'Exchange Firebase Phone ID token for WP JWT',  'Public'],
                                    ['POST', '/auth/firebase-google', 'Exchange Firebase Google ID token for WP JWT', 'Public'],
                                    // Users
                                    ['POST', '/users/register',      'Register a new customer or contractor account', 'Public'],
                                    ['POST', '/users/login',         'Email + password login — returns JWT', 'Public'],
                                    ['GET',  '/users/me',            'Get current user profile', 'JWT'],
                                    ['PUT',  '/users/me',            'Update profile, billing and shipping address', 'JWT'],
                                    // Products
                                    ['GET',  '/products',            'Paginated product catalogue with deals', 'Public'],
                                    ['GET',  '/products/{id}',       'Single product with full detail payload', 'Public'],
                                    // Categories
                                    ['GET',  '/categories',          'Hierarchical product category tree', 'Public'],
                                    // Orders
                                    ['GET',  '/orders',              'Orders for the authenticated customer', 'JWT'],
                                    ['POST', '/orders',              'Create a new WooCommerce order', 'JWT'],
                                    // Coupons
                                    ['POST', '/coupons/validate',    'Validate a coupon code and return discount', 'Public'],
                                    // Ecommerce policies
                                    ['GET',  '/ecommerce-policies',  'Returns, warranty, shipping policy content', 'Public'],
                                    // BobGo
                                    ['POST', '/bobgo/rates',         'Fetch shipping rates for a destination', 'Public'],
                                    ['GET',  '/bobgo/tracking/{id}', 'Get shipment tracking status', 'Public'],
                                    // FTG
                                    ['POST', '/ftg/sync',            'Trigger FTG product catalogue sync', 'Admin'],
                                    ['GET',  '/ftg/brands',          'List all FTG brands (cached)', 'Admin'],
                                    ['GET',  '/ftg/brand-count',     'Count products for a given brand', 'Admin'],
                                ];
                                foreach ($endpoints as $ep):
                                    $method = strtolower($ep[0]);
                                ?>
                                <tr>
                                    <td><span class="bpc-method-badge <?php echo $method; ?>"><?php echo strtoupper($ep[0]); ?></span></td>
                                    <td><code class="bpc-api-url"><?php echo esc_html($ep[1]); ?></code></td>
                                    <td style="font-size:13px;color:var(--bpc-text-muted);"><?php echo esc_html($ep[2]); ?></td>
                                    <td>
                                        <?php $auth = $ep[3]; ?>
                                        <span class="bpc-auth-badge bpc-auth-badge--<?php echo strtolower(esc_attr($auth)); ?>"><?php echo esc_html($auth); ?></span>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>

                    <!-- Quick tools -->
                    <div class="bpc-dash-section-title">Quick Tools</div>
                    <div class="bpc-quick-tools">
                        <button class="bpc-btn-primary" onclick="jQuery('.bpc-nav-item[data-tab=\'ftg-sync\']').click()">
                            FTG Sync
                        </button>
                        <button type="button" id="ftg-brand-count" class="bpc-btn-secondary">
                            Check Assa Abloy Count
                        </button>
                        <button type="button" id="belims-clear-cache" class="bpc-btn-secondary">
                            Clear Cache
                        </button>
                    </div>
                    <div id="ftg-brand-count-status" style="margin-bottom:16px;"></div>

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

                    <script>
                    jQuery(document).ready(function($) {
                        var latestBrandCountResult = null;

                        function getQuickActionBrand() {
                            var selected = ($('#ftg-brand-filter').val() || '').trim();
                            if (selected === '__custom__') {
                                return ($('#ftg-custom-brand').val() || '').trim();
                            }
                            return selected || 'Assa Abloy';
                        }

                        function escapeHtml(value) {
                            return String(value || '')
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')
                                .replace(/"/g, '&quot;')
                                .replace(/'/g, '&#039;');
                        }

                        function toCsvRow(cells) {
                            return cells.map(function(cell) {
                                var value = String(cell == null ? '' : cell);
                                return '"' + value.replace(/"/g, '""') + '"';
                            }).join(',');
                        }

                        function buildBrandCountCsv(data, brand) {
                            var rows = [];
                            rows.push(toCsvRow(['Brand', brand]));
                            rows.push(toCsvRow(['Total Unique Products', data.total_unique || 0]));
                            rows.push(toCsvRow(['Pages Fetched', data.pages_fetched || 0]));
                            rows.push(toCsvRow(['API URL', data.api_url || '']));
                            rows.push(toCsvRow(['API URL Template', data.api_url_template || '']));
                            rows.push('');
                            rows.push(toCsvRow(['SKU', 'Name', 'Brand', 'FTG One ID']));

                            var products = Array.isArray(data.products) ? data.products : [];
                            products.forEach(function(product) {
                                rows.push(toCsvRow([
                                    product.sku || '',
                                    product.name || '',
                                    product.brand || '',
                                    product.ftg_one_id || ''
                                ]));
                            });

                            return rows.join('\n');
                        }

                        function downloadBrandCountCsv(data, brand) {
                            var csv = buildBrandCountCsv(data, brand);
                            var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            var url = window.URL.createObjectURL(blob);
                            var safeBrand = (brand || 'brand').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
                            var datePart = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                            var filename = 'ftg-brand-count-' + (safeBrand || 'brand') + '-' + datePart + '.csv';

                            var link = document.createElement('a');
                            link.href = url;
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                        }

                        function updateQuickActionBrandButton() {
                            var brand = getQuickActionBrand();
                            $('#ftg-brand-count').text('Check ' + brand + ' Count');
                        }

                        $(document).on('change input', '#ftg-brand-filter, #ftg-custom-brand', function() {
                            updateQuickActionBrandButton();
                        });

                        updateQuickActionBrandButton();

                        $('#ftg-brand-count').on('click', function() {
                            var brand = getQuickActionBrand();
                            var btn = $(this);
                            var status = $('#ftg-brand-count-status');
                            latestBrandCountResult = null;
                            btn.prop('disabled', true).text('Checking...');
                            status.text('Fetching ' + brand + ' total from FTG...');
                            fetch('<?php echo rest_url('belims/v1/ftg/brand-count'); ?>?brand=' + encodeURIComponent(brand))
                                .then(function(r) { return r.json(); })
                                .then(function(data) {
                                    btn.prop('disabled', false);
                                    updateQuickActionBrandButton();
                                    if (data && data.success) {
                                        latestBrandCountResult = data;
                                        var firstProductText = '';
                                        if (data.first_product && data.first_product.sku) {
                                            var firstName = data.first_product.name || 'Unnamed Product';
                                            firstProductText = '<br/>Product: <strong>' + escapeHtml(firstName) + '</strong> - <code>' + escapeHtml(data.first_product.sku) + '</code>';
                                        }
                                        var apiUrlText = data.api_url ? '<br/>API URL: <code>' + escapeHtml(data.api_url) + '</code>' : '';
                                        var returnedCount = Array.isArray(data.products) ? data.products.length : 0;
                                        var downloadButton = '<br/><button type="button" id="ftg-brand-count-download" class="button button-secondary" style="margin-top:8px;">Download Returned Products</button>';
                                        status.html(
                                            escapeHtml(brand) + ' products available in FTG: <strong>' + (data.total_unique || 0) + '</strong> (pages fetched: ' + (data.pages_fetched || 0) + ', returned: ' + returnedCount + ')' +
                                            firstProductText +
                                            apiUrlText +
                                            downloadButton
                                        );
                                    } else {
                                        status.text('Unable to fetch count: ' + (data && data.message ? data.message : 'Unknown error'));
                                    }
                                })
                                .catch(function(err) {
                                    btn.prop('disabled', false);
                                    updateQuickActionBrandButton();
                                    status.text('Request failed: ' + err);
                                });
                        });

                        $(document).on('click', '#ftg-brand-count-download', function() {
                            var brand = getQuickActionBrand();
                            if (!latestBrandCountResult || !latestBrandCountResult.success) {
                                $('#ftg-brand-count-status').text('No brand-count results available to download yet.');
                                return;
                            }

                            downloadBrandCountCsv(latestBrandCountResult, brand);
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
                    $last_sync_ts_ftg   = belims_get_ftg_last_sync_timestamp();
                    $last_sync_text     = $last_sync_ts_ftg > 0 ? date_i18n('F j, Y, g:i a', $last_sync_ts_ftg) : 'Never';
                    $ftg_cron_frequency = get_option('belims_ftg_cron_frequency', 'disabled');
                    $ftg_next_scheduled = wp_next_scheduled('belims_ftg_auto_sync');
                    $ftg_next_run_text  = $ftg_next_scheduled ? date_i18n('F j, Y, g:i a', $ftg_next_scheduled) : 'Not scheduled';
                    $ftg_cron_nonce     = wp_create_nonce('belims_ftg_cron_nonce');
                    ?>

                    <style>
                    /* FTG Sync tab */
                    .ftg-field-row {
                        display: flex; align-items: flex-start; gap: 24px;
                        padding: 16px 0; border-bottom: 1px solid var(--bpc-border);
                    }
                    .ftg-field-row:last-child { border-bottom: none; }
                    .ftg-field-label { width: 220px; flex-shrink: 0; padding-top: 6px; }
                    .ftg-field-label label { font-size: 13px; font-weight: 600; color: var(--bpc-text-main); display: block; }
                    .ftg-field-desc { font-size: 12px; color: var(--bpc-text-muted); margin: 4px 0 0; line-height: 1.4; }
                    .ftg-field-control { flex: 1; }
                    .ftg-field-control input[type="email"],
                    .ftg-field-control input[type="password"],
                    .ftg-field-control input[type="text"] { width: 100%; max-width: 360px; }
                    .ftg-token-row { display: flex; gap: 10px; align-items: flex-start; }
                    .ftg-token-input-wrap { flex: 1; max-width: 360px; }
                    /* Product sync section */
                    .ftg-product-sync { margin-top: 28px; padding-top: 28px; border-top: 1px solid var(--bpc-border); }
                    .ftg-product-sync h3 { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: var(--bpc-text-main); }
                    .ftg-last-sync { font-size: 13px; color: var(--bpc-text-muted); margin: 0 0 20px; }
                    /* Brand toolbar */
                    .ftg-toolbar { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
                    .ftg-toolbar-group { display: flex; flex-direction: column; gap: 4px; }
                    .ftg-toolbar-label { font-size: 12px; font-weight: 600; color: var(--bpc-text-main); }
                    /* Action group cards */
                    .ftg-action-group {
                        background: #f8fafc; border: 1px solid var(--bpc-border);
                        border-radius: 10px; padding: 16px 18px; margin-bottom: 12px;
                    }
                    .ftg-action-group-header {
                        font-size: 11px; font-weight: 700; text-transform: uppercase;
                        letter-spacing: .06em; color: #64748b;
                        margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--bpc-border);
                    }
                    .ftg-action-group-body { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
                    /* Danger button */
                    .ftg-btn-danger.button-secondary { color: var(--belims-red) !important; border-color: var(--belims-red) !important; }
                    .ftg-btn-danger.button-secondary:hover { background: var(--belims-red) !important; color: #fff !important; }
                    /* Dry run label */
                    .ftg-dry-run-label {
                        display: inline-flex; align-items: center; gap: 6px;
                        font-size: 12px; font-weight: 500; color: var(--bpc-text-muted); margin-left: 4px;
                    }
                    /* SKU row */
                    .ftg-sku-row { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; margin-top: 10px; }
                    .ftg-sku-wrap { display: flex; flex-direction: column; gap: 4px; }
                    .ftg-sku-wrap label { font-size: 12px; font-weight: 600; color: var(--bpc-text-main); }
                    .ftg-sku-wrap input { max-width: 200px; }
                    /* Credentials saved state */
                    .ftg-credentials-saved {
                        background: #f8fafc; border: 1px solid var(--bpc-border);
                        border-radius: 10px; padding: 16px 18px; margin-bottom: 4px;
                    }
                    .ftg-saved-row {
                        display: flex; align-items: center; gap: 16px;
                        padding: 9px 0; border-bottom: 1px solid var(--bpc-border);
                    }
                    .ftg-saved-row:last-of-type { border-bottom: none; }
                    .ftg-saved-label {
                        width: 140px; flex-shrink: 0; font-size: 11px; font-weight: 700;
                        color: var(--bpc-text-muted); text-transform: uppercase; letter-spacing: .05em;
                    }
                    .ftg-saved-value { font-size: 13px; color: var(--bpc-text-main); font-weight: 500; font-family: monospace; }
                    .ftg-saved-actions {
                        display: flex; gap: 8px; margin-top: 14px; padding-top: 14px;
                        border-top: 1px solid var(--bpc-border);
                    }
                    /* Status areas */
                    #ftg-sync-status, #ftg-sync-single-result { margin-top: 12px; }
                    #token-status { margin-top: 10px; }
                    /* Progress bar */
                    .ftg-progress-bar {
                        width: 100%; height: 10px; background: #e2e8f0;
                        border-radius: 999px; overflow: hidden; margin: 14px 0 4px;
                    }
                    .ftg-progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, var(--belims-primary) 0%, #5b52c4 100%);
                        transition: width 0.3s ease; border-radius: 999px;
                    }
                    .ftg-progress-text { font-size: 12px; font-weight: 600; color: var(--belims-primary); margin: 0 0 10px; }
                    .ftg-sync-details { margin-top: 20px; }
                    .ftg-sync-details table { margin-top: 10px; }
                    .ftg-sync-details th { text-align: center; font-weight: 600; }
                    .ftg-sync-details td { text-align: center; font-size: 18px; font-weight: 600; }
                    </style>

                    <form method="post" action="">
                        <?php wp_nonce_field('save_ftg_credentials_action', 'ftg_nonce'); ?>

                        <div class="ftg-field-row">
                            <div class="ftg-field-label">
                                <label for="ftg-enabled-toggle">Enable Integration</label>
                                <p class="ftg-field-desc">Enable product sync with Find The Gap</p>
                            </div>
                            <div class="ftg-field-control">
                                <label class="bpc-switch">
                                    <input type="checkbox" name="ftg_enabled" value="1" <?php checked(1, $ftg_enabled); ?> id="ftg-enabled-toggle" />
                                    <span class="bpc-slider"></span>
                                </label>
                            </div>
                        </div>

                        <?php $ftg_credentials_saved = !empty($ftg_email) && !empty($ftg_password) && !empty($ftg_token); ?>
                        <div id="ftg-credentials-section" style="<?php echo $ftg_enabled ? '' : 'display:none;'; ?>">

                            <?php if ($ftg_credentials_saved): ?>
                            <div id="ftg-credentials-saved" class="ftg-credentials-saved">
                                <div class="ftg-saved-row">
                                    <span class="ftg-saved-label">Email</span>
                                    <span class="ftg-saved-value"><?php echo esc_html($ftg_email); ?></span>
                                </div>
                                <div class="ftg-saved-row">
                                    <span class="ftg-saved-label">Password</span>
                                    <span class="ftg-saved-value">••••••••••••</span>
                                </div>
                                <div class="ftg-saved-row">
                                    <span class="ftg-saved-label">Token</span>
                                    <span class="ftg-saved-value"><?php echo esc_html(substr($ftg_token, 0, 8)); ?>••••••••</span>
                                </div>
                                <div class="ftg-saved-actions">
                                    <button type="button" id="ftg-edit-credentials" class="button button-secondary">
                                        ✏️ Edit Credentials
                                    </button>
                                </div>
                            </div>
                            <?php endif; ?>

                            <div id="ftg-credentials-form" <?php echo $ftg_credentials_saved ? 'style="display:none;"' : ''; ?>>
                                <div class="ftg-field-row">
                                    <div class="ftg-field-label">
                                        <label>FTG Account Email</label>
                                        <p class="ftg-field-desc">Your Find The Gap account email</p>
                                    </div>
                                    <div class="ftg-field-control">
                                        <input type="email" name="ftg_email" value="<?php echo esc_attr($ftg_email); ?>" class="regular-text" />
                                    </div>
                                </div>
                                <div class="ftg-field-row">
                                    <div class="ftg-field-label">
                                        <label>FTG Account Password</label>
                                        <p class="ftg-field-desc">Stored securely</p>
                                    </div>
                                    <div class="ftg-field-control">
                                        <input type="password" name="ftg_password" value="<?php echo esc_attr($ftg_password); ?>" class="regular-text" />
                                    </div>
                                </div>
                                <div class="ftg-field-row">
                                    <div class="ftg-field-label">
                                        <label>FTG Collection Token</label>
                                        <p class="ftg-field-desc">Your Find The Gap collection token</p>
                                    </div>
                                    <div class="ftg-field-control">
                                        <div class="ftg-token-row">
                                            <div class="ftg-token-input-wrap">
                                                <input type="text" name="ftg_collection_token" id="ftg-token-input" value="<?php echo esc_attr($ftg_token); ?>" class="regular-text" />
                                            </div>
                                            <button type="button" id="get-ftg-token" class="button button-secondary">
                                                🔑 Get Token
                                            </button>
                                        </div>
                                        <div id="token-status"></div>
                                    </div>
                                </div>

                                <div class="bpc-submit-bar">
                                    <input type="submit" name="save_ftg_credentials" class="bpc-btn-primary" value="Save Credentials" />
                                    <?php if ($ftg_credentials_saved): ?>
                                    <button type="button" id="ftg-cancel-edit" class="button button-secondary" style="margin-left: 8px;">Cancel</button>
                                    <?php endif; ?>
                                </div>
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

                        $('#ftg-edit-credentials').on('click', function() {
                            $('#ftg-credentials-saved').hide();
                            $('#ftg-credentials-form').slideDown();
                        });

                        $('#ftg-cancel-edit').on('click', function() {
                            $('#ftg-credentials-form').slideUp(function() {
                                $('#ftg-credentials-saved').show();
                            });
                        });

                        // Cron frequency save
                        $('#ftg-save-cron-frequency').on('click', function() {
                            var btn = $(this);
                            var cronStatus = $('#ftg-cron-status');
                            btn.prop('disabled', true).text('Saving...');
                            $.ajax({
                                url: ajaxurl,
                                method: 'POST',
                                data: {
                                    action: 'belims_save_ftg_cron_frequency',
                                    nonce: '<?php echo esc_js($ftg_cron_nonce); ?>',
                                    frequency: $('#ftg-cron-frequency').val()
                                },
                                success: function(response) {
                                    btn.prop('disabled', false).text('Save');
                                    if (response.success) {
                                        cronStatus.html('Next scheduled run: <strong>' + response.data.next_run + '</strong>');
                                    }
                                },
                                error: function() { btn.prop('disabled', false).text('Save'); }
                            });
                        });

                        // Cron manual run
                        $('#ftg-run-cron-now').on('click', function() {
                            var btn = $(this);
                            var cronStatus = $('#ftg-cron-status');
                            if (!confirm('Run FTG auto-sync now? This may take several minutes.')) return;
                            btn.prop('disabled', true).text('Running...');
                            cronStatus.html('⏳ Sync running…');
                            $.ajax({
                                url: ajaxurl,
                                method: 'POST',
                                timeout: 330000,
                                data: {
                                    action: 'belims_run_ftg_cron_now',
                                    nonce: '<?php echo esc_js($ftg_cron_nonce); ?>'
                                },
                                success: function(response) {
                                    btn.prop('disabled', false).text('▶ Run Now');
                                    if (response.success) {
                                        cronStatus.html('✅ Sync complete — Last sync: <strong>' + response.data.last_sync + '</strong>');
                                    }
                                },
                                error: function() {
                                    btn.prop('disabled', false).text('▶ Run Now');
                                    cronStatus.html('<span style="color:var(--belims-red);">❌ Sync failed or timed out</span>');
                                }
                            });
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
                    <div class="ftg-product-sync">
                        <h3>Product Sync</h3>
                        <p class="ftg-last-sync">Last sync: <strong><?php echo esc_html($last_sync_text); ?></strong></p>

                        <?php if (!$ftg_token): ?>
                            <div class="notice notice-warning inline">
                                <p>⚠️ Please configure your FTG Collection Token above before syncing.</p>
                            </div>
                        <?php else: ?>
                            <div id="ftg-sync-controls">
                                <div class="ftg-toolbar">
                                    <div class="ftg-toolbar-group">
                                        <label class="ftg-toolbar-label" for="ftg-brand-filter">Catalogue Brand</label>
                                        <select id="ftg-brand-filter" class="regular-text" style="min-width: 220px;">
                                            <option value="Assa Abloy" selected>Assa Abloy</option>
                                            <option value="Ingco">Ingco</option>
                                            <option value="Yale">Yale</option>
                                            <option value="__custom__">Other (type below)</option>
                                        </select>
                                    </div>
                                    <button type="button" id="ftg-search-brands" class="button button-secondary">
                                        🔎 Search Available Brands
                                    </button>
                                    <div class="ftg-toolbar-group" id="ftg-custom-brand-wrap" style="display:none;">
                                        <label class="ftg-toolbar-label" for="ftg-custom-brand">Custom Brand</label>
                                        <input type="text" id="ftg-custom-brand" class="regular-text" placeholder="Enter FTG brand name" style="min-width: 220px;" />
                                    </div>
                                </div>

                                <div class="ftg-action-group">
                                    <div class="ftg-action-group-header">Auto-Sync Schedule</div>
                                    <div class="ftg-action-group-body">
                                        <div class="ftg-toolbar-group">
                                            <label class="ftg-toolbar-label" for="ftg-cron-frequency">Frequency</label>
                                            <select id="ftg-cron-frequency" class="regular-text" style="min-width: 160px;">
                                                <option value="disabled" <?php selected($ftg_cron_frequency, 'disabled'); ?>>Disabled</option>
                                                <option value="hourly" <?php selected($ftg_cron_frequency, 'hourly'); ?>>Hourly</option>
                                                <option value="twicedaily" <?php selected($ftg_cron_frequency, 'twicedaily'); ?>>Twice Daily</option>
                                                <option value="daily" <?php selected($ftg_cron_frequency, 'daily'); ?>>Daily</option>
                                                <option value="weekly" <?php selected($ftg_cron_frequency, 'weekly'); ?>>Weekly</option>
                                            </select>
                                        </div>
                                        <button type="button" id="ftg-save-cron-frequency" class="button button-secondary" style="align-self:flex-end;">
                                            Save
                                        </button>
                                        <button type="button" id="ftg-run-cron-now" class="button button-secondary" style="align-self:flex-end;">
                                            ▶ Run Now
                                        </button>
                                    </div>
                                    <div id="ftg-cron-status" style="margin-top: 10px; font-size: 12px; color: var(--bpc-text-muted);">
                                        Next scheduled run: <strong><?php echo esc_html($ftg_next_run_text); ?></strong>
                                    </div>
                                </div>

                                <div class="ftg-action-group">
                                    <div class="ftg-action-group-header">Connection</div>
                                    <div class="ftg-action-group-body">
                                        <button type="button" id="ftg-test-connection" class="button button-secondary">
                                            🔗 Test Connection
                                        </button>
                                        <button type="button" id="ftg-disconnect" class="button button-secondary ftg-btn-danger">
                                            🔌 Disconnect FTG
                                        </button>
                                    </div>
                                </div>

                                <div class="ftg-action-group">
                                    <div class="ftg-action-group-header">Tools</div>
                                    <div class="ftg-action-group-body">
                                        <button type="button" id="ftg-inspect-product" class="button button-secondary">
                                            🔍 Inspect Product
                                        </button>
                                        <button type="button" id="ftg-check-catalogue-count" class="button button-secondary">
                                            📊 Check Catalogue Count
                                        </button>
                                        <button type="button" id="ftg-count-display-on-web" class="button button-secondary">
                                            🌐 Count Display On Web Active
                                        </button>
                                        <button type="button" id="ftg-export-brand-products" class="button button-secondary">
                                            📥 Export Brand Products
                                        </button>
                                        <button type="button" id="ftg-cleanup-attributes" class="button button-secondary">
                                            🧹 Cleanup Duplicate Attributes
                                        </button>
                                    </div>
                                </div>

                                <div class="ftg-action-group">
                                    <div class="ftg-action-group-header">Sync</div>
                                    <div class="ftg-action-group-body">
                                        <button type="button" id="ftg-test-sync" class="button button-secondary">
                                            ✅ Test Sync
                                        </button>
                                    </div>
                                    <div class="ftg-sku-row">
                                        <div class="ftg-sku-wrap">
                                            <label for="ftg-sku-input">Product SKU</label>
                                            <input type="text" id="ftg-sku-input" placeholder="e.g., ING-12345" class="regular-text" />
                                        </div>
                                        <button type="button" id="ftg-sync-single-btn" class="button button-secondary" style="align-self:flex-end;">
                                            ✅ Sync Single Product
                                        </button>
                                    </div>
                                    <div class="ftg-action-group-body" style="margin-top: 12px;">
                                        <button type="button" id="ftg-sync-products" class="button button-primary">
                                            🔄 SYNC CATALOGUE
                                        </button>
                                        <button type="button" id="ftg-sync-all-products" class="button button-primary" style="background:#1d2327; border-color:#1d2327;">
                                            ⚡ SYNC ALL BRANDS
                                        </button>
                                        <label class="ftg-dry-run-label" for="ftg-sync-all-dry-run">
                                            <input type="checkbox" id="ftg-sync-all-dry-run" />
                                            Dry Run (counts only, no writes)
                                        </label>
                                    </div>
                                    <div id="ftg-sync-single-result"></div>
                                </div>

                                <div id="ftg-sync-status"></div>
                            </div>

                            <script>
                            jQuery(document).ready(function($) {
                                var ftgBrands = [];

                                function getSelectedFtgBrand() {
                                    var selected = ($('#ftg-brand-filter').val() || '').trim();
                                    if (selected === '__custom__') {
                                        return ($('#ftg-custom-brand').val() || '').trim();
                                    }
                                    return selected;
                                }

                                function updateFtgBrandControls() {
                                    var selected = $('#ftg-brand-filter').val();
                                    var showCustom = selected === '__custom__';
                                    $('#ftg-custom-brand-wrap').toggle(showCustom);
                                }

                                function getInitialBrandOptions() {
                                    var options = [];
                                    $('#ftg-brand-filter option').each(function() {
                                        var value = ($(this).val() || '').trim();
                                        if (value && value !== '__custom__') {
                                            options.push(value);
                                        }
                                    });
                                    return options;
                                }

                                function populateFtgBrandDropdown(ftgBrands) {
                                    var select = $('#ftg-brand-filter');
                                    var currentValue = (select.val() || '').trim();
                                    var currentCustom = ($('#ftg-custom-brand').val() || '').trim();
                                    var merged = [];
                                    var seen = {};
                                    var initial = getInitialBrandOptions();

                                    initial.concat(Array.isArray(ftgBrands) ? ftgBrands : []).forEach(function(brand) {
                                        var clean = (brand || '').toString().trim();
                                        if (!clean) return;
                                        var key = clean.toLowerCase();
                                        if (seen[key]) return;
                                        seen[key] = clean;
                                        merged.push(clean);
                                    });

                                    select.empty();
                                    merged.forEach(function(brand) {
                                        select.append($('<option></option>').val(brand).text(brand));
                                    });
                                    select.append($('<option></option>').val('__custom__').text('Other (type below)'));
                                    ftgBrands = merged.slice();

                                    if (currentValue === '__custom__') {
                                        select.val('__custom__');
                                    } else if (currentValue && seen[currentValue.toLowerCase()]) {
                                        select.val(seen[currentValue.toLowerCase()]);
                                    } else if (currentValue) {
                                        select.val('__custom__');
                                        $('#ftg-custom-brand').val(currentValue);
                                    } else if (merged.length) {
                                        select.val(merged[0]);
                                    } else {
                                        select.val('__custom__');
                                    }

                                    if (currentCustom) {
                                        $('#ftg-custom-brand').val(currentCustom);
                                    }

                                    updateFtgBrandControls();
                                    select.trigger('change');
                                }

                                function fetchFtgBrands(onSuccess, onError, forceRefresh) {
                                    var url = '<?php echo rest_url('belims/v1/ftg/brands'); ?>';
                                    if (forceRefresh) {
                                        url += '?refresh=1';
                                    }
                                    $.ajax({
                                        url: url,
                                        method: 'GET',
                                        timeout: 120000, // 2 min timeout for uncached fetch
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            if (typeof onSuccess === 'function') onSuccess(response);
                                        },
                                        error: function(xhr) {
                                            if (typeof onError === 'function') onError(xhr);
                                        }
                                    });
                                }

                                function loadFtgBrands() {
                                    fetchFtgBrands(function(response) {
                                        if (response && response.success && Array.isArray(response.brands) && response.brands.length) {
                                            populateFtgBrandDropdown(response.brands);
                                        }
                                    });
                                }

                                function toCsvRow(cells) {
                                    return cells.map(function(cell) {
                                        var value = String(cell == null ? '' : cell);
                                        return '"' + value.replace(/"/g, '""') + '"';
                                    }).join(',');
                                }

                                function downloadCsv(filename, csvContent) {
                                    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    var url = window.URL.createObjectURL(blob);
                                    var link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                }

                                $('#ftg-brand-filter').on('change', updateFtgBrandControls);
                                $('#ftg-custom-brand').on('input', updateFtgBrandControls);
                                updateFtgBrandControls();
                                loadFtgBrands();

                                $('#ftg-search-brands').on('click', function() {
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    btn.prop('disabled', true).text('Searching...');
                                    status.html('<p>Searching available brands from FTG...</p>');

                                    fetchFtgBrands(function(response) {
                                        btn.prop('disabled', false).text('🔎 Search Available Brands');

                                        if (!response || !response.success || !Array.isArray(response.brands)) {
                                            status.html('<div class="notice notice-warning inline"><p>⚠️ No brands returned from FTG.</p></div>');
                                            return;
                                        }

                                        var brands = response.brands.filter(function(brand) {
                                            return (brand || '').toString().trim() !== '';
                                        });

                                        if (!brands.length) {
                                            status.html('<div class="notice notice-warning inline"><p>⚠️ No brands returned from FTG.</p></div>');
                                            return;
                                        }

                                        populateFtgBrandDropdown(brands);
                                        var html = '<div class="notice notice-success inline"><p>✅ Found ' + brands.length + ' brand(s) in FTG.</p>';
                                        var statsMap = {};
                                        if (Array.isArray(response.brand_stats)) {
                                            response.brand_stats.forEach(function(item) {
                                                var name = (item && item.brand) ? item.brand.toString() : '';
                                                if (!name) return;
                                                statsMap[name.toLowerCase()] = {
                                                    count: Number(item.count || 0),
                                                    stockZeroCount: Number(item.stock_zero_count || 0),
                                                    noPriceCount: Number(item.no_price_count || 0)
                                                };
                                            });
                                        }

                                        html += '<div style="max-height:240px; overflow:auto; margin-top:10px;">';
                                        html += '<table class="widefat striped"><thead><tr><th>Brand</th><th style="width:130px;">Product Count</th><th style="width:190px;">Stock Count = 0</th><th style="width:180px;">Products With No Price</th></tr></thead><tbody>';
                                        var totalProductCount = 0;
                                        var totalStockZeroCount = 0;
                                        var totalNoPriceCount = 0;
                                        brands.forEach(function(brand) {
                                            var stat = statsMap[brand.toLowerCase()] || {};
                                            var count = Number(stat.count || 0);
                                            var stockZeroCount = Number(stat.stockZeroCount || 0);
                                            var noPriceCount = Number(stat.noPriceCount || 0);
                                            totalProductCount += count;
                                            totalStockZeroCount += stockZeroCount;
                                            totalNoPriceCount += noPriceCount;
                                            html += '<tr><td>' + brand + '</td><td><strong>' + count + '</strong></td><td><strong>' + stockZeroCount + '</strong></td><td><strong>' + noPriceCount + '</strong></td></tr>';
                                        });
                                        var activeProductEstimate = totalProductCount - (totalStockZeroCount + totalNoPriceCount);
                                        html += '<tr><td><strong>Total</strong></td><td><strong>' + totalProductCount + '</strong></td><td><strong>' + totalStockZeroCount + '</strong></td><td><strong>' + totalNoPriceCount + '</strong></td></tr>';
                                        html += '<tr><td><strong>Total Products - (No Stock + No Price)</strong></td><td><strong>' + activeProductEstimate + '</strong></td><td>-</td><td>-</td></tr>';
                                        html += '</tbody></table></div></div>';
                                        status.html(html);
                                    }, function(xhr) {
                                        btn.prop('disabled', false).text('🔎 Search Available Brands');
                                        var errorMsg = xhr.responseJSON?.message
                                            || (xhr.status ? 'HTTP ' + xhr.status + ' — ' + (xhr.responseText || '').substring(0, 120) : 'Failed to fetch FTG brands (no response)');
                                        status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                    }, true); // true = force-refresh cache
                                });

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

                                $('#ftg-check-catalogue-count').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');

                                    if (!selectedBrand) {
                                        status.html('<div class="notice notice-error inline"><p>⚠️ Please select or enter a brand before checking count.</p></div>');
                                        return;
                                    }

                                    btn.prop('disabled', true).text('Checking...');
                                    status.html('<p>Fetching ' + selectedBrand + ' catalogue count from FTG...</p>');

                                    fetch('<?php echo rest_url('belims/v1/ftg/brand-count'); ?>?brand=' + encodeURIComponent(selectedBrand))
                                        .then(function(r) { return r.json(); })
                                        .then(function(data) {
                                            btn.prop('disabled', false).text('📊 Check Catalogue Count');
                                            if (data && data.success) {
                                                var returnedCount = Array.isArray(data.products) ? data.products.length : 0;
                                                var endpoint = data.api_url || '-';
                                                var productsHtml = '';

                                                if (returnedCount > 0) {
                                                    productsHtml += '<div style="margin-top:10px; max-height:260px; overflow:auto;">';
                                                    productsHtml += '<table class="widefat striped">';
                                                    productsHtml += '<thead><tr><th style="width:140px;">SKU</th><th>Name</th><th style="width:140px;">Brand</th><th style="width:140px;">FTG ID</th></tr></thead><tbody>';
                                                    data.products.forEach(function(product) {
                                                        var sku = (product && product.sku) ? product.sku : '';
                                                        var name = (product && product.name) ? product.name : '';
                                                        var brand = (product && product.brand) ? product.brand : '';
                                                        var ftgId = (product && product.ftg_one_id) ? product.ftg_one_id : '';
                                                        productsHtml += '<tr><td><code>' + sku + '</code></td><td>' + name + '</td><td>' + brand + '</td><td><code>' + ftgId + '</code></td></tr>';
                                                    });
                                                    productsHtml += '</tbody></table></div>';
                                                } else {
                                                    productsHtml = '<p style="margin-top:10px;">No returned products.</p>';
                                                }

                                                status.html(
                                                    '<div class="notice notice-success inline">' +
                                                        '<p>✅ ' + selectedBrand + ' products in FTG: <strong>' + (data.total_unique || 0) + '</strong> (pages fetched: ' + (data.pages_fetched || 0) + ', returned: ' + returnedCount + ')</p>' +
                                                        '<p><strong>API Endpoint:</strong> <code>' + endpoint + '</code></p>' +
                                                        '<p><strong>Returned Products:</strong></p>' +
                                                        productsHtml +
                                                    '</div>'
                                                );
                                            } else {
                                                status.html('<div class="notice notice-warning inline"><p>⚠️ Unable to fetch count: ' + (data && data.message ? data.message : 'Unknown error') + '</p></div>');
                                            }
                                        })
                                        .catch(function(err) {
                                            btn.prop('disabled', false).text('📊 Check Catalogue Count');
                                            status.html('<div class="notice notice-error inline"><p>❌ Request failed: ' + err + '</p></div>');
                                        });
                                });

                                $('#ftg-count-display-on-web').on('click', function() {
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');

                                    btn.prop('disabled', true).text('Counting...');
                                    status.html('<p>Checking FTG products with Display on web active...</p>');

                                    fetch('<?php echo rest_url('belims/v1/ftg/display-on-web-count'); ?>')
                                        .then(function(r) { return r.json(); })
                                        .then(function(data) {
                                            btn.prop('disabled', false).text('🌐 Count Display On Web Active');
                                            if (data && data.success) {
                                                status.html(
                                                    '<div class="notice notice-success inline">' +
                                                        '<p>✅ Display on web active products in FTG: <strong>' + (data.display_on_web_active_count || 0) + '</strong></p>' +
                                                        '<p>Total products scanned: <strong>' + (data.total_products || 0) + '</strong> (pages fetched: ' + (data.pages_fetched || 0) + ')</p>' +
                                                    '</div>'
                                                );
                                            } else {
                                                status.html('<div class="notice notice-warning inline"><p>⚠️ Unable to count Display on web active products: ' + (data && data.message ? data.message : 'Unknown error') + '</p></div>');
                                            }
                                        })
                                        .catch(function(err) {
                                            btn.prop('disabled', false).text('🌐 Count Display On Web Active');
                                            status.html('<div class="notice notice-error inline"><p>❌ Request failed: ' + err + '</p></div>');
                                        });
                                });

                                $('#ftg-export-brand-products').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');

                                    if (!selectedBrand) {
                                        status.html('<div class="notice notice-error inline"><p>⚠️ Please select or enter a brand before exporting.</p></div>');
                                        return;
                                    }

                                    btn.prop('disabled', true).text('Exporting...');
                                    status.html('<p>Preparing export for ' + selectedBrand + ' products...</p>');

                                    fetch('<?php echo rest_url('belims/v1/ftg/brand-count'); ?>?brand=' + encodeURIComponent(selectedBrand))
                                        .then(function(r) { return r.json(); })
                                        .then(function(data) {
                                            btn.prop('disabled', false).text('📥 Export Brand Products');

                                            if (!data || !data.success) {
                                                status.html('<div class="notice notice-warning inline"><p>⚠️ Unable to export products: ' + (data && data.message ? data.message : 'Unknown error') + '</p></div>');
                                                return;
                                            }

                                            var products = Array.isArray(data.products) ? data.products : [];
                                            if (!products.length) {
                                                status.html('<div class="notice notice-warning inline"><p>⚠️ No products found for ' + selectedBrand + '.</p></div>');
                                                return;
                                            }

                                            var rows = [];
                                            rows.push(toCsvRow(['Brand', 'Product', 'SKU']));
                                            products.forEach(function(product) {
                                                rows.push(toCsvRow([
                                                    product.brand || selectedBrand,
                                                    product.name || '',
                                                    product.sku || ''
                                                ]));
                                            });

                                            var safeBrand = selectedBrand.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'brand';
                                            var datePart = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
                                            var fileName = 'ftg-products-' + safeBrand + '-' + datePart + '.csv';
                                            downloadCsv(fileName, rows.join('\n'));

                                            status.html('<div class="notice notice-success inline"><p>✅ Export complete for ' + selectedBrand + '. Exported <strong>' + products.length + '</strong> products.</p></div>');
                                        })
                                        .catch(function(err) {
                                            btn.prop('disabled', false).text('📥 Export Brand Products');
                                            status.html('<div class="notice notice-error inline"><p>❌ Export failed: ' + err + '</p></div>');
                                        });
                                });

                                $('#ftg-test-sync').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    if (!selectedBrand) {
                                        $('#ftg-sync-status').html('<div class="notice notice-error inline"><p>⚠️ Please select or enter a brand before syncing.</p></div>');
                                        return;
                                    }

                                    if (!confirm('Test sync first 10 ' + selectedBrand + ' products from FTG?')) return;

                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');

                                    btn.prop('disabled', true).text('Testing...');
                                    status.html('<p>⏳ Syncing first 10 ' + selectedBrand + ' products from FTG...</p><div class="ftg-progress-bar"><div class="ftg-progress-fill" style="width: 0%">0%</div></div><p class="ftg-progress-text">Starting sync...</p>');

                                    // Track totals across all batches
                                    var totalSynced = 0;
                                    var totalSkipped = 0;
                                    var totalErrors = [];
                                    var allSyncedItems = [];
                                    var allSkippedItems = [];

                                    function syncBatch(offset) {
                                        var limit = 10;
                                        var batchSize = 10; // Test sync only first 10 products
                                        var payload = {
                                            collection_token: '<?php echo esc_js($ftg_token); ?>',
                                            brand: selectedBrand,
                                            limit: limit,
                                            offset: offset,
                                            batch_size: batchSize
                                        };

                                        $.ajax({
                                            url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                                            method: 'POST',
                                            data: JSON.stringify(payload),
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
                                                        btn.prop('disabled', false).text('✅ Test Sync');
                                                        updateFtgBrandControls();
                                                        $('.ftg-progress-fill').css('width', '100%').text('100%');
                                                        $('.ftg-progress-text').html('Sync complete!');

                                                        var skippedMsg = totalSkipped > 0 ? '<br/><span style="color: #856404;">⚠️ Skipped ' + totalSkipped + ' products (no price/invalid data)</span>' : '';
                                                        var errorMsg = totalErrors.length > 0 ? '<br/><span style="color: #dc3232;">❌ ' + totalErrors.length + ' errors occurred</span>' : '';
                                                        var summaryHtml = '<div class="notice notice-success inline"><p>✅ Test sync completed (first 10 products). ' + totalSynced + ' ' + selectedBrand + ' products synced.' + skippedMsg + errorMsg + '<br/>Check WooCommerce → Products to see the imported items.</p></div>';

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
                                                    btn.prop('disabled', false).text('✅ Test Sync');
                                                    updateFtgBrandControls();
                                                    var message = response.message || 'Unknown error';
                                                    status.html('<div class="notice notice-warning inline"><p>⚠️ ' + message + '</p></div>');
                                                }
                                            },
                                            error: function(xhr) {
                                                btn.prop('disabled', false).text('✅ Test Sync');
                                                updateFtgBrandControls();
                                                var errorMsg = xhr.responseJSON?.message || 'Sync failed';
                                                status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                            }
                                        });
                                    }

                                    // Start with offset 0
                                    syncBatch(0);
                                });

                                $('#ftg-sync-products').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    if (!selectedBrand) {
                                        $('#ftg-sync-status').html('<div class="notice notice-error inline"><p>⚠️ Please select or enter a brand before syncing.</p></div>');
                                        return;
                                    }

                                    if (!confirm('Start ' + selectedBrand + ' catalogue sync from FTG? This may take several minutes.')) return;

                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    var startTime = Date.now();
                                    var totalSynced = 0;
                                    var totalSkipped = 0;
                                    var totalErrors = [];

                                    btn.prop('disabled', true).text('Syncing...');
                                    status.html('<p>⏳ Starting ' + selectedBrand + ' catalogue sync from FTG...</p><div class="ftg-progress-bar"><div class="ftg-progress-fill" style="width: 0%">0%</div></div><p class="ftg-progress-text">Fetching products...</p>');

                                    function syncFullBatch(offset) {
                                        var payload = {
                                            collection_token: '<?php echo esc_js($ftg_token); ?>',
                                            brand: selectedBrand,
                                            offset: offset,
                                            batch_size: 50
                                            // no limit — sync all products for the brand
                                        };

                                        $.ajax({
                                            url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                                            method: 'POST',
                                            data: JSON.stringify(payload),
                                            contentType: 'application/json',
                                            timeout: 180000,
                                            beforeSend: function(xhr) {
                                                xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                            },
                                            success: function(response) {
                                                if (response.success) {
                                                    totalSynced  += response.synced  || 0;
                                                    totalSkipped += response.skipped || 0;
                                                    if (response.errors && response.errors.length) {
                                                        totalErrors = totalErrors.concat(response.errors);
                                                    }

                                                    var progress = response.progress || 0;
                                                    $('.ftg-progress-fill').css('width', progress + '%').text(progress + '%');
                                                    $('.ftg-progress-text').html('Syncing... ' + totalSynced + ' products synced so far');

                                                    if (response.has_more) {
                                                        syncFullBatch(response.next_offset);
                                                    } else {
                                                        btn.prop('disabled', false).text('🔄 SYNC CATALOGUE');
                                                        updateFtgBrandControls();
                                                        $('.ftg-progress-fill').css('width', '100%').text('100%');

                                                        var totalTime  = Math.round((Date.now() - startTime) / 1000);
                                                        var skippedMsg = totalSkipped > 0 ? ' (' + totalSkipped + ' skipped)' : '';
                                                        var errorMsg   = totalErrors.length > 0 ? '<br/><span style="color:#dc3232;">⚠️ ' + totalErrors.length + ' errors. Check error log.</span>' : '';

                                                        status.html('<div class="notice notice-success inline"><p>✅ ' + selectedBrand + ' catalogue sync completed in ' + totalTime + 's!<br/>' + totalSynced + ' products synced' + skippedMsg + errorMsg + '</p></div>');
                                                        setTimeout(function() { location.reload(); }, 2000);
                                                    }
                                                } else {
                                                    btn.prop('disabled', false).text('🔄 SYNC CATALOGUE');
                                                    updateFtgBrandControls();
                                                    var errors = (response.errors && response.errors.length) ? response.errors.join(', ') : (response.message || 'Unknown error');
                                                    status.html('<div class="notice notice-error inline"><p>⚠️ Sync failed: ' + errors + '</p></div>');
                                                }
                                            },
                                            error: function(xhr) {
                                                btn.prop('disabled', false).text('🔄 SYNC CATALOGUE');
                                                updateFtgBrandControls();
                                                var errorMsg = xhr.responseJSON?.message || 'Sync failed';
                                                status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                            }
                                        });
                                    }

                                    syncFullBatch(0);
                                });

                                // Sync ALL brands sequentially
                                $('#ftg-sync-all-products').on('click', function() {
                                    var dryRun = $('#ftg-sync-all-dry-run').is(':checked');
                                    var confirmMessage = dryRun
                                        ? 'Run DRY RUN for ALL brands from FTG? This will fetch counts only and will not write any products.'
                                        : 'Sync ALL brands from FTG? This will sync every brand and every product. This may take a long time.';
                                    if (!confirm(confirmMessage)) return;

                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    var dryRunToggle = $('#ftg-sync-all-dry-run');

                                    // Use the cached brand list if available, otherwise fetch fresh
                                    var brandsToSync = Array.isArray(ftgBrands) && ftgBrands.length
                                        ? ftgBrands.slice()
                                        : null;

                                    if (!brandsToSync || !brandsToSync.length) {
                                        status.html('<p>⏳ Fetching brand list from FTG...</p>');
                                        fetchFtgBrands(function(response) {
                                            if (response && response.success && Array.isArray(response.brands) && response.brands.length) {
                                                startSyncAllBrands(response.brands.filter(function(b) { return (b || '').trim() !== ''; }));
                                            } else {
                                                status.html('<div class="notice notice-error inline"><p>❌ Could not load brand list from FTG. Search Available Brands first.</p></div>');
                                            }
                                        }, function(xhr) {
                                            status.html('<div class="notice notice-error inline"><p>❌ Failed to load brands: ' + (xhr.responseJSON?.message || 'error') + '</p></div>');
                                        });
                                        return;
                                    }

                                    startSyncAllBrands(brandsToSync);

                                    function startSyncAllBrands(brands) {
                                        btn.prop('disabled', true).text(dryRun ? 'Dry run in progress...' : 'Syncing all brands...');
                                        dryRunToggle.prop('disabled', true);

                                        var totalBrands     = brands.length;
                                        var brandIndex      = 0;
                                        var grandTotalSynced  = 0;
                                        var grandTotalSkipped = 0;
                                        var grandTotalAvailable = 0;
                                        var grandTotalErrors  = [];
                                        var startTime       = Date.now();
                                        var brandResults    = [];

                                        function renderOverallProgress() {
                                            var pct = totalBrands > 0 ? Math.round((brandIndex / totalBrands) * 100) : 0;
                                            var currentBrand = brandIndex < totalBrands ? brands[brandIndex] : 'Done';
                                            var progressText = dryRun
                                                ? grandTotalAvailable + ' products counted so far across ' + brandIndex + ' brands (dry run)'
                                                : grandTotalSynced + ' products synced so far across ' + brandIndex + ' brands';
                                            status.html(
                                                '<p>⏳ Syncing all brands: <strong>' + brandIndex + ' / ' + totalBrands + '</strong> complete — current: <em>' + currentBrand + '</em></p>' +
                                                '<div class="ftg-progress-bar"><div class="ftg-progress-fill" style="width:' + pct + '%">' + pct + '%</div></div>' +
                                                '<p class="ftg-progress-text">' + progressText + '</p>'
                                            );
                                        }

                                        function syncNextBrand() {
                                            if (brandIndex >= totalBrands) {
                                                // All brands done
                                                btn.prop('disabled', false).text('⚡ SYNC ALL BRANDS');
                                                dryRunToggle.prop('disabled', false);
                                                updateFtgBrandControls();
                                                var totalTime  = Math.round((Date.now() - startTime) / 1000);
                                                var skippedMsg = grandTotalSkipped > 0 ? ' (' + grandTotalSkipped + ' skipped)' : '';
                                                var errMsg     = grandTotalErrors.length > 0 ? '<br/><span style="color:#dc3232;">⚠️ ' + grandTotalErrors.length + ' errors across all brands.</span>' : '';
                                                var resultsHtml = brandResults.map(function(r) {
                                                    if (dryRun) {
                                                        return '<li><strong>' + r.brand + '</strong>: ' + (r.counted || 0) + ' products counted' + (r.errors ? ' (' + r.errors + ' errors)' : '') + '</li>';
                                                    }
                                                    return '<li><strong>' + r.brand + '</strong>: ' + r.synced + ' synced, ' + r.skipped + ' skipped' + (r.errors ? ' (' + r.errors + ' errors)' : '') + '</li>';
                                                }).join('');
                                                var headline = dryRun
                                                    ? '✅ Dry run complete in ' + totalTime + 's! ' + grandTotalAvailable + ' total products counted (no writes).'
                                                    : '✅ All brands synced in ' + totalTime + 's! ' + grandTotalSynced + ' total products synced' + skippedMsg + errMsg;
                                                status.html(
                                                    '<div class="notice notice-success inline">' +
                                                    '<p>' + headline + (dryRun ? errMsg : '') + '</p>' +
                                                    '<ul style="margin:8px 0 0 20px;">' + resultsHtml + '</ul>' +
                                                    '</div>'
                                                );
                                                if (!dryRun) {
                                                    setTimeout(function() { location.reload(); }, 3000);
                                                }
                                                return;
                                            }

                                            var brand = brands[brandIndex];
                                            var brandSynced  = 0;
                                            var brandSkipped = 0;
                                            var brandCounted = 0;
                                            var brandErrors  = [];

                                            renderOverallProgress();

                                            if (dryRun) {
                                                $.ajax({
                                                    url: '<?php echo rest_url('belims/v1/ftg/brand-count'); ?>?summary_only=1&brand=' + encodeURIComponent(brand),
                                                    method: 'GET',
                                                    timeout: 180000,
                                                    beforeSend: function(xhr) {
                                                        xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                                    },
                                                    success: function(response) {
                                                        if (response && response.success) {
                                                            brandCounted = Number(response.total_unique || 0);
                                                            grandTotalAvailable += brandCounted;
                                                            brandResults.push({ brand: brand, counted: brandCounted, skipped: 0, errors: 0 });
                                                        } else {
                                                            var errMsg = (response && response.message) ? response.message : 'Unknown error';
                                                            grandTotalErrors.push(brand + ': ' + errMsg);
                                                            brandResults.push({ brand: brand, counted: 0, skipped: 0, errors: 1 });
                                                        }
                                                        brandIndex++;
                                                        syncNextBrand();
                                                    },
                                                    error: function(xhr) {
                                                        var errMsg = xhr.responseJSON?.message || 'Request failed';
                                                        grandTotalErrors.push(brand + ': ' + errMsg);
                                                        brandResults.push({ brand: brand, counted: 0, skipped: 0, errors: 1 });
                                                        brandIndex++;
                                                        syncNextBrand();
                                                    }
                                                });
                                                return;
                                            }

                                            function syncBrandBatch(offset) {
                                                $.ajax({
                                                    url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                                                    method: 'POST',
                                                    data: JSON.stringify({
                                                        collection_token: '<?php echo esc_js($ftg_token); ?>',
                                                        brand: brand,
                                                        limit: null,
                                                        offset: offset,
                                                        batch_size: 50
                                                    }),
                                                    contentType: 'application/json',
                                                    timeout: 180000,
                                                    beforeSend: function(xhr) {
                                                        xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                                    },
                                                    success: function(response) {
                                                        if (response.success) {
                                                            brandSynced  += response.synced  || 0;
                                                            brandSkipped += response.skipped || 0;
                                                            if (response.errors && response.errors.length) {
                                                                brandErrors = brandErrors.concat(response.errors);
                                                            }

                                                            if (response.has_more) {
                                                                syncBrandBatch(response.next_offset);
                                                            } else {
                                                                // Brand complete — move to next
                                                                grandTotalSynced  += brandSynced;
                                                                grandTotalSkipped += brandSkipped;
                                                                grandTotalErrors   = grandTotalErrors.concat(brandErrors);
                                                                brandResults.push({ brand: brand, synced: brandSynced, skipped: brandSkipped, errors: brandErrors.length });
                                                                brandIndex++;
                                                                syncNextBrand();
                                                            }
                                                        } else {
                                                            // Non-fatal: log error and move to next brand
                                                            var errMsg = (response.errors && response.errors.length) ? response.errors.join(', ') : (response.message || 'Unknown error');
                                                            grandTotalErrors.push(brand + ': ' + errMsg);
                                                            brandResults.push({ brand: brand, synced: brandSynced, skipped: brandSkipped, errors: 1 });
                                                            brandIndex++;
                                                            syncNextBrand();
                                                        }
                                                    },
                                                    error: function(xhr) {
                                                        // Non-fatal: log error and move to next brand
                                                        var errMsg = xhr.responseJSON?.message || 'Request failed';
                                                        grandTotalErrors.push(brand + ': ' + errMsg);
                                                        brandResults.push({ brand: brand, synced: brandSynced, skipped: brandSkipped, errors: 1 });
                                                        brandIndex++;
                                                        syncNextBrand();
                                                    }
                                                });
                                            }

                                            syncBrandBatch(0);
                                        }

                                        syncNextBrand();
                                    }
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
                                            btn.prop('disabled', false).text('✅ Sync Single Product');

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
                                            btn.prop('disabled', false).text('✅ Sync Single Product');
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
                            var testOrigin = prompt("Enter a frontend URL to simulate a request from:", "https://www.belims.co.za");

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

                        <div class="ftg-field-row">
                            <div class="ftg-field-label">
                                <label for="bobgo-enabled-toggle">Enable Shipping</label>
                                <p class="ftg-field-desc">Enable shipping integration with BobGo</p>
                            </div>
                            <div class="ftg-field-control">
                                <label class="bpc-switch">
                                    <input type="checkbox" name="bobgo_enabled" value="1" <?php checked(1, $bobgo_enabled); ?> id="bobgo-enabled-toggle" />
                                    <span class="bpc-slider"></span>
                                </label>
                            </div>
                        </div>

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
function global_site_settings_activate() {
	flush_rewrite_rules();
	if (!wp_next_scheduled('bpc_daily_speed_test')) {
		wp_schedule_event(time(), 'daily', 'bpc_daily_speed_test');
	}
}
register_activation_hook(__FILE__, 'global_site_settings_activate');

function global_site_settings_deactivate() {
	flush_rewrite_rules();
	$timestamp = wp_next_scheduled('bpc_daily_speed_test');
	if ($timestamp) {
		wp_unschedule_event($timestamp, 'bpc_daily_speed_test');
	}
	$ftg_ts = wp_next_scheduled('belims_ftg_auto_sync');
	if ($ftg_ts) {
		wp_unschedule_event($ftg_ts, 'belims_ftg_auto_sync');
	}
}
register_deactivation_hook(__FILE__, 'global_site_settings_deactivate');

// =============================================================================
// FTG LAST SYNC HELPER + AUTO-SYNC CRON
// =============================================================================

/**
 * Normalize belims_ftg_last_sync — may be a Unix timestamp or an array
 * written by class-ftg-sync-endpoint.php (['time' => mysql_datetime, ...]).
 */
function belims_get_ftg_last_sync_timestamp() {
    $raw = get_option('belims_ftg_last_sync');
    if (is_array($raw) && !empty($raw['time'])) {
        $ts = strtotime($raw['time']);
        return $ts ?: 0;
    }
    if (is_numeric($raw) && (int) $raw > 0) {
        return (int) $raw;
    }
    return 0;
}

/** Schedule/reschedule the FTG auto-sync WP-Cron event. */
function belims_schedule_ftg_cron($frequency = null) {
    if (null === $frequency) {
        $frequency = get_option('belims_ftg_cron_frequency', 'disabled');
    }
    $existing = wp_next_scheduled('belims_ftg_auto_sync');
    if ($existing) {
        wp_unschedule_event($existing, 'belims_ftg_auto_sync');
    }
    if ('disabled' !== $frequency) {
        wp_schedule_event(time(), $frequency, 'belims_ftg_auto_sync');
    }
}

/** Cron callback — runs FTG sync via the REST endpoint. */
add_action('belims_ftg_auto_sync', 'belims_run_ftg_cron_sync');
function belims_run_ftg_cron_sync() {
    $ftg_enabled = function_exists('get_field') ? get_field('ftg_enabled', 'option') : false;
    if (!$ftg_enabled) return;
    $token = function_exists('get_field') ? get_field('ftg_collection_token', 'option') : '';
    if (empty($token)) return;

    $response = wp_remote_post(rest_url('belims/v1/ftg/sync'), array(
        'body'    => wp_json_encode(array('collection_token' => $token, 'batch_size' => 50)),
        'headers' => array('Content-Type' => 'application/json', 'X-WP-Nonce' => wp_create_nonce('wp_rest')),
        'timeout' => 300,
        'blocking' => true,
    ));

    if (!is_wp_error($response)) {
        update_option('belims_ftg_last_sync', time());
    }
}

/** AJAX: save cron frequency and reschedule. */
add_action('wp_ajax_belims_save_ftg_cron_frequency', function() {
    check_ajax_referer('belims_ftg_cron_nonce', 'nonce');
    if (!current_user_can('manage_options')) { wp_send_json_error('Unauthorized'); return; }

    $allowed    = array('hourly', 'twicedaily', 'daily', 'weekly', 'disabled');
    $frequency  = sanitize_text_field($_POST['frequency'] ?? 'disabled');
    if (!in_array($frequency, $allowed, true)) $frequency = 'daily';

    update_option('belims_ftg_cron_frequency', $frequency);
    belims_schedule_ftg_cron($frequency);

    $next = wp_next_scheduled('belims_ftg_auto_sync');
    wp_send_json_success(array(
        'next_run' => $next ? date_i18n('F j, Y, g:i a', $next) : 'Not scheduled',
    ));
});

/** AJAX: run FTG cron sync immediately. */
add_action('wp_ajax_belims_run_ftg_cron_now', function() {
    check_ajax_referer('belims_ftg_cron_nonce', 'nonce');
    if (!current_user_can('manage_options')) { wp_send_json_error('Unauthorized'); return; }

    do_action('belims_ftg_auto_sync');

    $ts = belims_get_ftg_last_sync_timestamp();
    wp_send_json_success(array(
        'last_sync' => $ts > 0 ? date_i18n('F j, Y, g:i a', $ts) : 'Just now',
    ));
});

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
