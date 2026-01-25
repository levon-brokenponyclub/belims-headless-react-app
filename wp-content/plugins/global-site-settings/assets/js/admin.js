/**
 * Belims CMS Admin JavaScript - CONSOLIDATED
 * Author: Belims Team & Co Pilot
 * https://belims.co.za
 *
 * This file contains all admin JavaScript functionality including:
 * - Tab navigation
 * - Admin interface controls
 * - Connection testing
 * - Media uploading
 * - Console suppression
 */

(function ($) {
  "use strict";

  let connectionTestInterval;

  // Prevent duplicate initialization
  if (window.bpcAdminInitialized) {
    console.log("🔄 Belims CMS Admin already initialized, skipping...");
    return;
  }

  // =============================================================================
  // TAB NAVIGATION (from admin-tabs.js)
  // =============================================================================

  $(document).ready(function () {
    const $navItems = $(".bpc-nav-item");
    const $tabs = $(".bpc-tab-content");

    // Function to switch tabs
    function switchTab(tabId) {
      if (!tabId) return;

      // Update Navigation
      $navItems.removeClass("active");
      $(`.bpc-nav-item[data-tab="${tabId}"]`).addClass("active");

      // Update Content
      $tabs.removeClass("active");
      $(`#tab-${tabId}`).addClass("active");

      // Store in localStorage
      localStorage.setItem("bpccms_active_tab", tabId);

      // Update URL hash without scroll
      if (history.pushState) {
        history.pushState(null, null, "#tab-" + tabId);
      } else {
        location.hash = "#tab-" + tabId;
      }
    }

    // Click handler
    $navItems.on("click", function (e) {
      const tabId = $(this).data("tab");
      if (tabId) {
        switchTab(tabId);
      }
    });

    // Initial tab check (Hash > localStorage > Default)
    const hash = window.location.hash.replace("#tab-", "");
    const storedTab = localStorage.getItem("bpccms_active_tab");
    const defaultTab = "dashboard";

    if (hash && $(`.bpc-nav-item[data-tab="${hash}"]`).length) {
      switchTab(hash);
    } else if (
      storedTab &&
      $(`.bpc-nav-item[data-tab="${storedTab}"]`).length
    ) {
      switchTab(storedTab);
    } else {
      switchTab(defaultTab);
    }
  });

  // =============================================================================
  // MAIN ADMIN FUNCTIONALITY
  // =============================================================================

  // Initialize when document is ready
  $(document).ready(function () {
    console.log("🚀 BPCCMS Admin loading...");
    console.log("jQuery available:", typeof jQuery !== "undefined");
    console.log("bpcCMSAdmin available:", typeof bpcCMSAdmin !== "undefined");

    // Initialize components
    try {
      BPCAdmin.init();
      window.bpcAdminInitialized = true;
      console.log("✅ BPCCMS Admin loaded successfully");
    } catch (error) {
      console.error("❌ BPCCMS Admin initialization error:", error);
    }

    // Set global ajaxurl if not already set
    if (typeof window.ajaxurl === "undefined") {
      window.ajaxurl =
        bpcCMSAdmin && bpcCMSAdmin.ajaxurl
          ? bpcCMSAdmin.ajaxurl
          : "/wp-admin/admin-ajax.php";
    }
  });

  /**
   * Main Admin Object
   */
  window.BPCAdmin = {
    /**
     * Initialize admin functionality
     */
    init: function () {
      this.setupToggleSwitches();
      this.setupPostTypeManagement();
      this.setupAPITesting();
      this.setupFormValidation();
      this.setupNotifications();
      this.setupKeyboardShortcuts();
      this.loadDashboardStats();
      this.setupDeploymentManagement();
      this.setupConnectionTesting();
      this.setupProductionBuild();
      this.setupSetupWizard();
      this.startConnectionMonitoring();
      this.setupBobGoTesting();
    },

    /**
     * Setup connection testing functionality
     */
    setupConnectionTesting: function () {
      console.log("🔗 Setting up simple connection testing...");

      // Simple connection test button
      $("#simple-connection-test")
        .off("click")
        .on("click", function (e) {
          e.preventDefault();
          console.log("🔍 Simple connection test button clicked");
          BPCAdmin.performSimpleConnectionTest();
        });
    },

    /**
     * Perform simple connection test
     */
    performSimpleConnectionTest: function () {
      console.log("🚀 Starting simple connection test...");
      console.log("bpcCMSAdmin object:", bpcCMSAdmin);

      if (typeof bpcCMSAdmin === "undefined") {
        console.error("bpcCMSAdmin not available for connection test");
        BPCAdmin.showNotification(
          "❌ Admin configuration not available",
          "error",
        );
        return;
      }

      if (!bpcCMSAdmin.ajaxurl) {
        console.error("bpcCMSAdmin.ajaxurl is missing");
        BPCAdmin.showNotification("❌ AJAX URL not configured", "error");
        return;
      }

      if (!bpcCMSAdmin.nonce) {
        console.error("bpcCMSAdmin.nonce is missing");
        BPCAdmin.showNotification("❌ Security nonce not configured", "error");
        return;
      }

      const $button = $("#simple-connection-test");
      const $statusIndicator = $("#connection-status-indicator");
      const $resultsDiv = $("#connection-results");
      const $testDetails = $("#test-details");

      // Update UI to testing state
      $button.prop("disabled", true).text("🔄 Testing...");
      $statusIndicator
        .css({
          background: "#f0ad00",
          color: "white",
        })
        .text("Testing...");

      $resultsDiv.show();
      $testDetails.html("Running comprehensive connection tests...<br>");

      console.log("Making AJAX request to:", bpcCMSAdmin.ajaxurl);
      console.log("With data:", {
        action: "bpccms_test_cms_connection",
        nonce: bpcCMSAdmin.nonce,
      });

      // Call WordPress AJAX handler for proper testing
      $.ajax({
        url: bpcCMSAdmin.ajaxurl,
        type: "POST",
        data: {
          action: "bpccms_test_cms_connection",
          nonce: bpcCMSAdmin.nonce,
        },
        timeout: 15000, // Reduced timeout for quicker feedback
        beforeSend: function () {
          console.log("AJAX request starting...");
        },
        success: function (response) {
          console.log("Connection test response received:", response);
          BPCAdmin.handleConnectionTestResponse(
            response,
            $button,
            $statusIndicator,
            $testDetails,
          );
        },
        error: function (xhr, status, error) {
          console.error("Connection test AJAX error:");
          console.error("Status:", status);
          console.error("Error:", error);
          console.error("Response Text:", xhr.responseText);
          console.error("Status Code:", xhr.status);
          BPCAdmin.handleConnectionTestError(
            error,
            $button,
            $statusIndicator,
            $testDetails,
          );
        },
        complete: function (xhr, status) {
          console.log("AJAX request completed with status:", status);
        },
      });
    },

    /**
     * Handle connection test response
     */
    handleConnectionTestResponse: function (
      response,
      $button,
      $statusIndicator,
      $testDetails,
    ) {
      const $resultsDiv = $("#connection-results");

      console.log("🔍 DETAILED RESPONSE ANALYSIS:");
      console.log("Response object:", response);
      console.log("Response.success:", response.success);
      console.log("Response type:", typeof response);

      // Force show the results div
      $resultsDiv.show();

      if (response && response.success) {
        // Update status indicator for success
        $statusIndicator
          .css({
            background: "#00a32a",
            color: "white",
          })
          .text("✅ Connected");

        // Clear and show detailed results
        $testDetails.html("");

        this.appendTestResult(
          $testDetails,
          "✅ WordPress API: Working (" +
            (response.endpoints_working || "N/A") +
            "/" +
            (response.endpoints_tested || "N/A") +
            " endpoints)",
          "success",
        );

        this.appendTestResult(
          $testDetails,
          "✅ Environment: " + (response.environment || "Unknown"),
          "success",
        );

        this.appendTestResult(
          $testDetails,
          "✅ WordPress URL: " + (response.wordpress_url || "Not provided"),
          "success",
        );

        if (response.debug_info && response.debug_info.length > 0) {
          this.appendTestResult(
            $testDetails,
            "<br><strong>🔍 Test Details:</strong>",
            "info",
          );
          response.debug_info.forEach((info) => {
            this.appendTestResult($testDetails, info, "info");
          });
        }

        this.appendTestResult(
          $testDetails,
          "<br><strong>🎉 Connection test successful!</strong><br>✅ All systems are working properly.",
          "success",
        );

        // Add timestamp
        const timestamp = new Date().toLocaleString();
        this.appendTestResult(
          $testDetails,
          '<br><small style="color: #666;">Last tested: ' +
            timestamp +
            "</small>",
          "info",
        );
      } else {
        // Update status indicator for failure
        $statusIndicator
          .css({
            background: "#dc3232",
            color: "white",
          })
          .text("❌ Failed");

        // Clear and show error details
        $testDetails.html("");

        this.appendTestResult(
          $testDetails,
          "❌ Connection test failed: " +
            (response
              ? response.message || "Unknown error"
              : "No response received"),
          "error",
        );

        if (response && response.debug_info && response.debug_info.length > 0) {
          this.appendTestResult(
            $testDetails,
            "<br><strong>🔍 Debug Information:</strong>",
            "info",
          );
          response.debug_info.forEach((info) => {
            this.appendTestResult($testDetails, info, "info");
          });
        }

        this.appendTestResult(
          $testDetails,
          "<br><strong>❌ Connection failed</strong><br>Please check your WordPress configuration.",
          "error",
        );

        // Add timestamp
        const timestamp = new Date().toLocaleString();
        this.appendTestResult(
          $testDetails,
          '<br><small style="color: #666;">Last tested: ' +
            timestamp +
            "</small>",
          "info",
        );
      }

      // Reset button
      $button.prop("disabled", false).text("🔗 Test Connection");

      this.appendTestResult(
        $testDetails,
        "<br>🔄 Test completed at " + new Date().toLocaleTimeString(),
        "info",
      );
    },

    /**
     * Handle connection test error
     */
    handleConnectionTestError: function (
      error,
      $button,
      $statusIndicator,
      $testDetails,
    ) {
      const $resultsDiv = $("#connection-results");

      console.log("🔥 CONNECTION TEST ERROR HANDLER");
      console.log("Error details:", error);

      // Force show the results div
      $resultsDiv.show();

      // Update status indicator for error
      $statusIndicator
        .css({
          background: "#dc3232",
          color: "white",
        })
        .text("❌ Error");

      // Clear and show error details
      $testDetails.html("");

      this.appendTestResult(
        $testDetails,
        "❌ Connection test error: " + error,
        "error",
      );

      this.appendTestResult(
        $testDetails,
        "<br><strong>❌ Test failed to complete</strong><br>Please check console for more details.",
        "error",
      );

      // Reset button
      $button.prop("disabled", false).text("🔗 Test Connection");

      // Add timestamp
      const timestamp = new Date().toLocaleString();
      this.appendTestResult(
        $testDetails,
        '<br><small style="color: #666;">Last tested: ' +
          timestamp +
          "</small>",
        "info",
      );
    },

    appendTestResult: function ($container, message, type) {
      const colors = {
        info: "#0073aa",
        success: "#00a32a",
        error: "#dc3232",
      };

      $container.append(
        `<div style="color: ${colors[type]}; margin: 5px 0;">${message}</div>`,
      );

      // Scroll to bottom
      $container.scrollTop($container[0].scrollHeight);
    },

    /**
     * Setup production build functionality
     */
    setupProductionBuild: function () {
      $("#create-production-build")
        .off("click")
        .on("click", function (e) {
          e.preventDefault();
          BPCAdmin.createProductionBuild();
        });
    },

    /**
     * Create production build
     */
    createProductionBuild: function () {
      if (typeof bpcCMSAdmin === "undefined") {
        BPCAdmin.showNotification(
          "❌ Admin configuration not available",
          "error",
        );
        return;
      }

      const $button = $("#create-production-build");
      const $resultContainer = $(".production-build-result");

      if (!$button.length) return;

      // Remove any existing result messages
      $resultContainer.remove();

      // Update button state
      $button.addClass("loading").prop("disabled", true);
      const originalText = $button.text();

      // Show confirmation dialog
      if (
        !confirm(
          "This will create a production build with all plugin and frontend files in a PROD folder. Continue?",
        )
      ) {
        $button.removeClass("loading").prop("disabled", false);
        return;
      }

      BPCAdmin.showNotification("🚀 Starting production build...", "info");

      // Make AJAX request
      $.ajax({
        url: bpcCMSAdmin.ajaxurl,
        type: "POST",
        data: {
          action: "bpccms_create_production_build",
          nonce: bpcCMSAdmin.nonce,
        },
        timeout: 60000, // Increased timeout for file operations
        success: function (response) {
          if (response && typeof response === "object") {
            BPCAdmin.showProductionBuildResult(response, $button);
          } else {
            BPCAdmin.showProductionBuildResult(
              {
                success: false,
                message: "Invalid response from server",
              },
              $button,
            );
          }
        },
        error: function (xhr, status, error) {
          console.error("Production build error:", error);
          BPCAdmin.showProductionBuildResult(
            {
              success: false,
              message:
                "Production build failed: " + (xhr.responseText || error),
            },
            $button,
          );
        },
        complete: function () {
          $button
            .removeClass("loading")
            .prop("disabled", false)
            .text(originalText);
        },
      });
    },

    /**
     * Show production build result
     */
    showProductionBuildResult: function (response, $button) {
      const $result = $('<div class="production-build-result"></div>');

      if (response.success) {
        $result
          .addClass("success")
          .html(
            "<strong>✅ Production Build Created Successfully!</strong>" +
              "<br>📂 Files created in: <code>" +
              response.folder +
              "</code>" +
              "<br>📋 Check the DEPLOYMENT.md file for deployment instructions." +
              "<br>🚀 Your production files are ready for deployment!",
          );
        BPCAdmin.showNotification(
          "✅ Production build completed successfully!",
          "success",
        );
      } else {
        $result
          .addClass("error")
          .html(
            "<strong>❌ Production Build Failed</strong>" +
              "<br>💥 " +
              (response.message || "Unknown error occurred") +
              "<br>🔧 Please check the server logs for more details.",
          );
        BPCAdmin.showNotification("❌ Production build failed", "error");
      }

      // Insert result after the deployment actions
      const $insertAfter = $(".deployment-actions").length
        ? $(".deployment-actions")
        : $button.parent();
      $insertAfter.after($result);

      // Auto-remove success message after 15 seconds
      if (response.success) {
        setTimeout(function () {
          $result.fadeOut(1000, function () {
            $(this).remove();
          });
        }, 15000);
      }

      // Scroll to result if possible
      if ($result.offset()) {
        $("html, body").animate(
          {
            scrollTop: $result.offset().top - 50,
          },
          500,
        );
      }
    },

    /**
     * Setup setup wizard functionality
     */
    setupSetupWizard: function () {
      // Handle setup wizard buttons if present
      $(document).on("click", ".setup-continue-btn", function (e) {
        e.preventDefault();

        const $btn = $(this);
        const step = $btn.data("step");

        if (step === "test-frontend") {
          BPCAdmin.testFrontendConnection($btn);
        }
      });
    },

    /**
     * Test frontend connection (for setup wizard)
     */
    testFrontendConnection: function ($btn) {
      if (typeof bpcCMSAdmin === "undefined") {
        console.warn("bpcCMSAdmin not available for frontend testing");
        return;
      }

      const $resultsDiv = $("#frontend-test-results");
      const $continueBtn = $(
        '.setup-continue-btn[data-step="deployment-urls"]',
      );

      if (!$resultsDiv.length) return;

      $btn.prop("disabled", true).text("Testing...");
      $resultsDiv.html("<p>Testing frontend connections...</p>");

      // Test both environments
      Promise.all([
        BPCAdmin.testEnvironment("staging"),
        BPCAdmin.testEnvironment("production"),
      ])
        .then(([stagingResult, productionResult]) => {
          BPCAdmin.displayTestResults(
            stagingResult,
            productionResult,
            $resultsDiv,
            $continueBtn,
          );
          $btn.prop("disabled", false).text("Test Connection");
        })
        .catch((error) => {
          console.error("Frontend test error:", error);
          $resultsDiv.html(
            '<p style="color: red;">❌ Connection test failed: ' +
              error.message +
              "</p>",
          );
          $btn.prop("disabled", false).text("Test Connection");
        });
    },

    /**
     * Test specific environment
     */
    testEnvironment: function (environment) {
      if (typeof bpcCMSAdmin === "undefined") {
        return Promise.reject(new Error("bpcCMSAdmin not available"));
      }

      return fetch(bpcCMSAdmin.ajaxurl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "bpccms_test_frontend_connection",
          environment: environment,
          nonce: bpcCMSAdmin.nonce,
        }),
      }).then((response) => response.json());
    },

    /**
     * Display test results
     */
    displayTestResults: function (
      stagingResult,
      productionResult,
      $resultsDiv,
      $continueBtn,
    ) {
      let html = "<h4>🔗 Connection Test Results:</h4>";

      html +=
        '<div style="margin: 15px 0; padding: 10px; border-left: 4px solid ' +
        (stagingResult.success ? "#00a32a" : "#d63638") +
        '; background: #f9f9f9;">';
      html += "<strong>🔧 Staging Environment:</strong> ";
      if (stagingResult.success && stagingResult.data) {
        html +=
          '<span style="color: #00a32a;">✅ ' +
          stagingResult.data.message +
          "</span>";
      } else {
        html +=
          '<span style="color: #d63638;">❌ ' +
          (stagingResult.data || "Connection failed") +
          "</span>";
      }
      html += "</div>";

      html +=
        '<div style="margin: 15px 0; padding: 10px; border-left: 4px solid ' +
        (productionResult.success ? "#00a32a" : "#d63638") +
        '; background: #f9f9f9;">';
      html += "<strong>🚀 Production Environment:</strong> ";
      if (productionResult.success && productionResult.data) {
        html +=
          '<span style="color: #00a32a;">✅ ' +
          productionResult.data.message +
          "</span>";
      } else {
        html +=
          '<span style="color: #d63638;">❌ ' +
          (productionResult.data || "Connection failed") +
          "</span>";
      }
      html += "</div>";

      $resultsDiv.html(html);

      // Enable continue button if at least one test passed
      if (
        ((stagingResult.success && stagingResult.data) ||
          (productionResult.success && productionResult.data)) &&
        $continueBtn.length
      ) {
        $continueBtn.prop("disabled", false);
      }
    },

    /**
     * Setup toggle switches with enhanced functionality
     */
    setupToggleSwitches: function () {
      $('.bpc-switch input[type="checkbox"]').on("change", function () {
        const $switch = $(this);
        const $wrapper = $switch.closest(
          ".console-toggle-wrapper, .post-type-toggle-item",
        );
        const $indicator = $wrapper.find(".status-indicator");
        const $text = $wrapper.find(".status-text");

        // Mark as UI toggle to prevent auto-save interference
        $switch.addClass("bpc-ui-toggle");

        if ($switch.is(":checked")) {
          $indicator.removeClass("status-disabled").addClass("status-active");
          $indicator.html("✓ Active");
          if ($text.length) {
            $text.text("Console Logging is active");
          }
          // Update localStorage for immediate frontend effect
          localStorage.setItem("bpccms_suppress_console", "true");
        } else {
          $indicator.removeClass("status-active").addClass("status-disabled");
          $indicator.html("✗ Disabled");
          if ($text.length) {
            $text.text("Console Logging is disabled");
          }
          // Update localStorage for immediate frontend effect
          localStorage.setItem("bpccms_suppress_console", "false");
        }

        // Add loading state
        BPCAdmin.showLoading($wrapper);
        setTimeout(() => {
          BPCAdmin.hideLoading($wrapper);
          // Remove the UI toggle class after processing
          $switch.removeClass("bpc-ui-toggle");
        }, 500);
      });
    },

    /**
     * Setup BobGo connection testing
     */
    setupBobGoTesting: function () {
      $("#test-bobgo-connection")
        .off("click")
        .on("click", function (e) {
          e.preventDefault();
          const $btn = $(this);
          const $status = $("#bobgo-connection-status");

          $btn.prop("disabled", true).text("Testing...");
          $status.html(
            '<span style="color: #999;">⏳ Connecting to BobGo...</span>',
          );

          $.ajax({
            url:
              typeof bpcAdminData !== "undefined"
                ? bpcAdminData.ajaxurl
                : ajaxurl,
            type: "POST",
            data: {
              action: "test_bobgo_connection",
              nonce:
                typeof bpcAdminData !== "undefined"
                  ? bpcAdminData.bobgo_nonce
                  : "",
            },
            success: function (response) {
              if (response.success) {
                $status.html(
                  '<span style="color: #00a32a;">✅ ' +
                    response.data +
                    "</span>",
                );
                BPCAdmin.showNotification(
                  "BobGo connection successful",
                  "success",
                );
              } else {
                $status.html(
                  '<span style="color: #d63638;">❌ ' +
                    response.data +
                    "</span>",
                );
                BPCAdmin.showNotification(
                  "BobGo connection failed: " + response.data,
                  "error",
                );
              }
            },
            error: function (xhr, status, error) {
              $status.html(
                '<span style="color: #d63638;">❌ Request failed</span>',
              );
              BPCAdmin.showNotification(
                "Connection test failed: " + error,
                "error",
              );
            },
            complete: function () {
              $btn.prop("disabled", false).text("Test Connection");
            },
          });
        });
    },

    /**
     * Setup post type management functionality
     */
    setupPostTypeManagement: function () {
      // Add icons to post type names
      $(".bpc-post-type-name").each(function () {
        const $name = $(this);
        const text = $name.text().toLowerCase();
        let icon = "";

        switch (text) {
          case "articles":
            icon = "\f119";
            break;
          case "industries":
            icon = "\f320";
            break;
          case "testimonials":
            icon = "\f473";
            break;
          case "videos":
            icon = "\f234";
            break;
          case "courses":
            icon = "\f118";
            break;
          case "kajabi forms":
            icon = "\f175";
            break;
        }

        $name.attr("data-icon", icon);
      });

      // Enhanced hover effects for post type items
      $(".bpc-post-type-item").hover(
        function () {
          $(this).find(".bpc-post-count").css("transform", "scale(1.1)");
        },
        function () {
          $(this).find(".bpc-post-count").css("transform", "scale(1)");
        },
      );

      // Quick action buttons
      $(".bpc-post-type-actions .button").on("click", function (e) {
        const $btn = $(this);
        if (
          $btn.hasClass("button-primary") &&
          $btn.text().includes("Add New")
        ) {
          BPCAdmin.showNotification("Opening new post editor...", "info");
        }
      });
    },

    /**
     * Setup API testing functionality
     */
    setupAPITesting: function () {
      // Create API test button once per page
      const $apiList = $(".bpc-api-list");
      if ($apiList.length && !$apiList.find(".bpc-api-test").length) {
        const $testButton = $(
          '<button class="button button-secondary bpc-api-test" style="margin-top: 10px;">Test API Endpoints</button>',
        );
        $apiList.append($testButton);
        $testButton.off("click").on("click", function () {
          BPCAdmin.testAPIEndpoints();
        });
      }
    },

    /**
     * Test API endpoints functionality
     */
    testAPIEndpoints: function () {
      const $button = $(".bpc-api-test");
      const originalText = $button.text();

      $button.text("Testing...").prop("disabled", true);
      BPCAdmin.showLoading($button.parent());

      const restRoot = (function () {
        if (typeof bpcAdminConfig !== "undefined" && bpcAdminConfig.restRoot)
          return bpcAdminConfig.restRoot;
        if (
          typeof window.wpApiSettings !== "undefined" &&
          window.wpApiSettings.root
        )
          return window.wpApiSettings.root;
        const origin = window.location.origin.replace(/\/$/, "");
        const path = window.location.pathname || "";
        let base = "";
        const adminIndex = path.indexOf("/wp-admin");
        const contentIndex = path.indexOf("/wp-content");
        if (adminIndex !== -1) {
          base = path.slice(0, adminIndex);
        } else if (contentIndex !== -1) {
          base = path.slice(0, contentIndex);
        }
        base = base.replace(/\/$/, "");
        return origin + base + "/wp-json/";
      })();

      function joinUrl(root, path) {
        const r = root.endsWith("/") ? root : root + "/";
        const p = path.startsWith("/") ? path.slice(1) : path;
        return r + p;
      }

      // Build endpoint URLs using robust REST root
      const endpoints = [
        joinUrl(restRoot, "wp/v2/articles"),
        joinUrl(restRoot, "wp/v2/industries"),
        joinUrl(restRoot, "wp/v2/testimonials"),
        joinUrl(restRoot, "wp/v2/videos"),
        joinUrl(restRoot, "wp/v2/courses"),
        joinUrl(restRoot, "wp/v2/kajabi_forms"),
      ];

      let successCount = 0;
      let totalCount = endpoints.length;

      endpoints.forEach((endpoint) => {
        // Try primary REST URL
        $.ajax({
          url: endpoint + "?per_page=1",
          method: "GET",
          success: function () {
            successCount++;
            if (successCount === totalCount) {
              BPCAdmin.showAPITestResults(successCount, totalCount);
            }
          },
          error: function () {
            // Fallback to non-pretty permalinks style if available
            const route = endpoint.split("/wp-json/")[1] || "";
            if (route) {
              // Derive correct site base from restRoot to support subdirectory installs
              let apiBase = "";
              try {
                const restUrl = new URL(restRoot, window.location.origin);
                // Remove trailing /wp-json/ from pathname to get the WP site base
                const basePath = restUrl.pathname
                  .replace(/\/?wp-json\/?$/, "")
                  .replace(/\/$/, "");
                apiBase = restUrl.origin + basePath;
              } catch (e) {
                // Fallback to origin if URL parsing fails
                apiBase = window.location.origin;
              }

              $.ajax({
                url: apiBase + "/?rest_route=/" + route + "&per_page=1",
                method: "GET",
                success: function () {
                  successCount++;
                  if (successCount === totalCount) {
                    BPCAdmin.showAPITestResults(successCount, totalCount);
                  }
                },
                error: function () {
                  totalCount--;
                  if (successCount === totalCount) {
                    BPCAdmin.showAPITestResults(successCount, endpoints.length);
                  }
                },
              });
            } else {
              totalCount--;
              if (successCount === totalCount) {
                BPCAdmin.showAPITestResults(successCount, endpoints.length);
              }
            }
          },
        });
      });

      setTimeout(() => {
        $button.text(originalText).prop("disabled", false);
        BPCAdmin.hideLoading($button.parent());
      }, 2000);
    },

    /**
     * Show API test results
     */
    showAPITestResults: function (success, total) {
      const percentage = Math.round((success / total) * 100);
      let type = "success";
      let message = `API Test Complete: ${success}/${total} endpoints responding (${percentage}%)`;

      if (percentage < 100) {
        type = "warning";
        message += " - Some endpoints may need attention";
      }

      BPCAdmin.showNotification(message, type);
    },

    /**
     * Setup form validation
     */
    setupFormValidation: function () {
      // Real-time validation for settings forms
      $("form input, form textarea, form select").on("blur", function () {
        const $field = $(this);
        const value = $field.val();

        // URL validation
        if ($field.attr("type") === "url" && value) {
          const urlPattern =
            /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
          if (!urlPattern.test(value)) {
            BPCAdmin.showFieldError($field, "Please enter a valid URL");
          } else {
            BPCAdmin.clearFieldError($field);
          }
        }

        // Required field validation
        if ($field.prop("required") && !value) {
          BPCAdmin.showFieldError($field, "This field is required");
        } else if (!$field.prop("required") || value) {
          BPCAdmin.clearFieldError($field);
        }
      });
    },

    /**
     * Show field error
     */
    showFieldError: function ($field, message) {
      BPCAdmin.clearFieldError($field);
      $field.addClass("error");
      $field.after(
        '<span class="bpc-field-error" style="color: #dc3232; font-size: 12px; display: block; margin-top: 5px;">' +
          message +
          "</span>",
      );
    },

    /**
     * Clear field error
     */
    clearFieldError: function ($field) {
      $field.removeClass("error");
      $field.siblings(".bpc-field-error").remove();
    },

    /**
     * Setup notifications system
     */
    setupNotifications: function () {
      // Create notification container if it doesn't exist
      if (!$("#bpc-notifications").length) {
        $("body").append(
          '<div id="bpc-notifications" style="position: fixed; top: 32px; right: 20px; z-index: 999999;"></div>',
        );
      }
    },

    /**
     * Show notification
     */
    showNotification: function (message, type = "info", duration = 4000) {
      const types = {
        success: { bg: "#00a32a", icon: "✓" },
        error: { bg: "#dc3232", icon: "✗" },
        warning: { bg: "#ffb900", icon: "⚠" },
        info: { bg: "#ff4625", icon: "ℹ" },
      };

      const config = types[type] || types.info;
      const id = "notification-" + Date.now();

      const $notification = $(`
                <div id="${id}" class="bpc-notification" style="
                    background: ${config.bg};
                    color: white;
                    padding: 12px 20px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                    opacity: 0;
                    transform: translateX(300px);
                    transition: all 0.3s ease;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    max-width: 350px;
                ">
                    <span style="margin-right: 8px;">${config.icon}</span>
                    ${message}
                </div>
            `);

      $("#bpc-notifications").append($notification);

      // Animate in
      setTimeout(() => {
        $notification.css({
          opacity: "1",
          transform: "translateX(0)",
        });
      }, 10);

      // Auto remove
      setTimeout(() => {
        $notification.css({
          opacity: "0",
          transform: "translateX(300px)",
        });
        setTimeout(() => $notification.remove(), 300);
      }, duration);

      // Click to dismiss
      $notification.on("click", function () {
        $(this).css({
          opacity: "0",
          transform: "translateX(300px)",
        });
        setTimeout(() => $(this).remove(), 300);
      });
    },

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts: function () {
      $(document).on("keydown", function (e) {
        // Ctrl/Cmd + S to save settings
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          const $form = $("form").first();
          if ($form.length) {
            $form.find('[type="submit"]').click();
            BPCAdmin.showNotification("Settings saved! (Ctrl+S)", "success");
          }
        }

        // Ctrl/Cmd + K for quick navigation
        if ((e.ctrlKey || e.metaKey) && e.key === "k") {
          e.preventDefault();
          BPCAdmin.showQuickNav();
        }
      });
    },

    /**
     * Show quick navigation modal
     */
    showQuickNav: function () {
      if ($("#bpc-quick-nav").length) {
        $("#bpc-quick-nav").show().find("input").focus();
        return;
      }

      const quickNavHtml = `
                <div id="bpc-quick-nav" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 1000000;
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    padding-top: 100px;
                ">
                    <div style="
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        min-width: 400px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    ">
                        <h3 style="margin: 0 0 15px 0; color: #ff4625;">Quick Navigation</h3>
                        <input type="text" placeholder="Type to search..." style="
                            width: 100%;
                            padding: 10px;
                            border: 2px solid #ff4625;
                            border-radius: 4px;
                            font-size: 16px;
                        ">
                        <div class="bpc-quick-nav-results" style="margin-top: 15px;">
                            <div class="bpc-nav-item" data-url="edit.php?post_type=articles">📄 Articles</div>
                            <div class="bpc-nav-item" data-url="edit.php?post_type=industries">🏭 Industries</div>
                            <div class="bpc-nav-item" data-url="edit.php?post_type=testimonials">💬 Testimonials</div>
                            <div class="bpc-nav-item" data-url="edit.php?post_type=videos">🎥 Videos</div>
                            <div class="bpc-nav-item" data-url="edit.php?post_type=courses">📚 Courses</div>
                            <div class="bpc-nav-item" data-url="edit.php?post_type=kajabi_forms">📋 Kajabi Forms</div>
                            <div class="bpc-nav-item" data-url="nav-menus.php">🔗 Menus</div>
                            <div class="bpc-nav-item" data-url="upload.php">🖼️ Media Library</div>
                        </div>
                    </div>
                </div>
            `;

      $("body").append(quickNavHtml);

      // Style nav items
      $(".bpc-nav-item")
        .css({
          padding: "8px 12px",
          cursor: "pointer",
          "border-radius": "4px",
          margin: "2px 0",
        })
        .hover(
          function () {
            $(this).css("background", "#f0f0f0");
          },
          function () {
            $(this).css("background", "transparent");
          },
        );

      // Handle clicks and keyboard
      $(".bpc-nav-item").on("click", function () {
        window.location.href = $(this).data("url");
      });

      $("#bpc-quick-nav").on("click", function (e) {
        if (e.target === this) {
          $(this).remove();
        }
      });

      $("#bpc-quick-nav input").focus();
    },

    /**
     * Load dashboard statistics
     */
    loadDashboardStats: function () {
      // Update post counts in real-time
      $(".bpc-post-count").each(function () {
        const $count = $(this);
        const postType = $count
          .closest(".bpc-post-type-item")
          .find(".bpc-post-type-name")
          .text()
          .toLowerCase();

        // Add loading animation
        BPCAdmin.showLoading($count);

        // Simulate real-time update (in real implementation, this would be an AJAX call)
        setTimeout(() => {
          BPCAdmin.hideLoading($count);
          $count.css("transform", "scale(1.1)");
          setTimeout(() => $count.css("transform", "scale(1)"), 200);
        }, 1000);
      });
    },

    /**
     * Show loading state
     */
    showLoading: function ($element) {
      if (!$element.find(".bpc-loading").length) {
        $element.append('<span class="bpc-loading"></span>');
      }
    },

    /**
     * Hide loading state
     */
    hideLoading: function ($element) {
      $element.find(".bpc-loading").remove();
    },

    /**
     * Utility function to log admin actions
     */
    log: function (action, data = {}) {
      if (window.console && !window.bpcSuppressLogs) {
        console.log(`🔧 DZ Admin: ${action}`, data);
      }
    },

    /**
     * Setup deployment management functionality
     */
    setupDeploymentManagement: function () {
      // Test deployment connection
      $("#test-deployment-connection")
        .off("click")
        .on("click", function () {
          BPCAdmin.testDeploymentConnection();
        });

      // Deploy now button
      $("#deploy-now")
        .off("click")
        .on("click", function () {
          BPCAdmin.deployNow();
        });

      // Generate config button
      $("#generate-config")
        .off("click")
        .on("click", function () {
          BPCAdmin.generateConfig();
        });

      // Environment radio changes
      $('input[name="bpccms_current_environment"]').on("change", function () {
        BPCAdmin.onEnvironmentChange($(this).val());
      });
    },

    /**
     * Test deployment connection
     */
    testDeploymentConnection: function () {
      const $button = $("#test-deployment-connection");
      const originalText = $button.text();
      const environment =
        $('input[name="bpccms_current_environment"]:checked').val() ||
        "staging";

      $button.text("🔄 Testing...").prop("disabled", true);
      BPCAdmin.showNotification(
        `Testing connection to ${environment} environment...`,
        "info",
        2000,
      );

      $.ajax({
        url: BPCAdmin.getRestRoot() + "wp/v2/deployment/test",
        method: "POST",
        headers: {
          "X-WP-Nonce": bpcAdminConfig.restNonce,
        },
        data: {
          environment: environment,
        },
        success: function (response) {
          if (response.success) {
            BPCAdmin.showNotification(
              `✅ Connection to ${response.environment} successful!`,
              "success",
            );
            BPCAdmin.log("Deployment connection test successful", response);
          } else {
            BPCAdmin.showNotification(
              `❌ Connection failed: ${response.message}`,
              "error",
            );
            BPCAdmin.log("Deployment connection test failed", response);
          }
        },
        error: function (xhr, status, error) {
          BPCAdmin.showNotification(`❌ Test failed: ${error}`, "error");
          BPCAdmin.log("Deployment test error", { xhr, status, error });
        },
        complete: function () {
          $button.text(originalText).prop("disabled", false);
        },
      });
    },

    /**
     * Deploy now functionality
     */
    deployNow: function () {
      const $button = $("#deploy-now");
      const originalText = $button.text();
      const environment =
        $('input[name="bpccms_current_environment"]:checked').val() ||
        "staging";

      if (
        !confirm(
          `Deploy to ${environment} environment now? This will update all frontend configuration.`,
        )
      ) {
        return;
      }

      $button.text("🚀 Deploying...").prop("disabled", true);
      BPCAdmin.showNotification(
        `Starting deployment to ${environment}...`,
        "info",
      );

      $.ajax({
        url: BPCAdmin.getRestRoot() + "wp/v2/deployment/deploy",
        method: "POST",
        headers: {
          "X-WP-Nonce": bpcAdminConfig.restNonce,
        },
        data: {
          environment: environment,
          force_rebuild: false,
        },
        success: function (response) {
          if (response.success) {
            BPCAdmin.showNotification(
              `🎉 Deployment to ${response.environment} completed!`,
              "success",
            );
            BPCAdmin.showDeploymentConfig(response.deployment_config);
            BPCAdmin.log("Deployment successful", response);
          } else {
            BPCAdmin.showNotification(
              `❌ Deployment failed: ${response.message}`,
              "error",
            );
            BPCAdmin.log("Deployment failed", response);
          }
        },
        error: function (xhr, status, error) {
          BPCAdmin.showNotification(`❌ Deployment error: ${error}`, "error");
          BPCAdmin.log("Deployment error", { xhr, status, error });
        },
        complete: function () {
          $button.text(originalText).prop("disabled", false);
        },
      });
    },

    /**
     * Generate configuration
     */
    /**
     * Get REST API root URL with proper fallback
     */
    getRestRoot: function () {
      if (typeof bpcAdminConfig !== "undefined" && bpcAdminConfig.restRoot)
        return bpcAdminConfig.restRoot;
      if (
        typeof window.wpApiSettings !== "undefined" &&
        window.wpApiSettings.root
      )
        return window.wpApiSettings.root;

      const origin = window.location.origin.replace(/\/$/, "");
      const path = window.location.pathname || "";
      let base = "";
      const adminIndex = path.indexOf("/wp-admin");
      const contentIndex = path.indexOf("/wp-content");

      if (adminIndex > 0) {
        base = path.substring(0, adminIndex);
      } else if (contentIndex > 0) {
        const segments = path.substring(0, contentIndex).split("/");
        segments.pop();
        base = segments.join("/");
      }

      return origin + base + "/wp-json/";
    },

    generateConfig: function () {
      const $button = $("#generate-config");
      const originalText = $button.text();

      $button.text("⚙️ Generating...").prop("disabled", true);
      BPCAdmin.showNotification(
        "Generating deployment configuration...",
        "info",
        2000,
      );

      $.ajax({
        url: BPCAdmin.getRestRoot() + "wp/v2/deployment/config",
        method: "GET",
        success: function (response) {
          BPCAdmin.showNotification(
            "✅ Configuration generated successfully!",
            "success",
          );
          BPCAdmin.showDeploymentConfig(response);
          BPCAdmin.log("Config generated", response);
        },
        error: function (xhr, status, error) {
          BPCAdmin.showNotification(
            `❌ Config generation failed: ${error}`,
            "error",
          );
          BPCAdmin.log("Config generation error", { xhr, status, error });
        },
        complete: function () {
          $button.text(originalText).prop("disabled", false);
        },
      });
    },

    /**
     * Show deployment configuration modal
     */
    showDeploymentConfig: function (config) {
      // Remove existing modal if present
      $("#bpc-deployment-config").remove();

      const configJson = JSON.stringify(config, null, 2);
      const modalHtml = `
                <div id="bpc-deployment-config" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    z-index: 1000000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                ">
                    <div style="
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        max-width: 800px;
                        max-height: 80vh;
                        overflow-y: auto;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        position: relative;
                    ">
                        <button id="close-config-modal" style="
                            position: absolute;
                            top: 15px;
                            right: 15px;
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                        ">✕</button>
                        
                        <h2 style="margin: 0 0 20px 0; color: #ff4625;">🚀 Deployment Configuration</h2>
                        
                        <div style="margin-bottom: 20px;">
                            <h3>Environment Details</h3>
                            <p><strong>Environment:</strong> ${config.environment || "N/A"}</p>
                            <p><strong>Frontend URL:</strong> <a href="${config.frontend_url || "#"}" target="_blank">${config.frontend_url || "N/A"}</a></p>
                            <p><strong>API URL:</strong> <code>${config.api_url || "N/A"}</code></p>
                            <p><strong>Generated:</strong> ${config.generated_at || "N/A"}</p>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <h3>Frontend Configuration</h3>
                            <p style="color: #666; margin-bottom: 10px;">Copy this configuration to your frontend deployment:</p>
                            <textarea readonly style="
                                width: 100%;
                                height: 300px;
                                font-family: 'Courier New', monospace;
                                font-size: 12px;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                padding: 15px;
                                background: #f9f9f9;
                            ">${configJson}</textarea>
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="copy-config" class="button button-primary">📋 Copy Configuration</button>
                            <button id="close-config" class="button button-secondary">Close</button>
                        </div>
                    </div>
                </div>
            `;

      $("body").append(modalHtml);

      // Handle modal interactions
      $("#close-config-modal, #close-config, #bpc-deployment-config").on(
        "click",
        function (e) {
          if (e.target === this) {
            $("#bpc-deployment-config").remove();
          }
        },
      );

      // Copy configuration to clipboard
      $("#copy-config").on("click", function () {
        const textarea = $("#bpc-deployment-config textarea")[0];
        textarea.select();
        document.execCommand("copy");
        BPCAdmin.showNotification(
          "📋 Configuration copied to clipboard!",
          "success",
        );
      });
    },

    /**
     * Handle environment change
     */
    onEnvironmentChange: function (environment) {
      BPCAdmin.showNotification(
        `Switched to ${environment} environment`,
        "info",
        2000,
      );
      BPCAdmin.log("Environment changed", { environment });

      // Update button states
      $(".deployment-actions button").prop("disabled", false);
    },

    /**
     * Start periodic connection monitoring
     */
    startConnectionMonitoring: function () {
      // Test connection every 5 minutes
      if (typeof connectionTestInterval !== "undefined") {
        clearInterval(connectionTestInterval);
      }
      connectionTestInterval = setInterval(function () {
        // Only test if indicator exists (user is on settings page)
        if (
          $("#connection-indicator").length &&
          typeof bpcCMSAdmin !== "undefined"
        ) {
          BPCAdmin.testCMSConnection();
        }
      }, 300000); // 5 minutes
    },
  };

  // Expose to global scope for external use
  window.BPCAdmin = BPCAdmin;

  /**
   * Clean up on page unload
   */
  $(window).on("beforeunload", function () {
    if (typeof connectionTestInterval !== "undefined") {
      clearInterval(connectionTestInterval);
    }
  });

  /**
   * Enhanced error handling
   */
  window.addEventListener("error", function (e) {
    if (e.message.includes("bpccms") || e.message.includes("BPCCMS")) {
      console.error("Dirc Zahlmann CMS Error:", e);
    }
  });
})(jQuery);

