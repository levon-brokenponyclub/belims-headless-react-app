<?php
/**
 * Site Settings → Homepage tab: homepage sections form + storefront publishing.
 * Behaviour lives in Belims_Homepage; this file is markup only.
 *
 * @package GlobalSiteSettings
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<div id="tab-homepage" class="bpc-tab-content">
    <div class="bpc-card">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">Homepage</h2>
            <p class="bpc-card-description">Content for the storefront homepage. Saving a change rebuilds the storefront automatically — it goes live in about 1–2 minutes.</p>
        </div>
        <?php
        if (function_exists('acf_form')) {
            acf_form(array(
                'post_id'      => 'options',
                'fields'       => array('field_belims_homepage_sections'),
                'return'       => admin_url('admin.php?page=belims-site-settings#tab-homepage'),
                'submit_value' => 'Save Homepage',
            ));
        } else {
            echo '<p>Please install and activate Advanced Custom Fields PRO.</p>';
        }
        ?>
    </div>

    <div class="bpc-card" style="margin-top: 20px;" id="belims-homepage-publishing">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">Publishing</h2>
            <p class="bpc-card-description">The storefront includes homepage content when it is built. Choose which storefront a save rebuilds; <strong>Publish now</strong> rebuilds it without editing content.</p>
        </div>

        <div class="ftg-field-row">
            <div class="ftg-field-label">
                <label>Saving rebuilds</label>
                <p class="ftg-field-desc">Preview while developing; Production (or Both) once the site is live.</p>
            </div>
            <div class="ftg-field-control" data-hp="choice">
                <label style="margin-right: 16px;"><input type="radio" name="belims-hp-target" value="preview" /> Preview</label>
                <label style="margin-right: 16px;"><input type="radio" name="belims-hp-target" value="production" /> Production</label>
                <label><input type="radio" name="belims-hp-target" value="both" /> Both</label>
            </div>
        </div>

        <div class="bpc-status-grid" style="margin-top: 16px;" data-hp="targets"></div>
        <div class="bpc-status-grid">
            <div class="bpc-status-item"><div class="bpc-status-title">Last publish</div><div class="bpc-status-value" data-hp="last">—</div></div>
        </div>

        <?php foreach (Belims_Homepage::TARGETS as $target => $meta) : ?>
            <div class="ftg-field-row" style="margin-top: 16px;" data-hp-hook="<?php echo esc_attr($target); ?>">
                <div class="ftg-field-label">
                    <label for="belims-deploy-hook-<?php echo esc_attr($target); ?>"><?php echo esc_html($meta['label']); ?> Deploy Hook</label>
                    <p class="ftg-field-desc">Vercel → Project → Settings → Git → Deploy Hooks (branch <code><?php echo esc_html($meta['branch']); ?></code>).</p>
                </div>
                <div class="ftg-field-control">
                    <div data-hp="hook-saved" hidden>
                        <span class="ftg-saved-value" data-hp="hook-masked"></span>
                        <button type="button" class="bpc-btn-secondary" data-hp-action="edit-hook" style="margin-left: 12px;">Edit</button>
                    </div>
                    <div data-hp="hook-form" hidden>
                        <input type="url" id="belims-deploy-hook-<?php echo esc_attr($target); ?>" class="regular-text" placeholder="https://api.vercel.com/v1/integrations/deploy/…" />
                        <button type="button" class="bpc-btn-primary" data-hp-action="save-hook" style="margin-left: 8px;">Save</button>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>

        <div class="bpc-actions" style="margin-top: 16px;">
            <button type="button" class="bpc-btn-primary" data-hp-action="publish">Publish now</button>
        </div>
        <p class="bpc-form-status-text" data-hp="message"></p>
    </div>
</div>
