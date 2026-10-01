<?php
/**
 * Homepage
 *
 * - GET /belims/v1/homepage — homepage sections (ACF `homepage_sections`) as clean JSON.
 * - The storefront bakes this in at build time; saving changed homepage content
 *   triggers the Vercel deploy hook (debounced via Action Scheduler).
 * - Site Settings → Homepage tab: deploy hook URL, publish button, live-version check.
 *
 * @package GlobalSiteSettings
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Homepage {

    const HOOK_OPTION    = 'belims_vercel_deploy_hook';
    const VERSION_OPTION = 'belims_homepage_version';
    const DEPLOY_LOG     = 'belims_homepage_deploy_log';
    const DEPLOY_ACTION  = 'belims_homepage_deploy';
    const AS_GROUP       = 'belims-homepage';
    const DEBOUNCE       = 60; // seconds — coalesces rapid saves into one build
    const HOOK_PREFIX    = 'https://api.vercel.com/v1/integrations/deploy/';

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('acf/save_post', array($this, 'on_options_saved'), 20);
        add_action(self::DEPLOY_ACTION, array(__CLASS__, 'trigger_deploy'));

        foreach (array('status', 'publish', 'save_hook') as $action) {
            add_action("wp_ajax_belims_homepage_$action", array($this, "ajax_$action"));
        }
    }

    /* ------------------------------------------------------------------ *
     * Payload
     * ------------------------------------------------------------------ */

    public function register_routes() {
        register_rest_route('belims/v1', '/homepage', array(
            'methods'             => 'GET',
            'callback'            => array($this, 'get_homepage'),
            'permission_callback' => '__return_true',
        ));
    }

    public function get_homepage() {
        $response = rest_ensure_response(self::payload());
        $response->header('Cache-Control', 'public, max-age=60');
        return $response;
    }

    /** @return array{version:string, sections:array} */
    public static function payload() {
        $sections = array();
        $rows     = function_exists('get_field') ? get_field('homepage_sections', 'option') : array();

        foreach ((array) $rows as $row) {
            if (($row['acf_fc_layout'] ?? '') === 'hero' && !empty($row['enabled'])) {
                $hero = self::hero($row);
                if ($hero) {
                    $sections[] = $hero;
                }
            }
        }

        return array(
            'version'  => substr(md5(wp_json_encode($sections)), 0, 12),
            'sections' => $sections,
        );
    }

    private static function hero(array $row) {
        $image = self::image((int) ($row['image'] ?? 0), (string) ($row['alt'] ?? ''));
        if (!$image || trim((string) ($row['title'] ?? '')) === '') {
            return null;
        }

        return array(
            'type'         => 'hero',
            'title'        => sanitize_text_field($row['title']),
            'description'  => sanitize_text_field($row['description'] ?? ''),
            'button'       => array(
                'text' => sanitize_text_field($row['button_text'] ?? '') ?: 'Shop Now',
                'link' => esc_url_raw($row['button_link'] ?? '') ?: '/shop',
            ),
            'image'        => $image,
            'image_mobile' => self::image((int) ($row['image_mobile'] ?? 0), $image['alt']),
        );
    }

    private static function image($id, $alt) {
        $src = $id ? wp_get_attachment_image_src($id, 'full') : false;
        if (!$src) {
            return null;
        }
        $alt = trim($alt) !== '' ? $alt : (string) get_post_meta($id, '_wp_attachment_image_alt', true);

        return array(
            'url'    => $src[0],
            'width'  => (int) $src[1],
            'height' => (int) $src[2],
            'alt'    => sanitize_text_field($alt),
        );
    }

    /* ------------------------------------------------------------------ *
     * Deploy on save
     * ------------------------------------------------------------------ */

    /** Runs after every ACF options save; schedules a build only when homepage content changed. */
    public function on_options_saved($post_id) {
        if ($post_id !== 'options') {
            return;
        }

        $version = self::payload()['version'];
        if ($version === get_option(self::VERSION_OPTION)) {
            return;
        }

        update_option(self::VERSION_OPTION, $version, false);
        self::schedule_deploy();
    }

    public static function schedule_deploy() {
        if (!function_exists('as_schedule_single_action') || as_has_scheduled_action(self::DEPLOY_ACTION, array(), self::AS_GROUP)) {
            return;
        }
        as_schedule_single_action(time() + self::DEBOUNCE, self::DEPLOY_ACTION, array(), self::AS_GROUP);
    }

    /** Calls the Vercel deploy hook and records the result. */
    public static function trigger_deploy() {
        $hook = (string) get_option(self::HOOK_OPTION, '');
        $log  = array('time' => current_time('mysql'), 'version' => self::payload()['version']);

        if ($hook === '') {
            $log['result'] = 'No deploy hook configured';
        } else {
            $response      = wp_remote_post($hook, array('timeout' => 15));
            $code          = is_wp_error($response) ? 0 : (int) wp_remote_retrieve_response_code($response);
            $log['result'] = is_wp_error($response)
                ? 'Error: ' . $response->get_error_message()
                : ($code >= 200 && $code < 300 ? 'Build started' : "Vercel responded HTTP $code");
        }

        update_option(self::DEPLOY_LOG, $log, false);
        return $log;
    }

    /** Version the storefront was last built with (from its homepage-version.json). */
    public static function live_version() {
        $base = function_exists('get_frontend_url') ? get_frontend_url() : '';
        if (!$base) {
            return null;
        }
        $response = wp_remote_get(trailingslashit($base) . 'homepage-version.json?ts=' . time(), array('timeout' => 8));
        if (is_wp_error($response) || (int) wp_remote_retrieve_response_code($response) !== 200) {
            return null;
        }
        $data = json_decode(wp_remote_retrieve_body($response), true);
        return is_array($data) ? $data : null;
    }

    /* ------------------------------------------------------------------ *
     * Admin AJAX
     * ------------------------------------------------------------------ */

    public static function status() {
        $hook = (string) get_option(self::HOOK_OPTION, '');
        $live = self::live_version();
        $current = self::payload()['version'];

        return array(
            'current'      => $current,
            'live'         => $live,
            'in_sync'      => $live && ($live['version'] ?? '') === $current,
            'hook_set'     => $hook !== '',
            'hook_masked'  => $hook !== '' ? substr($hook, 0, strlen(self::HOOK_PREFIX) + 6) . '••••••••' : '',
            'pending'      => function_exists('as_has_scheduled_action') && as_has_scheduled_action(self::DEPLOY_ACTION, array(), self::AS_GROUP),
            'last_deploy'  => get_option(self::DEPLOY_LOG, null),
        );
    }

    private function guard() {
        check_ajax_referer('belims_homepage_tools', 'nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Insufficient permissions'), 403);
        }
    }

    public function ajax_status() {
        $this->guard();
        wp_send_json_success(self::status());
    }

    public function ajax_publish() {
        $this->guard();
        update_option(self::VERSION_OPTION, self::payload()['version'], false);
        self::trigger_deploy();
        wp_send_json_success(self::status());
    }

    public function ajax_save_hook() {
        $this->guard();
        $hook = esc_url_raw(trim(wp_unslash($_POST['hook'] ?? '')));
        if ($hook !== '' && strpos($hook, self::HOOK_PREFIX) !== 0) {
            wp_send_json_error(array('message' => 'Paste a Vercel Deploy Hook URL (starts with ' . self::HOOK_PREFIX . ').'));
        }
        update_option(self::HOOK_OPTION, $hook, false);
        wp_send_json_success(self::status());
    }
}

new Belims_Homepage();
