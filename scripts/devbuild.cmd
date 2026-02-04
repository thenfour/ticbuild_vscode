@echo off
setlocal
cls

pushd %~dp0..

pushd .\ControlSurfaceUI

call npm run build || exit /b %errorlevel%

popd

call code --uninstall-extension tridentloop.ticbuild-vs-code
call vsce package || exit /b %errorlevel%
call code --install-extension ./ticbuild-vs-code-0.0.4.vsix || exit /b %errorlevel%

popd

endlocal

echo done; now refresh VS Code window to load updated extension.
