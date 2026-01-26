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

// Load the endpoint class
require_once __DIR__ . '/class-bobgo-rates-endpoint.php';

// Register REST routes
\add_action( 'rest_api_init', function () {
	$endpoint = new \Global_Site_Settings\BobGo_Shipping\BobGo_Rates_Endpoint();
	$endpoint->register_routes();
} );
