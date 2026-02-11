<?php
/**
 * Products REST API Endpoint
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Products_Endpoint {

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
        
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => isset($params['per_page']) ? intval($params['per_page']) : -1, // -1 = all products
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
                    $products[] = $this->format_product($product);
                }
            }
            wp_reset_postdata();
        }

        return rest_ensure_response($products);
    }

    /**
     * Get single product
     */
    public function get_product($request) {
        $id = $request['id'];
        $product = wc_get_product($id);

        if (!$product) {
            return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
        }

        return rest_ensure_response($this->format_product($product));
    }

    /**
     * Format product data for frontend
     * Includes VAT, bundles, weight, etc.
     */
    private function format_product($product) {
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
            $main_category = $categories[0];
            // Get all ancestors (parent categories)
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

        // Get ACF deals
        $acf_data = array();
        if (function_exists('get_field')) {
            $deals = get_field('deals', $product->get_id());
            if (!empty($deals)) {
                $acf_data['deals'] = $deals;
            }
        }

        return array(
            'id' => (string) $product->get_id(),
            'name' => $product->get_name(),
            'category' => $category_name,
            'breadcrumbs' => $breadcrumbs,
            'price' => $final_price,
            'regular_price' => $regular_price_incl_vat,
            'sale_price' => $sale_price_incl_vat,
            'price_excl_vat' => $regular_price_excl_vat,
            'image' => $main_image ?: '',
            'images' => $images,
            'acf' => $acf_data,
            'rating' => floatval($product->get_average_rating()),
            'reviews' => intval($product->get_review_count()),
            'stock' => intval($product->get_stock_quantity()),
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
                
                if ($bundled_wc_product && $bundled_wc_product->is_in_stock()) {
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
