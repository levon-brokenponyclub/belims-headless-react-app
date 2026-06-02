<?php
/**
 * Product Deals Meta Handler
 * 
 * Adds deal type custom fields to WooCommerce products:
 * - Deals of the day (Consumer & Trade)
 * - Weekly Deals & Bulk Savings (Trade only)
 * 
 * @package Global_Site_Settings
 */

if (!defined('ABSPATH')) exit;

class Product_Deals_Meta {
    
    /**
     * Initialize the class
     */
    public function __construct() {
        // Add Deals tab to product data tabs
        add_filter('woocommerce_product_data_tabs', array($this, 'add_deals_product_data_tab'));
        
        // Add content for Deals tab
        add_action('woocommerce_product_data_panels', array($this, 'add_deals_product_data_panel'));
        
        // Save meta data
        add_action('woocommerce_process_product_meta', array($this, 'save_deals_meta'));
        
        // Add deal fields to REST API product response
        add_filter('woocommerce_rest_prepare_product_object', array($this, 'add_deals_to_api'), 10, 3);
        
        // Register meta fields for REST API
        add_action('rest_api_init', array($this, 'register_deal_meta_fields'));
    }
    
    /**
     * Add Deals tab to product data tabs
     */
    public function add_deals_product_data_tab($tabs) {
        $tabs['deals'] = array(
            'label'    => __('Deals', 'global-site-settings'),
            'target'   => 'deals_product_data',
            'class'    => array(),
            'priority' => 15, // Between General (10) and Inventory (20)
        );
        return $tabs;
    }
    
    /**
     * Add content for Deals tab panel
     */
    public function add_deals_product_data_panel() {
        global $post;
        
        // Get current values
        $consumer_deal_type = get_post_meta($post->ID, '_consumer_deal_type', true);
        $consumer_deal_name = get_post_meta($post->ID, '_consumer_deal_name', true);
        $consumer_deal_price = get_post_meta($post->ID, '_consumer_deal_price', true);
        $trade_deal_type = get_post_meta($post->ID, '_trade_deal_type', true);
        $trade_deal_name = get_post_meta($post->ID, '_trade_deal_name', true);
        $trade_deal_price = get_post_meta($post->ID, '_trade_deal_price', true);
        
        ?>
        <div id="deals_product_data" class="panel woocommerce_options_panel hidden">
            <div class="options_group">
                <h3 style="padding: 15px 12px; margin: 0; border-bottom: 1px solid #eee;">
                    <?php _e('Consumer Deals', 'global-site-settings'); ?>
                </h3>
                
                <?php
                woocommerce_wp_select(array(
                    'id' => '_consumer_deal_type',
                    'label' => __('Deal Type', 'global-site-settings'),
                    'options' => array(
                        '' => __('No Deal', 'global-site-settings'),
                        'deal_of_day' => __('Deal of the day', 'global-site-settings'),
                        'weekly_deals' => __('Weekly deals', 'global-site-settings'),
                    ),
                    'value' => $consumer_deal_type,
                    'desc_tip' => true,
                    'description' => __('Select the deal type for consumer customers', 'global-site-settings'),
                ));
                
                woocommerce_wp_text_input(array(
                    'id' => '_consumer_deal_name',
                    'label' => __('Deal Name', 'global-site-settings'),
                    'placeholder' => __('e.g., Bulk Save, Clearance, 25% off', 'global-site-settings'),
                    'value' => $consumer_deal_name,
                    'desc_tip' => true,
                    'description' => __('Optional: Custom deal label to display', 'global-site-settings'),
                ));
                
                woocommerce_wp_text_input(array(
                    'id' => '_consumer_deal_price',
                    'label' => __('Deal Price', 'global-site-settings') . ' (' . get_woocommerce_currency_symbol() . ')',
                    'placeholder' => wc_format_localized_price(0),
                    'value' => $consumer_deal_price,
                    'data_type' => 'price',
                    'desc_tip' => true,
                    'description' => __('The special price for this consumer deal', 'global-site-settings'),
                ));
                ?>
            </div>
            
            <div class="options_group">
                <h3 style="padding: 15px 12px; margin: 0; border-bottom: 1px solid #eee;">
                    <?php _e('Trade Deals', 'global-site-settings'); ?>
                </h3>
                
                <?php
                woocommerce_wp_select(array(
                    'id' => '_trade_deal_type',
                    'label' => __('Deal Type', 'global-site-settings'),
                    'options' => array(
                        '' => __('No Deal', 'global-site-settings'),
                        'deal_of_day' => __('Deal of the day', 'global-site-settings'),
                        'weekly_deals' => __('Weekly deals & Bulk Savings', 'global-site-settings'),
                    ),
                    'value' => $trade_deal_type,
                    'desc_tip' => true,
                    'description' => __('Select the deal type for trade customers', 'global-site-settings'),
                ));
                
                woocommerce_wp_text_input(array(
                    'id' => '_trade_deal_name',
                    'label' => __('Deal Name', 'global-site-settings'),
                    'placeholder' => __('e.g., Trade Special, Pro Discount', 'global-site-settings'),
                    'value' => $trade_deal_name,
                    'desc_tip' => true,
                    'description' => __('Optional: Custom deal label to display', 'global-site-settings'),
                ));
                
                woocommerce_wp_text_input(array(
                    'id' => '_trade_deal_price',
                    'label' => __('Deal Price', 'global-site-settings') . ' (' . get_woocommerce_currency_symbol() . ')',
                    'placeholder' => wc_format_localized_price(0),
                    'value' => $trade_deal_price,
                    'data_type' => 'price',
                    'desc_tip' => true,
                    'description' => __('The special price for this trade deal', 'global-site-settings'),
                ));
                ?>
            </div>
            
            <div class="options_group">
                <p class="form-field" style="padding: 12px;">
                    <span class="description" style="display: block; padding: 10px; background: #f0f6fc; border-left: 4px solid #2271b1; margin: 0;">
                        <strong><?php _e('Important:', 'global-site-settings'); ?></strong>
                        <?php _e('Deal prices will override the regular/sale prices when displaying deals to customers. Leave deal price empty to use the product\'s sale price instead.', 'global-site-settings'); ?>
                    </span>
                </p>
            </div>
        </div>
        <?php
    }
    
