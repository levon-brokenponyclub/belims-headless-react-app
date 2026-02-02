#!/bin/bash

# ============================================
# Global Site Settings - Deployment Script
# ============================================
# This script automates:
# 1. Update deployment timestamp
# 2. Commit and push to git
# 3. Upload plugin to server via SSH
# ============================================

# SSH Configuration
SSH_USER="master_ggrkakuzjf"
SSH_HOST="209.38.84.64"
SSH_PORT="22"
# Use a home-relative path so the remote user's shell can create dirs without needing
# permissions to create absolute /home entries. This will expand to the user's home.
REMOTE_PATH="~/applications/uhkkwupuum/public_html/wp-content/plugins/global-site-settings"

# Local paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLUGIN_FILE="$SCRIPT_DIR/global-site-settings.php"
REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Global Site Settings Deployment${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# ============================================
# Step 1: Update Deployment Timestamp
# ============================================
echo -e "${YELLOW}[1/3] Updating deployment timestamp...${NC}"

# Get current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "Current timestamp: $TIMESTAMP"

# Update the plugin file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/define('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP', '.*');/define('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP', '$TIMESTAMP');/" "$PLUGIN_FILE"
else
    # Linux
    sed -i "s/define('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP', '.*');/define('GLOBAL_SITE_SETTINGS_DEPLOY_TIMESTAMP', '$TIMESTAMP');/" "$PLUGIN_FILE"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Timestamp updated successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to update timestamp${NC}"
    exit 1
fi

# ============================================
# Step 2: Commit and Push to Git
# ============================================
echo -e "${YELLOW}[2/3] Committing and pushing to git...${NC}"

cd "$REPO_ROOT"

# Calculate relative path from repo root to plugin file
PLUGIN_RELATIVE_PATH="${PLUGIN_FILE#$REPO_ROOT/}"

# Add changes
git add "$PLUGIN_RELATIVE_PATH"

# Commit with timestamp message
COMMIT_MSG="deploy: Update deployment timestamp to $TIMESTAMP"
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Committed changes${NC}"
    
    # Push to remote
    git push
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Pushed to remote repository${NC}\n"
    else
        echo -e "${RED}✗ Failed to push to remote${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ No changes to commit${NC}\n"
fi

# ============================================
# Step 3: Upload to Server via SSH
# ============================================
echo -e "${YELLOW}[3/3] Uploading plugin to server...${NC}"

# Check if SSH credentials are configured
if [ "$SSH_USER" == "your_username" ] || [ "$SSH_HOST" == "your_server.com" ]; then
    echo -e "${RED}✗ SSH credentials not configured!${NC}"
    echo -e "${YELLOW}Please edit this script and update:${NC}"
    echo "  - SSH_USER"
    echo "  - SSH_HOST"
    echo "  - SSH_PORT"
    echo "  - REMOTE_PATH"
    exit 1
fi

# Create remote directory and upload via tar over SSH (avoids rsync compatibility issues)
echo -e "${YELLOW}Creating remote directory and uploading plugin via tar+ssh...${NC}"

# Stream a tarball over SSH and extract on the remote server. This avoids rsync and
# will work on systems with older rsync versions. Excluded files remain excluded.
# Use remote $HOME to ensure we don't try to create absolute /home entries.
REMOTE_PATH_NO_TILDE="${REMOTE_PATH#~/}"
tar -czf - -C "$SCRIPT_DIR" \
    --exclude='.DS_Store' \
    --exclude='*.zip' \
    --exclude='deploy.sh' \
    . | ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "rm -rf \$HOME/$REMOTE_PATH_NO_TILDE && mkdir -p \$HOME/$REMOTE_PATH_NO_TILDE && tar -xzf - -C \$HOME/$REMOTE_PATH_NO_TILDE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Plugin uploaded successfully via tar+ssh${NC}\n"
else
    echo -e "${RED}✗ Failed to upload plugin via tar+ssh${NC}"
    exit 1
fi

# ============================================
# Deployment Complete
# ============================================
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}Timestamp: ${NC}$TIMESTAMP"
echo -e "${GREEN}Server: ${NC}$SSH_USER@$SSH_HOST"
echo -e "${GREEN}Console verification: ${NC}Check browser console for deployment timestamp\n"
