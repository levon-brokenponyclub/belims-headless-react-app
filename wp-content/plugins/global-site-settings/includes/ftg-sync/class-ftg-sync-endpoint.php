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
        
        // Cleanup duplicate attributes
        register_rest_route('belims/v1', '/ftg/cleanup-attributes', array(
            'methods' => 'POST',
            'callback' => array($this, 'cleanup_duplicate_attributes'),
            'permission_callback' => array($this, 'check_admin_permission'),
        ));

        // Get brand-filtered product count from FTG
        register_rest_route('belims/v1', '/ftg/brand-count', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_brand_count'),
            'permission_callback' => '__return_true', // read-only; safe to expose
        ));
        
        // Get product filters (Range, Color, Brand)
        register_rest_route('belims/v1', '/products/filters', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product_filters'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        // Sync single product by SKU
        register_rest_route('belims/v1', '/ftg/sync/product', array(
            'methods' => 'POST',
            'callback' => array($this, 'sync_product_by_sku_endpoint'),
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
        // Default test fetch to 10 products
        $limit = $request->get_param('limit') ?: 10;
        
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
        // Increase execution time for large syncs (image downloads are slow)
        set_time_limit(900); // 15 minutes for full catalog (was 10, now 15 to handle all 332)
        
        // Disable image downloads during product creation - batch download after all products created
        define('FTG_SKIP_IMAGE_DOWNLOAD', true);
        
        $params = $request->get_json_params();
        $collection_token = $params['collection_token'] ?? '';
        $limit = $params['limit'] ?? null; // null = all products
        $offset = $params['offset'] ?? 0;
        $requested_brand = sanitize_text_field($params['brand'] ?? '');
        // Default test sync chunking to 50 when a limit is provided, otherwise fall back to 50
        $batch_size = $params['batch_size'] ?? ($limit !== null ? 50 : 50);
        
        error_log('=== FTG Product Sync Started ===');
        error_log('Collection Token: ' . $collection_token);
        error_log('Limit: ' . ($limit ?? 'ALL'));
        error_log('Offset: ' . $offset);
        error_log('Batch Size: ' . $batch_size);
        
        if (empty($collection_token)) {
            return new WP_Error('missing_token', 'Collection token required', array('status' => 400));
        }
        
        // Optional brand filter during pagination (used for test syncs)
        $brand_filter = null;
        if (!empty($requested_brand)) {
            $brand_filter = $requested_brand;
            error_log('Filtering for brand during fetch: ' . $brand_filter);
        }
        // Get products from FTG with pagination to avoid the 100-item cap seen in single calls
        $products = array();
        $page = 1;
        $per_page = 100; // FTG appears to cap at 100 per request; paginate to gather all
        $max_pages = 50; // safety guard
        do {
            $ftg_result = $this->ftg_api->get_products($collection_token, array(
                'PageSize' => $per_page,
                'PageNumber' => $page, // FTG API uses PageNumber/PageSize (capital P) per swagger docs
            ));
            
            error_log('FTG API Result Structure (page ' . $page . '): ' . print_r(array_keys($ftg_result), true));
            
            if (isset($ftg_result['error'])) {
                error_log('FTG Error: ' . $ftg_result['error']);
                return new WP_Error('ftg_error', $ftg_result['error'], array('status' => 500));
            }
            
            $page_products = array();
            if (isset($ftg_result['data']['response']) && is_array($ftg_result['data']['response'])) {
                $page_products = $ftg_result['data']['response'];
            } elseif (isset($ftg_result['data']['data']) && is_array($ftg_result['data']['data'])) {
                $page_products = $ftg_result['data']['data'];
            } elseif (isset($ftg_result['data']) && is_array($ftg_result['data'])) {
                $page_products = $ftg_result['data'];
            }
            
            // Apply brand filter while paginating to avoid over-fetching
            if ($brand_filter !== null) {
                $page_products = array_filter($page_products, function($product) use ($brand_filter) {
                    $product_data = $product['productData'] ?? $product;
                    $brand = $product_data['brand'] ?? '';
                    return strcasecmp($brand, $brand_filter) === 0;
                });
            }
            
            $products = array_merge($products, $page_products);
            error_log('Page ' . $page . ' returned ' . count($page_products) . ' products; cumulative total: ' . count($products));
            
            // Stop early when we've collected enough for the requested limit
            if ($limit !== null && $limit > 0 && count($products) >= $limit) {
                break;
            }
            $page++;
        } while (!empty($page_products) && $page <= $max_pages && ($limit === null || count($products) < $limit));
        
        error_log('Total products retrieved from FTG (all pages): ' . count($products));

        // Remove duplicate SKUs across paginated pages to avoid double-counting
        $deduped_products = $this->deduplicate_products_by_sku($products);
        if (count($deduped_products) !== count($products)) {
            error_log('Deduplicated products by SKU: removed ' . (count($products) - count($deduped_products)) . ' duplicates; unique total: ' . count($deduped_products));
        }
        $products = $deduped_products;
        
        if (empty($products)) {
            error_log('No products to sync - response structure: ' . print_r($ftg_result, true));
            return rest_ensure_response(array(
                'success' => false,
                'message' => 'No products found in API response',
                'synced' => 0,
            ));
        }
        
        $total_available = count($products);
        // Apply limit for non-brand-filtered syncs (brand filter already enforced during fetch)
        if ($brand_filter === null && $limit !== null && $limit > 0) {
            $products = array_slice($products, 0, $limit);
            $total_available = count($products);
            error_log('Limited to ' . $limit . ' products for processing');
        }
        
        // Apply offset and batch_size for chunked processing
        $products = array_slice($products, $offset, $batch_size);
        error_log('Processing chunk: offset=' . $offset . ', batch_size=' . $batch_size . ', count=' . count($products));
        
        $synced_count = 0;
        $skipped_count = 0;
        $errors = array();
        $synced_items = array();
        $skipped_items = array();
        
        foreach ($products as $index => $ftg_product) {
            if ($index < 2) {
                error_log('Processing product ' . $index . ': ' . print_r($ftg_product, true));
            }
            
            // VALIDATION: Skip products without name only
            $product_data = $ftg_product['productData'] ?? $ftg_product;
            $product_name = $product_data['description1'] ?? $product_data['description2'] ?? '';
            $sku = $product_data['productCode'] ?? '';
            $brand = $product_data['brand'] ?? '';
            $ftg_id_report = $ftg_product['ftgOneId'] ?? $product_data['ftgOneId'] ?? '';
            // Compute item details for reporting
            $price_excl_vat = isset($product_data['sellingPrice']) ? floatval($product_data['sellingPrice']) : 0;
            $price_incl_vat = $price_excl_vat > 0 ? round($price_excl_vat * 1.15, 2) : 0;
            $stock_qty = 0;
            if (isset($product_data['additionalErpDetails']['stockQuantity'])) {
                $stock_qty = intval($product_data['additionalErpDetails']['stockQuantity']);
            }
            $length = floatval($product_data['length'] ?? 0);
            $width  = floatval($product_data['width'] ?? 0);
            $height = floatval($product_data['height'] ?? 0);
            $dim_unit = 'cm';
            if (isset($product_data['productDimensionUnit']) && $product_data['productDimensionUnit'] === 'mm') {
                $length = $length > 0 ? round($length / 10, 1) : 0;
                $width  = $width  > 0 ? round($width  / 10, 1) : 0;
                $height = $height > 0 ? round($height / 10, 1) : 0;
                $dim_unit = 'cm';
            }
            $weight = 0.0; $weight_unit = 'kg';
            if (!empty($product_data['weight'])) {
                $weight = floatval($product_data['weight']);
                if (isset($product_data['weightUnit']) && $product_data['weightUnit'] === 'g') {
                    $weight = round($weight / 1000, 3);
                    $weight_unit = 'kg';
                }
            }
            $categories_names = array();
            if (isset($product_data['webUrlHierarchyCollection']['web_hierarchy']) && is_array($product_data['webUrlHierarchyCollection']['web_hierarchy'])) {
                foreach ($product_data['webUrlHierarchyCollection']['web_hierarchy'] as $level_data) {
                    if (!empty($level_data['value'])) {
                        $categories_names[] = $level_data['value'];
                    }
                }
            }
            $has_image = !empty($product_data['imageUrl']);
            $has_description = !empty($product_data['description2']);
            $range = !empty($product_data['range']) ? sanitize_text_field($product_data['range']) : '';
            $color = !empty($product_data['colour']) ? sanitize_text_field($product_data['colour']) : '';
            
            if (empty($product_name)) {
                $skipped_count++;
                $skipped_items[] = array(
                    'sku' => $sku,
                    'reason' => 'No Name',
                    'brand' => $brand,
                );
                error_log('SKIPPED Product (No Name): ' . $sku);
                continue; // Skip to next product
            }
            
            $result = $this->create_or_update_wc_product($ftg_product);
            
            if ($result['success']) {
                $synced_count++;
                $synced_items[] = array(
                    'sku' => $result['sku'] ?? $sku,
                    'name' => $result['name'] ?? $product_name,
                    'product_id' => $result['product_id'] ?? 0,
                    'price' => $price_incl_vat,
                    'categories' => $categories_names,
                    'brand' => $brand,
                    'range' => $range,
                    'color' => $color,
                    'image' => $has_image ? 'Yes' : 'No',
                    'description' => $has_description ? 'Yes' : 'No',
                    'stock' => $stock_qty,
                    'dimensions' => array('length' => $length, 'width' => $width, 'height' => $height, 'unit' => $dim_unit),
                    'weight' => array('value' => $weight, 'unit' => $weight_unit),
                    'ftg_id' => $ftg_id_report,
                );
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
        
        // Calculate if there are more products to process
        $total_requested = $limit ?? count($products);
        $next_offset = $offset + $batch_size;
        // Check against the actual available count when filtering by brand
        $total_to_sync = ($total_available > 0) ? min($total_requested, $total_available) : $total_requested;
        $has_more = ($next_offset < $total_to_sync);
        $progress = ($total_to_sync > 0) ? min(100, round(($next_offset / $total_to_sync) * 100)) : 100;
        
        error_log('Progress calculation: offset=' . $offset . ', batch_size=' . $batch_size . ', next_offset=' . $next_offset . ', total_requested=' . $total_requested . ', has_more=' . ($has_more ? 'yes' : 'no') . ', progress=' . $progress . '%');
        
        // BATCH IMAGE DOWNLOAD: If we skipped images during creation, download them now (async)
        if (defined('FTG_SKIP_IMAGE_DOWNLOAD') && FTG_SKIP_IMAGE_DOWNLOAD) {
            error_log('=== Starting batch image download ===');
            $this->batch_download_pending_images();
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'brand_filter' => $brand_filter,
            'synced' => $synced_count,
            'skipped' => $skipped_count,
            'total' => count($products),
            'has_more' => $has_more,
            'next_offset' => $next_offset,
            'progress' => $progress,
            'errors' => $errors,
            'synced_items' => $synced_items,
            'skipped_items' => $skipped_items,
        ));
    }

    /**
     * REST endpoint to sync single product by SKU
     */
    public function sync_product_by_sku_endpoint($request) {
        $params = $request->get_json_params();
        $sku = sanitize_text_field($params['sku'] ?? '');
        $collection_token = sanitize_text_field($params['collection_token'] ?? '');

        if (empty($sku)) {
            return new WP_Error('missing_sku', 'SKU is required', array('status' => 400));
        }

        if (empty($collection_token)) {
            $collection_token = get_field('ftg_collection_token', 'option');
        }

        if (empty($collection_token)) {
            return new WP_Error('missing_token', 'Collection token not provided and not configured in site settings', array('status' => 400));
        }

        error_log('=== Syncing Single Product via REST: SKU=' . $sku . ' ===');

        set_time_limit(300); // 5 minutes for single product sync

        $result = $this->sync_single_product_by_sku($collection_token, $sku);

        if (!$result['success']) {
            return new WP_Error('sync_failed', $result['message'] ?? 'Failed to sync product', array('status' => 400));
        }

        return rest_ensure_response($result);
    }

    /**
     * Remove duplicate products by SKU to prevent repeated updates when pagination repeats results.
     */
    private function deduplicate_products_by_sku(array $products) {
        $unique_products = array();
        $seen_skus = array();

        foreach ($products as $product) {
            $product_data = $product['productData'] ?? $product;
            $sku = $product_data['productCode'] ?? $product_data['mdrProductCode'] ?? $product_data['altProductCode'] ?? '';

            if (empty($sku)) {
                continue;
            }

            if (isset($seen_skus[$sku])) {
                continue;
            }

            $seen_skus[$sku] = true;
            $unique_products[] = $product;
        }

        return $unique_products;
    }

    /**
     * Return total unique products for a brand from FTG.
     */
    public function get_brand_count($request) {
        $collection_token = $request->get_param('collection_token') ?: get_field('ftg_collection_token', 'option');
        $brand = $request->get_param('brand') ?: 'Assa Abloy';
        $per_page = 100;
        $max_pages = 50;

        if (empty($collection_token)) {
            return new WP_Error('missing_token', 'Collection token required', array('status' => 400));
        }

        $products = array();
        $page = 1;
        $page_sizes = array();
        $offset = 0;

        do {
            error_log("brand-count: fetching PageNumber $page for brand $brand");
            $ftg_result = $this->ftg_api->get_products($collection_token, array(
                'PageSize' => $per_page,
                'PageNumber' => $page, // FTG API uses PageNumber/PageSize (capital P)
            ));

            if (isset($ftg_result['error'])) {
                error_log("brand-count: FTG error on page $page: " . $ftg_result['error']);
                return new WP_Error('ftg_error', $ftg_result['error'], array('status' => 500));
            }

            $page_products = array();
            if (isset($ftg_result['data']['response']) && is_array($ftg_result['data']['response'])) {
                $page_products = $ftg_result['data']['response'];
            } elseif (isset($ftg_result['data']['data']) && is_array($ftg_result['data']['data'])) {
                $page_products = $ftg_result['data']['data'];
            } elseif (isset($ftg_result['data']) && is_array($ftg_result['data'])) {
                $page_products = $ftg_result['data'];
            }
            
            error_log("brand-count: page $page returned " . count($page_products) . " total products before filtering");

            if (!empty($brand)) {
                $page_products = array_filter($page_products, function($product) use ($brand) {
                    $product_data = $product['productData'] ?? $product;
                    return strcasecmp($product_data['brand'] ?? '', $brand) === 0;
                });
            }

            $page_sizes[] = count($page_products);
            
            // log first 3 SKUs to see if they're different
            $skus = array_map(function($p) {
                $data = $p['productData'] ?? $p;
                return $data['productCode'] ?? 'no-sku';
            }, array_slice($page_products, 0, 3));
            error_log("brand-count: offset $offset first 3 SKUs: " . implode(', ', $skus));
            
            error_log("brand-count: PageNumber $page has " . count($page_products) . " $brand products; cumulative: " . count($products));
            $products = array_merge($products, $page_products);
            $page++;
        } while (!empty($page_products) && $page <= $max_pages);

        $products = $this->deduplicate_products_by_sku($products);
        $first_product = null;

        if (!empty($products[0])) {
            $first_product_data = $products[0]['productData'] ?? $products[0];
            $first_product = array(
                'name' => $first_product_data['description1'] ?? $first_product_data['description2'] ?? $first_product_data['description3'] ?? 'Unnamed Product',
                'sku' => $first_product_data['productCode'] ?? $first_product_data['mdrProductCode'] ?? $first_product_data['altProductCode'] ?? '',
            );
        }

        return rest_ensure_response(array(
            'success' => true,
            'brand' => $brand,
            'total_unique' => count($products),
            'first_product' => $first_product,
            'pages_fetched' => $page - 1,
            'page_sizes' => $page_sizes,
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

            $previous = array(
                'name' => $product->get_name(),
                'description' => $product->get_description(),
                'short_description' => $product->get_short_description(),
                'price' => $product->get_regular_price(),
                'stock' => $product->get_stock_quantity(),
                'weight' => $product->get_weight(),
                'length' => $product->get_length(),
                'width' => $product->get_width(),
                'height' => $product->get_height(),
                'image_id' => $product->get_image_id(),
                'categories' => $existing_product_id ? wp_get_post_terms($existing_product_id, 'product_cat', array('fields' => 'ids')) : array(),
                'brand' => $existing_product_id ? wp_get_post_terms($existing_product_id, 'product_brand', array('fields' => 'names')) : array(),
                'range' => $existing_product_id ? wp_get_post_terms($existing_product_id, 'product_range', array('fields' => 'names')) : array(),
                'color' => $existing_product_id ? wp_get_post_terms($existing_product_id, 'product_color', array('fields' => 'names')) : array(),
            );
            
            // Set basic product data using correct FTG field names
            $product_name = $product_data['description1'] ?? $product_data['description2'] ?? $product_data['description3'] ?? 'Unnamed Product';
            $product->set_name($product_name);
            $product->set_sku($sku);
            
            // Log description fields for debugging
            error_log("Product $sku - description1: " . ($product_data['description1'] ?? 'EMPTY'));
            error_log("Product $sku - description2: " . ($product_data['description2'] ?? 'EMPTY'));
            error_log("Product $sku - description3: " . ($product_data['description3'] ?? 'EMPTY'));
            
            // Set description
            // Use wp_kses_post to allow safe HTML tags (h3, ul, li, strong, p, br, etc.)
            $raw_description = $product_data['description2'] ?? '';
            $safe_description = wp_kses_post($raw_description);
            $product->set_description($safe_description);
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

            $weight = 0.0;
            $weight_unit = 'kg';
            $length = 0.0;
            $width = 0.0;
            $height = 0.0;
            $dim_unit = 'cm';
            
            // Set weight and dimensions if available
            if (!empty($product_data['weight'])) {
                $weight = floatval($product_data['weight']);
                // Convert grams to kg if needed
                if (isset($product_data['weightUnit']) && $product_data['weightUnit'] === 'g') {
                    $weight = round($weight / 1000, 3);
                    $weight_unit = 'kg';
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
                    $dim_unit = 'cm';
                }
                
                $product->set_length($length);
                $product->set_width($width);
                $product->set_height($height);
            }
            
            // Set categories from webUrlHierarchyCollection.web_hierarchy
            $category_ids = array();
            $categories_names = array();
            if (isset($product_data['webUrlHierarchyCollection']['web_hierarchy']) && is_array($product_data['webUrlHierarchyCollection']['web_hierarchy'])) {
                $parent_id = 0;
                
                foreach ($product_data['webUrlHierarchyCollection']['web_hierarchy'] as $level_data) {
                    if (!empty($level_data['value'])) {
                        $categories_names[] = $level_data['value'];
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
            
            // Set product image from FTG (use medium quality for faster downloads)
            // Unless we're batching images for later (FTG_SKIP_IMAGE_DOWNLOAD flag)
            if (!defined('FTG_SKIP_IMAGE_DOWNLOAD') || !FTG_SKIP_IMAGE_DOWNLOAD) {
                $image_url = null;
                if (!empty($product_data['imageUrlSizes']['medium'])) {
                    $image_url = $product_data['imageUrlSizes']['medium'];
                    error_log('Using medium image for product ' . $sku . ': ' . $image_url);
                } elseif (!empty($product_data['imageUrlSizes']['large'])) {
                    $image_url = $product_data['imageUrlSizes']['large'];
                    error_log('Using large image for product ' . $sku . ': ' . $image_url);
                } elseif (!empty($product_data['imageUrl'])) {
                    $image_url = $product_data['imageUrl'];
                    error_log('Using original image for product ' . $sku . ': ' . $image_url);
                }
                
                if ($image_url) {
                    $this->set_product_image($product, $image_url);
                } else {
                    error_log('No image URL found for SKU: ' . $sku);
                }
            } else {
                // Batch image download for later - just store the image URL in meta
                $image_url = null;
                if (!empty($product_data['imageUrlSizes']['medium'])) {
                    $image_url = $product_data['imageUrlSizes']['medium'];
                } elseif (!empty($product_data['imageUrlSizes']['large'])) {
                    $image_url = $product_data['imageUrlSizes']['large'];
                } elseif (!empty($product_data['imageUrl'])) {
                    $image_url = $product_data['imageUrl'];
                }
                if ($image_url) {
                    update_post_meta($product_id, '_ftg_image_url_pending', $image_url);
                    error_log('Queued image for batch download: ' . $sku);
                }
            }
            
            // Set brand as product attribute AFTER saving (enables filtering & permalinks)
            if (!empty($product_data['brand'])) {
                $brand_name = sanitize_text_field($product_data['brand']);
                error_log('Setting brand for product ' . $sku . ': ' . $brand_name);
                $this->set_product_brand($product_id, $brand_name);
            } else {
                error_log('No brand found in product data for SKU: ' . $sku);
            }
            
            // Set range as product attribute AFTER saving
            if (!empty($product_data['range'])) {
                $range_name = sanitize_text_field($product_data['range']);
                error_log('Setting range for product ' . $sku . ': ' . $range_name);
                $this->set_product_taxonomy($product_id, 'product_range', $range_name, 'Range');
            }
            
            // Set color as product attribute AFTER saving
            if (!empty($product_data['colour'])) {
                $color_name = sanitize_text_field($product_data['colour']);
                error_log('Setting color for product ' . $sku . ': ' . $color_name);
                $this->set_product_taxonomy($product_id, 'product_color', $color_name, 'Color');
            }

            $updated_fields = array();
            if ($previous['name'] !== $product_name) {
                $updated_fields[] = 'name';
            }
            if ($previous['description'] !== ($product_data['description2'] ?? '')) {
                $updated_fields[] = 'description';
            }
            if ($previous['short_description'] !== ($product_data['description1'] ?? '')) {
                $updated_fields[] = 'short_description';
            }
            if (floatval($previous['price']) !== floatval($price_incl_vat)) {
                $updated_fields[] = 'price';
            }
            if (intval($previous['stock']) !== intval($stock_qty)) {
                $updated_fields[] = 'stock';
            }
            if (!empty($product_data['weight'])) {
                if (floatval($previous['weight']) !== floatval($weight)) {
                    $updated_fields[] = 'weight';
                }
            }
            if (floatval($previous['length']) !== floatval($length) || floatval($previous['width']) !== floatval($width) || floatval($previous['height']) !== floatval($height)) {
                $updated_fields[] = 'dimensions';
            }
            $current_categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'ids'));
            sort($current_categories);
            $previous_categories = $previous['categories'];
            sort($previous_categories);
            if ($current_categories !== $previous_categories) {
                $updated_fields[] = 'categories';
            }
            $current_brand = wp_get_post_terms($product_id, 'product_brand', array('fields' => 'names'));
            $current_range = wp_get_post_terms($product_id, 'product_range', array('fields' => 'names'));
            $current_color = wp_get_post_terms($product_id, 'product_color', array('fields' => 'names'));
            if ($current_brand !== $previous['brand']) {
                $updated_fields[] = 'brand';
            }
            if ($current_range !== $previous['range']) {
                $updated_fields[] = 'range';
            }
            if ($current_color !== $previous['color']) {
                $updated_fields[] = 'color';
            }
            $current_image_id = $product->get_image_id();
            $has_pending_image = !empty(get_post_meta($product_id, '_ftg_image_url_pending', true));
            if ($current_image_id && intval($current_image_id) !== intval($previous['image_id'])) {
                $updated_fields[] = 'image';
            } elseif ($has_pending_image && empty($previous['image_id'])) {
                $updated_fields[] = 'image_pending';
            }

            $synced_data = array(
                'name' => $product_name,
                'sku' => $sku,
                'description' => $product_data['description2'] ?? '',
                'short_description' => $product_data['description1'] ?? '',
                'price_excl_vat' => $price_excl_vat,
                'price_incl_vat' => $price_incl_vat,
                'stock' => $stock_qty,
                'weight' => array('value' => $weight, 'unit' => $weight_unit),
                'dimensions' => array('length' => $length, 'width' => $width, 'height' => $height, 'unit' => $dim_unit),
                'brand' => !empty($product_data['brand']) ? sanitize_text_field($product_data['brand']) : '',
                'range' => !empty($product_data['range']) ? sanitize_text_field($product_data['range']) : '',
                'color' => !empty($product_data['colour']) ? sanitize_text_field($product_data['colour']) : '',
                'categories' => $categories_names,
            );
            
            return array(
                'success' => true,
                'product_id' => $product_id,
                'sku' => $sku,
                'name' => $product_name,
                'updated_fields' => $updated_fields,
                'synced_data' => $synced_data,
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
        
        $product_id = $product->get_id();
        $sku = $product->get_sku();
        
        // Check if product already has an image
        $existing_image_id = $product->get_image_id();
        if ($existing_image_id) {
            error_log("Product $sku already has image ID: $existing_image_id - skipping image download");
            return true;
        }
        
        error_log("=== Starting image download for product $sku ===");
        error_log("Image URL: $image_url");
        error_log("Product ID: $product_id");
        
        // Custom timeout callback
        $timeout_filter = function() { return 60; };
        
        // Temporarily adjust settings for external image downloads
        add_filter('https_ssl_verify', '__return_false');
        add_filter('http_request_timeout', $timeout_filter);
        
        // Allow higher memory for image processing
        @ini_set('memory_limit', '256M');
        
        try {
            // Download the image file directly using wp_remote_get (bypasses MD5 validation)
            $response = wp_remote_get($image_url, array(
                'timeout' => 60,
                'sslverify' => false
            ));
            
            if (is_wp_error($response)) {
                error_log("=== FAILED to download image for product $sku ===");
                error_log("Error: " . $response->get_error_message());
                error_log("Error code: " . $response->get_error_code());
                error_log("Image URL: $image_url");
                return false;
            }
            
            // Check response code
            $response_code = wp_remote_retrieve_response_code($response);
            if ($response_code !== 200) {
                error_log("=== FAILED to download image for product $sku ===");
                error_log("HTTP Response Code: $response_code");
                error_log("Image URL: $image_url");
                return false;
            }
            
            // Get the image data
            $image_data = wp_remote_retrieve_body($response);
            if (empty($image_data)) {
                error_log("=== FAILED: Empty image data for product $sku ===");
                error_log("Image URL: $image_url");
                return false;
            }
            
            // Get filename from URL
            $filename = basename(parse_url($image_url, PHP_URL_PATH));
            if (empty($filename)) {
                $filename = $sku . '.png';
            }
            
            // Upload to WordPress media library
            $upload = wp_upload_bits($filename, null, $image_data);
            
            if (!empty($upload['error'])) {
                error_log("=== FAILED to upload image for product $sku ===");
                error_log("Upload error: " . $upload['error']);
                error_log("Image URL: $image_url");
                return false;
            }
            
            // Prepare attachment data
            $file_path = $upload['file'];
            $file_type = wp_check_filetype($filename, null);
            $attachment_data = array(
                'post_mime_type' => $file_type['type'],
                'post_title'     => sanitize_file_name($sku),
                'post_content'   => '',
                'post_status'    => 'inherit'
            );
            
            // Insert the attachment
            $image_id = wp_insert_attachment($attachment_data, $file_path, $product_id);
            
            if (is_wp_error($image_id)) {
                error_log("=== FAILED to create attachment for product $sku ===");
                error_log("Error: " . $image_id->get_error_message());
                error_log("Image URL: $image_url");
                @unlink($file_path); // Clean up uploaded file
                return false;
            }
            
            // Generate attachment metadata
            require_once(ABSPATH . 'wp-admin/includes/image.php');
            $attach_data = wp_generate_attachment_metadata($image_id, $file_path);
            wp_update_attachment_metadata($image_id, $attach_data);
            
            error_log("=== Successfully downloaded image ID $image_id for product $sku ===");
            
            // Set as product image and save immediately
            $product->set_image_id($image_id);
            $product->save();
            
            // Verify it was set
            $verify_image_id = get_post_thumbnail_id($product_id);
            if ($verify_image_id == $image_id) {
                error_log("=== Image verified and saved for product $sku (Image ID: $image_id) ===");
            } else {
                error_log("=== WARNING: Image may not have saved correctly for product $sku ===");
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("=== EXCEPTION downloading image for product $sku ===");
            error_log("Exception: " . $e->getMessage());
            return false;
        } finally {
            // Always restore settings
            remove_filter('https_ssl_verify', '__return_false');
            remove_filter('http_request_timeout', $timeout_filter);
        }
    }
    
    /**
     * Set product taxonomy term (for product_range, product_color, etc.)
     * Taxonomies are pre-registered on init hook in main plugin file
     */
    private function set_product_taxonomy($product_id, $taxonomy, $term_name, $display_name) {
        if (empty($term_name)) {
            return;
        }
        
        error_log('set_product_taxonomy called: ' . $taxonomy . ' = ' . $term_name . ' for product ID: ' . $product_id);
        
        // Get or create term
        $term = term_exists($term_name, $taxonomy);
        if (!$term) {
            error_log('Creating ' . $taxonomy . ' term: ' . $term_name);
            $term = wp_insert_term($term_name, $taxonomy);
            
            if (is_wp_error($term)) {
                error_log($taxonomy . ' term creation failed: ' . $term->get_error_message());
                return;
            }
        }
        
        $term_id = is_array($term) ? $term['term_id'] : $term;
        error_log($taxonomy . ' term ID: ' . $term_id);
        
        // Verify term was created
        $check_term = get_term($term_id, $taxonomy);
        if ($check_term && !is_wp_error($check_term)) {
            error_log('Verified ' . $taxonomy . ' term: ' . $check_term->name . ' (ID: ' . $check_term->term_id . ')');
        }
        
        // Set the taxonomy term for the product
        $result = wp_set_object_terms($product_id, (int)$term_id, $taxonomy);
        
        if (is_wp_error($result)) {
            error_log('Failed to set ' . $taxonomy . ' term: ' . $result->get_error_message());
        } else {
            error_log($taxonomy . ' set successfully for product ID: ' . $product_id);
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
        
        // Paginate through all products to find the matching SKU
        $per_page = 100;
        $max_pages = 1000; // Safety limit - equivalent to 100,000 products
        $page = 1;
        $found_product = null;
        $total_checked = 0;
        
        do {
            error_log("Searching for SKU on page $page");
            
            // Get products from FTG with pagination
            $ftg_result = $this->ftg_api->get_products($collection_token, array(
                'PageSize' => $per_page,
                'PageNumber' => $page,
            ));
            
            if (isset($ftg_result['error'])) {
                error_log('FTG Error on page ' . $page . ': ' . $ftg_result['error']);
                return new WP_Error('ftg_error', $ftg_result['error'], array('status' => 500));
            }
            
            // Extract products array
            $products = array();
            if (isset($ftg_result['data']['response']) && is_array($ftg_result['data']['response'])) {
                $products = $ftg_result['data']['response'];
            } elseif (isset($ftg_result['data']['data']) && is_array($ftg_result['data']['data'])) {
                $products = $ftg_result['data']['data'];
            } elseif (isset($ftg_result['data']) && is_array($ftg_result['data'])) {
                $products = $ftg_result['data'];
            }
            
            error_log("Page $page returned " . count($products) . " products");
            $total_checked += count($products);
            
            // Search for product by SKU on this page
            foreach ($products as $product) {
                $product_data = $product['productData'] ?? $product;
                $product_code = $product_data['productCode'] ?? '';
                $mdr_code = $product_data['mdrProductCode'] ?? '';
                $alt_code = $product_data['altProductCode'] ?? '';
                
                // Check all possible code fields (case-insensitive)
                if (strcasecmp($product_code, $sku) === 0 || 
                    strcasecmp($mdr_code, $sku) === 0 || 
                    strcasecmp($alt_code, $sku) === 0) {
                    error_log("✅ Found matching product: $sku");
                    $found_product = $product_data;
                    break 2; // Break out of both loops
                }
            }
            
            // If no more products on this page, we've reached the end
            if (empty($products) || count($products) < $per_page) {
                error_log("No more products - reached end of catalog on page $page (checked $total_checked total)");
                break;
            }
            
            $page++;
        } while ($page <= $max_pages);
        
        if (!$found_product) {
            error_log("❌ Product not found: $sku. Searched through $total_checked products across " . ($page - 1) . " pages");
            return new WP_Error('not_found', 'Product not found: ' . $sku . ' (searched ' . $total_checked . ' products)', array('status' => 404));
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
    
    /**
     * Cleanup duplicate attributes (product_range, product_color)
     * Removes duplicates and keeps only one of each attribute
     */
    public function cleanup_duplicate_attributes($request) {
        global $wpdb;
        
        error_log('=== Cleaning up duplicate attributes ===');
        
        // Find all duplicate product_range and product_color attributes
        $attributes_to_clean = array('product_range', 'product_color');
        $cleanup_report = array();
        
        foreach ($attributes_to_clean as $attr_slug) {
            // Get all terms for this taxonomy
            $terms = get_terms(array(
                'taxonomy' => $attr_slug,
                'hide_empty' => false,
            ));
            
            if (is_wp_error($terms) || empty($terms)) {
                error_log('No terms found for taxonomy: ' . $attr_slug);
                continue;
            }
            
            // Group terms by name to find duplicates
            $term_groups = array();
            foreach ($terms as $term) {
                if (!isset($term_groups[$term->name])) {
                    $term_groups[$term->name] = array();
                }
                $term_groups[$term->name][] = $term;
            }
            
            // For each term name with duplicates, keep the first and delete the rest
            $deleted_count = 0;
            foreach ($term_groups as $term_name => $term_list) {
                if (count($term_list) > 1) {
                    error_log('Found ' . count($term_list) . ' duplicate terms for: ' . $term_name);
                    
                    // Keep the first term, delete the rest
                    $keep_term = $term_list[0];
                    for ($i = 1; $i < count($term_list); $i++) {
                        $delete_term = $term_list[$i];
                        error_log('Deleting duplicate term: ' . $delete_term->name . ' (ID: ' . $delete_term->term_id . ')');
                        wp_delete_term($delete_term->term_id, $attr_slug);
                        $deleted_count++;
                    }
                }
            }
            
            $cleanup_report[$attr_slug] = array(
                'duplicates_removed' => $deleted_count,
                'terms_remaining' => count($terms) - $deleted_count,
            );
        }
        
        error_log('=== Cleanup Complete ===');
        error_log('Cleanup Report: ' . json_encode($cleanup_report));
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Duplicate attributes cleaned up',
            'report' => $cleanup_report,
        ));
    }
    
    /**
     * Get product filters (Range, Color, Brand) with product counts
     */
    public function get_product_filters($request) {
        $filters = array();
        
        // Get Range filter
        $range_terms = get_terms(array(
            'taxonomy' => 'product_range',
            'hide_empty' => true,
            'orderby' => 'name',
            'order' => 'ASC',
        ));
        
        if (!is_wp_error($range_terms) && !empty($range_terms)) {
            $ranges = array();
            foreach ($range_terms as $term) {
                $ranges[] = array(
                    'id' => $term->term_id,
                    'slug' => $term->slug,
                    'name' => $term->name,
                    'count' => $term->count,
                );
            }
            $filters['range'] = $ranges;
        }
        
        // Get Color filter
        $color_terms = get_terms(array(
            'taxonomy' => 'product_color',
            'hide_empty' => true,
            'orderby' => 'name',
            'order' => 'ASC',
        ));
        
        if (!is_wp_error($color_terms) && !empty($color_terms)) {
            $colors = array();
            foreach ($color_terms as $term) {
                $colors[] = array(
                    'id' => $term->term_id,
                    'slug' => $term->slug,
                    'name' => $term->name,
                    'count' => $term->count,
                );
            }
            $filters['color'] = $colors;
        }
        
        // Get Brand filter
        $brand_terms = get_terms(array(
            'taxonomy' => 'product_brand',
            'hide_empty' => true,
            'orderby' => 'name',
            'order' => 'ASC',
        ));
        
        if (!is_wp_error($brand_terms) && !empty($brand_terms)) {
            $brands = array();
            foreach ($brand_terms as $term) {
                $brands[] = array(
                    'id' => $term->term_id,
                    'slug' => $term->slug,
                    'name' => $term->name,
                    'count' => $term->count,
                );
            }
            $filters['brand'] = $brands;
        }
        
        return rest_ensure_response($filters);
    }

    /**
     * Sync a single product by SKU from FTG
     * 
     * @param string $ftg_token FTG Collection token
     * @param string $sku Product SKU to sync
     * @return array Success status with message and product details
     */
    public function sync_single_product_by_sku($ftg_token, $sku) {
        error_log("=== Syncing Single Product by SKU: $sku ===");
        
        if (empty($ftg_token)) {
            return array(
                'success' => false,
                'message' => 'FTG token not provided',
            );
        }
        
        if (empty($sku)) {
            return array(
                'success' => false,
                'message' => 'SKU is required',
            );
        }

        try {
            // Paginate through all products to find the matching SKU
            $per_page = 100;
            $max_pages = 1000; // Safety limit - equivalent to 100,000 products
            $page = 1;
            $found_product = null;
            
            do {
                error_log("Searching for SKU on page $page");
                
                // Get products from FTG with pagination
                $ftg_result = $this->ftg_api->get_products($ftg_token, array(
                    'PageSize' => $per_page,
                    'PageNumber' => $page,
                ));
                
                if (isset($ftg_result['error'])) {
                    error_log('FTG Error on page ' . $page . ': ' . $ftg_result['error']);
                    return array(
                        'success' => false,
                        'message' => 'Failed to fetch from FTG: ' . $ftg_result['error'],
                    );
                }
                
                // Extract products array
                $products = array();
                if (isset($ftg_result['data']['response']) && is_array($ftg_result['data']['response'])) {
                    $products = $ftg_result['data']['response'];
                } elseif (isset($ftg_result['data']['data']) && is_array($ftg_result['data']['data'])) {
                    $products = $ftg_result['data']['data'];
                } elseif (isset($ftg_result['data']) && is_array($ftg_result['data'])) {
                    $products = $ftg_result['data'];
                }
                
                error_log("Page $page returned " . count($products) . " products");
                
                // Search for product by SKU on this page
                foreach ($products as $product) {
                    $product_data = $product['productData'] ?? $product;
                    $product_code = $product_data['productCode'] ?? '';
                    $mdr_code = $product_data['mdrProductCode'] ?? '';
                    $alt_code = $product_data['altProductCode'] ?? '';
                    
                    error_log("Checking product codes: productCode=$product_code, mdrProductCode=$mdr_code, altProductCode=$alt_code");
                    
                    // Check all possible code fields (case-insensitive)
                    if (strcasecmp($product_code, $sku) === 0 || 
                        strcasecmp($mdr_code, $sku) === 0 || 
                        strcasecmp($alt_code, $sku) === 0) {
                        error_log("✅ Found matching product: $sku");
                        $found_product = $product;
                        break 2; // Break out of both loops
                    }
                }
                
                // If no more products on this page, we've reached the end
                if (empty($products) || count($products) < $per_page) {
                    error_log("No more products - reached end of catalog on page $page");
                    break;
                }
                
                $page++;
            } while ($page <= $max_pages);
            
            if (!$found_product) {
                error_log("❌ Product not found in FTG after searching all pages: $sku");
                return array(
                    'success' => false,
                    'message' => 'Product not found in FTG. Please verify the SKU is correct.',
                );
            }
            
            error_log("✅ Found product, creating/updating in WooCommerce");
            
            // Create or update WC product
            $result = $this->create_or_update_wc_product($found_product);
            
            if (!$result['success']) {
                error_log("❌ Failed to create/update WooCommerce product: " . ($result['error'] ?? 'Unknown error'));
                return array(
                    'success' => false,
                    'message' => $result['error'] ?? 'Failed to update product',
                );
            }
            
            // Get the product name for response
            $product_data = $found_product['productData'] ?? $found_product;
            $product_name = $product_data['description1'] ?? $product_data['description2'] ?? 'Product';
            
            error_log("✅ Successfully synced product: $sku - $product_name");
            
            return array(
                'success' => true,
                'message' => 'Product synced successfully',
                'product_name' => $product_name,
                'sku' => $sku,
                'updated_fields' => $result['updated_fields'] ?? array(),
                'synced_data' => $result['synced_data'] ?? array(),
            );
            
        } catch (Exception $e) {
            error_log("❌ Exception while syncing product $sku: " . $e->getMessage());
            return array(
                'success' => false,
                'message' => 'Exception: ' . $e->getMessage(),
            );
        }
    }

    /**
     * Batch download images for all products that have pending images
     * This runs after all products are created to save time during sync
     */
    private function batch_download_pending_images() {
        $start_time = microtime(true);
        $downloaded = 0;
        $failed = 0;
        
        error_log('Querying for products with pending images...');
        
        // Get all products with pending images
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => -1, // Get all
            'meta_key' => '_ftg_image_url_pending',
            'meta_compare' => 'EXISTS',
        );
        
        $query = new WP_Query($args);
        
        error_log('Found ' . $query->found_posts . ' products with pending images');
        
        foreach ($query->posts as $post) {
            $product = wc_get_product($post->ID);
            if (!$product) {
                continue;
            }
            
            $image_url = get_post_meta($post->ID, '_ftg_image_url_pending', true);
            if (!$image_url) {
                continue;
            }
            
            // Download the image
            if ($this->set_product_image($product, $image_url)) {
                $downloaded++;
            } else {
                $failed++;
                error_log('Failed to download image for product ' . $product->get_sku());
            }
            
            // Remove the pending meta
            delete_post_meta($post->ID, '_ftg_image_url_pending');
            
            // Check timeout - if we're running low on time, stop
            $elapsed = microtime(true) - $start_time;
            if ($elapsed > 480) { // Stop if approaching 8 minute mark (leaving 2 min buffer)
                error_log('Batch image download timeout approaching - pausing at ' . $downloaded . ' downloaded');
                break;
            }
        }
        
        wp_reset_postdata();
        
        $elapsed = microtime(true) - $start_time;
        error_log('=== Batch image download complete ===');
        error_log('Downloaded: ' . $downloaded);
        error_log('Failed: ' . $failed);
        error_log('Time elapsed: ' . round($elapsed, 2) . 's');
    }

    }

