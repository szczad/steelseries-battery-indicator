# SteelSeries Battery Indicator

GNOME Shell extension that displays the battery level and charging state of a supported SteelSeries wireless mouse.

## Requirements

- GNOME Shell 45 through 50
- `rivalcfg` available in `PATH` (source: [rivalcfg.flozz.org](https://rivalcfg.flozz.org/))
- Current `rivalcfg` udev rules

The reference setup uses `rivalcfg 4.17.0` with a SteelSeries Aerox 3 Wireless in 2.4 GHz mode.

Install or update the udev rules with:

```sh
sudo rivalcfg --update-udev
```

Reconnect the receiver after updating the rules. Verify access with:

```sh
rivalcfg --battery-level
```

## Backend decision

The extension uses `rivalcfg` because it supports SteelSeries wireless mice and implements their device-specific battery protocol. `steelseriesgg-rs` currently supports keyboards and headsets but does not expose mouse battery information. Both projects use udev rules to grant access to HID devices; udev does not provide the Aerox battery value by itself.

Battery reads run asynchronously with a two-second timeout. Only one read can run at a time. The last valid value is retained through two failed or malformed reads, and the indicator changes to unknown after the third consecutive failure.

## Build and test

```sh
meson setup build
meson compile -C build
meson test -C build
meson compile -C build extension.zip
```

Install the package with:

```sh
gnome-extensions install --force build/extension.zip
```

A logout and login may be required after installing a package with updated GNOME Shell compatibility metadata.
