# Cloudways Auto-Deployment Setup

This repository is configured to automatically deploy WordPress plugins to Cloudways on every push to `main` branch.

## 🚀 How It Works

- **Trigger**: Push to `main` branch
- **What Deploys**: Only changed custom plugins + wp-config.php
- **Method**: SFTP via GitHub Actions
- **Target**: Cloudways staging environment

## 📋 One-Time Setup Required

### Step 1: Get Cloudways SFTP Credentials

1. Login to [Cloudways](https://platform.cloudways.com)
2. Go to your application: **Belims Headless**
3. Click **Access Details** tab
4. Copy these values:
   - **SFTP/SSH URL** (e.g., `123.456.789.0`)
   - **Username** (e.g., `master-abcd1234`)
   - **Password**
   - **Port** (usually `22`)

### Step 2: Add Secrets to GitHub

1. Go to: https://github.com/levon-brokenponyclub/belims-headless-react-app/settings/secrets/actions
2. Click **New repository secret**
3. Add these 4 secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `CLOUDWAYS_SFTP_HOST` | SFTP/SSH URL from Cloudways | `123.456.789.0` |
| `CLOUDWAYS_SFTP_USER` | Username from Cloudways | `master-abcd1234` |
| `CLOUDWAYS_SFTP_PASSWORD` | Password from Cloudways | `YourSecurePassword` |
| `CLOUDWAYS_SFTP_PORT` | Port (usually 22) | `22` |

### Step 3: Enable GitHub Actions (if needed)

1. Go to: https://github.com/levon-brokenponyclub/belims-headless-react-app/actions
2. If disabled, click **Enable Actions**

## ✅ Testing the Deployment

Once secrets are added:

1. Make a change to any custom plugin (e.g., add a comment)
2. Commit and push to `main`:
   ```bash
   git add wp-content/plugins/belims-headless-api/belims-headless-api.php
   git commit -m "test: Trigger deployment"
   git push origin main
   ```
3. Watch the deployment: https://github.com/levon-brokenponyclub/belims-headless-react-app/actions
4. Verify on Cloudways: https://wordpress-1482444-6163809.cloudwaysapps.com/wp-admin/

## 📦 What Gets Deployed

Only these files trigger deployment:

- ✅ `wp-content/plugins/belims-headless-api/**` (FTG integration)
- ✅ `wp-content/plugins/belims-custom-site-settings/**` (Site settings)
- ✅ `wp-content/plugins/uafrica-shipping/**` (Shipping)
- ✅ `wp-config.php` (Database config)

**NOT deployed** (kept local or ignored):
- ❌ WordPress core files (`wp-admin/`, `wp-includes/`)
- ❌ WooCommerce plugin (managed separately)
- ❌ `frontend/` (deploys to Netlify separately)
- ❌ Node modules, git files, READMEs

## 🔧 Workflow Details

**File**: `.github/workflows/deploy-cloudways.yml`

**Smart Features**:
- Only deploys changed plugins (not everything)
- Uses FTPS (secure FTP with TLS)
- Verbose logging for debugging
- Deployment summary in workflow logs
- Skips unchanged files

**View Deployment Logs**:
https://github.com/levon-brokenponyclub/belims-headless-react-app/actions/workflows/deploy-cloudways.yml

## 🐛 Troubleshooting

### "Error: Missing required secret"
- Check all 4 secrets are added in GitHub repository settings
- Secret names must match exactly (case-sensitive)

### "SFTP connection failed"
- Verify Cloudways SFTP credentials are current
- Check if Cloudways server is running
- Try connecting manually via SFTP client (FileZilla) to test credentials

### "Permission denied"
- Cloudways user must have write permissions to `/public_html/wp-content/plugins/`
- Check server-dir paths match your Cloudways setup

### "Workflow doesn't trigger"
- Ensure changes are in tracked paths (plugins, wp-config.php)
- Verify you're pushing to `main` branch
- Check GitHub Actions is enabled for the repository

## 🔄 Workflow Comparison

| Aspect | Netlify (Frontend) | Cloudways (WordPress) |
|--------|-------------------|----------------------|
| Trigger | Push to `main` | Push to `main` |
| Method | Netlify auto-deploy | GitHub Actions + SFTP |
| What | `frontend/` build | Custom plugins only |
| Time | ~2-3 minutes | ~30-60 seconds |
| Logs | Netlify dashboard | GitHub Actions tab |

## 📝 Manual Deployment (If Needed)

If GitHub Actions fails, deploy manually via SFTP:

```bash
# Using lftp (install: brew install lftp)
lftp -u USERNAME,PASSWORD sftp://HOST:PORT -e "
  mirror -R wp-content/plugins/belims-headless-api \
         /public_html/wp-content/plugins/belims-headless-api;
  bye
"
```

Or use an SFTP client like:
- **FileZilla** (GUI)
- **Cyberduck** (GUI)
- **VS Code Remote-SSH** (extension)

## 🎯 Next Steps

After setup:
1. ✅ Add GitHub secrets (4 required)
2. ✅ Push a test commit
3. ✅ Watch deployment succeed in Actions tab
4. ✅ Verify files updated on Cloudways
5. 🎉 Enjoy automatic deployments!

---

**Need Help?**
- GitHub Actions docs: https://docs.github.com/en/actions
- Cloudways SFTP guide: https://support.cloudways.com/en/articles/5120601-how-to-access-sftp-on-cloudways