    /**
     * Save deal meta data
     */
    public function save_deals_meta($post_id) {
        // Check permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save consumer deal type
        if (isset($_POST['_consumer_deal_type'])) {
            $value = sanitize_text_field($_POST['_consumer_deal_type']);
            if (!empty($value)) {
                update_post_meta($post_id, '_consumer_deal_type', $value);
            } else {
                delete_post_meta($post_id, '_consumer_deal_type');
            }
        }
        
        // Save consumer deal name
        if (isset($_POST['_consumer_deal_name'])) {
            $value = sanitize_text_field($_POST['_consumer_deal_name']);
            if (!empty($value)) {
                update_post_meta($post_id, '_consumer_deal_name', $value);
            } else {
                delete_post_meta($post_id, '_consumer_deal_name');
            }
        }
        
        // Save consumer deal price
        if (isset($_POST['_consumer_deal_price'])) {
            $value = wc_format_decimal($_POST['_consumer_deal_price']);
            if ($value !== '') {
                update_post_meta($post_id, '_consumer_deal_price', $value);
            } else {
                delete_post_meta($post_id, '_consumer_deal_price');
            }
        }
        
        // Save trade deal type
        if (isset($_POST['_trade_deal_type'])) {
            $value = sanitize_text_field($_POST['_trade_deal_type']);
            if (!empty($value)) {
                update_post_meta($post_id, '_trade_deal_type', $value);
            } else {
                delete_post_meta($post_id, '_trade_deal_type');
            }
        }
        
        // Save trade deal name
        if (isset($_POST['_trade_deal_name'])) {
            $value = sanitize_text_field($_POST['_trade_deal_name']);
            if (!empty($value)) {
                update_post_meta($post_id, '_trade_deal_name', $value);
            } else {
                delete_post_meta($post_id, '_trade_deal_name');
            }
        }
        
        // Save trade deal price
        if (isset($_POST['_trade_deal_price'])) {
            $value = wc_format_decimal($_POST['_trade_deal_price']);
            if ($value !== '') {
                update_post_meta($post_id, '_trade_deal_price', $value);
            } else {
                delete_post_meta($post_id, '_trade_deal_price');
            }
        }
    }
    
