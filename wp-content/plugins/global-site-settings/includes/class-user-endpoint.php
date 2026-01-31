<?php
/**
 * User Registration & Management Endpoint
 * Handles user registration, login, and profile management
 * 
 * @package GlobalSiteSettings
 */

if (!defined('ABSPATH')) exit;

class User_Endpoint {
    
    /**
     * Register REST API routes
     */
    public static function register_routes() {
        // User registration
        register_rest_route('belims/v1', '/users/register', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'register_user'],
            'permission_callback' => '__return_true', // Public endpoint
            'args' => [
                'email' => [
                    'required' => true,
                    'type' => 'string',
                    'format' => 'email',
                    'sanitize_callback' => 'sanitize_email',
                    'validate_callback' => 'is_email',
                ],
                'password' => [
                    'required' => true,
                    'type' => 'string',
                    'minLength' => 8,
                ],
                'first_name' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'last_name' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'phone' => [
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);

        // User login
        register_rest_route('belims/v1', '/users/login', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'login_user'],
            'permission_callback' => '__return_true', // Public endpoint
            'args' => [
                'email' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_email',
                ],
                'password' => [
                    'required' => true,
                    'type' => 'string',
                ],
            ],
        ]);

        // Get current user
        register_rest_route('belims/v1', '/users/me', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_current_user'],
            'permission_callback' => 'is_user_logged_in',
        ]);

        // Update user profile
        register_rest_route('belims/v1', '/users/me', [
            'methods' => 'PUT',
            'callback' => [__CLASS__, 'update_user_profile'],
            'permission_callback' => 'is_user_logged_in',
        ]);

        // Check if email exists
        register_rest_route('belims/v1', '/users/check-email', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'check_email_exists'],
            'permission_callback' => '__return_true',
            'args' => [
                'email' => [
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_email',
                ],
            ],
        ]);

        // Admin: List all users
        register_rest_route('belims/v1', '/users', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'list_users'],
            'permission_callback' => [__CLASS__, 'is_admin_or_shop_manager'],
        ]);
    }

    /**
     * Register a new user
     */
    public static function register_user($request) {
        $email = $request->get_param('email');
        $password = $request->get_param('password');
        $first_name = $request->get_param('first_name');
        $last_name = $request->get_param('last_name');
        $phone = $request->get_param('phone');

        // Check if user already exists
        if (email_exists($email)) {
            return new WP_Error(
                'user_exists',
                'A user with this email address already exists.',
                ['status' => 400]
            );
        }

        // Create username from email
        $username = self::generate_username_from_email($email);

        // Create the user
        $user_id = wp_create_user($username, $password, $email);

        if (is_wp_error($user_id)) {
            return new WP_Error(
                'registration_failed',
                $user_id->get_error_message(),
                ['status' => 500]
            );
        }

        // Update user meta
        if ($first_name) {
            update_user_meta($user_id, 'first_name', $first_name);
        }
        if ($last_name) {
            update_user_meta($user_id, 'last_name', $last_name);
        }
        if ($phone) {
            update_user_meta($user_id, 'billing_phone', $phone);
        }

        // Set user role to customer
        $user = new WP_User($user_id);
        $user->set_role('customer');

        // Auto-login after registration
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id);

        // Get user data
        $user_data = self::format_user_data($user);

        return rest_ensure_response([
            'success' => true,
            'message' => 'User registered successfully',
            'user' => $user_data,
        ]);
    }

    /**
     * Login user
     */
    public static function login_user($request) {
        $email = $request->get_param('email');
        $password = $request->get_param('password');

        // Get user by email
        $user = get_user_by('email', $email);

        if (!$user) {
            return new WP_Error(
                'invalid_credentials',
                'Invalid email or password',
                ['status' => 401]
            );
        }

        // Check password
        if (!wp_check_password($password, $user->data->user_pass, $user->ID)) {
            return new WP_Error(
                'invalid_credentials',
                'Invalid email or password',
                ['status' => 401]
            );
        }

        // Set auth cookie
        wp_set_current_user($user->ID);
        wp_set_auth_cookie($user->ID);

        return rest_ensure_response([
            'success' => true,
            'message' => 'Login successful',
            'user' => self::format_user_data($user),
        ]);
    }

    /**
     * Get current logged-in user
     */
    public static function get_current_user($request) {
        $user = wp_get_current_user();

        if (!$user || $user->ID === 0) {
            return new WP_Error(
                'not_authenticated',
                'User is not authenticated',
                ['status' => 401]
            );
        }

        return rest_ensure_response([
            'success' => true,
            'user' => self::format_user_data($user),
        ]);
    }

    /**
     * Update user profile
     */
    public static function update_user_profile($request) {
        $user_id = get_current_user_id();
        $user = wp_get_current_user();

        // Update user data
        $userdata = ['ID' => $user_id];

        if ($request->has_param('first_name')) {
            update_user_meta($user_id, 'first_name', sanitize_text_field($request->get_param('first_name')));
        }
        if ($request->has_param('last_name')) {
            update_user_meta($user_id, 'last_name', sanitize_text_field($request->get_param('last_name')));
        }
        if ($request->has_param('phone')) {
            update_user_meta($user_id, 'billing_phone', sanitize_text_field($request->get_param('phone')));
        }

        // Update billing/shipping addresses
        $billing_fields = ['billing_address_1', 'billing_city', 'billing_state', 'billing_postcode', 'billing_country'];
        foreach ($billing_fields as $field) {
            if ($request->has_param($field)) {
                update_user_meta($user_id, $field, sanitize_text_field($request->get_param($field)));
            }
        }

        return rest_ensure_response([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => self::format_user_data($user),
        ]);
    }

    /**
     * Check if email exists
     */
    public static function check_email_exists($request) {
        $email = $request->get_param('email');
        $exists = email_exists($email);

        return rest_ensure_response([
            'exists' => (bool) $exists,
            'email' => $email,
        ]);
    }

    /**
     * List all users (admin only)
     */
    public static function list_users($request) {
        $users = get_users([
            'role__in' => ['customer', 'administrator', 'shop_manager'],
            'orderby' => 'registered',
            'order' => 'DESC',
        ]);

        $formatted_users = array_map([__CLASS__, 'format_user_data'], $users);

        return rest_ensure_response([
            'success' => true,
            'count' => count($formatted_users),
            'users' => $formatted_users,
        ]);
    }

    /**
     * Format user data for response
     */
    private static function format_user_data($user) {
        return [
            'id' => $user->ID,
            'email' => $user->user_email,
            'username' => $user->user_login,
            'first_name' => get_user_meta($user->ID, 'first_name', true),
            'last_name' => get_user_meta($user->ID, 'last_name', true),
            'display_name' => $user->display_name,
            'phone' => get_user_meta($user->ID, 'billing_phone', true),
            'roles' => $user->roles,
            'billing' => [
                'address_1' => get_user_meta($user->ID, 'billing_address_1', true),
                'city' => get_user_meta($user->ID, 'billing_city', true),
                'state' => get_user_meta($user->ID, 'billing_state', true),
                'postcode' => get_user_meta($user->ID, 'billing_postcode', true),
                'country' => get_user_meta($user->ID, 'billing_country', true),
            ],
            'registered_date' => $user->user_registered,
        ];
    }

    /**
     * Generate unique username from email
     */
    private static function generate_username_from_email($email) {
        $username = sanitize_user(substr($email, 0, strpos($email, '@')), true);
        
        // Ensure uniqueness
        $base_username = $username;
        $counter = 1;
        
        while (username_exists($username)) {
            $username = $base_username . $counter;
            $counter++;
        }
        
        return $username;
    }

    /**
     * Check if current user is admin or shop manager
     */
    public static function is_admin_or_shop_manager() {
        $user = wp_get_current_user();
        return in_array('administrator', $user->roles) || in_array('shop_manager', $user->roles);
    }
}
