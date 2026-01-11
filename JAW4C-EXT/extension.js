const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function activate(context) {
    // Create output channel for debugging
    const outputChannel = vscode.window.createOutputChannel('Trace Highlights');
    context.subscriptions.push(outputChannel);

    // Show the output channel automatically
    outputChannel.show();

    outputChannel.appendLine('='.repeat(50));
    outputChannel.appendLine('Trace Highlights extension activated');
    outputChannel.appendLine('='.repeat(50));

    // 1. Create the collection where we will store our "squiggly lines"
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('trace-highlights');
    context.subscriptions.push(diagnosticCollection);

    // Track current watcher so we can dispose it when switching files
    let currentWatcher = null;
    let currentTraceFilePath = null;

    // 2. The core logic to read trace.json and update the UI
    const updateDiagnostics = () => {
        diagnosticCollection.clear(); // Clear old marks first

        // Get the currently active file
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            outputChannel.appendLine('No active editor found');
            return;
        }

        // Get the directory of the currently open file
        const currentFilePath = activeEditor.document.uri.fsPath;
        const currentFileDir = path.dirname(currentFilePath);
        const rootPath = currentFileDir;

        // Look for trace.json in the same directory as the open file
        const traceFilePath = path.join(currentFileDir, 'trace.json');

        outputChannel.appendLine(`Active file: ${currentFilePath}`);
        outputChannel.appendLine(`Root path: ${rootPath}`);
        outputChannel.appendLine(`Looking for trace.json at: ${traceFilePath}`);

        // Setup watcher for this specific trace.json if we haven't already
        if (currentTraceFilePath !== traceFilePath) {
            // Dispose old watcher
            if (currentWatcher) {
                outputChannel.appendLine(`Disposing watcher for: ${currentTraceFilePath}`);
                currentWatcher.dispose();
                currentWatcher = null;
            }

            // Create new watcher for this specific trace.json
            currentTraceFilePath = traceFilePath;
            currentWatcher = vscode.workspace.createFileSystemWatcher(traceFilePath);
            outputChannel.appendLine(`Created watcher for: ${traceFilePath}`);

            currentWatcher.onDidChange(() => {
                outputChannel.appendLine('trace.json changed, updating diagnostics...');
                updateDiagnostics();
            });

            currentWatcher.onDidCreate(() => {
                outputChannel.appendLine('trace.json created, updating diagnostics...');
                updateDiagnostics();
            });

            currentWatcher.onDidDelete(() => {
                outputChannel.appendLine('trace.json deleted, clearing diagnostics...');
                diagnosticCollection.clear();
            });

            context.subscriptions.push(currentWatcher);
        }

        // If trace.json doesn't exist, stop
        if (!fs.existsSync(traceFilePath)) {
            outputChannel.appendLine('No trace.json found in the current file directory.');
            return;
        }

        try {
            // Read and parse the JSON
            const fileContent = fs.readFileSync(traceFilePath, 'utf8');
            const traceData = JSON.parse(fileContent);

            outputChannel.appendLine(`Successfully loaded trace.json with ${Object.keys(traceData).length} files`);

            // Loop through each file mentioned in the JSON
            for (const [filePath, errors] of Object.entries(traceData)) {
                // Check if path is already absolute, if not join with rootPath
                const absPath = path.isAbsolute(filePath) ? filePath : path.join(rootPath, filePath);
                const uri = vscode.Uri.file(absPath);

                outputChannel.appendLine(`Processing ${filePath} (${errors.length} issues)`);

                const diagnostics = errors.map(err => {
                    // Create the range (VS Code lines start at 0, so subtract 1 if trace.json uses 1-based indexing)
                    const range = new vscode.Range(
                        err.startLine - 1,
                        err.startChar,
                        err.endLine - 1,
                        err.endChar
                    );

                    // Determine severity (Default to Error if unknown)
                    let severity = vscode.DiagnosticSeverity.Error;
                    if (err.severity === 'warning') severity = vscode.DiagnosticSeverity.Warning;
                    if (err.severity === 'info') severity = vscode.DiagnosticSeverity.Information;

                    let diag = new vscode.Diagnostic(range, err.message, severity);
                    diag.source = 'jaw4c-trace';
                    return diag;
                });

                // Set the diagnostics for this specific file
                diagnosticCollection.set(uri, diagnostics);
            }
            outputChannel.appendLine('Diagnostics updated successfully');
        } catch (e) {
            outputChannel.appendLine(`Error parsing trace.json: ${e.message}`);
            outputChannel.appendLine(e.stack);
        }
    };

    // 4. Update diagnostics when switching to a different file
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            outputChannel.appendLine(`Switched to file: ${editor.document.fileName}`);
            updateDiagnostics();
        }
    }));

    // 5. Run once on startup
    outputChannel.appendLine('Running initial diagnostic scan...');
    updateDiagnostics();
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};