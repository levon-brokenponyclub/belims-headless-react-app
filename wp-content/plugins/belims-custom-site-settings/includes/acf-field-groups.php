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
                'value' => 'belims-site-settings-acf',
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
                'value' => 'belims-site-settings-acf',
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
                'value' => 'belims-site-settings-acf',
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
                'value' => 'belims-site-settings-acf',
            ),
        ),
    ),
    'menu_order' => 4,
));

// AI Features
acf_add_local_field_group(array(
    'key' => 'group_belims_ai_features',
    'title' => 'AI Features & Integrations',
    'fields' => array(
        array(
            'key' => 'field_belims_gemini_api_key',
            'label' => 'Google Gemini AI API Key',
            'name' => 'gemini_api_key',
            'type' => 'password',
            'instructions' => 'API key for AI-powered features (paint recommendations, etc.)',
        ),
        array(
            'key' => 'field_belims_ai_features',
            'label' => 'AI Features Settings',
            'name' => 'ai_features',
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
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'belims-site-settings-acf',
            ),
        ),
    ),
    'menu_order' => 5,
));

endif;