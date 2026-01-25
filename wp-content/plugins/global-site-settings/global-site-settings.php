<?php
/**
 * Plugin Name: Global Site Settings
 * Plugin URI: https://belims.co.za
 * Description: Unified plugin for Belims site settings, ACF field groups, REST API endpoints, and third-party integrations (WooCommerce, FTG, BobGo, AI).
 * Version: 2.1.0
 * Author: Belims Team & Co Pilot
 * Author URI: https://belims.co.za
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: global-site-settings
 * Domain Path: /languages
 */

if (!defined('ABSPATH')) exit;

define('GLOBAL_SITE_SETTINGS_VERSION', '2.1.0');
define('GLOBAL_SITE_SETTINGS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GLOBAL_SITE_SETTINGS_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Handle OPTIONS preflight requests FIRST (before WordPress does anything)
 */
add_action('init', function() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: https://belims-headless-react-app.netlify.app');
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
    // Hardcoded for production reliability - change this if needed
    header('Access-Control-Allow-Origin: https://belims-headless-react-app.netlify.app');
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
        'includes/class-orders-endpoint.php',
        // FTG Sync integration
        'includes/ftg-sync/class-ftg-api.php',
        'includes/ftg-sync/class-ftg-sync-endpoint.php',
        // BobGo Shipping integration
        'includes/bobgo-shipping/class-bobgo-api.php',
        // 'includes/bobgo-shipping/class-bobgo-shipping-method.php', // Disabled - using official BobGo plugin for rates
        'includes/bobgo-shipping/class-bobgo-order-handler.php',
        'includes/bobgo-shipping/class-bobgo-webhook-endpoint.php',
        'includes/bobgo-shipping/class-bobgo-shipping-rates-endpoint.php', // REST endpoint for headless frontend
    ];
    foreach ($files as $file) {
        $path = GLOBAL_SITE_SETTINGS_PLUGIN_DIR . $file;
        if (file_exists($path)) require_once $path;
    }

    add_action('rest_api_init', 'global_site_settings_register_endpoints');
}
add_action('plugins_loaded', 'global_site_settings_init');

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
    
    $environment = get_option('bobgo_environment', 'sandbox');
    $api_token = get_option('bobgo_api_token', '');
    
    if (empty($api_token)) {
        wp_send_json_error('API token is not configured');
        return;
    }
    
    $base_url = ($environment === 'production') 
        ? 'https://api.bobgo.co.za/v2/' 
        : 'https://api.sandbox.bobgo.co.za/v2/';
    
    // Test connection by fetching webhooks (simple endpoint that doesn't require data)
    $response = wp_remote_get($base_url . 'webhooks', array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $api_token,
            'Accept' => 'application/json',
        ),
        'timeout' => 15,
    ));
    
    if (is_wp_error($response)) {
        wp_send_json_error('Connection failed: ' . $response->get_error_message());
        return;
    }
    
    $status_code = wp_remote_retrieve_response_code($response);
    
    if ($status_code === 200 || $status_code === 401) {
        // 200 = authenticated success, 401 = connection works but auth failed
        if ($status_code === 401) {
            wp_send_json_error('Invalid API token');
        } else {
            wp_send_json_success('Connected to BobGo ' . ucfirst($environment) . ' successfully!');
        }
    } else {
        wp_send_json_error('Unexpected response code: ' . $status_code);
    }
}

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
        'Belims_Orders_Endpoint',
        'Belims_FTG_Sync_Endpoint',
    ];
    foreach ($classes as $class) {
        if (class_exists($class)) {
            $instance = new $class();
            if (method_exists($instance, 'register_routes')) $instance->register_routes();
        }
    }
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
    ?>
    <div id="bpc-admin-root">
        <!-- Sidebar Navigation -->
        <div class="bpc-admin-sidebar">
            <div class="bpc-admin-logo">
                <h2>
                    <span class="dashicons dashicons-admin-settings" style="font-size: 24px;"></span>
                    Site Settings
                </h2>
            </div>
            <nav class="bpc-admin-nav">
                <div class="bpc-nav-group-title">Overview</div>
                <a class="bpc-nav-item" data-tab="dashboard">
                    <span class="dashicons dashicons-dashboard"></span>
                    Dashboard
                </a>
                
                <div class="bpc-nav-group-title">Settings</div>
                <a class="bpc-nav-item" data-tab="branding">
                    <span class="dashicons dashicons-art"></span>
                    Branding
                </a>
                <a class="bpc-nav-item" data-tab="contact">
                    <span class="dashicons dashicons-email"></span>
                    Contact
                </a>
                <a class="bpc-nav-item" data-tab="ecommerce">
                    <span class="dashicons dashicons-cart"></span>
                    E-commerce
                </a>
                
                <div class="bpc-nav-group-title">Integrations</div>
                <a class="bpc-nav-item" data-tab="ftg-sync">
                    <span class="dashicons dashicons-update"></span>
                    FTG Sync
                </a>
                <?php /* BobGo Shipping - Commented out, using official BobGo plugin for admin UI
                <a class="bpc-nav-item" data-tab="bobgo-shipping">
                    <span class="dashicons dashicons-cart"></span>
                    BobGo Shipping
                </a>
                */ ?>
                <a class="bpc-nav-item" data-tab="apis">
                    <span class="dashicons dashicons-admin-network"></span>
                    APIs
                </a>
            </nav>
            
            <div style="padding: 20px; border-top: 1px solid var(--bpc-border); margin-top: auto; color: var(--bpc-text-muted); font-size: 12px;">
                Version <?php echo GLOBAL_SITE_SETTINGS_VERSION; ?>
            </div>
        </div>

        <!-- Main Content -->
        <div class="bpc-admin-content">
            <!-- Dashboard Tab -->
            <div id="tab-dashboard" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">Welcome to Site Settings</h2>
                        <p class="bpc-card-description">Overview of your headless CMS status and content.</p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                        <div class="bpc-stat-card">
                            <div class="bpc-stat-icon">
                                <span class="dashicons dashicons-rest-api"></span>
                            </div>
                            <div>
                                <div style="font-size: 14px; color: var(--bpc-text-muted); margin-bottom: 4px;">REST API</div>
                                <div style="font-size: 18px; font-weight: 600; color: #10b981;">Active & Healthy</div>
                            </div>
                        </div>
                        
                        <div class="bpc-stat-card">
                            <div class="bpc-stat-icon">
                                <span class="dashicons dashicons-admin-settings"></span>
                            </div>
                            <div>
                                <div style="font-size: 14px; color: var(--bpc-text-muted); margin-bottom: 4px;">CMS Mode</div>
                                <div style="font-size: 18px; font-weight: 600;">Headless Optimized</div>
                            </div>
                        </div>
                    </div>
                    
                    <h3>Active Integrations</h3>
                    <ul>
                        <li><strong>Find The Gap (FTG):</strong> Product sync integration</li>
                        <li><strong>WooCommerce:</strong> E-commerce platform</li>
                        <li><strong>REST API:</strong> Headless content delivery</li>
                        <li><strong>AI Services:</strong> Coming soon</li>
                    </ul>
                    
                    <h3>Quick Actions</h3>
                    <p>
                        <button class="bpc-btn-primary" onclick="jQuery('.bpc-nav-item[data-tab=\'ftg-sync\']').click()">
                            Go to FTG Sync
                        </button>
                        <button class="bpc-btn-primary" onclick="jQuery('.bpc-nav-item[data-tab=\'apis\']').click()">
                            Configure APIs
                        </button>
                        <button class="bpc-btn-primary" onclick="jQuery('.bpc-nav-item[data-tab=\'api-logs\']').click()">
                            View API Endpoints
                        </button>
                    </p>
                </div>
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
                                    ✅ Test Sync (5 Products)
                                </button>
                                <button type="button" id="ftg-sync-products" class="button button-primary" style="margin-right: 10px;">
                                    🔄 Sync All Products
                                </button>
                                <button type="button" id="ftg-disconnect" class="button button-secondary" style="margin-left: 10px; color: var(--belims-red) !important; border-color: var(--belims-red) !important;">
                                    🔌 Disconnect FTG
                                </button>
                                <div id="ftg-sync-status" style="margin-top: 15px;"></div>
                            </div>
                            
                            <script>
                            jQuery(document).ready(function($) {
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
                                    if (!confirm('Test sync 5 products from FTG?')) return;
                                    
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    
                                    btn.prop('disabled', true).text('Testing...');
                                    status.html('<p>⏳ Syncing 5 test products from FTG...</p>');
                                    
                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                                        method: 'POST',
                                        data: JSON.stringify({
                                            collection_token: '<?php echo esc_js($ftg_token); ?>',
                                            limit: 5
                                        }),
                                        contentType: 'application/json',
                                        timeout: 60000,
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('🧪 Test Sync (5 Products)');
                                            if (response.success) {
                                                var skippedMsg = response.skipped > 0 ? '<br/><span style="color: #856404;">⚠️ Skipped ' + response.skipped + ' products (no price/invalid data)</span>' : '';
                                                status.html('<div class="notice notice-success inline"><p>✅ Test sync completed! ' + response.synced + ' products synced.' + skippedMsg + '<br/>Check WooCommerce → Products to see the imported items.</p></div>');
                                            } else {
                                                var message = response.message || 'Unknown error';
                                                var errors = response.errors?.slice(0, 3).join('<br/>') || '';
                                                status.html('<div class="notice notice-warning inline"><p>⚠️ ' + message + (errors ? '<br/>' + errors : '') + '</p></div>');
                                            }
                                        },
                                        error: function(xhr) {
                                            btn.prop('disabled', false).text('🧪 Test Sync (5 Products)');
                                            var errorMsg = xhr.responseJSON?.message || 'Sync failed';
                                            status.html('<div class="notice notice-error inline"><p>❌ ' + errorMsg + '</p></div>');
                                        }
                                    });
                                });
                                
                                $('#ftg-sync-products').on('click', function() {
                                    if (!confirm('Start FULL FTG product sync? This may take several minutes and will sync ALL products.')) return;
                                    
                                    var btn = $(this);
                                    var status = $('#ftg-sync-status');
                                    
                                    btn.prop('disabled', true).text('Syncing...');
                                    status.html('<p>⏳ Syncing products from FTG...</p>');
                                    
                                    $.ajax({
                                        url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                                        method: 'POST',
                                        data: JSON.stringify({
                                            collection_token: '<?php echo esc_js($ftg_token); ?>',
                                            limit: 500
                                        }),
                                        contentType: 'application/json',
                                        beforeSend: function(xhr) {
                                            xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                                        },
                                        success: function(response) {
                                            btn.prop('disabled', false).text('🔄 Sync All Products');
                                            if (response.success) {
                                                var skippedMsg = response.skipped > 0 ? ' (' + response.skipped + ' skipped)' : '';
                                                status.html('<div class="notice notice-success inline"><p>✅ Full sync completed! ' + response.synced + ' products synced' + skippedMsg + '.</p></div>');
                                                location.reload();
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
                        <p class="bpc-card-description">Configure your site's branding elements.</p>
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

            <!-- Contact Tab -->
            <div id="tab-contact" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">Contact Information</h2>
                        <p class="bpc-card-description">Manage your contact details and social links.</p>
                    </div>
                    <?php 
                    if (function_exists('acf_form')) {
                        acf_form(array(
                            'post_id'    => 'options',
                            'field_groups' => array('group_belims_contact'),
                            'return'     => '',
                            'submit_value' => 'Save Contact Settings',
                        ));
                    } else {
                        echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
                    }
                    ?>
                </div>
            </div>

            <!-- E-commerce Tab -->
            <div id="tab-ecommerce" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">E-commerce Settings</h2>
                        <p class="bpc-card-description">Configure WooCommerce and payment settings.</p>
                    </div>
                    <?php 
                    if (function_exists('acf_form')) {
                        acf_form(array(
                            'post_id'    => 'options',
                            'field_groups' => array('group_belims_ecommerce'),
                            'return'     => '',
                            'submit_value' => 'Save E-commerce Settings',
                        ));
                    } else {
                        echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
                    }
                    ?>
                </div>
            </div>

            <!-- APIs Tab -->
            <div id="tab-apis" class="bpc-tab-content">
                <div class="bpc-card">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">API Settings</h2>
                        <p class="bpc-card-description">Configure CORS for your headless frontend and third-party API credentials.</p>
                    </div>
                    
                    <?php 
                    // Debug: Show current CORS setting being used
                    $cors_field = function_exists('get_field') ? get_field('headless_frontend_url', 'option') : '';
                    $cors_option = get_option('belims_cors_origin', '');
                    $active_cors = !empty($cors_field) ? $cors_field : $cors_option;
                    
                    if (!empty($active_cors) || !empty($cors_field) || !empty($cors_option)) {
                        echo '<div style="background: #f0f6fc; border-left: 4px solid #0969da; padding: 12px 16px; margin-bottom: 20px; border-radius: 6px;">';
                        echo '<strong style="color: #0969da;">Current Active CORS Setting:</strong><br>';
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
                        acf_form(array(
                            'post_id'    => 'options',
                            'field_groups' => array('group_belims_apis'),
                            'return'     => '',
                            'submit_value' => 'Save API & CORS Settings',
                        ));
                    } else {
                        echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
                    }
                    ?>
                </div>

                <!-- API Verification & Documentation Card -->
                <div class="bpc-card" style="margin-top: 20px;">
                    <div class="bpc-card-header">
                        <h2 class="bpc-card-title">API Verification & Documentation</h2>
                        <p class="bpc-card-description">Test your API endpoints and verify CORS configuration.</p>
                    </div>

                    <div style="display: flex; gap: 15px; margin-bottom: 25px;">
                        <button type="button" id="test-api-endpoints-consolidated" class="bpc-btn-primary">
                            <span class="dashicons dashicons-rest-api" style="margin-top: 3px;"></span> Test Endpoints
                        </button>
                        <button type="button" id="test-cors-config" class="button button-secondary">
                            <span class="dashicons dashicons-shield" style="margin-top: 3px;"></span> Verify CORS
                        </button>
                    </div>
                    
                    <div id="api-verification-results" style="margin-top: 15px;"></div>
                    
                    <h3 style="margin-top: 30px;">Quick Documentation:</h3>
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

                    <script>
                    jQuery(document).ready(function($) {
                        // Test API Endpoints
                        $('#test-api-endpoints-consolidated').on('click', function() {
                            var btn = $(this);
                            var results = $('#api-verification-results');
                            
                            btn.prop('disabled', true).html('Testing...');
                            results.html('<p>🔄 Testing production endpoints...</p>');
                            
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

                        // Verify CORS Config
                        $('#test-cors-config').on('click', function() {
                            var btn = $(this);
                            var results = $('#api-verification-results');
                            var testOrigin = prompt("Enter a frontend URL to simulate a request from:", "https://belims-headless-react-app.netlify.app");
                            
                            if (!testOrigin) return;

                            btn.prop('disabled', true).html('Verifying...');
                            results.html('<p>🛡️ Verifying CORS headers for origin: <code>' + testOrigin + '</code>...</p>');

                            $.ajax({
                                url: '<?php echo rest_url('belims/v1/products'); ?>',
                                method: 'OPTIONS', // Simulated preflight
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
        </div>
    </div>
    <?php
}

/**
 * Activation / Deactivation hooks
 */
function global_site_settings_activate() { flush_rewrite_rules(); }
register_activation_hook(__FILE__, 'global_site_settings_activate');

function global_site_settings_deactivate() { flush_rewrite_rules(); }
register_deactivation_hook(__FILE__, 'global_site_settings_deactivate');
