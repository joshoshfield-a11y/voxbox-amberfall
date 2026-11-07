#!/bin/bash
# VoxBox: Amberfall APK build — direct SDK tools, no Gradle.
# Adapted from ~/workspace/surface-wars/apk/build.sh (same pipeline:
# javac → aapt2 compile/link → d8 dex → aapt add classes.dex →
# zipalign → apksigner sign (debug keystore) → verify + badging).
# Run from ~/workspace/voxbox-amberfall/apk AFTER `npm run build` in
# ../xandria-studio. Packages THAT dist/player.html, byte-verified
# against the packaged copy (cmp aborts the build on any difference).
# Identity: package com.skit.voxboxamberfall, versionCode 1, versionName 1.0
# by default. Realism phase (2026-11-02) parameterizes the version so
# the realism APK installs OVER v1.0 without overwriting the v1.0 file:
#   VERSION_CODE=2 VERSION_NAME=1.1 APK_NAME=VoxBox_Amberfall_realism.apk ./build.sh
# Defaults reproduce the v1.0 build byte-for-byte in identity (the
# player.html content is whatever the current dist build holds).
# Keystore: apk/debug.keystore, alias voxboxamberfall, DEBUG ONLY.
# It is a NEW per-game debug keystore (no shared cross-game debug
# keystore exists — Surface Wars, STARFALL, Scrap Dungeon each carry
# their own). Future VoxBox updates MUST reuse this keystore to install
# over v1.0. Release signing is a user-only step, NOT this script.
set -euo pipefail
export _JAVA_OPTIONS="-Djava.net.preferIPv4Stack=true"
SDK=~/android-sdk
BT=$SDK/build-tools/35.0.0
PLATFORM=$SDK/platforms/android-35/android.jar
JAVA_HOME=~/jdk17
export PATH="$JAVA_HOME/bin:$PATH"
JAVAC=$JAVA_HOME/bin/javac
KEYTOOL=$JAVA_HOME/bin/keytool
ROOT=~/workspace/voxbox-amberfall
APKDIR=$ROOT/apk
VERSION_CODE=${VERSION_CODE:-1}
VERSION_NAME=${VERSION_NAME:-1.0}
APK_NAME=${APK_NAME:-VoxBox_Amberfall_v1.0.apk}
OUT=$APKDIR/out
rm -rf "$OUT" "$APKDIR/assets"
mkdir -p "$OUT" "$APKDIR/assets/game"

# --- 1. Snapshot the fresh player build (single-file, no other assets) ---
cp "$ROOT/xandria-studio/dist/player.html" "$APKDIR/assets/game/player.html"
cmp "$ROOT/xandria-studio/dist/player.html" "$APKDIR/assets/game/player.html"
echo "player.html bytes: $(stat -c%s "$APKDIR/assets/game/player.html")"

# --- 2. Compile, link, dex, package ---
mkdir -p "$OUT/classes" "$OUT/gen"
"$JAVAC" -source 8 -target 8 -bootclasspath "$PLATFORM" \
  -d "$OUT/classes" "$APKDIR/src/com/skit/voxboxamberfall/MainActivity.java"
"$BT/aapt2" compile --dir "$APKDIR/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/unsigned.apk" -I "$PLATFORM" \
  --manifest "$APKDIR/AndroidManifest.xml" "$OUT/res.zip" \
  -A "$APKDIR/assets" --auto-add-overlay --java "$OUT/gen" \
  --min-sdk-version 28 --target-sdk-version 35 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME"
"$BT/d8" --lib "$PLATFORM" --output "$OUT" "$OUT/classes/com/skit/voxboxamberfall/MainActivity.class"
cp "$OUT/unsigned.apk" "$OUT/packaged.apk"
# Add dex by relative name from inside $OUT: aapt stores the path as given,
# and an absolute path would land in the APK as /home/.../classes.dex (unloadable).
(cd "$OUT" && "$BT/aapt" add packaged.apk classes.dex >/dev/null)

# --- 3. Align + sign (VoxBox debug keystore, created once, reused after) ---
if [ ! -f "$APKDIR/debug.keystore" ]; then
  "$KEYTOOL" -genkeypair -v -keystore "$APKDIR/debug.keystore" -storepass android \
    -keypass android -alias voxboxamberfall -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=VoxBox Amberfall Debug, OU=Debug, O=Skit, C=US" >/dev/null
fi
"$BT/zipalign" -f 4 "$OUT/packaged.apk" "$OUT/aligned.apk"
"$BT/apksigner" sign --ks "$APKDIR/debug.keystore" --ks-pass pass:android \
  --key-pass pass:android --out "$OUT/$APK_NAME" "$OUT/aligned.apk"
"$BT/apksigner" verify "$OUT/$APK_NAME"
"$BT/zipalign" -c 4 "$OUT/$APK_NAME"
"$BT/aapt2" dump badging "$OUT/$APK_NAME"
cp "$OUT/$APK_NAME" ~/workspace/your_files/"$APK_NAME"
echo "APK: $(stat -c%s ~/workspace/your_files/"$APK_NAME") bytes"
sha256sum ~/workspace/your_files/"$APK_NAME"
