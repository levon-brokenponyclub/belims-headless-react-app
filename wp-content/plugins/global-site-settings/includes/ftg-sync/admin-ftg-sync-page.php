<?php
/**
 * FTG Sync Admin Page
 * Submenu page under Site Settings
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render the FTG Sync Page
 */
function belims_ftg_sync_page() {
    // Get stored last sync timestamp
    $last_sync = get_option('belims_ftg_last_sync');
    $last_sync_text = $last_sync ? date_i18n('F j, Y, g:i a', $last_sync) : 'Never';

    // Check if sync was just triggered
    $sync_status = '';
    if (isset($_POST['belims_ftg_sync_nonce']) && wp_verify_nonce($_POST['belims_ftg_sync_nonce'], 'belims_ftg_sync_action')) {

        $collection_token = get_field('ftg_collection_token', 'option');

        if (!$collection_token) {
            $sync_status = '<div class="notice notice-error"><p>Please set your FTG Collection Token in Site Settings first.</p></div>';
        } else {
            // Trigger sync via REST endpoint internally
            $response = wp_remote_post(rest_url('belims/v1/ftg/sync'), array(
                'body'    => json_encode(array(
                    'collection_token' => $collection_token,
                    'limit' => 500,
                )),
                'headers' => array('Content-Type' => 'application/json'),
            ));

            if (is_wp_error($response)) {
                $sync_status = '<div class="notice notice-error"><p>Sync failed: ' . esc_html($response->get_error_message()) . '</p></div>';
            } else {
                $body = wp_remote_retrieve_body($response);
                $data = json_decode($body, true);

                if (!empty($data['success'])) {
                    $sync_status = '<div class="notice notice-success"><p>FTG Sync completed. ' . intval($data['synced']) . ' products synced.</p></div>';
                    update_option('belims_ftg_last_sync', current_time('timestamp'));
                } else {
                    $sync_status = '<div class="notice notice-error"><p>Sync completed with errors: ' . esc_html(implode(', ', $data['errors'] ?? [])) . '</p></div>';
                }
            }
        }
    }
    ?>
    <div class="wrap">
        <h1 class="wp-heading-inline">FTG Product Sync</h1>
        <p>Sync your FTG products into WooCommerce.</p>

        <?php echo $sync_status; ?>

        <table class="form-table">
            <tr>
                <th>Last Sync:</th>
                <td><?php echo esc_html($last_sync_text); ?></td>
            </tr>
        </table>

        <form method="post">
            <?php wp_nonce_field('belims_ftg_sync_action', 'belims_ftg_sync_nonce'); ?>
            <p>
                <input type="submit" name="belims_ftg_sync_submit" id="belims_ftg_sync_submit" class="button button-primary" value="Run FTG Sync Now">
            </p>
        </form>
    </div>
    <?php
}
