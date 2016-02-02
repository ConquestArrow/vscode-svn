import * as vscode from "vscode";
import * as child from "child_process";
import * as xml from "xml2js";

import * as event from "./event";
import * as cmd from "./command";
import * as ui from "./ui";
import * as svn from "./svn-util";

const w = vscode.window;
const ws = vscode.workspace;
let ae = w.activeTextEditor;

type ExtContext = vscode.ExtensionContext;
type VSCodeChangeEvent = vscode.TextEditor | vscode.TextDocumentChangeEvent;


export class StatusBar{
	public svnItem:vscode.StatusBarItem;
	
	constructor(
		public context:ExtContext
	){
		
		
		
		this.getSvnInfo(ae.document.fileName);
		this.initEvents();
	}
	
	initEvents(){
		event.subscribeEvent<VSCodeChangeEvent>(
			w.onDidChangeActiveTextEditor,
			this.changeEditorFocusEvent.bind(this),
			this.context
		);
		event.subscribeEvent<VSCodeChangeEvent>(
			ws.onDidChangeTextDocument,
			this.changeEvent.bind(this),
			this.context
		);
		//*/
		
		event.subscribeEvent<vscode.TextDocument>(
			ws.onDidOpenTextDocument,
			this.fileEvent.bind(this),
			this.context
		);
		event.subscribeEvent<vscode.TextDocument>(
			ws.onDidSaveTextDocument,
			this.fileEvent.bind(this),
			this.context
		);
	}
	
	private changeEditorFocusEvent<T extends VSCodeChangeEvent>(e:T){
		this.getSvnInfo(e.document.fileName);
	}
	
	private changeEvent<T extends VSCodeChangeEvent>(e:T){
		this.getSvnInfo(e.document.fileName);
	}
	
	private fileEvent<T extends vscode.TextDocument>(e:T){
		this.getSvnInfo(e.fileName);
	}
	
	getSvnInfo(fileName:string){
		console.log(`get svn st ${fileName}`)
		let out:string|Buffer;
		try {
			out = child.execSync(
				`svn st "${fileName}" --verbose --xml`,
				{
					cwd: ws.rootPath,
					maxBuffer: 10000000
				}
			)
		} catch (e) {
			console.log(e)
			//out = ae.document.getText();
		}
		//console.log("svn st:"+out.toString())
		
		this.makeItem(out.toString());
	}
	
	makeItem(info:string){
		
		if(!this.svnItem){
			this.svnItem = w.createStatusBarItem(
				vscode.StatusBarAlignment.Left,
				10000
			);
		}
		//this.svnItem.hide();
		
		this.xmlParsePromise(info, {})
			.then(result =>{
				let s = svn.parseStatus(<svn.SvnSt>result)
				if(s.isWC){
					this.svnItem.text = "SVN:" + svn.getStatusIcon(s.item);
					this.svnItem.tooltip = this.toolTipText(s);
					this.svnItem.show();
				}else{
					this.svnItem.hide();
				}
				
			})
			.catch(reject =>{
				ui.error(reject);
			})
		
	}
	
	private toolTipText(st:svn.StatusData):string{
		let s = "";
		
		s += st.item;
		if(!!st.lastCommit){
			s += `, r${st.lastCommit}`;
		}
		if(!!st.author){
			s += ` by ${st.author}`;
		}
		
		
		return s;
	}
	
	private xmlParsePromise(xmlStr: string, opt?: xml.Options) {
		return new Promise((resolve, reject) => {
			xml.parseString(xmlStr, opt, (e, r) => {
				if (e) {
					reject(e);
				} else if (r) {
					resolve(r);
				}
			})
		})
	}
}