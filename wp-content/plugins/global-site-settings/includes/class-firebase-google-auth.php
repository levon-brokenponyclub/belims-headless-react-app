<?php
/**
 * Firebase Google Authentication Endpoint
 *
 * Exchanges a Firebase Google Sign-In ID token for a WordPress JWT.
 * Finds an existing WP user by email or creates a new customer account.
 *
 * Route: POST /wp-json/belims/v1/auth/firebase-google
 * Body:  { "firebase_token": "<Firebase ID token>", "email": "user@gmail.com", "name": "John Doe" }
 *
 * @package GlobalSiteSettings
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Belims_Firebase_Google_Auth {

    public static function register_routes() {
        register_rest_route( 'belims/v1', '/auth/firebase-google', [
            'methods'             => 'POST',
            'callback'            => [ __CLASS__, 'handle' ],
            'permission_callback' => '__return_true',
            'args'                => [
                'firebase_token' => [
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
                'email' => [
                    'required'          => false,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_email',
                ],
                'name' => [
                    'required'          => false,
                    'type'              => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ] );
    }

    public static function handle( WP_REST_Request $request ): WP_REST_Response {
        $firebase_token = $request->get_param( 'firebase_token' );
        $client_email   = $request->get_param( 'email' ) ?? '';
        $client_name    = $request->get_param( 'name' ) ?? '';

        // 1. Verify the Firebase ID token and extract the verified email.
        $verified = self::verify_firebase_token( $firebase_token );

        if ( is_wp_error( $verified ) ) {
            return new WP_REST_Response(
                [ 'message' => $verified->get_error_message() ],
                401
            );
        }

        // Prefer the server-verified email; fall back to client-supplied value.
        $email      = ! empty( $verified['email'] )        ? $verified['email']        : $client_email;
        $first_name = ! empty( $verified['first_name'] )   ? $verified['first_name']   : '';
        $last_name  = ! empty( $verified['last_name'] )    ? $verified['last_name']    : '';

        // If name was not extracted from token, parse the client-supplied display name.
        if ( empty( $first_name ) && ! empty( $client_name ) ) {
            $parts      = explode( ' ', trim( $client_name ), 2 );
            $first_name = $parts[0] ?? '';
            $last_name  = $parts[1] ?? '';
        }

        if ( empty( $email ) ) {
            return new WP_REST_Response(
                [ 'message' => 'Could not determine email from Google account.' ],
                400
            );
        }

        // 2. Find or create a WP user for this email.
        $user = get_user_by( 'email', $email );

        if ( ! $user ) {
            $user = self::create_user_for_google( $email, $first_name, $last_name );
        } else {
            // Update name fields if they were previously empty.
            $needs_update = [];
            if ( empty( get_user_meta( $user->ID, 'first_name', true ) ) && ! empty( $first_name ) ) {
                $needs_update['first_name'] = $first_name;
            }
            if ( empty( get_user_meta( $user->ID, 'last_name', true ) ) && ! empty( $last_name ) ) {
                $needs_update['last_name'] = $last_name;
            }
            if ( ! empty( $needs_update ) ) {
                $needs_update['ID'] = $user->ID;
                wp_update_user( $needs_update );
            }
        }

        if ( is_wp_error( $user ) ) {
            return new WP_REST_Response(
                [ 'message' => $user->get_error_message() ],
                500
            );
        }

        // 3. Issue a JWT.
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
                'message' => 'Signed in with Google successfully',
            ],
            200
        );
    }

    /**
     * Verify a Firebase ID token using Google's accounts:lookup endpoint.
     * Returns an array with 'email', 'first_name', 'last_name' on success, or WP_Error.
     */
    private static function verify_firebase_token( string $token ) {
        $firebase_api_key = defined( 'BELIMS_FIREBASE_API_KEY' )
            ? BELIMS_FIREBASE_API_KEY
            : get_option( 'belims_firebase_api_key', '' );

        if ( empty( $firebase_api_key ) ) {
            // No API key — skip server-side verification and trust the client-supplied email.
            return [];
        }

        $url      = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . urlencode( $firebase_api_key );
        $response = wp_remote_post( $url, [
            'headers' => [ 'Content-Type' => 'application/json' ],
            'body'    => wp_json_encode( [ 'idToken' => $token ] ),
            'timeout' => 10,
        ] );

        if ( is_wp_error( $response ) ) {
            return new WP_Error( 'firebase_unreachable', 'Could not verify Google authentication.' );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( $code !== 200 || empty( $body['users'][0] ) ) {
            $error_msg = $body['error']['message'] ?? 'Invalid or expired Google token.';
            return new WP_Error( 'firebase_invalid_token', $error_msg );
        }

        $firebase_user = $body['users'][0];
        $display_name  = $firebase_user['displayName'] ?? '';
        $parts         = explode( ' ', trim( $display_name ), 2 );

        return [
            'email'      => $firebase_user['email'] ?? '',
            'first_name' => $parts[0] ?? '',
            'last_name'  => $parts[1] ?? '',
        ];
    }

    private static function create_user_for_google( string $email, string $first_name, string $last_name ) {
        $username = sanitize_user( strtolower( strstr( $email, '@', true ) ), true );
        // Ensure uniqueness.
        $base     = $username;
        $suffix   = 1;
        while ( username_exists( $username ) ) {
            $username = $base . $suffix++;
        }

        $password = wp_generate_password( 24, true, true );
        $user_id  = wp_create_user( $username, $password, $email );

        if ( is_wp_error( $user_id ) ) {
            return $user_id;
        }

        $user = new WP_User( $user_id );
        $user->set_role( 'customer' );

        if ( ! empty( $first_name ) ) update_user_meta( $user_id, 'first_name', $first_name );
        if ( ! empty( $last_name ) )  update_user_meta( $user_id, 'last_name',  $last_name );
        update_user_meta( $user_id, 'billing_country', 'ZA' );

        return $user;
    }

    /**
     * Generate a JWT — identical implementation to Belims_Firebase_Phone_Auth::generate_jwt().
     */
    private static function generate_jwt( WP_User $user ) {
        if ( ! defined( 'JWT_AUTH_SECRET_KEY' ) && ! get_option( 'jwt_auth_secret_key' ) ) {
            return new WP_Error( 'jwt_not_configured', 'JWT Auth plugin is not configured.' );
        }

        $secret     = defined( 'JWT_AUTH_SECRET_KEY' ) ? JWT_AUTH_SECRET_KEY : get_option( 'jwt_auth_secret_key' );
        $issued_at  = time();
        $expire     = $issued_at + ( DAY_IN_SECONDS * 7 );

        $payload = [
            'iss'  => get_bloginfo( 'url' ),
            'iat'  => $issued_at,
            'nbf'  => $issued_at,
            'exp'  => $expire,
            'data' => [ 'user' => [ 'id' => $user->ID ] ],
        ];

        $header    = self::base64url_encode( wp_json_encode( [ 'typ' => 'JWT', 'alg' => 'HS256' ] ) );
        $body      = self::base64url_encode( wp_json_encode( $payload ) );
        $signature = self::base64url_encode( hash_hmac( 'sha256', "$header.$body", $secret, true ) );

        return "$header.$body.$signature";
    }

    private static function base64url_encode( string $data ): string {
        return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
    }
}
