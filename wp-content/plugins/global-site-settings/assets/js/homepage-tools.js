/**
 * Site Settings → Homepage tab: publishing controls (Belims_Homepage AJAX endpoints).
 * Data: window.belimsHomepageTools = { ajaxurl, nonce }
 */
jQuery(function ($) {
  const config = window.belimsHomepageTools;
  const $card = $("#belims-homepage-publishing");
  if (!config || !$card.length) return;

  const $el = (name) => $card.find(`[data-hp="${name}"]`);
  const $hookRow = (target) => $card.find(`[data-hp-hook="${target}"]`);

  const request = (action, data = {}) =>
    $.post(config.ajaxurl, { action: `belims_homepage_${action}`, nonce: config.nonce, ...data }).then((res) => {
      if (!res.success) throw new Error(res.data?.message || "Request failed");
      return res.data;
    });

  const syncLabel = (status, target) => {
    if (status.pending && target.selected) return "Publishing…";
    if (target.in_sync) return "Up to date";
    if (target.live) return "Out of date";
    return "Unreachable";
  };

  const render = (status) => {
    $card.find(`input[name="belims-hp-target"][value="${status.choice}"]`).prop("checked", true);

    const $targets = $el("targets").empty();
    let canPublish = false;

    Object.entries(status.targets).forEach(([key, target]) => {
      $("<div class=\"bpc-status-item\">")
        .append($("<div class=\"bpc-status-title\">").text(`${target.label}${target.selected ? " (rebuilds on save)" : ""}`))
        .append($("<div class=\"bpc-status-value\">").text(`${syncLabel(status, target)} — ${target.url}`))
        .appendTo($targets);

      const $row = $hookRow(key);
      $row.find('[data-hp="hook-saved"]').prop("hidden", !target.hook_set);
      $row.find('[data-hp="hook-form"]').prop("hidden", target.hook_set);
      $row.find('[data-hp="hook-masked"]').text(target.hook_masked);
      if (target.selected && target.hook_set) canPublish = true;
    });

    const last = status.last_deploy;
    $el("last").text(last ? `${last.time} — ${last.result}` : "Never");
    $card.find('[data-hp-action="publish"]').prop("disabled", !canPublish);
  };

  const message = (text) => $el("message").text(text);
  const refresh = () => request("status").then(render).catch((e) => message(e.message));

  $card.on("change", 'input[name="belims-hp-target"]', function () {
    request("save_target", { choice: $(this).val() })
      .then((s) => { render(s); message("Rebuild target saved."); })
      .catch((e) => message(e.message));
  });

  $card.on("click", "[data-hp-action]", function () {
    const action = $(this).data("hp-action");
    const target = $(this).closest("[data-hp-hook]").data("hp-hook");

    if (action === "edit-hook") {
      $hookRow(target).find('[data-hp="hook-saved"]').prop("hidden", true);
      $hookRow(target).find('[data-hp="hook-form"]').prop("hidden", false);
      return;
    }

    const $btn = $(this).prop("disabled", true);
    const done = () => $btn.prop("disabled", false);

    if (action === "save-hook") {
      request("save_hook", { target, hook: $(`#belims-deploy-hook-${target}`).val() })
        .then((s) => { render(s); message("Deploy hook saved."); })
        .catch((e) => message(e.message))
        .always(done);
    }

    if (action === "publish") {
      message("Starting storefront build…");
      request("publish")
        .then((s) => { render(s); message(s.last_deploy?.result || ""); })
        .catch((e) => message(e.message))
        .always(done);
    }
  });

  refresh();
});
