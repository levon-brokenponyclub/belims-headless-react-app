<?php
/**
 * Google Shopping product feed (RSS 2.0 + g: namespace).
 *
 * GET /wp-json/belims/v1/feeds/products.xml — every sellable product (same rule as the storefront,
 * Belims_Products_Endpoint::is_sellable()) with links to the storefront from get_frontend_url().
 * Consumed by the Text (LiveChat) AI Agent "Recommend products" skill, which syncs it hourly.
 *
 * Cached until the product cache version changes (any product, stock, price, category or brand edit).
 *
 * @package Global_Site_Settings
 * @since 2.12.0
 */

if (!defined('ABSPATH')) {
    exit;
}

class Belims_Product_Feed {

    const ROUTE         = '/feeds/products.xml';
    const CACHE_PREFIX  = 'belims_product_feed_';
    const BATCH         = 200;
    const MAX_IMAGES    = 10; // image_link + up to 9 additional_image_link
    const MAX_TITLE     = 150;
    const MAX_DESC      = 5000;

    public function register_routes() {
        register_rest_route('belims/v1', self::ROUTE, array(
            'methods'             => 'GET',
            'callback'            => array($this, 'get_feed'),
            'permission_callback' => '__return_true',
        ));
        add_filter('rest_pre_serve_request', array($this, 'serve_xml'), 10, 4);
    }

    public function get_feed($request) {
        $version = (string) get_option(Belims_Products_Endpoint::CACHE_VERSION_OPTION, '0');
        $key     = self::CACHE_PREFIX . md5($version . '|' . get_frontend_url());
        $xml     = get_transient($key);
        if (!is_string($xml) || $xml === '') {
            $xml = $this->build_feed();
            set_transient($key, $xml, DAY_IN_SECONDS);
        }
        return new WP_REST_Response($xml, 200);
    }

    /** Send the feed as raw XML instead of a JSON-encoded string. */
    public function serve_xml($served, $result, $request, $server) {
        if ($served || $request->get_route() !== '/belims/v1' . self::ROUTE || $result->get_status() !== 200) {
            return $served;
        }
        header('Content-Type: application/xml; charset=UTF-8');
        header('Cache-Control: public, max-age=900');
        echo $result->get_data(); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped per field in build_feed()
        return true;
    }

    private function build_feed() {
        $base     = rtrim(get_frontend_url(), '/');
        $currency = get_woocommerce_currency();
        $items    = array();

        for ($page = 1; ; $page++) {
            $products = wc_get_products(array(
                'status'  => 'publish',
                'limit'   => self::BATCH,
                'page'    => $page,
                'orderby' => 'ID',
                'order'   => 'ASC',
            ));
            foreach ($products as $product) {
                if ($product->is_visible() && Belims_Products_Endpoint::is_sellable($product)) {
                    $item = $this->item_xml($product, $base, $currency);
                    if ($item !== '') {
                        $items[] = $item;
                    }
                }
            }
            if (count($products) < self::BATCH) {
                break;
            }
        }

        return '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
            . '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">' . "\n<channel>\n"
            . '<title>' . self::esc(get_bloginfo('name')) . "</title>\n"
            . '<link>' . self::esc($base) . "</link>\n"
            . '<description>' . self::esc(get_bloginfo('name') . ' product feed') . "</description>\n"
            . implode('', $items)
            . "</channel>\n</rss>\n";
    }

    private function item_xml($product, $base, $currency) {
        $images = array_filter(array_merge(array($product->get_image_id()), $product->get_gallery_image_ids()));
        $urls   = array();
        foreach (array_slice($images, 0, self::MAX_IMAGES) as $id) {
            $url = wp_get_attachment_url($id);
            if ($url) {
                $urls[] = $url;
            }
        }
        if (empty($urls)) {
            return ''; // Google requires image_link
        }

        $id    = $product->get_id();
        $title = self::text($product->get_name(), self::MAX_TITLE);
        $desc  = self::text($product->get_description() ?: $product->get_short_description(), self::MAX_DESC) ?: $title;
        $slug  = $product->get_slug() ?: sanitize_title($product->get_name());

        $regular = (float) $product->get_regular_price();
        $sale    = (float) $product->get_sale_price();
        $price   = $regular > 0 ? $regular : (float) $product->get_price();

        $fields = array(
            'g:id'                => (string) $id,
            'title'               => $title,
            'description'         => $desc,
            'link'                => $base . '/product/' . $slug . '-' . $id,
            'g:image_link'        => array_shift($urls),
            'g:availability'      => 'in_stock', // is_sellable() guarantees in stock
            'g:price'             => self::money($price, $currency),
            'g:condition'         => 'new',
            'g:identifier_exists' => 'no',
        );
        if ($product->is_on_sale() && $sale > 0 && $sale < $price) {
            $fields['g:sale_price'] = self::money($sale, $currency);
        }
        $brands = wp_get_post_terms($id, 'product_brand', array('fields' => 'names'));
        if (!is_wp_error($brands) && !empty($brands)) {
            $fields['g:brand'] = html_entity_decode($brands[0], ENT_QUOTES, 'UTF-8');
        }
        if ($product->get_sku()) {
            $fields['g:mpn'] = $product->get_sku();
        }
        $type = $this->category_path($id);
        if ($type !== '') {
            $fields['g:product_type'] = $type;
        }

        $xml = "<item>\n";
        foreach ($fields as $tag => $value) {
            $xml .= "<$tag>" . self::esc($value) . "</$tag>\n";
        }
        foreach ($urls as $url) {
            $xml .= '<g:additional_image_link>' . self::esc($url) . "</g:additional_image_link>\n";
        }
        return $xml . "</item>\n";
    }

    /** Deepest category with its ancestors, e.g. "Tools and Machinery > Hand Tools > Spanners and Sockets". */
    private function category_path($product_id) {
        $default = (int) get_option('default_product_cat');
        $deepest = null;
        $depth   = -1;
        foreach (wp_get_post_terms($product_id, 'product_cat') as $cat) {
            if ((int) $cat->term_id === $default) {
                continue;
            }
            $d = count(get_ancestors($cat->term_id, 'product_cat'));
            if ($d > $depth) {
                $depth   = $d;
                $deepest = $cat;
            }
        }
        if (!$deepest) {
            return '';
        }
        $names = array();
        foreach (array_reverse(get_ancestors($deepest->term_id, 'product_cat')) as $ancestor_id) {
            $term = get_term($ancestor_id, 'product_cat');
            if ($term && !is_wp_error($term)) {
                $names[] = $term->name;
            }
        }
        $names[] = $deepest->name;
        return html_entity_decode(implode(' > ', $names), ENT_QUOTES, 'UTF-8');
    }

    /** Plain text: tags stripped, entities decoded, whitespace collapsed, trimmed to $max characters. */
    private static function text($html, $max) {
        $text = html_entity_decode(wp_strip_all_tags((string) $html), ENT_QUOTES, 'UTF-8');
        $text = trim(preg_replace('/\s+/u', ' ', $text));
        return mb_strlen($text) > $max ? rtrim(mb_substr($text, 0, $max - 1)) . '…' : $text;
    }

    private static function money($amount, $currency) {
        return number_format((float) $amount, 2, '.', '') . ' ' . $currency;
    }

    /** XML-escape and drop characters XML 1.0 forbids. */
    private static function esc($value) {
        $value = preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}]/u', '', (string) $value);
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
