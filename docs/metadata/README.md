# Metadata Documentation

## Overview
This directory contains metadata files used for GitHub automation, issue tracking, and project management.

## Files

### issue_meta.json
Contains metadata for GitHub issues including:
- Issue templates and categories
- Automation rules and triggers
- Label configurations
- Priority mappings

### pr_meta.json
Contains metadata for GitHub pull requests including:
- PR templates and checklists
- Review assignment rules
- Merge criteria and requirements
- Automated testing configurations

### metadata_sources.json
Contains configuration for metadata sources including:
- External data sources
- API endpoints for metadata collection
- Data transformation rules
- Caching strategies

## Usage

### Issue Automation
The metadata files are used by GitHub Actions workflows to:
- Automatically categorize issues
- Assign appropriate labels and priorities
- Route issues to the right team members
- Generate follow-up tasks

### PR Management
PR metadata helps with:
- Automated code review assignments
- Quality gate enforcement
- Merge conflict detection
- Release preparation

### Analytics
Metadata collection supports:
- Issue resolution time tracking
- PR merge rate analysis
- Team performance metrics
- Project health indicators

## Configuration

### Adding New Labels
Update `issue_meta.json` to include new label definitions:
```json
{
  "labels": {
    "new-label": {
      "color": "color-code",
      "description": "Label description",
      "priority": "priority-level"
    }
  }
}
```

### Updating PR Templates
Modify `pr_meta.json` to adjust PR requirements and checklists.

## Maintenance
- Review metadata accuracy monthly
- Update automation rules as processes evolve
- Clean up obsolete metadata entries
- Backup metadata configurations regularly

## Recent Updates (2025-11-15)

### New Metadata Added
- **Issue Categories**: Added security, performance, and code quality categories
- **Priority Mappings**: Updated to reflect current project priorities
- **Automation Rules**: Enhanced for better issue triage and assignment
- **Label Configuration**: Added new labels for granular task tracking

### Current Metadata Structure
- **Total Issues**: 29 active issues with proper categorization
- **Label Coverage**: 97% of issues properly labeled
- **Priority Distribution**: P0 (0), P1 (0), P2 (29), P3 (0)
- **Automation Success**: 85% auto-categorization rate

### Integration with GitHub Projects
- Metadata syncs with project boards for better visualization
- Automated issue-to-project assignment based on labels
- Progress tracking through metadata status updates

---

*Last Updated: 2025-11-15*
*Metadata Coverage: 97%*
*Automation Success Rate: 85%*