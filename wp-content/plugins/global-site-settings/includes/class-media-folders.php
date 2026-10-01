<?php
/**
 * Media Folders
 *
 * Hierarchical `media_folder` taxonomy on attachments: Media → Folders admin page,
 * folder column + filter in the Media Library (list and grid), folder field on each
 * attachment, and seeded top-level folders.
 *
 * @package GlobalSiteSettings
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Media_Folders {

    const TAXONOMY = 'media_folder';

    const SEED_VERSION = 1;

    const DEFAULT_FOLDERS = array('Global', 'Products', 'Brands', 'Campaigns');

    public function __construct() {
        add_action('init', array($this, 'register_taxonomy'));
        add_action('admin_init', array($this, 'seed_default_folders'));
        add_action('restrict_manage_posts', array($this, 'render_list_filter'));
        add_filter('ajax_query_attachments_args', array($this, 'filter_grid_query'));
        add_action('wp_enqueue_media', array($this, 'enqueue_grid_filter'));
    }

    public function register_taxonomy() {
        register_taxonomy(self::TAXONOMY, 'attachment', array(
            'labels' => array(
                'name'          => 'Folders',
                'singular_name' => 'Folder',
                'menu_name'     => 'Folders',
                'all_items'     => 'All Folders',
                'edit_item'     => 'Edit Folder',
                'add_new_item'  => 'Add New Folder',
                'parent_item'   => 'Parent Folder',
                'search_items'  => 'Search Folders',
                'not_found'     => 'No folders found',
            ),
            'hierarchical'          => true,
            'public'                => false,
            'show_ui'               => true,
            'show_in_menu'          => true,
            'show_admin_column'     => true,
            'show_in_rest'          => true,
            'query_var'             => true,
            'rewrite'               => false,
            'update_count_callback' => '_update_generic_term_count',
        ));
    }

    public function seed_default_folders() {
        if ((int) get_option('belims_media_folders_seeded') >= self::SEED_VERSION) {
            return;
        }

        foreach (self::DEFAULT_FOLDERS as $name) {
            if (!term_exists($name, self::TAXONOMY, 0)) {
                wp_insert_term($name, self::TAXONOMY);
            }
        }

        update_option('belims_media_folders_seeded', self::SEED_VERSION);
    }

    /**
     * Adds an attachment to a folder (by slug), keeping any folders it is already in.
     * Creates top-level folder if missing.
     *
     * @return bool True when newly assigned, false when already in the folder or on failure.
     */
    public static function assign_to($attachment_id, $slug) {
        $term = get_term_by('slug', $slug, self::TAXONOMY);
        if (!$term) {
            $created = wp_insert_term(ucfirst($slug), self::TAXONOMY, array('slug' => $slug));
            if (is_wp_error($created)) {
                return false;
            }
            $term = get_term($created['term_id'], self::TAXONOMY);
        }

        if (has_term($term->term_id, self::TAXONOMY, $attachment_id)) {
            return false;
        }

        return !is_wp_error(wp_set_object_terms($attachment_id, array((int) $term->term_id), self::TAXONOMY, true));
    }

    /** Folder dropdown on Media Library list view. */
    public function render_list_filter($post_type) {
        if ($post_type !== 'attachment') {
            return;
        }

        wp_dropdown_categories(array(
            'taxonomy'        => self::TAXONOMY,
            'name'            => self::TAXONOMY,
            'value_field'     => 'slug',
            'selected'        => sanitize_title(wp_unslash($_GET[self::TAXONOMY] ?? '')),
            'show_option_none'  => 'All folders',
            'option_none_value' => '',
            'hierarchical'    => true,
            'hide_empty'      => false,
            'orderby'         => 'name',
        ));
    }

    /** Applies the grid-view folder filter to the media modal query. */
    public function filter_grid_query($query) {
        $slug = sanitize_title(wp_unslash($_REQUEST['query'][self::TAXONOMY] ?? ''));
        if ($slug !== '') {
            $query['tax_query'] = array(array(
                'taxonomy' => self::TAXONOMY,
                'field'    => 'slug',
                'terms'    => $slug,
            ));
        }
        return $query;
    }

    public function enqueue_grid_filter() {
        $terms = get_terms(array(
            'taxonomy'   => self::TAXONOMY,
            'hide_empty' => false,
            'orderby'    => 'name',
        ));
        if (is_wp_error($terms)) {
            return;
        }

        wp_enqueue_script(
            'belims-media-folders',
            GLOBAL_SITE_SETTINGS_PLUGIN_URL . 'assets/js/media-folders.js',
            array('media-views'),
            GLOBAL_SITE_SETTINGS_VERSION,
            true
        );
        wp_localize_script('belims-media-folders', 'belimsMediaFolders', array(
            'taxonomy' => self::TAXONOMY,
            'label'    => 'All folders',
            'folders'  => array_map(fn($t) => array('slug' => $t->slug, 'name' => $t->name), $terms),
        ));
    }
}

new Belims_Media_Folders();
