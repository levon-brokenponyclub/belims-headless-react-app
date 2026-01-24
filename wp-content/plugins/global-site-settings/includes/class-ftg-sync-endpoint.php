<?php
/**
 * FTG Sync REST API Endpoints
 * 
 * Provides endpoints to sync products from Find The Gap to WooCommerce
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_FTG_Sync_Endpoint {
    
    private $ftg_api;
    
    public function __construct() {
        require_once GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/class-ftg-api.php';
        $this->ftg_api = new Belims_FTG_API();
    }
    
    /**
     * Register routes
     */
    public function register_routes() {
        // Get FTG instances/collections
        register_rest_route('belims/v1', '/ftg/instances', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_instances'),
            'permission_callback' => array($this, 'check_admin_permission'),
        ));
        
        // Get products from FTG (preview before sync)
        register_rest_route('belims/v1', '/ftg/products/(?P<token>[a-zA-Z0-9-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_ftg_products'),
            'permission_callback' => array($this, 'check_admin_permission'),
        ));
        
        // Sync products from FTG to WooCommerce
        register_rest_route('belims/v1', '/ftg/sync', array(
            'methods' => 'POST',
            'callback' => array($this, 'sync_products'),
            'permission_callback' => array($this, 'check_admin_permission'),
        ));
        
        // Get sync status
        register_rest_route('belims/v1', '/ftg/sync/status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_sync_status'),
            'permission_callback' => array($this, 'check_admin_permission'),
        ));
    }
    
    /**
     * Check if user has admin permission
     */
    public function check_admin_permission() {
        return current_user_can('manage_options');
    }
    
    /**
     * Get FTG collection instances
     */
    public function get_instances($request) {
        $result = $this->ftg_api->get_instances();
        
        if (isset($result['error'])) {
            return new WP_Error('ftg_error', $result['error'], array('status' => 500));
        }
        
        return rest_ensure_response($result);
    }
    
    /**
     * Get products from FTG (preview)
     */
    public function get_ftg_products($request) {
        $token = $request->get_param('token');
        $page = $request->get_param('page') ?: 1;
        $limit = $request->get_param('limit') ?: 50;
        
        $result = $this->ftg_api->get_products($token, array(
            'page' => $page,
            'limit' => $limit,
        ));
        
        if (isset($result['error'])) {
            return new WP_Error('ftg_error', $result['error'], array('status' => 500));
        }
        
        return rest_ensure_response($result);
    }
    
    /**
     * Sync products from FTG to WooCommerce
     */
    public function sync_products($request) {
        $params = $request->get_json_params();
        $collection_token = $params['collection_token'] ?? '';
        $limit = $params['limit'] ?? 100;
        $offset = $params['offset'] ?? 0;
        
        if (empty($collection_token)) {
            return new WP_Error('missing_token', 'Collection token required', array('status' => 400));
        }
        
        // Get products from FTG
        $ftg_result = $this->ftg_api->get_products($collection_token, array(
            'limit' => $limit,
            'offset' => $offset,
        ));
        
        if (isset($ftg_result['error'])) {
            return new WP_Error('ftg_error', $ftg_result['error'], array('status' => 500));
        }
        
        $products = $ftg_result['data']['data'] ?? $ftg_result['data'] ?? array();
        
        if (empty($products)) {
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'No products found',
                'synced' => 0,
            ));
        }
        
        $synced_count = 0;
        $errors = array();
        
        foreach ($products as $ftg_product) {
            $result = $this->create_or_update_wc_product($ftg_product);
            
            if ($result['success']) {
                $synced_count++;
            } else {
                $errors[] = $result['error'];
            }
        }
        
        // Store sync metadata
        update_option('belims_ftg_last_sync', array(
            'time' => current_time('mysql'),
            'collection_token' => $collection_token,
            'products_synced' => $synced_count,
            'errors' => count($errors),
        ));
        
        return rest_ensure_response(array(
            'success' => true,
            'synced' => $synced_count,
            'total' => count($products),
            'errors' => $errors,
        ));
    }
    
    /**
     * Create or update WooCommerce product from FTG data
     */
    private function create_or_update_wc_product($ftg_product) {
        try {
            // Check if product exists by SKU or FTG ID
            $sku = $ftg_product['code'] ?? $ftg_product['mdrProductCode'] ?? '';
            $ftg_id = $ftg_product['id'] ?? $ftg_product['ftgOneId'] ?? '';
            
            $existing_product_id = wc_get_product_id_by_sku($sku);
            
            if ($existing_product_id) {
                $product = wc_get_product($existing_product_id);
            } else {
                $product = new WC_Product_Simple();
            }
            
            // Set basic product data
            $product->set_name($ftg_product['description'] ?? $ftg_product['name'] ?? 'Unnamed Product');
            $product->set_sku($sku);
            $product->set_description($ftg_product['longDescription'] ?? $ftg_product['description'] ?? '');
            $product->set_short_description($ftg_product['shortDescription'] ?? '');
            
            // Set pricing (assuming price is excl VAT, will be displayed with VAT via functions.php)
            $price = floatval($ftg_product['price'] ?? $ftg_product['sellingPrice'] ?? 0);
            $product->set_regular_price($price);
            
            // Set stock
            $stock_qty = intval($ftg_product['stockLevel'] ?? $ftg_product['quantity'] ?? 0);
            $product->set_manage_stock(true);
            $product->set_stock_quantity($stock_qty);
            $product->set_stock_status($stock_qty > 0 ? 'instock' : 'outofstock');
            
            // Set category if provided
            if (!empty($ftg_product['category']) || !empty($ftg_product['departmentDescription'])) {
                $category_name = $ftg_product['departmentDescription'] ?? $ftg_product['category'];
                $cat_id = $this->get_or_create_category($category_name);
                if ($cat_id) {
                    $product->set_category_ids(array($cat_id));
                }
            }
            
            // Set product image if available
            if (!empty($ftg_product['imageUrl']) || !empty($ftg_product['primaryImageUrl'])) {
                $image_url = $ftg_product['primaryImageUrl'] ?? $ftg_product['imageUrl'];
                $this->set_product_image($product, $image_url);
            }
            
            // Store FTG metadata
            $product->update_meta_data('_ftg_one_id', $ftg_id);
            $product->update_meta_data('_ftg_product_code', $sku);
            $product->update_meta_data('_ftg_last_sync', current_time('mysql'));
            
            // Save product
            $product_id = $product->save();
            
            return array(
                'success' => true,
                'product_id' => $product_id,
                'sku' => $sku,
            );
            
        } catch (Exception $e) {
            return array(
                'success' => false,
                'error' => $e->getMessage(),
                'sku' => $sku ?? 'unknown',
            );
        }
    }
    
    /**
     * Get or create product category
     */
    private function get_or_create_category($category_name) {
        $term = get_term_by('name', $category_name, 'product_cat');
        
        if ($term) {
            return $term->term_id;
        }
        
        $result = wp_insert_term($category_name, 'product_cat');
        
        if (is_wp_error($result)) {
            return null;
        }
        
        return $result['term_id'];
    }
    
    /**
     * Set product image from URL
     */
    private function set_product_image($product, $image_url) {
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        
        $image_id = media_sideload_image($image_url, $product->get_id(), $product->get_name(), 'id');
        
        if (!is_wp_error($image_id)) {
            $product->set_image_id($image_id);
        }
    }
    
    /**
     * Get sync status
     */
    public function get_sync_status($request) {
        $last_sync = get_option('belims_ftg_last_sync', array());
        
        return rest_ensure_response(array(
            'last_sync' => $last_sync,
            'wc_product_count' => wp_count_posts('product')->publish,
        ));
    }
}
