import * as vscode from "vscode";
import * as child from "child_process";
import * as fs from "fs";
import * as JsDiff from "diff";

const diffParse = require("diff-parse")


import * as event from "./event";
import * as cmd from "./command";
import * as ui from "./ui";

const w = vscode.window;
const ws = vscode.workspace;
let ae = w.activeTextEditor;

type ExtContext = vscode.ExtensionContext
type VSCodeChangeEvent = vscode.TextEditor | vscode.TextDocumentChangeEvent;
type MarkedLine = { add: boolean, del: boolean, contentLength?: number }[];

type ClassifiedLine = {
	decoType:DecoType;
	value:string;
	lineNumber:number;
}

interface IParsedDiff{
	lines: DiffLine[];
}
interface DiffLine{
	type: string,
	ln: number, 
	content: string 
}
interface TempLine{
	ln:number,
	added?:boolean,
	removed?:boolean,
	content:string
}

enum DecoType{
	MODIFIED,
	ADDED,
	DELETED
}

interface IDiffResult extends JsDiff.IDiffResult{
	count:number;
}


export class GutterSvn {
	
	

	private timeout: number = null;
	private decoType: vscode.TextEditorDecorationType[] = [];
	private ranges: vscode.Range[] = [];
	private triBottom:string;
	
	private headText:string;

	constructor(
		private context: ExtContext
	) {
		
		this.initProps();
		
		if (!!ae && !/^\/[1-3]$/.test(ae.document.fileName)) {
			this.updateDecorations();
		}
		
		this.initEvents(context);
	}
	
	initProps(){
		ae = w.activeTextEditor;
		
		this.triBottom = this.context.asAbsolutePath(`img/tri_bottom.png`);
		if(!!ae && !/^\/[1-3]$/.test(ae.document.fileName)){
			this.headText = this.getSvnHead();
		}
		
		this.decoType[DecoType.MODIFIED] = this.createDecoTypes(DecoType.MODIFIED);
		this.decoType[DecoType.ADDED] = this.createDecoTypes(DecoType.ADDED);
		this.decoType[DecoType.DELETED] = this.createDecoTypes(DecoType.DELETED);
	}
	

	initEvents(context: ExtContext) {
		event.subscribeEvent<VSCodeChangeEvent>(
			w.onDidChangeActiveTextEditor,
			this.changeEditorFocusEvent.bind(this),
			context
		);
		event.subscribeEvent<VSCodeChangeEvent>(
			ws.onDidChangeTextDocument,
			this.changeEvent.bind(this),
			context
		);
		
		event.subscribeEvent<vscode.TextDocument>(
			ws.onDidOpenTextDocument,
			this.fileEvent.bind(this),
			context
		);
		event.subscribeEvent<vscode.TextDocument>(
			ws.onDidSaveTextDocument,
			this.fileEvent.bind(this),
			context
		);
		console.log(`event subscribed`)

	}
	
	private changeEditorFocusEvent<T extends VSCodeChangeEvent>(e:T){
		console.log(`changeEditorEvent called`)
		ae = w.activeTextEditor;
		if (!!ae && !/^\/[1-3]$/.test(ae.document.fileName)) {
			console.log(`c target is ${e.document.lineCount}`);
			//this.triggerUpdateDecorations(this.context);
			this.headText = this.getSvnHead();
			this.updateDecorations();
		}
		
	}

	private changeEvent<T extends VSCodeChangeEvent>(e: T) {
		console.log(`changeEvent called`)
		if (!!ae && e.document === ae.document && !/^\/[1-3]$/.test(ae.document.fileName)) {
			console.log(`c target is ${e.document.lineCount}`);
			//this.triggerUpdateDecorations(this.context);
			
			this.updateDecorations();
		}
	}

	private fileEvent<T extends vscode.TextDocument>(e: T) {
		console.log(`fileEvent called`)
		if (!!ae && e === ae.document && !/^\/[1-3]$/.test(ae.document.fileName)) {
			this.headText = this.getSvnHead();
			console.log(`f target is ${e.lineCount}`)
			//this.triggerUpdateDecorations(this.context);
			this.updateDecorations();
		}
	}
	
