<?php
/**
 * Ecommerce Settings Admin Page
 * 
 * Manages ecommerce settings displayed on product pages
 * 
 * @package Global_Site_Settings
 */

if (!defined('ABSPATH')) exit;

class Ecommerce_Policies_Admin {
    
    /**
     * Initialize the class
     */
    public function __construct() {
        // Remove standalone admin menu - now integrated into Site Settings
        // add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('rest_api_init', array($this, 'register_rest_endpoint'));
    }
    
    /**
     * Add admin menu under Settings (DISABLED - now in Site Settings plugin)
     */
    public function add_admin_menu() {
        // Disabled - integrated into main Site Settings page
        /*
        add_options_page(
            'Ecommerce Settings',
            'Ecommerce',
            'manage_options',
            'ecommerce-policies',
            array($this, 'render_admin_page')
        );
        */
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('ecommerce_policies_group', 'ecommerce_return_policy');
        register_setting('ecommerce_policies_group', 'ecommerce_change_of_mind');
        register_setting('ecommerce_policies_group', 'ecommerce_warranty');
        register_setting('ecommerce_policies_group', 'ecommerce_shipping');
        register_setting('ecommerce_policies_group', 'ecommerce_store_locations');
        register_setting('ecommerce_policies_group', 'ecommerce_google_maps_api_key');
        register_setting('ecommerce_policies_group', 'ecommerce_expert_name');
        register_setting('ecommerce_policies_group', 'ecommerce_expert_title');
        register_setting('ecommerce_policies_group', 'ecommerce_expert_avatar_url');
        register_setting('ecommerce_policies_group', 'ecommerce_expert_video_chat_url');
        register_setting('ecommerce_policies_group', 'ecommerce_expert_chat_url');
        register_setting('ecommerce_policies_group', 'ecommerce_expert_email');
        register_setting('ecommerce_policies_group', 'ecommerce_expert_phone');
    }
    
