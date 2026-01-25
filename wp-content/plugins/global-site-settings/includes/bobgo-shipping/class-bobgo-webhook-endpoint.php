<?php
/**
 * BobGo Webhook Endpoint
 * 
 * Handles webhook events from BobGo for tracking updates,
 * fulfillment events, and shipment status changes
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * BobGo Webhook Endpoint Class
 */
class BobGo_Webhook_Endpoint {
    
    /**
     * Webhook namespace
     */
    const NAMESPACE = 'bobgo/v1';
    
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
        
        // Register REST API routes
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    /**
     * Register webhook REST routes
     */
    public function register_routes() {
        register_rest_route(self::NAMESPACE, '/webhook', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_webhook'),
            'permission_callback' => array($this, 'verify_webhook'),
        ));
    }
    
    /**
     * Verify webhook authenticity
     * 
     * @param WP_REST_Request $request
     * @return bool
     */
    public function verify_webhook($request) {
        // BobGo sends webhooks from their servers
        // In production, you might want to verify the source IP or use a webhook secret
        
        // For now, we'll verify that required fields are present
        $data = $request->get_json_params();
        
        if (!isset($data['event']) || !isset($data['data'])) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Handle incoming webhook
     * 
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function handle_webhook($request) {
        $data = $request->get_json_params();
        $event = $data['event'] ?? '';
        $payload = $data['data'] ?? array();
        
        // Log webhook for debugging
        error_log('BobGo Webhook: ' . $event . ' - ' . json_encode($payload));
        
        // Route to appropriate handler
        switch ($event) {
            case 'tracking.updated':
                $this->handle_tracking_update($payload);
                break;
                
            case 'fulfillment.created':
                $this->handle_fulfillment_created($payload);
                break;
                
            case 'fulfillment.completed':
                $this->handle_fulfillment_completed($payload);
                break;
                
            case 'shipment.created':
                $this->handle_shipment_created($payload);
                break;
                
            case 'shipment.collected':
                $this->handle_shipment_collected($payload);
                break;
                
            case 'shipment.in_transit':
                $this->handle_shipment_in_transit($payload);
                break;
                
            case 'shipment.delivered':
                $this->handle_shipment_delivered($payload);
                break;
                
            case 'shipment.cancelled':
                $this->handle_shipment_cancelled($payload);
                break;
                
            default:
                error_log('BobGo Webhook: Unknown event - ' . $event);
                break;
        }
        
        return new WP_REST_Response(array('success' => true), 200);
    }
    
    /**
     * Handle tracking update event
     * 
     * @param array $payload
     */
    private function handle_tracking_update($payload) {
        $tracking_number = $payload['tracking_number'] ?? '';
        $status = $payload['status'] ?? '';
        $location = $payload['location'] ?? '';
        $timestamp = $payload['timestamp'] ?? '';
        
        if (empty($tracking_number)) {
            return;
        }
        
        $order = $this->get_order_by_tracking_number($tracking_number);
        
        if (!$order) {
            error_log('BobGo Webhook: Order not found for tracking number - ' . $tracking_number);
            return;
        }
        
        // Add order note with tracking update
        $note = sprintf(
            'BobGo Tracking Update: %s%s%s',
            $status,
            $location ? ' - ' . $location : '',
            $timestamp ? ' (' . $timestamp . ')' : ''
        );
        
        $order->add_order_note($note);
        $order->update_meta_data('_bobgo_last_tracking_update', current_time('mysql'));
        $order->save();
    }
    
    /**
     * Handle fulfillment created event
     * 
     * @param array $payload
     */
    private function handle_fulfillment_created($payload) {
        $shipment_id = $payload['shipment_id'] ?? '';
        
        if (empty($shipment_id)) {
            return;
        }
        
        $order = $this->get_order_by_shipment_id($shipment_id);
        
        if (!$order) {
            return;
        }
        
        $order->add_order_note('BobGo: Fulfillment created');
        $order->update_meta_data('_bobgo_shipment_status', 'fulfillment_created');
        $order->save();
    }
    
    /**
     * Handle fulfillment completed event
     * 
     * @param array $payload
     */
    private function handle_fulfillment_completed($payload) {
        $shipment_id = $payload['shipment_id'] ?? '';
        
        if (empty($shipment_id)) {
            return;
        }
        
        $order = $this->get_order_by_shipment_id($shipment_id);
        
        if (!$order) {
            return;
        }
        
        $order->add_order_note('BobGo: Fulfillment completed');
        $order->update_meta_data('_bobgo_shipment_status', 'fulfillment_completed');
        $order->save();
    }
    
    /**
     * Handle shipment created event
     * 
     * @param array $payload
     */
    private function handle_shipment_created($payload) {
        $shipment_id = $payload['shipment_id'] ?? '';
        $tracking_number = $payload['tracking_number'] ?? '';
        
        if (empty($shipment_id)) {
            return;
        }
        
        $order = $this->get_order_by_shipment_id($shipment_id);
        
        if (!$order) {
            return;
        }
        
        if ($tracking_number) {
            $order->update_meta_data('_bobgo_tracking_number', $tracking_number);
        }
        
        $order->add_order_note('BobGo: Shipment created' . ($tracking_number ? ' - Tracking: ' . $tracking_number : ''));
        $order->update_meta_data('_bobgo_shipment_status', 'created');
        $order->save();
    }
    
    /**
     * Handle shipment collected event
     * 
     * @param array $payload
     */
    private function handle_shipment_collected($payload) {
        $shipment_id = $payload['shipment_id'] ?? '';
        $collection_time = $payload['collection_time'] ?? '';
        
        if (empty($shipment_id)) {
            return;
        }
        
        $order = $this->get_order_by_shipment_id($shipment_id);
        
        if (!$order) {
            return;
        }
        
        $note = 'BobGo: Shipment collected';
        if ($collection_time) {
            $note .= ' at ' . $collection_time;
        }
        
        $order->add_order_note($note);
        $order->update_meta_data('_bobgo_shipment_status', 'collected');
        $order->save();
    }
    
    /**
     * Handle shipment in transit event
     * 
     * @param array $payload
     */
    private function handle_shipment_in_transit($payload) {
        $shipment_id = $payload['shipment_id'] ?? '';
        
        if (empty($shipment_id)) {
            return;
        }
        
        $order = $this->get_order_by_shipment_id($shipment_id);
        
        if (!$order) {
            return;
        }
        
        $order->add_order_note('BobGo: Shipment in transit');
        $order->update_meta_data('_bobgo_shipment_status', 'in_transit');
        $order->save();
    }
    
    /**
     * Handle shipment delivered event
     * 
     * @param array $payload
     */
    private function handle_shipment_delivered($payload) {
        $shipment_id = $payload['shipment_id'] ?? '';
        $delivery_time = $payload['delivery_time'] ?? '';
        $received_by = $payload['received_by'] ?? '';
        
        if (empty($shipment_id)) {
            return;
        }
        
        $order = $this->get_order_by_shipment_id($shipment_id);
        
        if (!$order) {
            return;
        }
        
        $note = 'BobGo: Shipment delivered';
        if ($delivery_time) {
            $note .= ' at ' . $delivery_time;
        }
        if ($received_by) {
            $note .= ' (Received by: ' . $received_by . ')';
        }
        
        $order->add_order_note($note);
        $order->update_meta_data('_bobgo_shipment_status', 'delivered');
        $order->save();
        
        // Update WooCommerce order status to completed
        if ($order->get_status() !== 'completed') {
            $order->update_status('completed', 'BobGo shipment delivered');
        }
    }
    
    /**
     * Handle shipment cancelled event
     * 
     * @param array $payload
     */
    private function handle_shipment_cancelled($payload) {
        $shipment_id = $payload['shipment_id'] ?? '';
        $reason = $payload['reason'] ?? '';
        
        if (empty($shipment_id)) {
            return;
        }
        
        $order = $this->get_order_by_shipment_id($shipment_id);
        
        if (!$order) {
            return;
        }
        
        $note = 'BobGo: Shipment cancelled';
        if ($reason) {
            $note .= ' - Reason: ' . $reason;
        }
        
        $order->add_order_note($note);
        $order->update_meta_data('_bobgo_shipment_status', 'cancelled');
        $order->save();
    }
    
    /**
     * Get order by tracking number
     * 
     * @param string $tracking_number
     * @return WC_Order|false
     */
    private function get_order_by_tracking_number($tracking_number) {
        $orders = wc_get_orders(array(
            'meta_key' => '_bobgo_tracking_number',
            'meta_value' => $tracking_number,
            'limit' => 1,
        ));
        
        return !empty($orders) ? $orders[0] : false;
    }
    
    /**
     * Get order by shipment ID
     * 
     * @param string $shipment_id
     * @return WC_Order|false
     */
    private function get_order_by_shipment_id($shipment_id) {
        $orders = wc_get_orders(array(
            'meta_key' => '_bobgo_shipment_id',
            'meta_value' => $shipment_id,
            'limit' => 1,
        ));
        
        return !empty($orders) ? $orders[0] : false;
    }
}

// Initialize the webhook endpoint
new BobGo_Webhook_Endpoint();
