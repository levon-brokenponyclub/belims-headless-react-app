<?php
/**
 * Products REST API Endpoint
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Products_Endpoint {

    private $default_listing_fields = array(
        'id',
        'name',
        'slug',
        'category',
        'price',
        'regular_price',
        'sale_price',
        'price_excl_vat',
        'image',
        'featured_image',
        'stock',
        'stock_status',
        'maxStock',
        'in_stock',
        'rating',
        'reviews',
        'sku',
        'brand',
        'isFeatured',
        'deals',
        'best_deal_consumer',
        'best_deal_trade',
        'acf',
    );

    /**
     * Register routes
     */
    public function register_routes() {
        register_rest_route('belims/v1', '/products', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_products'),
            'permission_callback' => '__return_true', // Public endpoint
        ));

        register_rest_route('belims/v1', '/products/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Get all products
     */
    public function get_products($request) {
        $params = $request->get_params();
        $view = !empty($params['view']) && $params['view'] === 'detail' ? 'detail' : 'listing';
        $fields = $this->parse_fields_param(isset($params['fields']) ? $params['fields'] : null);
        $page = isset($params['page']) ? max(1, intval($params['page'])) : 1;
        $per_page = isset($params['per_page']) ? intval($params['per_page']) : -1;

        if ($per_page === 0) {
            $per_page = -1;
        }

        if ($per_page > 100) {
            $per_page = 100;
        }
        
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => $per_page, // -1 keeps existing all-products behavior
            'paged' => $per_page > 0 ? $page : 1,
            'post_status' => 'publish',
        );

        // Filter by featured products
        if (!empty($params['featured']) && $params['featured'] === 'true') {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'product_visibility',
                    'field' => 'name',
                    'terms' => 'featured',
                )
            );
        }

        // Filter by category
        if (!empty($params['category'])) {
            if (!isset($args['tax_query'])) {
                $args['tax_query'] = array();
            }
            $args['tax_query'][] = array(
                'taxonomy' => 'product_cat',
                'field' => 'slug',
                'terms' => sanitize_text_field($params['category']),
            );
        }

        // Filter by brand (if using brand taxonomy)
        if (!empty($params['brand'])) {
            if (!isset($args['tax_query'])) {
                $args['tax_query'] = array();
            }
            $args['tax_query'][] = array(
                'taxonomy' => 'product_brand',
                'field' => 'slug',
                'terms' => sanitize_text_field($params['brand']),
            );
        }

        // Search query
        if (!empty($params['search'])) {
            $args['s'] = sanitize_text_field($params['search']);
        }

        $query = new WP_Query($args);
        $products = array();

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $product = wc_get_product(get_the_ID());
                
                if ($product) {
                    $products[] = $this->format_product($product, $view, $fields);
                }
            }
            wp_reset_postdata();
        }

        $headers = array();
        if ($per_page > 0) {
            $headers['X-WP-Total'] = (string) intval($query->found_posts);
            $headers['X-WP-TotalPages'] = (string) intval($query->max_num_pages);
            $headers['X-Page'] = (string) $page;
            $headers['X-Per-Page'] = (string) $per_page;
        }

        return $this->build_cached_response($request, $products, $headers);
    }

    /**
     * Get single product
     */
    public function get_product($request) {
        $id = $request['id'];
        $params = $request->get_params();
        $view = !empty($params['view']) && $params['view'] === 'listing' ? 'listing' : 'detail';
        $fields = $this->parse_fields_param(isset($params['fields']) ? $params['fields'] : null);
        $product = wc_get_product($id);

        if (!$product) {
            return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
        }

        return $this->build_cached_response(
            $request,
            $this->format_product($product, $view, $fields)
        );
    }

    /**
     * Format product data for frontend
     * Includes VAT, bundles, weight, etc.
     */
    private function format_product($product, $view = 'detail', $fields = null) {
        // WooCommerce prices are already VAT-inclusive in South Africa
        // Get prices (already include VAT)
        $regular_price_incl_vat = floatval($product->get_regular_price());
        $sale_price_incl_vat = floatval($product->get_sale_price());
        
        // Calculate prices excluding VAT (divide by 1.15 for 15% VAT)
        $regular_price_excl_vat = $regular_price_incl_vat > 0 ? round($regular_price_incl_vat / 1.15, 2) : 0;
        $sale_price_excl_vat = $sale_price_incl_vat > 0 ? round($sale_price_incl_vat / 1.15, 2) : 0;
        
        // Determine final price (with VAT - already inclusive)
        $final_price = $sale_price_incl_vat > 0 ? $sale_price_incl_vat : $regular_price_incl_vat;

        // Get product images
        $images = array();
        $image_ids = $product->get_gallery_image_ids();
        
        if (!empty($image_ids)) {
            foreach ($image_ids as $image_id) {
                $images[] = wp_get_attachment_url($image_id);
            }
        }
        
        // Main image
        $main_image = wp_get_attachment_url($product->get_image_id());
        if ($main_image) {
            array_unshift($images, $main_image);
        }

        // Get categories and build breadcrumb hierarchy
        $categories = wp_get_post_terms($product->get_id(), 'product_cat');
        $category_name = !empty($categories) ? $categories[0]->name : 'Uncategorized';
        
        // Build breadcrumb trail with category hierarchy
        $breadcrumbs = array(
            array('label' => 'Shop', 'slug' => 'shop')
        );
        
        if (!empty($categories)) {
            // Find the deepest (leaf) category - the one with no children in our product's category list
            $main_category = $categories[0];
            $max_depth = 0;
            
            foreach ($categories as $cat) {
                // Get ancestors of this category
                $ancestors = get_ancestors($cat->term_id, 'product_cat');
                $depth = count($ancestors);
                
                // If this category has more ancestors, it's deeper in the hierarchy
                if ($depth > $max_depth) {
                    $max_depth = $depth;
                    $main_category = $cat;
                }
            }
            
            // Get all ancestors (parent categories) of the deepest category
            $ancestors = get_ancestors($main_category->term_id, 'product_cat');
            // Reverse to show from root to leaf
            $ancestors = array_reverse($ancestors);
            
            // Add ancestor categories to breadcrumbs
            foreach ($ancestors as $ancestor_id) {
                $ancestor = get_term($ancestor_id, 'product_cat');
                if ($ancestor && !is_wp_error($ancestor)) {
                    $breadcrumbs[] = array(
                        'label' => $ancestor->name,
                        'slug' => $ancestor->slug
                    );
                }
            }
            
            // Add main category
            $breadcrumbs[] = array(
                'label' => $main_category->name,
                'slug' => $main_category->slug
            );
        }

        // Get brand from product_brand taxonomy
        $brand_terms = wp_get_post_terms($product->get_id(), 'product_brand');
        $brand = !empty($brand_terms) ? $brand_terms[0]->name : '';

        $normalized_deals = $this->get_normalized_deals($product);
        $best_consumer_deal = $this->resolve_best_deal($normalized_deals, 'consumer');
        $best_trade_deal = $this->resolve_best_deal($normalized_deals, 'trade');

        $acf_data = array(
            'deals' => $normalized_deals,
        );
        if (function_exists('get_field')) {
            $range_label = get_field('range_label', $product->get_id());
            $range = get_field('range', $product->get_id());
            $range_slug = get_field('range_slug', $product->get_id());
            if (!empty($range_label)) {
                $acf_data['range_label'] = $range_label;
            }
            if (!empty($range)) {
                $acf_data['range'] = $range;
            }
            if (!empty($range_slug)) {
                $acf_data['range_slug'] = $range_slug;
            }
        }

        $listing_dto = array(
            'id' => (string) $product->get_id(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'category' => $category_name,
            'price' => $final_price,
            'regular_price' => $regular_price_incl_vat,
            'sale_price' => $sale_price_incl_vat,
            'price_excl_vat' => $regular_price_excl_vat,
            'image' => $main_image ?: '',
            'featured_image' => $main_image ?: '',
            'stock' => intval($product->get_stock_quantity()),
            'stock_status' => $product->is_in_stock() ? 'instock' : 'outofstock',
            'maxStock' => 100,
            'in_stock' => $product->is_in_stock(),
            'rating' => floatval($product->get_average_rating()),
            'reviews' => intval($product->get_review_count()),
            'sku' => $product->get_sku(),
            'brand' => $brand ?: '',
            'isFeatured' => $this->is_product_featured($product),
            'deals' => $normalized_deals,
            'best_deal_consumer' => $best_consumer_deal,
            'best_deal_trade' => $best_trade_deal,
            'acf' => $acf_data,
        );

        if ($view === 'listing') {
            return $this->filter_fields(
                $listing_dto,
                !empty($fields) ? $fields : $this->default_listing_fields
            );
        }

        // Get features from ACF repeater field
        $features = array();
        if (function_exists('get_field')) {
            $features_acf = get_field('features', $product->get_id());
            if (!empty($features_acf) && is_array($features_acf)) {
                foreach ($features_acf as $feature) {
                    if (!empty($feature['feature_text'])) {
                        $features[] = $feature['feature_text'];
                    }
                }
            }
        }

        // Get specifications
        $specifications = $this->get_product_specifications($product);

        // Get weight for shipping
        $weight = $product->get_weight() ? floatval($product->get_weight()) : 1.0;

        // Bundle candidates (products from same category)
        $bundle_candidates = $this->get_bundle_candidates($product);

        // Check if product is featured
        $is_featured = $this->is_product_featured($product);

        // Get video URL from ACF
        $video_url = '';
        if (function_exists('get_field')) {
            $video_url = get_field('video_url', $product->get_id());
        }
        
        // Use test video for all products if no video is set (for testing)
        if (empty($video_url)) {
            $video_url = '/images/development/output_32s_50s_360p_under1_5mb.mp4';
        }

        $detail_dto = array(
            'id' => (string) $product->get_id(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'category' => $category_name,
            'breadcrumbs' => $breadcrumbs,
            'price' => $final_price,
            'regular_price' => $regular_price_incl_vat,
            'sale_price' => $sale_price_incl_vat,
            'price_excl_vat' => $regular_price_excl_vat,
            'image' => $main_image ?: '',
            'images' => $images,
            'video_url' => $video_url ?: '',
            'acf' => $acf_data,
            'deals' => $normalized_deals,
            'best_deal_consumer' => $best_consumer_deal,
            'best_deal_trade' => $best_trade_deal,
            'rating' => floatval($product->get_average_rating()),
            'reviews' => intval($product->get_review_count()),
            'stock' => intval($product->get_stock_quantity()),
            'stock_status' => $product->is_in_stock() ? 'instock' : 'outofstock',
            'maxStock' => 100, // UI reference
            'weight' => $weight,
            'description' => apply_filters('the_content', $product->get_description()),
            'short_description' => wp_strip_all_tags($product->get_short_description()),
            'isBundle' => $product->is_type('grouped') || $product->is_type('bundle'),
            'isFeatured' => $is_featured,
            'sku' => $product->get_sku(),
            'brand' => $brand ?: '',
            'features' => $features,
            'specifications' => $specifications,
            'tags' => $this->get_product_tags($product),
            'bundleCandidates' => $bundle_candidates,
            'cross_sell_ids' => array_map('strval', $product->get_cross_sells()),
            'in_stock' => $product->is_in_stock(),
        );

        return $this->filter_fields($detail_dto, $fields);
    }

    private function parse_fields_param($fields_param) {
        if (empty($fields_param)) {
            return null;
        }

        if (is_array($fields_param)) {
            $fields = $fields_param;
        } else {
            $fields = explode(',', (string) $fields_param);
        }

        $fields = array_values(array_filter(array_map('trim', $fields)));
        return !empty($fields) ? $fields : null;
    }

    private function filter_fields($data, $fields) {
        if (empty($fields) || !is_array($fields)) {
            return $data;
        }

        $filtered = array();
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $filtered[$field] = $data[$field];
            }
        }
        return $filtered;
    }

    private function build_cached_response($request, $payload, $extra_headers = array()) {
        $etag = '"' . md5(wp_json_encode($payload)) . '"';
        $if_none_match = trim((string) $request->get_header('if-none-match'));

        $headers = array_merge(array(
            'Cache-Control' => 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
            'ETag' => $etag,
            'Vary' => 'Accept-Encoding',
        ), $extra_headers);

        if (!empty($if_none_match)) {
            $incoming_tags = array_map('trim', explode(',', $if_none_match));
            if (in_array($etag, $incoming_tags, true) || in_array('*', $incoming_tags, true)) {
                $response = new WP_REST_Response(null, 304);
                foreach ($headers as $key => $value) {
                    $response->header($key, $value);
                }
                return $response;
            }
        }

        $response = rest_ensure_response($payload);
        foreach ($headers as $key => $value) {
            $response->header($key, $value);
        }
        return $response;
    }

    private function get_normalized_deals($product) {
        $normalized = array();
        $raw_deals = array();

        if (function_exists('get_field')) {
            $acf_deals = get_field('deals', $product->get_id());
            if (is_array($acf_deals)) {
                $raw_deals = $acf_deals;
            }
        }

        if (empty($raw_deals)) {
            $meta_deals = get_post_meta($product->get_id(), 'deals', true);
            if (is_array($meta_deals)) {
                $raw_deals = $meta_deals;
            } elseif (is_string($meta_deals) && !empty($meta_deals)) {
                $decoded = json_decode($meta_deals, true);
                if (is_array($decoded)) {
                    $raw_deals = $decoded;
                }
            }
        }

        foreach ($raw_deals as $deal) {
            if (!is_array($deal)) {
                continue;
            }

            $start_ts = !empty($deal['start_at']) ? strtotime($deal['start_at']) : null;
            $end_ts = !empty($deal['end_at']) ? strtotime($deal['end_at']) : null;

            $normalized[] = array(
                'deal_id' => isset($deal['deal_id']) ? (string) $deal['deal_id'] : '',
                'audience' => isset($deal['audience']) ? (string) $deal['audience'] : 'consumer',
                'type' => isset($deal['type']) ? (string) $deal['type'] : 'sale',
                'visibility' => isset($deal['visibility']) ? (string) $deal['visibility'] : 'public',
                'priority' => isset($deal['priority']) ? intval($deal['priority']) : null,
                'is_active_override' => !empty($deal['is_active_override']),
                'start_at' => isset($deal['start_at']) ? $deal['start_at'] : null,
                'end_at' => isset($deal['end_at']) ? $deal['end_at'] : null,
                'start_ts' => $start_ts,
                'end_ts' => $end_ts,
                'pricing_mode' => isset($deal['pricing_mode']) ? (string) $deal['pricing_mode'] : null,
                'apply_base_price' => isset($deal['apply_base_price']) ? (string) $deal['apply_base_price'] : null,
                'deal_price' => isset($deal['deal_price']) ? floatval($deal['deal_price']) : null,
                'discount_value' => isset($deal['discount_value']) ? floatval($deal['discount_value']) : null,
                'discount_percent' => isset($deal['discount_percent']) ? floatval($deal['discount_percent']) : null,
                'show_badge' => isset($deal['show_badge']) ? (bool) $deal['show_badge'] : null,
                'show_strikethrough' => isset($deal['show_strikethrough']) ? (bool) $deal['show_strikethrough'] : null,
                'requires_trade_login' => isset($deal['requires_trade_login']) ? (bool) $deal['requires_trade_login'] : null,
                'reveal_trade_price_when_logged_out' => isset($deal['reveal_trade_price_when_logged_out']) ? (bool) $deal['reveal_trade_price_when_logged_out'] : null,
                'eligibility_copy' => isset($deal['eligibility_copy']) ? (string) $deal['eligibility_copy'] : null,
                'label_mode' => isset($deal['label_mode']) ? (string) $deal['label_mode'] : null,
                'label_text' => isset($deal['label_text']) ? (string) $deal['label_text'] : null,
                'label_template' => isset($deal['label_template']) ? (string) $deal['label_template'] : null,
                'deal_name' => isset($deal['deal_name']) ? (string) $deal['deal_name'] : null,
                'badge_style' => isset($deal['badge_style']) ? (string) $deal['badge_style'] : null,
            );
        }

        return $normalized;
    }

    private function resolve_best_deal($deals, $audience_context) {
        if (empty($deals) || !is_array($deals)) {
            return null;
        }

        $now = time();
        $type_priority = array(
            'clearance' => 10,
            'trade_special' => 20,
            'deal_of_day' => 30,
            'weekly_special' => 40,
            'sale' => 50,
            'bundle' => 90,
            'promo' => 90,
        );

        $best = null;
        $best_score = null;

        foreach ($deals as $deal) {
            if (!is_array($deal)) {
                continue;
            }

            if (empty($deal['is_active_override'])) {
                if (!empty($deal['start_ts']) && $now < intval($deal['start_ts'])) {
                    continue;
                }
                if (!empty($deal['end_ts']) && $now > intval($deal['end_ts'])) {
                    continue;
                }
            }

            $audience = isset($deal['audience']) ? $deal['audience'] : 'consumer';
            $visibility = isset($deal['visibility']) ? $deal['visibility'] : 'public';

            if ($audience_context === 'consumer') {
                if ($audience === 'trade') {
                    continue;
                }
                if ($audience === 'both' && $visibility === 'gated') {
                    continue;
                }
                if ($visibility === 'gated') {
                    continue;
                }
            } else {
                if ($audience === 'consumer') {
                    continue;
                }
            }

            $type = isset($deal['type']) ? $deal['type'] : 'sale';
            $type_rank = isset($type_priority[$type]) ? intval($type_priority[$type]) : 100;
            $deal_priority = isset($deal['priority']) ? intval($deal['priority']) : 999;
            $discount_percent = isset($deal['discount_percent']) ? floatval($deal['discount_percent']) : 0.0;
            $end_ts = !empty($deal['end_ts']) ? intval($deal['end_ts']) : PHP_INT_MAX;

            $score = array($type_rank, $deal_priority, -$discount_percent, $end_ts);

            if ($best_score === null || $score < $best_score) {
                $best_score = $score;
                $best = $deal;
            }
        }

        return $best;
    }

    /**
     * Get product specifications
     */
    private function get_product_specifications($product) {
        $specs = array();
        
        // Get all attributes
        $attributes = $product->get_attributes();
        
        foreach ($attributes as $attribute) {
            if ($attribute->get_variation()) {
                continue; // Skip variation attributes
            }
            
            $specs[] = array(
                'label' => wc_attribute_label($attribute->get_name()),
                'value' => $product->get_attribute($attribute->get_name())
            );
        }

        // Add weight and dimensions
        if ($product->get_weight()) {
            $specs[] = array(
                'label' => 'Weight',
                'value' => $product->get_weight() . ' kg'
            );
        }

        if ($product->get_dimensions(false)) {
            $specs[] = array(
                'label' => 'Dimensions',
                'value' => $product->get_dimensions(false)
            );
        }

        return $specs;
    }

    /**
     * Get product tags
     */
    private function get_product_tags($product) {
        $tags = wp_get_post_terms($product->get_id(), 'product_tag');
        return array_map(function($tag) {
            return $tag->name;
        }, $tags);
    }

    /**
     * Check if product is featured
     */
    private function is_product_featured($product) {
        $terms = wp_get_post_terms($product->get_id(), 'product_visibility');
        foreach ($terms as $term) {
            if ($term->name === 'featured') {
                return true;
            }
        }
        return false;
    }

    /**
     * Get bundle candidates (related products) - sorted by relevance
     * First checks for manually selected bundled products, then falls back to automatic candidates
     * Candidates are sorted by rating, then by price (ascending)
     */
    private function get_bundle_candidates($product) {
        $candidates = array();
        
        // First, check for manually selected bundled products
        $manual_bundles = array();
        if (class_exists('Belims_Bundled_Products')) {
            $manual_bundles = Belims_Bundled_Products::get_bundled_products($product->get_id());
        }
        
        // If we have manually selected bundled products, use those
        if (!empty($manual_bundles)) {
            foreach ($manual_bundles as $bundled_product) {
                $bundled_wc_product = wc_get_product($bundled_product['id']);
                
                if ($bundled_wc_product) {
                    $price_incl_vat = floatval($bundled_wc_product->get_price());
                    $rating = floatval($bundled_wc_product->get_average_rating());
                    
                    $candidates[] = array(
                        'id' => (string) $bundled_wc_product->get_id(),
                        'name' => $bundled_wc_product->get_name(),
                        'price' => $price_incl_vat,
                        'regular_price' => $price_incl_vat,
                        'image' => wp_get_attachment_url($bundled_wc_product->get_image_id()) ?: '',
                        'rating' => $rating,
                        'reviews' => intval($bundled_wc_product->get_review_count()),
                        'stock' => intval($bundled_wc_product->get_stock_quantity()),
                    );
                }
            }
            
            // Return manual bundles if we have any
            if (!empty($candidates)) {
                return $candidates;
            }
        }
        
        // Fall back to automatic candidates from same category
        $categories = wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'ids'));
        
        if (empty($categories)) {
            return $candidates;
        }

        // Query with better sorting: rating (descending), then price (ascending)
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => 6,
            'post__not_in' => array($product->get_id()),
            'tax_query' => array(
                array(
                    'taxonomy' => 'product_cat',
                    'field' => 'term_id',
                    'terms' => $categories[0],
                )
            ),
            'orderby' => array(
                'meta_value_num' => 'DESC',  // Sort by rating (highest first)
                'date' => 'DESC',             // Then by date (newest first)
            ),
            'meta_key' => '_wc_average_rating',
        );

        $query = new WP_Query($args);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $related_product = wc_get_product(get_the_ID());
                
                if ($related_product && $related_product->is_in_stock()) {
                    // WooCommerce prices are already VAT-inclusive
                    $price_incl_vat = floatval($related_product->get_price());
                    $rating = floatval($related_product->get_average_rating());
                    
                    $candidates[] = array(
                        'id' => (string) $related_product->get_id(),
                        'name' => $related_product->get_name(),
                        'price' => $price_incl_vat,
                        'regular_price' => $price_incl_vat,
                        'image' => wp_get_attachment_url($related_product->get_image_id()) ?: '',
                        'category' => $categories[0],
                        'rating' => $rating,
                        'reviews' => intval($related_product->get_review_count()),
                        'stock' => intval($related_product->get_stock_quantity()),
                    );
                }
            }
            wp_reset_postdata();
        }

        // Return up to 4 best matches (sorted by rating & stock status)
        return array_slice($candidates, 0, 4);
    }
}
