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
     * Constructor
     */
    public function __construct() {
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
        
        // Validate destination address
        if (empty($destination['street']) || empty($destination['city']) || empty($destination['postal_code'])) {
            return new WP_Error(
                'invalid_address',
                'Address must include street, city, and postal code',
                array('status' => 400)
            );
        }
        
        // Create temporary cart/order to trigger WooCommerce shipping calculation
        // This will use the BobGo plugin's rate calculation
        $rates = $this->calculate_woocommerce_shipping_rates($destination, $parcels);
        
        if (is_wp_error($rates)) {
            return $rates;
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'rates' => $rates,
        ));
    }
    
    /**
     * Calculate shipping rates using WooCommerce shipping zones
     * 
     * @param array $destination
     * @param array $parcels
     * @return array|WP_Error
     */
    private function calculate_woocommerce_shipping_rates($destination, $parcels = array()) {
        // Ensure WooCommerce is loaded
        if (!function_exists('WC')) {
            return new WP_Error('woocommerce_not_active', 'WooCommerce is not active');
        }
        
        // Create package for shipping calculation
        $package = array(
            'contents' => $this->create_mock_cart_contents($parcels),
            'contents_cost' => 0,
            'applied_coupons' => array(),
            'user' => array('ID' => 0),
            'destination' => array(
                'country' => $destination['country'] ?? 'ZA',
                'state' => $this->get_province_code($destination['province'] ?? ''),
                'postcode' => $destination['postal_code'] ?? '',
                'city' => $destination['city'] ?? '',
                'address' => $destination['street'] ?? '',
                'address_2' => $destination['address_2'] ?? '',
            ),
        );
        
        // Calculate total cost
        foreach ($package['contents'] as $item) {
            $package['contents_cost'] += $item['line_total'];
        }
        
        // Get shipping rates by using WooCommerce's shipping calculation
        $rates = $this->get_bobgo_rates_from_plugin($package);
        
        // If no rates found, return error
        if (empty($rates)) {
            return new WP_Error(
                'no_rates_available',
                'No shipping options available for this address',
                array('status' => 200) // 200 because it's not an error, just no rates
            );
        }
        
        return $rates;
    }
    
    /**
     * Get BobGo rates from the official plugin
     * 
     * @param array $package
     * @return array
     */
    private function get_bobgo_rates_from_plugin($package) {
        $rates = array();
        
        // The BobGo plugin adds rates to WooCommerce's shipping calculation
        // We need to trigger it and capture the rates
        
        // Use WooCommerce's shipping calculation
        $shipping = new WC_Shipping();
        $shipping_packages = array($package);
        $calculated_packages = $shipping->calculate_shipping($shipping_packages);
        
        if (!empty($calculated_packages)) {
            foreach ($calculated_packages as $calc_package) {
                if (!empty($calc_package['rates'])) {
                    foreach ($calc_package['rates'] as $rate) {
                        // Only include BobGo rates
                        if (strpos($rate->get_method_id(), 'bobgo') === 0) {
                            $rates[] = array(
                                'service_code' => $rate->get_id(),
                                'service_name' => $rate->get_label(),
                                'total_price' => floatval($rate->get_cost()),
                                'expected_delivery_date' => $this->extract_delivery_time($rate->get_label()),
                                'method_id' => $rate->get_method_id(),
                                'instance_id' => $rate->get_instance_id(),
                            );
                        }
                    }
                }
            }
        }
        
        return $rates;
    }
    
    /**
     * Create mock cart contents for shipping calculation
     * 
     * @param array $parcels
     * @return array
     */
    private function create_mock_cart_contents($parcels = array()) {
        $contents = array();
        
        if (empty($parcels)) {
            // Default mock item
            $parcels = array(
                array(
                    'weight' => 1,
                    'dimensions' => array('length' => 30, 'width' => 20, 'height' => 15),
                ),
            );
        }
        
        foreach ($parcels as $index => $parcel) {
            // Create a mock product
            $product = new WC_Product_Simple();
            $product->set_weight($parcel['weight'] ?? 1);
            
            if (!empty($parcel['dimensions'])) {
                $product->set_length($parcel['dimensions']['length'] ?? 30);
                $product->set_width($parcel['dimensions']['width'] ?? 20);
                $product->set_height($parcel['dimensions']['height'] ?? 15);
            }
            
            $product->set_price(100); // Mock price
            
            $contents['mock_' . $index] = array(
                'data' => $product,
                'quantity' => 1,
                'line_total' => 100,
                'line_subtotal' => 100,
            );
        }
        
        return $contents;
    }
    
    /**
     * Get province code from name
     * 
     * @param string $province
     * @return string
     */
    private function get_province_code($province) {
        $provinces = array(
            'Eastern Cape' => 'EC',
            'Free State' => 'FS',
            'Gauteng' => 'GP',
            'KwaZulu-Natal' => 'KZN',
            'Limpopo' => 'LP',
            'Mpumalanga' => 'MP',
            'Northern Cape' => 'NC',
            'North West' => 'NW',
            'Western Cape' => 'WC',
        );
        
        return $provinces[$province] ?? $province;
    }
    
    /**
     * Extract delivery time from rate label
     * 
     * @param string $label
     * @return string
     */
    private function extract_delivery_time($label) {
        // BobGo plugin might include delivery time in label like "Economy (2-3 days)"
        if (preg_match('/\(([^)]+)\)/', $label, $matches)) {
            return $matches[1];
        }
        
        return '';
    }
}

// Initialize the endpoint
new BobGo_Shipping_Rates_Endpoint();
