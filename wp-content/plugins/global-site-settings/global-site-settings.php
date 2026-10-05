<?php
/**
 * Plugin Name: Global Site Settings
 * Plugin URI: https://belims.co.za
 * Description: Unified plugin for Belims site settings, ACF field groups, REST API endpoints, and third-party integrations (WooCommerce, FTG, BobGo, AI).
 * Version: 2.10.9
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: global-site-settings
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) exit;

define('GLOBAL_SITE_SETTINGS_VERSION', '2.10.9');
// Stand-in shown in the FTG edit form instead of the stored password; posting it keeps the stored one.
define('BELIMS_FTG_PASSWORD_MASK', '••••••••••••');
define('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP', '2026-10-01 19:29:07');
define('GLOBAL_SITE_SETTINGS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GLOBAL_SITE_SETTINGS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Hosting environment of this CMS: WP_ENVIRONMENT_TYPE in wp-config.php (per server, so a database clone
 * or push never carries it). Unset = 'production'. Staging: define('WP_ENVIRONMENT_TYPE', 'staging').
 */
function belims_environment() {
    return function_exists('wp_get_environment_type') ? wp_get_environment_type() : 'production';
}

function belims_is_production() {
    return belims_environment() === 'production';
}

define('BELIMS_PRODUCTION_STOREFRONT_HOSTS', array('www.belims.co.za', 'belims.co.za'));
define('BELIMS_PREVIEW_STOREFRONT', 'https://belims.vercel.app');

function belims_is_production_storefront($url) {
    return in_array(strtolower((string) parse_url((string) $url, PHP_URL_HOST)), BELIMS_PRODUCTION_STOREFRONT_HOSTS, true);
}

/**
 * Integration status shared by Site Settings → Overview and the WordPress Dashboard panel.
 * active = switched on and configured; state: good | info | off (badge) or action (needs setup → Configure).
 */
function belims_integration_statuses() {
    $acf           = function_exists('get_field');
    $ftg_enabled   = $acf && get_field('ftg_enabled', 'option');
    $ftg_token     = $acf && get_field('ftg_collection_token', 'option');
    $ftg_status    = (array) get_option('belims_ftg_connection_status', array());
    $bobgo_enabled = $acf && get_field('bobgo_enabled', 'option');
    $bobgo_token   = (string) get_option('bobgo_api_token', '') !== '';
    $bobgo_env     = get_option('bobgo_environment', 'production') === 'sandbox' ? 'Sandbox' : 'Production';
    $firebase      = defined('BELIMS_FIREBASE_API_KEY') && BELIMS_FIREBASE_API_KEY !== ''
                  && defined('JWT_AUTH_SECRET_KEY') && JWT_AUTH_SECRET_KEY !== '';
    $ai            = $acf && get_field('gemini_api_key', 'option');

    $ftg_connected = $ftg_enabled && $ftg_token && !empty($ftg_status['ok']);

    return array(
        'ftg-sync'       => array('label' => 'FTG Sync',       'description' => 'Supplier catalogue connection',  'active' => $ftg_connected,        'state' => $ftg_connected ? 'good' : 'action', 'status' => $ftg_connected ? 'Connected' : 'Not connected'),
        'bobgo-shipping' => array('label' => 'BobGo Shipping', 'description' => 'Shipping rates and tracking',    'active' => (bool) $bobgo_enabled, 'state' => $bobgo_enabled ? 'good' : 'off',    'status' => $bobgo_enabled ? 'Enabled · ' . $bobgo_env : 'Disabled'),
        'firebase-auth'  => array('label' => 'Firebase Auth',  'description' => 'Phone OTP and Google sign-in',   'active' => $firebase,             'state' => $firebase ? 'good' : 'action',      'status' => $firebase ? 'Configured' : 'Setup'),
        'ai-services'    => array('label' => 'AI Services',    'description' => 'Product description assistance', 'active' => (bool) $ai,           'state' => $ai ? 'good' : 'action',            'status' => $ai ? 'Configured' : 'Setup'),
    );
}

/** Status badge for an integration; states that need attention link to its Site Settings tab. */
function belims_integration_badge($tab, $integration, $base_url = '') {
    $label = esc_html($integration['status']);
    if ($integration['state'] === 'action') {
        return '<a class="badge warn" href="' . esc_url($base_url . '#tab-' . $tab) . '">' . $label . '</a>';
    }
    return '<span class="badge ' . ($integration['state'] === 'good' ? 'good' : '') . '">' . $label . '</span>';
}

/**
 * Settings Card: title, description, toggle, and a footer Save that stays disabled until the toggle differs
 * from the saved value (deferred save, admin.js → AJAX belims_save_setting). Optional confirm dialog when switching off.
 */
function belims_settings_card($card) {
    $toggle_id = $card['id'] . '-toggle';
    $confirm   = $card['confirm_off'] ?? null;
    ?>
    <div class="settings-card" id="<?php echo esc_attr($card['id']); ?>" data-settings-card data-setting="<?php echo esc_attr($card['setting']); ?>" data-saved="<?php echo $card['checked'] ? '1' : '0'; ?>"<?php if ($confirm) : ?> data-confirm-off-title="<?php echo esc_attr($confirm[0]); ?>" data-confirm-off-text="<?php echo esc_attr($confirm[1]); ?>" data-confirm-off-label="<?php echo esc_attr($confirm[2]); ?>"<?php endif; ?>>
        <div class="settings-card-body">
            <h3><?php echo esc_html($card['title']); ?></h3>
            <p class="description"><?php echo esc_html($card['description']); ?></p>
            <div class="toggle-line">
                <input type="checkbox" class="toggle" id="<?php echo esc_attr($toggle_id); ?>" data-settings-toggle <?php checked($card['checked']); ?> />
                <label for="<?php echo esc_attr($toggle_id); ?>"><?php echo esc_html($card['label']); ?></label>
            </div>
        </div>
        <div class="settings-card-footer">
            <p class="description"><?php echo esc_html($card['help']); ?></p>
            <button type="button" class="button button-primary" data-settings-save disabled>Save</button>
        </div>
    </div>
    <?php
}


/** Outside production, a production storefront URL (e.g. cloned settings) falls back to the preview storefront. */
function belims_guard_storefront_url($url) {
    return (!belims_is_production() && belims_is_production_storefront($url)) ? BELIMS_PREVIEW_STOREFRONT : $url;
}

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
        return belims_guard_storefront_url(rtrim($acf_url, '/'));
    }

    return 'https://belims.vercel.app';
}

function get_frontend_url() {
    $acf_url = function_exists('get_field') ? get_field('headless_frontend_url', 'option') : '';
    if ($acf_url) {
        return belims_guard_storefront_url(rtrim($acf_url, '/'));
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
 * Storefronts allowed to call the CMS (CORS) and to receive customers back from PayFast.
 * Production, preview and local dev all work at the same time — no switching needed.
 */
function get_cors_origins() {
    $origins = array(
        'https://www.belims.co.za',
        'https://belims.vercel.app',
        'http://localhost:3000',
        get_cors_origin(),
        get_frontend_url(),
    );
    $origins = array_map(function ($origin) {
        return rtrim((string) $origin, '/');
    }, $origins);
    // Staging / local CMS never serves (or sends PayFast customers back to) the production storefront.
    if (!belims_is_production()) {
        $origins = array_filter($origins, function ($origin) {
            return !belims_is_production_storefront($origin);
        });
    }

    return apply_filters('belims_cors_origins', array_values(array_unique(array_filter($origins))));
}

function belims_is_allowed_origin($origin) {
    return in_array(rtrim((string) $origin, '/'), get_cors_origins(), true);
}

/** CORS origin for this request: the caller's Origin when allowed, else the default. */
function belims_request_cors_origin() {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? rtrim(esc_url_raw(wp_unslash($_SERVER['HTTP_ORIGIN'])), '/') : '';
    return belims_is_allowed_origin($origin) ? $origin : get_cors_origin();
}

/** Storefront an order was placed on (saved at checkout), falling back to the default frontend URL. */
function belims_order_frontend_url($order) {
    $origin = $order ? (string) $order->get_meta('_belims_frontend_origin') : '';
    return ($origin !== '' && belims_is_allowed_origin($origin)) ? $origin : get_frontend_url();
}

/**
 * Handle OPTIONS preflight requests FIRST (before WordPress does anything)
 */
add_action('init', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: ' . belims_request_cors_origin());
        header('Vary: Origin');
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
    header('Access-Control-Allow-Origin: ' . belims_request_cors_origin());
    header('Vary: Origin', false);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-WP-Nonce');
    header('Access-Control-Allow-Credentials: true');

    return $served;
}, 10, 4);

// Core's rest_send_cors_headers echoes any Origin and would override the allowlist above.
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
}, 15);

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
        'includes/class-media-folders.php', // Media Library folders (media_folder taxonomy)
        'includes/class-image-optimizer.php', // WebP conversion queue, auto-convert, archive, Products folder
        'includes/class-homepage.php', // GET /homepage + storefront deploy hook
        // FTG Sync integration
        'includes/ftg-sync/class-ftg-api.php',
        'includes/ftg-sync/class-ftg-sync-endpoint.php',
        // BobGo Shipping integration
        'includes/bobgo-shipping/init.php', // Clean REST endpoint leveraging the Bob Go Smart Shipping plugin
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
 * Site Settings save feedback: one message per user, shown as a toast on the next
 * render of the Site Settings page, which also reopens the tab that was saved.
 *
 * @param string $type    success | error | warning | info
 * @param string $message Plain text.
 * @param string $tab     Tab id (e.g. "branding") to open after the reload.
 */
function belims_settings_flash($type, $message, $tab = '') {
    set_transient('belims_settings_flash_' . get_current_user_id(), array(
        'type'    => $type,
        'message' => $message,
        'tab'     => $tab,
    ), 5 * MINUTE_IN_SECONDS);
}

/**
 * Checks capability + nonce for a Site Settings POST form. On failure flashes an error and returns false.
 */
function belims_settings_verify_post($action, $nonce_field, $tab) {
    $nonce = isset($_POST[$nonce_field]) ? sanitize_text_field(wp_unslash($_POST[$nonce_field])) : '';
    if (current_user_can('manage_options') && wp_verify_nonce($nonce, $action)) {
        return true;
    }
    belims_settings_flash('error', 'Not saved — your session expired or you are not allowed to change this. Reload the page and try again.', $tab);
    return false;
}

/** Tab id posted by the Site Settings form (added by admin.js on submit). */
function belims_settings_posted_tab() {
    return isset($_POST['bpc_tab']) ? sanitize_key(wp_unslash($_POST['bpc_tab'])) : '';
}

/**
 * Prints the pending flash for admin.js (window.bpcSettingsFlash) and clears it.
 * Runs on admin_footer, after the page's own save handlers, before footer scripts print.
 */
