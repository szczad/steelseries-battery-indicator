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

const MOUSE_STATE_UPDATE_INTERVAL = 5 * 1_000;
const UI_UPDATE_INTERVAL = 1_000;

const MOUSE_STATUS = {
  UNKNOWN: "unknown",
  CHARGING: "charging",
  DISCHARGING: "discharging",
};

export default class SteelSeriesIndicator extends PanelMenu.Button {
  static {
    GObject.registerClass(this);
  }

  #extension = null;

  #widgets = {};

  /** @type {{ [key: string]: number }} */
  #sourceIds = {};

  #state = {};

  constructor(extension) {
    super(null);

    this.#extension = extension;

    this.#initUI();
    this.#initSources();
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
      utils.log("Manually refreshing");
      await this.refresh();
    });
    this.menu.addMenuItem(item);
  }

  async #initSources() {
    utils.log("Initializing sources");
    await this.refresh();

    utils.log("Setting up sources: refresh");
    this.#sourceIds.refresh = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      MOUSE_STATE_UPDATE_INTERVAL,
      () => this.refresh(),
    );

    utils.log("Setting up sources: repaint");
    this.#sourceIds.repaint = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      UI_UPDATE_INTERVAL,
      () => this.repaint(),
    );
  }

  async refresh() {
    utils.log(`Refreshing state`);
    this.#state = await this.#getBatteryState();
    utils.log(`Battery state: ${this.#state.status}, ${this.#state.level}`);

    return GLib.SOURCE_CONTINUE;
  }

  repaint() {
    this.#widgets.icon.icon_name = this.#getBatteryIcon(
      this.#state.status,
      this.#state.level,
    );
    this.#widgets.label.text = `${this.#state.level}%`;

    if (this.#state.status === MOUSE_STATUS.CHARGING) {
      this.#widgets.label.add_style_class_name("charging");
    } else if (this.#state.level <= 10) {
      this.#widgets.label.add_style_class_name("critical");
    } else {
      this.#widgets.label.remove_style_class_name("critical");
    }

    return GLib.SOURCE_CONTINUE;
  }

  /**
   * @returns {Primise<{status: string, level: string}>} Get current battery level
   */
  async #getBatteryState() {
    let proc = null;
    try {
      proc = await utils.callCommand([
        "/usr/local/bin/rivalcfg",
        "--battery-level",
      ]);
    } catch (e) {
      utils.log(`Error getting battery state: ${e.message}`);
      utils.log(e.stack);
    }
    utils.log(`Got battery state: ${proc.code}|${proc.stdout}|${proc.stderr}`);

    if (proc.code !== 0)
      return {
        status: MOUSE_STATUS.UNKNOWN,
        level: -1,
      };

    const out = proc.stdout.split(" ");

    let status = MOUSE_STATUS.UNKNOWN;
    if (out[0] === "Charging") {
      status = MOUSE_STATUS.CHARGING;
    } else if (out[0] === "Discharging") {
      status = MOUSE_STATUS.DISCHARGING;
    }

    let level = "?";
    if (status !== MOUSE_STATUS.UNKNOWN) {
      level = out[out.length - 2];
    }

    return {
      status: status,
      level: level,
    };
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
  }

  destroy() {
    GLib.source_remove(this.#sourceIds.refresh);
    GLib.source_remove(this.#sourceIds.repaint);

    this.#widgets?.icon?.destroy();
    this.#widgets?.label?.destroy();
    this.#widgets?.box?.destroy();

    super.destroy();
  }
}
