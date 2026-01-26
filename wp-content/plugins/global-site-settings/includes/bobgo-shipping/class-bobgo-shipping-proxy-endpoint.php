<?php
/**
 * BobGo Shipping Proxy Endpoint
 * 
 * Proxy endpoint for headless frontend that uses WooCommerce's built-in
 * shipping calculator with the official BobGo plugin (already configured).
 * No BobGo API key needed in the app—just POST the address.
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * BobGo Shipping Proxy REST Endpoint
 * Uses WooCommerce's shipping calculator
 */
class BobGo_Shipping_Proxy_Endpoint {
    
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
                'items' => array(
                    'required' => false,
                    'type' => 'array',
                ),
            ),
        ));
    }
    
    /**
     * Get shipping rates using WooCommerce's shipping calculator
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response|WP_Error
     */
    public function get_shipping_rates($request) {
        $destination = $request->get_param('destination_address');
        $items = $request->get_param('items') ?? array();
        
        // Validate destination address
        if (empty($destination['city']) || empty($destination['postal_code'])) {
            return new WP_Error(
                'invalid_address',
                'Address must include city and postal code',
                array('status' => 400)
            );
        }
        
        try {
            // Get WooCommerce package
            $package = $this->build_wc_package($destination, $items);
            
            // Calculate shipping using WooCommerce
            $rates = $this->calculate_shipping_rates($package);
            
            if (empty($rates)) {
                return new WP_Error(
                    'no_rates',
                    'No shipping methods available for this address',
                    array('status' => 400)
                );
            }
            
            return rest_ensure_response(array(
                'success' => true,
                'rates' => $rates,
            ));
        } catch (Exception $e) {
            error_log('BobGo Proxy Error: ' . $e->getMessage());
            return new WP_Error(
                'shipping_error',
                'Could not calculate shipping rates: ' . $e->getMessage(),
                array('status' => 500)
            );
        }
    }
    
    /**
     * Build WooCommerce package for shipping calculation
     * 
     * @param array $destination Delivery address
     * @param array $items Cart items (optional, for weight/volume)
     * @return array
     */
    private function build_wc_package($destination, $items = array()) {
        // Default package if not provided
        $contents = array();
        if (!empty($items) && is_array($items)) {
            foreach ($items as $item) {
                $product_id = $item['product_id'] ?? 0;
                if ($product_id && function_exists('wc_get_product')) {
                    $product = wc_get_product($product_id);
                    if ($product) {
                        $contents[] = array(
                            'key' => 'item-' . $product_id,
                            'product_id' => $product_id,
                            'variation_id' => 0,
                            'variation' => array(),
                            'quantity' => $item['quantity'] ?? 1,
                            'data' => $product,
                            'line_total' => ($product->get_price() ?? 0) * ($item['quantity'] ?? 1),
                            'line_tax' => 0,
                        );
                    }
                }
            }
        }
        
        // Default package content if items were not provided or failed
        if (empty($contents)) {
            $contents = array(
                'item-default' => array(
                    'key' => 'item-default',
                    'product_id' => 0,
                    'variation_id' => 0,
                    'variation' => array(),
                    'quantity' => 1,
                    'data' => null,
                    'line_total' => 0,
                    'line_tax' => 0,
                ),
            );
        }
        
        // Build the package
        return array(
            'contents' => $contents,
            'contents_cost' => 0,
            'applied_coupons' => array(),
            'user' => array(
                'ID' => 0, // Guest checkout
            ),
            'destination' => array(
                'country' => 'ZA',
                'state' => $destination['province'] ?? '',
                'postcode' => $destination['postal_code'] ?? '',
                'city' => $destination['city'] ?? '',
            ),
            'shipping_method' => array(),
            'package_theme' => 'default',
        );
    }
    
    /**
     * Calculate shipping rates using WooCommerce
     * 
     * @param array $package WooCommerce package
     * @return array
     */
    private function calculate_shipping_rates($package) {
        if (!function_exists('WC') || !WC()->shipping) {
            throw new Exception('WooCommerce shipping not available');
        }
        
        // Set the package for calculation
        WC()->shipping->calculate_shipping(array($package));
        
        // Get calculated packages
        $packages = WC()->shipping->get_packages();
        
        if (empty($packages[0]['rates'])) {
            return array();
        }
        
        $rates = array();
        foreach ($packages[0]['rates'] as $method_id => $rate) {
            $rates[] = array(
                'service_code' => $method_id,
                'service_name' => $rate->get_label(),
                'total_price' => floatval($rate->cost),
                'expected_delivery_date' => $this->get_delivery_estimate($rate),
            );
        }
        
        return $rates;
    }
    
    /**
     * Get estimated delivery from rate meta
     * 
     * @param WC_Shipping_Rate $rate
     * @return string
     */
    private function get_delivery_estimate($rate) {
        $meta = $rate->get_meta_data();
        
        // Check for BobGo delivery estimate
        if (isset($meta['delivery_days'])) {
            $days = $meta['delivery_days'];
            return $days . ' business days';
        }
        
        // Generic estimate
        return '3-5 business days';
    }
}
