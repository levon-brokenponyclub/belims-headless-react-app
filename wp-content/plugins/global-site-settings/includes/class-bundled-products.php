<?php
/**
 * Bundled Products Management
 * 
 * Adds a "Bundled Products" tab to WooCommerce Product Data metabox
 * Allows selection of up to 3 products to create a bundle
 */

if (!defined('ABSPATH')) exit;

class Belims_Bundled_Products {

    /**
     * Initialize the bundled products functionality
     */
    public static function init() {
        // Add custom tab to Product Data metabox
        add_filter('woocommerce_product_data_tabs', [__CLASS__, 'add_bundled_products_tab']);
        
        // Add content to the custom tab
        add_action('woocommerce_product_data_panels', [__CLASS__, 'add_bundled_products_panel']);
        
        // Save bundled products data
        add_action('woocommerce_process_product_meta', [__CLASS__, 'save_bundled_products'], 10, 1);
        
        // Enqueue admin styles
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue_admin_scripts']);
    }

    /**
     * Add "Bundled Products" tab to Product Data metabox
     */
    public static function add_bundled_products_tab($tabs) {
        $tabs['bundled_products'] = [
            'label'    => __('Bundled Products', 'global-site-settings'),
            'target'   => 'bundled_products_data',
            'class'    => ['show_if_simple', 'show_if_variable'],
            'priority' => 80,
        ];
        return $tabs;
    }

