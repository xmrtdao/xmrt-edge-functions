#!/bin/bash
# xmrt-edge-deploy.sh — Unified edge function deployer for XMRT DAO fleet
# Usage: ./xmrt-edge-deploy.sh [register-agent|task-status-update|agent-heartbeat|all]
#
# Requires:
#   export SUPABASE_ACCESS_TOKEN=sbp_...
#   export SUPABASE_PROJECT_REF=vawouugtzwmejxqkeqqj

set -e

FUNCTIONS_DIR="${1:-./edge-functions}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-vawouugtzwmejxqkeqqj}"
FUNCTIONS=(
  "register-agent"
  "task-status-update"
  "agent-heartbeat"
)

echo "🚀 XMRT DAO Edge Function Deploy"
echo "Project: $PROJECT_REF"
echo ""

# Check token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN not set"
    echo "Get it from: https://supabase.com/dashboard/account/tokens"
    echo "Then: export SUPABASE_ACCESS_TOKEN=sbp_your_token"
    exit 1
fi

# Install CLI if missing
if ! command -v supabase &> /dev/null; then
    echo "📦 Installing Supabase CLI..."
    npm install -g supabase
fi

# Login
supabase login --token "$SUPABASE_ACCESS_TOKEN"
supabase link --project-ref "$PROJECT_REF"

# Deploy requested or all
TARGET="${1:-all}"
if [ "$TARGET" = "all" ]; then
    for func in "${FUNCTIONS[@]}"; do
        FUNC_DIR="$FUNCTIONS_DIR/$func"
        if [ -d "$FUNC_DIR" ]; then
            echo "🚀 Deploying $func..."
            supabase functions deploy "$func" --project-ref "$PROJECT_REF"
        else
            echo "⚠️  Skipping $func — directory not found: $FUNC_DIR"
        fi
    done
else
    FUNC_DIR="$FUNCTIONS_DIR/$TARGET"
    if [ -d "$FUNC_DIR" ]; then
        echo "🚀 Deploying $TARGET..."
        supabase functions deploy "$TARGET" --project-ref "$PROJECT_REF"
    else
        echo "❌ Function directory not found: $FUNC_DIR"
        exit 1
    fi
fi

echo ""
echo "✅ Deploy complete!"
echo ""
echo "Endpoints:"
for func in "${FUNCTIONS[@]}"; do
    echo "  https://$PROJECT_REF.supabase.co/functions/v1/$func"
done
