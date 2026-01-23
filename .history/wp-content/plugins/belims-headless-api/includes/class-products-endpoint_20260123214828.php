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
            'posts_per_page' => isset($params['per_page']) ? intval($params['per_page']) : 100,
            'post_status' => 'publish',
        );

        // Filter by category
        if (!empty($params['category'])) {
            $args['tax_query'] = array(
                array(
                    'taxonomy' => 'product_cat',
                    'field' => 'slug',
                    'terms' => sanitize_text_field($params['category']),
                )
            );
        }

        // Filter by brand (if using brand taxonomy)
        if (!empty($params['brand'])) {
            if (!isset($args['tax_query'])) {
                $args['tax_query'] = array();
            }
            $args['tax_query'][] = array(
                'taxonomy' => 'pa_brand', // Adjust if your brand attribute slug is different
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
        // Get base prices (excl VAT)
        $regular_price = floatval($product->get_regular_price());
        $sale_price = floatval($product->get_sale_price());
        
        // Calculate VAT inclusive prices (15%)
        $regular_price_vat = round($regular_price * 1.15, 2);
        $sale_price_vat = $sale_price > 0 ? round($sale_price * 1.15, 2) : 0;
        
        // Determine final price (with VAT)
        $final_price = $sale_price_vat > 0 ? $sale_price_vat : $regular_price_vat;

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

        // Get categories
        $categories = wp_get_post_terms($product->get_id(), 'product_cat');
        $category_name = !empty($categories) ? $categories[0]->name : 'Uncategorized';

        // Get brand (assuming brand is a product attribute)
        $brand = $product->get_attribute('pa_brand') ?: $product->get_attribute('brand');

        // Get features (from short description or custom field)
        $features = array();
        $features_raw = get_post_meta($product->get_id(), '_product_features', true);
        if (!empty($features_raw)) {
            $features = is_array($features_raw) ? $features_raw : explode("\n", $features_raw);
        }

        // Get specifications
        $specifications = $this->get_product_specifications($product);

        // Get weight for shipping
        $weight = $product->get_weight() ? floatval($product->get_weight()) : 1.0;

        // Bundle candidates (products from same category)
        $bundle_candidates = $this->get_bundle_candidates($product);

        return array(
            'id' => (string) $product->get_id(),
            'name' => $product->get_name(),
            'category' => $category_name,
            'price' => $final_price,
            'regular_price' => $regular_price_vat,
            'sale_price' => $sale_price_vat,
            'price_excl_vat' => $regular_price,
            'image' => $main_image ?: '',
            'images' => $images,
            'rating' => floatval($product->get_average_rating()),
            'reviews' => intval($product->get_review_count()),
            'stock' => intval($product->get_stock_quantity()),
            'maxStock' => 100, // UI reference
            'weight' => $weight,
            'description' => wp_strip_all_tags($product->get_description()),
            'short_description' => wp_strip_all_tags($product->get_short_description()),
            'isBundle' => $product->is_type('grouped') || $product->is_type('bundle'),
            'sku' => $product->get_sku(),
            'brand' => $brand ?: '',
            'features' => $features,
            'specifications' => $specifications,
            'tags' => $this->get_product_tags($product),
            'bundleCandidates' => $bundle_candidates,
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
     * Get bundle candidates (related products)
     */
    private function get_bundle_candidates($product) {
        $candidates = array();
        
        // Get products from the same category
        $categories = wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'ids'));
        
        if (empty($categories)) {
            return $candidates;
        }

        $args = array(
            'post_type' => 'product',
            'posts_per_page' => 4,
            'post__not_in' => array($product->get_id()),
            'tax_query' => array(
                array(
                    'taxonomy' => 'product_cat',
                    'field' => 'term_id',
                    'terms' => $categories[0],
                )
            ),
            'orderby' => 'rand',
        );

        $query = new WP_Query($args);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $related_product = wc_get_product(get_the_ID());
                
                if ($related_product) {
                    $price = floatval($related_product->get_price());
                    $price_vat = round($price * 1.15, 2);
                    
                    $candidates[] = array(
                        'id' => (string) $related_product->get_id(),
                        'name' => $related_product->get_name(),
                        'price' => $price_vat,
                        'image' => wp_get_attachment_url($related_product->get_image_id()),
                        'category' => $categories[0],
                    );
                }
            }
            wp_reset_postdata();
        }

        return $candidates;
    }
}
