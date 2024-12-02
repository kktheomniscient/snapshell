#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { URL } from 'url';

const moduleDir = path.dirname(new URL(import.meta.url).pathname);

const fixedModuleDir = moduleDir.startsWith('/') ? moduleDir.slice(1) : moduleDir;

const shortcutsFilePath = path.join(fixedModuleDir, 'shortcuts.json');

//set up Lowdb to store shortcuts
const defaultData = {
    globalShortcuts: {},
    localShortcuts: {},
};
const db = await JSONFilePreset(shortcutsFilePath, defaultData)

//set up the db if its empty
async function initializeDB() {
    await db.read();
    db.data ||= { shortcuts: {} };
    await db.write();
}
await initializeDB();

const program = new Command();

//add shortcut
program
    .command('add')
    .description('add a new shortcut for multiple commands')
    .action(async () => {
        await initializeDB();

        const { scope } = await inquirer.prompt([
            {
                type: 'list',
                name: 'scope',
                message: 'Is this a global shortcut or local to this directory?',
                choices: ['Global', 'Local'],
            },
        ]);

        const currentDir = process.cwd();

        const { shortcut, count } = await inquirer.prompt([
            {
                type: 'input',
                name: 'shortcut',
                message: 'Enter the shortcut name:',
                validate: input => input ? true : 'Shortcut name cannot be empty!',
            },
            {
                type: 'number',
                name: 'count',
                message: 'How many commands do you want to add?',
                validate: value => (Number.isInteger(value) && value > 0) || 'Please enter a valid positive integer.',
            },
        ]);

        const commandList = [];
        for (let i = 0; i < count; i++) {
            commandList.push({
                type: 'input',
                name: `Command${i + 1}`,
                message: `Enter command #${i + 1}:`,
            });
        }

        const commands = Object.values(await inquirer.prompt(commandList));

        if (scope === 'Global') {
            if (db.data.globalShortcuts[shortcut]) {
                console.log(chalk.red('Global shortcut already exists!'));
                return;
            }
            db.data.globalShortcuts[shortcut] = commands;
        } else {
            if (!db.data.localShortcuts[currentDir]) {
                db.data.localShortcuts[currentDir] = {};
            }
            if (db.data.localShortcuts[currentDir][shortcut]) {
                console.log(chalk.red('Local shortcut for this directory already exists!'));
                return;
            }
            db.data.localShortcuts[currentDir][shortcut] = commands;
        }

        await db.write();
        console.log(chalk.green(`Shortcut added (${scope}): ${shortcut} -> ${commands.join(' && ')}`));
    });

//list shortcuts
program
    .command('list')
    .description('list all shortcuts')
    .action(async () => {
        await initializeDB();

        const globalShortcuts = db.data.globalShortcuts || {};
        const localShortcuts = db.data.localShortcuts || {};

        // Check if both global and local shortcuts are empty
        if (Object.keys(globalShortcuts).length === 0 && Object.keys(localShortcuts).length === 0) {
            console.log(chalk.yellow('No shortcuts found. Add some using the "add" command.'));
            return;
        }

        console.log(chalk.magenta('Saved shortcuts:'));

        // Handle global shortcuts
        if (Object.keys(globalShortcuts).length > 0) {
            console.log(chalk.blue('Global Shortcuts:'));
            for (const [shortcut, commands] of Object.entries(globalShortcuts)) {
                console.log(`${chalk.yellow(shortcut)} ->`);

                if (Array.isArray(commands)) {
                    // Display each command in the shortcut
                    commands.forEach((command, index) => {
                        console.log(`  ${chalk.cyan(index + 1)}. ${chalk.green(command)}`);
                    });
                } else {
                    // Handle backward compatibility for single-command shortcuts
                    console.log(` ${chalk.green(commands)}`);
                }
            }
        }

        // Handle local shortcuts
        if (Object.keys(localShortcuts).length > 0) {
            console.log(chalk.blue('Local Shortcuts:'));
            for (const [dir, shortcutsInDir] of Object.entries(localShortcuts)) {
                console.log(`${chalk.yellow(dir)} ->`);

                for (const [shortcut, commands] of Object.entries(shortcutsInDir)) {
                    console.log(`  ${chalk.yellow(shortcut)} ->`);

                    if (Array.isArray(commands)) {
                        // Display each command in the shortcut
                        commands.forEach((command, index) => {
                            console.log(`    ${chalk.cyan(index + 1)}. ${chalk.green(command)}`);
                        });
                    } else {
                        // Handle backward compatibility for single-command shortcuts
                        console.log(`    ${chalk.green(commands)}`);
                    }
                }
            }
        }
    });

