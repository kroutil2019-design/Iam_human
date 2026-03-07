#!/usr/bin/env bash
set -euo pipefail

# Deterministic Android build: require JDK 21 and resolve it in a stable order.
# 1) IAMHUMAN_JDK_21_PATH (explicit override)
# 2) existing JAVA_HOME if it is Java 21
# 3) known dev-container SDKMAN path

DEFAULT_JDK_21_PATH="/usr/local/sdkman/candidates/java/21.0.9-ms"

is_java21() {
  local java_bin="$1/bin/java"
  if [[ ! -x "$java_bin" ]]; then
    return 1
  fi
  "$java_bin" -version 2>&1 | grep -Eq 'version "21(\.|\")'
}

resolve_jdk21() {
  if [[ -n "${IAMHUMAN_JDK_21_PATH:-}" ]] && is_java21 "$IAMHUMAN_JDK_21_PATH"; then
    printf '%s\n' "$IAMHUMAN_JDK_21_PATH"
    return
  fi

  if [[ -n "${JAVA_HOME:-}" ]] && is_java21 "$JAVA_HOME"; then
    printf '%s\n' "$JAVA_HOME"
    return
  fi

  if is_java21 "$DEFAULT_JDK_21_PATH"; then
    printf '%s\n' "$DEFAULT_JDK_21_PATH"
    return
  fi

  return 1
}

if ! JDK_PATH="$(resolve_jdk21)"; then
  echo "Error: JDK 21 is required for deterministic Android build." >&2
  echo "Set IAMHUMAN_JDK_21_PATH to a valid JDK 21 home or configure JAVA_HOME=JDK21." >&2
  exit 1
fi

echo "Using JDK: $JDK_PATH"

export JAVA_HOME="$JDK_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

./gradlew :app:assembleDebug :iamhuman-sdk:assembleDebug --no-daemon

echo "Build complete:"
echo "- APK: $SCRIPT_DIR/app/build/outputs/apk/debug/app-debug.apk"
echo "- SDK AAR: $SCRIPT_DIR/iamhuman-sdk/build/outputs/aar/iamhuman-sdk-debug.aar"
