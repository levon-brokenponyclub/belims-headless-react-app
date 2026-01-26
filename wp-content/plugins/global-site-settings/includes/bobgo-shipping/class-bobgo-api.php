<?php
/**
 * BobGo API Wrapper Class
 * 
 * Handles all communication with the BobGo API for shipping services
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class BobGo_API {
    
    /**
     * API base URL
     * @var string
     */
    private $base_url;
    
    /**
     * API bearer token
     * @var string
     */
    private $api_token;
    
    /**
     * Environment (sandbox or production)
     * @var string
     */
    private $environment;
    
    /**
     * Constructor
     */
    public function __construct() {
        // Unified settings (fallback to legacy ACF option names for backward compatibility)
        $this->environment = get_option('bobgo_environment', get_option('options_bobgo_environment', 'sandbox'));
        $this->api_token = get_option('bobgo_api_token', get_option('options_bobgo_api_key', ''));
        $this->base_url = $this->get_base_url();
    }
    
    /**
     * Get base URL based on environment
     * 
     * @return string
     */
    private function get_base_url() {
        return ($this->environment === 'production') 
            ? 'https://api.bobgo.co.za/v2/' 
            : 'https://api.sandbox.bobgo.co.za/v2/';
    }
    
    /**
     * Make API request
     * 
     * @param string $endpoint API endpoint
     * @param string $method HTTP method (GET, POST, etc.)
     * @param array $data Request data
     * @return array|WP_Error
     */
    private function make_request($endpoint, $method = 'GET', $data = array()) {
        if (empty($this->api_token)) {
            return new WP_Error('no_token', 'BobGo API token not configured');
        }
        
        $url = $this->base_url . ltrim($endpoint, '/');
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_token,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        );
        
        if (!empty($data) && in_array($method, array('POST', 'PATCH', 'PUT'))) {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $decoded = json_decode($body, true);
        
        if ($status_code >= 400) {
            $error_message = isset($decoded['message']) ? $decoded['message'] : 'API request failed';
            return new WP_Error('api_error', $error_message, array('status' => $status_code));
        }
        
        return $decoded;
    }
    
    /**
     * Get checkout rates
     * 
     * @param array $request_data Rate request data
     * @return array|WP_Error
     */
    public function get_checkout_rates($request_data) {
        return $this->make_request('rates_at_checkout', 'POST', $request_data);
    }
    
    /**
     * Create order
     * 
     * @param array $order_data Order data
     * @return array|WP_Error
     */
    public function create_order($order_data) {
        return $this->make_request('orders', 'POST', $order_data);
    }
    
    /**
     * Update order
     * 
     * @param string $order_id BobGo order ID
     * @param array $order_data Order data to update
     * @return array|WP_Error
     */
    public function update_order($order_id, $order_data) {
        return $this->make_request('orders/' . $order_id, 'PATCH', $order_data);
    }
    
    /**
     * Get order
     * 
     * @param string $order_id BobGo order ID
     * @return array|WP_Error
     */
    public function get_order($order_id) {
        return $this->make_request('orders/' . $order_id, 'GET');
    }
    
    /**
     * Create shipment
     * 
     * @param array $shipment_data Shipment data
     * @return array|WP_Error
     */
    public function create_shipment($shipment_data) {
        return $this->make_request('shipments', 'POST', $shipment_data);
    }
    
    /**
     * Get shipment
     * 
     * @param string $shipment_id BobGo shipment ID
     * @return array|WP_Error
     */
    public function get_shipment($shipment_id) {
        return $this->make_request('shipments/' . $shipment_id, 'GET');
    }
    
    /**
     * Get shipment waybill
     * 
     * @param string $shipment_id BobGo shipment ID
     * @param string $format Format (standard or sticker)
     * @return array|WP_Error
     */
    public function get_waybill($shipment_id, $format = 'standard') {
        $endpoint = $format === 'sticker' 
            ? 'shipments/' . $shipment_id . '/waybill/sticker'
            : 'shipments/' . $shipment_id . '/waybill';
        
        return $this->make_request($endpoint, 'GET');
    }
    
    /**
     * Cancel shipment
     * 
     * @param string $shipment_id BobGo shipment ID
     * @return array|WP_Error
     */
    public function cancel_shipment($shipment_id) {
        return $this->make_request('shipments/' . $shipment_id . '/cancel', 'POST');
    }
    
    /**
     * Get tracking events
     * 
     * @param string $tracking_number Tracking number
     * @return array|WP_Error
     */
    public function get_tracking_events($tracking_number) {
        return $this->make_request('tracking_events?tracking_number=' . urlencode($tracking_number), 'GET');
    }
    
    /**
     * Subscribe to webhook
     * 
     * @param string $url Webhook URL
     * @param string $event Event type
     * @return array|WP_Error
     */
    public function subscribe_webhook($url, $event) {
        $data = array(
            'url' => $url,
            'event' => $event,
        );
        
        return $this->make_request('webhooks', 'POST', $data);
    }
    
    /**
     * Get webhooks
     * 
     * @return array|WP_Error
     */
    public function get_webhooks() {
        return $this->make_request('webhooks', 'GET');
    }
    
    /**
     * Delete webhook
     * 
     * @param string $webhook_id Webhook ID
     * @return array|WP_Error
     */
    public function delete_webhook($webhook_id) {
        return $this->make_request('webhooks/' . $webhook_id, 'DELETE');
    }
    
    /**
     * Test connection
     * 
     * @return bool|WP_Error
     */
    public function test_connection() {
        $result = $this->get_webhooks();
        
        if (is_wp_error($result)) {
            return $result;
        }
        
        return true;
    }
}
