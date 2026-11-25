#!/bin/sh
# Copyright 2026 Tauric Research
# SPDX-License-Identifier: Apache-2.0
# Build this checkout and install it as `tradingagents`, for your own use: `npm run install:local`.
#
# The executable goes to TRADINGAGENTS_INSTALL_DIR (default ~/.local/bin, where install.sh puts a release),
# in place of the one there before, which is not kept. It is marked as a build of your own source, so it does
# not offer releases of the original to replace it: to update, git pull and run this again.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
dir=${TRADINGAGENTS_INSTALL_DIR:-"$HOME/.local/bin"}
name=tradingagents

fail() {
	echo "install-local: $*" >&2
	exit 1
}

command -v node >/dev/null 2>&1 || fail "Node.js 22 or newer is needed to build"
command -v npm >/dev/null 2>&1 || fail "npm is needed to build"

cd "$root"
if [ ! -d node_modules ] || [ ! -x node_modules/.bin/bun ]; then
	echo "Installing the build's dependencies..."
	npm run ci:install
fi

echo "Building..."
TRADINGAGENTS_LOCAL_BUILD=1 npm run compile >/dev/null
built="$root/dist-bin/$name"
[ -x "$built" ] || fail "the build did not make $built"

mkdir -p "$dir"
# Copied beside it, then moved into place, so a failed copy never leaves half a file.
cp "$built" "$dir/.$name.new"
chmod 755 "$dir/.$name.new"
mv -f "$dir/.$name.new" "$dir/$name"

version=$("$dir/$name" --version) || fail "the installed $name does not start"
echo "Installed $name $version (built from $(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo "this checkout")) at $dir/$name"
case ":$PATH:" in
*":$dir:"*) ;;
*) echo "Add $dir to your PATH to run it as $name." ;;
esac
