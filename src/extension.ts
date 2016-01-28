"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'; 

import {Wizard} from "./wizard"
import * as ui from "./ui"
import {GutterSvn} from "./gutter"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	console.log('start activate'); 
	
	Wizard
		.startWizard({ctx:context})
		.then(
			res => {
				console.log("wizard finished.",res)
				//TODO:register commands
				//activate gutter indicator
				//return new GutterSvn(context);
				//res(new GutterSvn(context))
				return new GutterSvn(context)
			}//,
			/*
			rej => {
				console.log("wizard rejected.")
				ui.error(rej)
			}*/
		)
		.then(
			null ,
			e => ui.error(e)
		) 
}

// this method is called when your extension is deactivated
export function deactivate() {
}