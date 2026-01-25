<?php
/**
 * BobGo Shipping Method for WooCommerce
 * 
 * Provides real-time shipping rates from BobGo at checkout
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Check if WooCommerce is active before defining the class
 */
function bobgo_shipping_init() {
    if (!class_exists('WC_Shipping_Method')) {
        return;
    }

    class BobGo_Shipping_Method extends WC_Shipping_Method {
        
        /**
         * BobGo API instance
         * @var BobGo_API
         */
        private $bobgo_api;
        
        /**
         * Constructor
         */
        public function __construct($instance_id = 0) {
            $this->id = 'bobgo_shipping';
            $this->instance_id = absint($instance_id);
            $this->method_title = __('BobGo Shipping', 'global-site-settings');
            $this->method_description = __('Real-time shipping rates from BobGo', 'global-site-settings');
            $this->supports = array(
                'shipping-zones',
                'instance-settings',
                'instance-settings-modal',
            );
            
            $this->init();
            
            // Load BobGo API
            require_once GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/bobgo-shipping/class-bobgo-api.php';
            $this->bobgo_api = new BobGo_API();
        }
        
        /**
         * Initialize settings
         */
        public function init() {
            $this->init_form_fields();
            $this->init_settings();
            
            $this->enabled = $this->get_option('enabled');
            $this->title = $this->get_option('title');
            
            add_action('woocommerce_update_options_shipping_' . $this->id, array($this, 'process_admin_options'));
        }
        
        /**
         * Initialize form fields
         */
        public function init_form_fields() {
            $this->instance_form_fields = array(
                'enabled' => array(
                    'title' => __('Enable/Disable', 'global-site-settings'),
                    'type' => 'checkbox',
                    'label' => __('Enable BobGo Shipping', 'global-site-settings'),
                    'default' => 'yes',
                ),
                'title' => array(
                    'title' => __('Method Title', 'global-site-settings'),
                    'type' => 'text',
                    'description' => __('Title shown to customers during checkout', 'global-site-settings'),
                    'default' => __('BobGo Shipping', 'global-site-settings'),
                    'desc_tip' => true,
                ),
                'collection_address' => array(
                    'title' => __('Collection Address', 'global-site-settings'),
                    'type' => 'textarea',
                    'description' => __('Your warehouse/store address for collection', 'global-site-settings'),
                    'default' => '',
                    'desc_tip' => true,
                    'custom_attributes' => array(
                        'rows' => 5,
                    ),
                ),
                'fallback_cost' => array(
                    'title' => __('Fallback Cost', 'global-site-settings'),
                    'type' => 'price',
                    'description' => __('Flat rate to charge if BobGo API is unavailable', 'global-site-settings'),
                    'default' => '100.00',
                    'desc_tip' => true,
                ),
                'free_shipping_threshold' => array(
                    'title' => __('Free Shipping Threshold', 'global-site-settings'),
                    'type' => 'price',
                    'description' => __('Minimum order amount for free shipping (0 to disable)', 'global-site-settings'),
                    'default' => '0',
                    'desc_tip' => true,
                ),
            );
        }
        
        /**
         * Calculate shipping rates
         * 
         * @param array $package Cart package
         */
        public function calculate_shipping($package = array()) {
            // Check if free shipping threshold is met
            $cart_total = WC()->cart->get_cart_contents_total();
            $threshold = floatval($this->get_option('free_shipping_threshold', 0));
            
            if ($threshold > 0 && $cart_total >= $threshold) {
                $this->add_rate(array(
                    'id' => $this->id . ':free',
                    'label' => __('Free Shipping', 'global-site-settings'),
                    'cost' => 0,
                    'meta_data' => array(
                        'bobgo_service' => 'free_shipping',
                    ),
                ));
                return;
            }
            
            // Get delivery address
            $delivery_address = $this->format_delivery_address($package);
            
            if (!$delivery_address) {
                error_log('BobGo: Invalid delivery address');
                $this->add_fallback_rate();
                return;
            }
            
            // Get collection address from WooCommerce settings
            $collection_address = $this->get_store_collection_address();
            
            if (!$collection_address) {
                error_log('BobGo: Store collection address not configured in WooCommerce → Settings → General');
                $this->add_fallback_rate();
                return;
            }
            
            // Calculate total weight and dimensions
            $parcels = $this->calculate_parcels($package);
            
            // Prepare rate request
            $rate_request = array(
                'collection_address' => $collection_address,
                'delivery_address' => $delivery_address,
                'parcels' => $parcels,
            );
            
            // Log request for debugging
            error_log('BobGo Rate Request: ' . json_encode($rate_request));
            
            // Get rates from BobGo API
            $rates_response = $this->bobgo_api->get_checkout_rates($rate_request);
            
            if (is_wp_error($rates_response)) {
                error_log('BobGo API Error: ' . $rates_response->get_error_message());
                $this->add_fallback_rate();
                return;
            }
            
            // Log response for debugging
            error_log('BobGo Rate Response: ' . json_encode($rates_response));
            
            // Add rates to checkout
            if (!empty($rates_response['rates']) && is_array($rates_response['rates'])) {
                foreach ($rates_response['rates'] as $rate) {
                    $this->add_bobgo_rate($rate);
                }
            } else {
                $this->add_fallback_rate();
            }
        }
        
        /**
         * Format delivery address for BobGo API
         * 
         * @param array $package Cart package
         * @return array|false
         */
        private function format_delivery_address($package) {
            $destination = $package['destination'];
            
            if (empty($destination['address']) || empty($destination['city']) || empty($destination['postcode'])) {
                return false;
            }
            
            return array(
                'type' => 'residential',
                'street_address' => $destination['address'],
                'local_area' => $destination['address_2'] ?: $destination['city'],
                'city' => $destination['city'],
                'zone' => $destination['state'],
                'country' => $destination['country'],
                'code' => $destination['postcode'],
            );
        }
        
        /**
         * Get store collection address from WooCommerce settings
         * 
         * @return array|false
         */
        private function get_store_collection_address() {
            // Get from WooCommerce store settings
            $street_address = WC()->countries->get_base_address();
            $city = WC()->countries->get_base_city();
            $postcode = WC()->countries->get_base_postcode();
            $state = WC()->countries->get_base_state();
            $country = WC()->countries->get_base_country();
            
            // Validate required fields
            if (empty($street_address) || empty($city) || empty($postcode)) {
                return false;
            }
            
            return array(
                'type' => 'business',
                'company' => get_option('woocommerce_store_name', get_bloginfo('name')),
                'contact_name' => get_option('woocommerce_store_contact_name', ''),
                'contact_mobile_number' => get_option('woocommerce_store_phone', ''),
                'contact_email' => get_option('woocommerce_email_from_address', get_option('admin_email')),
                'street_address' => $street_address,
                'local_area' => WC()->countries->get_base_address_2(),
                'city' => $city,
                'zone' => $state,
                'country' => $country,
                'code' => $postcode,
            );
        }
        
        /**
         * Calculate parcels from cart items
         * 
         * @param array $package Cart package
         * @return array
         */
        private function calculate_parcels($package) {
            $total_weight = 0;
            $max_length = 0;
            $max_width = 0;
            $max_height = 0;
            
            foreach ($package['contents'] as $item) {
                $product = $item['data'];
                $quantity = $item['quantity'];
                
                // Get weight (default to 1kg if not set)
                $weight = $product->get_weight() ? floatval($product->get_weight()) : 1.0;
                $total_weight += $weight * $quantity;
                
                // Get dimensions
                $length = $product->get_length() ? floatval($product->get_length()) : 30;
                $width = $product->get_width() ? floatval($product->get_width()) : 20;
                $height = $product->get_height() ? floatval($product->get_height()) : 15;
                
                $max_length = max($max_length, $length);
                $max_width = max($max_width, $width);
                $max_height = max($max_height, $height);
            }
            
            // BobGo expects single parcel (for now)
            return array(
                array(
                    'parcel_description' => 'Hardware items',
                    'submitted_length_cm' => $max_length,
                    'submitted_width_cm' => $max_width,
                    'submitted_height_cm' => $max_height,
                    'submitted_weight_kg' => max($total_weight, 0.5), // Minimum 0.5kg
                ),
            );
        }
        
        /**
         * Add BobGo rate to checkout
         * 
         * @param array $rate Rate from BobGo API
         */
        private function add_bobgo_rate($rate) {
            $service_name = $rate['service_level']['name'] ?? 'Standard Delivery';
            $courier_name = $rate['courier']['name'] ?? '';
            $price = floatval($rate['total_price'] ?? 0);
            $currency = $rate['currency'] ?? 'ZAR';
            $estimated_days = $rate['estimated_delivery_days'] ?? 3;
            
            $label = $service_name;
            if ($courier_name) {
                $label .= ' (' . $courier_name . ')';
            }
            if ($estimated_days) {
                $label .= ' - ' . $estimated_days . ' days';
            }
            
            $this->add_rate(array(
                'id' => $this->id . ':' . sanitize_title($service_name),
                'label' => $label,
                'cost' => $price,
                'meta_data' => array(
                    'bobgo_service' => $rate['service_level']['code'] ?? '',
                    'bobgo_courier' => $rate['courier']['code'] ?? '',
                    'estimated_days' => $estimated_days,
                ),
            ));
        }
        
        /**
         * Add fallback flat rate
         */
        private function add_fallback_rate() {
            $cost = floatval($this->get_option('fallback_cost', 100));
            
            $this->add_rate(array(
                'id' => $this->id . ':fallback',
                'label' => $this->title . ' (Flat Rate)',
                'cost' => $cost,
                'meta_data' => array(
                    'bobgo_service' => 'fallback',
                ),
            ));
        }
    }
}

add_action('woocommerce_shipping_init', 'bobgo_shipping_init');

/**
 * Add BobGo shipping method to WooCommerce
 * 
 * @param array $methods Existing shipping methods
 * @return array
 */
function add_bobgo_shipping_method($methods) {
    $methods['bobgo_shipping'] = 'BobGo_Shipping_Method';
    return $methods;
}

add_filter('woocommerce_shipping_methods', 'add_bobgo_shipping_method');
