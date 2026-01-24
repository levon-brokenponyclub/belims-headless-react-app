<?php
/**
 * Categories REST API Endpoint
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Categories_Endpoint {

    /**
     * Register routes
     */
    public function register_routes() {
        register_rest_route('belims/v1', '/categories', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_categories'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Get all product categories
     */
    public function get_categories($request) {
        $args = array(
            'taxonomy' => 'product_cat',
            'hide_empty' => false,
            'parent' => 0, // Only top-level categories
        );

        $categories = get_terms($args);
        $formatted_categories = array();

        foreach ($categories as $category) {
            $formatted_categories[] = $this->format_category($category);
        }

        return rest_ensure_response($formatted_categories);
    }

    /**
     * Format category data
     */
    private function format_category($category) {
        $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
        $image = $thumbnail_id ? wp_get_attachment_url($thumbnail_id) : '';

        // Get subcategories
        $subcategories = get_terms(array(
            'taxonomy' => 'product_cat',
            'parent' => $category->term_id,
            'hide_empty' => false,
        ));

        $subcategory_names = array();
        foreach ($subcategories as $subcat) {
            $subcategory_names[] = $subcat->name;
        }

        return array(
            'id' => $category->slug,
            'name' => $category->name,
            'slug' => $category->slug,
            'count' => $category->count,
            'image' => $image,
            'subcategories' => $subcategory_names,
        );
    }
}
