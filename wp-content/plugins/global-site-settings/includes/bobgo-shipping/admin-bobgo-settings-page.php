<?php
/**
 * BobGo Shipping Settings Admin Page
 * 
 * @package GlobalSiteSettings
 * @subpackage BobGoShipping
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render BobGo shipping settings tab content
 */
function render_bobgo_shipping_settings_tab() {
    $current_environment = get_option('bobgo_environment', 'sandbox');
    $saved_token = get_option('bobgo_api_token', '');
    $env_token = getenv('BOBGO_SANDBOX_API_KEY');

    if (isset($_POST['save_bobgo_settings']) && check_admin_referer('save_bobgo_settings_action', 'bobgo_settings_nonce')) {
        $environment = sanitize_text_field($_POST['bobgo_environment'] ?? 'sandbox');
        $environment = in_array($environment, array('sandbox', 'production'), true) ? $environment : 'sandbox';
        $api_token = sanitize_text_field($_POST['bobgo_api_token'] ?? '');

        update_option('bobgo_environment', $environment);
        update_option('bobgo_api_token', $api_token);

        $current_environment = $environment;
        $saved_token = $api_token;

        echo '<div class="notice notice-success inline" style="margin-bottom: 20px;"><p>✅ BobGo settings saved.</p></div>';
    }

    $using_env_var = ($current_environment === 'sandbox' && !empty($env_token));
    ?>
    
    <div class="bpc-card">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">BobGo Shipping Integration</h2>
            <p class="bpc-card-description">Configure BobGo shipping for real-time rates and shipment management.</p>
        </div>
        <div style="padding: 30px; display: grid; gap: 20px;">
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid var(--belims-blue);">
                <p style="margin: 0; line-height: 1.7;">
                    The official BobGo WooCommerce plugin is active and handles checkout rates and shipping on production.
                    <br>Use this form to choose Sandbox vs Production for the custom API wrapper and, if needed, store a Sandbox API token locally.
                    <br><br><strong>Notes:</strong>
                    <br>- If the environment variable <code>BOBGO_SANDBOX_API_KEY</code> is set, it will be used for Sandbox instead of the saved token.
                    <br>- Production remains served via the official plugin; do not store production keys here.
                </p>
            </div>

            <form method="post" action="" style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <?php wp_nonce_field('save_bobgo_settings_action', 'bobgo_settings_nonce'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="bobgo-environment">Environment</label></th>
                        <td>
                            <select name="bobgo_environment" id="bobgo-environment">
                                <option value="sandbox" <?php selected($current_environment, 'sandbox'); ?>>Sandbox</option>
                                <option value="production" <?php selected($current_environment, 'production'); ?>>Production</option>
                            </select>
                            <p class="description" style="margin-top: 6px;">Sandbox is recommended for testing via the headless rates endpoint.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="bobgo-api-token">Sandbox API Key</label></th>
                        <td>
                            <input type="password" name="bobgo_api_token" id="bobgo-api-token" class="regular-text" autocomplete="new-password" value="<?php echo esc_attr($saved_token); ?>" />
                            <p class="description" style="margin-top: 6px;">
                                Stored in the WordPress options table. <?php echo $using_env_var ? 'Currently using the environment variable value.' : 'Used when no environment variable is present.'; ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <p class="submit" style="margin-top: 10px;">
                    <input type="submit" name="save_bobgo_settings" id="save-bobgo-settings" class="button button-primary" value="Save BobGo Settings" />
                </p>
            </form>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <a href="<?php echo admin_url('admin.php?page=wc-settings&tab=shipping'); ?>" class="button button-secondary" style="text-align: center;">
                    ⚙️ WooCommerce Shipping Settings
                </a>
                <a href="https://api-docs.bob.co.za/bobgo" target="_blank" class="button button-secondary" style="text-align: center;">
                    📖 BobGo Docs
                </a>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: grid; gap: 10px;">
                <div style="font-weight: 600;">Connection Test</div>
                <p style="margin: 0; color: #475569;">
                    Runs the built-in AJAX test using the selected environment and the resolved token (env var wins for sandbox).
                </p>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button type="button" id="test-bobgo-connection" class="button button-secondary">Test Connection</button>
                    <span id="bobgo-connection-status" style="font-size: 13px; color: #475569;"></span>
                </div>
            </div>
        </div>
    </div>
    
    <?php
}
