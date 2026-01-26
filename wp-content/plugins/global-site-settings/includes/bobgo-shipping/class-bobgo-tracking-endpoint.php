<?php
/**
 * BobGo Tracking REST API Endpoint
 *
 * Exposes a simple JSON tracking endpoint for the headless frontend,
 * backed by the public BobGo tracking API and current environment
 * (sandbox vs production).
 *
 * Endpoint: POST /wp-json/belims/v1/track
 *
 * Body: { "trackingRef": "UASSBNJ9" }
 *
 * @package Global_Site_Settings
 */

namespace Global_Site_Settings\BobGo_Shipping;

class BobGo_Tracking_Endpoint {
	/**
	 * Register REST API route
	 */
	public function register_routes() {
		\register_rest_route(
			'belims/v1',
			'/track',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle_track_request' ),
				'permission_callback' => '__return_true', // Public endpoint
			)
		);
	}

	/**
	 * Handle tracking request
	 *
	 * @param \WP_REST_Request $request
	 * @return \WP_REST_Response
	 */
	public function handle_track_request( $request ) {
		$params      = $request->get_json_params();
		$tracking_ref = isset( $params['trackingRef'] ) ? trim( (string) $params['trackingRef'] ) : '';

		if ( $tracking_ref === '' ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'error'   => 'Missing trackingRef in request body',
				),
				400
			);
		}

		// Determine environment (sandbox vs production) from BobGo settings.
		$env = get_option( 'bobgo_environment', get_option( 'options_bobgo_environment', 'production' ) );
		$env = $env === 'sandbox' ? 'sandbox' : 'production';

		$host = ( 'sandbox' === $env )
			? 'https://api.sandbox.bobgo.co.za'
			: 'https://api.bobgo.co.za';

		// Determine the channel/domain, mirroring uAfrica_Shipping Admin logic
		// when available, otherwise fall back to the site's domain.
		$domain = null;
		if ( class_exists( '\\uAfrica_Shipping\\app\\Admin' ) ) {
			$domain = \uAfrica_Shipping\app\Admin::get_api_domain();
		}
		if ( empty( $domain ) ) {
			$home_url = home_url();
			$domain   = wp_parse_url( $home_url, PHP_URL_HOST );
			$path     = wp_parse_url( $home_url, PHP_URL_PATH );
			if ( $path ) {
				$domain .= $path;
			}
		}

		$url = $host . '/tracking?channel=' . rawurlencode( (string) $domain ) . '&tracking_reference=' . rawurlencode( $tracking_ref );

		$response = wp_remote_get(
			$url,
			array(
				'timeout' => 30,
				'headers' => array(
					'Accept' => 'application/json',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'error'   => $response->get_error_message(),
				),
				500
			);
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( null === $data && JSON_ERROR_NONE !== json_last_error() ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'error'   => 'Unable to decode tracking response from BobGo',
				),
				500
			);
		}

		$normalized = $this->normalize_tracking_response( $tracking_ref, is_array( $data ) ? $data : array() );

		return new \WP_REST_Response(
			array_merge(
				array( 'success' => true ),
				$normalized
			),
			200
		);
	}

	/**
	 * Best-effort normalization of BobGo tracking payload into the
	 * shape expected by the headless TrackOrderPage.
	 *
	 * @param string $tracking_ref
	 * @param array  $payload Raw response from BobGo tracking endpoint
	 * @return array
	 */
	private function normalize_tracking_response( $tracking_ref, $payload ) {
		$status = null;
		$eta    = null;
		$events = array();

		// BobGo may return different envelope structures; handle a few
		// common patterns while always exposing the raw payload.
		$raw_events = array();

		// Direct top-level events array.
		if ( isset( $payload['events'] ) && is_array( $payload['events'] ) ) {
			$raw_events = $payload['events'];
		} elseif ( isset( $payload['tracking_events'] ) && is_array( $payload['tracking_events'] ) ) {
			$raw_events = $payload['tracking_events'];
		} elseif ( isset( $payload['data'] ) && is_array( $payload['data'] ) && isset( $payload['data'][0] ) ) {
			$first = $payload['data'][0];
			if ( isset( $first['tracking_events'] ) && is_array( $first['tracking_events'] ) ) {
				$raw_events = $first['tracking_events'];
			}
			if ( isset( $first['events'] ) && is_array( $first['events'] ) ) {
				$raw_events = $first['events'];
			}
			if ( isset( $first['eta'] ) ) {
				$eta = $first['eta'];
			}
			if ( isset( $first['status'] ) ) {
				$status = $first['status'];
			}
			if ( isset( $first['tracking_number'] ) ) {
				$tracking_ref = $first['tracking_number'];
			} elseif ( isset( $first['tracking_reference'] ) ) {
				$tracking_ref = $first['tracking_reference'];
			}
		}

		// Top-level helpers
		if ( isset( $payload['eta'] ) && ! $eta ) {
			$eta = $payload['eta'];
		}
		if ( isset( $payload['status'] ) && ! $status ) {
			$status = $payload['status'];
		}
		if ( isset( $payload['tracking_reference'] ) ) {
			$tracking_ref = $payload['tracking_reference'];
		}

		foreach ( $raw_events as $event ) {
			$label    = isset( $event['description'] ) ? $event['description'] : ( $event['status'] ?? '' );
			$time     = $event['occurred_at'] ?? ( $event['created_at'] ?? null );
			$location = $event['location'] ?? ( $event['city'] ?? null );

			$events[] = array(
				'label'    => $label,
				'status'   => $event['status'] ?? null,
				'time'     => $time,
				'location' => $location,
				'raw'      => $event,
			);
		}

		if ( $status === null && ! empty( $events ) ) {
			$status = $events[0]['status'] ?? $events[0]['label'];
		}

		return array(
			'trackingRef' => $tracking_ref,
			'status'      => $status,
			'eta'         => $eta,
			'events'      => $events,
			'raw'         => $payload,
		);
	}
}
