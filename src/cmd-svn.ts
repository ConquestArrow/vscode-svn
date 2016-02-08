import * as vscode from "vscode";
import * as child from "child_process";
import * as fs from "fs";
import * as cmd from "./command";
import * as ui from "./ui";

const w = vscode.window;
const ws = vscode.workspace;
let ae = w.activeTextEditor;
	
export function mainSvnCmd(){
	
	Promise
	.resolve()
	.then((result)=>{
		const subCmd = [
			"add",
			"blame (praise, annotate, ann)",
			"cat",
			"changelist (cl)",
			"checkout (co)",
			"cleanup",
			"commit (ci)",
			"copy (cp)",
			"delete (del, remove, rm)",
			"diff (di)",
			"export",
			"help (?, h)",
			"import",
			"info",
			"list (ls)",
			"lock",
			"log",
			"merge",
			"mergeinfo",
			"mkdir",
			"move (mv, rename, ren)",
			"patch",
			"propdel (pdel, pd)",
			"propedit (pedit, pe)",
			"propget (pget, pg)",
			"proplist (plist, pl)",
			"propset (pset, ps)",
			"relocate",
			"resolve",
			"resolved",
			"revert",
			"status (stat, st)",
			"switch (sw)",
			"unlock",
			"update (up)",
			"upgrade",
		]
		return w.showQuickPick(
			subCmd.map(v=>{
				return {description:`desc:svn ${v}`,label:`svn ${v}`}}),
			{placeHolder:"select a svn subcommand."}
		)
		
	}
	)
	.then((result)=>{
		const reg = /\s\([a-z,\s\?]+\)$/
		let s = result.label.replace(reg, RegExp.$1)
		console.log(`selected: ${s}`)
		
		return w.showInputBox(
			{
				prompt:"input any option. -h is help",
				placeHolder:"svn ?",
				value:`${s}`
			}
		)
	}
	)
	.then((result)=>{
		let out = w.createOutputChannel("Svn")
		out.appendLine(`🔽 ${result.toString()}`)
		return cmd.getCmdPromise(
			`${result}  --non-interactive`,
			{
				maxBuffer:1000000,
				cwd:`${ws.rootPath}`,
				encoding:"utf-8",
				//timeout:1000000
			}
		)
	}
	)
	.then((result)=>{
		let out = w.createOutputChannel("Svn")
		out.appendLine(result.toString())
		out.appendLine(`-----`)
		out.show(vscode.ViewColumn.Three)
	})
	.catch(reject => {
		console.log(reject)
		w.showErrorMessage(reject)
	})
	
}