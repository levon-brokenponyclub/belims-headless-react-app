<?php
/**
 * Find The Gap API Client
 * 
 * Handles authentication and product fetching from FTG One Gateway API
 * Documentation: https://gateway.ftgone.co.za/swagger
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_FTG_API {
    
    private $base_url = 'https://gateway.ftgone.co.za/v2';
    private $auth_token = null;
    private $token_option_key = 'belims_ftg_auth_token';
    private $token_expiry_key = 'belims_ftg_token_expiry';
    
    /**
     * Get FTG credentials from site settings
     */
    private function get_credentials() {
        return array(
            'email' => get_field('ftg_email', 'option'),
            'password' => get_field('ftg_password', 'option'),
        );
    }
    
    /**
     * Get stored auth token if valid
     */
    private function get_stored_token() {
        $token = get_option($this->token_option_key);
        $expiry = get_option($this->token_expiry_key);
        
        if ($token && $expiry && time() < $expiry) {
            return $token;
        }
        
        return null;
    }
    
    /**
     * Store auth token with expiry (24 hours)
     */
    private function store_token($token) {
        update_option($this->token_option_key, $token);
        update_option($this->token_expiry_key, time() + (24 * 60 * 60)); // 24 hours
        $this->auth_token = $token;
    }
    
    /**
     * Register new FTG account
     */
    public function register($email, $password, $name, $company) {
        $response = wp_remote_post($this->base_url . '/register', array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array(
                'email' => $email,
                'password' => $password,
                'name' => $name,
                'company' => $company,
            )),
            'timeout' => 30,
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = wp_remote_retrieve_response_code($response);
        
        return array(
            'success' => $code === 200 || $code === 201,
            'code' => $code,
            'data' => $body,
        );
    }
    
    /**
     * Login to FTG and get auth token
     */
    public function login() {
        // Check for stored valid token
        $stored_token = $this->get_stored_token();
        if ($stored_token) {
            $this->auth_token = $stored_token;
            return array('success' => true, 'token' => $stored_token);
        }
        
        $credentials = $this->get_credentials();
        
        if (empty($credentials['email']) || empty($credentials['password'])) {
            return array('error' => 'FTG credentials not configured in site settings');
        }
        
        $response = wp_remote_post($this->base_url . '/login', array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode($credentials),
            'timeout' => 30,
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = wp_remote_retrieve_response_code($response);
        
        if ($code === 200 && !empty($body['token'])) {
            $this->store_token($body['token']);
            return array('success' => true, 'token' => $body['token']);
        }
        
        return array('error' => 'Login failed', 'code' => $code, 'data' => $body);
    }
    
    /**
     * Ensure authenticated before API calls
     */
    private function ensure_authenticated() {
        if ($this->auth_token) {
            return true;
        }
        
        $login_result = $this->login();
        return isset($login_result['success']) && $login_result['success'];
    }
    
    /**
     * Get list of collection tokens (instances)
     */
    public function get_instances() {
        if (!$this->ensure_authenticated()) {
            return array('error' => 'Authentication failed');
        }
        
        $response = wp_remote_get($this->base_url . '/instances', array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->auth_token,
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = wp_remote_retrieve_response_code($response);
        
        return array(
            'success' => $code === 200,
            'code' => $code,
            'data' => $body,
        );
    }
    
    /**
     * Get products from FTG API
     * 
     * @param string $collection_token Collection token from instances endpoint
     * @param array $params Optional query parameters (page, limit, etc.)
     */
    public function get_products($collection_token, $params = array()) {
        if (!$this->ensure_authenticated()) {
            return array('error' => 'Authentication failed');
        }
        
        $url = $this->base_url . '/products/' . $collection_token;
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->auth_token,
                'Content-Type' => 'application/json',
            ),
            'timeout' => 60, // Longer timeout for product lists
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = wp_remote_retrieve_response_code($response);
        
        return array(
            'success' => $code === 200,
            'code' => $code,
            'data' => $body,
        );
    }
    
    /**
     * Get single product details
     */
    public function get_product($collection_token, $ftg_one_id) {
        if (!$this->ensure_authenticated()) {
            return array('error' => 'Authentication failed');
        }
        
        $url = $this->base_url . '/products/' . $collection_token . '/ftgoneid/' . $ftg_one_id;
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->auth_token,
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = wp_remote_retrieve_response_code($response);
        
        return array(
            'success' => $code === 200,
            'code' => $code,
            'data' => $body,
        );
    }
    
    /**
     * Get ERP products (more detailed product data)
     */
    public function get_erp_products($collection_token, $instance_id, $params = array()) {
        if (!$this->ensure_authenticated()) {
            return array('error' => 'Authentication failed');
        }
        
        $url = $this->base_url . '/erp/' . $collection_token . '/instances/' . $instance_id . '/products';
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->auth_token,
                'Content-Type' => 'application/json',
            ),
            'timeout' => 60,
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = wp_remote_retrieve_response_code($response);
        
        return array(
            'success' => $code === 200,
            'code' => $code,
            'data' => $body,
        );
    }
    
    /**
     * Get product stock across branches
     */
    public function get_product_stock($collection_token, $instance_id, $product_id) {
        if (!$this->ensure_authenticated()) {
            return array('error' => 'Authentication failed');
        }
        
        $url = $this->base_url . '/erp/' . $collection_token . '/instances/' . $instance_id . '/products/' . $product_id . '/stock';
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->auth_token,
                'Content-Type' => 'application/json',
            ),
            'timeout' => 30,
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        $code = wp_remote_retrieve_response_code($response);
        
        return array(
            'success' => $code === 200,
            'code' => $code,
            'data' => $body,
        );
    }
}
