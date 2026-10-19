// LabsCode Extras: focus timer, today's edit tally, scratchpad and red-pen TODO markers.
'use strict';
const vscode = require('vscode');

const config = () => vscode.workspace.getConfiguration('labscode');

/** Status bar countdown. Click to start a session of `labscode.focus.minutes`; click again to stop. */
function focusTimer(context) {
	const item = vscode.window.createStatusBarItem('labscode.focus', vscode.StatusBarAlignment.Right, 100);
	item.name = 'LabsCode Focus Timer';
	item.command = 'labscode.focus.toggle';
	let endAt = 0;
	let minutes = 0;
	let tick;

	const render = () => {
		if (!endAt) {
			item.text = '$(watch) Focus';
			item.tooltip = `Start a ${config().get('focus.minutes')}-minute focus session`;
			return;
		}
		const left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
		item.text = `$(watch) ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
		item.tooltip = 'Focus session running. Click to stop.';
		if (left === 0) finish();
	};
	const stop = () => {
		clearInterval(tick);
		endAt = 0;
		render();
	};
	const start = () => {
		clearInterval(tick);
		minutes = config().get('focus.minutes');
		endAt = Date.now() + minutes * 60_000;
		tick = setInterval(render, 1000);
		render();
	};
	const finish = async () => {
		stop();
		const again = await vscode.window.showInformationMessage(`Focus session done (${minutes} min). Take a break.`, 'Start another');
		if (again) start();
	};

	context.subscriptions.push(
		item,
		{ dispose: () => clearInterval(tick) },
		vscode.commands.registerCommand('labscode.focus.toggle', () => (endAt ? stop() : start())),
		vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('labscode.focus') && render()),
	);
	render();
	item.show();
}

/** Lines added and removed today across every file you edit. Resets at local midnight. */
function editTally(context) {
	const item = vscode.window.createStatusBarItem('labscode.tally', vscode.StatusBarAlignment.Right, 99);
	item.name = 'LabsCode Edit Tally';
	item.command = 'labscode.tally.reset';
	const today = () => new Date().toLocaleDateString('en-CA');
	let tally = context.globalState.get('labscode.tally', { date: today(), added: 0, removed: 0 });
	let saveTimer;

	const render = () => {
		if (tally.date !== today()) tally = { date: today(), added: 0, removed: 0 };
		item.text = `$(pencil) +${tally.added} −${tally.removed}`;
		item.tooltip = 'Lines added and removed today. Click to reset.';
		config().get('tally.enabled') ? item.show() : item.hide();
	};
	const save = () => {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => context.globalState.update('labscode.tally', tally), 2000);
	};

	context.subscriptions.push(
		item,
		{ dispose: () => context.globalState.update('labscode.tally', tally) },
		vscode.workspace.onDidChangeTextDocument((e) => {
			if (!['file', 'untitled', 'vscode-userdata'].includes(e.document.uri.scheme)) return;
			if (e.reason === vscode.TextDocumentChangeReason.Undo || e.reason === vscode.TextDocumentChangeReason.Redo) return;
			if (tally.date !== today()) tally = { date: today(), added: 0, removed: 0 };
			for (const change of e.contentChanges) {
				tally.removed += change.range.end.line - change.range.start.line;
				tally.added += change.text.split('\n').length - 1;
			}
			render();
			save();
		}),
		vscode.commands.registerCommand('labscode.tally.reset', () => {
			tally = { date: today(), added: 0, removed: 0 };
			render();
			save();
		}),
		vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('labscode.tally') && render()),
	);
	render();
}

/** One Markdown note that lives outside any workspace and survives restarts. */
function scratchpad(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('labscode.scratchpad.open', async () => {
			const dir = context.globalStorageUri;
			const file = vscode.Uri.joinPath(dir, 'scratchpad.md');
			await vscode.workspace.fs.createDirectory(dir);
			try {
				await vscode.workspace.fs.stat(file);
			} catch {
				await vscode.workspace.fs.writeFile(file, Buffer.from('# Scratchpad\n\n'));
			}
			await vscode.window.showTextDocument(file, { preview: false });
		}),
	);
}

/** Marks TODO, FIXME and HACK in light red so they don't get lost. */
function redPen(context) {
	const marker = vscode.window.createTextEditorDecorationType({
		fontWeight: 'bold',
		light: { color: '#C81E1E' },
		dark: { color: '#FF8A8A' },
		overviewRulerColor: '#F87171',
		overviewRulerLane: vscode.OverviewRulerLane.Right,
	});
	const pattern = /\b(TODO|FIXME|HACK)\b/g;
	let pending;

	const paint = (editor) => {
		const doc = editor.document;
		if (!config().get('redPen.enabled') || doc.getText().length > 2_000_000) {
			editor.setDecorations(marker, []);
			return;
		}
		const text = doc.getText();
		const ranges = [];
		for (const m of text.matchAll(pattern)) {
			ranges.push(new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length)));
		}
		editor.setDecorations(marker, ranges);
	};
	const paintVisible = () => vscode.window.visibleTextEditors.forEach(paint);

	context.subscriptions.push(
		marker,
		{ dispose: () => clearTimeout(pending) },
		vscode.window.onDidChangeVisibleTextEditors(paintVisible),
		vscode.workspace.onDidChangeTextDocument((e) => {
			clearTimeout(pending);
			pending = setTimeout(() => vscode.window.visibleTextEditors.filter((ed) => ed.document === e.document).forEach(paint), 200);
		}),
		vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration('labscode.redPen') && paintVisible()),
	);
	paintVisible();
}

function activate(context) {
	focusTimer(context);
	editTally(context);
	scratchpad(context);
	redPen(context);
}

module.exports = { activate, deactivate() {} };
