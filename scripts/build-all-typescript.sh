#!/bin/bash
#
# Script to build all TypeScript CDK projects in parallel
#
set -euo pipefail

# Get the directory of this script
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
REPO_ROOT=$(dirname "$SCRIPT_DIR")
TYPESCRIPT_DIR="${REPO_ROOT}/typescript"
BUILD_SCRIPT="$SCRIPT_DIR/build-typescript.sh"

# Check if parallel is installed
if ! command -v parallel &> /dev/null; then
    echo "GNU parallel is not installed. Please install it first."
    exit 1
fi

# Check if the build script exists
if [ ! -f "$BUILD_SCRIPT" ]; then
  echo "Error: Build script not found at $BUILD_SCRIPT"
  exit 1
fi

# Create a temporary directory for build logs
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Find all TypeScript CDK projects (directories with cdk.json)
# Exclude any matches from node_modules directories, cdk.out directories, and specific problematic projects
echo "Finding all TypeScript CDK projects..."
PROJECTS=$(find "$TYPESCRIPT_DIR" -name "cdk.json" -type f \
  -not -path "*/node_modules/*" \
  -not -path "*/cdk.out/*" \
  | sort)

# Count total projects
TOTAL_PROJECTS=$(echo "$PROJECTS" | wc -l)
echo "Found $TOTAL_PROJECTS TypeScript CDK projects to build"
echo "=============================="

# Function to build a single project
build_project() {
    CDK_JSON_PATH="$1"
    PROJECT_DIR=$(dirname "$CDK_JSON_PATH")
    REL_PATH=$(realpath --relative-to="$REPO_ROOT" "$PROJECT_DIR")
    LOG_FILE="$TEMP_DIR/$(echo "$REL_PATH" | tr '/' '_').log"

    # Show start message
    echo "▶️ Starting build: $REL_PATH"

    # Check for DO_NOT_AUTOTEST file
    if [ -f "$PROJECT_DIR/DO_NOT_AUTOTEST" ]; then
        echo "⏭️ Skipping $REL_PATH (DO_NOT_AUTOTEST flag found)"
        echo "SKIPPED:$REL_PATH" > "$LOG_FILE.status"
        return 0
    fi

    # Find the package.json in the project directory
    PACKAGE_JSON="$PROJECT_DIR/package.json"
    if [ ! -f "$PACKAGE_JSON" ]; then
        echo "⏭️ Skipping $REL_PATH (no package.json found)"
        echo "SKIPPED:$REL_PATH" > "$LOG_FILE.status"
        return 0
    fi

    # Get the relative path to package.json for the build script
    PACKAGE_JSON_REL_PATH=$(realpath --relative-to="$REPO_ROOT" "$PACKAGE_JSON")

    # Create a modified version of the build script that suppresses cdk synth output
    TEMP_BUILD_SCRIPT="$TEMP_DIR/build-$(basename "$REL_PATH").sh"
    cat > "$TEMP_BUILD_SCRIPT" << 'EOF'
#!/bin/bash
set -euo pipefail

# Get the original script and arguments
ORIGINAL_SCRIPT="$1"
shift
ARGS="$@"

# Run the original script but capture and filter the output
"$ORIGINAL_SCRIPT" "$ARGS" 2>&1 | grep -v "cdk synth" | grep -v "Synthesizing"
EOF
    chmod +x "$TEMP_BUILD_SCRIPT"

    # Run the build script with filtered output
    if "$TEMP_BUILD_SCRIPT" "$BUILD_SCRIPT" "$PACKAGE_JSON_REL_PATH" > "$LOG_FILE" 2>&1; then
        echo "✅ Build successful: $REL_PATH"
        echo "SUCCESS:$REL_PATH" > "$LOG_FILE.status"
    else
        echo "❌ Build failed: $REL_PATH"
        echo "FAILED:$REL_PATH" > "$LOG_FILE.status"
    fi
}
export -f build_project
export SCRIPT_DIR
export REPO_ROOT
export BUILD_SCRIPT
export TEMP_DIR

# Run builds in parallel
echo "$PROJECTS" | parallel --will-cite --jobs 50% build_project

# Collect results
SUCCESSFUL=0
FAILED=0
SKIPPED=0
ALL_PROJECTS=()

for STATUS_FILE in "$TEMP_DIR"/*.status; do
    [ -f "$STATUS_FILE" ] || continue

    STATUS_CONTENT=$(cat "$STATUS_FILE")
    STATUS_TYPE=${STATUS_CONTENT%%:*}
    PROJECT_PATH=${STATUS_CONTENT#*:}

    case "$STATUS_TYPE" in
        "SUCCESS")
            ((SUCCESSFUL++))
            ALL_PROJECTS+=("✅ $PROJECT_PATH")
            ;;
        "FAILED")
            ((FAILED++))
            ALL_PROJECTS+=("❌ $PROJECT_PATH")
            ;;
        "SKIPPED")
            ((SKIPPED++))
            ALL_PROJECTS+=("⏭️ $PROJECT_PATH")
            ;;
    esac
done

# Sort the projects list
IFS=$'\n' SORTED_PROJECTS=($(sort <<<"${ALL_PROJECTS[*]}"))
unset IFS

# Print summary
echo ""
echo "=============================="
echo "BUILD SUMMARY"
echo "=============================="
echo "Total: $((SUCCESSFUL + FAILED + SKIPPED)) (✅ $SUCCESSFUL succeeded, ❌ $FAILED failed, ⏭️ $SKIPPED skipped)"
echo ""
echo "Project Status:"
echo "-----------------------------"
for PROJ in "${SORTED_PROJECTS[@]}"; do
    echo "$PROJ"
done

# If any builds failed, print their logs and exit with error
if [ $FAILED -gt 0 ]; then
    echo ""
    echo "Build logs for failed projects:"
    echo "=============================="
    for PROJ in "${SORTED_PROJECTS[@]}"; do
        if [[ $PROJ == ❌* ]]; then
            PROJECT_PATH=${PROJ#❌ }
            echo ""
            echo "Log for $PROJECT_PATH:"
            echo "-------------------------------------------"
            cat "$TEMP_DIR/$(echo "$PROJECT_PATH" | tr '/' '_').log"
            echo "-------------------------------------------"
        fi
    done
    exit 1
fi
