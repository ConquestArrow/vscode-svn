import * as which from "which"
import * as vscode from "vscode"

import * as ui from "./ui"

const w = vscode.window;
const ws = vscode.workspace;

export class Wizard{

	static startWizard(opt: {ctx:vscode.ExtensionContext}):PromiseLike<string> {
		
		console.log("start wizard")
		
		const md = opt.ctx.extensionPath + "/data/wizard.md"
		
		console.log(`md: ${md}`)
		
		//check svn cmd exists
		return this.whichPromise("svn")
		.then(
			//exists
			result => {
				console.log("exists")
				return Promise.resolve(result)
			},
			//not exists
			reject => {
				console.log("not exists")
				//open wizard md file & show md
				return ws
				.openTextDocument(md)
				.then(doc=>{
					console.log(`open md`)
					return ui
					.text(
						doc,
						vscode.ViewColumn.Three
					)
				},e => ui.error(e))
				.then(doc =>{
					console.log(`preview md`)
					if(doc.document !== w.activeTextEditor.document){
						
						console.log("not active document")
						
						w.activeTextEditor.document = doc.document;
					}
					return vscode.commands.executeCommand('workbench.action.markdown.togglePreview');
				},e => ui.error(e))
				.then(
					res => {
						//console.log(`res`,res)
						return Promise.reject("svn command is not installed yet.")
					},
					rej => {
						//console.log(`rej`,rej)
						return Promise.reject("preview command failed.")
					}
				)
			}
		)
		

	}

	/**
	 * which promise wrapper
	 * @param  {string} cmd command name
	 */
	private static whichPromise(cmd: string){
		//console.log("which promise")
		return new Promise<string|Error>((res, rej) => {
			which(cmd, (e, path) => {
				//console.log(`which, e:${e}, path:${path}`)
				if(e){
					//console.log(rej(e))
					rej(e)
					return
				}
				//console.log(res(path))
				//rej()
				res(path)
			})
		})
	}
}