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
        require_once GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/ftg-sync/class-ftg-api.php';
        $this->ftg_api = new Belims_FTG_API();
    }
    
    /**
     * Register routes
     */
    public function register_routes() {
        // Login to FTG and get collection token
        register_rest_route('belims/v1', '/ftg/login', array(
            'methods' => 'POST',
            'callback' => array($this, 'ftg_login'),
            'permission_callback' => array($this, 'check_admin_permission'),
        ));
        
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
        
        // Fetch single product by SKU for inspection
        register_rest_route('belims/v1', '/ftg/product/(?P<sku>[a-zA-Z0-9-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_single_product'),
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
     * Login to FTG and get collection token
     */
    public function ftg_login($request) {
        $params = $request->get_json_params();
        $email = sanitize_email($params['email'] ?? '');
        $password = $params['password'] ?? '';
        
        error_log('=== FTG Login Request ===');
        error_log('Email: ' . $email);
        error_log('Password provided: ' . (!empty($password) ? 'Yes' : 'No'));
        
        if (empty($email) || empty($password)) {
            error_log('ERROR: Missing credentials');
            return new WP_Error('missing_credentials', 'Email and password are required', array('status' => 400));
        }
        
        // Call FTG login API directly
        $api_url = 'https://gateway.ftgone.co.za/v2/login';
        $request_body = array('email' => $email, 'password' => $password);
        
        error_log('API URL: ' . $api_url);
        error_log('Request body: ' . json_encode($request_body));
        
        $response = wp_remote_post($api_url, array(
            'body'        => json_encode($request_body),
            'headers'     => array('Content-Type' => 'application/json'),
            'timeout'     => 15,
        ));
        
        if (is_wp_error($response)) {
            error_log('WP_Error: ' . $response->get_error_message());
            return new WP_Error('connection_error', 'Connection error: ' . $response->get_error_message(), array('status' => 500));
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        error_log('Response status: ' . $status_code);
        error_log('Response body: ' . $body);
        
        // Check if login succeeded and we got a bearer token
        if ($status_code === 200 && !empty($data['succeeded']) && !empty($data['response'])) {
            $bearer_token = $data['response'];
            error_log('SUCCESS: Bearer token received: ' . substr($bearer_token, 0, 50) . '...');
            
            // Now get the collection token using the bearer token
            $collection_url = 'https://gateway.ftgone.co.za/v2/instances';
            $collection_response = wp_remote_get($collection_url, array(
                'headers' => array('Authorization' => 'Bearer ' . $bearer_token),
                'timeout' => 15,
            ));
            
            if (is_wp_error($collection_response)) {
                error_log('Collection token error: ' . $collection_response->get_error_message());
                return new WP_Error('collection_error', 'Failed to get collection token', array('status' => 500));
            }
            
            $collection_body = wp_remote_retrieve_body($collection_response);
            $collection_data = json_decode($collection_body, true);
            error_log('Collection response: ' . $collection_body);
            
            if (!empty($collection_data['succeeded']) && !empty($collection_data['response'][0]['collectionToken'])) {
                $collection_token = $collection_data['response'][0]['collectionToken'];
                error_log('SUCCESS: Collection token received: ' . $collection_token);
                
                // Save credentials and tokens in ACF options
                update_field('ftg_email', $email, 'option');
                update_field('ftg_password', $password, 'option');
                update_field('ftg_collection_token', sanitize_text_field($collection_token), 'option');
                update_field('ftg_enabled', 1, 'option');
                
                return rest_ensure_response(array(
                    'success' => true,
                    'collection_token' => $collection_token,
                    'message' => 'Token fetched and saved successfully!'
                ));
            } else {
                error_log('ERROR: Failed to get collection token from response');
                return new WP_Error('collection_failed', 'Failed to retrieve collection token', array('status' => 500));
            }
        } else {
            $message = $data['message'] ?? $data['error'] ?? 'Invalid email or password';
            error_log('ERROR: ' . $message);
            return new WP_Error('login_failed', $message, array('status' => 401));
        }
    }
    
    /**
     * Get FTG collection instances
     */
    public function get_instances($request) {
        error_log('=== FTG Get Instances Called ===');
        
        $result = $this->ftg_api->get_instances();
        
        error_log('FTG API Result: ' . print_r($result, true));
        
        if (isset($result['error'])) {
            error_log('FTG Error: ' . $result['error']);
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
        $limit = $params['limit'] ?? null; // null = all products
        
        error_log('=== FTG Product Sync Started ===');
        error_log('Collection Token: ' . $collection_token);
        error_log('Limit: ' . ($limit ?? 'ALL'));
        
        if (empty($collection_token)) {
            return new WP_Error('missing_token', 'Collection token required', array('status' => 400));
        }
        
        // Get products from FTG (FTG API doesn't support limit/offset, returns all products)
        $ftg_result = $this->ftg_api->get_products($collection_token);
        
        error_log('FTG API Result Structure: ' . print_r(array_keys($ftg_result), true));
        
        if (isset($ftg_result['error'])) {
            error_log('FTG Error: ' . $ftg_result['error']);
            return new WP_Error('ftg_error', $ftg_result['error'], array('status' => 500));
        }
        
        // FTG API returns products in $body['response'] array
        // Our get_products() wraps this in ['data']
        $products = array();
        if (isset($ftg_result['data']['response']) && is_array($ftg_result['data']['response'])) {
            $products = $ftg_result['data']['response'];
        } elseif (isset($ftg_result['data']['data'])) {
            // Fallback for different API structure
            $products = $ftg_result['data']['data'];
        } elseif (isset($ftg_result['data']) && is_array($ftg_result['data'])) {
            $products = $ftg_result['data'];
        }
        
        error_log('Total products retrieved from FTG: ' . count($products));
        
        if (empty($products)) {
            error_log('No products to sync - response structure: ' . print_r($ftg_result, true));
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'No products found in API response',
                'synced' => 0,
            ));
        }
        
        // Apply limit AFTER retrieval (FTG API returns all products at once)
        if ($limit !== null && $limit > 0) {
            $products = array_slice($products, 0, $limit);
            error_log('Limited to ' . $limit . ' products for processing');
        }
        
        $synced_count = 0;
        $skipped_count = 0;
        $errors = array();
        
        foreach ($products as $index => $ftg_product) {
            if ($index < 2) {
                error_log('Processing product ' . $index . ': ' . print_r($ftg_product, true));
            }
            
            // VALIDATION: Skip products without name only
            $product_data = $ftg_product['productData'] ?? $ftg_product;
            $product_name = $product_data['description1'] ?? $product_data['description2'] ?? '';
            $sku = $product_data['productCode'] ?? '';
            
            if (empty($product_name)) {
                $skipped_count++;
                error_log('SKIPPED Product (No Name): ' . $sku);
                continue; // Skip to next product
            }
            
            $result = $this->create_or_update_wc_product($ftg_product);
            
            if ($result['success']) {
                $synced_count++;
                error_log('Product synced: ' . $result['name'] . ' (SKU: ' . $result['sku'] . ')');
            } else {
                $errors[] = $result['error'] . ' (SKU: ' . ($result['sku'] ?? 'unknown') . ')';
                error_log('Product sync failed: ' . print_r($result, true));
            }
        }
        
        // Store sync metadata
        update_option('belims_ftg_last_sync', array(
            'time' => current_time('mysql'),
            'collection_token' => $collection_token,
            'products_synced' => $synced_count,
            'products_skipped' => $skipped_count,
            'errors' => count($errors),
        ));
        
        error_log('=== FTG Sync Summary ===');
        error_log('Total products: ' . count($products));
        error_log('Successfully synced: ' . $synced_count);
        error_log('Skipped (no price/name): ' . $skipped_count);
        error_log('Errors: ' . count($errors));
        
        return rest_ensure_response(array(
            'success' => true,
            'synced' => $synced_count,
            'skipped' => $skipped_count,
            'total' => count($products),
            'errors' => $errors,
        ));
    }
    
    /**
     * Create or update WooCommerce product from FTG data
     */
    private function create_or_update_wc_product($ftg_product) {
        try {
            // FTG API returns nested productData structure
            $product_data = $ftg_product['productData'] ?? $ftg_product;
            
            // Extract product details from correct fields
            $sku = $product_data['productCode'] ?? $product_data['mdrProductCode'] ?? '';
            $ftg_id = $ftg_product['ftgOneId'] ?? $product_data['ftgOneId'] ?? '';
            
            if (empty($sku)) {
                return array(
                    'success' => false,
                    'error' => 'No SKU found for product',
                    'sku' => 'unknown',
                );
            }
            
            $existing_product_id = wc_get_product_id_by_sku($sku);
            
            if ($existing_product_id) {
                $product = wc_get_product($existing_product_id);
            } else {
                $product = new WC_Product_Simple();
            }
            
            // Set basic product data using correct FTG field names
            $product_name = $product_data['description1'] ?? $product_data['description2'] ?? $product_data['description3'] ?? 'Unnamed Product';
            $product->set_name($product_name);
            $product->set_sku($sku);
            
            // Set description
            $long_description = trim(($product_data['description2'] ?? '') . ' ' . ($product_data['description3'] ?? ''));
            $product->set_description($long_description);
            $product->set_short_description($product_data['description1'] ?? '');
            
            // Set pricing (FTG prices are EXCLUDING VAT - add 15%)
            $price_excl_vat = floatval($product_data['sellingPrice'] ?? 0);
            $price_incl_vat = round($price_excl_vat * 1.15, 2); // Add 15% VAT
            
            // Only set price if > 0 (POA products should have no price)
            if ($price_incl_vat > 0) {
                $product->set_regular_price($price_incl_vat);
            }
            
            // Set stock - Read from additionalErpDetails.stockQuantity (correct location)
            $stock_qty = 0;
            if (isset($product_data['additionalErpDetails']['stockQuantity'])) {
                $stock_qty = intval($product_data['additionalErpDetails']['stockQuantity']);
            }
            
            $product->set_manage_stock(true);
            $product->set_stock_quantity($stock_qty);
            $product->set_stock_status($stock_qty > 0 ? 'instock' : 'outofstock');
            
            // Set weight and dimensions if available
            if (!empty($product_data['weight'])) {
                $weight = floatval($product_data['weight']);
                // Convert grams to kg if needed
                if (isset($product_data['weightUnit']) && $product_data['weightUnit'] === 'g') {
                    $weight = round($weight / 1000, 3);
                }
                $product->set_weight($weight);
            }
            
            if (!empty($product_data['length']) || !empty($product_data['width']) || !empty($product_data['height'])) {
                $length = floatval($product_data['length'] ?? 0);
                $width = floatval($product_data['width'] ?? 0);
                $height = floatval($product_data['height'] ?? 0);
                
                // Convert mm to cm if needed
                if (isset($product_data['productDimensionUnit']) && $product_data['productDimensionUnit'] === 'mm') {
                    $length = round($length / 10, 1);
                    $width = round($width / 10, 1);
                    $height = round($height / 10, 1);
                }
                
                $product->set_length($length);
                $product->set_width($width);
                $product->set_height($height);
            }
            
            // Set categories from webUrlHierarchyCollection.web_hierarchy
            $category_ids = array();
            if (isset($product_data['webUrlHierarchyCollection']['web_hierarchy']) && is_array($product_data['webUrlHierarchyCollection']['web_hierarchy'])) {
                $parent_id = 0;
                
                foreach ($product_data['webUrlHierarchyCollection']['web_hierarchy'] as $level_data) {
                    if (!empty($level_data['value'])) {
                        $cat_id = $this->get_or_create_category($level_data['value'], $parent_id);
                        if ($cat_id) {
                            $category_ids[] = $cat_id;
                            $parent_id = $cat_id; // Nested categories
                        }
                    }
                }
            }
            
            if (!empty($category_ids)) {
                $product->set_category_ids($category_ids);
            }
            
            // Store FTG metadata
            $product->update_meta_data('_ftg_one_id', $ftg_id);
            $product->update_meta_data('_ftg_product_code', $sku);
            $product->update_meta_data('_ftg_last_sync', current_time('mysql'));
            $product->update_meta_data('_ftg_stock_type', $product_data['stockType'] ?? '');
            
            // Save product FIRST (required before setting taxonomy terms)
            $product_id = $product->save();
            
            // Set brand as product attribute AFTER saving (enables filtering & permalinks)
            if (!empty($product_data['brand'])) {
                $brand_name = sanitize_text_field($product_data['brand']);
                error_log('Setting brand for product ' . $sku . ': ' . $brand_name);
                $this->set_product_brand($product_id, $brand_name);
            } else {
                error_log('No brand found in product data for SKU: ' . $sku);
            }
            
            return array(
                'success' => true,
                'product_id' => $product_id,
                'sku' => $sku,
                'name' => $product_name,
            );
            
        } catch (Exception $e) {
            error_log('FTG Product Sync Error: ' . $e->getMessage());
            error_log('FTG Product Data: ' . print_r($ftg_product, true));
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
    private function get_or_create_category($category_name, $parent_id = 0) {
        // Check if category exists under the specified parent
        $term = term_exists($category_name, 'product_cat', $parent_id);
        
        if ($term && isset($term['term_id'])) {
            return $term['term_id'];
        }
        
        // Create new category with parent
        $result = wp_insert_term($category_name, 'product_cat', array(
            'parent' => $parent_id,
        ));
        
        if (is_wp_error($result)) {
            return null;
        }
        
        return $result['term_id'];
    }
    
    /**
     * Set product brand using custom taxonomy
     */
    private function set_product_brand($product_id, $brand_name) {
        if (empty($brand_name)) {
            return;
        }
        
        error_log('set_product_brand called with: ' . $brand_name . ' for product ID: ' . $product_id);
        
        // Use custom taxonomy product_brand
        $taxonomy = 'product_brand';
        
        // Register taxonomy if it doesn't exist
        if (!taxonomy_exists($taxonomy)) {
            error_log('Registering product_brand taxonomy');
            
            register_taxonomy(
                $taxonomy,
                array('product'),
                array(
                    'hierarchical' => true,
                    'label' => 'Brands',
                    'labels' => array(
                        'name' => 'Brands',
                        'singular_name' => 'Brand',
                        'menu_name' => 'Brands',
                        'all_items' => 'All Brands',
                        'edit_item' => 'Edit Brand',
                        'view_item' => 'View Brand',
                        'update_item' => 'Update Brand',
                        'add_new_item' => 'Add New Brand',
                        'new_item_name' => 'New Brand Name',
                        'parent_item' => 'Parent Brand',
                        'parent_item_colon' => 'Parent Brand:',
                        'search_items' => 'Search Brands',
                        'not_found' => 'No brands found',
                    ),
                    'show_ui' => true,
                    'show_in_rest' => true,
                    'show_admin_column' => true,
                    'query_var' => true,
                    'rewrite' => array('slug' => 'brand'),
                    'public' => true,
                    'show_in_nav_menus' => true,
                    'show_tagcloud' => true,
                )
            );
            
            flush_rewrite_rules();
        }
        
        // Get or create brand term
        $term = term_exists($brand_name, $taxonomy);
        if (!$term) {
            error_log('Creating brand term: ' . $brand_name);
            $term = wp_insert_term($brand_name, $taxonomy);
            
            if (is_wp_error($term)) {
                error_log('Brand term creation failed: ' . $term->get_error_message());
                return;
            }
        }
        
        $term_id = is_array($term) ? $term['term_id'] : $term;
        error_log('Brand term ID: ' . $term_id);
        
        // Verify term was created
        $check_term = get_term($term_id, $taxonomy);
        if ($check_term && !is_wp_error($check_term)) {
            error_log('Verified brand term: ' . $check_term->name . ' (ID: ' . $check_term->term_id . ')');
        }
        
        // Set the brand taxonomy term for the product
        $result = wp_set_object_terms($product_id, (int)$term_id, $taxonomy);
        
        if (is_wp_error($result)) {
            error_log('Failed to set brand term: ' . $result->get_error_message());
        } else {
            error_log('Brand set successfully for product ID: ' . $product_id);
        }
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
    
    /**
     * Fetch single product by SKU from FTG
     * Returns all product data for inspection/mapping
     */
    public function get_single_product($request) {
        $sku = $request['sku'];
        $collection_token = get_field('ftg_collection_token', 'option');
        
        error_log('=== Fetching Single FTG Product: ' . $sku . ' ===');
        
        if (empty($collection_token)) {
            return new WP_Error('missing_token', 'FTG Collection token not configured', array('status' => 400));
        }
        
        // Get all products from FTG
        $ftg_result = $this->ftg_api->get_products($collection_token);
        
        if (isset($ftg_result['error'])) {
            return new WP_Error('ftg_error', $ftg_result['error'], array('status' => 500));
        }
        
        // Extract products array
        $products = array();
        if (isset($ftg_result['data']['response']) && is_array($ftg_result['data']['response'])) {
            $products = $ftg_result['data']['response'];
        } elseif (isset($ftg_result['data']) && is_array($ftg_result['data'])) {
            $products = $ftg_result['data'];
        }
        
        // Find product by SKU
        $found_product = null;
        foreach ($products as $product) {
            $product_data = $product['productData'] ?? $product;
            $product_code = $product_data['productCode'] ?? '';
            
            if (strcasecmp($product_code, $sku) === 0) {
                $found_product = $product_data;
                break;
            }
        }
        
        if (!$found_product) {
            return new WP_Error('not_found', 'Product not found: ' . $sku, array('status' => 404));
        }
        
        // Format response with all relevant fields
        $stock_qty = 0;
        if (isset($found_product['additionalErpDetails']['stockQuantity'])) {
            $stock_qty = intval($found_product['additionalErpDetails']['stockQuantity']);
        }
        
        $categories = array();
        if (isset($found_product['webUrlHierarchyCollection']['web_hierarchy']) && is_array($found_product['webUrlHierarchyCollection']['web_hierarchy'])) {
            foreach ($found_product['webUrlHierarchyCollection']['web_hierarchy'] as $level) {
                if (!empty($level['value'])) {
                    $categories[] = $level['value'];
                }
            }
        }
        
        $response = array(
            'sku' => $found_product['productCode'] ?? '',
            'name' => $found_product['description1'] ?? '',
            'description' => $found_product['description2'] ?? '',
            'price' => array(
                'selling_price' => $found_product['sellingPrice'] ?? 0,
                'selling_price_with_vat' => ($found_product['sellingPrice'] ?? 0) * 1.15,
                'list_price' => $found_product['listPrice'] ?? 0,
            ),
            'stock' => array(
                'quantity' => $stock_qty,
                'source' => 'additionalErpDetails.stockQuantity',
            ),
            'category' => array(
                'hierarchy' => $categories,
                'path' => implode(' > ', $categories),
            ),
            'dimensions' => array(
                'length_mm' => $found_product['length'] ?? 0,
                'length_cm' => ($found_product['length'] ?? 0) / 10,
                'width_mm' => $found_product['width'] ?? 0,
                'width_cm' => ($found_product['width'] ?? 0) / 10,
                'height_mm' => $found_product['height'] ?? 0,
                'height_cm' => ($found_product['height'] ?? 0) / 10,
                'weight_g' => $found_product['weight'] ?? 0,
                'weight_kg' => ($found_product['weight'] ?? 0) / 1000,
            ),
            'images' => array(
                'image_url' => $found_product['imageUrl'] ?? '',
                'logo_url' => $found_product['logoUrl'] ?? '',
            ),
            'meta' => array(
                'brand' => $found_product['brand'] ?? '',
                'barcode' => $found_product['barcode'] ?? '',
                'supplier_code' => $found_product['supplierCode'] ?? '',
            ),
            'raw_data' => $found_product, // Full raw data for reference
        );
        
        return rest_ensure_response($response);
    }
}