function belims_settings_print_flash() {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== 'toplevel_page_belims-site-settings') {
        return;
    }

    $key   = 'belims_settings_flash_' . get_current_user_id();
    $flash = get_transient($key);
    if (!$flash) {
        return;
    }
    delete_transient($key);
    wp_add_inline_script('global-site-settings-admin', 'window.bpcSettingsFlash = ' . wp_json_encode($flash) . ';', 'before');
}
add_action('admin_footer', 'belims_settings_print_flash');

/**
 * Enable ACF form on admin pages
 */
function global_site_settings_acf_form_head() {
    if (isset($_GET['page']) && $_GET['page'] === 'belims-site-settings') {
        if (isset($_POST['_acf_form'])) {
            $nonce = isset($_POST['_acf_nonce']) ? sanitize_text_field(wp_unslash($_POST['_acf_nonce'])) : '';
            if (!current_user_can('manage_options') || !wp_verify_nonce($nonce, 'acf_form')) {
                belims_settings_flash('error', 'Not saved — your session expired or you are not allowed to change this. Reload the page and try again.', belims_settings_posted_tab());
                return;
            }
        }
        acf_form_head();
    }
}
add_action('admin_init', 'global_site_settings_acf_form_head');

/**
 * Flash "<Form> saved." after an ACF options form on the Site Settings page saves.
 */
function belims_settings_flash_acf_save($post_id) {
    if ($post_id !== 'options' || !isset($_POST['_acf_form']) || ($_GET['page'] ?? '') !== 'belims-site-settings') {
        return;
    }

    $labels = array(
        'branding'      => 'Branding settings',
        'cors-security' => 'CORS settings',
        'ai-services'   => 'AI settings',
        'homepage'      => 'Homepage',
    );
    $tab = belims_settings_posted_tab();
    belims_settings_flash('success', ($labels[$tab] ?? 'Settings') . ' saved.', $tab);
}
add_action('acf/save_post', 'belims_settings_flash_acf_save', 20);

/**
 * BobGo environment form posts to options.php (Settings API), which redirects back without a tab.
 * Flash the result before core saves; core dies on a bad nonce, so the error shows on the next visit.
 */
function belims_settings_flash_bobgo_options() {
    if (($_POST['option_page'] ?? '') !== 'global_site_settings_bobgo') {
        return;
    }
    if (belims_settings_verify_post('global_site_settings_bobgo-options', '_wpnonce', 'bobgo-shipping')) {
        belims_settings_flash('success', 'BobGo environment saved.', 'bobgo-shipping');
    }
}
add_action('load-options.php', 'belims_settings_flash_bobgo_options');

/**
 * AJAX handler — record FTG connection test result (option `belims_ftg_connection_status`).
 */
add_action('wp_ajax_belims_save_ftg_connection_status', function() {
    check_ajax_referer('belims_ftg_connection', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');
    update_option('belims_ftg_connection_status', array(
        'ok'      => !empty($_POST['ok']),
        'time'    => time(),
        'message' => sanitize_text_field($_POST['message'] ?? ''),
    ), false);
    wp_send_json_success();
});

/**
 * AJAX handler — save a Settings Card toggle. Only the ACF option fields listed here can be changed.
 */
add_action('wp_ajax_belims_save_setting', function() {
    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => 'You do not have permission to change this setting.'), 403);
    }
    if (!check_ajax_referer('belims_save_setting', 'nonce', false)) {
        wp_send_json_error(array('message' => 'Your session expired. Reload the page and try again.'), 403);
    }
    $settings = array(
        'ftg_enabled' => 'FTG integration',
    );
    $setting = sanitize_key($_POST['setting'] ?? '');
    if (!isset($settings[$setting])) {
        wp_send_json_error(array('message' => 'Unknown setting.'), 400);
    }
    $on = !empty($_POST['value']);
    update_field($setting, $on ? 1 : 0, 'option');
    wp_send_json_success(array('value' => $on, 'message' => $settings[$setting] . ($on ? ' enabled.' : ' disabled.')));
});

/**
 * AJAX handler — save FTG credentials from the FTG tab form (nonce = the form's ftg_nonce field).
 * The form shows BELIMS_FTG_PASSWORD_MASK instead of the stored password; posting it keeps the stored one.
 */
add_action('wp_ajax_belims_save_ftg_credentials', function() {
    if (!current_user_can('manage_options')) {
        wp_send_json_error(array('message' => 'You do not have permission to change FTG settings.'), 403);
    }
    if (!check_ajax_referer('save_ftg_credentials_action', 'ftg_nonce', false)) {
        wp_send_json_error(array('message' => 'Your session expired. Reload the page and try again.'), 403);
    }

    $email    = sanitize_email(wp_unslash($_POST['ftg_email'] ?? ''));
    $password = (string) wp_unslash($_POST['ftg_password'] ?? '');
    $token    = sanitize_text_field(wp_unslash($_POST['ftg_collection_token'] ?? ''));

    if (!is_email($email)) {
        wp_send_json_error(array('message' => 'Enter a valid FTG email.'), 400);
    }
    if ($token === '') {
        wp_send_json_error(array('message' => 'Click Get Token before saving.'), 400);
    }
    $keep_password = ($password === '' || $password === BELIMS_FTG_PASSWORD_MASK);
    if ($keep_password && (string) get_field('ftg_password', 'option') === '') {
        wp_send_json_error(array('message' => 'Enter the FTG password.'), 400);
    }

    update_field('ftg_email', $email, 'option');
    if (!$keep_password) {
        update_field('ftg_password', $password, 'option');
    }
    update_field('ftg_collection_token', $token, 'option');

    // Set by the form after a successful Get Token for these credentials.
    if (!empty($_POST['ftg_token_verified'])) {
        update_option('belims_ftg_connection_status', array(
            'ok'      => true,
            'time'    => time(),
            'message' => 'Verified by Get Token',
        ), false);
    }
    $status = get_option('belims_ftg_connection_status', array());

    wp_send_json_success(array(
        'message'      => 'FTG credentials saved.',
        'email'        => $email,
        'token'        => $token,
        'token_prefix' => substr($token, 0, 8),
        'connected'    => !empty($status['ok']),
    ));
});

/**
 * AJAX handler — reset admin branding colors to WP defaults.
 */
