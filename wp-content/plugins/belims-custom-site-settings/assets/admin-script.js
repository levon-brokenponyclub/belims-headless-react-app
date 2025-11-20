/**
 * Belims Site Settings - Admin JavaScript
 */

(function($) {
    'use strict';

    $(document).ready(function() {
        // Initialize admin functionality
        initTabNavigation();
        initFormHandling();
        initFieldInteractions();
    });

    /**
     * Initialize tab navigation
     */
    function initTabNavigation() {
        // Smooth scrolling for mobile tabs
        var $tabNav = $('.belims-tab-nav ul');
        var $activeTab = $('.belims-tab-nav li.active');
        
        if ($activeTab.length && window.innerWidth <= 1024) {
            $tabNav.scrollLeft($activeTab.position().left - 20);
        }

        // Highlight active section in nav when scrolling (for single page view)
        $(window).on('scroll', function() {
            highlightCurrentSection();
        });
    }

    /**
     * Initialize form handling
     */
    function initFormHandling() {
        // Show loading state on form submission
        $('.belims-form-container form').on('submit', function() {
            var $submitBtn = $(this).find('.button-primary');
            var originalText = $submitBtn.val();
            
            $submitBtn
                .val('Saving...')
                .prop('disabled', true)
                .addClass('updating-message');

            // Re-enable after a delay in case of error
            setTimeout(function() {
                $submitBtn
                    .val(originalText)
                    .prop('disabled', false)
                    .removeClass('updating-message');
            }, 10000);
        });

        // Auto-save indication for certain fields
        $('.belims-form-container').on('change', 'input, textarea, select', function() {
            var $field = $(this);
            var $fieldWrap = $field.closest('.acf-field');
            
            // Add changed indicator
            if (!$fieldWrap.hasClass('field-changed')) {
                $fieldWrap.addClass('field-changed');
                
                // Add visual indicator
                if (!$fieldWrap.find('.field-changed-indicator').length) {
                    $fieldWrap.find('.acf-label').append('<span class="field-changed-indicator" title="Unsaved changes">*</span>');
                }
            }
        });

        // Remove change indicators after successful save
        if (window.location.search.indexOf('updated=true') !== -1) {
            setTimeout(function() {
                $('.field-changed').removeClass('field-changed');
                $('.field-changed-indicator').remove();
                
                // Show success message
                showNotification('Settings saved successfully!', 'success');
            }, 100);
        }
    }

    /**
     * Initialize field interactions
     */
    function initFieldInteractions() {
        // Image field preview enhancement
        $('.belims-form-container').on('click', '.acf-image-uploader .image-wrap img', function() {
            var $img = $(this);
            openImagePreview($img.attr('src'), $img.attr('alt') || 'Image preview');
        });

        // Color field enhancements
        $('.belims-form-container input[type="color"]').each(function() {
            enhanceColorField($(this));
        });

        // Number field validation
        $('.belims-form-container input[type="number"]').on('input', function() {
            validateNumberField($(this));
        });

        // URL field validation
        $('.belims-form-container input[type="url"]').on('blur', function() {
            validateUrlField($(this));
        });
    }

    /**
     * Highlight current section in navigation
     */
    function highlightCurrentSection() {
        // This would be used if we had a single-page view with anchor navigation
        // Currently not needed since we're using separate tab pages
    }

    /**
     * Show notification message
     */
    function showNotification(message, type) {
        type = type || 'info';
        
        var $notice = $('<div class="notice notice-' + type + ' is-dismissible"><p>' + message + '</p><button type="button" class="notice-dismiss"></button></div>');
        
        $('.wrap h1').after($notice);
        
        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            $notice.fadeOut(300, function() {
                $(this).remove();
            });
        }, 5000);

        // Manual dismiss
        $notice.find('.notice-dismiss').on('click', function() {
            $notice.fadeOut(300, function() {
                $(this).remove();
            });
        });
    }

    /**
     * Open image preview modal
     */
    function openImagePreview(src, alt) {
        var $modal = $('<div class="belims-image-modal"><div class="modal-content"><img src="' + src + '" alt="' + alt + '"><button class="modal-close">&times;</button></div></div>');
        
        $('body').append($modal);
        
        $modal.on('click', function(e) {
            if (e.target === this || $(e.target).hasClass('modal-close')) {
                $modal.fadeOut(200, function() {
                    $(this).remove();
                });
            }
        });
        
        // Add ESC key support
        $(document).on('keyup.imageModal', function(e) {
            if (e.keyCode === 27) { // ESC
                $modal.fadeOut(200, function() {
                    $(this).remove();
                });
                $(document).off('keyup.imageModal');
            }
        });
    }

    /**
     * Enhance color field
     */
    function enhanceColorField($field) {
        var $wrapper = $('<div class="color-field-wrapper"></div>');
        var $preview = $('<div class="color-preview"></div>');
        
        $field.wrap($wrapper);
        $field.after($preview);
        
        function updatePreview() {
            $preview.css('background-color', $field.val());
        }
        
        $field.on('input change', updatePreview);
        updatePreview(); // Initial update
    }

    /**
     * Validate number field
     */
    function validateNumberField($field) {
        var val = $field.val();
        var min = $field.attr('min');
        var max = $field.attr('max');
        var $fieldWrap = $field.closest('.acf-field');
        
        // Remove previous validation messages
        $fieldWrap.find('.validation-message').remove();
        $fieldWrap.removeClass('has-error');
        
        if (val !== '' && !isNaN(val)) {
            if (min && parseFloat(val) < parseFloat(min)) {
                showFieldError($field, 'Value must be at least ' + min);
            } else if (max && parseFloat(val) > parseFloat(max)) {
                showFieldError($field, 'Value must be no more than ' + max);
            }
        }
    }

    /**
     * Validate URL field
     */
    function validateUrlField($field) {
        var val = $field.val().trim();
        var $fieldWrap = $field.closest('.acf-field');
        
        // Remove previous validation messages
        $fieldWrap.find('.validation-message').remove();
        $fieldWrap.removeClass('has-error');
        
        if (val !== '' && !isValidUrl(val)) {
            showFieldError($field, 'Please enter a valid URL (include http:// or https://)');
        }
    }

    /**
     * Show field error message
     */
    function showFieldError($field, message) {
        var $fieldWrap = $field.closest('.acf-field');
        var $errorMsg = $('<div class="validation-message error">' + message + '</div>');
        
        $fieldWrap.addClass('has-error');
        $field.after($errorMsg);
    }

    /**
     * Check if URL is valid
     */
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

})(jQuery);

// Add some CSS for the JS enhancements
jQuery(document).ready(function($) {
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .field-changed-indicator {
                color: #d63638;
                font-weight: bold;
                margin-left: 5px;
            }
            
            .acf-field.has-error .acf-input input,
            .acf-field.has-error .acf-input textarea,
            .acf-field.has-error .acf-input select {
                border-color: #d63638 !important;
                box-shadow: 0 0 0 1px #d63638 !important;
            }
            
            .validation-message.error {
                color: #d63638;
                font-size: 12px;
                margin-top: 5px;
                font-style: italic;
            }
            
            .belims-image-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
            }
            
            .belims-image-modal .modal-content {
                position: relative;
                max-width: 90%;
                max-height: 90%;
            }
            
            .belims-image-modal img {
                max-width: 100%;
                max-height: 100%;
                border-radius: 4px;
            }
            
            .belims-image-modal .modal-close {
                position: absolute;
                top: -10px;
                right: -10px;
                background: #fff;
                border: none;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            
            .color-field-wrapper {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .color-preview {
                width: 30px;
                height: 30px;
                border: 1px solid #ddd;
                border-radius: 4px;
                flex-shrink: 0;
            }
        `)
        .appendTo('head');
});