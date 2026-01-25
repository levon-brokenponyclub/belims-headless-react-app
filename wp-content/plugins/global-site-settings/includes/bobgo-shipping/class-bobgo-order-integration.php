<?php
/**
 * BobGo Order Integration
 * 
 * Handles automatic shipment creation when WooCommerce orders are processed
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class BobGo_Order_Integration {
    
    /**
     * BobGo API instance
     * @var BobGo_API
     */
    private $bobgo_api;
    
    /**
     * Constructor
     */
    public function __construct() {
        require_once GLOBAL_SITE_SETTINGS_PLUGIN_DIR . 'includes/bobgo-shipping/class-bobgo-api.php';
        $this->bobgo_api = new BobGo_API();
        
        // Hook into order status changes
        add_action('woocommerce_order_status_processing', array($this, 'create_shipment_on_processing'), 10, 1);
        add_action('woocommerce_order_status_completed', array($this, 'update_shipment_status'), 10, 1);
        
        // Add order meta box
        add_action('add_meta_boxes', array($this, 'add_shipment_meta_box'));
        
        // Handle manual shipment creation
        add_action('wp_ajax_bobgo_create_shipment', array($this, 'ajax_create_shipment'));
        add_action('wp_ajax_bobgo_cancel_shipment', array($this, 'ajax_cancel_shipment'));
    }
    
    /**
     * Create shipment when order status changes to processing
     * 
     * @param int $order_id Order ID
     */
    public function create_shipment_on_processing($order_id) {
        // Check if auto-create is enabled
        $auto_create = get_option('bobgo_auto_create_shipments', false);
        
        if (!$auto_create) {
            return;
        }
        
        // Check if shipment already created
        $shipment_id = get_post_meta($order_id, '_bobgo_shipment_id', true);
        
        if (!empty($shipment_id)) {
            return;
        }
        
        // Create shipment
        $this->create_shipment($order_id);
    }
    
    /**
     * Create shipment for order
     * 
     * @param int $order_id Order ID
     * @return array|WP_Error
     */
    public function create_shipment($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return new WP_Error('invalid_order', 'Order not found');
        }
        
        // First, create order in BobGo
        $bobgo_order_id = $this->create_bobgo_order($order);
        
        if (is_wp_error($bobgo_order_id)) {
            return $bobgo_order_id;
        }
        
        // Get shipping method details
        $shipping_method = $this->get_shipping_method_details($order);
        
        if (!$shipping_method) {
            return new WP_Error('no_shipping', 'No BobGo shipping method found');
        }
        
        // Prepare shipment data
        $shipment_data = array(
            'order_reference' => $bobgo_order_id,
            'service_level_code' => $shipping_method['service_code'] ?? 'STANDARD',
            'courier_code' => $shipping_method['courier_code'] ?? '',
            'collection_min_date' => date('Y-m-d', strtotime('+1 day')),
            'collection_after' => '09:00',
            'collection_before' => '17:00',
        );
        
        // Create shipment
        $shipment_response = $this->bobgo_api->create_shipment($shipment_data);
        
        if (is_wp_error($shipment_response)) {
            error_log('BobGo shipment creation failed: ' . $shipment_response->get_error_message());
            return $shipment_response;
        }
        
        // Store shipment details
        $shipment_id = $shipment_response['id'] ?? '';
        $tracking_number = $shipment_response['tracking_number'] ?? '';
        $waybill_url = $shipment_response['waybill_url'] ?? '';
        
        if ($shipment_id) {
            update_post_meta($order_id, '_bobgo_order_id', $bobgo_order_id);
            update_post_meta($order_id, '_bobgo_shipment_id', $shipment_id);
            update_post_meta($order_id, '_bobgo_tracking_number', $tracking_number);
            update_post_meta($order_id, '_bobgo_waybill_url', $waybill_url);
            update_post_meta($order_id, '_bobgo_shipment_created', current_time('mysql'));
            
            // Add order note
            $order->add_order_note(
                sprintf(
                    'BobGo shipment created. Tracking: %s',
                    $tracking_number
                )
            );
            
            // Send tracking email to customer (optional)
            $this->send_tracking_email($order, $tracking_number);
        }
        
        return $shipment_response;
    }
    
    /**
     * Create order in BobGo
     * 
     * @param WC_Order $order WooCommerce order
     * @return string|WP_Error BobGo order ID or error
     */
    private function create_bobgo_order($order) {
        // Check if already created
        $existing_order_id = get_post_meta($order->get_id(), '_bobgo_order_id', true);
        
        if (!empty($existing_order_id)) {
            return $existing_order_id;
        }
        
        // Prepare order data
        $order_data = array(
            'external_order_number' => $order->get_order_number(),
            'external_order_url' => $order->get_edit_order_url(),
            'customer_reference' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            'collection_address' => $this->get_collection_address(),
            'delivery_address' => $this->get_delivery_address($order),
            'parcels' => $this->get_order_parcels($order),
        );
        
        // Create order
        $response = $this->bobgo_api->create_order($order_data);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        return $response['id'] ?? '';
    }
    
    /**
     * Get collection address
     * 
     * @return array
     */
    private function get_collection_address() {
        // Get from site settings or default
        return array(
            'type' => 'business',
            'company' => get_bloginfo('name'),
            'street_address' => get_option('woocommerce_store_address', ''),
            'local_area' => get_option('woocommerce_store_address_2', ''),
            'city' => get_option('woocommerce_store_city', ''),
            'zone' => get_option('woocommerce_default_country', 'ZA:WC'),
            'country' => 'ZA',
            'code' => get_option('woocommerce_store_postcode', ''),
        );
    }
    
    /**
     * Get delivery address from order
     * 
     * @param WC_Order $order
     * @return array
     */
    private function get_delivery_address($order) {
        return array(
            'type' => $order->get_billing_company() ? 'business' : 'residential',
            'company' => $order->get_billing_company(),
            'street_address' => $order->get_shipping_address_1(),
            'local_area' => $order->get_shipping_address_2(),
            'city' => $order->get_shipping_city(),
            'zone' => $order->get_shipping_state(),
            'country' => $order->get_shipping_country(),
            'code' => $order->get_shipping_postcode(),
        );
    }
    
    /**
     * Get order parcels
     * 
     * @param WC_Order $order
     * @return array
     */
    private function get_order_parcels($order) {
        $total_weight = 0;
        $items_description = array();
        
        /** @var WC_Order_Item_Product $item */
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            $quantity = $item->get_quantity();
            
            if ($product) {
                $weight = $product->get_weight() ? floatval($product->get_weight()) : 1.0;
                $total_weight += $weight * $quantity;
                $items_description[] = $product->get_name();
            }
        }
        
        return array(
            array(
                'parcel_description' => implode(', ', array_slice($items_description, 0, 3)),
                'submitted_length_cm' => 30,
                'submitted_width_cm' => 20,
                'submitted_height_cm' => 15,
                'submitted_weight_kg' => max($total_weight, 0.5),
            ),
        );
    }
    
    /**
     * Get shipping method details from order
     * 
     * @param WC_Order $order
     * @return array|false
     */
    private function get_shipping_method_details($order) {
        $shipping_methods = $order->get_shipping_methods();
        
        foreach ($shipping_methods as $shipping_method) {
            $method_id = $shipping_method->get_method_id();
            
            if ($method_id === 'bobgo_shipping') {
                $meta_data = $shipping_method->get_meta_data();
                
                return array(
                    'service_code' => $this->get_meta_value($meta_data, 'bobgo_service', 'STANDARD'),
                    'courier_code' => $this->get_meta_value($meta_data, 'bobgo_courier', ''),
                );
            }
        }
        
        return false;
    }
    
    /**
     * Get meta value from array
     * 
     * @param array $meta_data
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    private function get_meta_value($meta_data, $key, $default = '') {
        foreach ($meta_data as $meta) {
            if ($meta->key === $key) {
                return $meta->value;
            }
        }
        
        return $default;
    }
    
    /**
     * Send tracking email to customer
     * 
     * @param WC_Order $order
     * @param string $tracking_number
     */
    private function send_tracking_email($order, $tracking_number) {
        if (empty($tracking_number)) {
            return;
        }
        
        $to = $order->get_billing_email();
        $subject = sprintf('Your order #%s has been shipped', $order->get_order_number());
        
        $message = sprintf(
            "Hi %s,\n\nYour order #%s has been shipped!\n\nTracking Number: %s\n\nThank you for your order!\n\n%s",
            $order->get_billing_first_name(),
            $order->get_order_number(),
            $tracking_number,
            get_bloginfo('name')
        );
        
        wp_mail($to, $subject, $message);
    }
    
    /**
     * Update shipment status
     * 
     * @param int $order_id
     */
    public function update_shipment_status($order_id) {
        // Placeholder for future webhook integration
    }
    
    /**
     * Add shipment meta box to order edit page
     */
    public function add_shipment_meta_box() {
        add_meta_box(
            'bobgo_shipment_info',
            'BobGo Shipment Information',
            array($this, 'render_shipment_meta_box'),
            'shop_order',
            'side',
            'high'
        );
    }
    
    /**
     * Render shipment meta box
     * 
     * @param WP_Post $post
     */
    public function render_shipment_meta_box($post) {
        $order_id = $post->ID;
        $shipment_id = get_post_meta($order_id, '_bobgo_shipment_id', true);
        $tracking_number = get_post_meta($order_id, '_bobgo_tracking_number', true);
        $waybill_url = get_post_meta($order_id, '_bobgo_waybill_url', true);
        $created_date = get_post_meta($order_id, '_bobgo_shipment_created', true);
        
        ?>
        <div class="bobgo-shipment-info">
            <?php if ($shipment_id): ?>
                <p><strong>Shipment ID:</strong><br><?php echo esc_html($shipment_id); ?></p>
                <p><strong>Tracking Number:</strong><br><?php echo esc_html($tracking_number); ?></p>
                
                <?php if ($created_date): ?>
                    <p><strong>Created:</strong><br><?php echo esc_html(date('Y-m-d H:i', strtotime($created_date))); ?></p>
                <?php endif; ?>
                
                <?php if ($waybill_url): ?>
                    <p>
                        <a href="<?php echo esc_url($waybill_url); ?>" class="button" target="_blank">
                            Download Waybill
                        </a>
                    </p>
                <?php endif; ?>
                
                <p>
                    <button type="button" class="button button-secondary" id="bobgo-cancel-shipment" data-order-id="<?php echo esc_attr($order_id); ?>">
                        Cancel Shipment
                    </button>
                </p>
            <?php else: ?>
                <p>No shipment created yet.</p>
                <p>
                    <button type="button" class="button button-primary" id="bobgo-create-shipment" data-order-id="<?php echo esc_attr($order_id); ?>">
                        Create Shipment
                    </button>
                </p>
            <?php endif; ?>
            
            <div id="bobgo-shipment-status"></div>
        </div>
        
        <script>
        jQuery(document).ready(function($) {
            $('#bobgo-create-shipment').on('click', function() {
                var $btn = $(this);
                var orderId = $btn.data('order-id');
                var $status = $('#bobgo-shipment-status');
                
                $btn.prop('disabled', true).text('Creating...');
                $status.html('<p>Creating shipment...</p>');
                
                $.post(ajaxurl, {
                    action: 'bobgo_create_shipment',
                    order_id: orderId,
                    nonce: '<?php echo wp_create_nonce("bobgo_shipment_nonce"); ?>'
                }, function(response) {
                    if (response.success) {
                        $status.html('<p style="color: green;">✓ ' + response.data + '</p>');
                        location.reload();
                    } else {
                        $status.html('<p style="color: red;">✗ ' + response.data + '</p>');
                        $btn.prop('disabled', false).text('Create Shipment');
                    }
                });
            });
            
            $('#bobgo-cancel-shipment').on('click', function() {
                if (!confirm('Are you sure you want to cancel this shipment?')) {
                    return;
                }
                
                var $btn = $(this);
                var orderId = $btn.data('order-id');
                var $status = $('#bobgo-shipment-status');
                
                $btn.prop('disabled', true).text('Cancelling...');
                
                $.post(ajaxurl, {
                    action: 'bobgo_cancel_shipment',
                    order_id: orderId,
                    nonce: '<?php echo wp_create_nonce("bobgo_shipment_nonce"); ?>'
                }, function(response) {
                    if (response.success) {
                        $status.html('<p style="color: green;">✓ ' + response.data + '</p>');
                        location.reload();
                    } else {
                        $status.html('<p style="color: red;">✗ ' + response.data + '</p>');
                        $btn.prop('disabled', false).text('Cancel Shipment');
                    }
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * AJAX: Create shipment
     */
    public function ajax_create_shipment() {
        check_ajax_referer('bobgo_shipment_nonce', 'nonce');
        
        if (!current_user_can('edit_shop_orders')) {
            wp_send_json_error('Unauthorized');
        }
        
        $order_id = intval($_POST['order_id']);
        $result = $this->create_shipment($order_id);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        wp_send_json_success('Shipment created successfully');
    }
    
    /**
     * AJAX: Cancel shipment
     */
    public function ajax_cancel_shipment() {
        check_ajax_referer('bobgo_shipment_nonce', 'nonce');
        
        if (!current_user_can('edit_shop_orders')) {
            wp_send_json_error('Unauthorized');
        }
        
        $order_id = intval($_POST['order_id']);
        $shipment_id = get_post_meta($order_id, '_bobgo_shipment_id', true);
        
        if (empty($shipment_id)) {
            wp_send_json_error('No shipment found');
        }
        
        $result = $this->bobgo_api->cancel_shipment($shipment_id);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        // Clear shipment meta
        delete_post_meta($order_id, '_bobgo_shipment_id');
        delete_post_meta($order_id, '_bobgo_tracking_number');
        delete_post_meta($order_id, '_bobgo_waybill_url');
        
        wp_send_json_success('Shipment cancelled successfully');
    }
}

// Initialize
new BobGo_Order_Integration();
