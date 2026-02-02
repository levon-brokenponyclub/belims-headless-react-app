/**
 * FTG Single Product Sync JavaScript
 * Handles syncing a single product by SKU from the admin page
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    const syncButton = document.getElementById("ftg-sync-single-btn");
    const skuInput = document.getElementById("ftg-product-sku");
    const resultDiv = document.getElementById("ftg-single-sync-result");

    if (!syncButton || !skuInput || !resultDiv) {
      console.error("FTG Sync: Required elements not found");
      return;
    }

    syncButton.addEventListener("click", function (e) {
      e.preventDefault();
      syncSingleProduct();
    });

    // Allow Enter key to trigger sync
    skuInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        syncSingleProduct();
      }
    });

    function syncSingleProduct() {
      const sku = skuInput.value.trim();

      if (!sku) {
        showResult("error", "Please enter a SKU");
        return;
      }

      // Show loading state
      syncButton.disabled = true;
      syncButton.textContent = "Syncing...";
      resultDiv.style.display = "block";
      resultDiv.innerHTML = "<p><em>Syncing product...</em></p>";

      // Make REST API call
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": belimsFTGSync.nonce,
        },
        body: JSON.stringify({
          sku: sku,
        }),
      };

      fetch(belimsFTGSync.restEndpoint, fetchOptions)
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(err.message || "Failed to sync product");
            });
          }
          return response.json();
        })
        .then((data) => {
          if (data.success) {
            showResult("success", data.message, data);
          } else {
            showResult("error", data.message || "Failed to sync product");
          }
        })
        .catch((error) => {
          console.error("Sync error:", error);
          showResult("error", "Error: " + error.message);
        })
        .finally(() => {
          syncButton.disabled = false;
          syncButton.textContent = "Sync Product";
        });
    }

    function showResult(type, message, data) {
      const className = type === "success" ? "notice-success" : "notice-error";
      const typeLabel = type === "success" ? "Success" : "Error";

      let html = `<div class="notice ${className}"><p><strong>${typeLabel}:</strong> ${escapeHtml(message)}</p>`;

      if (type === "success" && data) {
        html += '<ul style="margin: 10px 0 0 20px;">';
        if (data.sku) {
          html += `<li><strong>SKU:</strong> ${escapeHtml(data.sku)}</li>`;
        }
        if (data.product_name) {
          html += `<li><strong>Product:</strong> ${escapeHtml(data.product_name)}</li>`;
        }
        html += "</ul>";
      }

      html += "</div>";

      resultDiv.innerHTML = html;
      resultDiv.style.display = "block";
    }

    function escapeHtml(text) {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    }
  });
})();
