/**
 * Copyright (c) 2014-2017 Eric Gach <eric.gach@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Me.metadata.uuid);
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const PopupMenu = imports.ui.popupMenu;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Util = imports.misc.util;
const _ = Gettext.gettext;

const DeskChangerSettings = Me.imports.settings.DeskChangerSettings;
const debug = Me.imports.utils.debug;
const error = Me.imports.utils.error;
const Ui = Me.imports.ui;

var DeskChangerControls = class DeskChangerControls extends PopupMenu.PopupBaseMenuItem {
    constructor(dbus, settings) {
        super({ can_focus: false, reactive: false });
        this._dbus = dbus;
        this._settings = settings;
        this._bindings = [];

        this._addKeyBinding('next-wallpaper', () => this.next());
        this._addKeyBinding('prev-wallpaper', () => this.prev());

        this._next = new Ui.DeskChangerButton('media-skip-forward', () => this.next());
        this._prev = new Ui.DeskChangerButton('media-skip-backward', () => this.prev());
        this._random = new Ui.DeskChangerStateButton(
            [{
                icon: 'media-playlist-shuffle',
                name: 'random'
            }, {
                icon: 'media-playlist-repeat',
                name: 'ordered'
            }], () => this._toggle_random());
        this._random.set_state((this._settings.random) ? 'random' : 'ordered');

        if (this.addActor) {
            this._box = new St.BoxLayout({ style: 'spacing: 20px;' });
            this.addActor(this._box, { align: St.Align.MIDDLE, span: -1 });
            this._box.add_actor(this._prev, { expand: true });
            this._box.add_actor(this._random, { expand: true });
            this._box.add_actor(this._next, { expand: true });
        } else {
            this.actor.add(this._prev, { expand: true, x_fill: false });
            this.actor.add(this._random, { expand: true, x_fill: false });
            this.actor.add(this._next, { expand: true, x_fill: false });
        }
    }

    destroy() {
        let size = this._bindings.length;

        for (let i = 0; i < size; i++) {
            this._removeKeyBinding(this._bindings[i]);
        }

        this._next.destroy();
        this._prev.destroy();
        this._random.destroy();

        if (this.child != null)
            this.child.destroy();
    }

    next() {
        debug('next');
        this._dbus.NextRemote((result, _error) => {
            if (_error) {
                Main.notifyError('Desk Changer', String(_error));
            }
        });
    }

    prev() {
        debug('prev');
        this._dbus.PrevRemote((result, _error) => {
            if (_error) {
                Main.notifyError('Desk Changer', String(_error));
            }
        });
    }

    _addKeyBinding(key, handler) {
        let success = false;
        if (Shell.ActionMode) { // 3.16 and above
            success = Main.wm.addKeybinding(
                key,
                this._settings.schema,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                handler
            );
        } else { // 3.8 and above
            success = Main.wm.addKeybinding(
                key,
                this._settings.schema,
                Meta.KeyBindingFlags.NONE,
                Shell.KeyBindingMode.NORMAL,
                handler
            );
        }

        this._bindings.push(key);
        if (success) {
            debug('added keybinding ' + key);
        } else {
            debug('failed to add keybinding ' + key);
            debug(success);
        }
    }

    _removeKeyBinding(key) {
        if (this._bindings.indexOf(key)) {
            this._bindings.splice(this._bindings.indexOf(key), 1);
        }

        debug('removing keybinding ' + key);
        Main.wm.removeKeybinding(key);
    }

    _toggle_random(state) {
        debug('setting order to ' + state);
        this._settings.random = (state === 'random');
    }
};

var DeskChangerDaemonControls = class DeskChangerDaemonControls extends PopupMenu.PopupSwitchMenuItem {
    constructor(daemon) {
        // Switch label
        super('DeskChanger Daemon');
        this.daemon = daemon;
        this.setToggleState(this.daemon.is_running);
        this._handler = this.connect('toggled', () => {
            this.daemon.toggle();
        });
        this._daemon_handler = this.daemon.connect('toggled', (obj, state) => {
            this.setToggleState(state);
        });
    }

    destroy() {
        // not sure why, but removing this handler causes the extension to crash on unload... meh
        //debug('removing daemon switch handler '+this._handler);
        //this.disconnect(this._handler);
        debug('removing daemon toggled handler ' + this._daemon_handler);
        this.daemon.disconnect(this._daemon_handler);

        if (this.child != null)
            this.child.destroy();
    }
};

var DeskChangerOpenCurrent = class DeskChangerOpenCurrent extends PopupMenu.PopupBaseMenuItem {
    constructor() {
        super();
        this._background = new Gio.Settings({ 'schema': 'org.gnome.desktop.background' });
        // Menu item label
        this._activate_id = this.connect('activate', () => this._activate());
    }

    destroy() {
        debug('removing current activate handler ' + this._activate_id);
        this.disconnect(this._activate_id);

        if (this.child != null)
            this.child.destroy();
    }

    _activate() {
        debug('opening current wallpaper ' + this._background.get_string('picture-uri'));
        Util.spawn(['xdg-open', this._background.get_string('picture-uri')]);
    }
};

var DeskChangerPreviewMenuItem = class DeskChangerPreviewMenuItem extends PopupMenu.PopupBaseMenuItem {
    constructor(daemon) {
        super({ reactive: true });
        this._box = new St.BoxLayout({ vertical: true });
        try {
            this.addActor(this._box, { align: St.Align.MIDDLE, span: -1 });
        } catch (e) {
            this.actor.add_actor(this._box);
        }
        this._prefix = new St.Label({ text: 'Open Next Wallpaper' });
        this._box.add(this._prefix);
        this._preview = new Ui.DeskChangerPreview(220, daemon);
        this._box.add(this._preview);
        this._activate_id = this.connect('activate', () => this._clicked());
    }

    destroy() {
        debug('removing preview activate handler ' + this._activate_id);
        this.disconnect(this._activate_id);

        this._preview.destroy();
        this._prefix.destroy();
        this._box.destroy();

        if (this.child != null)
            this.child.destroy();
    }

    _clicked() {
        if (this._preview.file) {
            debug('opening file ' + this._preview.file);
            Util.spawn(['xdg-open', this._preview.file]);
        } else {
            debug('ERROR: no preview currently set');
        }
    }
};

var DeskChangerPopupSubMenuMenuItem = class DeskChangerPopupSubMenuMenuItem extends PopupMenu.PopupSubMenuMenuItem {
    constructor(prefix, key, settings, sensitive = true) {
        super('');
        this._key = key;
        this._key_normalized = key.replace('_', '-');
        this._prefix = prefix;
        this._settings = settings;
        this._settings.connect('changed::' + this._key_normalized, () => this.setLabel());
        this.setLabel();
        this.setSensitive(sensitive);
    }

    setLabel() {
        this.label.text = this._prefix + ': ' + this._settings[this._key];
    }
};

var DeskChangerPopupMenuItem = class DeskChangerPopupMenuItem extends PopupMenu.PopupMenuItem {
    constructor(label, value, settings, key) {
        super(label);
        this._value = value;
        this._settings = settings;
        this._key = key;
        this._settingKey = key.replace('_', '-');

        if (this._settings[this._key] === this._value) {
            this.setOrnament(PopupMenu.Ornament.DOT);
        }

        this._handler_key_changed = this._settings.connect('changed::' + this._settingKey, () => {
            if (this._settings[this._key] === this._value) {
                this.setOrnament(PopupMenu.Ornament.DOT);
            } else {
                this.setOrnament(PopupMenu.Ornament.NONE);
            }
        });
        this._handler_id = this.connect('activate', () => {
            this._settings[this._key] = this._value;
        });
    }

    destroy() {
        this._settings.disconnect(this._handler_key_changed);
        this.disconnect(this._handler_id);
        if (this.child != null)
            this.child.destroy();
    }
};

var DeskChangerProfileBase = class DeskChangerProfileBase extends DeskChangerPopupSubMenuMenuItem {
    constructor(label, key, settings, sensitive = true) {
        super(label, key, settings, sensitive);
        this._populate_profiles();
        this._settings.connect('changed::profiles', () => this._populate_profiles());
    }

    _populate_profiles() {
        this.menu.removeAll();
        for (let index in this._settings.profiles) {
            debug('adding menu: ' + index);
            let item = new DeskChangerPopupMenuItem(index, index, this._settings, this._key);
            this.menu.addMenuItem(item);
        }
    }
};

var DeskChangerProfileDesktop = class DeskChangerProfileDesktop extends DeskChangerProfileBase {
    constructor(settings, sensitive = true) {
        super('Desktop Profile', 'current_profile', settings, sensitive);
    }
};

var DeskChangerProfileLockscreen = class DeskChangerProfileLockscreen extends DeskChangerProfileBase {
    constructor(settings, sensitive = true) {
        super('Lock Screen Profile', 'lockscreen_profile', settings, sensitive);
    }

    setLabel() {
        let value = this._settings[this._key];

        if (value === '' || value === this._settings.current_profile) {
            value = '(inherited)';
        }

        this.label.text = 'Lock Screen Profile' + ': ' + value;
    }

    _populate_profiles() {
        let inherit = new DeskChangerPopupMenuItem('(inherit from desktop)', '', this._settings, this._key);
        this.menu.addMenuItem(inherit);
    }
};

var DeskChangerRotation = class DeskChangerRotation extends DeskChangerPopupSubMenuMenuItem {
    constructor(settings, sensitive) {
        super('Rotation Mode', 'rotation', settings, sensitive);
        this.menu.addMenuItem(new DeskChangerPopupMenuItem('Interval Timer', 'interval', settings, 'rotation'));
        this.menu.addMenuItem(new DeskChangerPopupMenuItem('Beginning of Hour', 'hourly', settings, 'rotation'));
        this.menu.addMenuItem(new DeskChangerPopupMenuItem('Disabled', 'disabled', settings, 'rotation'));
    }
};

var DeskChangerSwitch = class DeskChangerSwitch extends PopupMenu.PopupSwitchMenuItem {
    constructor(label, setting, settings) {
        super(label);
        this._setting = setting;
        this._settings = settings;
        this.setToggleState(this._settings[setting]);
        this._handler_changed = this._settings.connect('changed::' + this._setting.replace('_', '-'), () => this._changed());
        this._handler_toggled = this.connect('toggled', () => this._toggled());
    }

    destroy() {
        if (this._handler_changed) {
            debug('removing changed::' + this._setting + ' handler ' + this._handler_changed);
            this._settings.disconnect(this._handler_changed);
        }
        debug('removing swtich toggled handler ' + this._handler_toggled);
        this.disconnect(this._handler_toggled);
    }

    _changed(settings, key) {
        this.setToggleState(this._settings[this._setting]);
    }

    _toggled() {
        debug('setting ' + this._setting + ' to ' + this.state);
        this._settings[this._setting] = this.state;
    }
};
