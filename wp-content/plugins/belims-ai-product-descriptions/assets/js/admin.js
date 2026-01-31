/**
 * Belims AI Product Descriptions - Admin JavaScript
 */
(function ($) {
  "use strict";

  let generatedDescription = "";

  $(document).ready(function () {
    // Generate AI Description button
    $("#belims-generate-ai-desc-btn").on("click", function (e) {
      e.preventDefault();
      generateAIDescription();
    });

    // Apply AI Description button
    $("#belims-apply-ai-desc-btn").on("click", function (e) {
      e.preventDefault();
      applyDescriptionToProduct();
    });
  });

  /**
   * Generate AI description via AJAX
   */
  function generateAIDescription() {
    const $button = $("#belims-generate-ai-desc-btn");
    const $loading = $("#belims-ai-loading");
    const $result = $("#belims-ai-result");
    const $error = $("#belims-ai-error");
    const $applyBtn = $("#belims-apply-ai-desc-btn");

    // Reset UI
    $result.hide();
    $error.hide();
    $applyBtn.hide();

    // Show loading state
    $button.prop("disabled", true);
    $loading.show();

    // Make AJAX request
    $.ajax({
      url: belimsAI.ajax_url,
      type: "POST",
      data: {
        action: "belims_generate_ai_description",
        nonce: belimsAI.nonce,
        product_id: belimsAI.product_id,
      },
      success: function (response) {
        $loading.hide();
        $button.prop("disabled", false);

        if (response.success) {
          generatedDescription = response.data.description;
          displayGeneratedDescription(generatedDescription);
          $result.show();
          $applyBtn.show();
        } else {
          showError(response.data.message || belimsAI.strings.error);
        }
      },
      error: function (xhr, status, error) {
        $loading.hide();
        $button.prop("disabled", false);
        showError(belimsAI.strings.error + " " + error);
      },
    });
  }

  /**
   * Display the generated description in the preview area
   */
  function displayGeneratedDescription(description) {
    const $preview = $("#belims-ai-description-preview");

    // Convert markdown-style formatting to HTML if needed
    let formattedDescription = description;

    // Convert **text** to <strong>text</strong>
    formattedDescription = formattedDescription.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>",
    );

    // Convert line breaks
    formattedDescription = formattedDescription.replace(/\n/g, "<br>");

    $preview.html(formattedDescription);
  }

  /**
   * Apply the generated description to the product
   */
  function applyDescriptionToProduct() {
    if (!generatedDescription) {
      showError("No description to apply.");
      return;
    }

    // Check if we're using the Classic Editor or Gutenberg
    if (typeof tinymce !== "undefined" && tinymce.get("content")) {
      // Classic Editor (TinyMCE)
      const editor = tinymce.get("content");
      if (editor) {
        // Convert line breaks to paragraphs for WordPress editor
        const formattedDesc = generatedDescription
          .replace(/\n\n/g, "</p><p>")
          .replace(/\n/g, "<br>");
        editor.setContent("<p>" + formattedDesc + "</p>");

        // Trigger change event
        editor.fire("change");

        showSuccess();
      }
    } else if (
      typeof wp !== "undefined" &&
      wp.data &&
      wp.data.select("core/editor")
    ) {
      // Gutenberg Editor
      try {
        const blocks = wp.blocks.parse(generatedDescription);
        wp.data.dispatch("core/editor").resetBlocks(blocks);
        showSuccess();
      } catch (error) {
        // Fallback: insert as paragraph block
        const block = wp.blocks.createBlock("core/paragraph", {
          content: generatedDescription,
        });
        wp.data.dispatch("core/editor").insertBlocks(block);
        showSuccess();
      }
    } else {
      // Fallback: try to find and fill a textarea
      const $contentField = $("#content");
      if ($contentField.length) {
        $contentField.val(generatedDescription);
        showSuccess();
      } else {
        showError(
          "Could not find the product description field. Please copy and paste the description manually.",
        );
      }
    }
  }

  /**
   * Show success message
   */
  function showSuccess() {
    // Create a temporary success notice
    const $notice = $(
      '<div class="notice notice-success is-dismissible" style="margin: 10px 0;"><p>' +
        belimsAI.strings.success +
        "</p></div>",
    );
    $("#belims-ai-result").after($notice);

    // Auto-dismiss after 3 seconds
    setTimeout(function () {
      $notice.fadeOut(function () {
        $(this).remove();
      });
    }, 3000);

    // Highlight the Apply button briefly
    $("#belims-apply-ai-desc-btn").addClass("button-primary-highlighted");
    setTimeout(function () {
      $("#belims-apply-ai-desc-btn").removeClass("button-primary-highlighted");
    }, 1000);
  }

  /**
   * Show error message
   */
  function showError(message) {
    const $error = $("#belims-ai-error");
    const $errorMessage = $("#belims-ai-error-message");

    $errorMessage.text(message);
    $error.show();

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      $error.fadeOut();
    }, 5000);
  }
})(jQuery);
