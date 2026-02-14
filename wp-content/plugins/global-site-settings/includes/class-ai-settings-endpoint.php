<?php
/**
 * AI Settings REST API Endpoint
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_AI_Settings_Endpoint {

    /**
     * Register routes
     */
    public function register_routes() {
        register_rest_route('belims/v1', '/ai/config', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_ai_config'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Get AI configuration
     */
    public function get_ai_config($request) {
        $enabled = function_exists('get_field') ? (bool) get_field('gemini_enabled', 'option') : false;
        $api_key = function_exists('get_field') ? (string) get_field('gemini_api_key', 'option') : '';
        $features = function_exists('get_field') ? get_field('ai_feature_toggles', 'option') : null;

        return rest_ensure_response(array(
            'gemini_enabled' => $enabled,
            'gemini_api_key' => $api_key,
            'ai_features' => is_array($features) ? $features : array(),
        ));
    }
}
