# GitHub Actions Configuration Documentation

## Overview
This directory contains documentation and configuration files for GitHub Actions workflows used in the Astro Maskom repository.

## Files

### memory.md
Contains workflow memory and state information for GitHub Actions agents. This file helps maintain context between workflow runs and stores important decision-making data.

### Workflows Directory (.github/workflows/)
The following workflows are configured:

- **iflow-inteligent.yml**: Automated repository analysis and intelligence gathering
- **iflow-issue.yml**: Issue management and automation
- **iflow-pr.yml**: Pull request processing and automation
- **oc-researcher.yml**: OpenCode researcher agent for code analysis
- **oc-issue-solver.yml**: OpenCode issue resolution agent
- **oc-maintainer.yml**: OpenCode maintenance tasks
- **oc-pr-handler.yml**: OpenCode PR processing
- **oc-problem-finder.yml**: OpenCode problem detection and analysis

## Workflow Schedule
Most workflows run on a schedule (every 2 hours) or can be triggered manually via workflow_dispatch.

## Maintenance
- Review workflow performance weekly
- Update agent prompts and configurations as needed
- Monitor for workflow failures and optimize performance
- Ensure proper API key management and secrets configuration

## Troubleshooting
Common issues and solutions:
- Workflow timeouts: Increase timeout values or optimize workflow steps
- API rate limits: Implement proper rate limiting and caching
- Permission errors: Verify GitHub token permissions and repository settings

---
*Last Updated: 2025-11-14*