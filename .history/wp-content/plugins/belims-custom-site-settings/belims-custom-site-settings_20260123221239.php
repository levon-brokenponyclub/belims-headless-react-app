<?php
/**
 * Plugin Name: Belims - Custom Site Settings
 * Plugin URI: https://belims.co.za
 * Description: Custom site settings and functionality for Belims Hardware Store. Provides ACF field groups, helper functions, and REST API endpoints for headless integration.
 * Version: 1.0.0
 * Author: Belims Team & Co Pilot
 * License: GPL v2 or later
 * Text Domain: belims-settings
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BELIMS_SETTINGS_VERSION', '1.0.0');
define('BELIMS_SETTINGS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BELIMS_SETTINGS_PLUGIN_URL', plugin_dir_url(__FILE__));

class BelimsCustomSiteSettings {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('acf/init', array($this, 'load_acf_fields'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('belims-settings', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Include helper functions
        require_once BELIMS_SETTINGS_PLUGIN_DIR . 'includes/helper-functions.php';
        require_once BELIMS_SETTINGS_PLUGIN_DIR . 'includes/rest-api.php';
        require_once BELIMS_SETTINGS_PLUGIN_DIR . 'includes/admin-notices.php';
        
        // Enqueue admin scripts
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Register options page if ACF is active
        if (function_exists('acf_add_options_page')) {
            $this->register_options_page();
        } else {
            add_action('admin_notices', array($this, 'acf_missing_notice'));
        }
    }
    
    public function load_acf_fields() {
        if (function_exists('acf_add_local_field_group')) {
            require_once BELIMS_SETTINGS_PLUGIN_DIR . 'includes/acf-field-groups.php';
        }
    }
    
    public function register_options_page() {
        // Add main menu page with custom rendering
        add_menu_page(
            __('Site Settings', 'belims-settings'),
            __('Site Settings', 'belims-settings'),
            'manage_options',
            'belims-site-settings',
            array($this, 'render_admin_page'),
            'dashicons-admin-settings',
            30
        );
    }
    
    public function acf_missing_notice() {
        echo '<div class="notice notice-error"><p>';
        echo __('Belims Custom Site Settings requires Advanced Custom Fields plugin to be installed and activated.', 'belims-settings');
        echo '</p></div>';
    }

    public function enqueue_admin_scripts($hook) {
        // Only load on our settings page
        if ('toplevel_page_belims-site-settings' !== $hook) {
            return;
        }

        wp_enqueue_style(
            'belims-admin-style',
            plugins_url('assets/admin-style.css', __FILE__),
            array(),
            BELIMS_SETTINGS_VERSION
        );

        wp_enqueue_script(
            'belims-admin-script',
            plugins_url('assets/admin-script.js', __FILE__),
            array('jquery'),
            BELIMS_SETTINGS_VERSION,
            true
        );
    }

    public function render_admin_page() {
        // Define our tabs
        $tabs = array(
            'branding' => array(
                'title' => __('Branding & Identity', 'belims-settings'),
                'group' => 'group_belims_branding'
            ),
            'contact' => array(
                'title' => __('Contact Information', 'belims-settings'),
                'group' => 'group_belims_contact'
            ),
            'ecommerce' => array(
                'title' => __('E-commerce Settings', 'belims-settings'),
                'group' => 'group_belims_ecommerce'
            ),
            'notifications' => array(
                'title' => __('Notifications', 'belims-settings'),
                'group' => 'group_belims_notifications'
            ),
            'ai_features' => array(
                'title' => __('AI Features', 'belims-settings'),
                'group' => 'group_belims_ai_features'
            ),
            'apis' => array(
                'title' => __('APIs', 'belims-settings'),
                'group' => 'group_belims_apis'
            )
        );

        // Get current tab
        $current_tab = isset($_GET['tab']) ? sanitize_key($_GET['tab']) : 'branding';
        
        // Ensure current tab exists
        if (!array_key_exists($current_tab, $tabs)) {
            $current_tab = 'branding';
        }

        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <div class="belims-admin-container">
                <nav class="belims-tab-nav">
                    <ul>
                        <?php foreach ($tabs as $tab_key => $tab): ?>
                            <li class="<?php echo $tab_key === $current_tab ? 'active' : ''; ?>">
                                <a href="<?php echo esc_url(admin_url('admin.php?page=belims-site-settings&tab=' . $tab_key)); ?>">
                                    <?php echo esc_html($tab['title']); ?>
                                </a>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </nav>
                
                <main class="belims-tab-content">
                    <div class="belims-content-header">
                        <h2><?php echo esc_html($tabs[$current_tab]['title']); ?></h2>
                    </div>
                    
                    <div class="belims-form-container">
                        <?php
                        // Render ACF fields for the current group
                        if (function_exists('acf_form')):
                            acf_form(array(
                                'id' => 'belims-settings-form',
                                'post_id' => 'option',
                                'field_groups' => array($tabs[$current_tab]['group']),
                                'form' => true,
                                'return' => add_query_arg('updated', 'true', wp_get_referer()),
                                'html_submit_button' => '<input type="submit" class="button-primary" value="' . __('Save Settings', 'belims-settings') . '" />',
                                'submit_value' => __('Save Settings', 'belims-settings'),
                                'updated_message' => __('Settings updated successfully!', 'belims-settings'),
                                'instruction_placement' => 'label'
                            ));
                        endif;
                        ?>
                    </div>
                </main>
            </div>
        </div>
        <?php
    }
    
    public function activate() {
        // Flush rewrite rules on activation
        flush_rewrite_rules();
        
        // Create default options if they don't exist
        $this->create_default_options();
    }
    
    public function deactivate() {
        // Flush rewrite rules on deactivation
        flush_rewrite_rules();
    }
    
    private function create_default_options() {
        $defaults = array(
            'company_name' => 'Belims Hardware',
            'currency_symbol' => 'R',
            'free_shipping_threshold' => 1000,
            'delivery_fee' => 150,
            'express_delivery_fee' => 300,
            'notification_enabled' => true,
            'notification_message' => 'Free shipping with R1,000 purchase. <a href="#">Shop Now →</a>'
        );
        
        foreach ($defaults as $key => $value) {
            if (!get_field($key, 'option')) {
                update_field($key, $value, 'option');
            }
        }
    }
}

// Initialize the plugin
new BelimsCustomSiteSettings();