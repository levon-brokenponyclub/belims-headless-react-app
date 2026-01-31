/**
 * Belims AI Product Descriptions - Bulk Admin JavaScript
 */
(function ($) {
  "use strict";

  let productsToProcess = [];
  let currentIndex = 0;
  let isProcessing = false;
  let shouldStop = false;
  let successCount = 0;
  let errorCount = 0;

  $(document).ready(function () {
    // Load products button
    $("#belims-load-products-btn").on("click", function (e) {
      e.preventDefault();
      loadProductsWithoutDescription();
    });

    // Dry run button
    $("#belims-dry-run-btn").on("click", function (e) {
      e.preventDefault();
      runDryRun();
    });

    // Start bulk generation button
    $("#belims-start-bulk-btn").on("click", function (e) {
      e.preventDefault();
      startBulkGeneration();
    });

    // Stop button
    $("#belims-stop-bulk-btn").on("click", function (e) {
      e.preventDefault();
      stopBulkGeneration();
    });
  });

  /**
   * Load products without descriptions
   */
  function loadProductsWithoutDescription() {
    const $button = $("#belims-load-products-btn");

    $button
      .prop("disabled", true)
      .html(
        '<span class="spinner is-active" style="float:none;margin:0 5px 0 0;"></span>' +
          belimsBulkAI.strings.loading,
      );

    $.ajax({
      url: belimsBulkAI.ajax_url,
      type: "POST",
      data: {
        action: "belims_get_products_without_description",
        nonce: belimsBulkAI.nonce,
      },
      success: function (response) {
        $button
          .prop("disabled", false)
          .html(
            '<span class="dashicons dashicons-update"></span> Reload Products',
          );

        if (response.success) {
          const data = response.data;

          // Update stats
          $("#total-products").text(data.total_products);
          $("#products-without-desc").text(data.products_without_desc);

          if (data.products.length === 0) {
            alert("Great! All products already have descriptions.");
            return;
          }

          // Store products
          productsToProcess = data.products;

          // Display products table
          displayProductsTable(data.products);

          // Show dry run and start buttons
          $("#belims-dry-run-btn").show();
          $("#belims-start-bulk-btn").show();
          $("#belims-products-table-container").show();

          logMessage(
            "success",
            `Loaded ${data.products.length} products without descriptions.`,
          );
        } else {
          alert(response.data.message || belimsBulkAI.strings.error);
        }
      },
      error: function (xhr, status, error) {
        $button
          .prop("disabled", false)
          .html(
            '<span class="dashicons dashicons-update"></span> Load Products',
          );
        alert(belimsBulkAI.strings.error + " " + error);
      },
    });
  }

  /**
   * Display products in table
   */
  function displayProductsTable(products) {
    const $tbody = $("#belims-products-tbody");
    $tbody.empty();

    products.forEach(function (product, index) {
      const row = `
                <tr data-product-id="${product.id}" data-index="${index}">
                    <td>${product.id}</td>
                    <td><strong>${escapeHtml(product.name)}</strong><br><small>SKU: ${product.sku || "N/A"}</small></td>
                    <td>${escapeHtml(product.category || "Uncategorized")}</td>
                    <td class="status-cell">
                        <span class="status-badge status-pending">Pending</span>
                    </td>
                </tr>
                <tr class="description-preview-row" data-index="${index}" style="display:none;">
                    <td colspan="4">
                        <div class="description-preview-container">
                            <div class="description-preview-header">
                                <strong>AI Generated Description Preview:</strong>
                            </div>
                            <div class="description-preview-content"></div>
                        </div>
                    </td>
                </tr>
            `;
      $tbody.append(row);
    });
  }

  /**
   * Run dry run - generate descriptions for first 3 products without saving
   */
  function runDryRun() {
    if (productsToProcess.length === 0) {
      alert("No products to process.");
      return;
    }

    const productsToTest = productsToProcess.slice(0, 3);
    const $button = $("#belims-dry-run-btn");

    $button
      .prop("disabled", true)
      .html(
        '<span class="spinner is-active" style="float:none;margin:0 5px 0 0;"></span> Running Dry Run...',
      );

    logMessage(
      "info",
      `Starting dry run with ${productsToTest.length} products...`,
    );

    // Process each product
    let completed = 0;
    productsToTest.forEach(function (product, index) {
      const $row = $(`tr[data-product-id="${product.id}"]`);
      const $previewRow = $(`.description-preview-row[data-index="${index}"]`);

      $row
        .find(".status-badge")
        .removeClass("status-pending")
        .addClass("status-processing")
        .html(
          '<span class="spinner is-active" style="float:none;margin:0;"></span> Generating...',
        );

      // Make AJAX request to generate description (without saving)
      $.ajax({
        url: belimsBulkAI.ajax_url,
        type: "POST",
        data: {
          action: "belims_dry_run_generate_description",
          nonce: belimsBulkAI.nonce,
          product_id: product.id,
        },
        success: function (response) {
          if (response.success) {
            $row
              .find(".status-badge")
              .removeClass("status-processing")
              .addClass("status-success")
              .html("✓ Preview Generated");

            // Display the preview
            $previewRow
              .find(".description-preview-content")
              .html(formatDescription(response.data.description));
            $previewRow.fadeIn();

            logMessage("success", `✓ Generated preview for: ${product.name}`);
          } else {
            $row
              .find(".status-badge")
              .removeClass("status-processing")
              .addClass("status-error")
              .html("✗ Error");

            logMessage(
              "error",
              `✗ Failed for ${product.name}: ${response.data.message}`,
            );
          }

          completed++;
          if (completed === productsToTest.length) {
            $button
              .prop("disabled", false)
              .html(
                '<span class="dashicons dashicons-visibility"></span> Dry Run',
              );
            logMessage(
              "success",
              "Dry run complete! Review the previews above.",
            );
          }
        },
        error: function (xhr, status, error) {
          $row
            .find(".status-badge")
            .removeClass("status-processing")
            .addClass("status-error")
            .html("✗ Error");

          logMessage("error", `✗ Failed for ${product.name}: ${error}`);

          completed++;
          if (completed === productsToTest.length) {
            $button
              .prop("disabled", false)
              .html(
                '<span class="dashicons dashicons-visibility"></span> Dry Run',
              );
          }
        },
      });
    });
  }

  /**
   * Start bulk generation
   */
  function startBulkGeneration() {
    if (productsToProcess.length === 0) {
      alert("No products to process.");
      return;
    }

    // Reset counters
    currentIndex = 0;
    successCount = 0;
    errorCount = 0;
    shouldStop = false;
    isProcessing = true;

    // Update UI
    $("#belims-start-bulk-btn").hide();
    $("#belims-dry-run-btn").hide();
    $("#belims-load-products-btn").prop("disabled", true);
    $("#belims-stop-bulk-btn").show();
    $("#belims-bulk-progress").show();
    $("#belims-bulk-log").show();

    logMessage("info", "Starting bulk generation...");

    // Start processing
    processNextProduct();
  }

  /**
   * Process next product in queue
   */
  function processNextProduct() {
    if (shouldStop) {
      finishProcessing(true);
      return;
    }

    if (currentIndex >= productsToProcess.length) {
      finishProcessing(false);
      return;
    }

    const product = productsToProcess[currentIndex];
    const $row = $(`tr[data-index="${currentIndex}"]`);

    // Update UI
    $row
      .find(".status-badge")
      .removeClass("status-pending status-success status-error")
      .addClass("status-processing")
      .html(
        '<span class="spinner is-active" style="float:none;margin:0;"></span> Processing...',
      );

    updateProgress();
    updateCurrentProduct(product);

    // Make AJAX request
    $.ajax({
      url: belimsBulkAI.ajax_url,
      type: "POST",
      data: {
        action: "belims_bulk_generate_description",
        nonce: belimsBulkAI.nonce,
        product_id: product.id,
      },
      success: function (response) {
        if (response.success) {
          successCount++;
          $row
            .find(".status-badge")
            .removeClass("status-processing")
            .addClass("status-success")
            .html("✓ Success");

          logMessage("success", `✓ Generated for: ${product.name}`);
        } else {
          errorCount++;
          $row
            .find(".status-badge")
            .removeClass("status-processing")
            .addClass("status-error")
            .html("✗ Error");

          logMessage(
            "error",
            `✗ Failed for ${product.name}: ${response.data.message}`,
          );
        }

        // Update stats
        $("#products-processed").text(currentIndex + 1);
        $("#products-successful").text(successCount);

        // Move to next
        currentIndex++;

        // Add small delay to avoid rate limiting
        setTimeout(processNextProduct, 1000);
      },
      error: function (xhr, status, error) {
        errorCount++;
        $row
          .find(".status-badge")
          .removeClass("status-processing")
          .addClass("status-error")
          .html("✗ Error");

        logMessage("error", `✗ Failed for ${product.name}: ${error}`);

        $("#products-processed").text(currentIndex + 1);

        currentIndex++;
        setTimeout(processNextProduct, 1000);
      },
    });
  }

  /**
   * Stop bulk generation
   */
  function stopBulkGeneration() {
    shouldStop = true;
    $("#belims-stop-bulk-btn").prop("disabled", true).text("Stopping...");
    logMessage("warning", "Stopping bulk generation...");
  }

  /**
   * Finish processing
   */
  function finishProcessing(wasStopped) {
    isProcessing = false;

    $("#belims-stop-bulk-btn").hide();
    $("#belims-load-products-btn").prop("disabled", false);
    $("#belims-dry-run-btn").show();
    $("#belims-start-bulk-btn").show().text("Start Another Batch");

    updateProgress();

    if (wasStopped) {
      logMessage("warning", belimsBulkAI.strings.stopped);
      logMessage(
        "info",
        `Processed: ${currentIndex} | Success: ${successCount} | Errors: ${errorCount}`,
      );
    } else {
      logMessage("success", belimsBulkAI.strings.complete);
      logMessage(
        "info",
        `Total Processed: ${currentIndex} | Success: ${successCount} | Errors: ${errorCount}`,
      );

      // Show completion message
      alert(
        `Bulk generation complete!\n\nTotal: ${currentIndex}\nSuccessful: ${successCount}\nErrors: ${errorCount}`,
      );
    }
  }

  /**
   * Update progress bar
   */
  function updateProgress() {
    const total = productsToProcess.length;
    const processed = currentIndex;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

    $("#belims-progress-bar").css("width", percentage + "%");
    $("#belims-progress-text").text(percentage + "%");
  }

  /**
   * Update current product display
   */
  function updateCurrentProduct(product) {
    if (product) {
      $("#belims-current-product").html(
        `Processing: <strong>${escapeHtml(product.name)}</strong> (${currentIndex + 1} of ${productsToProcess.length})`,
      );
    } else {
      $("#belims-current-product").html("");
    }
  }

  /**
   * Log message
   */
  function logMessage(type, message) {
    const $log = $("#belims-log-content");
    const timestamp = new Date().toLocaleTimeString();
    const iconMap = {
      success: "✓",
      error: "✗",
      warning: "⚠",
      info: "ℹ",
    };

    const logEntry = `
            <div class="log-entry log-${type}">
                <span class="log-time">${timestamp}</span>
                <span class="log-icon">${iconMap[type] || "ℹ"}</span>
                <span class="log-message">${escapeHtml(message)}</span>
            </div>
        `;

    $log.prepend(logEntry);

    // Limit log to 100 entries
    if ($log.children().length > 100) {
      $log.children().last().remove();
    }
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format description with basic markdown-like formatting
   */
  function formatDescription(description) {
    if (!description) return "";

    // Convert **text** to <strong>text</strong>
    let formatted = description.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>",
    );

    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, "<br>");

    return formatted;
  }
})(jQuery);
