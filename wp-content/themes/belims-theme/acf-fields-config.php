<?php
/**
 * ACF Field Groups Configuration for Belims Site Settings
 * 
 * This file creates all the field groups and fields for the Site Settings options page
 * Run this once to register all fields, then you can manage them via the ACF admin
 */

if( function_exists('acf_add_local_field_group') ):

// Site Branding & Identity
acf_add_local_field_group(array(
    'key' => 'group_site_branding',
    'title' => 'Site Branding & Identity',
    'fields' => array(
        array(
            'key' => 'field_site_logo',
            'label' => 'Site Logo',
            'name' => 'site_logo',
            'type' => 'image',
            'instructions' => 'Upload your site logo (recommended: PNG with transparent background, max width 300px)',
            'required' => 0,
            'return_format' => 'array',
            'preview_size' => 'medium',
            'library' => 'all',
            'min_width' => '',
            'min_height' => '',
            'min_size' => '',
            'max_width' => 500,
            'max_height' => 200,
            'max_size' => '',
        ),
        array(
            'key' => 'field_site_favicon',
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
            'key' => 'field_site_tagline',
            'label' => 'Site Tagline',
            'name' => 'site_tagline',
            'type' => 'text',
            'instructions' => 'A short description of your business',
            'default_value' => 'Your one-stop hardware store',
        ),
        array(
            'key' => 'field_brand_colors',
            'label' => 'Brand Colors',
            'name' => 'brand_colors',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_primary_color',
                    'label' => 'Primary Brand Color',
                    'name' => 'primary_color',
                    'type' => 'color_picker',
                    'default_value' => '#1e40af',
                ),
                array(
                    'key' => 'field_secondary_color',
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
                'value' => 'site-settings',
            ),
        ),
    ),
    'menu_order' => 1,
    'position' => 'normal',
    'style' => 'default',
));

// Contact Information
acf_add_local_field_group(array(
    'key' => 'group_contact_info',
    'title' => 'Contact Information',
    'fields' => array(
        array(
            'key' => 'field_company_name',
            'label' => 'Company Name',
            'name' => 'company_name',
            'type' => 'text',
            'required' => 1,
            'default_value' => 'Belims Hardware',
        ),
        array(
            'key' => 'field_phone_number',
            'label' => 'Phone Number',
            'name' => 'phone_number',
            'type' => 'text',
            'instructions' => 'Main business phone number',
            'default_value' => '+27 11 123 4567',
        ),
        array(
            'key' => 'field_email_address',
            'label' => 'Email Address',
            'name' => 'email_address',
            'type' => 'email',
            'instructions' => 'Main business email address',
            'default_value' => 'info@belims.co.za',
        ),
        array(
            'key' => 'field_address',
            'label' => 'Physical Address',
            'name' => 'physical_address',
            'type' => 'textarea',
            'rows' => 3,
            'instructions' => 'Full business address',
            'default_value' => "123 Hardware Street\nJohannesburg, 2000\nSouth Africa",
        ),
        array(
            'key' => 'field_business_hours',
            'label' => 'Business Hours',
            'name' => 'business_hours',
            'type' => 'repeater',
            'instructions' => 'Set your opening hours for each day',
            'button_label' => 'Add Day',
            'max' => 7,
            'sub_fields' => array(
                array(
                    'key' => 'field_day_of_week',
                    'label' => 'Day',
                    'name' => 'day',
                    'type' => 'select',
                    'choices' => array(
                        'monday' => 'Monday',
                        'tuesday' => 'Tuesday',
                        'wednesday' => 'Wednesday',
                        'thursday' => 'Thursday',
                        'friday' => 'Friday',
                        'saturday' => 'Saturday',
                        'sunday' => 'Sunday',
                    ),
                ),
                array(
                    'key' => 'field_opening_time',
                    'label' => 'Opening Time',
                    'name' => 'opening_time',
                    'type' => 'time_picker',
                    'display_format' => 'H:i',
                    'return_format' => 'H:i',
                ),
                array(
                    'key' => 'field_closing_time',
                    'label' => 'Closing Time',
                    'name' => 'closing_time',
                    'type' => 'time_picker',
                    'display_format' => 'H:i',
                    'return_format' => 'H:i',
                ),
                array(
                    'key' => 'field_is_closed',
                    'label' => 'Closed Today',
                    'name' => 'is_closed',
                    'type' => 'true_false',
                    'message' => 'Check if closed on this day',
                ),
            ),
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'site-settings',
            ),
        ),
    ),
    'menu_order' => 2,
));

