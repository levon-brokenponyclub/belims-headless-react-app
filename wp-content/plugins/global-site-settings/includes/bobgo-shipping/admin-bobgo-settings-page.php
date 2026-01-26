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
    ?>
    
    <div class="bpc-card">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">BobGo Shipping Integration</h2>
            <p class="bpc-card-description">Headless shipping rates powered by the official BobGo WooCommerce plugin.</p>
        </div>
        <div style="padding: 30px; display: grid; gap: 20px;">
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0284c7;">
                <h3 style="margin-top: 0; color: #0369a1;">✓ BobGo Active</h3>
                <p style="margin: 0; line-height: 1.7; color: #0c4a6e;">
                    The official BobGo WooCommerce plugin is configured and active. The headless app uses a proxy endpoint 
                    that calls the BobGo rates-at-checkout shipping method—no API keys needed in the headless frontend.
                    <br><br>
                    <strong>How it works:</strong>
                    <br>• Headless app POSTs delivery address to <code>/wp-json/belims/v1/shipping/calculate</code>
                    <br>• Server-side proxy calls the BobGo/uAfrica shipping method
                    <br>• WooCommerce uses the configured BobGo plugin to get live rates
                    <br>• Rates are returned to the headless app
                </p>
            </div>

            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h4 style="margin-top: 0;">Configuration</h4>
                <p style="margin-bottom: 15px; color: #64748b;">
                    All BobGo settings are managed through the official WooCommerce plugin. 
                    Use the links below to configure shipping methods and view documentation.
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <a href="<?php echo admin_url('admin.php?page=wc-settings&tab=shipping'); ?>" class="button button-primary" style="text-align: center;">
                        ⚙️ WooCommerce Shipping Settings
                    </a>
                    <a href="https://api-docs.bob.co.za/bobgo" target="_blank" class="button button-secondary" style="text-align: center;">
                        📖 BobGo API Docs
                    </a>
                </div>
            </div>

            <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 15px;">
                <p style="margin: 0; color: #854d0e;">
                    <strong>⚠️ Note:</strong> Make sure your WooCommerce store address is complete (street, city, postal code) 
                    for BobGo to calculate accurate shipping rates.
                </p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: grid; gap: 10px;">
                <div style="font-weight: 600;">Connection Test</div>
                <p style="margin: 0; color: #475569;">
                    Tests the WooCommerce shipping calculator with BobGo integration.
                </p>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button type="button" id="test-bobgo-proxy" class="button button-secondary">Test Connection</button>
                    <span id="bobgo-proxy-status" style="font-size: 13px; color: #475569;"></span>
                </div>
            </div>
        </div>
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        $('#test-bobgo-proxy').on('click', function() {
            var btn = $(this);
            var status = $('#bobgo-proxy-status');
            
            btn.prop('disabled', true).text('Testing...');
            status.html('<span style="color: #64748b;">⏳ Testing BobGo via WooCommerce...</span>');
            
            // Test with a known South African address
            $.ajax({
                url: '<?php echo rest_url('belims/v1/shipping/calculate'); ?>',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    destination: {
                        country: 'ZA',
                        state: 'WC',
                        city: 'Cape Town',
                        postcode: '8001',
                        address1: 'Test Street 1',
                        address2: ''
                    }
                }),
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', '<?php echo wp_create_nonce('wp_rest'); ?>');
                },
                success: function(response) {
                    if (response.success && response.rates && response.rates.length > 0) {
                        var ratesText = response.rates.length + ' rate(s) found: ' + 
                            response.rates.map(r => r.label + ' (R' + r.cost + ')').join(', ');
                        status.html('<span style="color: #059669;">✅ ' + ratesText + '</span>');
                    } else {
                        status.html('<span style="color: #dc2626;">⚠️ No rates returned. Check WooCommerce BobGo plugin settings.</span>');
                    }
                },
                error: function(xhr) {
                    var errorMsg = xhr.responseJSON?.message || 'Connection failed';
                    status.html('<span style="color: #dc2626;">❌ ' + errorMsg + '</span>');
                },
                complete: function() {
                    btn.prop('disabled', false).text('Test Connection');
                }
            });
        });
    });
    </script>
    
    <?php
}
