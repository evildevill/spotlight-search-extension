# Spotlight Search — GNOME Shell Extension

A fast, keyboard-driven universal search launcher for GNOME Shell 44+.  
Press **Alt + Space** to open. Search files, launch apps, and evaluate math inline.

---

## Features

| Feature              | Details                                                   |
|----------------------|-----------------------------------------------------------|
| 🔍 File Search       | Searches home, Documents, Downloads, Desktop recursively  |
| 🧮 Calculator        | Inline arithmetic: `5*12+3` → `= 63` (no eval, safe AST) |
| ⌨️ Keyboard Nav      | Arrow keys to navigate, Enter to launch, Esc to close     |
| 🖱️ Mouse Support     | Click any result to open it                               |
| ✨ Fuzzy Matching     | Finds partial matches, highlights matched characters      |
| 🎨 Modern Dark UI    | Rounded, semi-transparent, smooth fade animations         |

---

## Installation

### Method 1 — Quick (copy files)

```bash
# 1. Copy the extension folder to GNOME extensions directory
cp -r spotlight-search@extension ~/.local/share/gnome-shell/extensions/

# 2. Compile the GSettings schema (required for keybinding)
glib-compile-schemas ~/.local/share/gnome-shell/extensions/spotlight-search@extension/schemas/

# 3. Restart GNOME Shell
#    On X11:
killall -SIGQUIT gnome-shell
#    On Wayland (log out and back in is the safest):
#    Or use: busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…", global.context)'

# 4. Enable the extension
gnome-extensions enable spotlight-search@extension
```

### Method 2 — Using gnome-extensions CLI

```bash
gnome-extensions install spotlight-search@extension --force
gnome-extensions enable spotlight-search@extension
```

---

## Usage

| Action             | Key / Mouse              |
|--------------------|--------------------------|
| Open overlay       | `Alt + Space`            |
| Close overlay      | `Esc` or click outside   |
| Navigate results   | `↑` / `↓` arrow keys     |
| Open selected item | `Enter`                  |
| Open any result    | Click on it              |
| Calculate          | Just type e.g. `2^10`    |

---

## Configuration

Edit the `CONFIG` object at the top of `extension.js`:

```js
const CONFIG = {
    KEYBINDING: '<Alt>space',     // Change trigger key
    MAX_RESULTS: 10,              // Max results shown
    SEARCH_DIRS: [...],           // Add/remove search directories
    SEARCH_DELAY_MS: 150,         // Debounce (lower = faster but more CPU)
    FIND_MAX_DEPTH: 5,            // How deep to search directories
    OVERLAY_WIDTH: 680,           // Width of the overlay in pixels
};
```

After editing, restart GNOME Shell to apply changes.

---

## Calculator Examples

```
5 * 12 + 3       → 63
(100 - 32) / 1.8 → 37.7778
2^10             → 1024
17 % 5           → 2
```

Operator precedence is fully respected (PEMDAS/BODMAS).

---

## Troubleshooting

**Extension doesn't appear after install:**
- Check `journalctl /usr/bin/gnome-shell -f` for errors
- Make sure schema was compiled: `ls ~/.local/share/gnome-shell/extensions/spotlight-search@extension/schemas/*.compiled`

**Alt+Space doesn't work:**
- Another app may have grabbed the keybinding (e.g., GNOME's own window list)
- Change keybinding in `extension.js` CONFIG and restart Shell

**Search is slow:**
- Reduce `FIND_MAX_DEPTH` or restrict `SEARCH_DIRS`
- Increase `SEARCH_DELAY_MS` to reduce CPU usage while typing

---

## File Structure

```
spotlight-search@extension/
├── metadata.json          — Extension metadata & version info
├── extension.js           — Main extension logic (ES Module)
├── stylesheet.css         — Dark UI theme for St widgets
├── schemas/
│   └── org.gnome.shell.extensions.spotlight-search.gschema.xml
└── README.md              — This file
```

---

## Compatibility

- GNOME Shell **44, 45, 46, 47**
- Uses ESM (`import`/`export`) syntax required by GNOME Shell 45+
- No external dependencies beyond standard GNOME libraries

---

## License

MIT — use freely, modify, redistribute.
