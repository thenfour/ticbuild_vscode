# VS Code support for ticbuild

This is a VS Code extension adding some syntax highlighting to support
[ticbuild](https://github.com/thenfour/ticbuild).

[ticbuild](https://github.com/thenfour/ticbuild) is a build system for
[TIC-80](https://tic80.com/), and it adds preprocessor support to the Lua
programming language.

# Installation

```bash
# install from command line
code --install-extension ./ticbuild-preproc-highlight-0.0.1.vsix
```

# Usage

Upon installing & enabling this, you should see highlighting:

![alt text](.attachments/image.png)

# Building

```bash
# create package
npx @vscode/vsce package
```

# Make certain it's really updated in case of updates/reinstall

(mostly for development)

You can use `--force` to `code --install-extension`, however most reliable is to:

1. in vs code, extensions, open the page for this extension. uninstall it.
2. click on the little size (2.14kb) hyperlink; it opens the dir where it is on disk. Delete its folder.
