# Spotlight Search — GNOME Shell Extension

A fast, keyboard-driven universal search launcher for GNOME Shell 44+.  
Press **Alt + Space** to search files, launch apps, and evaluate math expressions instantly.

![Version](https://img.shields.io/badge/version-1.0-blue)
![GNOME Shell](https://img.shields.io/badge/GNOME-44%2B-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

| Feature              | Details                                                   |
|----------------------|-----------------------------------------------------------|
| 🔍 **File Search**   | Searches home, Documents, Downloads, Desktop recursively  |
| 🧮 **Calculator**    | Inline arithmetic: `5*12+3` → `= 63` (no eval, safe AST) |
| ⌨️ **Keyboard Nav**  | Arrow keys to navigate, Enter to launch, Esc to close     |
| 🖱️ **Mouse Support** | Click any result to open it                               |
| ✨ **Fuzzy Matching** | Finds partial matches, highlights matched characters      |
| 🎨 **Modern UI**     | Clean dark theme with smooth fade animations              |
| ⚡ **Real-time**     | Results appear instantly as you type                      |
| 🚀 **Fast**          | Lightweight, optimized search with minimal CPU usage      |

---

## 📦 Installation

### Prerequisites

- GNOME Shell 44, 45, 46, or 47
- `find` command (pre-installed on most Linux distros)
- `glib-compile-schemas` (part of glib2)

### Method 1 — Manual Installation

```bash
# 1. Clone or download this repository
git clone https://github.com/evildevill/spotlight-search-extension
mv spotlight-search-extension spotlight-search@extension
cd spotlight-search@extension

# 2. Copy extension to GNOME extensions directory
cp -r spotlight-search@extension ~/.local/share/gnome-shell/extensions/

# 3. Compile the GSettings schema (required for keybinding)
glib-compile-schemas ~/.local/share/gnome-shell/extensions/spotlight-search@extension/schemas/

# 4. Restart GNOME Shell
#    On X11: Press Alt+F2, type 'r', press Enter
#    On Wayland: Log out and log back in

# 5. Enable the extension
gnome-extensions enable spotlight-search@extension
```

### Method 2 — Using gnome-extensions CLI

```bash
cd spotlight-search
gnome-extensions install spotlight-search@extension --force
gnome-extensions enable spotlight-search@extension
# Restart GNOME Shell (see above)
```

---

## 🚀 Usage

### Basic Operations

| Action             | Key / Mouse              |
|--------------------|--------------------------|
| Open overlay       | `Alt + Space`            |
| Close overlay      | `Esc` or click outside   |
| Navigate results   | `↑` / `↓` arrow keys     |
| Open selected item | `Enter`                  |
| Open any result    | Click on it              |

### File Search

Simply start typing the name of any file or folder. The extension searches:
- Home directory
- Documents folder
- Downloads folder  
- Desktop

Examples:
- Type `report` to find all files with "report" in the name
- Type `MySelf` to find folders/files matching that name
- Searches are case-insensitive and support partial matching

### Calculator

Type arithmetic expressions directly:

```
5 * 12 + 3       → 63
(100 - 32) / 1.8 → 37.7778
2^10             → 1024
17 % 5           → 2
```

**Supported operators:** `+`, `-`, `*`, `/`, `^` (power), `%` (modulo), `()` (parentheses)  
**Safety:** Uses proper AST parser, no `eval()` - completely safe!

---

## ⚙️ Configuration

Edit the `CONFIG` object at the top of `extension.js` to customize behavior:

```javascript
const CONFIG = {
    KEYBINDING: '<Alt>space',     // Change trigger key
    MAX_RESULTS: 10,              // Max results shown
    SEARCH_DIRS: [                // Add/remove search directories
        GLib.get_home_dir(),
        // Add custom paths here
    ],
    SEARCH_DELAY_MS: 50,          // Debounce (lower = faster response)
    FIND_MAX_DEPTH: 5,            // How deep to search directories
    OVERLAY_WIDTH: 680,           // Width of the overlay in pixels
};
```

After editing, restart GNOME Shell to apply changes.

---

## 🎨 Customization

### Styling

Modify `stylesheet.css` to customize the appearance:
- Background colors and transparency
- Border radius and shadows
- Font sizes and colors
- Result row styling
- Scrollbar appearance

### Search Directories

Add custom search paths in `extension.js`:

```javascript
SEARCH_DIRS: [
    GLib.get_home_dir(),
    '/path/to/custom/folder',
    GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_MUSIC),
],
```

---

## 🐛 Troubleshooting

### Extension doesn't appear after install

1. Check GNOME Shell logs for errors:
   ```bash
   journalctl /usr/bin/gnome-shell -f | grep spotlight
   ```

2. Verify schema was compiled:
   ```bash
   ls ~/.local/share/gnome-shell/extensions/spotlight-search@extension/schemas/*.compiled
   ```

3. Ensure extension is enabled:
   ```bash
   gnome-extensions list --enabled | grep spotlight
   ```

### Alt+Space doesn't work

- Another application may be using the keybinding
- Check GNOME's built-in keyboard shortcuts (Settings→Keyboard)
- Change the keybinding in `extension.js` CONFIG and restart

### Search is slow or uses too much CPU

- Reduce `FIND_MAX_DEPTH` (e.g., set to 3 instead of 5)
- Restrict `SEARCH_DIRS` to specific folders
- Increase `SEARCH_DELAY_MS` to reduce search frequency

### Results don't show up

- Make sure GNOME Shell is fully restarted after installation
- Check file permissions on searched directories
- Verify `find` command is available: `which find`

### Scroll or arrow keys don't work in overlay

- Ensure you've fully restarted GNOME Shell after installation
- Check for conflicting extensions that might capture keyboard events

---

## 📁 File Structure

```
spotlight-search@extension/
├── extension.js           — Main extension logic (ES Module)
├── stylesheet.css         — Clean dark UI theme for St widgets
├── metadata.json          — Extension metadata & version info
├── schemas/
│   └── org.gnome.shell.extensions.spotlight-search.gschema.xml
└── README.md              — This file
```

---

## 🔧 Development

### Prerequisites for Development

- GNOME Shell development environment
- GJS (GNOME JavaScript) knowledge
- Understanding of Clutter and St toolkits

### Debug Mode

Enable detailed logging by adding `log()` statements in `extension.js`. View logs:

```bash
journalctl /usr/bin/gnome-shell -f
```

### Testing Changes

1. Edit the files in your local copy
2. Copy to extensions directory:
   ```bash
   cp -r spotlight-search@extension ~/.local/share/gnome-shell/extensions/
   ```
3. Restart GNOME Shell (Alt+F2 → r on X11, or log out/in on Wayland)
4. Check logs for errors

---

## 👤 Author

**Waseem Akram (GitHub: @evildevill)**

- 💻 Full-stack developer passionate about Linux desktop environments
- 🎯 Focus on creating intuitive, performant user experiences
- 🔧 Contributor to various open-source projects

### Connect

- GitHub: [@evildevill](https://github.com/evildevill)
- Email: hi@wasii.dev
- Website: [wasii.dev](https://wasii.dev)

---

## 🙏 Acknowledgments

- Inspired by macOS Spotlight and Windows PowerToys Run
- Built with GNOME Shell Extension APIs
- Thanks to the GNOME community for excellent documentation