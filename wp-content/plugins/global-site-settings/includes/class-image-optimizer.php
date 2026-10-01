<?php
/**
 * Image Optimizer
 *
 * - Bulk PNG/JPEG → WebP conversion of Media Library originals, run as a background
 *   queue (WooCommerce Action Scheduler) and controlled from Site Settings → Media.
 * - Optional auto-conversion of new uploads (Media Library + FTG sync).
 * - Archive of PNG/JPEG files no attachment references any more.
 * - One-off assignment of product images to the Media "Products" folder.
 *
 * @package GlobalSiteSettings
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Image_Optimizer {

    const STATE_OPTION = 'belims_image_optimizer_state';
    const AUTO_OPTION  = 'belims_image_auto_webp';
    const HOOK_BATCH   = 'belims_image_optimizer_batch';
    const AS_GROUP     = 'belims-media';
    const BATCH_SIZE   = 10;
    const QUALITY      = 80;
    const LOG_LINES    = 50;
    const SOURCE_MIMES = array('image/png', 'image/jpeg');
    const FAILED_META  = '_belims_webp_failed';

    public function __construct() {
        add_action(self::HOOK_BATCH, array(__CLASS__, 'run_batch'));
        add_filter('wp_handle_upload', array(__CLASS__, 'filter_handle_upload'));

        foreach (array('status', 'start', 'pause', 'resume', 'archive', 'assign_products', 'toggle_auto') as $action) {
            add_action("wp_ajax_belims_media_$action", array($this, "ajax_$action"));
        }
    }

    /* ------------------------------------------------------------------ *
     * Conversion
     * ------------------------------------------------------------------ */

    /** Attachment excluded from conversion: Woo email header (WebP unsupported in Outlook desktop). */
    private static function excluded_id() {
        $url = (string) get_option('woocommerce_email_header_image', '');
        return $url ? (int) attachment_url_to_postid($url) : 0;
    }

    /** @return int[] PNG/JPEG attachment IDs still to convert (excludes ones that failed this run). */
    public static function pending_ids($limit = 0) {
        global $wpdb;
        $mimes = "'" . implode("','", self::SOURCE_MIMES) . "'";
        $sql   = $wpdb->prepare(
            "SELECT p.ID FROM {$wpdb->posts} p
             LEFT JOIN {$wpdb->postmeta} f ON f.post_id = p.ID AND f.meta_key = %s
             WHERE p.post_type = 'attachment' AND p.post_mime_type IN ($mimes) AND p.ID <> %d AND f.meta_id IS NULL
             ORDER BY p.ID",
            self::FAILED_META,
            self::excluded_id()
        );
        if ($limit > 0) {
            $sql .= ' LIMIT ' . (int) $limit;
        }
        return array_map('intval', $wpdb->get_col($sql));
    }

    /** Writes a WebP copy next to $path; returns the new path or WP_Error. */
    public static function write_webp($path) {
        if (!class_exists('Imagick')) {
            return new WP_Error('no_imagick', 'Imagick is not available on this server.');
        }

        $dir = dirname($path);
        $new = $dir . '/' . wp_unique_filename($dir, pathinfo($path, PATHINFO_FILENAME) . '.webp');

        try {
            $im = new Imagick($path);
            $im->setImageFormat('webp');
            $im->setImageCompressionQuality(self::QUALITY);
            $im->setOption('webp:method', '6');
            $im->stripImage();
            $im->writeImage($new);
            $im->clear();
        } catch (Throwable $e) {
            return new WP_Error('convert_failed', $e->getMessage());
        }

        return $new;
    }

    /**
     * Converts one attachment original to WebP, repoints it and regenerates sub-sizes.
     * Old files are left in place (see archive_unreferenced()).
     *
     * @return array{status:string, id:int, message?:string, old_bytes?:int, new_bytes?:int}
     */
    public static function convert_attachment($id) {
        require_once ABSPATH . 'wp-admin/includes/image.php';
        global $wpdb;

        $old = get_attached_file($id, true);
        if (!$old || !is_file($old)) {
            return array('status' => 'missing', 'id' => $id, 'message' => (string) $old);
        }

        $new = self::write_webp($old);
        if (is_wp_error($new)) {
            return array('status' => 'error', 'id' => $id, 'message' => $new->get_error_message());
        }

        $dir       = dirname($old);
        $old_meta  = wp_get_attachment_metadata($id) ?: array();
        $old_bytes = self::files_bytes($dir, $old, $old_meta);

        update_attached_file($id, $new);
        $wpdb->update($wpdb->posts, array('post_mime_type' => 'image/webp'), array('ID' => $id));
        clean_post_cache($id);

        $meta = wp_generate_attachment_metadata($id, $new);
        wp_update_attachment_metadata($id, $meta);

        return array(
            'status'    => 'ok',
            'id'        => $id,
            'message'   => _wp_relative_upload_path($new),
            'old_bytes' => $old_bytes,
            'new_bytes' => self::files_bytes($dir, $new, $meta),
        );
    }

    private static function files_bytes($dir, $file, array $meta) {
        $bytes = is_file($file) ? filesize($file) : 0;
        foreach (($meta['sizes'] ?? array()) as $size) {
            $path = "$dir/{$size['file']}";
            if (is_file($path)) {
                $bytes += filesize($path);
            }
        }
        return $bytes;
    }

    /* ------------------------------------------------------------------ *
     * Background queue
     * ------------------------------------------------------------------ */

    public static function get_state() {
        return wp_parse_args(get_option(self::STATE_OPTION, array()), array(
            'status'     => 'idle', // idle | running | paused | complete
            'total'      => 0,
            'processed'  => 0,
            'converted'  => 0,
            'errors'     => 0,
            'old_bytes'  => 0,
            'new_bytes'  => 0,
            'started_at' => '',
            'updated_at' => '',
            'log'        => array(),
        ));
    }

    private static function save_state(array $state) {
        $state['updated_at'] = current_time('mysql');
        $state['log']        = array_slice($state['log'], -self::LOG_LINES);
        update_option(self::STATE_OPTION, $state, false);
    }

    private static function enqueue_batch() {
        if (!function_exists('as_enqueue_async_action')) {
            return false;
        }
        if (!as_has_scheduled_action(self::HOOK_BATCH, array(), self::AS_GROUP)) {
            as_enqueue_async_action(self::HOOK_BATCH, array(), self::AS_GROUP);
        }
        return true;
    }

    public static function start() {
        delete_post_meta_by_key(self::FAILED_META); // a fresh run retries previous failures
        $pending = count(self::pending_ids());
        self::save_state(array_merge(self::get_state(), array(
            'status'     => $pending ? 'running' : 'complete',
            'total'      => $pending,
            'processed'  => 0,
            'converted'  => 0,
            'errors'     => 0,
            'old_bytes'  => 0,
            'new_bytes'  => 0,
            'started_at' => current_time('mysql'),
            'log'        => array(sprintf('[%s] Started — %d images queued', current_time('H:i:s'), $pending)),
        )));
        return $pending ? self::enqueue_batch() : true;
    }

    public static function pause() {
        $state = self::get_state();
        if ($state['status'] === 'running') {
            $state['status'] = 'paused';
            $state['log'][]  = sprintf('[%s] Paused', current_time('H:i:s'));
            self::save_state($state);
        }
    }

    public static function resume() {
        $state = self::get_state();
        if ($state['status'] === 'paused') {
            $state['status'] = 'running';
            $state['log'][]  = sprintf('[%s] Resumed', current_time('H:i:s'));
            self::save_state($state);
            self::enqueue_batch();
        }
    }

    /** Action Scheduler callback: converts one batch, then re-queues itself while work remains. */
    public static function run_batch() {
        $state = self::get_state();
        if ($state['status'] !== 'running') {
            return;
        }

        @set_time_limit(300);
        @ini_set('memory_limit', '512M');

        foreach (self::pending_ids(self::BATCH_SIZE) as $id) {
            $result = self::convert_attachment($id);
            $state['processed']++;

            if ($result['status'] === 'ok') {
                $state['converted']++;
                $state['old_bytes'] += $result['old_bytes'];
                $state['new_bytes'] += $result['new_bytes'];
                $state['log'][] = sprintf('[%s] #%d → %s (%s → %s)', current_time('H:i:s'), $id, $result['message'], size_format($result['old_bytes']), size_format($result['new_bytes']));
            } else {
                $state['errors']++;
                $state['log'][] = sprintf('[%s] #%d %s: %s', current_time('H:i:s'), $id, strtoupper($result['status']), $result['message'] ?? '');
                // Failed items stay PNG/JPEG; flag them so this run does not retry them forever.
                update_post_meta($id, self::FAILED_META, current_time('mysql'));
            }
        }

        $remaining = count(self::pending_ids());
        if ($remaining === 0) {
            $state['status'] = 'complete';
            $state['log'][]  = sprintf('[%s] Complete — %d converted, %d errors', current_time('H:i:s'), $state['converted'], $state['errors']);
        }

        self::save_state($state);

        if ($state['status'] === 'running') {
            self::enqueue_batch();
        }
    }

    /* ------------------------------------------------------------------ *
     * Auto-convert new uploads
     * ------------------------------------------------------------------ */

    public static function auto_enabled() {
        return (bool) get_option(self::AUTO_OPTION, false);
    }

    /**
     * Converts an upload array (['file','url','type']) to WebP when auto-convert is on.
     * Shared by wp_handle_upload and the FTG sync (wp_upload_bits).
     */
    public static function maybe_convert_upload(array $upload) {
        if (!self::auto_enabled() || !empty($upload['error']) || !in_array($upload['type'] ?? '', self::SOURCE_MIMES, true)) {
            return $upload;
        }

        $new = self::write_webp($upload['file']);
        if (is_wp_error($new)) {
            error_log('[Belims Image Optimizer] Auto-convert failed: ' . $new->get_error_message());
            return $upload;
        }

        @unlink($upload['file']);
        $upload['url']  = trailingslashit(dirname($upload['url'])) . basename($new);
        $upload['file'] = $new;
        $upload['type'] = 'image/webp';
        return $upload;
    }

    public static function filter_handle_upload($upload) {
        return is_array($upload) ? self::maybe_convert_upload($upload) : $upload;
    }

    /* ------------------------------------------------------------------ *
     * Archive unreferenced originals
     * ------------------------------------------------------------------ */

    public static function archive_dir() {
        $private = dirname(untrailingslashit(ABSPATH)) . '/private_html';
        return (is_dir($private) ? $private . '/belims-img' : WP_CONTENT_DIR . '/belims-image') . '/archive';
    }

    /**
     * Moves PNG/JPEG files in uploads/YYYY/MM that no attachment references into archive_dir().
     *
     * @return array{run:bool, files:int, bytes:int, dest:string}
     */
    public static function archive_unreferenced($run = false) {
        global $wpdb;
        @set_time_limit(300);

        $uploads = wp_get_upload_dir()['basedir'];
        $dest    = self::archive_dir();
        $keep    = array();

        $rows = $wpdb->get_results("SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = '_wp_attached_file'");
        foreach ($rows as $row) {
            $rel        = $row->meta_value;
            $keep[$rel] = true;
            $meta       = wp_get_attachment_metadata((int) $row->post_id) ?: array();
            $dir        = dirname($rel);
            foreach (($meta['sizes'] ?? array()) as $size) {
                $keep["$dir/{$size['file']}"] = true;
            }
            if (!empty($meta['original_image'])) {
                $keep["$dir/{$meta['original_image']}"] = true;
            }
        }

        $files = 0;
        $bytes = 0;
        $it    = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($uploads, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $file) {
            $rel = ltrim(substr($file->getPathname(), strlen($uploads)), '/');
            if (!preg_match('#^\d{4}/\d{2}/[^/]+\.(png|jpe?g)$#i', $rel) || isset($keep[$rel])) {
                continue;
            }
            $files++;
            $bytes += $file->getSize();
            if ($run) {
                wp_mkdir_p(dirname("$dest/$rel"));
                rename($file->getPathname(), "$dest/$rel");
            }
        }

        return array('run' => $run, 'files' => $files, 'bytes' => $bytes, 'dest' => $dest);
    }

    /* ------------------------------------------------------------------ *
     * Products folder
     * ------------------------------------------------------------------ */

    /** @return int[] Attachments used as a product/variation featured image, in a gallery, or uploaded to a product. */
    public static function product_image_ids() {
        global $wpdb;
        $types = "'product','product_variation'";

        $ids = $wpdb->get_col(
            "SELECT DISTINCT pm.meta_value FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type IN ($types)
             WHERE pm.meta_key = '_thumbnail_id' AND pm.meta_value > 0"
        );

        foreach ($wpdb->get_col(
            "SELECT pm.meta_value FROM {$wpdb->postmeta} pm
             JOIN {$wpdb->posts} p ON p.ID = pm.post_id AND p.post_type = 'product'
             WHERE pm.meta_key = '_product_image_gallery' AND pm.meta_value <> ''"
        ) as $gallery) {
            $ids = array_merge($ids, explode(',', $gallery));
        }

        $ids = array_merge($ids, $wpdb->get_col(
            "SELECT a.ID FROM {$wpdb->posts} a
             JOIN {$wpdb->posts} p ON p.ID = a.post_parent AND p.post_type IN ($types)
             WHERE a.post_type = 'attachment'"
        ));

        $ids = array_unique(array_filter(array_map('intval', $ids)));
        sort($ids);
        return $ids;
    }

    /** @return array{found:int, assigned:int} */
    public static function assign_product_images() {
        $found    = 0;
        $assigned = 0;
        foreach (self::product_image_ids() as $id) {
            if (get_post_type($id) !== 'attachment') {
                continue;
            }
            $found++;
            if (Belims_Media_Folders::assign_to($id, 'products')) {
                $assigned++;
            }
        }
        update_option('belims_products_folder_last_run', array('time' => current_time('mysql'), 'found' => $found, 'assigned' => $assigned), false);
        return array('found' => $found, 'assigned' => $assigned);
    }

    /* ------------------------------------------------------------------ *
     * Dashboard stats + AJAX
     * ------------------------------------------------------------------ */

    public static function stats() {
        global $wpdb;
        $rows = $wpdb->get_results(
            "SELECT post_mime_type AS mime, COUNT(*) AS n FROM {$wpdb->posts}
             WHERE post_type = 'attachment' AND post_mime_type LIKE 'image/%' GROUP BY post_mime_type",
            OBJECT_K
        );
        $count = fn($mime) => isset($rows[$mime]) ? (int) $rows[$mime]->n : 0;

        return array(
            'webp'          => $count('image/webp'),
            'pending'       => count(self::pending_ids()),
            'failed'        => (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = %s", self::FAILED_META)),
            'auto'          => self::auto_enabled(),
            'queue'         => function_exists('as_enqueue_async_action'),
            'imagick'       => class_exists('Imagick'),
            'archive_dir'   => self::archive_dir(),
            'products_last' => get_option('belims_products_folder_last_run', null),
            'state'         => self::get_state(),
        );
    }

    private function guard() {
        check_ajax_referer('belims_media_tools', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Insufficient permissions'), 403);
        }
    }

    public function ajax_status() {
        $this->guard();
        wp_send_json_success(self::stats());
    }

    public function ajax_start() {
        $this->guard();
        if (!self::start()) {
            wp_send_json_error(array('message' => 'Action Scheduler (WooCommerce) is not available.'));
        }
        wp_send_json_success(self::stats());
    }

    public function ajax_pause() {
        $this->guard();
        self::pause();
        wp_send_json_success(self::stats());
    }

    public function ajax_resume() {
        $this->guard();
        self::resume();
        wp_send_json_success(self::stats());
    }

    public function ajax_archive() {
        $this->guard();
        $result = self::archive_unreferenced(!empty($_POST['run']));
        $result['size'] = size_format($result['bytes']);
        wp_send_json_success($result);
    }

    public function ajax_assign_products() {
        $this->guard();
        wp_send_json_success(self::assign_product_images());
    }

    public function ajax_toggle_auto() {
        $this->guard();
        update_option(self::AUTO_OPTION, !empty($_POST['enabled']) ? 1 : 0);
        wp_send_json_success(self::stats());
    }
}

new Belims_Image_Optimizer();