// E-commerce Settings
acf_add_local_field_group(array(
    'key' => 'group_ecommerce_settings',
    'title' => 'E-commerce Settings',
    'fields' => array(
        array(
            'key' => 'field_currency_symbol',
            'label' => 'Currency Symbol',
            'name' => 'currency_symbol',
            'type' => 'text',
            'instructions' => 'Currency symbol to display',
            'default_value' => 'R',
            'maxlength' => 5,
        ),
        array(
            'key' => 'field_free_shipping_threshold',
            'label' => 'Free Shipping Threshold',
            'name' => 'free_shipping_threshold',
            'type' => 'number',
            'instructions' => 'Minimum order amount for free shipping',
            'default_value' => 1000,
            'min' => 0,
        ),
        array(
            'key' => 'field_delivery_fee',
            'label' => 'Standard Delivery Fee',
            'name' => 'delivery_fee',
            'type' => 'number',
            'instructions' => 'Standard delivery fee for orders under threshold',
            'default_value' => 150,
            'min' => 0,
        ),
        array(
            'key' => 'field_express_delivery_fee',
            'label' => 'Express Delivery Fee',
            'name' => 'express_delivery_fee',
            'type' => 'number',
            'instructions' => 'Fee for express/same-day delivery',
            'default_value' => 300,
            'min' => 0,
        ),
        array(
            'key' => 'field_store_locations',
            'label' => 'Store Locations',
            'name' => 'store_locations',
            'type' => 'repeater',
            'instructions' => 'Add your store locations for pickup',
            'button_label' => 'Add Store',
            'sub_fields' => array(
                array(
                    'key' => 'field_store_name',
                    'label' => 'Store Name',
                    'name' => 'store_name',
                    'type' => 'text',
                    'required' => 1,
                ),
                array(
                    'key' => 'field_store_address',
                    'label' => 'Store Address',
                    'name' => 'store_address',
                    'type' => 'textarea',
                    'rows' => 3,
                    'required' => 1,
                ),
                array(
                    'key' => 'field_store_phone',
                    'label' => 'Store Phone',
                    'name' => 'store_phone',
                    'type' => 'text',
                ),
                array(
                    'key' => 'field_store_coordinates',
                    'label' => 'Map Coordinates',
                    'name' => 'store_coordinates',
                    'type' => 'group',
                    'sub_fields' => array(
                        array(
                            'key' => 'field_latitude',
                            'label' => 'Latitude',
                            'name' => 'latitude',
                            'type' => 'number',
                            'step' => 'any',
                        ),
                        array(
                            'key' => 'field_longitude',
                            'label' => 'Longitude',
                            'name' => 'longitude',
                            'type' => 'number',
                            'step' => 'any',
                        ),
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
                'value' => 'site-settings',
            ),
        ),
    ),
    'menu_order' => 3,
));

// Social Media & Marketing
acf_add_local_field_group(array(
    'key' => 'group_social_marketing',
    'title' => 'Social Media & Marketing',
    'fields' => array(
        array(
            'key' => 'field_social_media',
            'label' => 'Social Media Links',
            'name' => 'social_media',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_facebook_url',
                    'label' => 'Facebook URL',
                    'name' => 'facebook_url',
                    'type' => 'url',
                ),
                array(
                    'key' => 'field_instagram_url',
                    'label' => 'Instagram URL',
                    'name' => 'instagram_url',
                    'type' => 'url',
                ),
                array(
                    'key' => 'field_twitter_url',
                    'label' => 'Twitter/X URL',
                    'name' => 'twitter_url',
                    'type' => 'url',
                ),
                array(
                    'key' => 'field_linkedin_url',
                    'label' => 'LinkedIn URL',
                    'name' => 'linkedin_url',
                    'type' => 'url',
                ),
                array(
                    'key' => 'field_youtube_url',
                    'label' => 'YouTube URL',
                    'name' => 'youtube_url',
                    'type' => 'url',
                ),
            ),
        ),
        array(
            'key' => 'field_google_analytics',
            'label' => 'Google Analytics ID',
            'name' => 'google_analytics_id',
            'type' => 'text',
            'instructions' => 'Enter your GA4 Measurement ID (e.g., G-XXXXXXXXXX)',
        ),
        array(
            'key' => 'field_google_maps_api',
            'label' => 'Google Maps API Key',
            'name' => 'google_maps_api_key',
            'type' => 'text',
            'instructions' => 'API key for Google Maps integration',
        ),
        array(
            'key' => 'field_newsletter_signup',
            'label' => 'Newsletter Settings',
            'name' => 'newsletter_settings',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_newsletter_enabled',
                    'label' => 'Enable Newsletter Signup',
                    'name' => 'newsletter_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                ),
                array(
                    'key' => 'field_newsletter_title',
                    'label' => 'Newsletter Title',
                    'name' => 'newsletter_title',
                    'type' => 'text',
                    'default_value' => 'Stay Updated',
                ),
                array(
                    'key' => 'field_newsletter_description',
                    'label' => 'Newsletter Description',
                    'name' => 'newsletter_description',
                    'type' => 'textarea',
                    'rows' => 2,
                    'default_value' => 'Get the latest deals and product updates delivered to your inbox.',
                ),
            ),
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'site-settings',
            ),
        ),
    ),
    'menu_order' => 4,
));

