/**
 * Site Settings → Media tab controls (Belims_Image_Optimizer AJAX endpoints).
 * Data: window.belimsMediaTools = { ajaxurl, nonce }
 */
jQuery(function ($) {
  const config = window.belimsMediaTools;
  const $tab = $("#tab-media");
  if (!config || !$tab.length) return;

  let pollTimer = null;

  const request = (action, data = {}) =>
    $.post(config.ajaxurl, { action: `belims_media_${action}`, nonce: config.nonce, ...data }).then((res) => {
      if (!res.success) throw new Error(res.data?.message || "Request failed");
      return res.data;
    });

  const formatMB = (bytes) => `${(bytes / 1048576).toFixed(1)}MB`;

  const render = (stats) => {
    const state = stats.state;
    $tab.find('[data-media-stat="pending"]').text(stats.pending);
    $tab.find('[data-media-stat="webp"]').text(stats.webp);
    $tab.find('[data-media-stat="failed"]').text(stats.failed);
    $tab.find('[data-media-stat="status"]').text(state.status.charAt(0).toUpperCase() + state.status.slice(1));

    const pct = state.total ? Math.round((state.processed / state.total) * 100) : state.status === "complete" ? 100 : 0;
    $tab.find("[data-media-progress]").val(pct);
    $tab
      .find("[data-media-summary]")
      .text(
        state.total
          ? `${state.processed}/${state.total} processed · ${state.converted} converted · ${state.errors} errors · ${formatMB(state.old_bytes)} → ${formatMB(state.new_bytes)}`
          : ""
      );
    $tab.find("[data-media-log]").text((state.log || []).join("\n"));

    const running = state.status === "running";
    $tab.find('[data-media-action="start"]').prop("disabled", running || state.status === "paused");
    $tab.find('[data-media-action="pause"]').prop("disabled", !running);
    $tab.find('[data-media-action="resume"]').prop("disabled", state.status !== "paused");
    $("#belims-auto-webp").prop("checked", !!stats.auto);

    clearTimeout(pollTimer);
    if (running) pollTimer = setTimeout(refresh, 4000);
  };

  const fail = (err) => window.bpcToast(err.message || err, "error");
  const refresh = () => request("status").then(render).catch(fail);

  $tab.on("click", "[data-media-action]", function () {
    const action = $(this).data("media-action");
    const $btn = $(this).prop("disabled", true);
    const done = () => $btn.prop("disabled", false);

    if (["start", "pause", "resume"].includes(action)) {
      request(action).then(render).catch(fail).always(done);
      return;
    }

    if (action === "archive-dry" || action === "archive-run") {
      const run = action === "archive-run";
      if (run && !window.confirm("Move unreferenced PNG/JPEG files out of uploads?")) return done();
      $tab.find("[data-media-archive-result]").text(run ? "Moving files…" : "Scanning…");
      request("archive", run ? { run: 1 } : {})
        .then((r) => $tab.find("[data-media-archive-result]").text(`${r.run ? "Moved" : "Dry run:"} ${r.files} files (${r.size}) → ${r.dest}`))
        .catch(fail)
        .always(done);
      return;
    }

    if (action === "assign-products") {
      $tab.find("[data-media-assign-result]").text("Assigning…");
      request("assign_products")
        .then((r) => $tab.find("[data-media-assign-result]").text(`${r.found} product images found · ${r.assigned} newly added to Products.`))
        .catch(fail)
        .always(done);
    }
  });

  $("#belims-auto-webp").on("change", function () {
    const enabled = this.checked;
    request("toggle_auto", { enabled: enabled ? 1 : 0 })
      .then((stats) => {
        render(stats);
        window.bpcToast(enabled ? "Auto-convert enabled." : "Auto-convert disabled.", "success");
      })
      .catch(fail);
  });

  refresh();
});