    /**
     * Register REST API endpoint
     */
    public function register_rest_endpoint() {
        register_rest_route('belims/v1', '/ecommerce-policies', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_policies'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Get policies via REST API
     */
    public function get_policies() {
        return array(
            'return_policy' => get_option('ecommerce_return_policy', ''),
            'change_of_mind' => get_option('ecommerce_change_of_mind', ''),
            'warranty' => get_option('ecommerce_warranty', ''),
            'shipping' => get_option('ecommerce_shipping', ''),
            'store_locations' => get_option('ecommerce_store_locations', array()),
            'expert_contact' => array(
                'expert_name' => get_option('ecommerce_expert_name', ''),
                'expert_title' => get_option('ecommerce_expert_title', ''),
                'expert_avatar_url' => get_option('ecommerce_expert_avatar_url', ''),
                'expert_video_chat_url' => get_option('ecommerce_expert_video_chat_url', ''),
                'expert_chat_url' => get_option('ecommerce_expert_chat_url', ''),
                'expert_email' => get_option('ecommerce_expert_email', ''),
                'expert_phone' => get_option('ecommerce_expert_phone', ''),
            ),
        );
    }

    /**
     * Sanitize store locations payload
     */
    private function sanitize_store_locations($raw_locations) {
        if (!is_array($raw_locations)) {
            return array();
        }

        $clean_locations = array();

        foreach ($raw_locations as $store) {
            if (!is_array($store)) {
                continue;
            }

            $name = sanitize_text_field($store['name'] ?? '');
            $address = sanitize_textarea_field($store['address'] ?? '');
            $phone = sanitize_text_field($store['phone'] ?? '');
            $map_url = esc_url_raw($store['map_url'] ?? '');
            $latitude = sanitize_text_field($store['latitude'] ?? '');
            $longitude = sanitize_text_field($store['longitude'] ?? '');
            $mon_open = sanitize_text_field($store['mon_open'] ?? '');
            $mon_close = sanitize_text_field($store['mon_close'] ?? '');
            $mon_break_start = sanitize_text_field($store['mon_break_start'] ?? '');
            $mon_break_end = sanitize_text_field($store['mon_break_end'] ?? '');
            $mon_closed = !empty($store['mon_closed']);
            $mon_note = sanitize_text_field($store['mon_note'] ?? '');
            $tue_open = sanitize_text_field($store['tue_open'] ?? '');
            $tue_close = sanitize_text_field($store['tue_close'] ?? '');
            $tue_break_start = sanitize_text_field($store['tue_break_start'] ?? '');
            $tue_break_end = sanitize_text_field($store['tue_break_end'] ?? '');
            $tue_closed = !empty($store['tue_closed']);
            $tue_note = sanitize_text_field($store['tue_note'] ?? '');
            $wed_open = sanitize_text_field($store['wed_open'] ?? '');
            $wed_close = sanitize_text_field($store['wed_close'] ?? '');
            $wed_break_start = sanitize_text_field($store['wed_break_start'] ?? '');
            $wed_break_end = sanitize_text_field($store['wed_break_end'] ?? '');
            $wed_closed = !empty($store['wed_closed']);
            $wed_note = sanitize_text_field($store['wed_note'] ?? '');
            $thu_open = sanitize_text_field($store['thu_open'] ?? '');
            $thu_close = sanitize_text_field($store['thu_close'] ?? '');
            $thu_break_start = sanitize_text_field($store['thu_break_start'] ?? '');
            $thu_break_end = sanitize_text_field($store['thu_break_end'] ?? '');
            $thu_closed = !empty($store['thu_closed']);
            $thu_note = sanitize_text_field($store['thu_note'] ?? '');
            $fri_open = sanitize_text_field($store['fri_open'] ?? '');
            $fri_close = sanitize_text_field($store['fri_close'] ?? '');
            $fri_break_start = sanitize_text_field($store['fri_break_start'] ?? '');
            $fri_break_end = sanitize_text_field($store['fri_break_end'] ?? '');
            $fri_closed = !empty($store['fri_closed']);
            $fri_note = sanitize_text_field($store['fri_note'] ?? '');
            $sat_open = sanitize_text_field($store['sat_open'] ?? '');
            $sat_close = sanitize_text_field($store['sat_close'] ?? '');
            $sat_break_start = sanitize_text_field($store['sat_break_start'] ?? '');
            $sat_break_end = sanitize_text_field($store['sat_break_end'] ?? '');
            $sat_closed = !empty($store['sat_closed']);
            $sat_note = sanitize_text_field($store['sat_note'] ?? '');
            $sun_open = sanitize_text_field($store['sun_open'] ?? '');
            $sun_close = sanitize_text_field($store['sun_close'] ?? '');
            $sun_break_start = sanitize_text_field($store['sun_break_start'] ?? '');
            $sun_break_end = sanitize_text_field($store['sun_break_end'] ?? '');
            $sun_closed = !empty($store['sun_closed']);
            $sun_note = sanitize_text_field($store['sun_note'] ?? '');

            if (
                $name === '' &&
                $address === '' &&
                $phone === '' &&
                $map_url === '' &&
                $latitude === '' &&
                $longitude === '' &&
                $mon_open === '' &&
                $mon_close === '' &&
                $mon_break_start === '' &&
                $mon_break_end === '' &&
                !$mon_closed &&
                $mon_note === '' &&
                $tue_open === '' &&
                $tue_close === '' &&
                $tue_break_start === '' &&
                $tue_break_end === '' &&
                !$tue_closed &&
                $tue_note === '' &&
                $wed_open === '' &&
                $wed_close === '' &&
                $wed_break_start === '' &&
                $wed_break_end === '' &&
                !$wed_closed &&
                $wed_note === '' &&
                $thu_open === '' &&
                $thu_close === '' &&
                $thu_break_start === '' &&
                $thu_break_end === '' &&
                !$thu_closed &&
                $thu_note === '' &&
                $fri_open === '' &&
                $fri_close === '' &&
                $fri_break_start === '' &&
                $fri_break_end === '' &&
                !$fri_closed &&
                $fri_note === '' &&
                $sat_open === '' &&
                $sat_close === '' &&
                $sat_break_start === '' &&
                $sat_break_end === '' &&
                !$sat_closed &&
                $sat_note === '' &&
                $sun_open === '' &&
                $sun_close === '' &&
                $sun_break_start === '' &&
                $sun_break_end === '' &&
                !$sun_closed &&
                $sun_note === ''
            ) {
                continue;
            }

            $clean_locations[] = array(
                'name' => $name,
                'address' => $address,
                'phone' => $phone,
                'map_url' => $map_url,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'mon_open' => $mon_open,
                'mon_close' => $mon_close,
                'mon_break_start' => $mon_break_start,
                'mon_break_end' => $mon_break_end,
                'mon_closed' => $mon_closed,
                'mon_note' => $mon_note,
                'tue_open' => $tue_open,
                'tue_close' => $tue_close,
                'tue_break_start' => $tue_break_start,
                'tue_break_end' => $tue_break_end,
                'tue_closed' => $tue_closed,
                'tue_note' => $tue_note,
                'wed_open' => $wed_open,
                'wed_close' => $wed_close,
                'wed_break_start' => $wed_break_start,
                'wed_break_end' => $wed_break_end,
                'wed_closed' => $wed_closed,
                'wed_note' => $wed_note,
                'thu_open' => $thu_open,
                'thu_close' => $thu_close,
                'thu_break_start' => $thu_break_start,
                'thu_break_end' => $thu_break_end,
                'thu_closed' => $thu_closed,
                'thu_note' => $thu_note,
                'fri_open' => $fri_open,
                'fri_close' => $fri_close,
                'fri_break_start' => $fri_break_start,
                'fri_break_end' => $fri_break_end,
                'fri_closed' => $fri_closed,
                'fri_note' => $fri_note,
                'sat_open' => $sat_open,
                'sat_close' => $sat_close,
                'sat_break_start' => $sat_break_start,
                'sat_break_end' => $sat_break_end,
                'sat_closed' => $sat_closed,
                'sat_note' => $sat_note,
                'sun_open' => $sun_open,
                'sun_close' => $sun_close,
                'sun_break_start' => $sun_break_start,
                'sun_break_end' => $sun_break_end,
                'sun_closed' => $sun_closed,
                'sun_note' => $sun_note,
            );
        }

        return array_values($clean_locations);
    }
    
    /**
     * Render admin page
     */
    public function render_admin_page() {
        // Check user permissions
        if (!current_user_can('manage_options')) {
            return;
        }

        if (function_exists('wp_enqueue_media')) {
            wp_enqueue_media();
        }
        
        // Save settings if form submitted
        if (isset($_POST['ecommerce_policies_submit'])) {
            check_admin_referer('ecommerce_policies_nonce');
            
            update_option('ecommerce_return_policy', wp_kses_post($_POST['return_policy']));
            update_option('ecommerce_change_of_mind', wp_kses_post($_POST['change_of_mind']));
            update_option('ecommerce_warranty', wp_kses_post($_POST['warranty']));
            update_option('ecommerce_shipping', wp_kses_post($_POST['shipping']));
            $raw_locations = isset($_POST['store_locations']) ? wp_unslash($_POST['store_locations']) : array();
            update_option('ecommerce_store_locations', $this->sanitize_store_locations($raw_locations));
            update_option('ecommerce_google_maps_api_key', sanitize_text_field($_POST['ecommerce_google_maps_api_key'] ?? ''));
            update_option('ecommerce_expert_name', sanitize_text_field($_POST['expert_name']));
            update_option('ecommerce_expert_title', sanitize_text_field($_POST['expert_title']));
            update_option('ecommerce_expert_avatar_url', esc_url_raw($_POST['expert_avatar_url']));
            update_option('ecommerce_expert_video_chat_url', esc_url_raw($_POST['expert_video_chat_url']));
            update_option('ecommerce_expert_chat_url', esc_url_raw($_POST['expert_chat_url']));
            update_option('ecommerce_expert_email', sanitize_email($_POST['expert_email']));
            update_option('ecommerce_expert_phone', sanitize_text_field($_POST['expert_phone']));
            
            echo '<div class="notice notice-success is-dismissible"><p>Policies saved successfully!</p></div>';
        }
        
        // Get current values
        $return_policy = get_option('ecommerce_return_policy', '');
        $change_of_mind = get_option('ecommerce_change_of_mind', '');
        $warranty = get_option('ecommerce_warranty', '');
        $shipping = get_option('ecommerce_shipping', '');
        $store_locations = get_option('ecommerce_store_locations', array());
        $maps_api_key = get_option('ecommerce_google_maps_api_key', '');
        $expert_name = get_option('ecommerce_expert_name', '');
        $expert_title = get_option('ecommerce_expert_title', '');
        $expert_avatar_url = get_option('ecommerce_expert_avatar_url', '');
        $expert_video_chat_url = get_option('ecommerce_expert_video_chat_url', '');
        $expert_chat_url = get_option('ecommerce_expert_chat_url', '');
        $expert_email = get_option('ecommerce_expert_email', '');
        $expert_phone = get_option('ecommerce_expert_phone', '');
        if (!is_array($store_locations)) {
            $store_locations = array();
        }
        $store_locations = array_values($store_locations);
        if (count($store_locations) === 0) {
            $store_locations[] = array(
                'name' => '',
                'address' => '',
                'phone' => '',
                'map_url' => '',
                'latitude' => '',
                'longitude' => '',
                'mon_open' => '07:45',
                'mon_close' => '17:00',
                'mon_break_start' => '13:00',
                'mon_break_end' => '13:45',
                'mon_closed' => false,
                'mon_note' => '',
                'tue_open' => '07:45',
                'tue_close' => '17:00',
                'tue_break_start' => '13:00',
                'tue_break_end' => '13:45',
                'tue_closed' => false,
                'tue_note' => '',
                'wed_open' => '07:45',
                'wed_close' => '17:00',
                'wed_break_start' => '13:00',
                'wed_break_end' => '13:45',
                'wed_closed' => false,
                'wed_note' => '',
                'thu_open' => '07:45',
                'thu_close' => '17:00',
                'thu_break_start' => '13:00',
                'thu_break_end' => '13:45',
                'thu_closed' => false,
                'thu_note' => '',
                'fri_open' => '07:45',
                'fri_close' => '17:00',
                'fri_break_start' => '12:00',
                'fri_break_end' => '13:45',
                'fri_closed' => false,
                'fri_note' => '',
                'sat_open' => '07:45',
                'sat_close' => '14:00',
                'sat_break_start' => '',
                'sat_break_end' => '',
                'sat_closed' => false,
                'sat_note' => '',
                'sun_open' => '',
                'sun_close' => '',
                'sun_break_start' => '',
                'sun_break_end' => '',
                'sun_closed' => true,
                'sun_note' => 'Closed',
            );
        }
        
        ?>
        <div class="wrap">
            <h1><?php echo esc_html('Ecommerce Settings'); ?></h1>
            <p class="description">Manage ecommerce policies displayed on product pages. These will appear in the accordion sections on single product pages.</p>
            
            <form method="post" action="">
                <?php wp_nonce_field('ecommerce_policies_nonce'); ?>
                
                <div style="max-width: 900px; margin-top: 30px;">

                    <!-- Store Details -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🏬</span> Store Details
                        </h2>
                        <p class="description">Add store locations used for pickup and store information on product pages. Use daily hours or add a custom note (e.g. Closed).</p>
                        <div style="margin: 12px 0 18px;">
                            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Google Maps API Key</label>
                            <input type="text" name="ecommerce_google_maps_api_key" value="<?php echo esc_attr($maps_api_key); ?>" class="regular-text" style="width: 100%;" />
                            <p class="description" style="margin-top: 6px;">Used for address autocomplete in Store Details.</p>
                        </div>
                        <style>
                            .store-location-row input[type="time"] {
                                max-width: 110px;
                            }
                            .store-location-row input[name*="_note"] {
                                max-width: 180px;
                            }
                        </style>

                        <div id="store_locations_rows" data-next-index="<?php echo esc_attr(count($store_locations)); ?>">
                            <?php foreach ($store_locations as $index => $store) : ?>
                                <div class="store-location-row" style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin: 12px 0; background: #fff;">
                                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                        <div style="flex: 1 1 220px;">
                                            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Store Name</label>
                                            <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][name]" value="<?php echo esc_attr($store['name'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                        </div>
                                        <div style="flex: 1 1 180px;">
                                            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Phone</label>
                                            <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][phone]" value="<?php echo esc_attr($store['phone'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                        </div>
                                        <div style="flex: 1 1 220px;">
                                            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Map URL</label>
                                            <input type="url" name="store_locations[<?php echo esc_attr($index); ?>][map_url]" value="<?php echo esc_url($store['map_url'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                        </div>
                                    </div>
                                    <div style="margin-top: 12px;">
                                        <label style="display: block; font-weight: 600; margin-bottom: 6px;">Address</label>
                                        <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][address]" value="<?php echo esc_attr($store['address'] ?? ''); ?>" class="regular-text store-address-input" style="width: 100%;" autocomplete="off" />
                                    </div>

                                    <div style="margin-top: 12px;">
                                        <table class="widefat striped" style="margin-top: 8px;">
                                            <thead>
                                                <tr>
                                                    <th style="width: 140px;">Day</th>
                                                    <th style="width: 160px;">Opening</th>
                                                    <th style="width: 160px;">Closing</th>
                                                    <th style="width: 160px;">Lunch Start</th>
                                                    <th style="width: 160px;">Lunch End</th>
                                                    <th style="width: 90px;">Closed</th>
                                                    <th>Custom Note</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td><strong>Monday</strong></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_open]" value="<?php echo esc_attr($store['mon_open'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_close]" value="<?php echo esc_attr($store['mon_close'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_break_start]" value="<?php echo esc_attr($store['mon_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_break_end]" value="<?php echo esc_attr($store['mon_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][mon_closed]" value="1" <?php echo checked(!empty($store['mon_closed']), true, false); ?> /></td>
                                                    <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][mon_note]" value="<?php echo esc_attr($store['mon_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Tuesday</strong></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_open]" value="<?php echo esc_attr($store['tue_open'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_close]" value="<?php echo esc_attr($store['tue_close'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_break_start]" value="<?php echo esc_attr($store['tue_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_break_end]" value="<?php echo esc_attr($store['tue_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][tue_closed]" value="1" <?php echo checked(!empty($store['tue_closed']), true, false); ?> /></td>
                                                    <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][tue_note]" value="<?php echo esc_attr($store['tue_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Wednesday</strong></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_open]" value="<?php echo esc_attr($store['wed_open'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_close]" value="<?php echo esc_attr($store['wed_close'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_break_start]" value="<?php echo esc_attr($store['wed_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_break_end]" value="<?php echo esc_attr($store['wed_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][wed_closed]" value="1" <?php echo checked(!empty($store['wed_closed']), true, false); ?> /></td>
                                                    <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][wed_note]" value="<?php echo esc_attr($store['wed_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Thursday</strong></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_open]" value="<?php echo esc_attr($store['thu_open'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_close]" value="<?php echo esc_attr($store['thu_close'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_break_start]" value="<?php echo esc_attr($store['thu_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_break_end]" value="<?php echo esc_attr($store['thu_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][thu_closed]" value="1" <?php echo checked(!empty($store['thu_closed']), true, false); ?> /></td>
                                                    <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][thu_note]" value="<?php echo esc_attr($store['thu_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Friday</strong></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_open]" value="<?php echo esc_attr($store['fri_open'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_close]" value="<?php echo esc_attr($store['fri_close'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_break_start]" value="<?php echo esc_attr($store['fri_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_break_end]" value="<?php echo esc_attr($store['fri_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][fri_closed]" value="1" <?php echo checked(!empty($store['fri_closed']), true, false); ?> /></td>
                                                    <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][fri_note]" value="<?php echo esc_attr($store['fri_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Saturday</strong></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_open]" value="<?php echo esc_attr($store['sat_open'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_close]" value="<?php echo esc_attr($store['sat_close'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_break_start]" value="<?php echo esc_attr($store['sat_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_break_end]" value="<?php echo esc_attr($store['sat_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][sat_closed]" value="1" <?php echo checked(!empty($store['sat_closed']), true, false); ?> /></td>
                                                    <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][sat_note]" value="<?php echo esc_attr($store['sat_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                                </tr>
                                                <tr>
                                                    <td><strong>Sunday</strong></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_open]" value="<?php echo esc_attr($store['sun_open'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_close]" value="<?php echo esc_attr($store['sun_close'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_break_start]" value="<?php echo esc_attr($store['sun_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_break_end]" value="<?php echo esc_attr($store['sun_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                    <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][sun_closed]" value="1" <?php echo checked(!empty($store['sun_closed']), true, false); ?> /></td>
                                                    <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][sun_note]" value="<?php echo esc_attr($store['sun_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div style="margin-top: 12px; text-align: right;">
                                        <button type="button" class="button remove-store-location">Remove</button>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>

                        <div style="margin-top: 12px;">
                            <button type="button" class="button" id="add_store_location">Add Store</button>
                        </div>
                    </div>
                    
                    <!-- 15-Days Return Policy -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">📦</span> 15-Days Return Policy
                        </h2>
                        <p class="description">Describe your 15-day return policy including conditions and process.</p>
                        <?php
                        wp_editor(
                            $return_policy,
                            'return_policy',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>
                    
                    <!-- Change of Mind Return -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🔄</span> Change of Mind Return
                        </h2>
                        <p class="description">Explain your change of mind return policy and any applicable fees.</p>
                        <?php
                        wp_editor(
                            $change_of_mind,
                            'change_of_mind',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>
                    
                    <!-- Warranty -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🛡️</span> Warranty
                        </h2>
                        <p class="description">Detail your warranty coverage, duration, and claim process.</p>
                        <?php
                        wp_editor(
                            $warranty,
                            'warranty',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>
                    
                    <!-- Delivery and Shipping -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🚚</span> Delivery and Shipping
                        </h2>
                        <p class="description">Outline delivery times, shipping costs, and tracking information.</p>
                        <?php
                        wp_editor(
                            $shipping,
                            'shipping',
                            array(
                                'textarea_rows' => 6,
                                'media_buttons' => false,
                                'teeny' => true,
                                'quicktags' => true,
                            )
                        );
                        ?>
                    </div>

                    <!-- Expert Contact Block -->
                    <div style="background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">
                            <span style="color: #2271b1;">🧑‍💼</span> Ask an Expert Block
                        </h2>
                        <p class="description">Configure the expert avatar, name, and contact links shown on product pages.</p>

                        <table class="form-table" role="presentation">
                            <tbody>
                                <tr>
                                    <th scope="row"><label for="expert_name">Expert Name</label></th>
                                    <td><input type="text" id="expert_name" name="expert_name" value="<?php echo esc_attr($expert_name); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="expert_title">Expert Title</label></th>
                                    <td><input type="text" id="expert_title" name="expert_title" value="<?php echo esc_attr($expert_title); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="expert_avatar_url">Expert Avatar</label></th>
                                    <td>
                                        <input type="hidden" id="expert_avatar_url" name="expert_avatar_url" value="<?php echo esc_url($expert_avatar_url); ?>" />
                                        <div id="expert_avatar_preview" style="margin-bottom: 10px;">
                                            <?php if (!empty($expert_avatar_url)) : ?>
                                                <img src="<?php echo esc_url($expert_avatar_url); ?>" alt="Expert Avatar" style="width: 64px; height: 64px; border-radius: 999px; object-fit: cover;" />
                                            <?php endif; ?>
                                        </div>
                                        <button type="button" class="button" id="expert_avatar_upload">Upload Avatar</button>
                                        <button type="button" class="button" id="expert_avatar_remove" <?php echo empty($expert_avatar_url) ? 'style="display:none;"' : ''; ?>>Remove</button>
                                        <p class="description">Upload an expert avatar (recommended square image).</p>
                                    </td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="expert_video_chat_url">Video Chat URL</label></th>
                                    <td><input type="url" id="expert_video_chat_url" name="expert_video_chat_url" value="<?php echo esc_url($expert_video_chat_url); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="expert_chat_url">Chat URL</label></th>
                                    <td><input type="url" id="expert_chat_url" name="expert_chat_url" value="<?php echo esc_url($expert_chat_url); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="expert_email">Expert Email</label></th>
                                    <td><input type="email" id="expert_email" name="expert_email" value="<?php echo esc_attr($expert_email); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th scope="row"><label for="expert_phone">Expert Phone</label></th>
                                    <td><input type="text" id="expert_phone" name="expert_phone" value="<?php echo esc_attr($expert_phone); ?>" class="regular-text" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <?php submit_button('Save Settings', 'primary', 'ecommerce_policies_submit'); ?>
                    
                </div>
            </form>

            <script>
            jQuery(function($) {
                var frame;
                var storeRows = $('#store_locations_rows');
                var nextIndex = parseInt(storeRows.data('next-index'), 10) || storeRows.children().length;
                var addressInputs = new WeakMap();

                function initAddressAutocomplete(input) {
                    if (!window.google || !google.maps || !google.maps.places) {
                        return;
                    }

                    if (addressInputs.has(input)) {
                        return;
                    }

                    addressInputs.set(input, new google.maps.places.Autocomplete(input, {
                        types: ['geocode'],
                    }));
                }

                function initAllAddressAutocomplete() {
                    $('.store-address-input').each(function() {
                        initAddressAutocomplete(this);
                    });
                }

                window._gssInitMaps = initAllAddressAutocomplete;
                if (window._gssMapsReady) {
                    initAllAddressAutocomplete();
                }
                var addressInputs = new WeakMap();

                function initAddressAutocomplete(input) {
                    if (!window.google || !google.maps || !google.maps.places) {
                        return;
                    }

                    if (addressInputs.has(input)) {
                        return;
                    }

                    addressInputs.set(input, new google.maps.places.Autocomplete(input, {
                        types: ['geocode'],
                    }));
                }

                function initAllAddressAutocomplete() {
                    $('.store-address-input').each(function() {
                        initAddressAutocomplete(this);
                    });
                }

                window._gssInitMaps = initAllAddressAutocomplete;
                if (window._gssMapsReady) {
                    initAllAddressAutocomplete();
                }

                $('#add_store_location').on('click', function(e) {
                    e.preventDefault();

                    var row = '' +
                        '<div class="store-location-row" style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin: 12px 0; background: #fff;">' +
                        '<div style="display: flex; flex-wrap: wrap; gap: 12px;">' +
                        '<div style="flex: 1 1 220px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Store Name</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][name]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '<div style="flex: 1 1 180px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Phone</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][phone]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '<div style="flex: 1 1 220px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Map URL</label>' +
                        '<input type="url" name="store_locations[' + nextIndex + '][map_url]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '</div>' +
                        '<div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px;">' +
                        '<div style="flex: 1 1 160px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Latitude</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][latitude]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '<div style="flex: 1 1 160px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Longitude</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][longitude]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '</div>' +
                        '<div style="margin-top: 12px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Address</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][address]" value="" class="regular-text store-address-input" style="width: 100%;" autocomplete="off" />' +
                        '</div>' +
                        '<div style="margin-top: 12px;">' +
                        '<table class="widefat striped" style="margin-top: 8px;">' +
                        '<thead>' +
                        '<tr>' +
                        '<th style="width: 140px;">Day</th>' +
                        '<th style="width: 160px;">Opening</th>' +
                        '<th style="width: 160px;">Closing</th>' +
                        '<th style="width: 160px;">Lunch Start</th>' +
                        '<th style="width: 160px;">Lunch End</th>' +
                        '<th style="width: 90px;">Closed</th>' +
                        '<th>Custom Note</th>' +
                        '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                        '<tr>' +
                        '<td><strong>Monday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][mon_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][mon_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Tuesday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][tue_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][tue_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Wednesday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][wed_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][wed_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Thursday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][thu_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][thu_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Friday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_break_start]" value="12:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][fri_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][fri_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Saturday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_close]" value="14:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_break_start]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_break_end]" value="" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][sat_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][sat_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Sunday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_open]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_close]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_break_start]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_break_end]" value="" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][sun_closed]" value="1" checked="checked" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][sun_note]" value="Closed" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '</tbody>' +
                        '</table>' +
                        '</div>' +
                        '<div style="margin-top: 12px; text-align: right;">' +
                        '<button type="button" class="button remove-store-location">Remove</button>' +
                        '</div>' +
                        '</div>';

                    storeRows.append(row);
                    nextIndex += 1;
                    initAllAddressAutocomplete();
                });

                $(document).on('click', '.remove-store-location', function(e) {
                    e.preventDefault();
                    $(this).closest('.store-location-row').remove();

                $(document).on('change', '.store-closed-toggle', function() {
                    var row = $(this).closest('tr');
                    if ($(this).is(':checked')) {
                        row.find('input[type="time"]').val('');
                        var noteInput = row.find('input[name*="_note"]');
                        if (noteInput.val().trim() === '') {
                            noteInput.val('Closed');
                        }
                    }
                });
                });

                $('#expert_avatar_upload').on('click', function(e) {
                    e.preventDefault();

                    if (frame) {
                        frame.open();
                        return;
                    }

                    frame = wp.media({
                        title: 'Select Expert Avatar',
                        button: { text: 'Use this image' },
                        multiple: false
                    });

                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        $('#expert_avatar_url').val(attachment.url);
                        $('#expert_avatar_preview').html(
                            '<img src="' + attachment.url + '" alt="Expert Avatar" style="width: 64px; height: 64px; border-radius: 999px; object-fit: cover;" />'
                        );
                        $('#expert_avatar_remove').show();
                    });

                    frame.open();
                });

                $('#expert_avatar_remove').on('click', function(e) {
                    e.preventDefault();
                    $('#expert_avatar_url').val('');
                    $('#expert_avatar_preview').empty();
                    $('#expert_avatar_remove').hide();
                });
            });
            </script>
            
            <!-- API Info -->
            <div style="max-width: 900px; margin-top: 40px; padding: 20px; background: #f0f6fc; border-left: 4px solid #2271b1; border-radius: 4px;">
                <h3 style="margin-top: 0;">📡 REST API Endpoint</h3>
                <p>These policies are available via the REST API:</p>
                <code style="background: #fff; padding: 8px 12px; border-radius: 4px; display: inline-block; margin: 10px 0;">
                    GET <?php echo rest_url('belims/v1/ecommerce-policies'); ?>
                </code>
                <p class="description">The frontend automatically fetches and displays these policies on product pages.</p>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render inline content for Site Settings plugin integration
     */
    public function render_inline_content() {
        // Check user permissions
        if (!current_user_can('manage_options')) {
            return;
        }

        if (function_exists('wp_enqueue_media')) {
            wp_enqueue_media();
        }
        
        // Save settings if form submitted
        if (isset($_POST['ecommerce_policies_submit'])) {
            check_admin_referer('ecommerce_policies_nonce');
            
            update_option('ecommerce_return_policy', wp_kses_post($_POST['return_policy']));
            update_option('ecommerce_change_of_mind', wp_kses_post($_POST['change_of_mind']));
            update_option('ecommerce_warranty', wp_kses_post($_POST['warranty']));
            update_option('ecommerce_shipping', wp_kses_post($_POST['shipping']));
            $raw_locations = isset($_POST['store_locations']) ? wp_unslash($_POST['store_locations']) : array();
            update_option('ecommerce_store_locations', $this->sanitize_store_locations($raw_locations));
            update_option('ecommerce_google_maps_api_key', sanitize_text_field($_POST['ecommerce_google_maps_api_key'] ?? ''));
            update_option('ecommerce_expert_name', sanitize_text_field($_POST['expert_name']));
            update_option('ecommerce_expert_title', sanitize_text_field($_POST['expert_title']));
            update_option('ecommerce_expert_avatar_url', esc_url_raw($_POST['expert_avatar_url']));
            update_option('ecommerce_expert_video_chat_url', esc_url_raw($_POST['expert_video_chat_url']));
            update_option('ecommerce_expert_chat_url', esc_url_raw($_POST['expert_chat_url']));
            update_option('ecommerce_expert_email', sanitize_email($_POST['expert_email']));
            update_option('ecommerce_expert_phone', sanitize_text_field($_POST['expert_phone']));
            
            echo '<div class="notice notice-success is-dismissible"><p>Policies saved successfully!</p></div>';
        }
        
        // Get current values
        $return_policy = get_option('ecommerce_return_policy', '');
        $change_of_mind = get_option('ecommerce_change_of_mind', '');
        $warranty = get_option('ecommerce_warranty', '');
        $shipping = get_option('ecommerce_shipping', '');
        $store_locations = get_option('ecommerce_store_locations', array());
        $maps_api_key = get_option('ecommerce_google_maps_api_key', '');
        $expert_name = get_option('ecommerce_expert_name', '');
        $expert_title = get_option('ecommerce_expert_title', '');
        $expert_avatar_url = get_option('ecommerce_expert_avatar_url', '');
        $expert_video_chat_url = get_option('ecommerce_expert_video_chat_url', '');
        $expert_chat_url = get_option('ecommerce_expert_chat_url', '');
        $expert_email = get_option('ecommerce_expert_email', '');
        $expert_phone = get_option('ecommerce_expert_phone', '');
        if (!is_array($store_locations)) {
            $store_locations = array();
        }
        $store_locations = array_values($store_locations);
        if (count($store_locations) === 0) {
            $store_locations[] = array(
                'name' => '',
                'address' => '',
                'phone' => '',
                'map_url' => '',
                'latitude' => '',
                'longitude' => '',
                'mon_open' => '07:45',
                'mon_close' => '17:00',
                'mon_break_start' => '13:00',
                'mon_break_end' => '13:45',
                'mon_closed' => false,
                'mon_note' => '',
                'tue_open' => '07:45',
                'tue_close' => '17:00',
                'tue_break_start' => '13:00',
                'tue_break_end' => '13:45',
                'tue_closed' => false,
                'tue_note' => '',
                'wed_open' => '07:45',
                'wed_close' => '17:00',
                'wed_break_start' => '13:00',
                'wed_break_end' => '13:45',
                'wed_closed' => false,
                'wed_note' => '',
                'thu_open' => '07:45',
                'thu_close' => '17:00',
                'thu_break_start' => '13:00',
                'thu_break_end' => '13:45',
                'thu_closed' => false,
                'thu_note' => '',
                'fri_open' => '07:45',
                'fri_close' => '17:00',
                'fri_break_start' => '12:00',
                'fri_break_end' => '13:45',
                'fri_closed' => false,
                'fri_note' => '',
                'sat_open' => '07:45',
                'sat_close' => '14:00',
                'sat_break_start' => '',
                'sat_break_end' => '',
                'sat_closed' => false,
                'sat_note' => '',
                'sun_open' => '',
                'sun_close' => '',
                'sun_break_start' => '',
                'sun_break_end' => '',
                'sun_closed' => true,
                'sun_note' => 'Closed',
            );
        }
        
        ?>
        <div class="bpc-card-header">
                <h2 class="bpc-card-title">Ecommerce Settings</h2>
                <p class="bpc-card-description">Manage ecommerce policies displayed on product pages. These will appear in the accordion sections on single product pages.</p>
            </div>
            
            <form method="post" action="">
                <?php wp_nonce_field('ecommerce_policies_nonce'); ?>

                <!-- Store Details -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🏬</span> Store Details
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Add store locations used for pickup and store information on product pages. Use daily hours or add a custom note (e.g. Closed).</p>
                    <div style="margin: 12px 0 18px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 6px;">Google Maps API Key</label>
                        <input type="text" name="ecommerce_google_maps_api_key" value="<?php echo esc_attr($maps_api_key); ?>" class="regular-text" style="width: 100%;" />
                        <p class="description" style="margin-top: 6px;">Used for address autocomplete in Store Details.</p>
                    </div>
                    <style>
                        .store-location-row input[type="time"] {
                            max-width: 110px;
                        }
                        .store-location-row input[name*="_note"] {
                            max-width: 180px;
                        }
                    </style>

                    <div id="store_locations_rows" data-next-index="<?php echo esc_attr(count($store_locations)); ?>">
                        <?php foreach ($store_locations as $index => $store) : ?>
                            <div class="store-location-row" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 12px 0; background: #fff;">
                                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                    <div style="flex: 1 1 220px;">
                                        <label style="display: block; font-weight: 600; margin-bottom: 6px;">Store Name</label>
                                        <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][name]" value="<?php echo esc_attr($store['name'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                    </div>
                                    <div style="flex: 1 1 180px;">
                                        <label style="display: block; font-weight: 600; margin-bottom: 6px;">Phone</label>
                                        <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][phone]" value="<?php echo esc_attr($store['phone'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                    </div>
                                    <div style="flex: 1 1 220px;">
                                        <label style="display: block; font-weight: 600; margin-bottom: 6px;">Map URL</label>
                                        <input type="url" name="store_locations[<?php echo esc_attr($index); ?>][map_url]" value="<?php echo esc_url($store['map_url'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                    </div>
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px;">
                                    <div style="flex: 1 1 160px;">
                                        <label style="display: block; font-weight: 600; margin-bottom: 6px;">Latitude</label>
                                        <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][latitude]" value="<?php echo esc_attr($store['latitude'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                    </div>
                                    <div style="flex: 1 1 160px;">
                                        <label style="display: block; font-weight: 600; margin-bottom: 6px;">Longitude</label>
                                        <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][longitude]" value="<?php echo esc_attr($store['longitude'] ?? ''); ?>" class="regular-text" style="width: 100%;" />
                                    </div>
                                </div>
                                <div style="margin-top: 12px;">
                                    <label style="display: block; font-weight: 600; margin-bottom: 6px;">Address</label>
                                    <input type="text" name="store_locations[<?php echo esc_attr($index); ?>][address]" value="<?php echo esc_attr($store['address'] ?? ''); ?>" class="regular-text store-address-input" style="width: 100%;" autocomplete="off" />
                                </div>

                                <div style="margin-top: 12px;">
                                    <table class="widefat striped" style="margin-top: 8px;">
                                        <thead>
                                            <tr>
                                                <th style="width: 140px;">Day</th>
                                                <th style="width: 160px;">Opening</th>
                                                <th style="width: 160px;">Closing</th>
                                                <th style="width: 160px;">Lunch Start</th>
                                                <th style="width: 160px;">Lunch End</th>
                                                <th style="width: 90px;">Closed</th>
                                                <th>Custom Note</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td><strong>Monday</strong></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_open]" value="<?php echo esc_attr($store['mon_open'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_close]" value="<?php echo esc_attr($store['mon_close'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_break_start]" value="<?php echo esc_attr($store['mon_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][mon_break_end]" value="<?php echo esc_attr($store['mon_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][mon_closed]" value="1" <?php echo checked(!empty($store['mon_closed']), true, false); ?> /></td>
                                                <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][mon_note]" value="<?php echo esc_attr($store['mon_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Tuesday</strong></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_open]" value="<?php echo esc_attr($store['tue_open'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_close]" value="<?php echo esc_attr($store['tue_close'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_break_start]" value="<?php echo esc_attr($store['tue_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][tue_break_end]" value="<?php echo esc_attr($store['tue_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][tue_closed]" value="1" <?php echo checked(!empty($store['tue_closed']), true, false); ?> /></td>
                                                <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][tue_note]" value="<?php echo esc_attr($store['tue_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Wednesday</strong></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_open]" value="<?php echo esc_attr($store['wed_open'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_close]" value="<?php echo esc_attr($store['wed_close'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_break_start]" value="<?php echo esc_attr($store['wed_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][wed_break_end]" value="<?php echo esc_attr($store['wed_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][wed_closed]" value="1" <?php echo checked(!empty($store['wed_closed']), true, false); ?> /></td>
                                                <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][wed_note]" value="<?php echo esc_attr($store['wed_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Thursday</strong></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_open]" value="<?php echo esc_attr($store['thu_open'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_close]" value="<?php echo esc_attr($store['thu_close'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_break_start]" value="<?php echo esc_attr($store['thu_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][thu_break_end]" value="<?php echo esc_attr($store['thu_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][thu_closed]" value="1" <?php echo checked(!empty($store['thu_closed']), true, false); ?> /></td>
                                                <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][thu_note]" value="<?php echo esc_attr($store['thu_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Friday</strong></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_open]" value="<?php echo esc_attr($store['fri_open'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_close]" value="<?php echo esc_attr($store['fri_close'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_break_start]" value="<?php echo esc_attr($store['fri_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][fri_break_end]" value="<?php echo esc_attr($store['fri_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][fri_closed]" value="1" <?php echo checked(!empty($store['fri_closed']), true, false); ?> /></td>
                                                <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][fri_note]" value="<?php echo esc_attr($store['fri_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Saturday</strong></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_open]" value="<?php echo esc_attr($store['sat_open'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_close]" value="<?php echo esc_attr($store['sat_close'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_break_start]" value="<?php echo esc_attr($store['sat_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sat_break_end]" value="<?php echo esc_attr($store['sat_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][sat_closed]" value="1" <?php echo checked(!empty($store['sat_closed']), true, false); ?> /></td>
                                                <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][sat_note]" value="<?php echo esc_attr($store['sat_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                            </tr>
                                            <tr>
                                                <td><strong>Sunday</strong></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_open]" value="<?php echo esc_attr($store['sun_open'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_close]" value="<?php echo esc_attr($store['sun_close'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_break_start]" value="<?php echo esc_attr($store['sun_break_start'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="time" name="store_locations[<?php echo esc_attr($index); ?>][sun_break_end]" value="<?php echo esc_attr($store['sun_break_end'] ?? ''); ?>" class="regular-text" /></td>
                                                <td><input type="checkbox" class="store-closed-toggle" name="store_locations[<?php echo esc_attr($index); ?>][sun_closed]" value="1" <?php echo checked(!empty($store['sun_closed']), true, false); ?> /></td>
                                                <td><input type="text" name="store_locations[<?php echo esc_attr($index); ?>][sun_note]" value="<?php echo esc_attr($store['sun_note'] ?? ''); ?>" class="regular-text" placeholder="e.g. Closed" /></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style="margin-top: 12px; text-align: right;">
                                    <button type="button" class="button remove-store-location">Remove</button>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>

                    <div style="margin-top: 12px;">
                        <button type="button" class="button" id="add_store_location">Add Store</button>
                    </div>
                </div>
                
                <!-- 15-Days Return Policy -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">📦</span> 15-Days Return Policy
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Describe your 15-day return policy including conditions and process.</p>
                    <?php
                    wp_editor(
                        $return_policy,
                        'return_policy',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>
                
                <!-- Change of Mind Return -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🔄</span> Change of Mind Return
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Explain your change of mind return policy and any applicable fees.</p>
                    <?php
                    wp_editor(
                        $change_of_mind,
                        'change_of_mind',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>
                
                <!-- Warranty -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🛡️</span> Warranty
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Detail your warranty coverage, duration, and claim process.</p>
                    <?php
                    wp_editor(
                        $warranty,
                        'warranty',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>
                
                <!-- Delivery and Shipping -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🚚</span> Delivery and Shipping
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Outline delivery times, shipping costs, and tracking information.</p>
                    <?php
                    wp_editor(
                        $shipping,
                        'shipping',
                        array(
                            'textarea_rows' => 6,
                            'media_buttons' => false,
                            'teeny' => true,
                            'quicktags' => true,
                        )
                    );
                    ?>
                </div>

                <!-- Expert Contact Block -->
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937; font-size: 16px; font-weight: 600;">
                        <span style="margin-right: 8px;">🧑‍💼</span> Ask an Expert Block
                    </h3>
                    <p class="description" style="margin-bottom: 15px;">Configure the expert avatar, name, and contact links shown on product pages.</p>
                    <table class="form-table" role="presentation">
                        <tbody>
                            <tr>
                                <th scope="row"><label for="expert_name">Expert Name</label></th>
                                <td><input type="text" id="expert_name" name="expert_name" value="<?php echo esc_attr($expert_name); ?>" class="regular-text" /></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="expert_title">Expert Title</label></th>
                                <td><input type="text" id="expert_title" name="expert_title" value="<?php echo esc_attr($expert_title); ?>" class="regular-text" /></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="expert_avatar_url">Expert Avatar</label></th>
                                <td>
                                    <input type="hidden" id="expert_avatar_url" name="expert_avatar_url" value="<?php echo esc_url($expert_avatar_url); ?>" />
                                    <div id="expert_avatar_preview" style="margin-bottom: 10px;">
                                        <?php if (!empty($expert_avatar_url)) : ?>
                                            <img src="<?php echo esc_url($expert_avatar_url); ?>" alt="Expert Avatar" style="width: 64px; height: 64px; border-radius: 999px; object-fit: cover;" />
                                        <?php endif; ?>
                                    </div>
                                    <button type="button" class="button" id="expert_avatar_upload">Upload Avatar</button>
                                    <button type="button" class="button" id="expert_avatar_remove" <?php echo empty($expert_avatar_url) ? 'style="display:none;"' : ''; ?>>Remove</button>
                                    <p class="description" style="margin-top: 6px;">Upload an expert avatar (recommended square image).</p>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="expert_video_chat_url">Video Chat URL</label></th>
                                <td><input type="url" id="expert_video_chat_url" name="expert_video_chat_url" value="<?php echo esc_url($expert_video_chat_url); ?>" class="regular-text" /></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="expert_chat_url">Chat URL</label></th>
                                <td><input type="url" id="expert_chat_url" name="expert_chat_url" value="<?php echo esc_url($expert_chat_url); ?>" class="regular-text" /></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="expert_email">Expert Email</label></th>
                                <td><input type="email" id="expert_email" name="expert_email" value="<?php echo esc_attr($expert_email); ?>" class="regular-text" /></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="expert_phone">Expert Phone</label></th>
                                <td><input type="text" id="expert_phone" name="expert_phone" value="<?php echo esc_attr($expert_phone); ?>" class="regular-text" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 30px;">
                    <?php submit_button('Save Settings', 'primary large', 'ecommerce_policies_submit'); ?>
                </div>
            </form>

            <script>
            jQuery(function($) {
                var frame;
                var storeRows = $('#store_locations_rows');
                var nextIndex = parseInt(storeRows.data('next-index'), 10) || storeRows.children().length;

                $('#add_store_location').on('click', function(e) {
                    e.preventDefault();

                    var row = '' +
                        '<div class="store-location-row" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 12px 0; background: #fff;">' +
                        '<div style="display: flex; flex-wrap: wrap; gap: 12px;">' +
                        '<div style="flex: 1 1 220px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Store Name</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][name]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '<div style="flex: 1 1 180px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Phone</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][phone]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '<div style="flex: 1 1 220px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Map URL</label>' +
                        '<input type="url" name="store_locations[' + nextIndex + '][map_url]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '</div>' +
                        '<div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px;">' +
                        '<div style="flex: 1 1 160px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Latitude</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][latitude]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '<div style="flex: 1 1 160px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Longitude</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][longitude]" value="" class="regular-text" style="width: 100%;" />' +
                        '</div>' +
                        '</div>' +
                        '<div style="margin-top: 12px;">' +
                        '<label style="display: block; font-weight: 600; margin-bottom: 6px;">Address</label>' +
                        '<input type="text" name="store_locations[' + nextIndex + '][address]" value="" class="regular-text store-address-input" style="width: 100%;" autocomplete="off" />' +
                        '</div>' +
                        '<div style="margin-top: 12px;">' +
                        '<table class="widefat striped" style="margin-top: 8px;">' +
                        '<thead>' +
                        '<tr>' +
                        '<th style="width: 140px;">Day</th>' +
                        '<th style="width: 160px;">Opening</th>' +
                        '<th style="width: 160px;">Closing</th>' +
                        '<th style="width: 160px;">Lunch Start</th>' +
                        '<th style="width: 160px;">Lunch End</th>' +
                        '<th style="width: 90px;">Closed</th>' +
                        '<th>Custom Note</th>' +
                        '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                        '<tr>' +
                        '<td><strong>Monday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][mon_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][mon_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][mon_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Tuesday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][tue_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][tue_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][tue_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Wednesday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][wed_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][wed_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][wed_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Thursday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_break_start]" value="13:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][thu_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][thu_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][thu_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Friday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_close]" value="17:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_break_start]" value="12:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][fri_break_end]" value="13:45" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][fri_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][fri_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Saturday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_open]" value="07:45" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_close]" value="14:00" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_break_start]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sat_break_end]" value="" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][sat_closed]" value="1" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][sat_note]" value="" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><strong>Sunday</strong></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_open]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_close]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_break_start]" value="" class="regular-text" /></td>' +
                        '<td><input type="time" name="store_locations[' + nextIndex + '][sun_break_end]" value="" class="regular-text" /></td>' +
                        '<td><input type="checkbox" class="store-closed-toggle" name="store_locations[' + nextIndex + '][sun_closed]" value="1" checked="checked" /></td>' +
                        '<td><input type="text" name="store_locations[' + nextIndex + '][sun_note]" value="Closed" class="regular-text" placeholder="e.g. Closed" /></td>' +
                        '</tr>' +
                        '</tbody>' +
                        '</table>' +
                        '</div>' +
                        '<div style="margin-top: 12px; text-align: right;">' +
                        '<button type="button" class="button remove-store-location">Remove</button>' +
                        '</div>' +
                        '</div>';

                    storeRows.append(row);
                    nextIndex += 1;
                    initAllAddressAutocomplete();
                });

                $(document).on('click', '.remove-store-location', function(e) {
                    e.preventDefault();
                    $(this).closest('.store-location-row').remove();
                });

                $(document).on('change', '.store-closed-toggle', function() {
                    var row = $(this).closest('tr');
                    if ($(this).is(':checked')) {
                        row.find('input[type="time"]').val('');
                        var noteInput = row.find('input[name*="_note"]');
                        if (noteInput.val().trim() === '') {
                            noteInput.val('Closed');
                        }
                    }
                });

                $('#expert_avatar_upload').on('click', function(e) {
                    e.preventDefault();

                    if (frame) {
                        frame.open();
                        return;
                    }

                    frame = wp.media({
                        title: 'Select Expert Avatar',
                        button: { text: 'Use this image' },
                        multiple: false
                    });

                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        $('#expert_avatar_url').val(attachment.url);
                        $('#expert_avatar_preview').html(
                            '<img src="' + attachment.url + '" alt="Expert Avatar" style="width: 64px; height: 64px; border-radius: 999px; object-fit: cover;" />'
                        );
                        $('#expert_avatar_remove').show();
                    });

                    frame.open();
                });

                $('#expert_avatar_remove').on('click', function(e) {
                    e.preventDefault();
                    $('#expert_avatar_url').val('');
                    $('#expert_avatar_preview').empty();
                    $('#expert_avatar_remove').hide();
                });
            });
            </script>
            
            <!-- API Info -->
            <div style="margin-top: 40px; padding: 20px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
                <h3 style="margin-top: 0; color: #1e40af; font-size: 15px; font-weight: 600;">📡 REST API Endpoint</h3>
                <p style="margin-bottom: 10px; color: #1f2937;">These policies are available via the REST API:</p>
                <code style="background: #fff; padding: 10px 16px; border-radius: 4px; display: inline-block; margin: 10px 0; color: #059669; border: 1px solid #d1d5db;">
                    GET <?php echo rest_url('belims/v1/ecommerce-policies'); ?>
                </code>
                <p class="description" style="color: #6b7280;">The frontend automatically fetches and displays these policies on product pages.</p>
            </div>
      
        <?php
    }
}

// Initialize the class
new Ecommerce_Policies_Admin();
