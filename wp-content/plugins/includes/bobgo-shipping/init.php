<?php
/**
 * Initialize BobGo Shipping REST API Endpoint
 *
 * @package Global_Site_Settings
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load the endpoint classes
require_once __DIR__ . '/class-bobgo-rates-endpoint.php';
require_once __DIR__ . '/class-bobgo-tracking-endpoint.php';

// Register REST routes
\add_action( 'rest_api_init', function () {
	$rates_endpoint    = new \Global_Site_Settings\BobGo_Shipping\BobGo_Rates_Endpoint();
	$tracking_endpoint = new \Global_Site_Settings\BobGo_Shipping\BobGo_Tracking_Endpoint();

	$rates_endpoint->register_routes();
	$tracking_endpoint->register_routes();
} );
