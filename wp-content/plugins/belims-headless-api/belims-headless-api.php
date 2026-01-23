<?php
/**
 * Plugin Name: Belims Headless API
 * Plugin URI: https://belims.co.za
 * Description: Custom REST API endpoints for Belims headless frontend. Optimized product data with VAT, bundles, and shipping info.
 * Version: 1.0.0
 * Author: Belims
 * Text Domain: belims-api
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Define plugin constants
define('BELIMS_API_VERSION', '1.0.0');
define('BELIMS_API_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BELIMS_API_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class Belims_Headless_API {
    
    /**
     * Instance of this class
     */
    private static $instance = null;

    /**
     * Get singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->includes();
        $this->init_hooks();
    }

    /**
     * Include required files
     */
    private function includes() {
        require_once BELIMS_API_PLUGIN_DIR . 'includes/class-products-endpoint.php';
        require_once BELIMS_API_PLUGIN_DIR . 'includes/class-categories-endpoint.php';
        require_once BELIMS_API_PLUGIN_DIR . 'includes/class-orders-endpoint.php';
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_filter('rest_pre_serve_request', array($this, 'add_cors_headers'), 10, 4);
    }

    /**
     * Register REST API routes
     */
    public function register_routes() {
        $products = new Belims_Products_Endpoint();
        $products->register_routes();

        $categories = new Belims_Categories_Endpoint();
        $categories->register_routes();

        $orders = new Belims_Orders_Endpoint();
        $orders->register_routes();
    }

    /**
     * Add CORS headers for headless frontend
     */
    public function add_cors_headers($served, $result, $request, $server) {
        // Allow your frontend domain (update this to your actual frontend URL)
        $allowed_origins = array(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173', // Vite default
            'https://belims.co.za',
            'https://www.belims.co.za',
            'http://belims-headless.local' // Local dev
        );

        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
        
        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            header('Access-Control-Allow-Credentials: true');
        }

        return $served;
    }
}

/**
 * Initialize the plugin
 */
function belims_api_init() {
    return Belims_Headless_API::get_instance();
}
add_action('plugins_loaded', 'belims_api_init');