// Initialize admin object for AJAX nonce
var bpcCMSAdmin = bpcCMSAdmin || {
  nonce: "",
  ajaxurl:
    typeof ajaxurl !== "undefined" ? ajaxurl : "/wp-admin/admin-ajax.php",
};

/**
 * Media Upload and Gallery Management
 * Handles WordPress media library integration for homepage settings
 */
(function ($) {
  "use strict";

  // Initialize media upload functionality when document is ready
  $(document).ready(function () {
    initializeMediaUploaders();
  });

  /**
   * Initialize all media upload functionality
   */
  function initializeMediaUploaders() {
    setupGalleryUploader();
    setupSingleImageUploaders();
    setupImageRemoval();
  }

  /**
   * Setup gallery uploader for trusted brands
   */
  function setupGalleryUploader() {
    $("#upload-brand-logos")
      .off("click")
      .on("click", function (e) {
        e.preventDefault();

        console.log(
          "Admin scripts loaded. Checking wp.media availability:",
          typeof wp !== "undefined" && typeof wp.media !== "undefined",
        );

        if (typeof wp === "undefined" || typeof wp.media === "undefined") {
          console.error("WordPress media library is not available");
          return;
        }

        var gallery_frame = wp.media({
          title: "Select Brand Logos",
          multiple: true,
          library: { type: "image" },
        });

        gallery_frame.on("select", function () {
          var selection = gallery_frame.state().get("selection");
          var current_ids = $("#trusted_brands_gallery").val();
          var ids_array = current_ids ? current_ids.split(",") : [];

          selection.map(function (attachment) {
            attachment = attachment.toJSON();
            if (ids_array.indexOf(attachment.id.toString()) === -1) {
              ids_array.push(attachment.id);

              // Get appropriate image URL with fallbacks
              var image_url = getImageUrl(attachment);
              if (image_url) {
                var preview_html =
                  '<div class="bpc-gallery-item" data-id="' +
                  attachment.id +
                  '">' +
                  '<img src="' +
                  image_url +
                  '" style="max-width: 100px; max-height: 100px; object-fit: cover;" />' +
                  '<button type="button" class="bpc-remove-image">×</button>' +
                  "</div>";
                $("#brands-gallery-preview").append(preview_html);
              }
            }
          });

          $("#trusted_brands_gallery").val(ids_array.join(","));
        });

        gallery_frame.open();
        console.log("Media gallery opened successfully");
      });
  }

  /**
   * Setup single image uploaders
   */
  function setupSingleImageUploaders() {
    $(".bpc-upload-image")
      .off("click")
      .on("click", function (e) {
        e.preventDefault();

        var button = $(this);
        var target_input = button.data("target");
        var preview_container = $("#" + button.data("preview"));

        if (typeof wp === "undefined" || typeof wp.media === "undefined") {
          console.error("WordPress media library is not available");
          return;
        }

        var image_frame = wp.media({
          title: "Select Image",
          multiple: false,
          library: { type: "image" },
        });

        image_frame.on("select", function () {
          var attachment = image_frame
            .state()
            .get("selection")
            .first()
            .toJSON();
          $("#" + target_input).val(attachment.id);

          var image_url = getImageUrl(attachment);
          if (image_url) {
            var preview_html =
              '<img src="' +
              image_url +
              '" style="max-width: 300px;" />' +
              '<button type="button" class="bpc-remove-single-image">Remove Image</button>';
            preview_container.html(preview_html);
          } else {
            console.warn(
              "No suitable image URL found for single image attachment:",
              attachment,
            );
          }
        });

        image_frame.open();
      });
  }

  /**
   * Setup image removal functionality
   */
  function setupImageRemoval() {
    // Remove gallery item
    $(document)
      .off("click", ".bpc-remove-image")
      .on("click", ".bpc-remove-image", function () {
        var $item = $(this).closest(".bpc-gallery-item");
        var id = $item.data("id");
        $item.remove();

        var current_ids = $("#trusted_brands_gallery").val();
        var ids_array = current_ids ? current_ids.split(",") : [];
        var filtered_array = ids_array.filter(function (item_id) {
          return item_id !== id.toString();
        });

        $("#trusted_brands_gallery").val(filtered_array.join(","));
      });

    // Remove single image
    $(document)
      .off("click", ".bpc-remove-single-image")
      .on("click", ".bpc-remove-single-image", function () {
        var $container = $(this).closest(".bpc-image-preview");
        var target_input = $container.prev('input[type="hidden"]');

        if (target_input.length === 0) {
          // Alternative: find by ID pattern
          var button_target = $(this)
            .closest(".bpc-image-container")
            .find('input[type="hidden"]')
            .first();
          if (button_target.length > 0) {
            target_input = button_target;
          }
        }

        target_input.val("");
        $container.empty();
      });
  }

  /**
   * Get appropriate image URL with fallbacks
   * @param {Object} attachment - WordPress media attachment object
   * @returns {string} - Image URL or empty string
   */
  function getImageUrl(attachment) {
    var image_url = "";

    // Priority order: thumbnail, medium, large, full, url
    if (
      attachment.sizes &&
      attachment.sizes.thumbnail &&
      attachment.sizes.thumbnail.url
    ) {
      image_url = attachment.sizes.thumbnail.url;
    } else if (
      attachment.sizes &&
      attachment.sizes.medium &&
      attachment.sizes.medium.url
    ) {
      image_url = attachment.sizes.medium.url;
    } else if (
      attachment.sizes &&
      attachment.sizes.large &&
      attachment.sizes.large.url
    ) {
      image_url = attachment.sizes.large.url;
    } else if (
      attachment.sizes &&
      attachment.sizes.full &&
      attachment.sizes.full.url
    ) {
      image_url = attachment.sizes.full.url;
    } else if (attachment.url) {
      image_url = attachment.url;
    } else {
      console.warn("No suitable image URL found for attachment:", attachment);
    }

    return image_url;
  }

  // Expose media upload functions globally for external access
  window.BPCMediaUpload = {
    setupGalleryUploader: setupGalleryUploader,
    setupSingleImageUploaders: setupSingleImageUploaders,
    setupImageRemoval: setupImageRemoval,
    getImageUrl: getImageUrl,
  };
})(jQuery);

