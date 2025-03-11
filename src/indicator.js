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

import GLib from "gi://GLib";
import GObject from "gi://GObject";
import St from "gi://St";
import Clutter from "gi://Clutter";

import { gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

import * as utils from "./utils.js";
import { MOUSE_STATE_UPDATE_INTERVAL, MOUSE_STATUS } from "./constants.js";

export default class SteelSeriesIndicator extends PanelMenu.Button {
  static {
    GObject.registerClass(this);
  }

  #widgets = {};

  /** @type {{ [key: string]: number }} */
  #source = 0;

  constructor(_) {
    super(null);

    this.#initUI();
    this.#initSources(0);
  }

  #initSources(timeout = null) {
    this.#source = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      timeout !== null ? timeout : MOUSE_STATE_UPDATE_INTERVAL,
      () => this.updateBatteryState(),
    );
  }

  #initUI() {
    this.#widgets = {
      box: new St.BoxLayout({
        style_class: "panel-status-menu-box",
      }),
      icon: new St.Icon({
        icon_name: "battery-level-100-symbolic",
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

    let item = new PopupMenu.PopupMenuItem(_("Refresh status"));
    item.connect("activate", async () => {
      this.#initSources(0);
    });
    this.menu.addMenuItem(item);
  }

  updateBatteryState() {
    try {
      utils.callCommandAsync(["rivalcfg", "--battery-level"], (state) => {
        this.#initSources();
        if (state.code !== 0) {
          utils.log(`Error getting battery state: ${state.stderr}`);

          this.#updateUI(MOUSE_STATUS.UNKNOWN, -1);
          return;
        }

        const out = state.stdout.split(" ");

        let status = MOUSE_STATUS.UNKNOWN;
        if (out[0] === "Charging") {
          status = MOUSE_STATUS.CHARGING;
        } else if (out[0] === "Discharging") {
          status = MOUSE_STATUS.DISCHARGING;
        }

        let level = "-1";
        if (status !== MOUSE_STATUS.UNKNOWN) {
          level = out[out.length - 2];
        }

        this.#updateUI(status, level);
      });
    } catch (e) {
      this.#initSources();
      utils.log(`ERROR: ${e}`);

      this.#updateUI(MOUSE_STATUS.UNKNOWN, -1);
    }

    return GLib.SOURCE_DESTROY;
  }

  #updateUI(status, level) {
    this.#widgets.icon.icon_name = this.#getBatteryIcon(status, level);
    this.#widgets.label.text = this.#getBatteryLevelString(level);

    if (status === MOUSE_STATUS.CHARGING) {
      this.#widgets.label.add_style_class_name("charging");
    } else if (level <= 10) {
      this.#widgets.label.add_style_class_name("critical");
    } else {
      this.#widgets.label.remove_style_class_name("critical");
    }
  }

  /**
   * @param {MOUSE_STATUS} Provide the current mouse power status
   * @param {int} Actual battery level
   *
   * @returns {string} Image glyph to apply to the button icon
   */
  #getBatteryIcon(status, level) {
    if (status === MOUSE_STATUS.UNKNOWN) {
      return "battery-missing-symbolic";
    } else if (status === MOUSE_STATUS.CHARGING) {
      if (level >= 70) return "battery-level-100-charged-symbolic";
      else return "battery-level-0-charging-symbolic";
    } else if (status === MOUSE_STATUS.DISCHARGING) {
      if (level >= 90) {
        return "battery-level-100-symbolic";
      } else if (level >= 80) {
        return "battery-level-90-symbolic";
      } else if (level >= 70) {
        return "battery-level-80-symbolic";
      } else if (level >= 60) {
        return "battery-level-70-symbolic";
      } else if (level >= 50) {
        return "battery-level-60-symbolic";
      } else if (level >= 40) {
        return "battery-level-50-symbolic";
      } else if (level >= 30) {
        return "battery-level-40-symbolic";
      } else if (level >= 20) {
        return "battery-level-30-symbolic";
      } else {
        return "battery-caution-symbolic";
      }
    }

    return "battery-missing";
  }

  #getBatteryLevelString(level) {
    return level > 0 ? `${level}%` : "?";
  }

  destroy() {
    GLib.Source.remove(this.#source);

    this.#widgets?.icon?.destroy();
    this.#widgets?.label?.destroy();
    this.#widgets?.box?.destroy();

    super.destroy();
  }
}
