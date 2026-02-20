# Contributing Guide

Thank you for your interest in contributing! This project powers a personal website & platform built with Next.js, TypeScript, Tailwind CSS, MongoDB, and supporting tooling for content, newsletter, store, learning material, and authentication.


### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Include the following information:
   - GNOME Shell version (`gnome-shell --version`)
   - Extension version
   - Steps to reproduce the bug
   - Error logs from `journalctl`
   - Screenshots if applicable

### Suggesting Features

Open an issue with:
- Clear description of the feature
- Use cases and benefits
- Mockups or examples (if applicable)

### Submitting Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/evildevill/spotlight-search-extension
   cd spotlight-search
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly on multiple GNOME Shell versions

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: your feature description"
   ```
   
   Use conventional commit messages:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for improvements
   - `Refactor:` for code restructuring
   - `Docs:` for documentation changes

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a pull request on GitHub with:
   - Clear description of changes
   - Linked issues (if applicable)
   - Screenshots/GIFs for UI changes

### Code Style Guidelines

- Use descriptive variable and function names
- Add JSDoc comments for functions
- Follow existing indentation (4 spaces)
- Keep lines under 100 characters when possible
- Use ES6+ features (const/let, arrow functions, etc.)

### Testing Checklist

Before submitting:
- [ ] Works on GNOME Shell 44, 45, 46, and 47
- [ ] No errors in console logs
- [ ] Keyboard navigation works properly
- [ ] Mouse interaction works properly  
- [ ] Search results are accurate
- [ ] Calculator functions correctly
- [ ] No memory leaks (test enable/disable cycles)

---

## 📋 Compatibility

- **GNOME Shell**: 44, 45, 46, 47
- **Architecture**: Works on X11 and Wayland
- **Language**: JavaScript (ES Modules)
- **Dependencies**: Standard GNOME libraries only (St, Clutter, GLib, Gio)

---
## Need Help?
Open an issue (non-security) or reach out via `hi@wasii.dev`.

Happy contributing! 🔐🚀