/**
 * Console suppression functionality
 * This runs independently of the main admin object
 */
(function () {
  "use strict";

  // Check if console suppression is active via PHP (admin) or localStorage (frontend)
  let suppressLogs = false;

  // In admin area, check PHP config
  if (typeof bpcAdminConfig !== "undefined") {
    suppressLogs = bpcAdminConfig.suppressLogs;
    // Store setting in localStorage for frontend use
    if (suppressLogs) {
      localStorage.setItem("bpccms_suppress_console", "true");
    } else {
      localStorage.setItem("bpccms_suppress_console", "false");
    }
  } else {
    // On frontend, check localStorage
    suppressLogs = localStorage.getItem("bpccms_suppress_console") === "true";
  }

  // Log suppression status
  if (suppressLogs) {
    console.log(
      "%c CONSOLE SUPPRESSION - ACTIVE ",
      "background: #00a32a; color: white; font-weight: bold; padding: 4px 8px; text-transform: uppercase;",
    );

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Override console.log
    console.log = function (...args) {
      const message = args.join(" ");
      const suppressPatterns = [
        "scripts.js:",
        "CodyHouse",
        "Seamless logo slider",
        "Mobile viewport",
        "Nav element",
        "Initial nav classes",
        "Nav computed style",
        "CodyHouse scroll",
        "Initial visibility check",
        "Comparison table",
        "UPDATE POSITION",
        "Container element",
        "currentSlide",
        "Desktop centering",
        "translateX",
        "Applied transform",
        "Computed transform",
        "Calculated translateX",
        "Applied transform (instant)",
        "Computed transform: matrix",
        "UPDATE POSITION END",
        "UPDATE POSITION START",
        "viewportWidth=",
        "translateX=",
        "Current currentSlide",
        "partner-slider-container",
        "course-slider-container",
        "Initializing partner slider",
        "Initializing course slider",
        "Kajabi forms are loaded",
        "Navigation hidden",
        "Transform after hide",
        "No menu items found",
        "Error loading articles",
        "wp-json/wp/v2/menus/main 404",
        "Kajabi forms are loaded directly in HTML",
        "✨",
        "===",
        "✅",
        "📱",
        "🔍",
        "🎨",
        "📏",
        "🚀",
        "👁️",
        "🔥",
        "🔼",
      ];

      const shouldSuppress = suppressPatterns.some((pattern) =>
        message.includes(pattern),
      );

      if (!shouldSuppress) {
        originalLog.apply(console, args);
      }
    };

    // Override console.warn
    console.warn = function (...args) {
      const message = args.join(" ");
      const suppressWarnPatterns = [
        "parser-blocking",
        "document.write",
        "fonts.googleapis.com",
        "ERR_INVALID_URL",
        "cross site",
        "kajabi-app-assets",
        "A parser-blocking, cross site",
        "kajabi-cdn.com",
        "form_embed-",
        "embed.js:",
      ];

      const shouldSuppress = suppressWarnPatterns.some((pattern) =>
        message.includes(pattern),
      );

      if (!shouldSuppress) {
        originalWarn.apply(console, args);
      }
    };

    // Override console.error
    console.error = function (...args) {
      const message = args.join(" ");
      const suppressErrorPatterns = [
        "fonts.googleapis.com",
        "ERR_INVALID_URL",
        "GET file://",
        "Cannot read properties of undefined (reading 'rendered')",
        "HTTP error! status: 404",
        "Error fetching menu",
        "API fetch error",
        "/wp-json/wp/v2/menus/main 404",
        "No menu items found - using static menu",
        "Error loading articles: TypeError: Cannot read properties of undefined",
        "content-loader.js:",
        "wordpress-api.js:",
        "GET http://dirk-zahlmann-headless.local/wp-json/wp/v2/menus/main 404",
        "at ContentLoader.createArticleCard",
        "at WordPressAPI.fetchAPI",
        "at async WordPressAPI.getMenu",
        "at async ContentLoader.loadMainMenu",
        "loadArticles @",
        "fetchAPI @",
        "getMenu @",
        "loadMainMenu @",
        "loadCommonContent @",
        "loadHomepageContent @",
        "init @",
        "await in loadArticles",
        "await in fetchAPI",
        "await in getMenu",
        "await in init",
        "embed.js:",
        "(anonymous) @",
        "Connection test error: timeout",
        "Connection test failed:",
        "bpccms_test_cms_connection",
        "JQMIGRATE:",
        "jQuery Migrate",
      ];

      const shouldSuppress = suppressErrorPatterns.some((pattern) =>
        message.includes(pattern),
      );

      if (!shouldSuppress) {
        originalError.apply(console, args);
      }
    };

    // Set global flag
    window.bpcSuppressLogs = true;
  } else {
    console.log(
      "%c CONSOLE SUPPRESSION - DISABLED ",
      "background: #dc3232; color: white; font-weight: bold; padding: 4px 8px; text-transform: uppercase;",
    );
    window.bpcSuppressLogs = false;
    // Clear localStorage when disabled
    localStorage.setItem("bpccms_suppress_console", "false");
  }
})();
