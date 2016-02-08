"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'; 

import {Wizard} from "./wizard"
import * as ui from "./ui"
import {GutterSvn} from "./gutter"
import {StatusBar} from "./statusbar"

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
				try{
					new StatusBar(context);
					new GutterSvn(context);
				}catch(e){
					console.error(e);
					return Promise.reject(e)
				}
			}
		)
		.then(
			null ,
			e => ui.error(e)
		) 
}

// this method is called when your extension is deactivated
export function deactivate() {
}