# Snapshell CLI Tool

**Snapshell** is a simple and powerful command-line tool for managing and running command shortcuts locally or globally. With Snapshell, you can easily automate tasks by saving multiple commands as a single shortcut and running them with ease.

## Features

- **Add Shortcuts**: Save multiple commands as a single shortcut.
- **List Shortcuts**: View all saved shortcuts (both global and local).
- **Run Shortcuts**: Execute multiple commands associated with a shortcut.
- **Remove Shortcuts**: Delete saved shortcuts.

## Installation

You can install Snapshell globally to use it from anywhere in your terminal:

```
npm install -g snapshell
```

### How to use

## Adding a Shortcut

```
ss add

ss add
Is this a global shortcut or local to this directory? (Global/Local)
Enter the shortcut name: deploy
How many commands do you want to add? 2
Enter command #1: npm install
Enter command #2: npm run build
```

## Listing Shortcuts

```
ss list

Global Shortcuts:
  build -> npm install && npm run build

Local Shortcuts:
  /path/to/project -> test -> npm run test
```

## Running a Shortcut

==If a local and global shortcut have the same name then local is prioritized==


```
ss [shortcut-name]

ss build
```

## Removing a Shortcut

```
ss remove

ss remove
Is this a global shortcut or local to this directory? (Global/Local)
Enter the shortcut name: build
Are you sure? (Y/N)
```