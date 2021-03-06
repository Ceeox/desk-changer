# desk-changer

Gnome-Shell wallpaper slideshow extension with multiple profile support. The extension allows you to switch profiles
on the fly without reloading the daemon.

## Screenshots

<img src="./screenshot-1.png?raw=true" width="256" title="Screenshot of menu"> <img src="./screenshot-2.png?raw=true" width="256" title="Screenshot of notification">

## Requirements

* gnome-shell 3.8 or higher
* Python 2 or 3 with [PyGObject](https://wiki.gnome.org/action/show/Projects/PyGObject?action=show&redirect=PyGObject) (This is for the daemon)

##### Fedora/CentOS
These packages must be installed for the extension to work. They are **NOT** installed by default.
###### For python2
`yum install python python-gobject pygobject2`

###### For python3
`yum install python3 python3-gobject pygobject3`

##### Debian/Ubuntu
The following packages should already be installed. No setup should be needed for the extension to work.

###### For python2
`apt-get install python python-gi`

###### For python3
`apt-get install python3 python3-gi`

## Install

Just simply copy the desk-changer&commat;eric.gach.gmail.com folder to your `~/.local/share/gnome-shell/extensions/`
folder or the system `/usr/share/gnome-shell/extensions/` folder.

>$ cp -r desk-changer@eric.gach.gmail.com/ ~/.local/share/gnome-shell/extensions/

or

>\# cp -r desk-changer@eric.gach.gmail.com/ /usr/share/gnome-shell/extensions/

Then restart gnome-shell and enable the extension. Once it is enabled, you can use the extension to start the daemon
with the built in toggle switch.

## General Information
### Daemon

The daemon is simply a Gio.Application running as a service. To view more information about the daemon, run it from the
command line with the `-h` or `--help` option.

>$ ./desk-changer-daemon.py -h  
>Usage:
>  desk-changer-daemon.py [OPTION...]
>
>Help Options:
>  -h, --help                Show help options
>  --help-all                Show all help options
>

### dconf-editor

To view the settings in dconf-editor, just use the `GSETTINGS_SCHEMA_DIR=` environment variable to open dconf-editor
with the extensions schema available to the editor.

>$ GSETTINGS_SCHEMA_DIR=~/.local/share/gnome-shell/extensions/desk-changer@eric.gach.gmail.com/schemas/ dconf-editor`

Then navigate to `org.gnome.shell.extensions.desk-changer` and you will see all of the available settings for the
extension and daemon.

