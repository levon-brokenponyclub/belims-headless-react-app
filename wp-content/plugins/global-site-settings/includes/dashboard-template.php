<?php
/**
 * Global Site Settings Dashboard Template
 * Modern refactored dashboard with scalable CSS classes
 */

if (!defined('ABSPATH')) exit;
?>

<div class="wrap bpc-dash-wrapper">
    
    <!-- Header -->
    <header class="bpc-dash-header">
        <div class="bpc-dash-header__inner">
            <div class="bpc-dash-header__brand">
                <!-- <svg class="bpc-dash-header__logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="8" fill="currentColor"/>
                    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" style="font-size: 18px; font-weight: bold; fill: white;">B</text>
                </svg> -->
                <h1 class="bpc-dash-header__title">Belims Site Settings</h1>
            </div>
            <div class="bpc-dash-header__actions">
                <button id="belims-clear-cache-header" class="bpc-dash-btn bpc-dash-btn--secondary">
                    Clear Cache
                </button>
                <span class="bpc-dash-header__version">v<?php echo GLOBAL_SITE_SETTINGS_VERSION; ?></span>
            </div>
        </div>
    </header>

    <div class="bpc-dash-content">
        <!-- Sidebar -->
        <aside class="bpc-dash-sidebar">
            <nav class="bpc-dash-sidebar__nav">
                <!-- Dashboard -->
                <a href="#tab-dashboard" class="bpc-dash-nav-item bpc-dash-nav-item--active" data-tab="dashboard">
                    <svg class="bpc-dash-nav-item__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 9l7-4"></path>
                    </svg>
                    <span>Dashboard</span>
                </a>

                <!-- FTG Sync -->
                <a href="#tab-ftg-sync" class="bpc-dash-nav-item" data-tab="ftg-sync">
                    <svg class="bpc-dash-nav-item__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                    </svg>
                    <span>FTG Sync</span>
                </a>

                <!-- WooCommerce -->
                <a href="#tab-woocommerce" class="bpc-dash-nav-item" data-tab="woocommerce">
                    <svg class="bpc-dash-nav-item__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <span>WooCommerce</span>
                </a>

                <!-- APIs -->
                <a href="#tab-apis" class="bpc-dash-nav-item" data-tab="apis">
                    <svg class="bpc-dash-nav-item__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <span>APIs</span>
                </a>

                <!-- Settings -->
                <a href="#tab-settings" class="bpc-dash-nav-item" data-tab="settings">
                    <svg class="bpc-dash-nav-item__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span>Settings</span>
                </a>

                <hr class="bpc-dash-sidebar__divider">

                <!-- Footer Info -->
                <div class="bpc-dash-sidebar__footer">
                    <div class="bpc-dash-sidebar__footer-title">Belims CMS</div>
                    <div>By Broken Pony Club</div>
                    <div class="bpc-dash-sidebar__footer-divider">
                        Deployed: <br>
                        <span class="bpc-dash-sidebar__deploy-time">
                            <?php echo defined('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP') ? GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP : 'N/A'; ?>
                        </span>
                    </div>
                </div>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="bpc-dash-main">
            <div class="bpc-dash-main__container">
                
                <!-- Main Content Placeholder -->
                <div class="bpc-dash-card bpc-dash-card--centered">
                    <svg class="bpc-dash-card__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h2 class="bpc-dash-card__title">Dashboard Ready</h2>
                    <p class="bpc-dash-card__description">Modern dashboard structure created. Ready to add content.</p>
                </div>

            </div>
        </main>

    </div>

</div>

<script>
jQuery(document).ready(function($) {
    // Clear cache button functionality
    $('#belims-clear-cache-header').on('click', function() {
        var cacheBuster = Math.floor(Math.random() * 1000000000);
        var url = 'https://cms.belims.co.za/wp-admin/index.php?no-cache=' + cacheBuster;
        window.open(url, '_blank');
    });
});
</script>
