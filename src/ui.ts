import * as vscode from "vscode"

const w = vscode.window;

export const warn = w.showWarningMessage;
export const info = w.showInformationMessage;
export const error = w.showErrorMessage;
export const pick = w.showQuickPick;
export const input = w.showInputBox;
export const text = w.showTextDocument;