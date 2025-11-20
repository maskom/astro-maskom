# Security Workflow File

Due to GitHub App permissions, the security scanning workflow file needs to be added manually by a maintainer.

## File: `.github/workflows/security.yml`

```yaml
name: 'Security Scanning'

on:
  schedule:
    # Run weekly on Sundays at 2 AM UTC
    - cron: '0 2 * * 0'
  workflow_dispatch:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

permissions:
  contents: read
  security-events: write
  actions: read
  pull-requests: write

jobs:
  security-audit:
    name: Dependency Security Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: |
          echo "Running security audit..."
          npm audit --audit-level moderate
        continue-on-error: true

      - name: Run npm audit (critical only)
        run: |
          echo "Checking for critical vulnerabilities..."
          npm audit --audit-level critical
        continue-on-error: false

  codeql-analysis:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    strategy:
      fail-fast: false
      matrix:
        language: ['javascript']
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: '/language:${{matrix.language}}'

  security-scan:
    name: Security Code Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting (security rules)
        run: |
          echo "Running ESLint with security focus..."
          npm run lint

      - name: Check for hardcoded secrets
        run: |
          echo "Checking for potential hardcoded secrets..."
          # Check for common secret patterns
          if grep -r -i -E "(password|secret|key|token)\s*[:=]\s*['\"][^'\"]{8,}['\"]" src/ --exclude-dir=node_modules; then
            echo "Warning: Potential hardcoded secrets found!"
            exit 1
          else
            echo "No obvious hardcoded secrets detected"
          fi

      - name: Check environment variable usage
        run: |
          echo "Checking for proper environment variable usage..."
          # Ensure process.env is used for configuration
          if grep -r "import\.meta\.env" src/ --exclude-dir=node_modules; then
            echo "✅ Using import.meta.env for environment variables"
          else
            echo "ℹ️ No import.meta.env usage found (may be using process.env)"
          fi

  dependency-check:
    name: Outdated Dependencies Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check for outdated dependencies
        run: |
          echo "Checking for outdated dependencies..."
          npm outdated || echo "Some dependencies are outdated"
        continue-on-error: true

      - name: Generate security report
        run: |
          echo "# Security Scan Report" > security-report.md
          echo "" >> security-report.md
          echo "## Scan Information" >> security-report.md
          echo "- **Date**: $(date -u)" >> security-report.md
          echo "- **Repository**: ${{ github.repository }}" >> security-report.md
          echo "- **Commit**: ${{ github.sha }}" >> security-report.md
          echo "" >> security-report.md
          echo "## Dependency Audit" >> security-report.md
          echo "\`\`\`" >> security-report.md
          npm audit --json || echo "Audit completed with warnings" >> security-report.md
          echo "\`\`\`" >> security-report.md

      - name: Upload security report
        uses: actions/upload-artifact@v4
        with:
          name: security-report-${{ github.run_number }}
          path: security-report.md
          retention-days: 30

  create-security-issue:
    name: Create Security Issue (if needed)
    runs-on: ubuntu-latest
    needs: [security-audit, codeql-analysis, security-scan]
    if: failure()
    steps:
      - name: Create security issue
        uses: actions/github-script@v7
        with:
          script: |
            const title = `Security Scan Alert - ${new Date().toISOString().split('T')[0]}`;
            const body = `
            ## 🔒 Security Scan Alert

            A security scan has detected potential issues that require attention.

            ### Scan Details
            - **Repository**: ${{ github.repository }}
            - **Commit**: ${{ github.sha }}
            - **Workflow Run**: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

            ### Next Steps
            1. Review the workflow run logs for detailed findings
            2. Address any critical vulnerabilities identified
            3. Update dependencies if needed
            4. Review code changes for security implications

            ### Priority
            This issue should be reviewed and addressed promptly to maintain security standards.

            ---
            *This issue was automatically created by the security scanning workflow.*
            `;

            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: title,
              body: body,
              labels: ['security', 'automated', 'priority/high']
            });
```

## Installation Instructions

1. Create the file `.github/workflows/security.yml` in the repository
2. Copy the YAML content above into the file
3. Commit and push the changes
4. The workflow will automatically run on schedule and trigger events

## Features

- **Weekly Security Scans**: Automated dependency vulnerability checks
- **CodeQL Analysis**: Advanced code security analysis
- **Secret Detection**: Automated checks for hardcoded secrets
- **PR Integration**: Security scans run on pull requests
- **Automated Issues**: Creates security issues for critical findings
- **Security Reports**: Generates and uploads detailed security reports
