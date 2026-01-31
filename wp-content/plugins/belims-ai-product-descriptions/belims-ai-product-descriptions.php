<?php
/**
 * Plugin Name: Belims AI Product Descriptions
 * Plugin URI: https://belimshardware.com
 * Description: Generate AI-powered product descriptions using Google Gemini API directly from WooCommerce product admin
 * Version: 1.0.0
 * Author: Belims Hardware
 * Author URI: https://belimshardware.com
 * Text Domain: belims-ai-descriptions
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BELIMS_AI_DESC_VERSION', '1.0.0');
define('BELIMS_AI_DESC_PATH', plugin_dir_path(__FILE__));
define('BELIMS_AI_DESC_URL', plugin_dir_url(__FILE__));

class Belims_AI_Product_Descriptions {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Check if WooCommerce is active
        if (!$this->is_woocommerce_active()) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
        
        // Initialize hooks
        add_action('add_meta_boxes', array($this, 'add_product_meta_box'));
        add_action('wp_ajax_belims_generate_ai_description', array($this, 'ajax_generate_description'));
        add_action('wp_ajax_belims_bulk_generate_description', array($this, 'ajax_bulk_generate_description'));
        add_action('wp_ajax_belims_get_products_without_description', array($this, 'ajax_get_products_without_description'));
        add_action('wp_ajax_belims_dry_run_generate_description', array($this, 'ajax_dry_run_generate_description'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Add settings and bulk pages
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_menu', array($this, 'add_bulk_generator_page'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Check if WooCommerce is active
     */
    private function is_woocommerce_active() {
        return class_exists('WooCommerce');
    }
    
    /**
     * Display notice if WooCommerce is not active
     */
    public function woocommerce_missing_notice() {
        ?>
        <div class="notice notice-error">
            <p><?php _e('Belims AI Product Descriptions requires WooCommerce to be installed and active.', 'belims-ai-descriptions'); ?></p>
        </div>
        <?php
    }
    
    /**
     * Add meta box to product edit screen
     */
    public function add_product_meta_box() {
        add_meta_box(
            'belims_ai_description_meta_box',
            __('AI Product Description Generator', 'belims-ai-descriptions'),
            array($this, 'render_meta_box'),
            'product',
            'side',
            'high'
        );
    }
    
    /**
     * Render the meta box content
     */
    public function render_meta_box($post) {
        $product = wc_get_product($post->ID);
        
        if (!$product) {
            echo '<p>' . __('Invalid product.', 'belims-ai-descriptions') . '</p>';
            return;
        }
        
        wp_nonce_field('belims_ai_generate_description', 'belims_ai_nonce');
        
        ?>
        <div id="belims-ai-description-generator">
            <p class="description">
                <?php _e('Generate an AI-powered product description using Google Gemini.', 'belims-ai-descriptions'); ?>
            </p>
            
            <div class="belims-ai-controls">
                <button type="button" id="belims-generate-ai-desc-btn" class="button button-primary button-large">
                    <span class="dashicons dashicons-superhero"></span>
                    <?php _e('Generate AI Description', 'belims-ai-descriptions'); ?>
                </button>
                
                <button type="button" id="belims-apply-ai-desc-btn" class="button button-secondary" style="display:none;">
                    <span class="dashicons dashicons-yes-alt"></span>
                    <?php _e('Apply to Product', 'belims-ai-descriptions'); ?>
                </button>
            </div>
            
            <div id="belims-ai-loading" style="display:none;">
                <p>
                    <span class="spinner is-active" style="float:none;"></span>
                    <?php _e('Generating description...', 'belims-ai-descriptions'); ?>
                </p>
            </div>
            
            <div id="belims-ai-result" style="display:none; margin-top: 15px;">
                <h4><?php _e('Generated Description:', 'belims-ai-descriptions'); ?></h4>
                <div id="belims-ai-description-preview" style="padding: 10px; background: #f9f9f9; border-left: 3px solid #2271b1; margin-bottom: 10px;">
                </div>
            </div>
            
            <div id="belims-ai-error" style="display:none; margin-top: 15px;">
                <div class="notice notice-error inline">
                    <p id="belims-ai-error-message"></p>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * AJAX handler for generating AI descriptions
     */
    public function ajax_generate_description() {
        check_ajax_referer('belims_ai_generate_description', 'nonce');
        
        if (!current_user_can('edit_products')) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to perform this action.', 'belims-ai-descriptions')
            ));
        }
        
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        if (!$product_id) {
            wp_send_json_error(array(
                'message' => __('Invalid product ID.', 'belims-ai-descriptions')
            ));
        }
        
        $product = wc_get_product($product_id);
        
        if (!$product) {
            wp_send_json_error(array(
                'message' => __('Product not found.', 'belims-ai-descriptions')
            ));
        }
        
        // Get API key from settings
        $api_key = get_option('belims_ai_gemini_api_key');
        
        if (empty($api_key)) {
            wp_send_json_error(array(
                'message' => __('Gemini API key not configured. Please configure it in Settings > AI Descriptions.', 'belims-ai-descriptions')
            ));
        }
        
        // Generate description using Gemini API
        $description = $this->generate_gemini_description($product, $api_key);
        
        if (is_wp_error($description)) {
            wp_send_json_error(array(
                'message' => $description->get_error_message()
            ));
        }
        
        wp_send_json_success(array(
            'description' => $description,
            'product_id' => $product_id
        ));
    }
    
    /**
     * Generate product description using Gemini API
     */
    private function generate_gemini_description($product, $api_key) {
        $product_name = $product->get_name();
        $category = '';
        $brand = '';
        $features = array();
        
        // Get category
        $categories = $product->get_category_ids();
        if (!empty($categories)) {
            $category_obj = get_term($categories[0], 'product_cat');
            if ($category_obj && !is_wp_error($category_obj)) {
                $category = $category_obj->name;
            }
        }
        
        // Get brand (if you have a brand taxonomy or attribute)
        $attributes = $product->get_attributes();
        if (isset($attributes['brand'])) {
            $brand = $product->get_attribute('brand');
        } elseif (isset($attributes['pa_brand'])) {
            $brand = $product->get_attribute('pa_brand');
        }
        
        // Get features from short description or attributes
        $short_desc = $product->get_short_description();
        if (!empty($short_desc)) {
            $features[] = wp_strip_all_tags($short_desc);
        }
        
        // Build prompt for Gemini
        $prompt = "Write a compelling, SEO-optimized product description (approximately 100 words) for: {$product_name}.";
        
        if (!empty($features)) {
            $prompt .= " Key features: " . implode(', ', $features) . ".";
        }
        
        if (!empty($brand)) {
            $prompt .= " Brand: {$brand}.";
        }
        
        if (!empty($category)) {
            $prompt .= " Category: {$category}.";
        }
        
        $prompt .= " Tone: Professional, encouraging, and authoritative for a hardware store.";
        
        // Call Gemini API
        $response = wp_remote_post('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' . $api_key, array(
            'headers' => array(
                'Content-Type' => 'application/json',
            ),
            'body' => json_encode(array(
                'contents' => array(
                    array(
                        'parts' => array(
                            array('text' => $prompt)
                        )
                    )
                ),
                'generationConfig' => array(
                    'temperature' => 0.7,
                    'maxOutputTokens' => 500
                )
            )),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            return new WP_Error('api_error', __('Failed to connect to Gemini API: ', 'belims-ai-descriptions') . $response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (isset($data['error'])) {
            return new WP_Error('api_error', __('Gemini API Error: ', 'belims-ai-descriptions') . $data['error']['message']);
        }
        
        if (!isset($data['candidates'][0]['content']['parts'][0]['text'])) {
            return new WP_Error('api_error', __('Invalid response from Gemini API.', 'belims-ai-descriptions'));
        }
        
        $generated_description = $data['candidates'][0]['content']['parts'][0]['text'];
        
        return $generated_description;
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        global $post_type;
        
        // Load on product edit pages
        $is_product_page = ('post.php' === $hook || 'post-new.php' === $hook) && 'product' === $post_type;
        
        // Load on bulk generator page
        $is_bulk_page = isset($_GET['page']) && $_GET['page'] === 'belims-bulk-ai-descriptions';
        
        if ($is_product_page) {
            wp_enqueue_script(
                'belims-ai-descriptions-admin',
                BELIMS_AI_DESC_URL . 'assets/js/admin.js',
                array('jquery'),
                BELIMS_AI_DESC_VERSION,
                true
            );
            
            wp_localize_script('belims-ai-descriptions-admin', 'belimsAI', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('belims_ai_generate_description'),
                'product_id' => get_the_ID(),
                'strings' => array(
                    'generating' => __('Generating...', 'belims-ai-descriptions'),
                    'error' => __('An error occurred.', 'belims-ai-descriptions'),
                    'success' => __('Description applied successfully!', 'belims-ai-descriptions')
                )
            ));
            
            wp_enqueue_style(
                'belims-ai-descriptions-admin',
                BELIMS_AI_DESC_URL . 'assets/css/admin.css',
                array(),
                BELIMS_AI_DESC_VERSION
            );
        }
        
        if ($is_bulk_page) {
            wp_enqueue_script(
                'belims-ai-bulk-admin',
                BELIMS_AI_DESC_URL . 'assets/js/bulk-admin.js',
                array('jquery'),
                BELIMS_AI_DESC_VERSION,
                true
            );
            
            wp_localize_script('belims-ai-bulk-admin', 'belimsBulkAI', array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('belims_bulk_generator'),
                'strings' => array(
                    'loading' => __('Loading products...', 'belims-ai-descriptions'),
                    'generating' => __('Generating description...', 'belims-ai-descriptions'),
                    'error' => __('An error occurred.', 'belims-ai-descriptions'),
                    'complete' => __('Bulk generation complete!', 'belims-ai-descriptions'),
                    'stopped' => __('Process stopped by user.', 'belims-ai-descriptions')
                )
            ));
            
            wp_enqueue_style(
                'belims-ai-bulk-admin',
                BELIMS_AI_DESC_URL . 'assets/css/bulk-admin.css',
                array(),
                BELIMS_AI_DESC_VERSION
            );
        }
    }
    
    /**
     * Add settings page
     */
    public function add_settings_page() {
        add_options_page(
            __('AI Descriptions Settings', 'belims-ai-descriptions'),
            __('AI Descriptions', 'belims-ai-descriptions'),
            'manage_options',
            'belims-ai-descriptions',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('belims_ai_descriptions_settings', 'belims_ai_gemini_api_key', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ));
        
        add_settings_section(
            'belims_ai_api_section',
            __('API Configuration', 'belims-ai-descriptions'),
            array($this, 'render_api_section'),
            'belims-ai-descriptions'
        );
        
        add_settings_field(
            'belims_ai_gemini_api_key',
            __('Gemini API Key', 'belims-ai-descriptions'),
            array($this, 'render_api_key_field'),
            'belims-ai-descriptions',
            'belims_ai_api_section'
        );
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('belims_ai_descriptions_settings');
                do_settings_sections('belims-ai-descriptions');
                submit_button(__('Save Settings', 'belims-ai-descriptions'));
                ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Render API section description
     */
    public function render_api_section() {
        ?>
        <p><?php _e('Configure your Google Gemini API key to enable AI-powered product descriptions.', 'belims-ai-descriptions'); ?></p>
        <p><?php _e('Get your API key from:', 'belims-ai-descriptions'); ?> <a href="https://aistudio.google.com/apikey" target="_blank">https://aistudio.google.com/apikey</a></p>
        <?php
    }
    
    /**
     * Render API key field
     */
    public function render_api_key_field() {
        $api_key = get_option('belims_ai_gemini_api_key', '');
        ?>
        <input type="text" 
               name="belims_ai_gemini_api_key" 
               id="belims_ai_gemini_api_key" 
               value="<?php echo esc_attr($api_key); ?>" 
               class="regular-text"
               placeholder="AIza...">
        <p class="description">
            <?php _e('Enter your Google Gemini API key.', 'belims-ai-descriptions'); ?>
        </p>
        <?php
    }
    
    /**
     * Add bulk generator page
     */
    public function add_bulk_generator_page() {
        add_submenu_page(
            'woocommerce',
            __('Bulk AI Descriptions', 'belims-ai-descriptions'),
            __('Bulk AI Descriptions', 'belims-ai-descriptions'),
            'manage_woocommerce',
            'belims-bulk-ai-descriptions',
            array($this, 'render_bulk_generator_page')
        );
    }
    
    /**
     * Render bulk generator page
     */
    public function render_bulk_generator_page() {
        ?>
        <div class="wrap belims-bulk-generator-page">
            <h1><?php _e('Bulk AI Product Description Generator', 'belims-ai-descriptions'); ?></h1>
            
            <div class="belims-bulk-intro">
                <p><?php _e('Generate AI-powered descriptions for multiple products at once. Only products without existing descriptions will be processed.', 'belims-ai-descriptions'); ?></p>
            </div>
            
            <div class="belims-bulk-stats">
                <div class="stat-box">
                    <span class="stat-number" id="total-products">-</span>
                    <span class="stat-label"><?php _e('Total Products', 'belims-ai-descriptions'); ?></span>
                </div>
                <div class="stat-box">
                    <span class="stat-number" id="products-without-desc">-</span>
                    <span class="stat-label"><?php _e('Without Description', 'belims-ai-descriptions'); ?></span>
                </div>
                <div class="stat-box">
                    <span class="stat-number" id="products-processed">0</span>
                    <span class="stat-label"><?php _e('Processed', 'belims-ai-descriptions'); ?></span>
                </div>
                <div class="stat-box">
                    <span class="stat-number" id="products-successful">0</span>
                    <span class="stat-label"><?php _e('Successful', 'belims-ai-descriptions'); ?></span>
                </div>
            </div>
            
            <div class="belims-bulk-controls">
                <button type="button" id="belims-load-products-btn" class="button button-primary button-large">
                    <span class="dashicons dashicons-update"></span>
                    <?php _e('Reload Products', 'belims-ai-descriptions'); ?>
                </button>
                
                <button type="button" id="belims-dry-run-btn" class="button button-secondary button-large" style="display:none;">
                    <span class="dashicons dashicons-visibility"></span>
                    <?php _e('Dry Run', 'belims-ai-descriptions'); ?>
                </button>
                
                <button type="button" id="belims-start-bulk-btn" class="button button-hero" style="display:none;">
                    <span class="dashicons dashicons-superhero"></span>
                    <?php _e('Start Bulk Generation', 'belims-ai-descriptions'); ?>
                </button>
                
                <button type="button" id="belims-stop-bulk-btn" class="button button-secondary" style="display:none;">
                    <span class="dashicons dashicons-no"></span>
                    <?php _e('Stop', 'belims-ai-descriptions'); ?>
                </button>
            </div>
            
            <div id="belims-bulk-progress" style="display:none;">
                <h3><?php _e('Generation Progress', 'belims-ai-descriptions'); ?></h3>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="belims-progress-bar"></div>
                    <span class="progress-text" id="belims-progress-text">0%</span>
                </div>
                <p class="current-product" id="belims-current-product"></p>
            </div>
            
            <div id="belims-products-table-container" style="display:none;">
                <h3><?php _e('Products to Process', 'belims-ai-descriptions'); ?></h3>
                <table class="wp-list-table widefat fixed striped" id="belims-products-table">
                    <thead>
                        <tr>
                            <th width="50"><?php _e('ID', 'belims-ai-descriptions'); ?></th>
                            <th><?php _e('Product Name', 'belims-ai-descriptions'); ?></th>
                            <th width="150"><?php _e('Category', 'belims-ai-descriptions'); ?></th>
                            <th width="100"><?php _e('Status', 'belims-ai-descriptions'); ?></th>
                        </tr>
                    </thead>
                    <tbody id="belims-products-tbody">
                    </tbody>
                </table>
            </div>
            
            <div id="belims-bulk-log" style="display:none;">
                <h3><?php _e('Activity Log', 'belims-ai-descriptions'); ?></h3>
                <div id="belims-log-content"></div>
            </div>
        </div>
        <?php
    }
    
    /**
     * AJAX handler to get products without descriptions
     */
    public function ajax_get_products_without_description() {
        check_ajax_referer('belims_bulk_generator', 'nonce');
        
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to perform this action.', 'belims-ai-descriptions')
            ));
        }
        
        // Get all published products
        $args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'fields' => 'ids'
        );
        
        $all_products = get_posts($args);
        $total_products = count($all_products);
        
        // Filter products without descriptions
        $products_without_desc = array();
        
        foreach ($all_products as $product_id) {
            $product = wc_get_product($product_id);
            if (!$product) continue;
            
            $description = $product->get_description();
            
            // Only include products without description
            if (empty(trim($description))) {
                $categories = get_the_terms($product_id, 'product_cat');
                $category_name = '';
                if ($categories && !is_wp_error($categories)) {
                    $category_name = $categories[0]->name;
                }
                
                $products_without_desc[] = array(
                    'id' => $product_id,
                    'name' => $product->get_name(),
                    'category' => $category_name,
                    'sku' => $product->get_sku()
                );
            }
        }
        
        wp_send_json_success(array(
            'total_products' => $total_products,
            'products_without_desc' => count($products_without_desc),
            'products' => $products_without_desc
        ));
    }
    
    /**
     * AJAX handler for bulk description generation
     */
    public function ajax_bulk_generate_description() {
        check_ajax_referer('belims_bulk_generator', 'nonce');
        
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to perform this action.', 'belims-ai-descriptions')
            ));
        }
        
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        if (!$product_id) {
            wp_send_json_error(array(
                'message' => __('Invalid product ID.', 'belims-ai-descriptions')
            ));
        }
        
        $product = wc_get_product($product_id);
        
        if (!$product) {
            wp_send_json_error(array(
                'message' => __('Product not found.', 'belims-ai-descriptions')
            ));
        }
        
        // Double-check product doesn't have description
        $existing_description = $product->get_description();
        if (!empty(trim($existing_description))) {
            wp_send_json_error(array(
                'message' => __('Product already has a description.', 'belims-ai-descriptions')
            ));
        }
        
        // Get API key from settings
        $api_key = get_option('belims_ai_gemini_api_key');
        
        if (empty($api_key)) {
            wp_send_json_error(array(
                'message' => __('Gemini API key not configured.', 'belims-ai-descriptions')
            ));
        }
        
        // Generate description using Gemini API
        $description = $this->generate_gemini_description($product, $api_key);
        
        if (is_wp_error($description)) {
            wp_send_json_error(array(
                'message' => $description->get_error_message()
            ));
        }
        
        // Save the description to the product
        $product->set_description($description);
        $saved = $product->save();
        
        if ($saved) {
            wp_send_json_success(array(
                'description' => $description,
                'product_id' => $product_id,
                'product_name' => $product->get_name()
            ));
        } else {
            wp_send_json_error(array(
                'message' => __('Failed to save product description.', 'belims-ai-descriptions')
            ));
        }
    }
    
    /**
     * AJAX handler for dry run (generate without saving)
     */
    public function ajax_dry_run_generate_description() {
        check_ajax_referer('belims_bulk_generator', 'nonce');
        
        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to perform this action.', 'belims-ai-descriptions')
            ));
        }
        
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        if (!$product_id) {
            wp_send_json_error(array(
                'message' => __('Invalid product ID.', 'belims-ai-descriptions')
            ));
        }
        
        $product = wc_get_product($product_id);
        
        if (!$product) {
            wp_send_json_error(array(
                'message' => __('Product not found.', 'belims-ai-descriptions')
            ));
        }
        
        // Get API key from settings
        $api_key = get_option('belims_ai_gemini_api_key');
        
        if (empty($api_key)) {
            wp_send_json_error(array(
                'message' => __('Gemini API key not configured.', 'belims-ai-descriptions')
            ));
        }
        
        // Generate description using Gemini API (NO SAVING)
        $description = $this->generate_gemini_description($product, $api_key);
        
        if (is_wp_error($description)) {
            wp_send_json_error(array(
                'message' => $description->get_error_message()
            ));
        }
        
        // Return description without saving
        wp_send_json_success(array(
            'description' => $description,
            'product_id' => $product_id,
            'product_name' => $product->get_name()
        ));
    }
}

// Initialize the plugin
add_action('plugins_loaded', array('Belims_AI_Product_Descriptions', 'get_instance'));
