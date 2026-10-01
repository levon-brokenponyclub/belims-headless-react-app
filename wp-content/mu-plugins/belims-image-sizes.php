<?php
/**
 * Plugin Name: Belims Image Sizes
 * Description: Headless storefront serves originals via Cloudflare Image Transformations; skip sub-sizes nothing consumes.
 */

defined('ABSPATH') || exit;

add_filter('intermediate_image_sizes_advanced', function (array $sizes): array {
    unset($sizes['medium_large'], $sizes['large'], $sizes['1536x1536'], $sizes['2048x2048']);
    return $sizes;
});