    /**
     * Add deal fields to WooCommerce REST API product response
     */
    public function add_deals_to_api($response, $object, $request) {
        $product_id = $object->get_id();
        
        $consumer_deal_type = get_post_meta($product_id, '_consumer_deal_type', true);
        $trade_deal_type = get_post_meta($product_id, '_trade_deal_type', true);
        
        // Get deal prices and convert to float (or null if empty)
        $consumer_deal_price = get_post_meta($product_id, '_consumer_deal_price', true);
        $trade_deal_price = get_post_meta($product_id, '_trade_deal_price', true);
        
        $response->data['deals'] = array(
            'consumer' => array(
                'type' => $consumer_deal_type ? $consumer_deal_type : null,
                'name' => get_post_meta($product_id, '_consumer_deal_name', true),
                'price' => $consumer_deal_price !== '' ? floatval($consumer_deal_price) : null,
                'is_deal_of_day' => $consumer_deal_type === 'deal_of_day',
                'is_weekly_deal' => $consumer_deal_type === 'weekly_deals'
            ),
            'trade' => array(
                'type' => $trade_deal_type ? $trade_deal_type : null,
                'name' => get_post_meta($product_id, '_trade_deal_name', true),
                'price' => $trade_deal_price !== '' ? floatval($trade_deal_price) : null,
                'is_deal_of_day' => $trade_deal_type === 'deal_of_day',
                'is_weekly_deal' => $trade_deal_type === 'weekly_deals'
            )
        );
        
        return $response;
    }
    
    /**
     * Register deal meta fields for REST API
     */
    public function register_deal_meta_fields() {
        // Consumer deal fields
        register_rest_field('product', 'consumer_deal_type', array(
            'get_callback' => function($object) {
                return get_post_meta($object['id'], '_consumer_deal_type', true);
            },
            'schema' => array(
                'description' => __('Consumer Deal Type', 'global-site-settings'),
                'type' => 'string'
            )
        ));
        
        register_rest_field('product', 'consumer_deal_name', array(
            'get_callback' => function($object) {
                return get_post_meta($object['id'], '_consumer_deal_name', true);
            },
            'schema' => array(
                'description' => __('Consumer Deal Name', 'global-site-settings'),
                'type' => 'string'
            )
        ));
        
        register_rest_field('product', 'consumer_deal_price', array(
            'get_callback' => function($object) {
                $price = get_post_meta($object['id'], '_consumer_deal_price', true);
                return $price !== '' ? floatval($price) : null;
            },
            'schema' => array(
                'description' => __('Consumer Deal Price', 'global-site-settings'),
                'type' => 'number'
            )
        ));
        
        // Trade deal fields
        register_rest_field('product', 'trade_deal_type', array(
            'get_callback' => function($object) {
                return get_post_meta($object['id'], '_trade_deal_type', true);
            },
            'schema' => array(
                'description' => __('Trade Deal Type', 'global-site-settings'),
                'type' => 'string'
            )
        ));
        
        register_rest_field('product', 'trade_deal_name', array(
            'get_callback' => function($object) {
                return get_post_meta($object['id'], '_trade_deal_name', true);
            },
            'schema' => array(
                'description' => __('Trade Deal Name', 'global-site-settings'),
                'type' => 'string'
            )
        ));
        
        register_rest_field('product', 'trade_deal_price', array(
            'get_callback' => function($object) {
                $price = get_post_meta($object['id'], '_trade_deal_price', true);
                return $price !== '' ? floatval($price) : null;
            },
            'schema' => array(
                'description' => __('Trade Deal Price', 'global-site-settings'),
                'type' => 'number'
            )
        ));
    }
}

// Initialize the class
new Product_Deals_Meta();
