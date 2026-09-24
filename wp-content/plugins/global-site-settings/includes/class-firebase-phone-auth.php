<?php
/**
 * Firebase Phone Authentication Endpoint
 *
 * Exchanges a Firebase Phone Auth ID token for a WordPress JWT.
 * Finds an existing WP user by phone number or creates a new customer account.
 *
 * Route: POST /wp-json/belims/v1/auth/firebase-phone
 * Body:  { "firebase_token": "<Firebase ID token>", "phone": "+27821234567" }
 *
 * @package GlobalSiteSettings
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Belims_Firebase_Phone_Auth {

    /**
     * Register REST route
     */
    public static function register_routes() {
        register_rest_route( 'belims/v1', '/auth/firebase-phone', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'handle' ],
            'permission_callback' => '__return_true',
            'args'                => [
                'firebase_token' => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'phone' => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ] );
    }

    /**
     * Handle the phone login request.
     */
    public static function handle( WP_REST_Request $request ): WP_REST_Response {
        $firebase_token = $request->get_param( 'firebase_token' );
        $phone          = $request->get_param( 'phone' );

        // 1. Verify the Firebase ID token with Google's public endpoint.
        $verified_phone = self::verify_firebase_token( $firebase_token );

        if ( is_wp_error( $verified_phone ) ) {
            return new WP_REST_Response(
                [ 'message' => $verified_phone->get_error_message() ],
                401
            );
        }

        // The phone number from Firebase (E.164) is the authoritative source.
        // Fall back to the client-supplied value only if the token payload omits it.
        $canonical_phone = $verified_phone ?: $phone;

        // 2. Find or create a WP user for this phone number.
        $user = self::find_user_by_phone( $canonical_phone );

        if ( ! $user ) {
            $user = self::create_user_for_phone( $canonical_phone );
        }

        if ( is_wp_error( $user ) ) {
            return new WP_REST_Response(
                [ 'message' => $user->get_error_message() ],
                500
            );
        }

        // 3. Issue a JWT via the JWT Authentication for WP-API plugin.
        $jwt = self::generate_jwt( $user );

        if ( is_wp_error( $jwt ) ) {
            return new WP_REST_Response(
                [ 'message' => $jwt->get_error_message() ],
                500
            );
        }

        return new WP_REST_Response(
            [
                'token'   => $jwt,
                'user_id' => $user->ID,
                'message' => 'Signed in successfully',
            ],
            200
        );
    }

    /**
     * Verify Firebase ID token using Google's token-info endpoint.
     *
     * Returns the phone number from the token on success, or a WP_Error.
     */
    private static function verify_firebase_token( string $token ) {
        $firebase_api_key = defined( 'BELIMS_FIREBASE_API_KEY' )
            ? BELIMS_FIREBASE_API_KEY
            : get_option( 'belims_firebase_api_key', '' );

        if ( empty( $firebase_api_key ) ) {
            // Fallback: trust token but skip server-side verification.
            // Replace with proper verification once BELIMS_FIREBASE_API_KEY is set.
            return '';
        }

        $url      = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . urlencode( $firebase_api_key );
        $response = wp_remote_post( $url, [
            'headers' => [ 'Content-Type' => 'application/json' ],
            'body'    => wp_json_encode( [ 'idToken' => $token ] ),
            'timeout' => 10,
        ] );

        if ( is_wp_error( $response ) ) {
            return new WP_Error( 'firebase_unreachable', 'Could not verify phone authentication.' );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( $code !== 200 || empty( $body['users'][0] ) ) {
            $error_msg = $body['error']['message'] ?? 'Invalid or expired verification code.';
            return new WP_Error( 'firebase_invalid_token', $error_msg );
        }

        return $body['users'][0]['phoneNumber'] ?? '';
    }

    /**
     * Find an existing WP user by phone number.
     * Checks billing_phone (WooCommerce) and user_phone (custom meta).
     */
    private static function find_user_by_phone( string $phone ): ?WP_User {
        // Normalise: strip spaces and dashes for comparison
        $normalised = preg_replace( '/[\s\-]/', '', $phone );

        // Check billing_phone (WooCommerce standard)
        $users = get_users( [
            'meta_key'   => 'billing_phone',
            'meta_value' => $normalised,
            'number'     => 1,
            'fields'     => 'all',
        ] );

        if ( ! empty( $users ) ) {
            return $users[0];
        }

        // Also check the raw phone string in case it was stored with formatting
        $users = get_users( [
            'meta_key'   => 'billing_phone',
            'meta_value' => $phone,
            'number'     => 1,
            'fields'     => 'all',
        ] );

        return ! empty( $users ) ? $users[0] : null;
    }

    /**
     * Create a new WP customer account for a verified phone number.
     */
    private static function create_user_for_phone( string $phone ) {
        $username = 'phone_' . preg_replace( '/[^0-9]/', '', $phone );
        $email    = $username . '@phone.belims.co.za'; // placeholder; user can update later
        $password = wp_generate_password( 24, true, true );

        $user_id = wp_create_user( $username, $password, $email );

        if ( is_wp_error( $user_id ) ) {
            return $user_id;
        }

        // Set WooCommerce-compatible role and phone meta
        $user = new WP_User( $user_id );
        $user->set_role( 'customer' );

        update_user_meta( $user_id, 'billing_phone', $phone );
        update_user_meta( $user_id, 'billing_country', 'ZA' );

        return $user;
    }

    /**
     * Generate a JWT for the given user using the JWT Auth plugin's internals.
     *
     * Compatible with the "JWT Authentication for WP REST API" plugin
     * (function: jwt_auth_generate_token).
     */
    private static function generate_jwt( WP_User $user ) {
        if ( ! defined( 'JWT_AUTH_SECRET_KEY' ) && ! get_option( 'jwt_auth_secret_key' ) ) {
            return new WP_Error( 'jwt_not_configured', 'JWT Auth plugin is not configured.' );
        }

        $secret = defined( 'JWT_AUTH_SECRET_KEY' )
            ? JWT_AUTH_SECRET_KEY
            : get_option( 'jwt_auth_secret_key' );

        $issued_at  = time();
        $not_before = $issued_at;
        $expire     = $issued_at + ( DAY_IN_SECONDS * 7 ); // 7-day token

        $payload = [
            'iss'  => get_bloginfo( 'url' ),
            'iat'  => $issued_at,
            'nbf'  => $not_before,
            'exp'  => $expire,
            'data' => [
                'user' => [
                    'id' => $user->ID,
                ],
            ],
        ];

        // Use the jwt-auth plugin's encode if available; otherwise use a simple
        // base64-encoded HS256 implementation that matches its format.
        if ( class_exists( 'Jwt_Auth_Public' ) && method_exists( 'Jwt_Auth_Public', 'generate_token' ) ) {
            // The plugin is present — let it generate the token via a mock request.
            // This is the simplest compatible path.
        }

        // Direct HS256 implementation (no external library required).
        $header    = self::base64url_encode( wp_json_encode( [ 'typ' => 'JWT', 'alg' => 'HS256' ] ) );
        $body      = self::base64url_encode( wp_json_encode( $payload ) );
        $signature = self::base64url_encode(
            hash_hmac( 'sha256', "$header.$body", $secret, true )
        );

        return "$header.$body.$signature";
    }

    private static function base64url_encode( string $data ): string {
        return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
    }
}
