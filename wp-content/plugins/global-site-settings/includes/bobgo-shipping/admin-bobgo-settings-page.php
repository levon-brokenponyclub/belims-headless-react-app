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
    // Get current settings
    $bobgo_environment = get_option('bobgo_environment', 'sandbox');
    $bobgo_api_token = get_option('bobgo_api_token', '');
    $bobgo_auto_create = get_option('bobgo_auto_create_shipments', false);
    ?>
    
    <div class="bpc-card">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">BobGo Shipping Integration</h2>
            <p class="bpc-card-description">Configure BobGo shipping for real-time rates and shipment management.</p>
        </div>
        <div style="padding: 30px;">
            <form method="post" action="options.php">
                <?php settings_fields('global_site_settings_bobgo'); ?>
                
                <table class="bpc-modern-table">
                    <tr>
                        <th><label>Environment</label></th>
                        <td>
                            <label style="margin-right: 20px;">
                                <input type="radio" name="bobgo_environment" value="sandbox" <?php checked($bobgo_environment, 'sandbox'); ?>>
                                Sandbox (Testing)
                            </label>
                            <label>
                                <input type="radio" name="bobgo_environment" value="production" <?php checked($bobgo_environment, 'production'); ?>>
                                Production (Live)
                            </label>
                            <p class="description">
                                Use sandbox for testing. Register at 
                                <a href="https://sandbox.bobgo.co.za/" target="_blank">sandbox.bobgo.co.za</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="bobgo_api_token">API Bearer Token</label></th>
                        <td>
                            <input type="password" 
                                   id="bobgo_api_token" 
                                   name="bobgo_api_token" 
                                   value="<?php echo esc_attr($bobgo_api_token); ?>" 
                                   class="regular-text"
                                   placeholder="Enter your BobGo API token">
                            <p class="description">
                                Get your token from BobGo Settings → API Keys
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th><label>Connection Status</label></th>
                        <td>
                            <button type="button" id="test-bobgo-connection" class="button button-secondary">
                                Test Connection
                            </button>
                            <span id="bobgo-connection-status" style="margin-left: 10px;"></span>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="bobgo_auto_create">Auto-Create Shipments</label></th>
                        <td>
                            <label class="bpc-switch">
                                <input type="checkbox" 
                                       id="bobgo_auto_create" 
                                       name="bobgo_auto_create_shipments" 
                                       value="1" 
                                       <?php checked($bobgo_auto_create, true); ?>>
                                <span class="bpc-slider"></span>
                            </label>
                            <p class="description">
                                Automatically create shipments when orders are marked as processing
                            </p>
                        </td>
                    </tr>
                </table>
                
                <div class="bpc-submit-bar">
                    <input type="submit" name="submit" class="button-primary" value="Save BobGo Settings" />
                </div>
            </form>
            
            <div style="margin-top: 40px; padding-top: 40px; border-top: 2px solid #e5e7eb;">
                <h3 style="margin-bottom: 20px;">📚 Quick Setup Guide</h3>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid var(--belims-blue);">
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li><strong>Register:</strong> Create account at <a href="https://sandbox.bobgo.co.za/" target="_blank">sandbox.bobgo.co.za</a></li>
                        <li><strong>Get Token:</strong> Go to Settings → API Keys and copy your bearer token</li>
                        <li><strong>Configure:</strong> Paste token above and test connection</li>
                        <li><strong>Set Collection Address:</strong> Add your warehouse/store address in BobGo dashboard</li>
                        <li><strong>Enable Shipping Method:</strong> Go to WooCommerce → Settings → Shipping and enable BobGo</li>
                        <li><strong>Test:</strong> Process a test order to verify end-to-end flow</li>
                    </ol>
                </div>
                
                <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <a href="https://api-docs.bob.co.za/bobgo" target="_blank" class="button button-secondary" style="text-align: center;">
                        📖 API Documentation
                    </a>
                    <a href="<?php echo admin_url('admin.php?page=wc-settings&tab=shipping'); ?>" class="button button-secondary" style="text-align: center;">
                        ⚙️ Shipping Settings
                    </a>
                </div>
            </div>
        </div>
    </div>
    
    <?php
}
