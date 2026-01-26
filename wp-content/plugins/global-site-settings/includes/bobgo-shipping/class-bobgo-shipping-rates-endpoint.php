<?php
/**
 * BobGo Shipping Rates Endpoint
 * 
 * REST endpoint for headless frontend to fetch real-time BobGo shipping rates
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * BobGo Shipping Rates REST Endpoint Class
 */
class BobGo_Shipping_Rates_Endpoint {
    
    /**
     * API namespace
     */
    const NAMESPACE = 'belims/v1';
    
    /**
     * BobGo API instance
     * @var BobGo_API
     */
    private $bobgo_api;
    
    /**
     * Constructor
     */
    public function __construct() {
        // Load BobGo API
        require_once GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/bobgo-shipping/class-bobgo-api.php';
        $this->bobgo_api = new BobGo_API();
        
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        register_rest_route(self::NAMESPACE, '/shipping/rates', array(
            'methods' => 'POST',
            'callback' => array($this, 'get_shipping_rates'),
            'permission_callback' => '__return_true', // Public endpoint
            'args' => array(
                'destination_address' => array(
                    'required' => true,
                    'type' => 'object',
                ),
                'parcels' => array(
                    'required' => false,
                    'type' => 'array',
                ),
                'environment' => array(
                    'required' => false,
                    'type' => 'string',
                ),
            ),
        ));
    }
    
    /**
     * Get shipping rates from BobGo
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_shipping_rates($request) {
        $destination = $request->get_param('destination_address');
        $parcels = $request->get_param('parcels');
        $requested_env = $request->get_param('environment');

        // Allow caller to force sandbox/production; defaults to saved option
        $env_override = null;
        if (in_array($requested_env, array('sandbox', 'production'), true)) {
            $env_override = $requested_env;
            $this->bobgo_api = new BobGo_API($env_override);
        }
        
        // Validate destination address
        if (empty($destination['street']) || empty($destination['city']) || empty($destination['postal_code'])) {
            return new WP_Error(
                'invalid_address',
                'Address must include street, city, and postal code',
                array('status' => 400)
            );
        }
        
        // Get shipping rates - simplified approach
        $rates = $this->get_shipping_options($destination, $parcels);
        
        if (is_wp_error($rates)) {
            return $rates;
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'rates' => $rates,
        ));
    }
    
    /**
     * Get available shipping options for destination
     * 
     * @param array $destination
     * @param array $parcels
     * @return array|WP_Error
     */
    private function get_shipping_options($destination, $parcels = array()) {
        // Check if BobGo is configured (env-aware; sandbox can come from env var)
        if (!$this->bobgo_api->has_token()) {
            // BobGo not configured - return free shipping fallback
            return array(
                array(
                    'service_code' => 'free-shipping',
                    'service_name' => 'Free Shipping',
                    'total_price' => 0,
                    'expected_delivery_date' => '3-5 business days',
                ),
            );
        }
        
        // Build request data for BobGo API
        $request_data = $this->build_bobgo_request($destination, $parcels);
        
        // Call BobGo API
        $bobgo_response = $this->bobgo_api->get_checkout_rates($request_data);
        
        if (is_wp_error($bobgo_response)) {
            // Log the error for debugging
            error_log('BobGo API error: ' . $bobgo_response->get_error_message());
            error_log('BobGo API request data: ' . json_encode($request_data));

            // Propagate the error so the frontend can display a meaningful message
            return new WP_Error(
                'bobgo_api_error',
                'BobGo error: ' . $bobgo_response->get_error_message(),
                array('status' => 502)
            );
        }
        
        // Log successful response for debugging
        error_log('BobGo API success: ' . json_encode($bobgo_response));
        
        // Transform BobGo response to our format
        return $this->transform_bobgo_rates($bobgo_response);
    }
    