// Notifications & Alerts
acf_add_local_field_group(array(
    'key' => 'group_notifications',
    'title' => 'Site Notifications & Alerts',
    'fields' => array(
        array(
            'key' => 'field_notification_bar',
            'label' => 'Notification Bar',
            'name' => 'notification_bar',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_notification_enabled',
                    'label' => 'Enable Notification Bar',
                    'name' => 'notification_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                ),
                array(
                    'key' => 'field_notification_message',
                    'label' => 'Notification Message',
                    'name' => 'notification_message',
                    'type' => 'textarea',
                    'rows' => 2,
                    'default_value' => 'Free shipping with R69 purchase. <a href="#">Shop Now →</a>',
                    'instructions' => 'HTML allowed for links and formatting',
                ),
                array(
                    'key' => 'field_notification_type',
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
                ),
                array(
                    'key' => 'field_notification_dismissible',
                    'label' => 'Allow Users to Dismiss',
                    'name' => 'notification_dismissible',
                    'type' => 'true_false',
                    'default_value' => 1,
                ),
            ),
        ),
        array(
            'key' => 'field_maintenance_mode',
            'label' => 'Maintenance Mode',
            'name' => 'maintenance_mode',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_maintenance_enabled',
                    'label' => 'Enable Maintenance Mode',
                    'name' => 'maintenance_enabled',
                    'type' => 'true_false',
                    'message' => 'Site will show maintenance message to non-admin users',
                ),
                array(
                    'key' => 'field_maintenance_message',
                    'label' => 'Maintenance Message',
                    'name' => 'maintenance_message',
                    'type' => 'textarea',
                    'rows' => 3,
                    'default_value' => 'We are currently performing scheduled maintenance. Please check back soon!',
                ),
            ),
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'site-settings',
            ),
        ),
    ),
    'menu_order' => 5,
));

// AI & Integration Settings
acf_add_local_field_group(array(
    'key' => 'group_ai_integrations',
    'title' => 'AI & Integration Settings',
    'fields' => array(
        array(
            'key' => 'field_gemini_api_key',
            'label' => 'Google Gemini AI API Key',
            'name' => 'gemini_api_key',
            'type' => 'password',
            'instructions' => 'API key for AI-powered features (paint recommendations, etc.)',
        ),
        array(
            'key' => 'field_weather_api_key',
            'label' => 'Weather API Key',
            'name' => 'weather_api_key',
            'type' => 'password',
            'instructions' => 'API key for weather-based delivery recommendations',
        ),
        array(
            'key' => 'field_ai_features',
            'label' => 'AI Features Settings',
            'name' => 'ai_features',
            'type' => 'group',
            'sub_fields' => array(
                array(
                    'key' => 'field_ai_paint_assistant',
                    'label' => 'Enable AI Paint Assistant',
                    'name' => 'ai_paint_assistant_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                ),
                array(
                    'key' => 'field_ai_delivery_optimizer',
                    'label' => 'Enable AI Delivery Optimizer',
                    'name' => 'ai_delivery_optimizer_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                ),
                array(
                    'key' => 'field_ai_price_matching',
                    'label' => 'Enable AI Price Matching',
                    'name' => 'ai_price_matching_enabled',
                    'type' => 'true_false',
                    'default_value' => 1,
                ),
            ),
        ),
    ),
    'location' => array(
        array(
            array(
                'param' => 'options_page',
                'operator' => '==',
                'value' => 'site-settings',
            ),
        ),
    ),
    'menu_order' => 6,
));

endif;