# Remediation Guide

This guide provides step-by-step instructions for addressing security issues found by EnvInspect.

## Table of Contents

1. [Quick Response Checklist](#quick-response-checklist)
2. [Rotating Compromised Secrets](#rotating-compromised-secrets)
3. [Removing .env from Git](#removing-env-from-git)
4. [Cleaning Git History](#cleaning-git-history)
5. [Prevention](#prevention)

---

## Quick Response Checklist

If EnvInspect found high-confidence secrets in your repository:

- [ ] **IMMEDIATELY** rotate all exposed credentials
- [ ] Verify the keys are actually valid/active (not test keys)
- [ ] Check access logs for unauthorized usage
- [ ] Remove secrets from current files
- [ ] Clean git history (if committed)
- [ ] Add secrets to `.gitignore`
- [ ] Set up pre-commit hooks
- [ ] Document required env vars in `.env.example`
- [ ] Inform your team

---

## Rotating Compromised Secrets

### AWS Credentials

**If you found `AKIAIOSFODNN7EXAMPLE` or similar:**

1. **Immediately deactivate the compromised key**:
   ```bash
   aws iam delete-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --user-name <IAM_USER>
   ```

2. **Check CloudTrail for unauthorized activity**:
   - Go to AWS Console → CloudTrail
   - Filter by compromised Access Key ID
   - Look for suspicious API calls

3. **Create a new access key**:
   ```bash
   aws iam create-access-key --user-name <IAM_USER>
   ```

4. **Update your application** with the new key

5. **Consider using AWS Secrets Manager or IAM roles** instead of hardcoded keys

**References**:
- [AWS: What to do if credentials are exposed](https://aws.amazon.com/premiumsupport/knowledge-center/delete-access-key/)

### Stripe API Keys

**If you found `sk_live_...` or `rk_live_...`:**

1. **Roll the key immediately**:
   - Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
   - Click "Roll key" next to the compromised key
   - Copy the new key

2. **Update your application** with the new key

3. **Check your Stripe logs**:
   - Go to Dashboard → Developers → Logs
   - Look for unusual API calls around the time of exposure

4. **Consider using restricted API keys** with minimal permissions

**References**:
- [Stripe: Rolling API keys](https://stripe.com/docs/keys#roll-api-keys)

### Google API Keys

**If you found `AIzaSy...`:**

1. **Delete or restrict the compromised key**:
   - Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   - Delete the compromised key OR
   - Restrict it by IP address/domain (if you can't delete yet)

2. **Create a new API key** with appropriate restrictions

3. **Update your application**

4. **Check API usage**:
   - Go to APIs & Services → Dashboard
   - Review recent API calls for anomalies

**References**:
- [Google: API key best practices](https://cloud.google.com/docs/authentication/api-keys)

### GitHub Tokens

**If you found `ghp_...`, `gho_...`, or `ghs_...`:**

1. **Revoke the token immediately**:
   - Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
   - Find and delete the compromised token
   - **Note**: GitHub may auto-revoke if detected in a public repo

2. **Generate a new token** with minimal required scopes

3. **Update your application**

4. **Check your GitHub audit log**:
   - For organizations: Settings → Audit log
   - Look for suspicious activity

**References**:
- [GitHub: Token security](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation)

### Slack Tokens

**If you found `xoxb-...`, `xoxp-...`, or `xoxa-...`:**

1. **Revoke the token**:
   - Go to [Slack App Settings](https://api.slack.com/apps)
   - Select your app → Install App
   - Click "Revoke" next to the compromised token

2. **Regenerate the token**

3. **Update your application**

4. **Review Slack audit logs** (Enterprise Grid only)

**References**:
- [Slack: Token types and scopes](https://api.slack.com/authentication/token-types)

### Database Credentials

**If you found `mongodb://user:pass@...` or `postgresql://...`:**

1. **Change the database password**:
   ```sql
   -- PostgreSQL
   ALTER USER myuser WITH PASSWORD 'new_secure_password';
   
   -- MySQL
   ALTER USER 'myuser'@'localhost' IDENTIFIED BY 'new_secure_password';
   
   -- MongoDB
   db.updateUser("myuser", {pwd: "new_secure_password"})
   ```

2. **Update connection strings** in your application

3. **Review database access logs** for unauthorized queries

4. **Consider using connection poolers** and secrets managers

### Generic API Keys / Tokens

**If EnvInspect flagged a generic secret:**

1. **Identify the service** (check variable name, code context)
2. **Log into that service** and navigate to API key management
3. **Rotate the key**
4. **Update your application**
5. **Review service logs** for unauthorized access

---

## Removing .env from Git

If EnvInspect detected a committed `.env` file:

### Step 1: Add .env to .gitignore

Create or update `.gitignore`:

```bash
echo "" >> .gitignore
echo "# Environment variables" >> .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### Step 2: Remove .env from Git (but keep local file)

```bash
git rm --cached .env
git commit -m "Remove .env from repository"
```

**Warning**: This only removes it from future commits. The file still exists in git history.

### Step 3: Create .env.example

Use EnvInspect to generate it:

```bash
npx envinspect --fix
```

Or manually create `<br/>.env.example` with placeholder values:

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API Keys
API_KEY=your_api_key_here
SECRET_TOKEN=your_secret_token_here
```

### Step 4: Commit the changes

```bash
git add .gitignore .env.example
git commit -m "Add .gitignore and .env.example"
git push
```

---

## Cleaning Git History

**⚠️ DANGER ZONE**: Modifying git history requires force-pushing and coordinating with your team.

### Before You Start

1. **Backup your repository**:
   ```bash
   git clone --mirror <your-repo-url> backup.git
   ```

2. **Notify your team**: Everyone will need to re-clone

3. **Rotate all exposed secrets first** (see above)

### Option 1: Using git-filter-repo (Recommended)

`git-filter-repo` is the officially recommended tool by Git.

**Install**:
```bash
pip install git-filter-repo
```

**Remove a specific file from all history**:
```bash
git filter-repo --path .env --invert-paths
```

**Remove multiple files**:
```bash
git filter-repo --path .env --path config/secrets.yml --invert-paths
```

**Remove by content** (advanced):
```bash
# Create a file with patterns to replace
echo "AKIAIOSFODNN7EXAMPLE" > secrets.txt
git filter-repo --replace-text secrets.txt
```

### Option 2: Using BFG Repo-Cleaner

**Download BFG**:
```bash
# Download from https://rtyley.github.io/bfg-repo-cleaner/
# Or via Homebrew:
brew install bfg
```

**Remove .env files**:
```bash
bfg --delete-files .env
```

**Replace secrets**:
```bash
# Create passwords.txt with secrets to replace
echo "AKIAIOSFODNN7EXAMPLE" > passwords.txt
bfg --replace-text passwords.txt
```

**Clean up**:
```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Option 3: Manual approach for recent commits

If the secret was only committed very recently (last few commits):

```bash
# For the last commit
git reset HEAD~1
git add .gitignore .env.example  # Add only safe files
git commit -m "Add .gitignore and .env.example"

# Force push (⚠️ coordinate with team!)
git push --force
```

### After Cleaning History

1. **Force push to remote**:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```

2. **Notify all team members to re-clone**:
   ```bash
   # Team members should:
   cd ..
   rm -rf old-repo-folder
   git clone <repo-url>
   ```

3. **Update any CI/CD pipelines** that have cached the repo

---

## Prevention

### 1. Set Up Pre-commit Hooks

Install EnvInspect's pre-commit hook:

```bash
# Install husky
npm install --save-dev husky
npx husky init

# Create pre-commit hook
echo '#!/bin/sh' > .husky/pre-commit
echo 'npx envinspect --ci --path .' >> .husky/pre-commit
chmod +x .husky/pre-commit
```

Or use a simpler approach:

```bash
echo '#!/bin/sh\nnpx envinspect --ci --path .' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2. Use Environment Variables Managers

Instead of .env files, use:

- **AWS Secrets Manager** / **Parameter Store**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**
- **Doppler**
- **1Password CLI**

### 3. Set Up CI Checks

Add EnvInspect to your CI pipeline:

**.github/workflows/security.yml**:
```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  envinspect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx envinspect --ci
```

### 4. Educate Your Team

- Share this remediation guide
- Review secrets management in onboarding
- Establish a policy for handling credentials
- Use `.env.example` for documentation

### 5. Regular Audits

Run EnvInspect periodically:

```bash
# Weekly cron job
0 9 * * 1 cd /path/to/repo && npx envinspect --json audit.json
```

---

## Additional Resources

- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [git-filter-repo Documentation](https://github.com/newren/git-filter-repo)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

## Need Help?

If you're dealing with a security incident:

1. **Act fast**: Rotate credentials first, clean history later
2. **Document**: Keep a log of what was exposed and when
3. **Monitor**: Check for unauthorized access in your service logs
4. **Learn**: Update your processes to prevent it happening again

For urgent issues, contact your security team or cloud provider support immediately.