    /**
     * Build BobGo API request data
     * 
     * @param array $destination Delivery address from frontend
     * @param array $parcels Parcel details
     * @return array
     */
    private function build_bobgo_request($destination, $parcels = array()) {
        // Get store collection address from WooCommerce
        $collection_address = $this->get_collection_address();
        
        // Default parcel if not provided
        if (empty($parcels)) {
            $parcels = array(
                array(
                    'parcel_description' => 'Order item',
                    'submitted_length_cm' => 30,
                    'submitted_width_cm' => 20,
                    'submitted_height_cm' => 15,
                    'submitted_weight_kg' => 1.0,
                ),
            );
        }
        
        // Build parcels array
        $formatted_parcels = array();
        foreach ($parcels as $parcel) {
            $formatted_parcels[] = array(
                'parcel_description' => $parcel['description'] ?? 'Order item',
                'submitted_length_cm' => $parcel['dimensions']['length'] ?? 30,
                'submitted_width_cm' => $parcel['dimensions']['width'] ?? 20,
                'submitted_height_cm' => $parcel['dimensions']['height'] ?? 15,
                'submitted_weight_kg' => $parcel['weight'] ?? 1.0,
            );
        }
        
        return array(
            'collection_address' => $collection_address,
            'delivery_address' => array(
                'type' => 'residential',
                'street_address' => $destination['street'] ?? '',
                'city' => $destination['city'] ?? '',
                'zone' => $destination['province'] ?? '',
                'country' => 'ZA',
                'code' => $destination['postal_code'] ?? '',
            ),
            'parcels' => $formatted_parcels,
        );
    }
    
    /**
     * Get store collection address from WooCommerce
     * 
     * @return array
     */
    private function get_collection_address() {
        // Get WooCommerce store address
        $store_address = get_option('woocommerce_store_address', '');
        $store_city = get_option('woocommerce_store_city', '');
        $store_postcode = get_option('woocommerce_store_postcode', '');
        $store_state = get_option('woocommerce_store_state', '');
        $store_country = get_option('woocommerce_default_country', '');
        
        // Extract country code from "country:state" format
        $country_parts = explode(':', $store_country);
        $country_code = $country_parts[0] ?? 'ZA';
        
        return array(
            'type' => 'business',
            'company' => get_bloginfo('name'),
            'street_address' => $store_address,
            'city' => $store_city,
            'zone' => $store_state,
            'country' => $country_code,
            'code' => $store_postcode,
        );
    }
    
    /**
     * Transform BobGo API response to our format
     * 
     * @param array $bobgo_response Raw BobGo response
     * @return array
     */
    private function transform_bobgo_rates($bobgo_response) {
        $rates = array();
        
        // Check if response contains rates
        if (empty($bobgo_response['data']) || !is_array($bobgo_response['data'])) {
            return $this->get_fallback_rates();
        }
        
        foreach ($bobgo_response['data'] as $rate) {
            $rates[] = array(
                'service_code' => $rate['service_code'] ?? $rate['id'] ?? '',
                'service_name' => $rate['service_name'] ?? $rate['name'] ?? '',
                'total_price' => floatval($rate['total_price'] ?? $rate['price'] ?? 0),
                'expected_delivery_date' => $rate['description'] ?? '',
            );
        }
        
        return !empty($rates) ? $rates : $this->get_fallback_rates();
    }
    
    /**
     * Get fallback shipping rates if BobGo fails
     * 
     * @return array
     */
    private function get_fallback_rates() {
        return array(
            array(
                'service_code' => 'standard',
                'service_name' => 'Standard Delivery (3-5 business days)',
                'total_price' => 89.99,
                'expected_delivery_date' => '3-5 business days',
            ),
            array(
                'service_code' => 'express',
                'service_name' => 'Express Delivery (1-2 business days)',
                'total_price' => 149.99,
                'expected_delivery_date' => '1-2 business days',
            ),
            array(
                'service_code' => 'overnight',
                'service_name' => 'Overnight Delivery (Next business day)',
                'total_price' => 199.99,
                'expected_delivery_date' => 'Next business day',
            ),
        );
    }
}

// Initialize the endpoint
new BobGo_Shipping_Rates_Endpoint();
