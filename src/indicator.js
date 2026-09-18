/* indicator.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import St from "gi://St";

import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import { BATTERY_STATUS, parseBatteryOutput } from "./battery.js";
import { runCommand } from "./utils.js";

const COMMAND_TIMEOUT_MS = 2_000;
const FAILURE_LIMIT = 3;

export default class SteelSeriesIndicator extends PanelMenu.Button {
  static {
    GObject.registerClass(this);
  }

  #extension;
  #settings;
  #settingsSignalId = 0;
  #widgets;
  #refreshSourceId = 0;
  #cancellable = null;
  #refreshing = false;
  #destroyed = false;
  #failures = 0;

  constructor(extension, settings) {
    super(0.0, extension.metadata.name, false);

    this.#extension = extension;
    this.#settings = settings;
    this.#initUI();
    this.#settingsSignalId = this.#settings.connect(
      "changed::update-interval",
      () => this.#reschedule(),
    );
    void this.#refresh();
  }

  #initUI() {
    this.#widgets = {
      box: new St.BoxLayout({ style_class: "panel-status-menu-box" }),
      icon: new St.Icon({
        icon_name: "battery-missing-symbolic",
        style_class: "icon",
      }),
      label: new St.Label({
        text: "?",
        style_class: "label",
        x_expand: true,
        y_expand: true,
        x_align: Clutter.ActorAlign.FILL,
        y_align: Clutter.ActorAlign.CENTER,
      }),
    };

    this.#widgets.box.add_child(this.#widgets.icon);
    this.#widgets.box.add_child(this.#widgets.label);
    this.add_child(this.#widgets.box);

    const refresh = new PopupMenu.PopupMenuItem(_("Refresh status"));
    refresh.connect("activate", () => void this.#refresh());
    this.menu.addMenuItem(refresh);

    const preferences = new PopupMenu.PopupMenuItem(_("Preferences"));
    preferences.connect("activate", () => this.#extension.openPreferences());
    this.menu.addMenuItem(preferences);
  }

  #reschedule() {
    this.#removeRefreshSource();
    if (!this.#refreshing) this.#scheduleRefresh();
  }

  #scheduleRefresh() {
    if (this.#destroyed || this.#refreshSourceId) return;

    this.#refreshSourceId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      this.#settings.get_uint("update-interval"),
      () => {
        this.#refreshSourceId = 0;
        void this.#refresh();
        return GLib.SOURCE_REMOVE;
      },
    );
  }

  #removeRefreshSource() {
    if (!this.#refreshSourceId) return;
    GLib.Source.remove(this.#refreshSourceId);
    this.#refreshSourceId = 0;
  }

  async #refresh() {
    if (this.#destroyed || this.#refreshing) return;

    this.#removeRefreshSource();
    this.#refreshing = true;
    const cancellable = new Gio.Cancellable();
    this.#cancellable = cancellable;

    try {
      const output = await runCommand(
        ["rivalcfg", "--battery-level"],
        COMMAND_TIMEOUT_MS,
        cancellable,
      );
      const state = parseBatteryOutput(output);
      if (!state) throw new Error(`Invalid rivalcfg output: ${output}`);
      if (this.#destroyed) return;
      this.#failures = 0;
      this.#updateUI(state.status, state.level);
    } catch (error) {
      if (this.#destroyed) return;
      this.#failures += 1;
      console.error(`[${this.#extension.uuid}] ${error.message}`);
      if (this.#failures >= FAILURE_LIMIT)
        this.#updateUI(BATTERY_STATUS.UNKNOWN, null);
    } finally {
      if (this.#cancellable === cancellable) this.#cancellable = null;
      this.#refreshing = false;
      this.#scheduleRefresh();
    }
  }

  #updateUI(status, level) {
    this.#widgets.icon.icon_name = this.#getBatteryIcon(status, level);
    this.#widgets.label.text = level === null ? "?" : `${level}%`;
    this.#widgets.label.remove_style_class_name("charging");
    this.#widgets.label.remove_style_class_name("critical");

    if (status === BATTERY_STATUS.CHARGING)
      this.#widgets.label.add_style_class_name("charging");
    else if (level !== null && level <= 10)
      this.#widgets.label.add_style_class_name("critical");
  }

  #getBatteryIcon(status, level) {
    if (status === BATTERY_STATUS.UNKNOWN || level === null)
      return "battery-missing-symbolic";

    const iconLevel = Math.min(100, Math.ceil(level / 10) * 10);
    if (status === BATTERY_STATUS.CHARGING) {
      if (iconLevel === 100) return "battery-level-100-charged-symbolic";
      return `battery-level-${iconLevel}-charging-symbolic`;
    }

    return `battery-level-${iconLevel}-symbolic`;
  }

  destroy() {
    this.#destroyed = true;
    this.#removeRefreshSource();
    this.#cancellable?.cancel();
    this.#cancellable = null;

    if (this.#settingsSignalId)
      this.#settings.disconnect(this.#settingsSignalId);

    this.#settingsSignalId = 0;
    this.#extension = null;
    this.#settings = null;
    this.#widgets = null;
    super.destroy();
  }
}
