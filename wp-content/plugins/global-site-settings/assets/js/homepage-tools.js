/**
 * Site Settings → Homepage tab: publishing controls (Belims_Homepage AJAX endpoints).
 * Data: window.belimsHomepageTools = { ajaxurl, nonce }
 */
jQuery(function ($) {
  const config = window.belimsHomepageTools;
  const $card = $("#belims-homepage-publishing");
  if (!config || !$card.length) return;

  const $el = (name) => $card.find(`[data-hp="${name}"]`);

  const request = (action, data = {}) =>
    $.post(config.ajaxurl, { action: `belims_homepage_${action}`, nonce: config.nonce, ...data }).then((res) => {
      if (!res.success) throw new Error(res.data?.message || "Request failed");
      return res.data;
    });

  const render = (status) => {
    let sync = "Unreachable";
    if (status.pending) sync = "Publishing…";
    else if (status.in_sync) sync = "Up to date";
    else if (status.live) sync = "Out of date";
    $el("sync").text(sync);

    const last = status.last_deploy;
    $el("last").text(last ? `${last.time} — ${last.result}` : "Never");

    $el("hook-saved").prop("hidden", !status.hook_set);
    $el("hook-form").prop("hidden", status.hook_set);
    $el("hook-masked").text(status.hook_masked);
    $card.find('[data-hp-action="publish"]').prop("disabled", !status.hook_set);
  };

  const message = (text) => $el("message").text(text);
  const refresh = () => request("status").then(render).catch((e) => message(e.message));

  $card.on("click", "[data-hp-action]", function () {
    const action = $(this).data("hp-action");

    if (action === "edit-hook") {
      $el("hook-saved").prop("hidden", true);
      $el("hook-form").prop("hidden", false);
      return;
    }

    const $btn = $(this).prop("disabled", true);
    const done = () => $btn.prop("disabled", false);

    if (action === "save-hook") {
      request("save_hook", { hook: $("#belims-deploy-hook").val() })
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
