<?php
/**
 * Orders REST API Endpoint
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Orders_Endpoint {

    /**
     * Register routes
     */
    public function register_routes() {
        // Get customer orders (requires login)
        register_rest_route('belims/v1', '/orders', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_customer_orders'),
            'permission_callback' => 'is_user_logged_in',
        ));

        // Create order
        register_rest_route('belims/v1', '/orders', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_order'),
            'permission_callback' => '__return_true',
        ));

        // Get single order
        register_rest_route('belims/v1', '/orders/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_order'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Get customer orders
     */
    public function get_customer_orders($request) {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return new WP_Error('unauthorized', 'You must be logged in to view orders', array('status' => 401));
        }

        // Get customer orders
        $customer_orders = wc_get_orders(array(
            'customer_id' => $user_id,
            'limit' => -1, // Get all orders
            'orderby' => 'date',
            'order' => 'DESC',
        ));

        $orders = array();
        foreach ($customer_orders as $order) {
            // Get line items
            $line_items = array();
            foreach ($order->get_items() as $item_id => $item) {
                $product = $item->get_product();
                $line_items[] = array(
                    'id' => $item_id,
                    'product_id' => $item->get_product_id(),
                    'name' => $item->get_name(),
                    'quantity' => $item->get_quantity(),
                    'price' => $item->get_subtotal(),
                    'total' => $item->get_total(),
                    'image' => $product ? wp_get_attachment_url($product->get_image_id()) : '',
                );
            }

            // Get shipping lines
            $shipping_lines = array();
            foreach ($order->get_items('shipping') as $item_id => $item) {
                $shipping_lines[] = array(
                    'id' => $item_id,
                    'method_title' => $item->get_method_title(),
                    'method_id' => $item->get_method_id(),
                    'total' => $item->get_total(),
                );
            }

            // Format order data
            $orders[] = array(
                'id' => $order->get_id(),
                'order_number' => $order->get_order_number(),
                'date_created' => $order->get_date_created()->date('c'), // ISO 8601 format
                'status' => $order->get_status(),
                'total' => $order->get_total(),
                'currency' => $order->get_currency(),
                'line_items' => $line_items,
                'shipping_address' => array(
                    'street' => $order->get_shipping_address_1(),
                    'city' => $order->get_shipping_city(),
                    'province' => $order->get_shipping_state(),
                    'postalCode' => $order->get_shipping_postcode(),
                    'country' => $order->get_shipping_country(),
                ),
                'billing_address' => array(
                    'street' => $order->get_billing_address_1(),
                    'city' => $order->get_billing_city(),
                    'province' => $order->get_billing_state(),
                    'postalCode' => $order->get_billing_postcode(),
                    'country' => $order->get_billing_country(),
                ),
                'payment_method' => $order->get_payment_method_title(),
                'shipping_lines' => $shipping_lines,
            );
        }

        return rest_ensure_response($orders);
    }

    /**
     * Create a new order
     */
    public function create_order($request) {
        $params = $request->get_json_params();

        // Validate required fields
        if (empty($params['customer']) || empty($params['items'])) {
            return new WP_Error('missing_data', 'Customer and items are required', array('status' => 400));
        }

        try {
            $order = wc_create_order();

            // Set customer ID if user is logged in
            $user_id = get_current_user_id();
            if ($user_id) {
                $order->set_customer_id($user_id);
            }

            // Add customer details
            $customer = $params['customer'];
            $order->set_billing_first_name(sanitize_text_field($customer['firstName']));
            $order->set_billing_last_name(sanitize_text_field($customer['lastName']));
            $order->set_billing_email(sanitize_email($customer['email']));
            $order->set_billing_phone(sanitize_text_field($customer['phone']));
            $order->set_billing_address_1(sanitize_text_field($customer['address']));
            $order->set_billing_city(sanitize_text_field($customer['city']));
            $order->set_billing_state(sanitize_text_field($customer['province']));
            $order->set_billing_postcode(sanitize_text_field($customer['postalCode']));
            $order->set_billing_country('ZA');

            // Use same for shipping
            $order->set_shipping_first_name(sanitize_text_field($customer['firstName']));
            $order->set_shipping_last_name(sanitize_text_field($customer['lastName']));
            $order->set_shipping_address_1(sanitize_text_field($customer['address']));
            $order->set_shipping_city(sanitize_text_field($customer['city']));
            $order->set_shipping_state(sanitize_text_field($customer['province']));
            $order->set_shipping_postcode(sanitize_text_field($customer['postalCode']));
            $order->set_shipping_country('ZA');

            // Add products
            foreach ($params['items'] as $item) {
                $product_id = intval($item['id']);
                $quantity = intval($item['quantity']);
                $product = wc_get_product($product_id);

                if ($product) {
                    $order->add_product($product, $quantity);
                }
            }

            // Add shipping method if provided
            if (!empty($params['shipping'])) {
                $shipping = $params['shipping'];
                $shipping_item = new WC_Order_Item_Shipping();
                $shipping_item->set_method_title($shipping['service_name']);
                $shipping_item->set_total($shipping['total_price']);
                $order->add_item($shipping_item);
            }

            // Calculate totals (this will apply VAT fees from functions.php)
            $order->calculate_totals();

            // Set order status
            $order->set_status('pending'); // Will be updated after payment

            // Add order note
            $order->add_order_note('Order created via Belims Headless API');

            // Save the order
            $order->save();

            return rest_ensure_response(array(
                'success' => true,
                'order_id' => $order->get_id(),
                'order_key' => $order->get_order_key(),
                'total' => $order->get_total(),
            ));

        } catch (Exception $e) {
            return new WP_Error('order_creation_failed', $e->getMessage(), array('status' => 500));
        }
    }

    /**
     * Get order details
     */
    public function get_order($request) {
        $order_id = $request['id'];
        $order = wc_get_order($order_id);

        if (!$order) {
            return new WP_Error('order_not_found', 'Order not found', array('status' => 404));
        }

        return rest_ensure_response(array(
            'id' => $order->get_id(),
            'order_key' => $order->get_order_key(),
            'status' => $order->get_status(),
            'total' => $order->get_total(),
            'currency' => $order->get_currency(),
            'date_created' => $order->get_date_created()->date('Y-m-d H:i:s'),
        ));
    }
}
