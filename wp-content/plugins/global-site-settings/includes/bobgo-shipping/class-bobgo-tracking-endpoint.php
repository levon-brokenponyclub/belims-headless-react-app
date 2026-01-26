<?php
/**
 * BobGo Tracking REST API Endpoint
 *
 * Exposes a simple JSON tracking endpoint for the headless frontend,
 * backed by the existing BobGo_API wrapper and environment settings.
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

		// Ensure BobGo_API is available
		if ( ! class_exists( '\\BobGo_API' ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'error'   => 'BobGo_API class is not available',
				),
				500
			);
		}

		$api = new \BobGo_API();

		if ( ! $api->has_token() ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'error'   => 'BobGo API token not configured for current environment',
				),
				500
			);
		}

		$result = $api->get_tracking_events( $tracking_ref );

		if ( \is_wp_error( $result ) ) {
			return new \WP_REST_Response(
				array(
					'success' => false,
					'error'   => $result->get_error_message(),
				),
				500
			);
		}

		$normalized = $this->normalize_tracking_response( $tracking_ref, $result );

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
	 * @param array  $payload Raw response from BobGo_API::get_tracking_events()
	 * @return array
	 */
	private function normalize_tracking_response( $tracking_ref, $payload ) {
		$status = null;
		$eta    = null;
		$events = array();

		// BobGo may return different envelope structures; handle a few
		// common patterns while always exposing the raw payload.
		$raw_events = array();

		if ( isset( $payload['tracking_events'] ) && is_array( $payload['tracking_events'] ) ) {
			$raw_events = $payload['tracking_events'];
		} elseif ( isset( $payload['data'] ) && is_array( $payload['data'] ) && isset( $payload['data'][0] ) ) {
			$first = $payload['data'][0];
			if ( isset( $first['tracking_events'] ) && is_array( $first['tracking_events'] ) ) {
				$raw_events = $first['tracking_events'];
			}
			if ( isset( $first['eta'] ) ) {
				$eta = $first['eta'];
			}
			if ( isset( $first['status'] ) ) {
				$status = $first['status'];
			}
			if ( isset( $first['tracking_number'] ) ) {
				$tracking_ref = $first['tracking_number'];
			}
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
