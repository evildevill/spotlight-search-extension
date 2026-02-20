/**
 * Spotlight Search - GNOME Shell Extension
 * A universal search launcher similar to Windows Spotlight / PowerToys Run
 *
 * CONFIGURATION (edit these variables to customize behavior):
 */
const CONFIG = {
    KEYBINDING: '<Alt>space',        // Trigger keybinding
    MAX_RESULTS: 10,                 // Max search results to display
    SEARCH_DIRS: [                   // Directories to search
        GLib.get_home_dir(),
        GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOCUMENTS),
        GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOADS),
        GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DESKTOP),
    ].filter(Boolean),
    SEARCH_DELAY_MS: 50,             // Debounce delay for search (faster response)
    FIND_MAX_DEPTH: 5,               // Max directory depth for file search
    OVERLAY_WIDTH: 680,              // Search overlay width in pixels
};

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

// ─── Calculator ───────────────────────────────────────────────────────────────

// /**
//  * Safely evaluates basic arithmetic expressions.
//  * Only allows numbers, operators (+−*/), parentheses, and decimals.
//  * No eval() used - uses a proper recursive descent parser.
//  */
function safeCalculate(expr) {
    // Strip whitespace, only allow safe characters
    const cleaned = expr.replace(/\s+/g, '');
    if (!/^[\d+\-*/.()%^]+$/.test(cleaned)) return null;
    if (cleaned.length === 0) return null;

    try {
        const result = parseExpression(cleaned, { pos: 0 });
        if (Number.isFinite(result)) {
            // Round floating point errors
            const rounded = Math.round(result * 1e10) / 1e10;
            return String(rounded);
        }
    } catch (_) { /* silent fail */ }
    return null;
}

function parseExpression(str, state) {
    return parseAddSub(str, state);
}

function parseAddSub(str, state) {
    let left = parseMulDiv(str, state);
    while (state.pos < str.length) {
        const op = str[state.pos];
        if (op !== '+' && op !== '-') break;
        state.pos++;
        const right = parseMulDiv(str, state);
        left = op === '+' ? left + right : left - right;
    }
    return left;
}

function parseMulDiv(str, state) {
    let left = parsePower(str, state);
    while (state.pos < str.length) {
        const op = str[state.pos];
        if (op !== '*' && op !== '/' && op !== '%') break;
        state.pos++;
        const right = parsePower(str, state);
        if (op === '*') left *= right;
        else if (op === '/') left /= right;
        else left %= right;
    }
    return left;
}

function parsePower(str, state) {
    let base = parseUnary(str, state);
    if (state.pos < str.length && str[state.pos] === '^') {
        state.pos++;
        const exp = parsePower(str, state); // right-associative
        base = Math.pow(base, exp);
    }
    return base;
}

function parseUnary(str, state) {
    if (state.pos < str.length && str[state.pos] === '-') {
        state.pos++;
        return -parseAtom(str, state);
    }
    if (state.pos < str.length && str[state.pos] === '+') {
        state.pos++;
    }
    return parseAtom(str, state);
}

function parseAtom(str, state) {
    if (state.pos < str.length && str[state.pos] === '(') {
        state.pos++; // consume '('
        const val = parseExpression(str, state);
        if (state.pos < str.length && str[state.pos] === ')') state.pos++;
        return val;
    }
    // Parse number
    const start = state.pos;
    while (state.pos < str.length && /[\d.]/.test(str[state.pos])) state.pos++;
    const numStr = str.slice(start, state.pos);
    const num = parseFloat(numStr);
    if (isNaN(num)) throw new Error('Invalid number');
    return num;
}

// ─── Fuzzy Match ──────────────────────────────────────────────────────────────

/**
 * Returns a score (higher = better match) or null if no match.
 * Prefers: exact match > starts-with > contiguous substring > fuzzy
 */
function fuzzyScore(query, target) {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (t === q) return 1000;
    if (t.startsWith(q)) return 900;
    if (t.includes(q)) return 800;

    // Character-by-character fuzzy
    let qi = 0;
    let score = 0;
    let consecutive = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) {
            qi++;
            consecutive++;
            score += 10 + consecutive * 5;
        } else {
            consecutive = 0;
        }
    }
    if (qi < q.length) return null; // didn't match all chars
    return score;
}

