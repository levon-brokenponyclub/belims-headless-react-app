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

        // 1. Verify the Firebase ID token with Google's public endpoint.
        $verified_phone = self::verify_firebase_token( $firebase_token );

        if ( is_wp_error( $verified_phone ) ) {
            return new WP_REST_Response(
                [ 'message' => $verified_phone->get_error_message() ],
                401
            );
        }

        // Only the Firebase-verified phone number (E.164) identifies the account; never the client-supplied one.
        if ( $verified_phone === '' ) {
            return new WP_REST_Response(
                [ 'message' => 'This sign-in token does not contain a verified phone number.' ],
                401
            );
        }
        $canonical_phone = $verified_phone;

        // 2. Find or create a WP user for this phone number.
        $user = self::find_user_by_phone( $canonical_phone );

        if ( ! $user ) {
            $user = self::create_user_for_phone( $canonical_phone );
        }

        if ( is_wp_error( $user ) ) {
            error_log( '[Belims Firebase Phone Auth] Account lookup/creation failed for ' . $canonical_phone . ': ' . $user->get_error_code() . ' — ' . $user->get_error_message() );
            return new WP_REST_Response(
                [ 'message' => "We couldn't sign you in. Please try again or contact us." ],
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
            // Fail closed: without the key the token cannot be verified.
            return new WP_Error( 'firebase_not_configured', 'Phone sign-in is temporarily unavailable.' );
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
     * Find an existing WP user for a Firebase-verified E.164 phone number.
     *
     * 1. billing_phone match, ignoring spaces/dashes/brackets/"+" and accepting the
     *    local SA format (e.g. +27821234567 ⇄ 0821234567). Oldest account wins.
     * 2. The account a previous phone sign-in created (login "phone_<digits>"), in
     *    case its billing_phone was edited since.
     */
    private static function find_user_by_phone( string $phone ): ?WP_User {
        global $wpdb;

        $digits = preg_replace( '/\D/', '', $phone );
        if ( $digits === '' ) {
            return null;
        }

        $candidates = [ $digits ];
        if ( strpos( $digits, '27' ) === 0 ) {
            $candidates[] = '0' . substr( $digits, 2 );
        }

        $placeholders = implode( ',', array_fill( 0, count( $candidates ), '%s' ) );
        $user_id      = $wpdb->get_var( $wpdb->prepare(
            "SELECT user_id FROM {$wpdb->usermeta}
             WHERE meta_key = 'billing_phone'
               AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(meta_value, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '') IN ($placeholders)
             ORDER BY user_id ASC
             LIMIT 1",
            $candidates
        ) );

        if ( $user_id ) {
            $user = get_user_by( 'id', (int) $user_id );
            if ( $user ) {
                return $user;
            }
        }

        $user = get_user_by( 'login', 'phone_' . $digits );
        return $user ?: null;
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
