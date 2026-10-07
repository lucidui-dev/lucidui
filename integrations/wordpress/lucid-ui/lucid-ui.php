<?php
/**
 * Plugin Name: Lucid UI
 * Plugin URI: https://lucidui.dev
 * Description: Mount Lucid UI apps anywhere with the [lucid] shortcode, and use @lucidui-dev/core, @lucidui-dev/core/ui and @lucidui-dev/core/viz from any script module.
 * Version: 0.3.5
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Lucid UI contributors
 * Author URI: https://lucidui.dev
 * License: MIT
 * License URI: https://opensource.org/license/mit
 * Text Domain: lucid-ui
 */

defined('ABSPATH') || exit;

const LUCID_UI_VERSION = '0.3.5';
const LUCID_UI_MODULES = ['@lucidui-dev/core', '@lucidui-dev/core/ui', '@lucidui-dev/core/viz'];

function lucid_ui_register()
{
    $assets = plugins_url('assets/', __FILE__);
    foreach (LUCID_UI_MODULES as $id) {
        wp_register_script_module($id, $assets . 'lucid.js', [], LUCID_UI_VERSION);
    }
    wp_register_script_module('lucidui/mount', $assets . 'mount.js', LUCID_UI_MODULES, LUCID_UI_VERSION);
    wp_register_style('@lucidui-dev/core', $assets . 'lucid.css', [], LUCID_UI_VERSION);
    wp_register_style('lucidui-embed', $assets . 'embed.css', ['@lucidui-dev/core'], LUCID_UI_VERSION);
    add_shortcode('lucid', 'lucid_ui_shortcode');
}
add_action('init', 'lucid_ui_register');

function lucid_ui_resolve($app)
{
    if (!is_string($app) || !preg_match('#^[a-z0-9_-]+(/[a-z0-9_-]+)*$#i', $app)) {
        return null;
    }
    $places = [
        [get_stylesheet_directory() . '/lucid/', get_stylesheet_directory_uri() . '/lucid/'],
        [get_template_directory() . '/lucid/', get_template_directory_uri() . '/lucid/'],
        [plugin_dir_path(__FILE__) . 'apps/', plugins_url('apps/', __FILE__)],
    ];
    foreach ($places as [$dir, $url]) {
        if (is_file($dir . $app . '.js')) {
            return add_query_arg('ver', filemtime($dir . $app . '.js'), $url . $app . '.js');
        }
    }
    return null;
}

function lucid_ui_shortcode($atts)
{
    $atts = is_array($atts) ? $atts : [];
    $app = $atts['app'] ?? '';
    $theme = in_array($atts['theme'] ?? 'light', ['light', 'dark', 'auto'], true) ? ($atts['theme'] ?? 'light') : 'light';
    unset($atts['app'], $atts['theme']);
    $src = lucid_ui_resolve($app);

    if (!$src) {
        if (current_user_can('edit_posts') && !preg_match('#^[a-z0-9_-]+(/[a-z0-9_-]+)*$#i', (string) $app)) {
            return '<p class="lucid-ui-missing">Lucid UI: app names use letters, numbers, dashes and slashes, like app="shop/cart".</p>';
        }
        if (current_user_can('edit_posts')) {
            return '<p class="lucid-ui-missing">' . esc_html(sprintf(
                'Lucid UI: no app called "%s". Add %s to your theme, or try app="counter".',
                (string) $app,
                'lucid/' . (string) $app . '.js'
            )) . '</p>';
        }
        return '';
    }

    wp_enqueue_style('lucidui-embed');
    wp_enqueue_script_module('lucidui/mount');

    return sprintf(
        '<div class="lucid-app lucid-ui-embed"%s data-lucid-app="%s" data-lucid-props="%s"></div>',
        $theme === 'auto' ? '' : ' data-theme="' . esc_attr($theme) . '"',
        esc_url($src),
        esc_attr(wp_json_encode((object) $atts))
    );
}