/**
 * Highlights matching characters in a string by wrapping them in markers.
 * Returns an array of {text, highlight} segments.
 */
function highlightMatches(query, target) {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    const segments = [];

    if (t.includes(q)) {
        const idx = t.indexOf(q);
        if (idx > 0) segments.push({ text: target.slice(0, idx), highlight: false });
        segments.push({ text: target.slice(idx, idx + q.length), highlight: true });
        if (idx + q.length < target.length)
            segments.push({ text: target.slice(idx + q.length), highlight: false });
        return segments;
    }

    // Fuzzy highlight
    let qi = 0;
    let segStart = 0;
    let inMatch = false;
    for (let ti = 0; ti < target.length; ti++) {
        const matches = qi < q.length && t[ti] === q[qi];
        if (matches && !inMatch) {
            if (ti > segStart) segments.push({ text: target.slice(segStart, ti), highlight: false });
            segStart = ti;
            inMatch = true;
        } else if (!matches && inMatch) {
            segments.push({ text: target.slice(segStart, ti), highlight: true });
            segStart = ti;
            inMatch = false;
        }
        if (matches) qi++;
    }
    segments.push({ text: target.slice(segStart), highlight: inMatch });
    return segments;
}

// ─── Main Extension Class ─────────────────────────────────────────────────────

export default class SpotlightSearch extends Extension {
    constructor(metadata) {
        super(metadata);
        this._overlay = null;
        this._entry = null;
        this._resultsBox = null;
        this._results = [];
        this._selectedIndex = -1;
        this._searchTimeout = null;
        this._currentProc = null;
        this._keyPressId = null;
        this._visible = false;
    }

    enable() {
        // Register the keybinding Alt+Space
        Main.wm.addKeybinding(
            'spotlight-search-toggle',
            this._getSettings(),
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._toggle()
        );

        // Build the UI (hidden initially)
        this._buildUI();

        log('[SpotlightSearch] Extension enabled');
    }

    disable() {
        Main.wm.removeKeybinding('spotlight-search-toggle');
        this._destroyUI();
        if (this._searchTimeout) {
            GLib.source_remove(this._searchTimeout);
            this._searchTimeout = null;
        }
        if (this._currentProc) {
            try { this._currentProc.force_exit(); } catch (_) {}
            this._currentProc = null;
        }
        log('[SpotlightSearch] Extension disabled');
    }

    // Returns a GSettings object for keybinding registration.
    // Falls back gracefully if no schema is installed.
    _getSettings() {
        try {
            return this.getSettings();
        } catch (_) {
            // Create a minimal in-memory settings substitute
            return new Gio.Settings({ schema_id: 'org.gnome.shell.extensions.spotlight-search' });
        }
    }

    // ─── UI Construction ────────────────────────────────────────────────────

