<?php
/**
 * Cart stock holds (2.11.0)
 *
 * Adding to cart reserves stock for 30 minutes so other shoppers can't buy the same units.
 * The storefront sends its whole cart to POST /belims/v1/cart/hold on every change (signed in
 * or guest, keyed by a random cart ID kept in the browser); that replaces the cart's holds and
 * restarts the 30 minutes. Product responses report stock minus every active hold. Holds end
 * when they expire, when the cart is emptied, or when WooCommerce reduces stock for the order
 * placed from that cart.
 *
 * @package Global_Site_Settings
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Cart_Holds {

    const HOLD_MINUTES = 30;
    const MAX_ITEMS = 100;
    const DB_VERSION = '1';
    const DB_VERSION_OPTION = 'belims_cart_holds_db_version';
    const ORDER_META_KEY = '_belims_cart_id';

    /** Active held quantity per product id, memoised for the request. */
    private static $active_holds = null;

    public static function table() {
        global $wpdb;
        return $wpdb->prefix . 'belims_cart_holds';
    }

    public static function maybe_create_table() {
        if (get_option(self::DB_VERSION_OPTION) === self::DB_VERSION) {
            return;
        }
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $table = self::table();
        $charset = $wpdb->get_charset_collate();
        dbDelta("CREATE TABLE {$table} (
            cart_id varchar(64) NOT NULL,
            product_id bigint(20) unsigned NOT NULL,
            quantity int(11) unsigned NOT NULL,
            expires_at datetime NOT NULL,
            PRIMARY KEY  (cart_id,product_id),
            KEY product_expires (product_id,expires_at)
        ) {$charset};");
        update_option(self::DB_VERSION_OPTION, self::DB_VERSION);
    }

    public static function register_hooks() {
        add_action('init', array(__CLASS__, 'maybe_create_table'));
        // Stock is now really reduced for the order, so its cart's holds would double count.
        add_action('woocommerce_reduce_order_stock', array(__CLASS__, 'release_for_order'));
    }

    public function register_routes() {
        register_rest_route('belims/v1', '/cart/hold', array(
            'methods' => 'POST',
            'callback' => array($this, 'hold'),
            'permission_callback' => '__return_true',
        ));
    }

    private static function valid_cart_id($cart_id) {
        return is_string($cart_id) && preg_match('/^[A-Za-z0-9-]{16,64}$/', $cart_id);
    }

    /**
     * POST { cart_id, items: [{ product_id, quantity }] } — replaces this cart's holds.
     * Returns what could be held (never more than is available after other carts' holds).
     */
    public function hold($request) {
        global $wpdb;
        $params = $request->get_json_params();
        $cart_id = isset($params['cart_id']) ? (string) $params['cart_id'] : '';
        if (!self::valid_cart_id($cart_id)) {
            return new WP_Error('invalid_cart', 'A valid cart_id is required.', array('status' => 400));
        }

        $requested = array();
        foreach (array_slice((array) ($params['items'] ?? array()), 0, self::MAX_ITEMS) as $item) {
            $product_id = absint($item['product_id'] ?? 0);
            $quantity = absint($item['quantity'] ?? 0);
            if ($product_id && $quantity) {
                $requested[$product_id] = ($requested[$product_id] ?? 0) + $quantity;
            }
        }

        $table = self::table();
        $now = current_time('mysql', true);
        $expires = gmdate('Y-m-d H:i:s', time() + self::HOLD_MINUTES * MINUTE_IN_SECONDS);

        // One cart at a time decides who gets the last units.
        $wpdb->get_var("SELECT GET_LOCK('belims_cart_holds', 5)");
        try {
            $wpdb->query($wpdb->prepare("DELETE FROM {$table} WHERE expires_at < %s", $now));
            $previous = array_map('intval', (array) $wpdb->get_col($wpdb->prepare(
                "SELECT product_id FROM {$table} WHERE cart_id = %s",
                $cart_id
            )));
            $wpdb->delete($table, array('cart_id' => $cart_id));

            $result = array();
            foreach ($requested as $product_id => $quantity) {
                $product = wc_get_product($product_id);
                if (!$product) {
                    continue;
                }
                $held = $quantity;
                $available = null;
                if ($product->managing_stock()) {
                    $others = (int) $wpdb->get_var($wpdb->prepare(
                        "SELECT COALESCE(SUM(quantity), 0) FROM {$table} WHERE product_id = %d AND expires_at >= %s",
                        $product_id,
                        $now
                    ));
                    $free = max(0, (int) $product->get_stock_quantity() - $others);
                    $held = min($quantity, $free);
                    $available = $free - $held;
                }
                if ($held > 0) {
                    $wpdb->insert($table, array(
                        'cart_id' => $cart_id,
                        'product_id' => $product_id,
                        'quantity' => $held,
                        'expires_at' => $expires,
                    ));
                }
                $result[] = array(
                    'product_id' => $product_id,
                    'requested' => $quantity,
                    'held' => $held,
                    // Stock left for everyone else after this cart's hold (null = stock not tracked).
                    'available' => $available,
                );
            }

            // Products this cart just let go of: report their freed-up stock too.
            foreach (array_diff($previous, array_keys($requested)) as $product_id) {
                $product = wc_get_product($product_id);
                if (!$product || !$product->managing_stock()) {
                    continue;
                }
                $others = (int) $wpdb->get_var($wpdb->prepare(
                    "SELECT COALESCE(SUM(quantity), 0) FROM {$table} WHERE product_id = %d AND expires_at >= %s",
                    $product_id,
                    $now
                ));
                $result[] = array(
                    'product_id' => $product_id,
                    'requested' => 0,
                    'held' => 0,
                    'available' => max(0, (int) $product->get_stock_quantity() - $others),
                );
            }
        } finally {
            $wpdb->get_var("SELECT RELEASE_LOCK('belims_cart_holds')");
        }

        $response = rest_ensure_response(array(
            'cart_id' => $cart_id,
            'expires_at' => empty($requested) ? null : gmdate('c', strtotime($expires . ' UTC')),
            'hold_minutes' => self::HOLD_MINUTES,
            'items' => $result,
        ));
        $response->header('Cache-Control', 'no-store');
        return $response;
    }

    /** Held quantity per product id across all active holds. */
    public static function active_holds() {
        if (self::$active_holds !== null) {
            return self::$active_holds;
        }
        global $wpdb;
        self::$active_holds = array();
        $table = self::table();
        if (get_option(self::DB_VERSION_OPTION) !== self::DB_VERSION) {
            return self::$active_holds;
        }
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT product_id, SUM(quantity) AS quantity FROM {$table} WHERE expires_at >= %s GROUP BY product_id",
            current_time('mysql', true)
        ));
        foreach ((array) $rows as $row) {
            self::$active_holds[(int) $row->product_id] = (int) $row->quantity;
        }
        return self::$active_holds;
    }

    /**
     * Subtract active holds from `stock` in a product payload (single product, list, or
     * { products: [...] }). Runs on every response, after the server-side cache.
     */
    public static function apply_to_payload($payload) {
        $holds = self::active_holds();
        if (empty($holds) || !is_array($payload)) {
            return $payload;
        }
        $adjust = function ($product) use ($holds) {
            if (!is_array($product) || !isset($product['id'], $product['stock'])) {
                return $product;
            }
            $held = $holds[(int) $product['id']] ?? 0;
            if ($held > 0) {
                $product['stock'] = max(0, (int) $product['stock'] - $held);
                if ($product['stock'] === 0 && isset($product['stock_status'])) {
                    $product['stock_status'] = 'outofstock';
                }
            }
            return $product;
        };
        if (isset($payload['id'])) {
            return $adjust($payload);
        }
        if (isset($payload['products']) && is_array($payload['products'])) {
            $payload['products'] = array_map($adjust, $payload['products']);
            return $payload;
        }
        if (array_keys($payload) === range(0, count($payload) - 1)) {
            return array_map($adjust, $payload);
        }
        return $payload;
    }

    public static function attach_to_order($order, $cart_id) {
        if (self::valid_cart_id($cart_id)) {
            $order->update_meta_data(self::ORDER_META_KEY, $cart_id);
        }
    }

    public static function release_for_order($order) {
        $cart_id = $order ? (string) $order->get_meta(self::ORDER_META_KEY) : '';
        if (self::valid_cart_id($cart_id)) {
            global $wpdb;
            $wpdb->delete(self::table(), array('cart_id' => $cart_id));
        }
    }
}

Belims_Cart_Holds::register_hooks();
