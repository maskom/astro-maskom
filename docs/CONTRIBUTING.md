# Contributing to Astro Maskom

Thank you for your interest in contributing to Astro Maskom! This guide will help you get started with contributing to our ISP website project.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager
- Git
- VS Code (recommended)

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/astro-maskom.git
   cd astro-maskom
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp .env.example .env
   # Fill in your environment variables
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:4321`

## 📁 Project Structure

```
astro-maskom/
├── src/
│   ├── components/          # Reusable Astro components
│   │   ├── Astro/         # Astro-specific components
│   │   ├── chat/          # Chatbot components
│   │   └── ui/            # UI components
│   ├── data/              # Data files and configurations
│   ├── layouts/           # Page layouts
│   ├── lib/               # Utility libraries
│   ├── pages/             # Astro pages
│   │   ├── api/           # API endpoints
│   │   └── *.astro        # Page components
│   └── styles/            # Global styles
├── docs/                  # Documentation
├── public/                # Static assets
└── supabase/             # Database configuration
```

## 🛠️ Development Workflow

### 1. Create Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow existing code style and patterns
- Add TypeScript types for new code
- Test your changes thoroughly

### 3. Run Tests

```bash
npm run build        # Verify build works
npm run lint         # Check code style (if available)
npm run typecheck    # Verify TypeScript types
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

## 📝 Code Style Guidelines

### TypeScript/Astro

- Use TypeScript for all new code
- Follow Astro component patterns
- Define proper interfaces and types
- Use meaningful variable and function names

### CSS/Tailwind

- Use Tailwind CSS classes
- Follow mobile-first responsive design
- Maintain consistent spacing and colors
- Use semantic HTML elements

### File Naming

- Components: PascalCase (e.g., `UserProfile.astro`)
- Files: kebab-case (e.g., `user-profile.ts`)
- Directories: kebab-case (e.g., `user-profile/`)

## 🐛 Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots if applicable

## ✨ Feature Requests

For feature requests:

- Describe the problem you're solving
- Explain the proposed solution
- Consider implementation complexity
- Discuss potential alternatives

## 🔧 Code Review Process

### Review Checklist

- [ ] Code follows project style guidelines
- [ ] TypeScript types are properly defined
- [ ] Build completes without errors
- [ ] Functionality is tested
- [ ] Documentation is updated
- [ ] Security implications are considered

### Review Guidelines

- Be constructive and respectful
- Focus on code quality, not personal preferences
- Explain reasoning for suggested changes
- Help contributors improve their skills

## 🚨 Security Considerations

- Never commit secrets or API keys
- Follow secure coding practices
- Validate all user inputs
- Use HTTPS for all external requests
- Keep dependencies updated

## 📚 Documentation

- Update README.md for major changes
- Add inline comments for complex logic
- Document new APIs in the code
- Update this CONTRIBUTING.md when needed

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Focus on what's best for the community
- Show empathy towards other contributors

All contributors are expected to follow our [Code of Conduct](../../CODE_OF_CONDUCT.md).

## 📞 Getting Help

- Create an issue for questions or problems
- Check existing documentation first
- Join our community discussions
- Reach out to maintainers

## 🏆 Recognition

Contributors are recognized in:

- README.md contributors section
- Release notes for significant contributions
- Annual community highlights

---

Thank you for contributing to Astro Maskom! Your contributions help make our ISP website better for everyone.

_Last Updated: 2025-11-14_
