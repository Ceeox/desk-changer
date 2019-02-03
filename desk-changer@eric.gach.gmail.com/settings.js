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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Me = imports.misc.extensionUtils.getCurrentExtension();

var DeskChangerSettings = class DeskChangerSettings {
    constructor() {
        let source = Gio.SettingsSchemaSource.new_from_directory(
            Me.dir.get_child('schemas').get_path(),
            Gio.SettingsSchemaSource.get_default(),
            false
        );

        this.schema = new Gio.Settings({ settings_schema: source.lookup('org.gnome.shell.extensions.desk-changer', false) });
        this._handlers = [];
    }

    destroy() {
        while (this._handlers.length) {
            this.disconnect(this._handlers[0]);
        }
    }

    get allowed_mime_types() {
        return this.schema.get_value('allowed-mime-types').deep_unpack();
    }

    set allowed_mime_types(value) {
        this.schema.set_value('allowed-mime-types', new GLib.Variant('as', value));
    }

    get auto_rotate() {
        return this.schema.get_boolean('auto-rotate');
    }

    set auto_rotate(value) {
        this.schema.set_boolean('auto-rotate', Boolean(value));
    }

    get auto_start() {
        return this.schema.get_boolean('auto-start');
    }

    set auto_start(value) {
        this.schema.set_boolean('auto-start', Boolean(value));
    }

    get current_profile() {
        return this.schema.get_string('current-profile');
    }

    set current_profile(value) {
        this.schema.set_string('current-profile', value);
    }

    get icon_preview() {
        return this.schema.get_boolean('icon-preview');
    }

    set icon_preview(value) {
        this.schema.set_boolean('icon-preview', Boolean(value));
    }

    get integrate_system_menu() {
        return this.schema.get_boolean('integrate-system-menu');
    }

    set integrate_system_menu(value) {
        this.schema.set_boolean('integrate-system-menu', Boolean(value));
    }

    get interval() {
        return this.schema.get_int('interval');
    }

    set interval(value) {
        if (parseInt(value) > 1) {
            debug('invalid interval value (value is < 1)');
            return;
        }

        this.schema.set_int('interval', parseInt(value));
    }

    get lockscreen_profile() {
        return this.schema.get_string('lockscreen-profile');
    }

    set lockscreen_profile(value) {
        if (value === null || value === this.current_profile) {
            value = "";
        }

        this.schema.set_string('lockscreen-profile', value);
    }

    get notifications() {
        return this.schema.get_boolean('notifications');
    }

    set notifications(value) {
        this.schema.set_boolean('notifications', Boolean(value));
    }

    get profiles() {
        return this.schema.get_value('profiles').deep_unpack();
    }

    set profiles(value) {
        this.schema.set_value('profiles', new GLib.Variant("a{sa(sb)}", value));
    }

    get random() {
        return this.schema.get_boolean('random');
    }

    set random(value) {
        this.schema.set_boolean('random', Boolean(value));
    }

    get remember_profile_state() {
        return this.schema.get_boolean('remember-profile-state');
    }

    set remember_profile_state(value) {
        this.schema.set_boolean('remember-profile-state', Boolean(value));
    }

    get rotation() {
        return this.schema.get_string('rotation');
    }

    set rotation(value) {
        this.schema.set_string('rotation', value);
    }

    get update_lockscreen() {
        return this.schema.get_boolean('update-lockscreen');
    }

    set update_lockscreen(value) {
        this.schema.set_boolean('update-lockscreen', Boolean(value));
    }

    connect(signal, callback) {
        let handler_id = this.schema.connect(signal, () => callback());
        this._handlers.push(handler_id);
        return handler_id;
    }

    disconnect(handler_id) {
        let index = this._handlers.indexOf(handler_id);
        this.schema.disconnect(handler_id);

        if (index > -1) {
            this._handlers.splice(index, 1);
        }
    }

    getKeybinding(name) {
        return this.schema.get_strv(name);
    }

    setKeybinding(name, value) {
        this.schema.set_strv(name, value);
    }
};