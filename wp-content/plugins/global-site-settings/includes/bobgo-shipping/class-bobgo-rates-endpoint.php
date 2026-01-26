<?php
/**
 * BobGo Shipping Rates REST API Endpoint
 * 
 * This endpoint provides shipping rates for the headless React frontend
 * by leveraging the uAfrica/BobGo WooCommerce plugin's rate calculation.
 * 
 * Endpoint: POST /wp-json/belims/v1/shipping/calculate
 * 
 * @package Global_Site_Settings
 */

namespace Global_Site_Settings\BobGo_Shipping;

class BobGo_Rates_Endpoint {

	/**
	 * Register REST API route
	 */
	public function register_routes() {
		\register_rest_route( 'belims/v1', '/shipping/calculate', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'calculate_shipping_rates' ),
			'permission_callback' => '__return_true', // Public endpoint
		) );
	}

	/**
	 * Calculate shipping rates using WooCommerce and uAfrica plugin
	 * 
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function calculate_shipping_rates( $request ) {
		// Verify WooCommerce is active
		if ( ! function_exists( 'WC' ) ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'error'   => 'WooCommerce is not active'
			), 500 );
		}

		// Get request data
		$params = $request->get_json_params();

		// Validate required fields
		$required_fields = array( 'country', 'postcode', 'city' );
		foreach ( $required_fields as $field ) {
			if ( empty( $params['destination'][ $field ] ) ) {
				return new \WP_REST_Response( array(
					'success' => false,
					'error'   => "Missing required field: destination.$field"
				), 400 );
			}
		}

		try {
			// Build shipping package
			$package = $this->build_shipping_package( $params );

			// Get WooCommerce shipping instance
			$shipping = \WC()->shipping();

			// Calculate shipping rates using WooCommerce (this will trigger uAfrica plugin)
			$shipping->calculate_shipping( array( $package ) );

			// Get the calculated packages
			$packages = $shipping->get_packages();

			// Extract rates from the first package
			$rates = array();
			if ( ! empty( $packages[0]['rates'] ) ) {
				foreach ( $packages[0]['rates'] as $rate ) {
					$rates[] = array(
						'id'               => $rate->get_id(),
						'label'            => $rate->get_label(),
						'cost'             => (float) $rate->get_cost(),
						'service_code'     => $rate->get_meta_data()['uafrica_service_code'] ?? null,
						'description'      => $rate->get_meta_data()['method_description'] ?? null,
						'min_delivery_date' => $rate->get_meta_data()['min_delivery_date'] ?? null,
						'max_delivery_date' => $rate->get_meta_data()['max_delivery_date'] ?? null,
					);
				}
			}

			return new \WP_REST_Response( array(
				'success' => true,
				'rates'   => $rates
			), 200 );

		} catch ( \Exception $e ) {
			return new \WP_REST_Response( array(
				'success' => false,
				'error'   => $e->getMessage()
			), 500 );
		}
	}

	/**
	 * Build a shipping package from request parameters
	 * 
	 * @param array $params Request parameters
	 * @return array WooCommerce shipping package
	 */
	private function build_shipping_package( $params ) {
		$destination = $params['destination'];

		// Safely get cart context (may be empty for headless requests)
		$cart = null;
		if ( function_exists( 'WC' ) && \WC() && isset( \WC()->cart ) ) {
			$cart = \WC()->cart;
		}

		$contents        = $this->get_cart_contents();
		$contents_cost   = $cart ? $cart->get_cart_contents_total() : 0;
		$applied_coupons = $cart ? $cart->get_applied_coupons() : array();

		// Build package array in WooCommerce format
		$package = array(
			'contents'        => $contents,
			'contents_cost'   => $contents_cost,
			'applied_coupons' => $applied_coupons,
			'user'            => array(
				'ID' => \get_current_user_id(),
			),
			'destination'     => array(
				'country'   => $destination['country'] ?? '',
				'state'     => $destination['state'] ?? $destination['province'] ?? '',
				'postcode'  => $destination['postcode'] ?? '',
				'city'      => $destination['city'] ?? '',
				'address'   => $destination['address1'] ?? '',
				'address_1' => $destination['address1'] ?? '',
				'address_2' => $destination['address2'] ?? '',
			),
		);

		// Add suburb fields if provided (for South African addresses)
		if ( ! empty( $destination['shipping_suburb'] ) ) {
			$package['destination']['shipping_suburb'] = $destination['shipping_suburb'];
		}
		if ( ! empty( $destination['cb_shipping_suburb'] ) ) {
			$package['destination']['cb_shipping_suburb'] = $destination['cb_shipping_suburb'];
			$package['destination']['is_checkout_blocks'] = 'true';
		}

		return $package;
	}

	/**
	 * Get cart contents for shipping calculation
	 * 
	 * @return array Cart items in WooCommerce format
	 */
	private function get_cart_contents() {
		// If there's an active cart, use it
		if ( function_exists( 'WC' ) && \WC() && isset( \WC()->cart ) && ! \WC()->cart->is_empty() ) {
			return \WC()->cart->get_cart();
		}

		// Otherwise return empty array (rates will still be calculated based on destination)
		return array();
	}
}
