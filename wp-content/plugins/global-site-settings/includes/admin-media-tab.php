<?php
/**
 * Site Settings → Media tab: image optimisation + media folder tools.
 * Behaviour lives in Belims_Image_Optimizer; this file is markup only.
 *
 * @package GlobalSiteSettings
 */

if (!defined('ABSPATH')) {
    exit;
}

$stats = class_exists('Belims_Image_Optimizer') ? Belims_Image_Optimizer::stats() : null;
?>
<div id="tab-media" class="bpc-tab-content">
    <?php if (!$stats) : ?>
        <div class="bpc-card"><p>Image optimizer module not available.</p></div>
    <?php else : ?>

    <div class="bpc-card" id="belims-media-optimizer">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">Bulk Convert &amp; Optimise</h2>
            <p class="bpc-card-description">Converts PNG/JPEG originals in the Media Library to WebP (quality 80), repoints each attachment and regenerates only the sizes in use. Runs in the background — you can leave this page.</p>
        </div>

        <?php if (!$stats['imagick'] || !$stats['queue']) : ?>
            <div class="bpc-callout bpc-callout--warning">
                <?php echo !$stats['imagick'] ? 'Imagick is not available on this server. ' : ''; ?>
                <?php echo !$stats['queue'] ? 'Action Scheduler (WooCommerce) is not available.' : ''; ?>
            </div>
        <?php endif; ?>

        <div class="bpc-status-grid">
            <div class="bpc-status-item"><div class="bpc-status-title">To convert</div><div class="bpc-status-value" data-media-stat="pending"><?php echo (int) $stats['pending']; ?></div></div>
            <div class="bpc-status-item"><div class="bpc-status-title">WebP</div><div class="bpc-status-value" data-media-stat="webp"><?php echo (int) $stats['webp']; ?></div></div>
            <div class="bpc-status-item"><div class="bpc-status-title">Failed (last run)</div><div class="bpc-status-value" data-media-stat="failed"><?php echo (int) $stats['failed']; ?></div></div>
            <div class="bpc-status-item"><div class="bpc-status-title">Status</div><div class="bpc-status-value" data-media-stat="status"><?php echo esc_html(ucfirst($stats['state']['status'])); ?></div></div>
        </div>

        <div class="belims-media-progress" style="margin: 16px 0;">
            <progress data-media-progress max="100" value="0" style="width: 100%;"></progress>
            <p class="bpc-form-status-text" data-media-summary></p>
        </div>

        <div class="bpc-actions">
            <button type="button" class="bpc-btn-primary" data-media-action="start">Start conversion</button>
            <button type="button" class="bpc-btn-secondary" data-media-action="pause">Pause</button>
            <button type="button" class="bpc-btn-secondary" data-media-action="resume">Resume</button>
        </div>

        <pre data-media-log style="max-height: 220px; overflow: auto; margin-top: 16px; font-size: 12px; background: var(--bpc-surface, #f6f7f7); padding: 12px;"></pre>

        <div class="ftg-field-row" style="margin-top: 16px;">
            <div class="ftg-field-label">
                <label for="belims-auto-webp">Auto-convert new uploads</label>
                <p class="ftg-field-desc">Convert PNG/JPEG to WebP on upload, including images imported by FTG sync.</p>
            </div>
            <div class="ftg-field-control">
                <label class="bpc-switch">
                    <input type="checkbox" id="belims-auto-webp" <?php checked($stats['auto']); ?> />
                    <span class="bpc-slider"></span>
                </label>
            </div>
        </div>
    </div>

    <div class="bpc-card" style="margin-top: 20px;">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">Archive Old Originals</h2>
            <p class="bpc-card-description">Moves PNG/JPEG files that no attachment references any more (left behind by conversion) to <code><?php echo esc_html($stats['archive_dir']); ?></code>, outside the public uploads folder. Run a dry run first; wait a few hours after a conversion so cached API responses expire.</p>
        </div>
        <div class="bpc-actions">
            <button type="button" class="bpc-btn-secondary" data-media-action="archive-dry">Dry run</button>
            <button type="button" class="bpc-btn-primary" data-media-action="archive-run">Move files</button>
        </div>
        <p class="bpc-form-status-text" data-media-archive-result></p>
    </div>

    <div class="bpc-card" style="margin-top: 20px;">
        <div class="bpc-card-header">
            <h2 class="bpc-card-title">Assign Product Images → Products Folder</h2>
            <p class="bpc-card-description">Adds every image used as a product/variation featured image, in a product gallery, or uploaded to a product to Media → Folders → Products. Existing folder assignments are kept. FTG sync does this automatically for new imports.</p>
        </div>
        <div class="bpc-actions">
            <button type="button" class="bpc-btn-primary" data-media-action="assign-products">Run now</button>
        </div>
        <p class="bpc-form-status-text" data-media-assign-result>
            <?php if (!empty($stats['products_last'])) : ?>
                Last run <?php echo esc_html($stats['products_last']['time']); ?> — <?php echo (int) $stats['products_last']['found']; ?> product images, <?php echo (int) $stats['products_last']['assigned']; ?> newly assigned.
            <?php endif; ?>
        </p>
    </div>

    <?php endif; ?>
</div>