add_action('wp_ajax_belims_reset_branding_colors', function() {
    check_ajax_referer('belims_reset_branding', 'nonce');
    if (!current_user_can('manage_options')) wp_send_json_error('Unauthorized');
    update_field('admin_dashboard_colors', null, 'option');
    wp_send_json_success('Colors reset to WordPress defaults.');
});

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
    delete_option('belims_ftg_connection_status');
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
    // Site Settings styling is intentionally provided by the shared base design system only.
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
// Custom admin colour output is disabled while the Site Settings scaffold is built.

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

    // Shared base design system. Feature-specific styling remains disabled during scaffolding.
    wp_enqueue_style(
        'global-site-settings-ds',
        GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/css/sitebridge-ui.css',
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
        'reset_branding_nonce' => wp_create_nonce('belims_reset_branding'),
        'settings_nonce' => wp_create_nonce('belims_save_setting'),
    ));

    wp_enqueue_script(
        'belims-media-tools',
        GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/js/media-tools.js',
        array('jquery'),
        GLOBAL_SITE_SETTINGS_VERSION,
        true
    );
    wp_localize_script('belims-media-tools', 'belimsMediaTools', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('belims_media_tools'),
    ));

    wp_enqueue_script(
        'belims-homepage-tools',
        GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/js/homepage-tools.js',
        array('jquery'),
        GLOBAL_SITE_SETTINGS_VERSION,
        true
    );
    wp_localize_script('belims-homepage-tools', 'belimsHomepageTools', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('belims_homepage_tools'),
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

    // One submenu item per group; each opens the group's first tab (#tab-<id>), and the
    // group's pages live in the in-page horizontal tab bar. The first item reuses the parent
    // slug, so it replaces WP's duplicate "Site Settings" entry.
    $items = array(
        'belims-site-settings'                             => 'Overview',
        'admin.php?page=belims-site-settings#tab-branding' => 'Settings',
        'admin.php?page=belims-site-settings#tab-ftg-sync' => 'Integrations',
        'admin.php?page=belims-site-settings#tab-media'    => 'Tools',
    );
    foreach ($items as $slug => $title) {
        add_submenu_page('belims-site-settings', $title, $title, 'manage_options', $slug);
    }
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
    <?php
    $bpc_environment = belims_environment();
    $bpc_env_labels  = array('production' => 'Production', 'staging' => 'Staging', 'development' => 'Development', 'local' => 'Local');
    $bpc_env_warnings = array();
    if (!belims_is_production()) {
        $payfast = (array) get_option('woocommerce_payfast_settings', array());
        if (($payfast['enabled'] ?? 'no') === 'yes' && ($payfast['testmode'] ?? 'no') !== 'yes') {
            $bpc_env_warnings[] = 'PayFast is in live mode — switch it to test mode on this environment.';
        }
        if (get_field('bobgo_enabled', 'option') && get_option('bobgo_environment', 'production') === 'production') {
            $bpc_env_warnings[] = 'BobGo is enabled with the Production environment — test orders would create real shipments.';
        }
        if ((string) get_option('belims_vercel_deploy_hook_production', '') !== '') {
            $bpc_env_warnings[] = 'A Production deploy hook is saved. It is ignored here, but should be cleared.';
        }
    }
    ?>
    <div id="bpc-admin-root" class="sitebridge-ui">
        <!-- Main Content -->
        <div class="bpc-admin-content">
            <header class="bpc-page-header">
                <div class="bpc-page-header-text">
                    <h1>
                        Belims Hardware — Global Site Settings
                        <span class="bpc-version-tag">v<?php echo esc_html(GLOBAL_SITE_SETTINGS_VERSION); ?></span>
                        <span class="bpc-env-badge <?php echo esc_attr($bpc_environment); ?>" title="WP_ENVIRONMENT_TYPE"><?php echo esc_html($bpc_env_labels[$bpc_environment] ?? ucfirst($bpc_environment)); ?></span>
                    </h1>
                    <p class="description">Headless storefront orchestration, REST API endpoints, CORS policies, FTG sync and media tools.</p>
                </div>
                <div class="bpc-page-header-actions">
                    <a class="button" href="<?php echo esc_url(get_frontend_url()); ?>" target="_blank" rel="noopener noreferrer">View Storefront ↗</a>
                </div>
            </header>
            <hr class="wp-header-end">
            <dialog id="bpc-alert-dialog" role="alertdialog" aria-modal="true" aria-labelledby="bpc-alert-title" aria-describedby="bpc-alert-desc">
                <h3 id="bpc-alert-title"></h3>
                <p id="bpc-alert-desc" class="description"></p>
                <div class="actions">
                    <button type="button" class="button" data-alert="cancel" autofocus>Cancel</button>
                    <button type="button" class="button button-danger" data-alert="confirm"></button>
                </div>
            </dialog>
            <?php if ($bpc_env_warnings): ?>
                <div class="notice notice-warning inline">
                    <p><strong><?php echo esc_html($bpc_env_labels[$bpc_environment] ?? ucfirst($bpc_environment)); ?> environment:</strong> production storefront addresses and production deploys are disabled here.</p>
                    <ul>
                        <?php foreach ($bpc_env_warnings as $warning): ?>
                            <li><?php echo esc_html($warning); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <nav class="nav-tab-wrapper bpc-section-tabs" aria-label="Site Settings sections">
                <div class="bpc-section-tab-group" data-section-group="overview">
                    <a href="#tab-dashboard" class="nav-tab" data-tab="dashboard">Dashboard</a>
                </div>
                <div class="bpc-section-tab-group" data-section-group="settings" hidden>
                    <a href="#tab-branding" class="nav-tab" data-tab="branding">Branding</a>
                    <a href="#tab-ecommerce" class="nav-tab" data-tab="ecommerce">Store Details</a>
                    <a href="#tab-homepage" class="nav-tab" data-tab="homepage">Homepage</a>
                    <a href="#tab-cors-security" class="nav-tab" data-tab="cors-security">CORS &amp; Security</a>
                    <a href="#tab-woocommerce" class="nav-tab" data-tab="woocommerce">WooCommerce</a>
                </div>
                <div class="bpc-section-tab-group" data-section-group="integrations" hidden>
                    <a href="#tab-ftg-sync" class="nav-tab" data-tab="ftg-sync">FTG Sync</a>
                    <a href="#tab-bobgo-shipping" class="nav-tab" data-tab="bobgo-shipping">BobGo Shipping</a>
                    <a href="#tab-firebase-auth" class="nav-tab" data-tab="firebase-auth">Firebase Auth</a>
                    <a href="#tab-ai-services" class="nav-tab" data-tab="ai-services">AI Services</a>
                </div>
                <div class="bpc-section-tab-group" data-section-group="tools" hidden>
                    <a href="#tab-media" class="nav-tab" data-tab="media">Media Management</a>
                </div>
            </nav>
            <!-- Dashboard Tab -->
            <div id="tab-dashboard" class="bpc-tab-content">

                    <?php
                    // Gather additional status data for dashboard
                    $last_sync_ts         = belims_get_ftg_last_sync_timestamp();
                    $last_sync_label      = $last_sync_ts > 0 ? date_i18n('F j, Y, g:i a', $last_sync_ts) : 'Never';
                    $frontend_url         = get_frontend_url();
                    $cors_origin          = get_cors_origin();
                    $php_version          = PHP_VERSION;
                    $wp_version           = get_bloginfo('version');
                    $wc_active            = class_exists('WooCommerce');
                    $wc_version           = $wc_active ? WC()->version : null;
                    $api_base             = rest_url('belims/v1');
                    $integrations_active  = count(array_filter(belims_integration_statuses(), function ($integration) {
                        return $integration['active'];
                    }));
                    $endpoints            = array(
                        array('POST', '/auth/firebase-phone',  'Exchange Firebase ID for JWT', 'Public'),
                        array('POST', '/auth/firebase-google', 'Exchange Google ID for JWT',   'Public'),
                        array('POST', '/users/register',       'Register new account',         'Public'),
                        array('GET',  '/users/me',             'Get current user profile',     'JWT'),
                        array('GET',  '/products',             'Product catalogue',            'Public'),
                        array('GET',  '/categories',           'Category tree',                'Public'),
                        array('POST', '/orders',               'Create WooCommerce order',     'JWT'),
                        array('GET',  '/homepage',             'Homepage sections',            'Public'),
                        array('POST', '/ftg/sync',             'Trigger catalogue sync',       'Admin'),
                    );
                    ?>

                    <div class="bpc-status-strip">
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">WordPress</span>
                            <span class="bpc-status-chip-value">v<?php echo esc_html($wp_version); ?></span>
                        </div>
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">WooCommerce</span>
                            <span class="bpc-status-chip-value"><?php echo $wc_active ? 'v' . esc_html($wc_version) : 'Not active'; ?></span>
                        </div>
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">PHP</span>
                            <span class="bpc-status-chip-value">v<?php echo esc_html($php_version); ?></span>
                        </div>
                        <div class="bpc-status-chip">
                            <span class="bpc-status-chip-label">Storefront</span>
                            <span class="bpc-status-chip-value">
                                <a href="<?php echo esc_url($frontend_url); ?>" target="_blank" rel="noreferrer">
                                    <?php echo esc_html(parse_url($frontend_url, PHP_URL_HOST)); ?>
                                </a>
                            </span>
                        </div>
                    </div>

                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Integrations</h2>
                            <span class="badge <?php echo $integrations_active === 4 ? 'good' : 'info'; ?>"><?php echo esc_html($integrations_active); ?> of 4 active</span>
                        </div>
                        <div class="inside">
                    <div class="bpc-integrations-grid">
                        <?php foreach (belims_integration_statuses() as $tab => $integration) : ?>
                        <div class="bpc-integration-card">
                            <div class="bpc-integration-card-head">
                                <h4><?php echo esc_html($integration['label']); ?></h4>
                                <?php echo belims_integration_badge($tab, $integration); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in the helper ?>
                            </div>
                            <div class="bpc-integration-meta">
                                <?php echo esc_html($tab === 'ftg-sync' && $integration['active'] ? 'Last sync: ' . $last_sync_label : $integration['description']); ?>
                            </div>
                            <a class="button button-small" href="#tab-<?php echo esc_attr($tab); ?>">Configure</a>
                        </div>
                        <?php endforeach; ?>
                    </div>

                        </div>
                    </div>

                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Settings shortcuts</h2>
                        </div>
                        <div class="inside">
                    <div class="bpc-settings-grid">
                        <?php
                        $settings_tiles = [
                            ['tab' => 'branding',      'icon' => '🎨', 'label' => 'Branding',        'desc' => 'Admin dashboard colours'],
                            ['tab' => 'ecommerce',     'icon' => '🏬', 'label' => 'Store Details',   'desc' => 'Locations, hours and policies'],
                            ['tab' => 'homepage',      'icon' => '🏠', 'label' => 'Homepage',        'desc' => 'Hero sections and categories'],
                            ['tab' => 'cors-security', 'icon' => '🔒', 'label' => 'CORS & Security', 'desc' => 'Allowed origins and API security'],
                            ['tab' => 'woocommerce',   'icon' => '🏪', 'label' => 'WooCommerce',     'desc' => 'API and product description import'],
                        ];
                        foreach ($settings_tiles as $tile): ?>
                            <a class="bpc-settings-tile" onclick="jQuery('.bpc-section-tabs [data-tab=\'<?php echo esc_js($tile['tab']); ?>\']').click(); return false;" href="#">
                                <span class="bpc-settings-tile-icon"><?php echo esc_html($tile['icon']); ?></span>
                                <div class="bpc-settings-tile-label"><?php echo esc_html($tile['label']); ?></div>
                                <div class="bpc-settings-tile-desc"><?php echo esc_html($tile['desc']); ?></div>
                            </a>
                        <?php endforeach; ?>
                    </div>

                        </div>
                    </div>

                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>REST API endpoints</h2>
                            <span class="badge info"><?php echo esc_html(count($endpoints)); ?> endpoints</span>
                        </div>
                        <div class="inside is-flush">
                        <table class="bpc-api-table">
                            <thead>
                                <tr>
                                    <th>Method</th>
                                    <th>Endpoint</th>
                                    <th>Description</th>
                                    <th>Auth</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                foreach ($endpoints as $ep):
                                    $method = strtolower($ep[0]);
                                ?>
                                <tr>
                                    <td><span class="bpc-method-badge <?php echo $method; ?>"><?php echo strtoupper($ep[0]); ?></span></td>
                                    <td><code class="bpc-api-url"><?php echo esc_html($ep[1]); ?></code></td>
                                    <td><?php echo esc_html($ep[2]); ?></td>
                                    <td>
                                        <?php $auth_class = strtolower($ep[3]); ?>
                                        <span class="bpc-auth-badge bpc-auth-badge--<?php echo $auth_class; ?>"><?php echo esc_html($ep[3]); ?></span>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        </div>
                    </div>

            </div>

            <!-- FTG Sync Tab -->
            <div id="tab-ftg-sync" class="bpc-tab-content">

                    <?php
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

                    <?php
                    $ftg_credentials_saved = !empty($ftg_email) && !empty($ftg_password) && !empty($ftg_token);
                    $ftg_connection = get_option('belims_ftg_connection_status', array());
                    $ftg_last_ok    = !empty($ftg_connection['ok']);
                    $ftg_badge = $ftg_credentials_saved && $ftg_last_ok ? array('good', 'Connected') : array('warn', 'Not connected');
                    ?>

                    <h2>FTG Sync</h2>
                    <p class="intro">Import supplier products into WooCommerce. A product is created or updated only when stock, price and at least one web category are present.</p>

                    <div class="section-layout" id="ftg-section-layout">
                    <nav class="section-nav" aria-label="FTG Sync sections">
                        <button type="button" data-section="connection" aria-current="true">Connection</button>
                        <button type="button" data-section="auto-sync" data-requires="enabled" <?php echo $ftg_enabled ? '' : 'hidden'; ?>>Auto Sync</button>
                        <button type="button" data-section="tools" data-requires="enabled" <?php echo $ftg_enabled ? '' : 'hidden'; ?>>Tools</button>
                        <button type="button" data-section="activity-log" data-requires="enabled" <?php echo $ftg_enabled ? '' : 'hidden'; ?>>Activity Log</button>
                    </nav>
                    <div class="section-content">

                    <div data-section-pane="connection">
                    <?php belims_settings_card(array(
                        'id'          => 'ftg-enabled-card',
                        'setting'     => 'ftg_enabled',
                        'title'       => 'FTG integration',
                        'description' => 'Imports products from the FTG supplier feed into WooCommerce.',
                        'label'       => 'Enable integration',
                        'checked'     => (bool) $ftg_enabled,
                        'help'        => 'Turning it off stops scheduled and manual syncs. Saved credentials are kept.',
                        'confirm_off' => array('Disable FTG connection?', 'Scheduled and manual syncs stop until the integration is turned on again. Saved credentials are kept.', 'Disable connection'),
                    )); ?>
                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Connection status</h2>
                            <span id="ftg-status-badge" class="badge <?php echo $ftg_enabled ? esc_attr($ftg_badge[0]) : 'warn'; ?>" data-on-class="<?php echo esc_attr($ftg_badge[0]); ?>" data-on-label="<?php echo esc_attr($ftg_badge[1]); ?>"><?php echo esc_html($ftg_enabled ? $ftg_badge[1] : 'Not connected'); ?></span>
                        </div>
                        <div class="inside">
                        <p class="muted">Last catalogue sync: <strong id="last-sync"><?php echo esc_html($last_sync_text); ?></strong></p>

                        <form method="post" action="" id="ftg-credentials-form-el">
                            <?php wp_nonce_field('save_ftg_credentials_action', 'ftg_nonce'); ?>

                            <div id="ftg-credentials-section" <?php echo $ftg_enabled ? '' : 'hidden'; ?>>

                                <div id="ftg-credentials-saved" <?php echo $ftg_credentials_saved ? '' : 'hidden'; ?>>
                                    <div class="credential-grid">
                                        <div class="key">Email</div>
                                        <div class="value" id="ftg-saved-email"><?php echo esc_html($ftg_email); ?></div>
                                        <div class="key">Password</div>
                                        <div class="value"><?php echo esc_html(BELIMS_FTG_PASSWORD_MASK); ?></div>
                                        <div class="key">Token</div>
                                        <div class="value"><span id="ftg-saved-token"><?php echo esc_html(substr((string) $ftg_token, 0, 8)); ?></span>••••••••</div>
                                    </div>
                                    <div class="actions">
                                        <button type="button" id="ftg-edit-credentials" class="button">Edit Credentials</button>
                                        <button type="button" id="ftg-test-connection-top" class="button">Test Connection</button>
                                    </div>
                                    <div id="ftg-test-result-top" aria-live="polite"></div>
                                </div>

                                <div id="ftg-credentials-form" <?php echo $ftg_credentials_saved ? 'hidden' : ''; ?>>
                                    <div class="field">
                                        <label for="ftg-email">FTG email</label>
                                        <input id="ftg-email" class="wp-input regular-text" type="email" name="ftg_email" value="<?php echo esc_attr($ftg_email); ?>" data-stored="<?php echo esc_attr($ftg_email); ?>" autocomplete="username" required />
                                    </div>
                                    <div class="field">
                                        <label for="ftg-password">FTG password</label>
                                        <div class="input-row">
                                            <?php $ftg_password_field = $ftg_credentials_saved ? BELIMS_FTG_PASSWORD_MASK : ''; ?>
                                            <input id="ftg-password" class="wp-input regular-text" type="password" name="ftg_password" value="<?php echo esc_attr($ftg_password_field); ?>" data-stored="<?php echo esc_attr($ftg_password_field); ?>" autocomplete="current-password" required />
                                            <button type="button" class="button button-small" id="ftg-show-password" <?php disabled($ftg_credentials_saved); ?>>Show</button>
                                        </div>
                                        <p class="description">Credentials are stored by WordPress and are not shown after saving.</p>
                                    </div>
                                    <div class="field">
                                        <label for="ftg-token-input">Collection token</label>
                                        <div class="input-row">
                                            <?php $ftg_token_field = $ftg_credentials_saved ? $ftg_token : ''; ?>
                                            <input id="ftg-token-input" class="wp-input regular-text" type="text" name="ftg_collection_token" value="<?php echo esc_attr($ftg_token_field); ?>" data-stored="<?php echo esc_attr($ftg_token_field); ?>" placeholder="Click Get Token" readonly />
                                            <button type="button" id="get-ftg-token" class="button button-small">Get Token</button>
                                        </div>
                                        <p class="description">Get Token signs in to FTG with the email and password above and fills in the token.</p>
                                        <div id="token-status" aria-live="polite"></div>
                                        <input type="hidden" name="ftg_token_verified" id="ftg-token-verified" value="0" />
                                    </div>
                                    <div class="actions">
                                        <input type="submit" id="ftg-save-credentials" name="save_ftg_credentials" class="button button-primary" value="Save Credentials" <?php disabled(!$ftg_credentials_saved); ?> />
                                        <button type="button" id="ftg-cancel-edit" class="button" <?php echo $ftg_credentials_saved ? '' : 'hidden'; ?>>Cancel</button>
                                        <button type="button" id="ftg-disconnect" class="button button-danger" <?php echo $ftg_credentials_saved ? '' : 'hidden'; ?>>Disconnect FTG</button>
                                    </div>
                                </div>

                            </div>
                        </form>
                    </div>
                    </div>
                    </div>

                    <script>
                    jQuery(document).ready(function($) {
                        var ftgPasswordMask = <?php echo wp_json_encode(BELIMS_FTG_PASSWORD_MASK); ?>;
                        // Stored token counts as verified until email or password change.
                        var ftgTokenVerified = <?php echo $ftg_credentials_saved ? 'true' : 'false'; ?>;

                        // Gate for click handlers: first click opens the alert dialog; on confirm the click is replayed.
                        function ftgConfirmed(el, title, description, confirmLabel) {
                            if ($(el).data('ftgConfirmed')) {
                                $(el).removeData('ftgConfirmed');
                                return true;
                            }
                            window.bpcConfirm(title, description, confirmLabel).then(function(confirmed) {
                                if (!confirmed) return;
                                $(el).data('ftgConfirmed', true);
                                $(el).trigger('click');
                            });
                            return false;
                        }
                        window.ftgConfirmed = ftgConfirmed;

                        // AJAX saves leave the page as-is: reset the unsaved-changes snapshot (admin.js).
                        function ftgMarkClean() {
                            if (typeof window.bpcMarkFormClean === 'function') {
                                window.bpcMarkFormClean(document.getElementById('ftg-credentials-form-el'));
                            }
                        }

                        // Enabled state: credentials, schedule/sync/log panels and the status badge.
                        function ftgApplyEnabled(on) {
                            $('#ftg-credentials-section, #ftg-enabled-panels').prop('hidden', !on);
                            var layout = $('#ftg-section-layout');
                            layout.find('[data-requires="enabled"]').prop('hidden', !on);
                            if (!on && typeof window.bpcShowSection === 'function') {
                                window.bpcShowSection(layout, 'connection');
                            }
                            var badge = $('#ftg-status-badge');
                            badge.attr('class', 'badge ' + (on ? badge.data('on-class') : 'warn'))
                                .text(on ? badge.data('on-label') : 'Not connected');
                        }

                        $('#ftg-enabled-card').on('settings-card:saved', function(e, on) {
                            ftgApplyEnabled(on);
                            if (on) $(document).trigger('ftg:tools-visible');
                        });

                        // Save stays disabled until email + password are filled and Get Token succeeded for them.
                        function ftgUpdateSave() {
                            var ready = $('#ftg-email').val().trim() !== '' &&
                                $('#ftg-password').val() !== '' &&
                                ftgTokenVerified &&
                                $('#ftg-token-input').val() !== '';
                            $('#ftg-save-credentials').prop('disabled', !ready);
                        }

                        function ftgResetToken() {
                            ftgTokenVerified = false;
                            $('#ftg-token-verified').val('0');
                            $('#ftg-token-input').val('');
                            ftgUpdateSave();
                        }

                        $('#ftg-email, #ftg-password').on('input', function() {
                            ftgResetToken();
                            var password = $('#ftg-password').val();
                            $('#ftg-show-password').prop('disabled', password === '' || password === ftgPasswordMask);
                        });

                        // Typing into the masked password replaces the mask instead of appending to it.
                        $('#ftg-password').on('focus', function() {
                            if (this.value === ftgPasswordMask) this.select();
                        });

                        // Edit always reopens with the stored values (masked password).
                        $('#ftg-edit-credentials').on('click', function() {
                            $('#ftg-email, #ftg-password, #ftg-token-input').each(function() {
                                $(this).val($(this).attr('data-stored'));
                            });
                            $('#ftg-password').attr('type', 'password');
                            $('#ftg-show-password').text('Show').prop('disabled', true);
                            ftgTokenVerified = $('#ftg-token-input').val() !== '';
                            $('#ftg-token-verified').val('0');
                            ftgUpdateSave();
                            $('#ftg-credentials-saved').prop('hidden', true);
                            $('#ftg-credentials-form').prop('hidden', false);
                            $('#ftg-email').trigger('focus');
                        });

                        // Save Credentials — AJAX; success switches to the saved view in place.
                        $('#ftg-credentials-form-el').on('submit', function(e) {
                            e.preventDefault();
                            var form = $(this);
                            var btn = $('#ftg-save-credentials');
                            if (btn.prop('disabled')) return;
                            btn.prop('disabled', true).val('Saving…');
                            $.post(ajaxurl, form.serialize() + '&action=belims_save_ftg_credentials').done(function(response) {
                                if (!response || !response.success) {
                                    bpcToast((response && response.data && response.data.message) || 'FTG credentials not saved.', 'error');
                                    btn.val('Save Credentials');
                                    ftgUpdateSave();
                                    return;
                                }
                                var data = response.data;
                                $('#ftg-saved-email').text(data.email);
                                $('#ftg-saved-token').text(data.token_prefix);
                                $('#ftg-email').attr('data-stored', data.email);
                                $('#ftg-password').attr('data-stored', ftgPasswordMask).val(ftgPasswordMask).attr('type', 'password');
                                $('#ftg-token-input').attr('data-stored', data.token).val(data.token);
                                $('#ftg-show-password').text('Show').prop('disabled', true);
                                $('#ftg-token-verified').val('0');
                                ftgTokenVerified = true;
                                if (data.connected) {
                                    $('#ftg-status-badge').data({ 'on-class': 'good', 'on-label': 'Connected' });
                                }
                                ftgApplyEnabled(true);
                                $('#ftg-cancel-edit, #ftg-disconnect, #ftg-credentials-saved, #ftg-sync-tools').prop('hidden', false);
                                $('#ftg-credentials-form, #ftg-token-notice').prop('hidden', true);
                                $('#ftg-test-result-top').empty();
                                btn.val('Save Credentials');
                                ftgUpdateSave();
                                ftgMarkClean();
                                $(document).trigger('ftg:tools-visible');
                                bpcToast(data.message || 'FTG credentials saved.', 'success');
                            }).fail(function(xhr) {
                                var data = xhr.responseJSON && xhr.responseJSON.data;
                                bpcToast((data && data.message) || 'FTG credentials not saved. Check your connection and try again.', 'error');
                                btn.val('Save Credentials');
                                ftgUpdateSave();
                            });
                        });

                        $('#ftg-cancel-edit').on('click', function() {
                            $('#ftg-credentials-form').prop('hidden', true);
                            $('#ftg-credentials-saved').prop('hidden', false);
                        });

                        $('#ftg-show-password').on('click', function() {
                            var input = $('#ftg-password');
                            var reveal = input.attr('type') === 'password';
                            input.attr('type', reveal ? 'text' : 'password');
                            $(this).text(reveal ? 'Hide' : 'Show');
                        });

                        $('#ftg-disconnect').on('click', function() {
                            var btn = $(this);
                            window.bpcConfirm(
                                'Remove FTG credentials?',
                                'The saved email, password and token are deleted and the integration is turned off. You will need to sign in again to reconnect.',
                                'Remove'
                            ).then(function(confirmed) {
                                if (!confirmed) return;
                                btn.prop('disabled', true);
                                $.post(ajaxurl, {
                                    action: 'clear_ftg_credentials',
                                    nonce: '<?php echo wp_create_nonce('clear_ftg_creds'); ?>'
                                }).done(function(response) {
                                    if (response && response.success) {
                                        bpcToast('FTG credentials removed. Reloading…', 'success');
                                        setTimeout(function() { window.location.reload(); }, 1200);
                                    } else {
                                        btn.prop('disabled', false);
                                        bpcToast('FTG credentials not removed.', 'error');
                                    }
                                }).fail(function() {
                                    btn.prop('disabled', false);
                                    bpcToast('FTG credentials not removed.', 'error');
                                });
                            });
                        });

                        // Test Connection — checks the stored token and records the result.
                        $('#ftg-test-connection-top').on('click', function() {
                            var btn = $(this);
                            var resultEl = $('#ftg-test-result-top');
                            var original = btn.text();
                            btn.prop('disabled', true).text('Testing…');
                            resultEl.empty();
                            $.ajax({
                                url: '<?php echo esc_url_raw(rest_url('belims/v1/ftg/instances')); ?>',
                                method: 'GET',
                                headers: { 'X-WP-Nonce': '<?php echo wp_create_nonce('wp_rest'); ?>' }
                            }).done(function(response) {
                                var count = Array.isArray(response) ? response.length : (response && response.length) || 0;
                                resultEl.html('<span class="badge good">Connected · ' + count + ' instance(s) found</span>');
                                $('#ftg-status-badge').data({ 'on-class': 'good', 'on-label': 'Connected' });
                                ftgApplyEnabled(true);
                                bpcToast('FTG connection successful.', 'success');
                                $.post(ajaxurl, {
                                    action: 'belims_save_ftg_connection_status',
                                    nonce: '<?php echo wp_create_nonce('belims_ftg_connection'); ?>',
                                    ok: 1
                                });
                            }).fail(function(xhr) {
                                var msg = (xhr.responseJSON && xhr.responseJSON.message) || xhr.statusText || 'Connection failed';
                                resultEl.html('<span class="badge">Failed · ' + $('<div>').text(msg).html() + '</span>');
                                $('#ftg-status-badge').data({ 'on-class': 'warn', 'on-label': 'Not connected' });
                                ftgApplyEnabled(true);
                                bpcToast('FTG connection failed: ' + msg, 'error');
                                $.post(ajaxurl, {
                                    action: 'belims_save_ftg_connection_status',
                                    nonce: '<?php echo wp_create_nonce('belims_ftg_connection'); ?>',
                                    ok: 0,
                                    message: msg
                                });
                            }).always(function() {
                                btn.prop('disabled', false).text(original);
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
                                    btn.prop('disabled', false).text('Save Schedule');
                                    if (response.success) {
                                        cronStatus.html('Next scheduled run: <strong>' + response.data.next_run + '</strong>');
                                        var frequency = $('#ftg-cron-frequency').val();
                                        $('#ftg-schedule-badge').attr('class', 'badge ' + (frequency === 'disabled' ? '' : 'info'))
                                            .text($('#ftg-cron-frequency option:selected').text());
                                        bpcToast('Auto-sync schedule saved.', 'success');
                                    } else {
                                        bpcToast('Auto-sync schedule not saved.', 'error');
                                    }
                                },
                                error: function() {
                                    btn.prop('disabled', false).text('Save Schedule');
                                    bpcToast('Auto-sync schedule not saved.', 'error');
                                }
                            });
                        });

                        // Cron manual run
                        $('#ftg-run-cron-now').on('click', function() {
                            var btn = $(this);
                            var cronStatus = $('#ftg-cron-status');
                            var cronIdle = cronStatus.html();
                            if (!ftgConfirmed(this, 'Run auto-sync now?', 'Runs the scheduled FTG sync immediately. This can take several minutes.', 'Run now')) return;
                            btn.prop('disabled', true).text('Running...');
                            cronStatus.text('Sync running…');
                            $.ajax({
                                url: ajaxurl,
                                method: 'POST',
                                timeout: 330000,
                                data: {
                                    action: 'belims_run_ftg_cron_now',
                                    nonce: '<?php echo esc_js($ftg_cron_nonce); ?>'
                                },
                                success: function(response) {
                                    btn.prop('disabled', false).text('Run Now');
                                    if (response.success) {
                                        cronStatus.html('Last sync: <strong>' + response.data.last_sync + '</strong>');
                                        bpcToast('FTG sync complete.', 'success');
                                    } else {
                                        cronStatus.html(cronIdle);
                                        bpcToast('FTG sync failed.', 'error');
                                    }
                                },
                                error: function() {
                                    btn.prop('disabled', false).text('Run Now');
                                    cronStatus.html(cronIdle);
                                    bpcToast('FTG sync failed or timed out.', 'error');
                                }
                            });
                        });

                        // Get Token — POST /ftg/login signs in and returns the token; nothing is stored until Save Credentials.
                        // A masked password makes the server use the stored one (same email only).
                        $('#get-ftg-token').on('click', function() {
                            var btn = $(this);
                            var status = $('#token-status');
                            var email = $('#ftg-email').val().trim();
                            var password = $('#ftg-password').val();

                            if (!email || !password) {
                                bpcToast('Enter the FTG email and password first.', 'warning');
                                return;
                            }
                            if (password === ftgPasswordMask && email.toLowerCase() !== ($('#ftg-email').attr('data-stored') || '').toLowerCase()) {
                                bpcToast('Enter the FTG password for this email.', 'warning');
                                $('#ftg-password').trigger('focus');
                                return;
                            }

                            btn.prop('disabled', true).text('Getting token…');
                            ftgResetToken();
                            status.text('Signing in to FTG…');

                            $.ajax({
                                url: '<?php echo esc_url_raw(rest_url('belims/v1/ftg/login')); ?>',
                                method: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ email: email, password: password }),
                                headers: { 'X-WP-Nonce': '<?php echo wp_create_nonce('wp_rest'); ?>' }
                            }).done(function(response) {
                                status.empty();
                                if (response && response.success && response.collection_token) {
                                    $('#ftg-token-input').val(response.collection_token);
                                    ftgTokenVerified = true;
                                    $('#ftg-token-verified').val('1');
                                    ftgUpdateSave();
                                    bpcToast('Token retrieved. Click Save Credentials to finish.', 'success');
                                } else {
                                    bpcToast((response && response.message) || 'Token not retrieved.', 'warning');
                                }
                            }).fail(function(xhr) {
                                status.empty();
                                bpcToast((xhr.responseJSON && xhr.responseJSON.message) || 'Token not retrieved.', 'error');
                            }).always(function() {
                                btn.prop('disabled', false).text('Get Token');
                            });
                        });
                    });
                    </script>

                    <div id="ftg-enabled-panels" <?php echo $ftg_enabled ? '' : 'hidden'; ?>>
                    <div data-section-pane="auto-sync" hidden>
                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Automatic synchronization</h2>
                            <?php $ftg_schedule_labels = array('disabled' => 'Disabled', 'hourly' => 'Hourly', 'twicedaily' => 'Twice Daily', 'daily' => 'Daily', 'weekly' => 'Weekly'); ?>
                                <span id="ftg-schedule-badge" class="badge <?php echo $ftg_cron_frequency === 'disabled' ? '' : 'info'; ?>"><?php echo esc_html($ftg_schedule_labels[$ftg_cron_frequency] ?? ucfirst($ftg_cron_frequency)); ?></span>
                        </div>
                        <div class="inside">
                        <div class="field">
                            <label for="ftg-cron-frequency">Auto-sync schedule</label>
                            <select id="ftg-cron-frequency" class="wp-select">
                                <option value="disabled" <?php selected($ftg_cron_frequency, 'disabled'); ?>>Disabled</option>
                                <option value="hourly" <?php selected($ftg_cron_frequency, 'hourly'); ?>>Hourly</option>
                                <option value="twicedaily" <?php selected($ftg_cron_frequency, 'twicedaily'); ?>>Twice Daily</option>
                                <option value="daily" <?php selected($ftg_cron_frequency, 'daily'); ?>>Daily</option>
                                <option value="weekly" <?php selected($ftg_cron_frequency, 'weekly'); ?>>Weekly</option>
                            </select>
                            <div class="schedule-context" id="ftg-cron-status" aria-live="polite">Next scheduled run: <strong><?php echo esc_html($ftg_next_run_text); ?></strong></div>
                        </div>
                        <div class="actions">
                            <button type="button" id="ftg-save-cron-frequency" class="button button-primary">Save Schedule</button>
                            <button type="button" id="ftg-run-cron-now" class="button">Run Now</button>
                        </div>
                    </div>
                    </div>
                    </div>

                    <div data-section-pane="tools" hidden>
                    <div class="notice notice-warning inline" id="ftg-token-notice" <?php echo $ftg_token ? 'hidden' : ''; ?>><p>Save FTG credentials above before syncing.</p></div>
                    <div id="ftg-sync-tools" <?php echo $ftg_token ? '' : 'hidden'; ?>>
                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Brand &amp; product</h2>
                        </div>
                        <div class="inside">
                            <div class="store-fields">
                                <div class="field">
                                    <label for="ftg-brand-filter">Brand</label>
                                    <select id="ftg-brand-filter" class="wp-select">
                                        <option value="Assa Abloy" selected>Assa Abloy</option>
                                        <option value="Ingco">Ingco</option>
                                        <option value="Yale">Yale</option>
                                        <option value="__custom__">Other (type below)</option>
                                    </select>
                                </div>
                                <div class="field" id="ftg-custom-brand-wrap" style="display:none;">
                                    <label for="ftg-custom-brand">Custom brand</label>
                                    <input type="text" id="ftg-custom-brand" class="wp-input" placeholder="Enter FTG brand name" />
                                </div>
                                <div class="field">
                                    <label for="ftg-sku-input">Product SKU</label>
                                    <input type="text" id="ftg-sku-input" class="wp-input" placeholder="Enter supplier SKU" />
                                    <p class="description">Used by Inspect Product and Sync Single Product.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Look up</h2>
                            <span class="badge info">Read only</span>
                        </div>
                        <div class="inside">
                            <p class="description">Reads from FTG and WooCommerce. Nothing is changed.</p>
                            <div class="actions">
                                <button type="button" id="ftg-search-brands" class="button">Search Available Brands</button>
                                <button type="button" id="ftg-check-catalogue-count" class="button">Check Catalogue Count</button>
                                <button type="button" id="ftg-count-display-on-web" class="button">Count Display On Web Active</button>
                                <button type="button" id="ftg-inspect-product" class="button">Inspect Product</button>
                                <button type="button" id="ftg-export-brand-products" class="button">Export Brand Products (CSV)</button>
                            </div>
                            <div class="ftg-tool-result" aria-live="polite"></div>
                        </div>
                    </div>

                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Sync to WooCommerce</h2>
                            <span class="badge warn">Changes products</span>
                        </div>
                        <div class="inside">
                            <div class="field">
                                <span class="field-label">Selected brand</span>
                                <div class="actions">
                                    <button type="button" id="ftg-test-sync" class="button">Sync first 10 (test)</button>
                                    <button type="button" id="ftg-sync-products" class="button button-primary">Sync Catalogue</button>
                                </div>
                            </div>
                            <div class="field">
                                <span class="field-label">Single product</span>
                                <div class="actions">
                                    <button type="button" id="ftg-sync-single-btn" class="button">Sync Single Product</button>
                                </div>
                                <div id="ftg-sync-single-result"></div>
                            </div>
                            <div class="field">
                                <span class="field-label">All brands</span>
                                <div class="actions">
                                    <label class="inline-check" for="ftg-sync-all-dry-run">
                                        <input type="checkbox" id="ftg-sync-all-dry-run" />
                                        <span>Dry run (counts only, nothing written)</span>
                                    </label>
                                    <button type="button" id="ftg-sync-all-products" class="button">Sync All Brands</button>
                                </div>
                            </div>
                            <p class="description">FTG prices exclude VAT; 15% is added automatically. Skipped items leave existing CMS products unchanged.</p>
                            <div class="ftg-tool-result" aria-live="polite"></div>
                        </div>
                    </div>

                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Maintenance</h2>
                            <span class="badge warn">Caution</span>
                        </div>
                        <div class="inside">
                            <div class="field">
                                <span class="field-label">Duplicate attributes</span>
                                <div class="actions">
                                    <button type="button" id="ftg-cleanup-attributes" class="button button-danger">Cleanup Duplicate Attributes</button>
                                </div>
                                <p class="description">Removes duplicate Range and Color attribute terms in WooCommerce.</p>
                            </div>
                            <div class="ftg-tool-result" aria-live="polite"></div>
                        </div>
                    </div>
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
                                // Brands load only once Sync tools is visible (FTG on + credentials saved); the
                                // connection script fires ftg:tools-visible when that happens without a reload.
                                var ftgBrandsLoaded = false;
                                function loadFtgBrandsWhenVisible() {
                                    if (ftgBrandsLoaded || $('#ftg-sync-tools').is('[hidden]') || $('#ftg-enabled-panels').is('[hidden]')) return;
                                    ftgBrandsLoaded = true;
                                    loadFtgBrands();
                                }
                                $(document).on('ftg:tools-visible', loadFtgBrandsWhenVisible);
                                loadFtgBrandsWhenVisible();

                                $('#ftg-search-brands').on('click', function() {
                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in
                                    btn.prop('disabled', true).text('Searching...');
                                    status.html('<p>Searching available brands from FTG...</p>');

                                    fetchFtgBrands(function(response) {
                                        btn.prop('disabled', false).text('Search Available Brands');

                                        if (!response || !response.success || !Array.isArray(response.brands)) {
                                            status.empty();
                                            bpcToast('No brands returned from FTG.', 'warning');
                                            return;
                                        }

                                        var brands = response.brands.filter(function(brand) {
                                            return (brand || '').toString().trim() !== '';
                                        });

                                        if (!brands.length) {
                                            status.empty();
                                            bpcToast('No brands returned from FTG.', 'warning');
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
                                        btn.prop('disabled', false).text('Search Available Brands');
                                        var errorMsg = xhr.responseJSON?.message
                                            || (xhr.status ? 'HTTP ' + xhr.status + ' — ' + (xhr.responseText || '').substring(0, 120) : 'Failed to fetch FTG brands (no response)');
                                        status.empty();
                                        bpcToast(errorMsg, 'error');
                                    }, true); // true = force-refresh cache
                                });

                                $('#ftg-cleanup-attributes').on('click', function() {
                                    if (!window.ftgConfirmed(this, 'Clean up duplicate attributes?', 'Removes duplicate Range and Color attribute terms from WooCommerce.', 'Clean up')) return;

                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in

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
                                            btn.prop('disabled', false).text('Cleanup Duplicate Attributes');

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
                                                status.empty();
                                                bpcToast(response.message, 'warning');
                                            }
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('Cleanup Duplicate Attributes');
                                            status.empty();
                                            bpcToast(xhr.responseJSON?.message || 'Cleanup failed', 'error');
                                        }
                                    });
                                });

                                $('#ftg-inspect-product').on('click', function() {
                                    var sku = ($('#ftg-sku-input').val() || '').trim();
                                    if (!sku) {
                                        bpcToast('Enter a product SKU first.', 'warning');
                                        $('#ftg-sku-input').trigger('focus');
                                        return;
                                    }

                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in

                                    btn.prop('disabled', true).text('Fetching...');
                                    status.html('<p>🔍 Fetching product: ' + sku + '</p>');

                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/product/'); ?>' + sku,
                                        method: 'GET',
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('Inspect Product');

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
                                            btn.prop('disabled', false).text('Inspect Product');
                                            status.empty();
                                            bpcToast(xhr.responseJSON?.message || 'Product not found', 'error');
                                        }
                                    });
                                });

                                $('#ftg-check-catalogue-count').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in

                                    if (!selectedBrand) {
                                        bpcToast('Please select or enter a brand before checking count.', 'error');
                                        return;
                                    }

                                    btn.prop('disabled', true).text('Checking...');
                                    status.html('<p>Fetching ' + selectedBrand + ' catalogue count from FTG...</p>');

                                    fetch('<?php echo rest_url('belims/v1/ftg/brand-count'); ?>?brand=' + encodeURIComponent(selectedBrand))
                                        .then(function(r) { return r.json(); })
                                        .then(function(data) {
                                            btn.prop('disabled', false).text('Check Catalogue Count');
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
                                                status.empty();
                                                bpcToast('Unable to fetch count: ' + (data && data.message ? data.message : 'Unknown error'), 'warning');
                                            }
                                        })
                                        .catch(function(err) {
                                            btn.prop('disabled', false).text('Check Catalogue Count');
                                            status.empty();
                                            bpcToast('Request failed: ' + err, 'error');
                                        });
                                });

                                $('#ftg-count-display-on-web').on('click', function() {
                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in

                                    btn.prop('disabled', true).text('Counting...');
                                    status.html('<p>Checking FTG products with Display on web active...</p>');

                                    fetch('<?php echo rest_url('belims/v1/ftg/display-on-web-count'); ?>')
                                        .then(function(r) { return r.json(); })
                                        .then(function(data) {
                                            btn.prop('disabled', false).text('Count Display On Web Active');
                                            if (data && data.success) {
                                                status.html(
                                                    '<div class="notice notice-success inline">' +
                                                        '<p>✅ Display on web active products in FTG: <strong>' + (data.display_on_web_active_count || 0) + '</strong></p>' +
                                                        '<p>Total products scanned: <strong>' + (data.total_products || 0) + '</strong> (pages fetched: ' + (data.pages_fetched || 0) + ')</p>' +
                                                    '</div>'
                                                );
                                            } else {
                                                status.empty();
                                                bpcToast('Unable to count Display on web active products: ' + (data && data.message ? data.message : 'Unknown error'), 'warning');
                                            }
                                        })
                                        .catch(function(err) {
                                            btn.prop('disabled', false).text('Count Display On Web Active');
                                            status.empty();
                                            bpcToast('Request failed: ' + err, 'error');
                                        });
                                });

                                $('#ftg-export-brand-products').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in

                                    if (!selectedBrand) {
                                        bpcToast('Please select or enter a brand before exporting.', 'error');
                                        return;
                                    }

                                    btn.prop('disabled', true).text('Exporting...');
                                    status.html('<p>Preparing export for ' + selectedBrand + ' products...</p>');

                                    fetch('<?php echo rest_url('belims/v1/ftg/brand-count'); ?>?brand=' + encodeURIComponent(selectedBrand))
                                        .then(function(r) { return r.json(); })
                                        .then(function(data) {
                                            btn.prop('disabled', false).text('Export Brand Products (CSV)');

                                            status.empty();
                                            if (!data || !data.success) {
                                                bpcToast('Unable to export products: ' + (data && data.message ? data.message : 'Unknown error'), 'warning');
                                                return;
                                            }

                                            var products = Array.isArray(data.products) ? data.products : [];
                                            if (!products.length) {
                                                bpcToast('No products found for ' + selectedBrand + '.', 'warning');
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

                                            bpcToast('Export complete for ' + selectedBrand + '. Exported ' + products.length + ' products.', 'success');
                                        })
                                        .catch(function(err) {
                                            btn.prop('disabled', false).text('Export Brand Products (CSV)');
                                            status.empty();
                                            bpcToast('Export failed: ' + err, 'error');
                                        });
                                });

                                $('#ftg-test-sync').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    if (!selectedBrand) {
                                        bpcToast('Please select or enter a brand before syncing.', 'error');
                                        return;
                                    }

                                    if (!window.ftgConfirmed(this, 'Sync the first 10 products?', 'Creates or updates the first 10 ' + selectedBrand + ' products from FTG in WooCommerce.', 'Sync 10 products')) return;

                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in

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
                                                        btn.prop('disabled', false).text('Sync first 10 (test)');
                                                        updateFtgBrandControls();
                                                        $('.ftg-progress-fill').css('width', '100%').text('100%');
                                                        $('.ftg-progress-text').html('Sync complete!');

                                                        bpcToast(
                                                            'Test sync completed (first 10 products). ' + totalSynced + ' ' + selectedBrand + ' products synced.' +
                                                            (totalSkipped > 0 ? ' Skipped ' + totalSkipped + ' products (no price/invalid data).' : '') +
                                                            (totalErrors.length > 0 ? ' ' + totalErrors.length + ' errors occurred.' : ''),
                                                            totalErrors.length > 0 ? 'warning' : 'success'
                                                        );

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

                                                        status.html(detailsHtml);
                                                    }
                                                } else {
                                                    btn.prop('disabled', false).text('Sync first 10 (test)');
                                                    updateFtgBrandControls();
                                                    status.empty();
                                                    bpcToast(response.message || 'Unknown error', 'warning');
                                                }
                                            },
                                            error: function(xhr) {
                                                btn.prop('disabled', false).text('Sync first 10 (test)');
                                                updateFtgBrandControls();
                                                status.empty();
                                                bpcToast(xhr.responseJSON?.message || 'Sync failed', 'error');
                                            }
                                        });
                                    }

                                    // Start with offset 0
                                    syncBatch(0);
                                });

                                $('#ftg-sync-products').on('click', function() {
                                    var selectedBrand = getSelectedFtgBrand();
                                    if (!selectedBrand) {
                                        bpcToast('Please select or enter a brand before syncing.', 'error');
                                        return;
                                    }

                                    if (!window.ftgConfirmed(this, 'Sync the ' + selectedBrand + ' catalogue?', 'Creates and updates every ' + selectedBrand + ' product from FTG in WooCommerce. This can take several minutes.', 'Sync catalogue')) return;

                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in
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
                                                        btn.prop('disabled', false).text('Sync Catalogue');
                                                        updateFtgBrandControls();
                                                        $('.ftg-progress-fill').css('width', '100%').text('100%');

                                                        var totalTime  = Math.round((Date.now() - startTime) / 1000);
                                                        var skippedMsg = totalSkipped > 0 ? ' (' + totalSkipped + ' skipped)' : '';
                                                        var errorMsg   = totalErrors.length > 0 ? ' ' + totalErrors.length + ' errors. Check error log.' : '';

                                                        $('.ftg-progress-text').text('Sync complete!');
                                                        bpcToast(selectedBrand + ' catalogue sync completed in ' + totalTime + 's! ' + totalSynced + ' products synced' + skippedMsg + '.' + errorMsg, totalErrors.length > 0 ? 'warning' : 'success');
                                                        setTimeout(function() { location.reload(); }, 2000);
                                                    }
                                                } else {
                                                    btn.prop('disabled', false).text('Sync Catalogue');
                                                    updateFtgBrandControls();
                                                    var errors = (response.errors && response.errors.length) ? response.errors.join(', ') : (response.message || 'Unknown error');
                                                    status.empty();
                                                    bpcToast('Sync failed: ' + errors, 'error');
                                                }
                                            },
                                            error: function(xhr) {
                                                btn.prop('disabled', false).text('Sync Catalogue');
                                                updateFtgBrandControls();
                                                status.empty();
                                                bpcToast(xhr.responseJSON?.message || 'Sync failed', 'error');
                                            }
                                        });
                                    }

                                    syncFullBatch(0);
                                });

                                // Sync ALL brands sequentially
                                $('#ftg-sync-all-products').on('click', function() {
                                    var dryRun = $('#ftg-sync-all-dry-run').is(':checked');
                                    var gate = dryRun
                                        ? window.ftgConfirmed(this, 'Run a dry run for all brands?', 'Fetches counts for every brand. Nothing is written to WooCommerce.', 'Start dry run')
                                        : window.ftgConfirmed(this, 'Sync all brands?', 'Creates and updates every product of every brand in WooCommerce. This can take a long time.', 'Sync all brands');
                                    if (!gate) return;

                                    var btn = $(this);
                                    var status = $(this).closest('.postbox').find('.ftg-tool-result'); // results show in the box the button is in
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
                                                status.empty();
                                                bpcToast('Could not load brand list from FTG. Search Available Brands first.', 'error');
                                            }
                                        }, function(xhr) {
                                            status.empty();
                                            bpcToast('Failed to load brands: ' + (xhr.responseJSON?.message || 'error'), 'error');
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
                                                btn.prop('disabled', false).text('Sync All Brands');
                                                dryRunToggle.prop('disabled', false);
                                                updateFtgBrandControls();
                                                var totalTime  = Math.round((Date.now() - startTime) / 1000);
                                                var skippedMsg = grandTotalSkipped > 0 ? ' (' + grandTotalSkipped + ' skipped)' : '';
                                                var errMsg     = grandTotalErrors.length > 0 ? ' ' + grandTotalErrors.length + ' errors across all brands.' : '';
                                                var resultsHtml = brandResults.map(function(r) {
                                                    if (dryRun) {
                                                        return '<li><strong>' + r.brand + '</strong>: ' + (r.counted || 0) + ' products counted' + (r.errors ? ' (' + r.errors + ' errors)' : '') + '</li>';
                                                    }
                                                    return '<li><strong>' + r.brand + '</strong>: ' + r.synced + ' synced, ' + r.skipped + ' skipped' + (r.errors ? ' (' + r.errors + ' errors)' : '') + '</li>';
                                                }).join('');
                                                var headline = dryRun
                                                    ? 'Dry run complete in ' + totalTime + 's! ' + grandTotalAvailable + ' total products counted (no writes).'
                                                    : 'All brands synced in ' + totalTime + 's! ' + grandTotalSynced + ' total products synced' + skippedMsg + '.';
                                                bpcToast(headline + errMsg, grandTotalErrors.length > 0 ? 'warning' : 'success');
                                                status.html(
                                                    '<div class="notice notice-success inline">' +
                                                    '<ul style="margin:8px 0 8px 20px;">' + resultsHtml + '</ul>' +
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
                                        bpcToast('Please enter a SKU', 'error');
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
                                            btn.prop('disabled', false).text('Sync Single Product');

                                            if (response.success) {
                                                bpcToast(response.message, 'success');
                                                var html = '<div class="notice notice-success inline">';
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
                                                resultDiv.empty();
                                                bpcToast(response.message || 'Failed to sync product', 'error');
                                            }
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('Sync Single Product');
                                            resultDiv.empty();
                                            bpcToast((xhr.responseJSON && xhr.responseJSON.message) ? xhr.responseJSON.message : 'Sync failed', 'error');
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
                    </div>

                    <div data-section-pane="activity-log" hidden>
                    <div class="postbox">
                        <div class="postbox-header">
                            <h2>Activity log</h2>
                        </div>
                        <div class="inside">
                        <div class="status-log" id="ftg-log" role="log" aria-live="polite">
                            <span class="log-line muted">No activity yet.</span>
                        </div>
                    </div>
                    </div>
                    </div>
                    </div>
                    </div>
                    </div>
            </div>

            <!-- Branding Tab -->
            <div id="tab-branding" class="bpc-tab-content">
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2>Branding Settings</h2>
                    </div>
                    <p class="sb-intro">Customise the WordPress admin dashboard colours.</p>
                    <?php
                    if (function_exists('acf_form')) {
                        acf_form(array(
                            'post_id'      => 'options',
                            'field_groups' => array('group_belims_branding'),
                            'return'       => '',
                            'submit_value' => 'Save Branding Settings',
                        ));
                    } else {
                        echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
                    }
                    ?>
                    <div class="sb-divider"></div>
                    <div class="sb-actions">
                        <button type="button" id="belims-reset-branding-colors" class="button button-danger button-small">Restore Default Colors</button>
                        <span class="sb-help">Removes all custom admin colours and resets to WordPress defaults.</span>
                    </div>
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
                    echo '<div class="sb-panel"><p>Ecommerce Policies module not loaded.</p></div>';
                }
                ?>
            </div>

            <!-- CORS & Security Tab -->
            <div id="tab-cors-security" class="bpc-tab-content">
                <!-- Allowed storefronts (read-only) -->
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">Allowed Storefronts</h2>
                    </div>
                    <p class="sb-intro">Production, preview and local development can all use the CMS at the same time. PayFast returns each customer to the storefront their order was placed on.</p>
                    <div class="sb-summary">
                        <?php foreach (get_cors_origins() as $allowed_origin) : ?>
                            <div class="sb-sum-key">Origin</div>
                            <div class="sb-sum-val"><code><?php echo esc_html($allowed_origin); ?></code></div>
                        <?php endforeach; ?>
                        <div class="sb-sum-key">Default Frontend</div>
                        <div class="sb-sum-val"><code><?php echo esc_html(get_frontend_url()); ?></code></div>
                    </div>
                </div>

                <!-- CORS Settings Card -->
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">CORS Settings</h2>
                    </div>
                    <p class="sb-intro">Configure Cross-Origin Resource Sharing settings for headless frontend.</p>

                    <?php
                    // Debug: Show current CORS setting being used
                    $cors_field = function_exists('get_field') ? get_field('headless_frontend_url', 'option') : '';
                    $cors_option = get_option('belims_cors_origin', '');
                    $active_cors = !empty($cors_field) ? $cors_field : $cors_option;

                    if (!empty($active_cors) || !empty($cors_field) || !empty($cors_option)) {
                        echo '<div class="bpc-callout bpc-callout--info">';
                        echo '<strong>Current Active CORS Setting:</strong><br>';
                        if (!empty($cors_field)) {
                            echo '<code style="background: white; padding: 2px 6px; border-radius: 3px;">' . esc_html($cors_field) . '</code> <span class="sb-badge sb-badge-good" style="margin-left:8px;">ACF</span>';
                        } elseif (!empty($cors_option)) {
                            echo '<code style="background: white; padding: 2px 6px; border-radius: 3px;">' . esc_html($cors_option) . '</code> <span class="sb-badge sb-badge-warn" style="margin-left:8px;">Legacy</span>';
                        } else {
                            echo '<span class="muted">(using defaults)</span>';
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
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">CORS Verification</h2>
                    </div>
                    <p class="sb-intro">Test and verify CORS configuration.</p>

                    <div class="sb-actions">
                        <button type="button" id="test-cors-config" class="button button-primary">
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

                            btn.prop('disabled', true).text('Verifying...');
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
                                    var html = '<div class="sb-panel" style="margin-top:0;">';
                                    html += '<h4 style="margin-top:0;">CORS Analysis:</h4>';

                                    if (acao === '*' || acao === testOrigin) {
                                        html += '<div style="color: var(--wp-green); font-weight: 600;">✅ Success! CORS is properly configured.</div>';
                                        html += '<div style="font-size: 12px; margin-top: 5px;">Response Header: <code>Access-Control-Allow-Origin: ' + acao + '</code></div>';
                                    } else {
                                        html += '<div style="color: var(--wp-red); font-weight: 600;">❌ CORS Mismatch</div>';
                                        html += '<div style="font-size: 12px; margin-top: 5px;">Server returned: <code>Access-Control-Allow-Origin: ' + (acao || 'NONE') + '</code></div>';
                                        html += '<div style="font-size: 12px; margin-top: 3px; color: var(--wp-muted);">Make sure <code>' + testOrigin + '</code> is added to the "Allowed CORS Origins" field above and settings are saved.</div>';
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
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">🔄 Product Description Import</h2>
                    </div>
                    <p class="sb-intro">Update/add product descriptions from a CSV file by SKU.</p>

                    <?php
                    // Handle product import
                    if (isset($_POST['import_products']) && belims_settings_verify_post('import_products_action', 'import_nonce', 'woocommerce')) {
                        if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
                            belims_settings_flash('error', 'Import failed: please select a valid CSV file.', 'woocommerce');
                        } else {
                            $csv_file = $_FILES['csv_file']['tmp_name'];

                            if (!is_readable($csv_file)) {
                                belims_settings_flash('error', 'Import failed: cannot read the CSV file.', 'woocommerce');
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

                                belims_settings_flash('success', 'Product import complete.', 'woocommerce');
                                echo '<div class="notice sb-badge-good" style="margin-bottom: 20px;">';
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

                    <form method="post" action="" enctype="multipart/form-data">
                        <?php wp_nonce_field('import_products_action', 'import_nonce'); ?>

                        <div class="sb-field">
                            <label for="csv_file">📁 Select CSV File:</label>
                            <input type="file" name="csv_file" id="csv_file" accept=".csv" required>
                            <p class="sb-help">
                                <strong>Required columns:</strong> SKU, Title, URL, Description, Status<br>
                                <strong>Example:</strong> <code>CGGLI2001, 20V Lithium-Ion Glue Gun, https://..., Model: CGGLI2001..., SUCCESS</code>
                            </p>
                        </div>

                        <div class="sb-actions">
                            <input type="submit" name="import_products" class="button button-primary" value="🚀 Import Products" />
                            <span class="sb-help">
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
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">📥 Export Products to CSV</h2>
                    </div>
                    <p class="sb-intro">Export all WooCommerce products with descriptions to CSV format.</p>

                    <?php
                    // Handle product export
                    if (isset($_POST['export_products']) && check_admin_referer('export_products_action', 'export_nonce')) {
                        // Get all products
                        $products = wc_get_products([
                            'limit' => -1,
                            'status' => ['publish', 'draft'],
                        ]);

                        if (empty($products)) {
                            echo '<div class="notice sb-badge-warn" style="margin-bottom: 20px;"><p>⚠️ No products found to export.</p></div>';
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

                    <form method="post" action="">
                        <?php wp_nonce_field('export_products_action', 'export_nonce'); ?>

                        <p class="sb-intro">Click the button below to export all products (published and draft) with their SKU, title, URL, description, price, and status.</p>

                        <div class="sb-actions">
                            <button type="button" id="export-products-btn" class="button button-primary">
                                📥 Export to CSV
                            </button>
                            <span class="sb-help">
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

                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">WooCommerce Integration</h2>
                    </div>
                    <p class="sb-intro">REST API endpoints and WooCommerce settings.</p>

                    <h3>REST API Endpoints:</h3>
                    <div class="sb-summary">
                        <div class="sb-sum-key">[GET] Products</div>
                        <div class="sb-sum-val"><code><?php echo str_replace(home_url(), '', rest_url('belims/v1/products')); ?></code></div>
                        <div class="sb-sum-key">[GET] Categories</div>
                        <div class="sb-sum-val"><code><?php echo str_replace(home_url(), '', rest_url('belims/v1/categories')); ?></code></div>
                        <div class="sb-sum-key">[POST] Orders</div>
                        <div class="sb-sum-val"><code><?php echo str_replace(home_url(), '', rest_url('belims/v1/orders')); ?></code></div>
                    </div>

                    <div class="sb-actions">
                        <button type="button" id="test-wc-endpoints" class="button button-primary">
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

                            btn.prop('disabled', true).text('Testing...');
                            results.html('<p>🔄 Testing WooCommerce endpoints...</p>');

                            var endpoints = [
                                '<?php echo rest_url('belims/v1/products'); ?>',
                                '<?php echo rest_url('belims/v1/categories'); ?>'
                            ];

                            var completed = 0;
                            var html = '<div class="sb-panel" style="margin-top:0;">';
                            html += '<h4 style="margin-top:0;">API Status:</h4>';

                            endpoints.forEach(function(url) {
                                $.ajax({
                                    url: url,
                                    method: 'GET',
                                    success: function(response) {
                                        var count = Array.isArray(response) ? response.length : (response.data ? 'Obj' : '1');
                                        html += '<div style="margin-bottom: 8px; font-size: 13px; color: var(--wp-green);">✅ ' + url.replace("<?php echo rest_url(); ?>", "") + ' - OK (' + count + ' items)</div>';
                                    },
                                    error: function(xhr) {
                                        html += '<div style="margin-bottom: 8px; font-size: 13px; color: var(--wp-red);">❌ ' + url.replace("<?php echo rest_url(); ?>", "") + ' - Failed (' + xhr.status + ')</div>';
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
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">BobGo Shipping Integration</h2>
                    </div>
                    <p class="sb-intro">Enable and configure BobGo shipping for your store.</p>
                    <?php
                    // Handle form submission for enable toggle
                    if (isset($_POST['save_bobgo_enabled']) && belims_settings_verify_post('save_bobgo_enabled_action', 'bobgo_nonce', 'bobgo-shipping')) {
                        update_field('bobgo_enabled', isset($_POST['bobgo_enabled']) ? 1 : 0, 'option');
                        belims_settings_flash('success', 'BobGo settings saved.', 'bobgo-shipping');
                    }

                    $bobgo_enabled = get_field('bobgo_enabled', 'option');
                    ?>

                    <form method="post" action="">
                        <?php wp_nonce_field('save_bobgo_enabled_action', 'bobgo_nonce'); ?>

                        <div class="sb-toggle-line">
                            <input type="checkbox" class="sb-toggle" name="bobgo_enabled" value="1" <?php checked(1, $bobgo_enabled); ?> id="bobgo-enabled-toggle" />
                            <label for="bobgo-enabled-toggle">Enable Shipping Integration</label>
                        </div>

                        <div class="sb-actions">
                            <input type="submit" name="save_bobgo_enabled" class="button button-primary" value="Save Settings" />
                        </div>
                    </form>
                </div>

                <!-- BobGo Settings (shown only if enabled) -->
                <div id="bobgo-settings-section" <?php echo $bobgo_enabled ? '' : 'hidden'; ?> style="margin-top: 20px;">
                    <?php
                    if (function_exists('render_bobgo_shipping_settings_tab')) {
                        render_bobgo_shipping_settings_tab();
                    } else {
                        echo '<div class="sb-panel"><p>BobGo settings not available.</p></div>';
                    }
                    ?>
                </div>

                <script>
                jQuery(document).ready(function($) {
                    $('#bobgo-enabled-toggle').on('change', function() {
                        if ($(this).is(':checked')) {
                            $('#bobgo-settings-section').show();
                        } else {
                            $('#bobgo-settings-section').hide();
                        }
                    });
                });
                </script>
            </div>

            <!-- Payment Gateways Tab -->
            <div id="tab-payment-gateways" class="bpc-tab-content">
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">Payment Gateways</h2>
                    </div>
                    <p class="sb-intro">Configure payment gateway integrations.</p>

                    <div class="bpc-callout bpc-callout--warning">
                        <p style="margin: 0;">
                            <strong>💳 Payment Gateway Configuration:</strong><br>
                            Payment gateways are managed through WooCommerce settings.
                        </p>
                    </div>

                    <h3>Active Payment Methods:</h3>
                    <p>Configure your payment gateways through WooCommerce:</p>
                    <ul style="margin-left: 20px; list-style: disc;">
                        <li><strong>Direct Bank Transfer</strong></li>
                        <li><strong>Cash on Delivery</strong></li>
                        <li><strong>PayFast</strong> (South African payment gateway)</li>
                        <li><strong>PayGate</strong></li>
                        <li><strong>Other WooCommerce payment plugins</strong></li>
                    </ul>

                    <div class="sb-actions">
                        <a href="<?php echo admin_url('admin.php?page=wc-settings&tab=checkout'); ?>" class="button button-primary">
                            Go to Payment Settings
                        </a>
                        <a href="#tab-payfast-testing" class="button">
                            Open PayFast Testing Tools
                        </a>
                    </div>
                </div>
            </div>

            <!-- AI Services Tab -->
            <!-- Firebase Auth Tab -->
            <?php
            $fb_key_set  = (defined('BELIMS_FIREBASE_API_KEY') && BELIMS_FIREBASE_API_KEY !== '') || get_option('belims_firebase_api_key', '') !== '';
            $fb_jwt_set  = defined('JWT_AUTH_SECRET_KEY') && JWT_AUTH_SECRET_KEY !== '';
            ?>
            <div id="tab-firebase-auth" class="bpc-tab-content">
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">Firebase Auth</h2>
                    </div>
                    <p class="sb-intro">Phone OTP and Google sign-in on the storefront. Firebase verifies the user in the browser; the CMS exchanges the Firebase ID token for a WordPress JWT.</p>

                    <?php if (!$fb_key_set): ?>
                        <div class="bpc-callout bpc-callout--warning">
                            <strong>Server-side token verification is off.</strong> <code>BELIMS_FIREBASE_API_KEY</code> is not set, so <code>/auth/firebase-phone</code> accepts the phone number sent by the browser without verifying it with Firebase. Add the Firebase web API key to <code>wp-config.php</code>.
                        </div>
                    <?php endif; ?>

                    <div class="sb-summary">
                        <div class="sb-sum-key">Firebase API key</div>
                        <div class="sb-sum-val"><?php echo $fb_key_set ? '<span class="bpc-pill ok">Set</span>' : '<span class="bpc-pill error">Missing</span>'; ?></div>
                        <div class="sb-sum-key">JWT secret</div>
                        <div class="sb-sum-val"><?php echo $fb_jwt_set ? '<span class="bpc-pill ok">Set</span>' : '<span class="bpc-pill error">Missing</span>'; ?></div>
                        <div class="sb-sum-key">Endpoints</div>
                        <div class="sb-sum-val"><code>POST /auth/firebase-phone</code> · <code>POST /auth/firebase-google</code></div>
                    </div>

                    <div class="sb-actions">
                        <a class="button" href="https://console.firebase.google.com" target="_blank" rel="noopener">Firebase Console ↗</a>
                    </div>
                </div>
            </div>

            <div id="tab-ai-services" class="bpc-tab-content">
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">AI Services</h2>
                    </div>
                    <p class="sb-intro">Configure AI-powered features and integrations.</p>
                    <?php
                    $ai_enabled = function_exists('get_field') ? (bool) get_field('gemini_enabled', 'option') : false;
                    $ai_key = function_exists('get_field') ? get_field('gemini_api_key', 'option') : '';
                    $ai_key_set = !empty($ai_key);
                    ?>

                    <div class="bpc-callout bpc-callout--info">
                        <strong>🤖 AI Status:</strong><br>
                        Configure Gemini access for AI recommendations and assistants.
                    </div>

                    <div class="sb-actions" style="margin-bottom: 24px;">
                        <span class="sb-badge <?php echo $ai_enabled ? 'sb-badge-good' : 'sb-badge-off'; ?>">
                            Status: <?php echo $ai_enabled ? 'Enabled' : 'Disabled'; ?>
                        </span>
                        <span class="sb-badge <?php echo $ai_key_set ? 'sb-badge-good' : 'sb-badge-error'; ?>">
                            API Key: <?php echo $ai_key_set ? 'Set' : 'Missing'; ?>
                        </span>
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

            <!-- Homepage Tab -->
            <?php require GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/admin-homepage-tab.php'; ?>

            <!-- Media Tab -->
            <?php require GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/admin-media-tab.php'; ?>

            <!-- PayFast Testing Tab -->
            <div id="tab-payfast-testing" class="bpc-tab-content">
                <div class="sb-panel">
                    <div class="sb-panel-title">
                        <h2 class="bpc-card-title">PayFast Payment Testing</h2>
                    </div>
                    <p class="sb-intro">Test PayFast payment flows without placing real orders.</p>

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
