import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class SteelSeriesIndicatorPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _("SteelSeries Battery Indicator"),
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: _("General"),
    });
    page.add(group);

    const updateIntervalRow = new Adw.SpinRow({
      title: _("Update interval"),
      subtitle: _("Seconds between battery checks"),
      adjustment: new Gtk.Adjustment({
        lower: 10,
        upper: 3600,
        step_increment: 10,
        page_increment: 60,
      }),
    });
    group.add(updateIntervalRow);

    settings.bind(
      "update-interval",
      updateIntervalRow,
      "value",
      Gio.SettingsBindFlags.DEFAULT,
    );
    window._settings = settings;
  }
}
