# ticbuild TIC-80 development & debugging platform extension for VS Code

This is a VS Code extension adding support for
[ticbuild](https://github.com/thenfour/ticbuild). [ticbuild](https://github.com/thenfour/ticbuild) is a build system for [TIC-80](https://tic80.com/).

This extension:

- Adds monitoring and remote control of TIC-80 for debugging and development.
- Adds syntax highlighting to Lua preprocessing done by ticbuild

## Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=TridentLoop.ticbuild-vs-code)
- [ticbuild_vscode on Github (this project)](https://github.com/thenfour/ticbuild_vscode)

### Related

- [ticbuild on Github](https://github.com/thenfour/ticbuild)
- [Somatic - web-based TIC-80 music tracker](https://somatic.tenfourmusic.net/)
- [Discord](https://discord.gg/kkf9gQfKAd)
- [TIC-80 homepage](https://tic80.com/)

This project is free, a labor of love; if you find it useful, please support by spreading the word or,

[![Support me on ko-fi](.attachments/support_me_on_kofi_beige.png)](https://ko-fi.com/E1E71QVJ5Z)

# Usage

After installing, you should see syntax highlighting for Lua preprocessor (used by
ticbuild)

![alt text](.attachments/image.png)

You can also attach to a running instance of TIC-80 for control surface support.
To do this, <kbd>F5</kbd> on a ticbuild project to launch the cart in watch mode.

This extension will automatically connect to the launched TIC-80 instance; you can
verify this in the status bar:

![alt text](.attachments/image-1.png)

You can also manually connect to a running instance by using the command palette
(<kbd>ctrl+shift+P</kbd>):

![alt text](.attachments/image-2.png)

Select `TIC-80: Attach.` and you can specify a running instance.

Select `TIC-80: Add Panel` to add a control surface.

# Building

```bash
# create package
npx @vscode/vsce package
```

# Make certain it's really updated in case of updates/reinstall

(mostly for development)

You can use `--force` to `code --install-extension`, however most reliable is to:

- in the command palette, `Developer: Reload Window`

or more forcefully,

1. in vs code, extensions, open the page for this extension. uninstall it.
2. click on the little size (2.14kb) hyperlink; it opens the dir where it is on disk. Delete its folder.

# Instance discovery

Discovery of running TIC-80 instances is described in the [TIC-80-ticbuild fork](https://github.com/thenfour/TIC-80-ticbuild/tree/main/src/ticbuild_remoting#discovery-protocol).

# `ticbuild watch` auto-attach system

When `ticbuild watch` launches the `TIC-80`, it instructs the discovery session file
to be placed in the current project directory (and not in the global location).
This allows VS Code to auto-connect when the current project is launched.

# Troubleshooting

This project is in alpha state. You might not know what's going on. Places
to check for issues:

-

Output window -> select `TIC-80 Remote` in the output channel.

# building

webview and extension are built via `scripts/devbuild.cmd`. It's primitive:
⚠️ you need to manually update the version if it changes or it will install the
wrong version.

Webview has mocked in-browser dev experience

```bash
npm run watch
```

and serve in yet another terminal:

```bash
npm run serve
```

for dev we launch in a browser, but mock the data and vscodeapi.

# Manual installation

```bash

# install
code --install-extension tridentloop.ticbuild-vs-code

# install from command line (install by file)
code --install-extension ./ticbuild-preproc-highlight-0.0.4.vsix

# uninstall
code --uninstall-extension tridentloop.ticbuild-vs-code
```
