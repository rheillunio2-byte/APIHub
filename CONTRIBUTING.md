# 🤝 Contributing to APIHUB

Thank you for your interest in contributing to **APIHUB**!

APIHUB is a developer-focused platform designed to make discovering, exploring, testing, and organizing APIs easier.

Contributions are welcome, whether you want to improve the interface, add APIs, introduce new features, fix issues, or improve existing functionality.

This guide explains how to contribute to the project.

---

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Project Structure](#-project-structure)
- [Ways to Contribute](#-ways-to-contribute)
- [Code Guidelines](#-code-guidelines)
- [API Data Guidelines](#-api-data-guidelines)
- [Security Guidelines](#-security-guidelines)
- [Testing](#-testing)
- [Reporting Bugs](#-reporting-bugs)
- [Suggesting Features](#-suggesting-features)
- [Pull Request Process](#-pull-request-process)
- [Commit Message Guidelines](#-commit-message-guidelines)
- [Code of Conduct](#-code-of-conduct)

---

## 🚀 Getting Started

Before contributing, make sure you have:

- Basic knowledge of React and TypeScript.
- Familiarity with HTML and CSS.
- Node.js and npm installed.
- Visual Studio Code or another code editor.
- Git installed on your computer.
- A GitHub account.
- Familiarity with GitHub repositories and pull requests.

You should also have a basic understanding of API requests, HTTP methods, and JSON responses.

---

## 💻 Development Setup

**1. Fork the repository**

Visit the APIHUB GitHub repository and click the **Fork** button.

**2. Clone your fork**

Replace `YOUR-USERNAME` with your GitHub username.

```bash
git clone https://github.com/YOUR-USERNAME/APIHub.git
```

**3. Navigate to the project directory**

```bash
cd APIHub/apihub
```

**4. Install dependencies**

```bash
npm install
```

If you're using Windows PowerShell and encounter an execution policy error, use:

```powershell
npm.cmd install
```

**5. Open the project in VS Code**

```bash
code .
```

**6. Start the development server**

```bash
npm run dev
```

On Windows PowerShell, you can also use:

```powershell
npm.cmd run dev
```

**7. Open the application**

Visit the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

**8. Create a new branch**

```bash
git checkout -b feature/your-feature-name
```

You are now ready to make changes!

---

## 📂 Project Structure

```text
APIHub/
│
├── src/
│   ├── components/
│   │   ├── common/
│   │   └── layout/
│   │
│   ├── data/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── types/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── supabase/
│   ├── functions/
│   └── migrations/
│
├── images/
├── .env.example
├── CONTRIBUTING.md
├── README.md
└── package.json
```

### Main File Responsibilities

- `src/components/` - Reusable interface components.
- `src/pages/` - Main application pages.
- `src/data/apis.ts` - API directory information.
- `src/hooks/` - Reusable React hooks.
- `src/lib/` - Application utilities and integrations.
- `src/types/` - TypeScript type definitions.
- `src/App.tsx` - Main application component.
- `src/index.css` - Global styles.
- `supabase/` - Database migrations and Edge Functions.
- `images/` - Screenshots and visual assets.
- `README.md` - Main project documentation.

Keep the code organized and place new functionality in the appropriate directory.

---

## 🛠️ Ways to Contribute

### 1. Report Bugs

Help identify and resolve problems involving:

- Broken navigation or buttons.
- API search and filtering issues.
- Incorrect API information.
- Playground request errors.
- Incorrect response formatting.
- Code generator problems.
- Favorites and collections issues.
- API status display problems.
- Admin and submission workflow issues.
- Responsive layout problems.
- Browser compatibility issues.

### 2. Improve the User Interface

Suggestions include:

- Better dashboard layouts.
- Improved API cards.
- More intuitive search and filtering.
- Better loading and error states.
- Improved responsive layouts.
- Additional accessibility improvements.
- More useful interface animations.
- Better navigation and page organization.

Maintain the existing APIHUB visual identity when introducing new designs.

### 3. Expand the API Directory

You can contribute by:

- Adding useful public APIs.
- Correcting API descriptions.
- Improving category assignments.
- Updating API endpoint information.
- Including official documentation references.
- Identifying unavailable or deprecated APIs.
- Improving API metadata.

Ensure that submitted API information is accurate and based on reliable sources.

### 4. Improve the Playground

Possible improvements include:

- Additional HTTP methods.
- Better request configuration.
- Improved response formatting.
- Request history.
- Better error handling.
- Loading indicators.
- Improved JSON display.
- Additional request examples.

### 5. Improve the Code Generator

You can help by:

- Adding more programming languages.
- Improving generated request snippets.
- Supporting additional request options.
- Improving code formatting.
- Adding useful examples.
- Ensuring generated snippets are accurate.

### 6. Improve Favorites and Collections

Possible improvements include:

- Better collection organization.
- Collection editing and deletion.
- Improved API saving workflows.
- Additional filtering and sorting.
- Import and export functionality.

### 7. Improve Documentation

You can also contribute by:

- Correcting documentation errors.
- Improving installation instructions.
- Adding screenshots.
- Updating API information.
- Providing clearer explanations.
- Improving contribution guidelines.

---

## 📝 Code Guidelines

### React and TypeScript

- Use functional React components.
- Use TypeScript for application code.
- Define appropriate types and interfaces.
- Use descriptive component and variable names.
- Keep components focused on their responsibilities.
- Use reusable components when appropriate.
- Avoid unnecessary state and effects.
- Handle loading and error states.
- Avoid using `any` unless absolutely necessary.
- Keep imports organized.

### CSS and Styling

- Follow the existing styling approach.
- Maintain consistent spacing and typography.
- Prefer reusable utility classes and components.
- Preserve responsive behavior.
- Avoid unnecessary animations that affect usability.
- Respect reduced-motion preferences.
- Maintain sufficient color contrast.
- Keep the interface consistent across pages.

### General Guidelines

- Write readable and maintainable code.
- Remove unused code and imports.
- Avoid unnecessary dependencies.
- Validate user inputs.
- Handle unexpected values and errors.
- Preserve existing functionality.
- Update documentation when necessary.
- Do not commit generated build files unless required.
- Keep changes focused and easy to review.

---

## 🔌 API Data Guidelines

When adding or modifying API entries:

- Use accurate API names and descriptions.
- Verify the API's official documentation.
- Provide the correct base URL.
- Assign an appropriate category.
- Include relevant authentication information when available.
- Check whether the API is publicly accessible.
- Avoid adding deprecated or unreliable endpoints.
- Do not invent API capabilities or response formats.
- Clearly identify APIs that require authentication.
- Respect the terms and usage policies of API providers.

Test endpoints when possible before including them in the directory.

---

## 🔒 Security Guidelines

Security is important when working with external APIs and backend services.

- Never commit API keys, passwords, or private credentials.
- Do not expose Supabase service-role keys in frontend code.
- Use environment variables for configuration.
- Do not place secrets in publicly accessible files.
- Validate user-provided input.
- Handle external API responses safely.
- Avoid logging sensitive information.
- Use secure backend handling for credentials that must remain private.
- Do not bypass authentication or access restrictions.

If you discover a security vulnerability, avoid publicly sharing sensitive exploit details. Report it privately to the project maintainer.

---

## 🧪 Testing

Before submitting a contribution, test your changes.

### Automated Tests

From the `apihub/` folder (Node 22.6+):

```bash
npm test          # unit and integration tests; must stay green
npm run typecheck
```

New logic in `src/lib` or `supabase/functions` needs a test in `apihub/tests`. Never delete or weaken a test just to make it pass. API catalog changes must keep `tests/catalog-data.test.ts` green (no duplicates, valid URLs, no real-looking secrets, no "Verified" without a date).

### Functional Testing

- Verify that navigation works.
- Test API search and filtering.
- Check API category navigation.
- Test API detail views.
- Verify Playground requests.
- Check response and error handling.
- Test generated code snippets.
- Verify Favorites functionality.
- Test Collections functionality.
- Check API status displays.
- Test submission-related workflows where applicable.

### Interface Testing

- Test the application on desktop and mobile screens.
- Check hover, active, and focus states.
- Verify loading and error states.
- Ensure text remains readable.
- Check that interface elements do not overlap.
- Confirm that the layout remains consistent.

### Build Testing

Before submitting, run:

```bash
npm run build
```

On Windows PowerShell:

```powershell
npm.cmd run build
```

Resolve any build errors before opening a pull request.

### Browser Testing

Test using modern versions of:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox

Also check the browser developer console for errors.

---

## 🐛 Reporting Bugs

If you discover a problem, create a GitHub Issue.

Include:

- A clear issue title.
- A description of the problem.
- Steps to reproduce the issue.
- Expected behavior.
- Actual behavior.
- Browser and operating system.
- Screenshots or recordings, if applicable.

### Suggested Bug Report Format

**Title:** [BUG] Brief description of the issue

**Description:**

Explain what happened.

**Steps to Reproduce:**

1. Open APIHUB.
2. Navigate to the affected section.
3. Perform the action.
4. Observe the problem.

**Expected Result:**

Describe what should happen.

**Actual Result:**

Describe what happened instead.

**Environment:**

Include your browser, operating system, and relevant details.

---

## 💡 Suggesting Features

Feature suggestions are welcome!

When submitting a suggestion, include:

- Feature name.
- Description.
- Purpose and expected benefits.
- How it could work.
- Which part of APIHUB it improves.
- Optional screenshots or references.

Examples:

- Additional API categories.
- More API request methods.
- Request history.
- More code generation languages.
- API comparison tools.
- Improved response visualization.
- API health monitoring.
- Cloud-based favorites and collections.
- Additional developer utilities.

---

## 🔀 Pull Request Process

1. Fork the repository.
2. Clone your fork.
3. Create a new branch.
4. Make your changes.
5. Test the application.
6. Run the production build.
7. Commit your changes with a clear message.
8. Push your branch to your fork.
9. Open a Pull Request.
10. Explain what you changed and why.
11. Wait for review and address feedback.

### Pull Request Checklist

Before submitting, make sure:

- [ ] The changes have been tested.
- [ ] The production build completes successfully.
- [ ] Existing features still work.
- [ ] The code follows the project's guidelines.
- [ ] No unnecessary files or dependencies were added.
- [ ] No API keys or private information are included.
- [ ] Documentation has been updated when necessary.
- [ ] Screenshots are provided for significant UI changes.

---

## 📝 Commit Message Guidelines

Use short and descriptive commit messages.

Recommended prefixes:

| Prefix | Purpose |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `style:` | UI or styling changes |
| `docs:` | Documentation updates |
| `refactor:` | Code restructuring |
| `test:` | Testing-related changes |
| `perf:` | Performance improvements |
| `chore:` | Maintenance tasks |

### Examples

```bash
git commit -m "feat: add new API category"
git commit -m "fix: handle failed API requests"
git commit -m "style: improve playground layout"
git commit -m "docs: update README"
git commit -m "refactor: organize API data"
```

---

## 🤝 Code of Conduct

All contributors are expected to:

- Be respectful and professional.
- Provide constructive feedback.
- Respect other contributors' work.
- Avoid discriminatory or inappropriate behavior.
- Focus on improving the project.
- Help maintain a welcoming environment.
- Be open to suggestions and improvements.

---

## 📬 Questions and Support

For questions, suggestions, bug reports, or project-related concerns, you may open a GitHub Issue or contact the project developer through GitHub.

**GitHub:** [@rheillunio2-byte](https://github.com/rheillunio2-byte)

**Repository:** [APIHUB](https://github.com/rheillunio2-byte/APIHub)

---

Thank you for helping improve **APIHUB**!

Every contribution helps make API discovery and development more accessible and convenient.

**Discover APIs. Test ideas. Build faster.** ✦