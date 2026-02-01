# AWS Amplify Deployment Guide

## Prerequisites
- AWS Account with Amplify access
- Git repository (GitHub, GitLab, or Bitbucket)
- Your environment variables ready

## Step-by-Step Deployment

### 1. Push Code to Git Repository

```bash
git add .
git commit -m "Prepare for Amplify deployment"
git push origin main
```

### 2. Create New App in AWS Amplify

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Choose your Git provider (GitHub/GitLab/Bitbucket)
4. Authorize AWS Amplify to access your repository
5. Select the repository: `Voice of the Customer`
6. Select branch: `main` (or your default branch)

### 3. Configure Build Settings

Amplify will auto-detect the `amplify.yml` file. Verify it shows:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

### 4. Add Environment Variables

In the Amplify Console, go to **"Environment variables"** and add:

| Key | Value | Type |
|-----|-------|------|
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` | Secret |
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Your n8n search webhook URL | Plain text |
| `NEXT_PUBLIC_MERGE_WEBHOOK_URL` | Your n8n merge webhook URL | Plain text |
| `NEXT_PUBLIC_SAVE_WEBHOOK_URL` | Your n8n save webhook URL | Plain text |

⚠️ **Important:** Mark `DATABASE_URL` as **secret** to hide it in logs.

### 5. Deploy

1. Click **"Save and deploy"**
2. Wait for build to complete (3-5 minutes)
3. Access your app at the Amplify-provided URL

### 6. Custom Domain (Optional)

1. In Amplify Console, go to **"Domain management"**
2. Click **"Add domain"**
3. Follow the instructions to configure DNS

## Continuous Deployment

Every push to your `main` branch will automatically trigger a new deployment.

## Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Verify all environment variables are set
- Ensure `DATABASE_URL` is accessible from AWS

### Database Connection Issues
- Verify database allows connections from AWS IP ranges
- Check security group/firewall settings
- Test connection string locally first

### Environment Variables Not Working
- `NEXT_PUBLIC_*` variables are embedded at build time
- Other variables are runtime only
- Restart deployment after adding new variables

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production
npm run build

# Start production server
npm start
```
