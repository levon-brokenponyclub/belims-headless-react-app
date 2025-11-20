<?php
/**
 * Admin notices and activation messages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Show activation notice
add_action('admin_notices', 'belims_settings_activation_notice');

function belims_settings_activation_notice() {
    if (get_option('belims_settings_activation_notice')) {
        return; // Don't show if already dismissed
    }
    
    $screen = get_current_screen();
    if ($screen->id !== 'plugins') {
        return; // Only show on plugins page
    }
    
    echo '<div class="notice notice-success is-dismissible">';
    echo '<p><strong>Belims Custom Site Settings</strong> plugin activated successfully! ';
    echo '<a href="' . admin_url('admin.php?page=belims-site-settings') . '">Configure your site settings</a> to get started.</p>';
    echo '</div>';
    
    // Mark as shown
    update_option('belims_settings_activation_notice', true);
}

// Handle notice dismissal
add_action('wp_ajax_belims_dismiss_notice', 'belims_dismiss_activation_notice');

function belims_dismiss_activation_notice() {
    update_option('belims_settings_activation_notice', true);
    wp_die();
}