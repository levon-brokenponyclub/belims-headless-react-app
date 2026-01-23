<?php

namespace uAfrica_Shipping\app;

/**
 * Class Shortcode
 *
 * @package uAfrica_Shipping\app
 */
class Shortcode {

	const HANDLE = 'uafrica-shipping-shortcode';
	const HANDLE_SUBURB = 'uafrica-shipping-suburb-shortcode';

	const HANDLE_SHIPPING_DESCRIPTION = 'uafrica-shipping-shipping-description-shortcode';

	/**
	 * Register the style and scripts of the shortcode.
	 */
	public static function styles_scripts() {
		wp_enqueue_script('mustache', 'https://cdnjs.cloudflare.com/ajax/libs/mustache.js/2.3.2/mustache.min.js', array(), null, true);

        wp_enqueue_script(
            'moment-js',
            'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js',
            array(),
            '2.29.1',
            true
        );

		wp_enqueue_script(
			self::HANDLE,
			UAFRICA_SHIPPING_URL . 'assets/build/uafrica-shipping.js',
			array('jquery', 'moment-js', 'mustache'),
			UAFRICA_SHIPPING_VERSION,
			true
		);
		wp_localize_script(
			self::HANDLE,
			'uafrica_shipping_l10n',
			array(
				'v3_api_url' => UAFRICA_SHIPPING_API_TRACKING_V3,
				'domain'     => Admin::get_api_domain(),
				// translators: %d the order number.
				'not_found'  => __( "We were unable to retrieve tracking information for '%s'. Please try again later.", 'uafrica-shipping' ),
			)
		);
		wp_enqueue_style(
			self::HANDLE,
			UAFRICA_SHIPPING_URL . 'assets/build/uafrica-shipping.css',
			array(),
			UAFRICA_SHIPPING_VERSION
		);

		// Conditionally enqueue the suburb script for the CLASSIC checkout page
		// is_checkout is only supported for CLASSIC checkout pages, not checkout blocks
		if (is_checkout() && ! is_wc_endpoint_url()) {
			wp_enqueue_script(
				self::HANDLE_SUBURB,
				UAFRICA_SHIPPING_URL . 'assets/build/checkout-suburb.js',
				array(),
				UAFRICA_SHIPPING_VERSION,
				true
			);
		}

        wp_enqueue_script(
            self::HANDLE_SHIPPING_DESCRIPTION,
            UAFRICA_SHIPPING_URL . 'assets/build/custom-shipping-description.js',
            array( 'wc-blocks-checkout' ),
            UAFRICA_SHIPPING_VERSION,
            true
        );
        wp_localize_script( self::HANDLE_SHIPPING_DESCRIPTION, 'shippingDescriptionData', array(
            'shippingDescriptions' => \uAfrica_Shipping\app\WooCommerce::get_shipping_descriptions(),
        ));

		wp_enqueue_script(self::HANDLE, get_template_directory_uri() . 'assets/build/uafrica-shipping.js', [], UAFRICA_SHIPPING_VERSION, true);

		// Fetch content background from theme mod or customizer
		$content_background = get_theme_mod('content_background', 'rgba(0, 0, 0, 0)');

		// Pass data to your JavaScript
		wp_localize_script(self::HANDLE, 'themeSettings', [
			'contentBackgroundColor' => $content_background,
		]);
	}

	/**
	 * Render the shortcode.
	 *
	 * @param string|array $atts attributes passed on to the shortcode.
	 *
	 * @return false|string
	 */
	public static function render( $atts = array() ) {
		$defaults_attr = array(
			'bg_color'   => '#000000',
			'text_color' => '#ffffff',
			'className'  => 'wp-block-uafrica-shipping',
		);
		$atts          = wp_parse_args( $atts, $defaults_attr );

		ob_start();
		require UAFRICA_SHIPPING_TEMPLATES_DIR . 'shipping-template.php';

		return ob_get_clean();
	}
}