//run shortcut
program
    .argument('[shortcut]', 'shortcut name to execute')
    .action(async (shortcut) => {
        await initializeDB();

        if (!shortcut) {
            program.help();
            return;
        }

        const globalShortcuts = db.data.globalShortcuts || {};
        const localShortcuts = db.data.localShortcuts || {};

        let commands = null;
        let localShortcutExists = false;

        let currentDir = process.cwd(); // Get the current working directory
        while(currentDir !== path.dirname(currentDir)){
            if(localShortcuts[currentDir] && localShortcuts[currentDir][shortcut]){
                commands = localShortcuts[currentDir][shortcut];
                console.log(chalk.green(`Running local shortcut: "${currentDir}": ${shortcut} -> ${commands.join(' && ')}`));
                localShortcutExists = true;
                break;
            }
            currentDir = path.dirname(currentDir);
        }
        if (globalShortcuts[shortcut] && !localShortcutExists) {
            // If no local shortcut found, check for a global shortcut
            commands = globalShortcuts[shortcut];
            console.log(chalk.green(`Running global shortcut: ${shortcut} -> ${commands.join(' && ')}`));
        }

        // If no shortcut was found, show an error
        if (!commands) {
            console.log(chalk.red(`Shortcut "${shortcut}" not found!`));
            return;
        }

        // Execute the commands (whether local or global)
        try {
            // If the commands are an array, run them sequentially (join them with &&)
            execSync(commands.join(' && '), { stdio: 'inherit' });
        } catch (err) {
            console.log(chalk.red('Error executing command:', err.message));
        }
    });

//remove shortcut
program
    .command('remove')
    .description('Remove a shortcut')
    .action(async () => {
        await initializeDB();

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'shortcutType',
                message: 'Is this a global shortcut or local to this directory?',
                choices: ['Global', 'Local'],
            },
            {
                type: 'input',
                name: 'shortcut',
                message: 'Enter the shortcut you want to remove:',
                validate: input => input ? true : 'shortcut cannot be empty!',
            },
            {
                type: 'confirm',
                name: 'confirm',
                message: 'are you sure?',
                default: false,
            }
        ]);

        const { shortcutType, shortcut, confirm } = answers;

        if (!confirm) {
            console.log(chalk.yellow('shortcut removal canceled'));
            return;
        }

        if (shortcutType === 'Local') {
            let found = false;

            // Search through all local shortcuts
            for (const [dir, shortcutsInDir] of Object.entries(db.data.localShortcuts)) {
                if (shortcutsInDir[shortcut]) {
                    // Found the shortcut in the directory
                    found = true;
                    delete db.data.localShortcuts[dir][shortcut];

                    // If there are no more local shortcuts in the directory, delete the directory entry
                    if (Object.keys(db.data.localShortcuts[dir]).length === 0) {
                        delete db.data.localShortcuts[dir];
                    }
                    console.log(chalk.green(`Local shortcut "${shortcut}" removed from directory: ${dir}`));
                    break; // Exit the loop once we have found and removed the shortcut
                }
            }

            if (!found) {
                console.log(chalk.red(`Local shortcut "${shortcut}" not found in any directory!`));
                return;
            }

        } else if (shortcutType === 'Global') {
            if (!db.data.globalShortcuts[shortcut]) {
                console.log(chalk.red(`Global shortcut "${shortcut}" not found!`));
                return;
            }

            // Remove the global shortcut
            delete db.data.globalShortcuts[shortcut];
            console.log(chalk.green(`Global shortcut "${shortcut}" removed.`));
        }

        // Save the updated shortcuts to the database
        await db.write();
    });

program.parse(process.argv);