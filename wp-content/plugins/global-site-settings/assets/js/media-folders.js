/**
 * Media Folders — folder filter dropdown for the Media Library grid / media modal.
 * Data: window.belimsMediaFolders = { taxonomy, label, folders: [{ slug, name }] }
 */
(function (wp, config) {
  if (!wp || !wp.media || !config) return;

  var FolderFilter = wp.media.view.AttachmentFilters.extend({
    id: "media-attachment-folder-filter",

    createFilters: function () {
      var filters = {};
      var taxonomy = config.taxonomy;

      filters.all = { text: config.label, props: {}, priority: 10 };
      filters.all.props[taxonomy] = "";

      config.folders.forEach(function (folder, index) {
        var props = {};
        props[taxonomy] = folder.slug;
        filters[folder.slug] = { text: folder.name, props: props, priority: 20 + index };
      });

      this.filters = filters;
    },
  });

  var Browser = wp.media.view.AttachmentsBrowser;
  wp.media.view.AttachmentsBrowser = Browser.extend({
    createToolbar: function () {
      Browser.prototype.createToolbar.call(this);
      this.toolbar.set(
        "belimsFolderFilter",
        new FolderFilter({
          controller: this.controller,
          model: this.collection.props,
          priority: -75,
        }).render()
      );
    },
  });
})(window.wp, window.belimsMediaFolders);
