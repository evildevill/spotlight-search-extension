
# Changelog

All notable changes to the Spotlight Search extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-20

### 🎉 Initial Release

#### ✨ Added
- **File Search**: Recursive search across home, Documents, Downloads, and Desktop directories
- **Safe Calculator**: Inline arithmetic evaluation using proper AST parser (no eval)
  - Supports: addition (+), subtraction (-), multiplication (*), division (/), power (^), modulo (%)
  - Respects operator precedence (PEMDAS/BODMAS)
  - Handles parentheses for complex expressions
- **Fuzzy Matching**: Intelligent search with character-by-character matching
  - Prioritizes: exact match → starts-with → contains → fuzzy
  - Highlights matched characters in results
- **Keyboard Navigation**: Full keyboard control
  - Alt+Space to open
  - Arrow keys (↑/↓) to navigate results
  - Enter to launch selected item
  - Esc to close
- **Mouse Support**: Click to select and open results
- **Real-time Results**: Instant search as you type with 50ms debounce
- **Modal Input Capture**: Properly captures scroll and keyboard events
- **Clean UI**: Modern dark theme with smooth animations
  - Semi-transparent backdrop
  - Rounded corners and subtle shadows
  - Blue accent color (#5294e2)
  - Minimal scrollbar design

#### 🔧 Technical Features
- ES Module architecture (import/export)
- GSettings schema for keybinding configuration
- Subprocess-based file search using `find` command
- Event-driven architecture with proper cleanup
- Memory leak prevention
- Compatible with both X11 and Wayland

#### 📦 Compatibility
- GNOME Shell 44, 45, 46, 47
- Linux (X11 and Wayland)

#### 🐛 Known Issues
- None reported

---

## [Unreleased]

### 🔮 Planned Features
- Application launcher integration
- Web search providers
- Recent files list
- Bookmarked folders quick access
- Plugin system for extensibility
- Preferences GUI (GTK4/Adwaita)
- Custom keyboard shortcuts configuration
- Theming support
- Multi-language localization support
- Search history
- File preview on hover
- Advanced file filters (by type, date, size)
- Custom search providers API

### 🔧 Planned Improvements
- Optimize search performance for large directories
- Add search result caching
- Implement incremental search updates
- Add animation easing adjustments
- Performance profiling and optimization

---

## Version History Summary

| Version | Date       | Highlights                                |
|---------|------------|-------------------------------------------|
| 1.0.0   | 2026-02-20 | Initial release with core features        |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## Links

- [Repository](https://github.com/evildevill/spotlight-search-extension)
- [Issues](https://github.com/evildevill/spotlight-search-extension/issues)
- [Pull Requests](https://github.com/evildevill/spotlight-search-extension/pulls)

---

**Note**: This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format with categories:
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for removed features
- `Fixed` for bug fixes
- `Security` for vulnerability fixes
