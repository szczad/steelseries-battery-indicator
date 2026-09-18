# SteelSeries Battery Indicator

GNOME Shell extension that reports SteelSeries device battery status through
`rivalcfg`. Source code is in `src/`, tests are in `tests/`, and settings
schemas are in `schemas/`.

## Guidelines

- Always plan first, then build the response to the user.
- Always make sure You and the user are on the same page. Ask questions so everything is agreed in 100%.
- If unsure - ask questions. The questions must be verbose and explanatory. The answers to choose must also be verbose enough for the user to understand.
- Always build and test after making changes.
- Edit `meson-gse.build`, not the generated `meson.build`.
- Regenerate `meson.build` with `meson-gse/meson-gse` after build-definition
  changes.
- Keep `README.md` user-facing.
- Keep maintainer notes in the gitignored `.internal/docs/` directory.

## Validation

```sh
meson setup build
meson compile -C build
meson test -C build --print-errorlogs
meson compile -C build extension.zip
unzip -t build/extension.zip
```

Use `meson setup build --wipe` when build configuration changes. After workflow
edits, validate the YAML and run `git diff --check`.

## Releases

GitHub Actions builds pull requests and `master`. Tags matching `v*` publish to
GNOME Extensions when the tagged commit is on `master`. Publishing requires the
`EGO_USERNAME` and `EGO_PASSWORD` repository secrets.
