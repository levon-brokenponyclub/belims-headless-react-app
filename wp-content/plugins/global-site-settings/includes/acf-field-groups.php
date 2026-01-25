<?php
/**
 * ACF Field Groups for Belims Site Settings
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

if( function_exists('acf_add_local_field_group') ):

// Site Branding & Identity
acf_add_local_field_group(array(
    'key' => 'group_belims_branding',
    'title' => 'Site Branding & Identity',
    'fields' => array(
        array(
            'key' => 'field_belims_site_logo',
            'label' => 'Site Logo',
            'name' => 'site_logo',
            'type' => 'image',
            'instructions' => 'Upload your site logo (recommended: PNG with transparent background, max width 300px)',
            'required' => 0,
            'return_format' => 'array',
            'preview_size' => 'medium',
            'library' => 'all',
            'max_width' => 500,
            'max_height' => 200,
        ),
        array(
            'key' => 'field_belims_site_favicon',
            'label' => 'Site Favicon',
            'name' => 'site_favicon',
            'type' => 'image',
            'instructions' => 'Upload a favicon (32x32px ICO or PNG file)',
            'required' => 0,
            'return_format' => 'array',
            'preview_size' => 'thumbnail',
            'library' => 'all',
        ),
        array(
            'key' => 'field_belims_site_tagline',
            'label' => 'Site Tagline',
            'name' => 'site_tagline',
            'type' => 'text',
            'instructions' => 'A short description of your business',
            'default_value' => 'Your one-stop hardware store',
        ),
        array(
            'key' => 'field_belims_brand_colors',
            'label' => 'Brand Colors',
            'name' => 'brand_colors',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_belims_primary_color',
                    'label' => 'Primary Brand Color',
                    'name' => 'primary_color',
                    'type' => 'color_picker',
                    'default_value' => '#1e40af',
                ),
                array(
                    'key' => 'field_belims_secondary_color',
                    'label' => 'Secondary Brand Color',
                    'name' => 'secondary_color',
                    'type' => 'color_picker',
                    'default_value' => '#3b82f6',
                ),
            ),
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'belims-site-settings',
            ),
        ),
    ),
    'menu_order' => 1,
));

// Contact Information
acf_add_local_field_group(array(
    'key' => 'group_belims_contact',
    'title' => 'Contact Information',
    'fields' => array(
        array(
            'key' => 'field_belims_company_name',
            'label' => 'Company Name',
            'name' => 'company_name',
            'type' => 'text',
            'required' => 1,
            'default_value' => 'Belims Hardware',
        ),
        array(
            'key' => 'field_belims_phone_number',
            'label' => 'Phone Number',
            'name' => 'phone_number',
            'type' => 'text',
            'instructions' => 'Main business phone number',
            'default_value' => '+27 11 123 4567',
        ),
        array(
            'key' => 'field_belims_email_address',
            'label' => 'Email Address',
            'name' => 'email_address',
            'type' => 'email',
            'instructions' => 'Main business email address',
            'default_value' => 'info@belims.co.za',
        ),
        array(
            'key' => 'field_belims_address',
            'label' => 'Physical Address',
            'name' => 'physical_address',
            'type' => 'textarea',
            'rows' => 3,
            'instructions' => 'Full business address',
            'default_value' => "123 Hardware Street\nJohannesburg, 2000\nSouth Africa",
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'belims-site-settings',
            ),
        ),
    ),
    'menu_order' => 2,
));

// E-commerce Settings
acf_add_local_field_group(array(
    'key' => 'group_belims_ecommerce',
    'title' => 'E-commerce Settings',
    'fields' => array(
        array(
            'key' => 'field_belims_currency_symbol',
            'label' => 'Currency Symbol',
            'name' => 'currency_symbol',
            'type' => 'text',
            'instructions' => 'Currency symbol to display',
            'default_value' => 'R',
            'maxlength' => 5,
        ),
        array(
            'key' => 'field_belims_free_shipping_threshold',
            'label' => 'Free Shipping Threshold',
            'name' => 'free_shipping_threshold',
            'type' => 'number',
            'instructions' => 'Minimum order amount for free shipping',
            'default_value' => 1000,
            'min' => 0,
        ),
        array(
            'key' => 'field_belims_delivery_fee',
            'label' => 'Standard Delivery Fee',
            'name' => 'delivery_fee',
            'type' => 'number',
            'instructions' => 'Standard delivery fee for orders under threshold',
            'default_value' => 150,
            'min' => 0,
        ),
        array(
            'key' => 'field_belims_express_delivery_fee',
            'label' => 'Express Delivery Fee',
            'name' => 'express_delivery_fee',
            'type' => 'number',
            'instructions' => 'Fee for express/same-day delivery',
            'default_value' => 300,
            'min' => 0,
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'belims-site-settings',
            ),
        ),
    ),
    'menu_order' => 3,
));

// Notifications
acf_add_local_field_group(array(
    'key' => 'group_belims_notifications',
    'title' => 'Site Notifications',
    'fields' => array(
        array(
            'key' => 'field_belims_notification_enabled',
            'label' => 'Enable Notification Bar',
            'name' => 'notification_enabled',
            'type' => 'true_false',
            'default_value' => 1,
            'ui' => 1,
        ),
        array(
            'key' => 'field_belims_notification_message',
            'label' => 'Notification Message',
            'name' => 'notification_message',
            'type' => 'textarea',
            'rows' => 2,
            'default_value' => 'Free shipping with R1,000 purchase. <a href="#">Shop Now →</a>',
            'instructions' => 'HTML allowed for links and formatting',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_notification_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_notification_type',
            'label' => 'Notification Type',
            'name' => 'notification_type',
            'type' => 'select',
            'choices' => array(
                'info' => 'Info (Blue)',
                'success' => 'Success (Green)',
                'warning' => 'Warning (Yellow)',
                'error' => 'Error (Red)',
                'promo' => 'Promotion (Purple)',
            ),
            'default_value' => 'promo',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_notification_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'belims-site-settings',
            ),
        ),
    ),
    'menu_order' => 4,
));

// APIs Configuration
acf_add_local_field_group(array(
    'key' => 'group_belims_apis',
    'title' => 'APIs Configuration',
    'fields' => array(
        array(
            'key' => 'field_belims_api_info',
            'label' => 'API Information',
            'name' => 'api_info',
            'type' => 'message',
            'message' => 'Configure external API integrations for shipping, payments, and AI features.',
        ),
        array(
            'key' => 'field_belims_cors_section',
            'label' => 'CORS & Security',
            'name' => 'cors_section',
            'type' => 'tab',
        ),
        array(
            'key' => 'field_belims_headless_url',
            'label' => 'Allowed CORS Origins',
            'name' => 'headless_frontend_url',
            'type' => 'textarea',
            'instructions' => 'Enter allowed origins (URLs), one per line. Use * to allow all (not recommended for production).',
            'placeholder' => "http://localhost:3000\nhttps://belims-headless-react-app.netlify.app",
            'required' => 0,
            'rows' => 3,
        ),
        array(
            'key' => 'field_belims_suppress_logs',
            'label' => 'Suppress Console Logs',
            'name' => 'suppress_logs',
            'type' => 'true_false',
            'instructions' => 'Hide system logs in frontend console.',
            'ui' => 1,
            'default_value' => 0,
        ),
        array(
            'key' => 'field_belims_woocommerce_section',
            'label' => 'WooCommerce API',
            'name' => 'woocommerce_section',
            'type' => 'tab',
        ),
        array(
            'key' => 'field_belims_woo_consumer_key',
            'label' => 'WooCommerce Consumer Key',
            'name' => 'woo_consumer_key',
            'type' => 'password',
            'instructions' => 'Your WooCommerce REST API consumer key (stored securely)',
            'required' => 0,
        ),
        array(
            'key' => 'field_belims_woo_consumer_secret',
            'label' => 'WooCommerce Consumer Secret',
            'name' => 'woo_consumer_secret',
            'type' => 'password',
            'instructions' => 'Your WooCommerce REST API consumer secret (stored securely)',
            'required' => 0,
        ),
        array(
            'key' => 'field_belims_bobgo_section',
            'label' => 'BobGo Shipping API',
            'name' => 'bobgo_section',
            'type' => 'tab',
        ),
        array(
            'key' => 'field_belims_bobgo_enabled',
            'label' => 'Enable BobGo Integration',
            'name' => 'bobgo_enabled',
            'type' => 'true_false',
            'instructions' => 'Enable shipping integration with BobGo',
            'ui' => 1,
        ),
        array(
            'key' => 'field_belims_bobgo_environment',
            'label' => 'BobGo Environment',
            'name' => 'bobgo_environment',
            'type' => 'select',
            'instructions' => 'Select the BobGo environment (Sandbox for testing, Production for live)',
            'choices' => array(
                'sandbox' => 'Sandbox (Testing)',
                'production' => 'Production (Live)',
            ),
            'default_value' => 'sandbox',
            'allow_null' => 0,
            'multiple' => 0,
            'ui' => 1,
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_bobgo_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_bobgo_api_url',
            'label' => 'BobGo API URL',
            'name' => 'bobgo_api_url',
            'type' => 'url',
            'instructions' => 'The BobGo API endpoint',
            'placeholder' => 'https://api.bobgo.co.za/v2',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_bobgo_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_bobgo_api_key',
            'label' => 'BobGo API Key',
            'name' => 'bobgo_api_key',
            'type' => 'password',
            'instructions' => 'Your BobGo API key (stored securely)',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_bobgo_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_bobgo_channel_id',
            'label' => 'BobGo Channel ID',
            'name' => 'bobgo_channel_id',
            'type' => 'text',
            'instructions' => 'Your BobGo Channel ID',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_bobgo_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_ftg_section',
            'label' => 'Find The Gap API',
            'name' => 'ftg_section',
            'type' => 'tab',
        ),
        array(
            'key' => 'field_belims_ftg_enabled',
            'label' => 'Enable Find The Gap Integration',
            'name' => 'ftg_enabled',
            'type' => 'true_false',
            'instructions' => 'Enable product sync with Find The Gap',
            'ui' => 1,
        ),
        array(
            'key' => 'field_belims_ftg_email',
            'label' => 'FTG Account Email',
            'name' => 'ftg_email',
            'type' => 'email',
            'instructions' => 'Your Find The Gap account email',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_ftg_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_ftg_password',
            'label' => 'FTG Account Password',
            'name' => 'ftg_password',
            'type' => 'password',
            'instructions' => 'Your Find The Gap account password (stored securely)',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_ftg_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_ftg_collection_token',
            'label' => 'FTG Collection Token',
            'name' => 'ftg_collection_token',
            'type' => 'text',
            'instructions' => 'Your Find The Gap collection token (get from /instances endpoint after login)',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_ftg_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_payment_section',
            'label' => 'Payment Gateway',
            'name' => 'payment_section',
            'type' => 'tab',
        ),
        array(
            'key' => 'field_belims_payment_gateway',
            'label' => 'Payment Provider',
            'name' => 'payment_gateway',
            'type' => 'select',
            'choices' => array(
                'payfast' => 'PayFast',
                'yoco' => 'Yoco',
                'paystack' => 'Paystack',
                'stripe' => 'Stripe',
                'manual' => 'Manual/Bank Transfer',
            ),
            'instructions' => 'Select your preferred payment gateway',
            'default_value' => 'payfast',
            'allow_null' => 0,
        ),
        array(
            'key' => 'field_belims_payment_api_key',
            'label' => 'Payment Gateway API Key',
            'name' => 'payment_api_key',
            'type' => 'password',
            'instructions' => 'Your payment provider API key (stored securely)',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_payment_gateway',
                        'operator' => '!=',
                        'value' => 'manual',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_payment_secret',
            'label' => 'Payment Gateway Secret Key',
            'name' => 'payment_secret',
            'type' => 'password',
            'instructions' => 'Your payment provider secret key (stored securely)',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_payment_gateway',
                        'operator' => '!=',
                        'value' => 'manual',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_ai_section',
            'label' => 'AI Services',
            'name' => 'ai_section',
            'type' => 'tab',
        ),
        array(
            'key' => 'field_belims_gemini_enabled',
            'label' => 'Enable Google Gemini AI',
            'name' => 'gemini_enabled',
            'type' => 'true_false',
            'instructions' => 'Enable AI product descriptions and paint color matching',
            'ui' => 1,
        ),
        array(
            'key' => 'field_belims_gemini_api_key',
            'label' => 'Google Gemini API Key',
            'name' => 'gemini_api_key',
            'type' => 'password',
            'instructions' => 'Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>',
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_gemini_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
        array(
            'key' => 'field_belims_ai_feature_toggles',
            'label' => 'Active AI Features',
            'name' => 'ai_feature_toggles',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_belims_ai_paint_assistant',
                    'label' => 'Enable AI Paint Assistant',
                    'name' => 'ai_paint_assistant_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                    'ui' => 1,
                ),
                array(
                    'key' => 'field_belims_ai_delivery_optimizer',
                    'label' => 'Enable AI Delivery Optimizer',
                    'name' => 'ai_delivery_optimizer_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                    'ui' => 1,
                ),
                array(
                    'key' => 'field_belims_ai_price_matching',
                    'label' => 'Enable AI Price Matching',
                    'name' => 'ai_price_matching_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                    'ui' => 1,
                ),
            ),
            'conditional_logic' => array(
                array(
                    array(
                        'field' => 'field_belims_gemini_enabled',
                        'operator' => '==',
                        'value' => '1',
                    ),
                ),
            ),
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'belims-site-settings',
            ),
        ),
    ),
    'menu_order' => 6,
));

endif;