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
            'orderby' => 'name',
            'order' => 'ASC',
        );

        $all_categories = get_terms($args);
        $formatted_categories = array();

        foreach ($all_categories as $category) {
            $formatted_categories[] = $this->format_category($category);
        }

        return $this->build_cached_response($request, $formatted_categories);
    }

    private function build_cached_response($request, $payload) {
        $etag = '"' . md5(wp_json_encode($payload)) . '"';
        $if_none_match = trim((string) $request->get_header('if-none-match'));

        $headers = array(
            'Cache-Control' => 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
            'ETag' => $etag,
            'Vary' => 'Accept-Encoding',
        );

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

    /**
     * Format category data with parent hierarchy
     */
    private function format_category($category) {
        $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
        $image = $thumbnail_id ? wp_get_attachment_url($thumbnail_id) : '';

        // Get direct children
        $children = get_terms(array(
            'taxonomy' => 'product_cat',
            'parent' => $category->term_id,
            'hide_empty' => false,
        ));

        $child_categories = array();
        foreach ($children as $child) {
            $child_categories[] = array(
                'id' => $child->term_id,
                'slug' => $child->slug,
                'name' => $child->name,
                'parent' => $category->slug,
            );
        }

        // Get parent slug if exists
        $parent_slug = null;
        if ($category->parent > 0) {
            $parent = get_term($category->parent, 'product_cat');
            if ($parent && !is_wp_error($parent)) {
                $parent_slug = $parent->slug;
            }
        }

        return array(
            'id' => $category->term_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'parent' => $parent_slug,
            'count' => $category->count,
            'image' => $image,
            'children' => $child_categories,
        );
    }
}
