<?php
/**
 * BobGo Order Handler
 * 
 * Handles WooCommerce order integration with BobGo
 * Creates orders and shipments automatically
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * BobGo Order Handler Class
 */
class BobGo_Order_Handler {
    
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
        
        // Hook into WooCommerce order status changes
        add_action('woocommerce_order_status_processing', array($this, 'create_bobgo_order'), 10, 1);
        add_action('woocommerce_order_status_cancelled', array($this, 'cancel_bobgo_shipment'), 10, 1);
        
        // Add order meta box
        add_action('add_meta_boxes', array($this, 'add_bobgo_meta_box'));
        
        // Handle manual actions
        add_action('wp_ajax_bobgo_create_shipment', array($this, 'ajax_create_shipment'));
        add_action('wp_ajax_bobgo_cancel_shipment', array($this, 'ajax_cancel_shipment'));
        add_action('wp_ajax_bobgo_download_waybill', array($this, 'ajax_download_waybill'));
    }
    
    /**
     * Create BobGo order when WooCommerce order is marked as processing
     * 
     * @param int $order_id
     */
    public function create_bobgo_order($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return;
        }
        
        // Check if already created
        $bobgo_order_id = $order->get_meta('_bobgo_order_id');
        if (!empty($bobgo_order_id)) {
            return;
        }
        
        // Check if BobGo shipping was selected
        if (!$this->is_bobgo_shipping($order)) {
            return;
        }
        
        // Prepare order data
        $order_data = $this->prepare_order_data($order);
        
        if (is_wp_error($order_data)) {
            $order->add_order_note('BobGo: Failed to prepare order - ' . $order_data->get_error_message());
            return;
        }
        
        // Create order in BobGo
        $response = $this->bobgo_api->create_order($order_data);
        
        if (is_wp_error($response)) {
            $order->add_order_note('BobGo: Failed to create order - ' . $response->get_error_message());
            error_log('BobGo order creation failed: ' . $response->get_error_message());
            return;
        }
        
        // Save BobGo order ID
        /** @var array $response */
        $bobgo_order_id = $response['id'] ?? '';
        if ($bobgo_order_id) {
            $order->update_meta_data('_bobgo_order_id', $bobgo_order_id);
            $order->save();
            $order->add_order_note('BobGo order created: ' . $bobgo_order_id);
            
            // Auto-create shipment if enabled
            if (get_option('bobgo_auto_create_shipments', 'no') === 'yes') {
                $this->create_shipment_for_order($order);
            }
        }
    }
    
    /**
     * Create shipment for order
     * 
     * @param WC_Order $order
     * @return array|WP_Error
     */
    public function create_shipment_for_order($order) {
        $bobgo_order_id = $order->get_meta('_bobgo_order_id');
        
        if (empty($bobgo_order_id)) {
            return new WP_Error('no_bobgo_order', 'BobGo order not created yet');
        }
        
        // Check if shipment already exists
        $bobgo_shipment_id = $order->get_meta('_bobgo_shipment_id');
        if (!empty($bobgo_shipment_id)) {
            return new WP_Error('shipment_exists', 'Shipment already created');
        }
        
        // Prepare shipment data
        $shipment_data = $this->prepare_shipment_data($order, $bobgo_order_id);
        
        if (is_wp_error($shipment_data)) {
            $order->add_order_note('BobGo: Failed to prepare shipment - ' . $shipment_data->get_error_message());
            return $shipment_data;
        }
        
        // Create shipment
        $response = $this->bobgo_api->create_shipment($shipment_data);
        
        if (is_wp_error($response)) {
            $order->add_order_note('BobGo: Failed to create shipment - ' . $response->get_error_message());
            return $response;
        }
        
        // Save shipment details
        /** @var array $response */
        $shipment_id = $response['id'] ?? '';
        $tracking_number = $response['tracking_number'] ?? '';
        
        if ($shipment_id) {
            $order->update_meta_data('_bobgo_shipment_id', $shipment_id);
            $order->update_meta_data('_bobgo_tracking_number', $tracking_number);
            $order->update_meta_data('_bobgo_shipment_status', 'created');
            $order->save();
            
            $note = 'BobGo shipment created: ' . $shipment_id;
            if ($tracking_number) {
                $note .= ' (Tracking: ' . $tracking_number . ')';
            }
            $order->add_order_note($note);
        }
        
        return $response;
    }
    
    /**
     * Cancel BobGo shipment when order is cancelled
     * 
     * @param int $order_id
     */
    public function cancel_bobgo_shipment($order_id) {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return;
        }
        
        $shipment_id = $order->get_meta('_bobgo_shipment_id');
        
        if (empty($shipment_id)) {
            return;
        }
        
        // Cancel shipment
        $response = $this->bobgo_api->cancel_shipment($shipment_id);
        
        if (is_wp_error($response)) {
            $order->add_order_note('BobGo: Failed to cancel shipment - ' . $response->get_error_message());
            return;
        }
        
        /** @var array $response */
        $order->update_meta_data('_bobgo_shipment_status', 'cancelled');
        $order->save();
        $order->add_order_note('BobGo shipment cancelled');
    }
    
    /**
     * Check if order uses BobGo shipping
     * 
     * @param WC_Order $order
     * @return bool
     */
    private function is_bobgo_shipping($order) {
        $shipping_methods = $order->get_shipping_methods();
        
        foreach ($shipping_methods as $shipping_method) {
            $method_id = $shipping_method->get_method_id();
            // Support both official BobGo plugin and custom shipping method
            if ($method_id === 'bobgo_shipping' || $method_id === 'bobgo') {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Prepare order data for BobGo
     * 
     * @param WC_Order $order
     * @return array|WP_Error
     */
    private function prepare_order_data($order) {
        // Get collection address
        $collection_address = $this->get_collection_address();
        if (!$collection_address) {
            return new WP_Error('no_collection_address', 'Store collection address not configured');
        }
        
        // Get delivery address
        $delivery_address = $this->format_order_address($order);
        
        // Get parcels
        $parcels = $this->prepare_parcels($order);
        
        // Get selected shipping method details
        $shipping_meta = $this->get_shipping_meta($order);
        
        // Log the structure of the data being returned
        error_log('BobGo Order Data Structure: ' . print_r(array(
            'collection_address' => $collection_address,
            'delivery_address' => $delivery_address,
            'parcels' => $parcels,
            'service_level_code' => $shipping_meta['service_level'] ?? 'ECO',
            'opt_in_rates' => array(),
            'opt_in_time_based_rates' => false,
            'custom_tracking_reference' => 'Order #' . $order->get_order_number(),
        ), true));
        
        return array(
            'collection_address' => $collection_address,
            'delivery_address' => $delivery_address,
            'parcels' => $parcels,
            'service_level_code' => $shipping_meta['service_level'] ?? 'ECO',
            'opt_in_rates' => array(),
            'opt_in_time_based_rates' => false,
            'custom_tracking_reference' => 'Order #' . $order->get_order_number(),
        );
    }
    
    /**
     * Prepare shipment data for BobGo
     * 
     * @param WC_Order $order
     * @param string $bobgo_order_id
     * @return array
     */
    private function prepare_shipment_data($order, $bobgo_order_id) {
        return array(
            'order_id' => $bobgo_order_id,
        );
    }
    
    /**
     * Get store collection address
     * 
     * @return array|false
     */
    private function get_collection_address() {
        $address = array(
            'type' => 'business',
            'company' => get_option('woocommerce_store_name', get_bloginfo('name')),
            'contact_name' => get_option('woocommerce_store_contact_name', ''),
            'contact_mobile_number' => get_option('woocommerce_store_phone', ''),
            'contact_email' => get_option('woocommerce_email_from_address', get_option('admin_email')),
            'street_address' => WC()->countries->get_base_address(),
            'local_area' => WC()->countries->get_base_address_2(),
            'city' => WC()->countries->get_base_city(),
            'zone' => WC()->countries->get_base_state(),
            'country' => WC()->countries->get_base_country(),
            'code' => WC()->countries->get_base_postcode(),
        );
        
        // Validate required fields
        if (empty($address['street_address']) || empty($address['city']) || empty($address['code'])) {
            return false;
        }
        
        return $address;
    }
    
    /**
     * Format order delivery address for BobGo
     * 
     * @param WC_Order $order
     * @return array
     */
    private function format_order_address($order) {
        return array(
            'type' => !empty($order->get_shipping_company()) ? 'business' : 'residential',
            'company' => $order->get_shipping_company(),
            'contact_name' => $order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name(),
            'contact_mobile_number' => $order->get_billing_phone(),
            'contact_email' => $order->get_billing_email(),
            'street_address' => $order->get_shipping_address_1(),
            'local_area' => $order->get_shipping_address_2(),
            'city' => $order->get_shipping_city(),
            'zone' => $order->get_shipping_state(),
            'country' => $order->get_shipping_country(),
            'code' => $order->get_shipping_postcode(),
        );
    }
    
    /**
     * Prepare parcels from order items
     * 
     * @param WC_Order $order
     * @return array
     */
    private function prepare_parcels($order) {
        $total_weight = 0;
        $max_length = 0;
        $max_width = 0;
        $max_height = 0;
        
        /** @var WC_Order_Item_Product $item */
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if (!$product) {
                continue;
            }
            
            $quantity = $item->get_quantity();
            
            // Weight
            $weight = floatval($product->get_weight());
            $total_weight += $weight * $quantity;
            
            // Dimensions
            $length = floatval($product->get_length());
            $width = floatval($product->get_width());
            $height = floatval($product->get_height());
            
            if ($length > $max_length) $max_length = $length;
            if ($width > $max_width) $max_width = $width;
            if ($height > $max_height) $max_height = $height;
        }
        
        // Default values if not specified
        if ($total_weight <= 0) $total_weight = 1.0;
        if ($max_length <= 0) $max_length = 30;
        if ($max_width <= 0) $max_width = 20;
        if ($max_height <= 0) $max_height = 15;
        
        return array(
            array(
                'parcel_description' => 'Order #' . $order->get_order_number(),
                'submitted_length_cm' => $max_length,
                'submitted_width_cm' => $max_width,
                'submitted_height_cm' => $max_height,
                'submitted_weight_kg' => $total_weight,
            )
        );
    }
    
    /**
     * Get shipping method metadata from order
     * 
     * @param WC_Order $order
     * @return array
     */
    private function get_shipping_meta($order) {
        $meta = array();
        
        $shipping_methods = $order->get_shipping_methods();
        foreach ($shipping_methods as $shipping_method) {
            if ($shipping_method->get_method_id() === 'bobgo_shipping') {
                $meta_data = $shipping_method->get_meta_data();
                foreach ($meta_data as $meta_item) {
                    $data = $meta_item->get_data();
                    if ($data['key'] === 'bobgo_service_level') {
                        $meta['service_level'] = $data['value'];
                    }
                    if ($data['key'] === 'bobgo_courier') {
                        $meta['courier'] = $data['value'];
                    }
                }
            }
        }
        
        return $meta;
    }
    
    /**
     * Add BobGo meta box to order edit page
     */
    public function add_bobgo_meta_box() {
        add_meta_box(
            'bobgo_shipping_details',
            __('BobGo Shipping', 'global-site-settings'),
            array($this, 'render_meta_box'),
            'shop_order',
            'side',
            'default'
        );
    }
    
    /**
     * Render BobGo meta box
     * 
     * @param WP_Post $post
     */
    public function render_meta_box($post) {
        $order = wc_get_order($post->ID);
        
        if (!$order) {
            return;
        }
        
        $bobgo_order_id = $order->get_meta('_bobgo_order_id');
        $bobgo_shipment_id = $order->get_meta('_bobgo_shipment_id');
        $tracking_number = $order->get_meta('_bobgo_tracking_number');
        $shipment_status = $order->get_meta('_bobgo_shipment_status');
        
        ?>
        <div class="bobgo-meta-box">
            <?php if ($bobgo_order_id): ?>
                <p>
                    <strong><?php _e('BobGo Order ID:', 'global-site-settings'); ?></strong><br>
                    <?php echo esc_html($bobgo_order_id); ?>
                </p>
            <?php endif; ?>
            
            <?php if ($bobgo_shipment_id): ?>
                <p>
                    <strong><?php _e('Shipment ID:', 'global-site-settings'); ?></strong><br>
                    <?php echo esc_html($bobgo_shipment_id); ?>
                </p>
                
                <?php if ($tracking_number): ?>
                    <p>
                        <strong><?php _e('Tracking Number:', 'global-site-settings'); ?></strong><br>
                        <?php echo esc_html($tracking_number); ?>
                    </p>
                <?php endif; ?>
                
                <?php if ($shipment_status): ?>
                    <p>
                        <strong><?php _e('Status:', 'global-site-settings'); ?></strong><br>
                        <span class="bobgo-status-<?php echo esc_attr($shipment_status); ?>">
                            <?php echo esc_html(ucfirst($shipment_status)); ?>
                        </span>
                    </p>
                <?php endif; ?>
                
                <p>
                    <button type="button" class="button button-secondary bobgo-download-waybill" data-order-id="<?php echo esc_attr($post->ID); ?>">
                        <?php _e('Download Waybill', 'global-site-settings'); ?>
                    </button>
                </p>
                
                <?php if ($shipment_status !== 'cancelled'): ?>
                    <p>
                        <button type="button" class="button button-secondary bobgo-cancel-shipment" data-order-id="<?php echo esc_attr($post->ID); ?>">
                            <?php _e('Cancel Shipment', 'global-site-settings'); ?>
                        </button>
                    </p>
                <?php endif; ?>
            <?php elseif ($bobgo_order_id): ?>
                <p>
                    <button type="button" class="button button-primary bobgo-create-shipment" data-order-id="<?php echo esc_attr($post->ID); ?>">
                        <?php _e('Create Shipment', 'global-site-settings'); ?>
                    </button>
                </p>
            <?php else: ?>
                <p><?php _e('BobGo shipping not used for this order', 'global-site-settings'); ?></p>
            <?php endif; ?>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            $('.bobgo-create-shipment').on('click', function() {
                if (!confirm('Create shipment in BobGo?')) return;
                
                var button = $(this);
                button.prop('disabled', true).text('Creating...');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bobgo_create_shipment',
                        order_id: button.data('order-id'),
                        nonce: '<?php echo wp_create_nonce('bobgo_order_actions'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            alert('Shipment created successfully!');
                            location.reload();
                        } else {
                            alert('Error: ' + response.data.message);
                            button.prop('disabled', false).text('Create Shipment');
                        }
                    }
                });
            });
            
            $('.bobgo-cancel-shipment').on('click', function() {
                if (!confirm('Cancel this shipment in BobGo?')) return;
                
                var button = $(this);
                button.prop('disabled', true).text('Cancelling...');
                
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'bobgo_cancel_shipment',
                        order_id: button.data('order-id'),
                        nonce: '<?php echo wp_create_nonce('bobgo_order_actions'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            alert('Shipment cancelled successfully!');
                            location.reload();
                        } else {
                            alert('Error: ' + response.data.message);
                            button.prop('disabled', false).text('Cancel Shipment');
                        }
                    }
                });
            });
            
            $('.bobgo-download-waybill').on('click', function() {
                var orderId = $(this).data('order-id');
                window.open(ajaxurl + '?action=bobgo_download_waybill&order_id=' + orderId + '&nonce=<?php echo wp_create_nonce('bobgo_order_actions'); ?>', '_blank');
            });
        });
        </script>
        <?php
    }
    
    /**
     * AJAX handler to create shipment
     */
    public function ajax_create_shipment() {
        check_ajax_referer('bobgo_order_actions', 'nonce');
        
        if (!current_user_can('edit_shop_orders')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }
        
        $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
        $order = wc_get_order($order_id);
        
        if (!$order) {
            wp_send_json_error(array('message' => 'Order not found'));
        }
        
        $result = $this->create_shipment_for_order($order);
        
        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        }
        
        wp_send_json_success(array('message' => 'Shipment created successfully'));
    }
    
    /**
     * AJAX handler to cancel shipment
     */
    public function ajax_cancel_shipment() {
        check_ajax_referer('bobgo_order_actions', 'nonce');
        
        if (!current_user_can('edit_shop_orders')) {
            wp_send_json_error(array('message' => 'Permission denied'));
        }
        
        $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
        $order = wc_get_order($order_id);
        
        if (!$order) {
            wp_send_json_error(array('message' => 'Order not found'));
        }
        
        $shipment_id = $order->get_meta('_bobgo_shipment_id');
        
        if (empty($shipment_id)) {
            wp_send_json_error(array('message' => 'No shipment found'));
        }
        
        $result = $this->bobgo_api->cancel_shipment($shipment_id);
        
        if (is_wp_error($result)) {
            wp_send_json_error(array('message' => $result->get_error_message()));
        }
        
        /** @var array $result */
        $order->update_meta_data('_bobgo_shipment_status', 'cancelled');
        $order->save();
        $order->add_order_note('BobGo shipment cancelled manually');
        
        wp_send_json_success(array('message' => 'Shipment cancelled successfully'));
    }
    
    /**
     * AJAX handler to download waybill
     */
    public function ajax_download_waybill() {
        if (!isset($_GET['nonce']) || !wp_verify_nonce($_GET['nonce'], 'bobgo_order_actions')) {
            wp_die('Invalid nonce');
        }
        
        if (!current_user_can('edit_shop_orders')) {
            wp_die('Permission denied');
        }
        
        $order_id = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;
        $order = wc_get_order($order_id);
        
        if (!$order) {
            wp_die('Order not found');
        }
        
        $shipment_id = $order->get_meta('_bobgo_shipment_id');
        
        if (empty($shipment_id)) {
            wp_die('No shipment found');
        }
        
        $result = $this->bobgo_api->get_waybill($shipment_id, 'standard');
        
        if (is_wp_error($result)) {
            wp_die('Error: ' . $result->get_error_message());
        }
        
        /** @var string $result */
        // Return PDF
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="waybill-' . $shipment_id . '.pdf"');
        echo $result;
        exit;
    }
}

// Initialize the order handler
new BobGo_Order_Handler();