	updateDecorations(){
		const time = (<any>console).time;
		const timeEnd = (<any>console).timeEnd;
		time("new_marked_total");
		
		time("compare");
		let lines = this.compareText(this.headText, ae.document.getText())
		timeEnd("compare");
		
		time("classify");
		let clines = this.createTempLines(lines)
			.map(v => this.classifyLine(v))
		timeEnd("classify");
		
		time("deco");
		const ranges = this.decoType
			.map((v,i)=>{
				return this.getRangesByDecoType(clines, i)
			})
			.forEach((v,i)=>{
				ae.setDecorations(
					this.decoType[i],
					v
				);
			});
		timeEnd("deco");
		timeEnd("new_marked_total");
	}

	getSvnHead():string{
		
		var out:Buffer|string;
		
		try {
			out = child.execSync(
				`svn cat -r HEAD "${ae.document.fileName}"`,
				{
					cwd: ws.rootPath,
					maxBuffer: 10000000
				}
			)
		} catch (e) {
			console.log(e)
			out = ae.document.getText();
		}
		
		
		
		return out.toString();
	}
	
	compareText(
		head:string = this.headText,
		current:string = ae.document.getText()
	):IParsedDiff{
		const s = JsDiff.createPatch("difffile", head, current, "old","new");
		return diffParse(s)[0];
	}
	
	createTempLines(parsedDiff:IParsedDiff){
		let lns:{ln:number,added?:boolean,removed?:boolean,content:string}[] = [];
		
		parsedDiff.lines
			.filter(v => v.type === "add" || v.type === "del")
			.forEach(v =>{
				
				let isAdded:boolean;
				let isRemoved:boolean;
				
				switch(v.type){
					case "add":
						isAdded = true;
						break;
					case "del":
						isRemoved = true;
						break;
				}
				try{
					let t = lns[v.ln];
					
					if(!t) t = null;
					lns[v.ln] = {
						ln:v.ln,
						added: !t || !t.added ? isAdded : t.added,
						removed: !t || !t.removed ? isRemoved : t.removed,
						content: v.content
					}
				}catch(e){
					console.log(e);
					Promise.reject(e);
				}
			})
		return lns.filter(v=> !!v);
	}
	
	classifyLine(line:TempLine):ClassifiedLine{
		let decoType:DecoType;
		
		if(!!line.added && !!line.removed){
			decoType = DecoType.MODIFIED;
		}
		else if(!!line.added && !line.removed){
			decoType = DecoType.ADDED;
		}
		else if(!line.added && !!line.removed){
			decoType = DecoType.DELETED;
		}
		
		return {
			value:line.content,
			lineNumber: line.ln,
			decoType
		}
	}
	
	getRangesByDecoType(lines:ClassifiedLine[], decoType:DecoType):vscode.Range[]{
		return lines
			.map((v) =>{
				if(v.decoType === decoType){
					let ln = v.lineNumber - 1;
					return new vscode.Range(ln,0,ln,1);
				}else{
					return null;
				}
			})
			.filter(v => v !== null);
	}
	
	
	
	createDecoTypes(decoType:DecoType){
		let col: string = ""
		let leftWidth: number = 2;
		let wholeLine: boolean = true;
		let bg: string = "transparent";
		
		switch(decoType){
			case DecoType.MODIFIED:
				col = "#080"	//light green
				break;
			case DecoType.ADDED:
				col = "#88f"	//light blue
				break;
			case DecoType.DELETED:
				col = "transparent"
				leftWidth = 0
				wholeLine = false;
				bg = `${bg}; background:transparent url("${this.triBottom}") 0 0 no-repeat border-box !important`
				break;
		}
		
		const deco: vscode.DecorationRenderOptions = {
			isWholeLine: wholeLine,
			overviewRulerLane: vscode.OverviewRulerLane.Left,
			dark: {
				overviewRulerColor: col,
				borderWidth: `0px 0px 0px ${leftWidth}px`,
				borderStyle: "solid",
				borderColor: col,
				backgroundColor: `${bg}`,
			}
		}
		
		return w.createTextEditorDecorationType(deco);
	}
}