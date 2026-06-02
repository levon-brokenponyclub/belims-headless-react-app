<?php
/**
 * Ecommerce Policies Admin Page
 * 
 * Manages ecommerce policies displayed on product pages
 * 
 * @package Global_Site_Settings
 */

if (!defined('ABSPATH')) exit;

class Ecommerce_Policies_Admin {
    
    /**
     * Initialize the class
     */
    public function __construct() {
        // Remove standalone admin menu - now integrated into Site Settings
        // add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('rest_api_init', array($this, 'register_rest_endpoint'));
    }
    
    /**
     * Add admin menu under Settings (DISABLED - now in Site Settings plugin)
     */
    public function add_admin_menu() {
        // Disabled - integrated into main Site Settings page
        /*
        add_options_page(
            'Ecommerce Policies',
            'Ecommerce',
            'manage_options',
            'ecommerce-policies',
            array($this, 'render_admin_page')
        );
        */
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('ecommerce_policies_group', 'ecommerce_return_policy');
        register_setting('ecommerce_policies_group', 'ecommerce_change_of_mind');
        register_setting('ecommerce_policies_group', 'ecommerce_warranty');
        register_setting('ecommerce_policies_group', 'ecommerce_shipping');
    }
    
    /**
     * Register REST API endpoint
     */
    public function register_rest_endpoint() {
        register_rest_route('belims/v1', '/ecommerce-policies', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_policies'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Get policies via REST API
     */
    public function get_policies() {
        return array(
            'return_policy' => get_option('ecommerce_return_policy', ''),
            'change_of_mind' => get_option('ecommerce_change_of_mind', ''),
            'warranty' => get_option('ecommerce_warranty', ''),
            'shipping' => get_option('ecommerce_shipping', ''),
        );
    }
    
    /**
     * Render admin page
     */
    public function render_admin_page() {
        // Check user permissions
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Save settings if form submitted
        if (isset($_POST['ecommerce_policies_submit'])) {
            check_admin_referer('ecommerce_policies_nonce');
            
            update_option('ecommerce_return_policy', wp_kses_post($_POST['return_policy']));
            update_option('ecommerce_change_of_mind', wp_kses_post($_POST['change_of_mind']));
            update_option('ecommerce_warranty', wp_kses_post($_POST['warranty']));
            update_option('ecommerce_shipping', wp_kses_post($_POST['shipping']));
            
            echo '<div class="notice notice-success is-dismissible"><p>Policies saved successfully!</p></div>';
        }
        
        // Get current values
        $return_policy = get_option('ecommerce_return_policy', '');
        $change_of_mind = get_option('ecommerce_change_of_mind', '');
        $warranty = get_option('ecommerce_warranty', '');
        $shipping = get_option('ecommerce_shipping', '');
        
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <p class="description">Manage ecommerce policies displayed on product pages. These will appear in the accordion sections on single product pages.</p>
            
            <form method="post" action="">
                <?php wp_nonce_field('ecommerce_policies_nonce'); ?>
                
                <div style="max-width: 900px; margin-top: 30px;">
                    
                    <!-- 15-Days Return Policy -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">📦</span> 15-Days Return Policy
                        </h2>
                        <p class="description">Describe your 15-day return policy including conditions and process.</p>
                        <?php
                        wp_editor(
                            $return_policy,
                            'return_policy',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>
                    
                    <!-- Change of Mind Return -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🔄</span> Change of Mind Return
                        </h2>
                        <p class="description">Explain your change of mind return policy and any applicable fees.</p>
                        <?php
                        wp_editor(
                            $change_of_mind,
                            'change_of_mind',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>
                    
                    <!-- Warranty -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🛡️</span> Warranty
                        </h2>
                        <p class="description">Detail your warranty coverage, duration, and claim process.</p>
                        <?php
                        wp_editor(
                            $warranty,
                            'warranty',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>
                    
                    <!-- Delivery and Shipping -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🚚</span> Delivery and Shipping
                        </h2>
                        <p class="description">Outline delivery times, shipping costs, and tracking information.</p>
                        <?php
                        wp_editor(
                            $shipping,
                            'shipping',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>
                    
                    <?php submit_button('Save Policies', 'primary', 'ecommerce_policies_submit'); ?>
                    
                </div>
            </form>
            
            <!-- API Info -->
            <div style="max-width: 900px; margin-top: 40px; padding: 20px; background: #f0f6fc; border-left: 4px solid #2271b1; border-radius: 4px;">
                <h3 style="margin-top: 0;">📡 REST API Endpoint</h3>
                <p>These policies are available via the REST API:</p>
                <code style="background: #fff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin: 10px 0;">
                    GET <?php echo rest_url('belims/v1/ecommerce-policies'); ?>
                </code>
                <p class="description">The frontend automatically fetches and displays these policies on product pages.</p>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render inline content for Site Settings plugin integration
     */
    public function render_inline_content() {
        // Check user permissions
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Save settings if form submitted
        if (isset($_POST['ecommerce_policies_submit'])) {
            check_admin_referer('ecommerce_policies_nonce');
            
            update_option('ecommerce_return_policy', wp_kses_post($_POST['return_policy']));
            update_option('ecommerce_change_of_mind', wp_kses_post($_POST['change_of_mind']));
            update_option('ecommerce_warranty', wp_kses_post($_POST['warranty']));
            update_option('ecommerce_shipping', wp_kses_post($_POST['shipping']));
            
            echo '<div class="notice notice-success is-dismissible"><p>Policies saved successfully!</p></div>';
        }
        
        // Get current values
        $return_policy = get_option('ecommerce_return_policy', '');
        $change_of_mind = get_option('ecommerce_change_of_mind', '');
        $warranty = get_option('ecommerce_warranty', '');
        $shipping = get_option('ecommerce_shipping', '');
        
        ?>
        <div class="bpc-card">
            <div class="bpc-card-header">
                <h2 class="bpc-card-title">Ecommerce Policies</h2>
                <p class="bpc-card-description">Manage ecommerce policies displayed on product pages. These will appear in the accordion sections on single product pages.</p>
            </div>
            
            <form method="post" action="">
                <?php wp_nonce_field('ecommerce_policies_nonce'); ?>
                
                <!-- 15-Days Return Policy -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">📦</span> 15-Days Return Policy
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Describe your 15-day return policy including conditions and process.</p>
                    <?php
                    wp_editor(
                        $return_policy,
                        'return_policy',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>
                
                <!-- Change of Mind Return -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🔄</span> Change of Mind Return
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Explain your change of mind return policy and any applicable fees.</p>
                    <?php
                    wp_editor(
                        $change_of_mind,
                        'change_of_mind',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>
                
                <!-- Warranty -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🛡️</span> Warranty
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Detail your warranty coverage, duration, and claim process.</p>
                    <?php
                    wp_editor(
                        $warranty,
                        'warranty',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>
                
                <!-- Delivery and Shipping -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🚚</span> Delivery and Shipping
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Outline delivery times, shipping costs, and tracking information.</p>
                    <?php
                    wp_editor(
                        $shipping,
                        'shipping',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>
                
                <div style="margin-top: 30px;">
                    <?php submit_button('Save Policies', 'primary large', 'ecommerce_policies_submit'); ?>
                </div>
            </form>
            
            <!-- API Info -->
            <div style="margin-top: 40px; padding: 20px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #1e40af; font-size: 15px; font-weight: 600;">📡 REST API Endpoint</h3>
                <p style="margin-bottom: 10px; color: #1f2937;">These policies are available via the REST API:</p>
                <code style="background: #fff; padding: 10px 16px; border-radius: 4px; display: inline-block; margin: 10px 0; color: #059669; border: 1px solid #d1d5db;">
                    GET <?php echo rest_url('belims/v1/ecommerce-policies'); ?>
                </code>
                <p class="description" style="color: #6b7280;">The frontend automatically fetches and displays these policies on product pages.</p>
            </div>
        </div>
        <?php
    }
}

// Initialize the class
new Ecommerce_Policies_Admin();