    _buildUI() {
        // Full-screen transparent backdrop to catch outside clicks and events
        this._backdrop = new Clutter.Actor({
            reactive: true,
            width: global.screen_width,
            height: global.screen_height,
            visible: false,
        });
        this._backdrop.connect('button-press-event', () => {
            this._hide();
            return Clutter.EVENT_STOP;
        });
        // Capture scroll events to prevent background scrolling
        this._backdrop.connect('scroll-event', () => Clutter.EVENT_STOP);
        // Capture key events to prevent background app interaction
        this._backdrop.connect('key-press-event', () => Clutter.EVENT_STOP);

        // Main container (centered, fixed width)
        this._overlay = new St.BoxLayout({
            style_class: 'spotlight-overlay',
            vertical: true,
            reactive: true,
            track_hover: true,
            can_focus: true,
        });
        // Capture scroll events on the overlay to enable scrolling
        this._overlay.connect('scroll-event', (actor, event) => {
            // Let the scroll view handle it if we have results
            if (this._scroll && this._scroll.visible) {
                return Clutter.EVENT_PROPAGATE;
            }
            return Clutter.EVENT_STOP;
        });

        // Search entry
        this._entry = new St.Entry({
            style_class: 'spotlight-entry',
            hint_text: 'Search files, calculate…',
            can_focus: true,
        });
        this._entry.set_x_expand(true);

        // Search icon
        const icon = new St.Icon({
            icon_name: 'system-search-symbolic',
            style_class: 'spotlight-search-icon',
        });
        this._entry.set_primary_icon(icon);

        this._entry.clutter_text.connect('text-changed', () => this._onTextChanged());
        this._entry.clutter_text.connect('key-press-event', (_, event) => {
            const result = this._onKeyPress(event);
            return result;
        });

        // Result prefix label (for calculator result)
        this._calcLabel = new St.Label({
            style_class: 'spotlight-calc-label',
            visible: false,
        });

        // Results scroll area
        this._scroll = new St.ScrollView({
            style_class: 'spotlight-scroll',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            visible: false,
            x_expand: true,
            y_expand: false,
            reactive: true,
        });
        // Enable scroll event capture on the scroll view
        this._scroll.connect('scroll-event', () => Clutter.EVENT_PROPAGATE);

        this._resultsBox = new St.BoxLayout({
            style_class: 'spotlight-results',
            vertical: true,
            x_expand: true,
        });
        this._scroll.set_child(this._resultsBox);

        // Separator between entry and results
        this._separator = new St.Widget({
            style_class: 'spotlight-separator',
            visible: false,
        });

        this._overlay.add_child(this._entry);
        this._overlay.add_child(this._calcLabel);
        this._overlay.add_child(this._separator);
        this._overlay.add_child(this._scroll);

        // Add to the UI group
        Main.uiGroup.add_child(this._backdrop);
        Main.uiGroup.add_child(this._overlay);

        // Position overlay centrally (will be recalculated on show)
        this._positionOverlay();
    }

