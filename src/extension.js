/* extension.js
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

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { panel as MainPanel } from "resource:///org/gnome/shell/ui/main.js";

import SteelSeriesIndicator from "./indicator.js";

export default class SteelSeriesIndicatorExtension extends Extension {
  #indicator = null;
  #settings = null;

  enable() {
    this.#settings = this.getSettings();
    this.#indicator = new SteelSeriesIndicator(this, this.#settings);
    MainPanel.addToStatusArea(this.uuid, this.#indicator);
  }

  disable() {
    this.#indicator?.destroy();
    this.#indicator = null;
    this.#settings = null;
  }
}
