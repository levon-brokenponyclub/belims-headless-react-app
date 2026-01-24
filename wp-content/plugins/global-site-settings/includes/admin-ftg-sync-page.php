<?php
/**
 * FTG Sync Admin Page
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add FTG Sync submenu under Site Settings
 */
function global_site_settings_add_ftg_sync_page() {
    add_submenu_page(
        'belims-site-settings',
        'FTG Product Sync',
        'FTG Sync',
        'manage_options',
        'ftg-product-sync',
        'global_site_settings_ftg_sync_page_html'
    );
}
add_action('admin_menu', 'global_site_settings_add_ftg_sync_page', 20);

/**
 * Render FTG Sync page
 */
function global_site_settings_ftg_sync_page_html() {
    if (!current_user_can('manage_options')) {
        return;
    }

    // Get FTG credentials from ACF
    $ftg_email = get_field('ftg_api_email', 'option');
    $ftg_password = get_field('ftg_api_password', 'option');
    $ftg_token = get_field('ftg_collection_token', 'option');
    
    $credentials_set = !empty($ftg_email) && !empty($ftg_password);
    $token_set = !empty($ftg_token);
    
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        
        <div class="card" style="max-width: 800px; margin-top: 20px;">
            <h2>FTG Integration Status</h2>
            
            <table class="form-table">
                <tr>
                    <th>Credentials Configured:</th>
                    <td>
                        <?php if ($credentials_set): ?>
                            <span style="color: green;">✓ Email and Password Set</span>
                        <?php else: ?>
                            <span style="color: red;">✗ Not Configured</span>
                            <p><a href="<?php echo admin_url('admin.php?page=belims-site-settings'); ?>">Configure in Site Settings → APIs → Find The Gap API</a></p>
                        <?php endif; ?>
                    </td>
                </tr>
                <tr>
                    <th>Collection Token:</th>
                    <td>
                        <?php if ($token_set): ?>
                            <span style="color: green;">✓ <?php echo esc_html(substr($ftg_token, 0, 20)) . '...'; ?></span>
                        <?php else: ?>
                            <span style="color: orange;">⚠ Not Set</span>
                        <?php endif; ?>
                    </td>
                </tr>
            </table>
        </div>

        <?php if ($credentials_set): ?>
        <div class="card" style="max-width: 800px; margin-top: 20px;">
            <h2>Quick Actions</h2>
            
            <div style="margin: 20px 0;">
                <button id="ftg-test-connection" class="button button-secondary">
                    <span class="dashicons dashicons-update" style="vertical-align: middle;"></span> Test FTG Connection
                </button>
                
                <?php if (!$token_set): ?>
                <button id="ftg-get-instances" class="button button-primary" style="margin-left: 10px;">
                    <span class="dashicons dashicons-download" style="vertical-align: middle;"></span> Get Collection Token
                </button>
                <?php endif; ?>
                
                <?php if ($token_set): ?>
                <button id="ftg-sync-products" class="button button-primary" style="margin-left: 10px;">
                    <span class="dashicons dashicons-cloud" style="vertical-align: middle;"></span> Sync Products to WooCommerce
                </button>
                <?php endif; ?>
            </div>
            
            <div id="ftg-result" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #0073aa; display: none;">
                <h3>Result:</h3>
                <pre id="ftg-result-content" style="white-space: pre-wrap; word-wrap: break-word;"></pre>
            </div>
            
            <div id="ftg-loading" style="display: none; margin-top: 20px;">
                <span class="spinner is-active" style="float: none; margin: 0 10px 0 0;"></span>
                <span id="ftg-loading-text">Processing...</span>
            </div>
        </div>

        <div class="card" style="max-width: 800px; margin-top: 20px;">
            <h2>API Endpoints</h2>
            <ul>
                <li><code>GET /wp-json/belims/v1/ftg/instances</code> - Get collection tokens</li>
                <li><code>POST /wp-json/belims/v1/ftg/sync</code> - Sync products (params: collection_token)</li>
                <li><code>GET /wp-json/belims/v1/ftg/sync/status</code> - Last sync status</li>
            </ul>
        </div>
        <?php endif; ?>
    </div>

    <script>
    jQuery(document).ready(function($) {
        function showResult(content, isError = false) {
            $('#ftg-result').show();
            $('#ftg-result-content').text(JSON.stringify(content, null, 2));
            if (isError) {
                $('#ftg-result').css('border-left-color', '#dc3232');
            } else {
                $('#ftg-result').css('border-left-color', '#46b450');
            }
        }

        function showLoading(text) {
            $('#ftg-loading-text').text(text);
            $('#ftg-loading').show();
            $('#ftg-result').hide();
        }

        function hideLoading() {
            $('#ftg-loading').hide();
        }

        $('#ftg-test-connection').on('click', function() {
            showLoading('Testing FTG connection...');
            
            $.ajax({
                url: '<?php echo rest_url('belims/v1/ftg/instances'); ?>',
                method: 'GET',
                success: function(response) {
                    hideLoading();
                    showResult({
                        success: true,
                        message: 'Connection successful!',
                        instances: response
                    });
                },
                error: function(xhr) {
                    hideLoading();
                    showResult({
                        success: false,
                        message: 'Connection failed',
                        error: xhr.responseJSON || xhr.responseText
                    }, true);
                }
            });
        });

        $('#ftg-get-instances').on('click', function() {
            showLoading('Fetching collection tokens from FTG...');
            
            $.ajax({
                url: '<?php echo rest_url('belims/v1/ftg/instances'); ?>',
                method: 'GET',
                success: function(response) {
                    hideLoading();
                    if (response && response.length > 0) {
                        showResult({
                            success: true,
                            message: 'Collection tokens retrieved! Copy the token and save it in Site Settings → APIs → Find The Gap API',
                            tokens: response.map(function(inst) {
                                return {
                                    name: inst.name,
                                    token: inst.token
                                };
                            })
                        });
                    } else {
                        showResult({
                            success: false,
                            message: 'No collection tokens found for this account'
                        }, true);
                    }
                },
                error: function(xhr) {
                    hideLoading();
                    showResult({
                        success: false,
                        message: 'Failed to get collection tokens',
                        error: xhr.responseJSON || xhr.responseText
                    }, true);
                }
            });
        });

        $('#ftg-sync-products').on('click', function() {
            if (!confirm('This will sync products from FTG to WooCommerce. Continue?')) {
                return;
            }

            showLoading('Syncing products from FTG... This may take a while.');
            
            $.ajax({
                url: '<?php echo rest_url('belims/v1/ftg/sync'); ?>',
                method: 'POST',
                data: {
                    collection_token: '<?php echo esc_js($ftg_token); ?>'
                },
                success: function(response) {
                    hideLoading();
                    showResult({
                        success: true,
                        message: 'Product sync completed!',
                        details: response
                    });
                },
                error: function(xhr) {
                    hideLoading();
                    showResult({
                        success: false,
                        message: 'Product sync failed',
                        error: xhr.responseJSON || xhr.responseText
                    }, true);
                }
            });
        });
    });
    </script>
    <?php
}