    _positionOverlay() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor || !this._overlay) return;
        this._overlay.set_width(CONFIG.OVERLAY_WIDTH);
        const x = monitor.x + Math.floor((monitor.width - CONFIG.OVERLAY_WIDTH) / 2);
        const y = monitor.y + Math.floor(monitor.height * 0.2);
        this._overlay.set_position(x, y);

        if (this._backdrop) {
            this._backdrop.set_size(global.screen_width, global.screen_height);
        }
    }

    _destroyUI() {
        if (this._backdrop) {
            Main.uiGroup.remove_child(this._backdrop);
            this._backdrop.destroy();
            this._backdrop = null;
        }
        if (this._overlay) {
            Main.uiGroup.remove_child(this._overlay);
            this._overlay.destroy();
            this._overlay = null;
        }
        this._entry = null;
        this._resultsBox = null;
        this._scroll = null;
        this._calcLabel = null;
    }

    // ─── Show / Hide ────────────────────────────────────────────────────────

    _toggle() {
        this._visible ? this._hide() : this._show();
    }

    _show() {
        if (this._visible) return;
        this._visible = true;
        this._positionOverlay();

        this._backdrop.show();
        this._overlay.show();
        this._overlay.set_opacity(0);
        this._overlay.ease({
            opacity: 255,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });

        // Clear state
        this._entry.set_text('');
        this._clearResults();
        this._calcLabel.hide();
        this._separator.hide();
        this._scroll.hide();

        // Push modal to capture all input events (keyboard, scroll, etc.)
        // This prevents background apps from receiving events
        if (!Main.pushModal(this._overlay, {
            actionMode: Shell.ActionMode.NORMAL,
        })) {
            // Failed to grab modal, hide and return
            log('[SpotlightSearch] Failed to grab modal');
            this._backdrop.hide();
            this._overlay.hide();
            this._visible = false;
            return;
        }

        // Focus the entry
        this._entry.grab_key_focus();
        global.stage.set_key_focus(this._entry.clutter_text);
    }

    _hide() {
        if (!this._visible) return;
        this._visible = false;

        // Pop modal to release input capture
        Main.popModal(this._overlay);

        this._overlay.ease({
            opacity: 0,
            duration: 120,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                this._overlay.hide();
                this._backdrop.hide();
                this._clearResults();
            },
        });

        // Cancel pending search
        if (this._searchTimeout) {
            GLib.source_remove(this._searchTimeout);
            this._searchTimeout = null;
        }
    }

    // ─── Input Handling ─────────────────────────────────────────────────────

    _onTextChanged() {
        const text = this._entry.get_text().trim();
        log(`[SpotlightSearch] Text changed: "${text}"`);

        // Cancel existing debounce
        if (this._searchTimeout) {
            GLib.source_remove(this._searchTimeout);
            this._searchTimeout = null;
        }

        if (!text) {
            this._clearResults();
            this._calcLabel.hide();
            return;
        }

        // Check calculator first (instant)
        const calcResult = safeCalculate(text);
        if (calcResult !== null && /[+\-*/^%()]/.test(text)) {
            this._showCalcResult(text, calcResult);
        } else {
            this._calcLabel.hide();
        }

        // Debounced file search
        this._searchTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, CONFIG.SEARCH_DELAY_MS, () => {
            this._searchTimeout = null;
            log(`[SpotlightSearch] Running search for: "${text}"`);
            this._runSearch(text);
            return GLib.SOURCE_REMOVE;
        });
    }

    _onKeyPress(event) {
        const sym = event.get_key_symbol();

        if (sym === Clutter.KEY_Escape) {
            this._hide();
            return Clutter.EVENT_STOP;
        }

        if (sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter) {
            if (this._selectedIndex >= 0 && this._selectedIndex < this._results.length) {
                this._launchResult(this._results[this._selectedIndex]);
            } else if (this._results.length > 0) {
                this._launchResult(this._results[0]);
            }
            return Clutter.EVENT_STOP;
        }

        if (sym === Clutter.KEY_Down) {
            this._selectIndex(this._selectedIndex + 1);
            return Clutter.EVENT_STOP;
        }

        if (sym === Clutter.KEY_Up) {
            this._selectIndex(this._selectedIndex - 1);
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _selectIndex(idx) {
        const count = this._results.length;
        if (count === 0) return;
        const newIdx = Math.max(0, Math.min(count - 1, idx));
        this._updateSelection(newIdx);
    }

    _updateSelection(newIdx) {
        // Deselect old
        if (this._selectedIndex >= 0) {
            const oldItem = this._resultsBox.get_child_at_index(this._selectedIndex);
            if (oldItem && oldItem.remove_style_class_name) {
                oldItem.remove_style_class_name('spotlight-result-selected');
            }
        }
        this._selectedIndex = newIdx;
        // Select new
        if (newIdx >= 0) {
            const newItem = this._resultsBox.get_child_at_index(newIdx);
            if (newItem && newItem.add_style_class_name) {
                newItem.add_style_class_name('spotlight-result-selected');
                // Scroll into view if possible
                if (newItem.grab_key_focus) {
                    newItem.grab_key_focus();
                }
            }
        }
    }

    // ─── Calculator Display ──────────────────────────────────────────────────

    _showCalcResult(expr, result) {
        this._calcLabel.set_text(`= ${result}`);
        this._calcLabel.show();
        this._separator.show();
    }

    // ─── File Search ─────────────────────────────────────────────────────────

    _runSearch(query) {
        // Kill any existing search process
        if (this._currentProc) {
            try { this._currentProc.force_exit(); } catch (_) {}
            this._currentProc = null;
        }

        this._clearResults();

        // Build find command across configured search dirs
        const validDirs = CONFIG.SEARCH_DIRS.filter(d => d && GLib.file_test(d, GLib.FileTest.IS_DIR));
        if (validDirs.length === 0) return;

        const args = [
            'find',
            ...validDirs,
            '-maxdepth', String(CONFIG.FIND_MAX_DEPTH),
            '-iname', `*${query}*`,
            '-not', '-path', '*/.*',   // exclude hidden dirs
            '!', '-name', '.*',         // exclude hidden files
        ];

        try {
            const proc = new Gio.Subprocess({
                argv: args,
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
            });
            proc.init(null);
            this._currentProc = proc;

            const stream = new Gio.DataInputStream({
                base_stream: proc.get_stdout_pipe(),
            });

            const collectedPaths = [];
            let lastUpdateCount = 0;
            
            const readLine = () => {
                stream.read_line_async(GLib.PRIORITY_LOW, null, (s, res) => {
                    try {
                        const [line] = s.read_line_finish_utf8(res);
                        if (line !== null) {
                            collectedPaths.push(line);
                            
                            // Update display every 5 items or when we hit max results
                            if (collectedPaths.length - lastUpdateCount >= 5 || 
                                collectedPaths.length >= CONFIG.MAX_RESULTS) {
                                this._displayResults(query, collectedPaths);
                                lastUpdateCount = collectedPaths.length;
                            }
                            
                            if (collectedPaths.length < CONFIG.MAX_RESULTS * 3) {
                                readLine();
                            } else {
                                proc.force_exit();
                                this._displayResults(query, collectedPaths);
                            }
                        } else {
                            // Process finished, display final results
                            this._displayResults(query, collectedPaths);
                        }
                    } catch (_) {
                        // Final update on error
                        if (collectedPaths.length > 0) {
                            this._displayResults(query, collectedPaths);
                        }
                    }
                });
            };
            readLine();
        } catch (e) {
            logError(e, '[SpotlightSearch] Search failed');
        }
    }

    _displayResults(query, paths) {
        try {
            log(`[SpotlightSearch] === DISPLAY RESULTS CALLED ===`);
            log(`[SpotlightSearch] Query: \"${query}\", Paths found: ${paths.length}`);
        
        if (paths.length > 0) {
            log(`[SpotlightSearch] First 3 paths:`);
            paths.slice(0, 3).forEach(p => log(`  - ${p}`));
        }
        
        // Score and sort
        const scored = paths
            .map(p => {
                const basename = GLib.path_get_basename(p);
                const score = fuzzyScore(query, basename);
                return score !== null ? { path: p, basename, score } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .slice(0, CONFIG.MAX_RESULTS);

        log(`[SpotlightSearch] Scored results: ${scored.length}`);
        if (scored.length > 0) {
            log(`[SpotlightSearch] Top scored result: ${scored[0].basename} (score: ${scored[0].score})`);
        }
        
        this._results = scored;
        this._selectedIndex = scored.length > 0 ? 0 : -1;

        this._clearResultsUI();
        log(`[SpotlightSearch] UI cleared, resultsBox has ${this._resultsBox.get_n_children()} children`);

        if (scored.length === 0) {
            log('[SpotlightSearch] No scored results, hiding UI');
            this._scroll.hide();
            this._separator.hide();
            return;
        }

        log(`[SpotlightSearch] Creating ${scored.length} result rows...`);
        scored.forEach((item, idx) => {
            const row = this._createResultRow(item, query, idx);
            this._resultsBox.add_child(row);
            log(`[SpotlightSearch] Added row ${idx}: ${item.basename}`);
        });

        const childCount = this._resultsBox.get_n_children();
        log(`[SpotlightSearch] ResultsBox now has ${childCount} children`);

        // Select first item
        if (childCount > 0) {
            const firstRow = this._resultsBox.get_child_at_index(0);
            log(`[SpotlightSearch] First row exists: ${firstRow !== null}`);
            if (firstRow && firstRow.add_style_class_name) {
                firstRow.add_style_class_name('spotlight-result-selected');
                log('[SpotlightSearch] First row selected');
            }
        }

        log(`[SpotlightSearch] Showing separator and scroll...`);
        log(`[SpotlightSearch] Separator visible before: ${this._separator.visible}`);
        log(`[SpotlightSearch] Scroll visible before: ${this._scroll.visible}`);
        
        this._separator.show();
        this._scroll.show();
        
        log(`[SpotlightSearch] Separator visible after: ${this._separator.visible}`);
        log(`[SpotlightSearch] Scroll visible after: ${this._scroll.visible}`);
        log(`[SpotlightSearch] Scroll height: ${this._scroll.height}, width: ${this._scroll.width}`);
        log(`[SpotlightSearch] ResultsBox height: ${this._resultsBox.height}, width: ${this._resultsBox.width}`);
        
        // Force a relayout to ensure visibility
        this._overlay.queue_relayout();
        log('[SpotlightSearch] ===Relayout queued ===');
        } catch (error) {
            logError(error, '[SpotlightSearch] ERROR in _displayResults');
            log(`[SpotlightSearch] Error message: ${error.message}`);
            log(`[SpotlightSearch] Error stack: ${error.stack}`);
        }
    }

    _createResultRow(item, query, idx) {
        const isDir = GLib.file_test(item.path, GLib.FileTest.IS_DIR);

        const row = new St.BoxLayout({
            style_class: 'spotlight-result-row',
            reactive: true,
            track_hover: true,
        });

        // File type icon
        const iconName = isDir ? 'folder-symbolic' : this._guessIcon(item.basename);
        const icon = new St.Icon({
            icon_name: iconName,
            style_class: 'spotlight-result-icon',
            icon_size: 20,
        });

        // Text column
        const textBox = new St.BoxLayout({ vertical: true, x_expand: true });

        // Highlighted filename
        const nameBox = new St.BoxLayout({ style_class: 'spotlight-result-name-box' });
        const segments = highlightMatches(query, item.basename);
        segments.forEach(seg => {
            const lbl = new St.Label({
                text: seg.text,
                style_class: seg.highlight ? 'spotlight-match-highlight' : 'spotlight-result-name',
            });
            nameBox.add_child(lbl);
        });

        // Path label
        const dir = GLib.path_get_dirname(item.path);
        const pathLabel = new St.Label({
            text: dir.replace(GLib.get_home_dir(), '~'),
            style_class: 'spotlight-result-path',
        });

        textBox.add_child(nameBox);
        textBox.add_child(pathLabel);

        row.add_child(icon);
        row.add_child(textBox);

        // Click handler
        row.connect('button-press-event', () => {
            this._launchResult(this._results[idx]);
            return Clutter.EVENT_STOP;
        });

        row.connect('enter-event', () => {
            this._updateSelection(idx);
        });

        return row;
    }

    _guessIcon(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        const map = {
            pdf: 'application-pdf-symbolic',
            doc: 'x-office-document-symbolic', docx: 'x-office-document-symbolic',
            xls: 'x-office-spreadsheet-symbolic', xlsx: 'x-office-spreadsheet-symbolic',
            ppt: 'x-office-presentation-symbolic', pptx: 'x-office-presentation-symbolic',
            png: 'image-x-generic-symbolic', jpg: 'image-x-generic-symbolic',
            jpeg: 'image-x-generic-symbolic', gif: 'image-x-generic-symbolic',
            svg: 'image-x-generic-symbolic',
            mp4: 'video-x-generic-symbolic', mkv: 'video-x-generic-symbolic',
            avi: 'video-x-generic-symbolic',
            mp3: 'audio-x-generic-symbolic', flac: 'audio-x-generic-symbolic',
            ogg: 'audio-x-generic-symbolic',
            txt: 'text-x-generic-symbolic', md: 'text-x-generic-symbolic',
            js: 'text-x-script-symbolic', ts: 'text-x-script-symbolic',
            py: 'text-x-script-symbolic', sh: 'text-x-script-symbolic',
            zip: 'package-x-generic-symbolic', tar: 'package-x-generic-symbolic',
            gz: 'package-x-generic-symbolic',
        };
        return map[ext] || 'text-x-generic-symbolic';
    }

    // ─── Launch ──────────────────────────────────────────────────────────────

    _launchResult(item) {
        if (!item) return;
        this._hide();

        const uri = GLib.filename_to_uri(item.path, null);
        try {
            Gio.AppInfo.launch_default_for_uri(uri, global.create_app_launch_context(0, -1));
        } catch (e) {
            logError(e, `[SpotlightSearch] Failed to open: ${item.path}`);
            // Fallback: use xdg-open
            try {
                GLib.spawn_command_line_async(`xdg-open "${item.path}"`);
            } catch (e2) {
                logError(e2, '[SpotlightSearch] xdg-open also failed');
            }
        }
    }

    // ─── Cleanup Helpers ─────────────────────────────────────────────────────

    _clearResultsUI() {
        if (this._resultsBox) {
            this._resultsBox.destroy_all_children();
        }
    }

    _clearResults() {
        this._clearResultsUI();
        this._results = [];
        this._selectedIndex = -1;
        if (this._scroll) this._scroll.hide();
        if (this._separator) this._separator.hide();
    }
}