    /**
     * Add content panel for Bundled Products tab
     */
    public static function add_bundled_products_panel() {
        global $post;
        
        // Get saved bundled products
        $bundled_product_1 = get_post_meta($post->ID, '_bundled_product_1', true);
        $bundled_product_2 = get_post_meta($post->ID, '_bundled_product_2', true);
        $bundled_product_3 = get_post_meta($post->ID, '_bundled_product_3', true);
        
        // Get all products for dropdown (excluding current product)
        $products = self::get_all_products($post->ID);
        
        ?>
        <div id="bundled_products_data" class="panel woocommerce_options_panel hidden">
            <div class="options_group">
                <p class="form-field">
                    <strong><?php _e('Bundle Products', 'global-site-settings'); ?></strong><br>
                    <span class="description">
                        <?php _e('Select up to 3 products to bundle with this product. These will be offered as complementary items with bundle discounts.', 'global-site-settings'); ?>
                    </span>
                </p>
                
                <!-- Bundle Product 1 -->
                <p class="form-field bundled_product_field">
                    <label for="_bundled_product_1">
                        <?php _e('Bundle Product 1', 'global-site-settings'); ?>
                    </label>
                    <select name="_bundled_product_1" id="_bundled_product_1" class="wc-product-search" style="width: 50%;">
                        <option value=""><?php _e('Select a product...', 'global-site-settings'); ?></option>
                        <?php foreach ($products as $product) : ?>
                            <option value="<?php echo esc_attr($product->ID); ?>" <?php selected($bundled_product_1, $product->ID); ?>>
                                <?php echo esc_html($product->post_title); ?> (#<?php echo $product->ID; ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <?php if ($bundled_product_1) : ?>
                        <a href="<?php echo get_edit_post_link($bundled_product_1); ?>" target="_blank" class="button button-small" style="margin-left: 10px;">
                            <?php _e('View Product', 'global-site-settings'); ?>
                        </a>
                    <?php endif; ?>
                </p>
                
                <!-- Bundle Product 2 -->
                <p class="form-field bundled_product_field">
                    <label for="_bundled_product_2">
                        <?php _e('Bundle Product 2', 'global-site-settings'); ?>
                    </label>
                    <select name="_bundled_product_2" id="_bundled_product_2" class="wc-product-search" style="width: 50%;">
                        <option value=""><?php _e('Select a product...', 'global-site-settings'); ?></option>
                        <?php foreach ($products as $product) : ?>
                            <option value="<?php echo esc_attr($product->ID); ?>" <?php selected($bundled_product_2, $product->ID); ?>>
                                <?php echo esc_html($product->post_title); ?> (#<?php echo $product->ID; ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <?php if ($bundled_product_2) : ?>
                        <a href="<?php echo get_edit_post_link($bundled_product_2); ?>" target="_blank" class="button button-small" style="margin-left: 10px;">
                            <?php _e('View Product', 'global-site-settings'); ?>
                        </a>
                    <?php endif; ?>
                </p>
                
                <!-- Bundle Product 3 -->
                <p class="form-field bundled_product_field">
                    <label for="_bundled_product_3">
                        <?php _e('Bundle Product 3', 'global-site-settings'); ?>
                    </label>
                    <select name="_bundled_product_3" id="_bundled_product_3" class="wc-product-search" style="width: 50%;">
                        <option value=""><?php _e('Select a product...', 'global-site-settings'); ?></option>
                        <?php foreach ($products as $product) : ?>
                            <option value="<?php echo esc_attr($product->ID); ?>" <?php selected($bundled_product_3, $product->ID); ?>>
                                <?php echo esc_html($product->post_title); ?> (#<?php echo $product->ID; ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <?php if ($bundled_product_3) : ?>
                        <a href="<?php echo get_edit_post_link($bundled_product_3); ?>" target="_blank" class="button button-small" style="margin-left: 10px;">
                            <?php _e('View Product', 'global-site-settings'); ?>
                        </a>
                    <?php endif; ?>
                </p>
                
                <p class="form-field">
                    <span class="description">
                        <strong><?php _e('Bundle Discount Tiers:', 'global-site-settings'); ?></strong><br>
                        • 1 item = 3% off<br>
                        • 2 items = 5% off<br>
                        • 3+ items = 10% off
                    </span>
                </p>
            </div>
        </div>
        <?php
    }

    /**
     * Get all products (excluding current product)
     */
    private static function get_all_products($exclude_id = 0) {
        $args = [
            'post_type'      => 'product',
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'orderby'        => 'title',
            'order'          => 'ASC',
            'post__not_in'   => [$exclude_id],
        ];
        
        return get_posts($args);
    }

    /**
     * Save bundled products data
     */
    public static function save_bundled_products($post_id) {
        // Save bundled product 1
        if (isset($_POST['_bundled_product_1'])) {
            $product_1 = sanitize_text_field($_POST['_bundled_product_1']);
            update_post_meta($post_id, '_bundled_product_1', $product_1);
        } else {
            delete_post_meta($post_id, '_bundled_product_1');
        }
        
        // Save bundled product 2
        if (isset($_POST['_bundled_product_2'])) {
            $product_2 = sanitize_text_field($_POST['_bundled_product_2']);
            update_post_meta($post_id, '_bundled_product_2', $product_2);
        } else {
            delete_post_meta($post_id, '_bundled_product_2');
        }
        
        // Save bundled product 3
        if (isset($_POST['_bundled_product_3'])) {
            $product_3 = sanitize_text_field($_POST['_bundled_product_3']);
            update_post_meta($post_id, '_bundled_product_3', $product_3);
        } else {
            delete_post_meta($post_id, '_bundled_product_3');
        }
    }

    /**
     * Enqueue admin scripts and styles
     */
    public static function enqueue_admin_scripts($hook) {
        // Only load on product edit page
        if ('post.php' !== $hook && 'post-new.php' !== $hook) {
            return;
        }
        
        global $post;
        if (!$post || get_post_type($post->ID) !== 'product') {
            return;
        }
        
        // Add inline CSS for better styling
        wp_add_inline_style('woocommerce_admin_styles', '
            .bundled_product_field {
                padding: 12px;
            }
            .bundled_product_field label {
                font-weight: 600;
                display: block;
                margin-bottom: 8px;
            }
            .bundled_product_field select {
                max-width: 100%;
            }
            #bundled_products_data .description {
                display: block;
                margin: 8px 0;
                color: #666;
                font-style: italic;
            }
        ');
    }

    /**
     * Get bundled products for a given product ID
     * Used by the REST API endpoint
     */
    public static function get_bundled_products($product_id) {
        $bundled_products = [];
        
        for ($i = 1; $i <= 3; $i++) {
            $bundled_product_id = get_post_meta($product_id, "_bundled_product_{$i}", true);
            
            if ($bundled_product_id) {
                $product = wc_get_product($bundled_product_id);
                
                if ($product) {
                    $bundled_products[] = [
                        'id'    => $product->get_id(),
                        'name'  => $product->get_name(),
                        'price' => $product->get_price(),
                        'image' => wp_get_attachment_url($product->get_image_id()),
                        'stock' => $product->get_stock_status() === 'instock',
                    ];
                }
            }
        }
        
        return $bundled_products;
    }
}

// Initialize the class
Belims_Bundled_Products::init();
