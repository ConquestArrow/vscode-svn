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
		
		if (!!ae) {
			//this.triggerUpdateDecorations(context)
			this.updateDecorations();
		}
		
		
		//on change active texteditor
		//TODO: replaced to callback style
		/*
		let a = Promise
			.race<vscode.TextEditor | vscode.TextDocumentChangeEvent>([
				event.subscribe<vscode.TextEditor>(
					w.onDidChangeActiveTextEditor,
					context
				),
				event.subscribe<vscode.TextDocumentChangeEvent>(
					ws.onDidChangeTextDocument,
					context
				),
			])
			.then(res => {
				if (!!ae && res.document === ae.document) {
					this.triggerUpdateDecorations(this.context)
				}
			}, e => console.error(e))
			.catch( e => console.error(e))

		let b = Promise
			.race([
				event.subscribe<vscode.TextDocument>(
					ws.onDidOpenTextDocument,
					context
				),
				event.subscribe<vscode.TextDocument>(
					ws.onDidSaveTextDocument,
					context
				),
			])
			.then(res => {
				if (!!ae && res === ae.document) {
					this.triggerUpdateDecorations(this.context)
				}
			}, e => console.error(e))
			.catch( e => console.error(e))
		
		//return Promise.race([a,b])
		*/
		
		this.initEvents(context);
	}
	
	initProps(){
		this.triBottom = this.context.asAbsolutePath(`img/tri_bottom.png`);
		this.headText = this.getSvnHead();
		
		this.decoType[DecoType.MODIFIED] = this.createDecoTypes(DecoType.MODIFIED);
		this.decoType[DecoType.ADDED] = this.createDecoTypes(DecoType.ADDED);
		this.decoType[DecoType.DELETED] = this.createDecoTypes(DecoType.DELETED);
	}
	

	initEvents(context: ExtContext) {
		
		
		/* */
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
		//*/
		
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
		if (!!ae) {
			console.log(`c target is ${e.document.lineCount}`);
			//this.triggerUpdateDecorations(this.context);
			this.headText = this.getSvnHead();
			this.updateDecorations();
		}
		
	}

	//*
	private changeEvent<T extends VSCodeChangeEvent>(e: T) {
		console.log(`changeEvent called`)
		if (!!ae && e.document === ae.document) {
			console.log(`c target is ${e.document.lineCount}`);
			//this.triggerUpdateDecorations(this.context);
			
			this.updateDecorations();
		}
	}
	/**/

	private fileEvent<T extends vscode.TextDocument>(e: T) {
		console.log(`fileEvent called`)
		if (!!ae && e === ae.document) {
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


	triggerUpdateDecorations(context: ExtContext) {
		/*
		console.log(`triggerUpdateDecorations()`)
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		//this.timeout = setTimeout(this.wrapGetSvnDiff(context), 500);
		var gutter = this;
		this.timeout = setTimeout(function(){
			console.log("settimeout call")
			gutter.getSvnDiff(context);
		}, 100)
		*/
		console.log(`triggerUpdateDecorations()`)
		
		this.getSvnDiff(context)
			/*
			.then(result=>{
				console.log(`result:${result}`)
				this.parseAll(result)
				//return this.parse(result);
			})
			/*
			.then(result=>{
				
			})
			*/
			//.catch(e => ui.error(e))
			//*/
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
			console.log(`svn cat error ${e}`)
			out = ae.document.getText();
		}
		
		
		
		return out.toString();
	}
	
	compareText(
		head:string = this.headText,
		current:string = ae.document.getText()
	):IParsedDiff{
		//const s = 
		// JsDiff.diffLines(head, current, {newlineIsToken: true});
		//console.log(s);
		const s = JsDiff.createPatch("difffile", head, current, "old","new");
		//JsDiff.parsePatch(diffStr)
		//JSON.stringify
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
		
		//console.log(lns)
		
		
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
				bg = `${bg}; background:transparent url("${this.triBottom}") top left no-repeat !important`
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
	
	///////older methods

	getSvnDiff(context: ExtContext) {
		console.log(`getSvnDiff()`)
		const tPath = ae.document.fileName
		
		
		

		if (!tPath || tPath === "/1") return;
		else { console.info(tPath) }

		/*
		return cmd.getCmdPromise(
			`svn diff "${tPath}"`,
			{ maxBuffer: 10000000, cwd: ws.rootPath }
		)
		*/
		/*
			.then(
			result => {
				this.parseAll(result);
			}
			)
			.catch(e => ui.error(e))
		*/
		//const tPaths = tPath.split("/");
		const txt = ae.document.getText();
		/*const tmpPath = `${tPath}.tmp`;
		fs.writeFileSync(
			tmpPath,
			txt
		)*/
		
		/** */
		child.exec(
			`svn diff "${tPath}"`,
			{
				maxBuffer: 1000000
			},
			(err, stdout, stderr) => {
				if(err) throw Error(stderr.toString());
				
				
				this.parseAll(stdout)
			}
		)//*/
	}
	
	/*
	parse(stdout:Buffer):MarkedLine[]{
		return diffParse(stdout)
		.map((file:{
			lines: {
				type: string,
				ln: number, 
				content: string 
			}[]
		})=>{
			let markLine: MarkedLine = []
			
			file.lines
				.filter(v => v.type === "add" || v.type === "del")
				.forEach((v) => {
					//console.log(v)
					//if (v.type === "add" || v.type === "del") {
					//showAddedLine(v.ln, v.content.length)
					//console.log(v)
					if (!markLine[v.ln]) markLine[v.ln] = { add: false, del: false }
					markLine[v.ln][v.type] = true;
					markLine[v.ln].contentLength = v.content.length;
					//}

				});
			
			return markLine;
		})
	}*/
	
	/*
	mark(markLine:MarkedLine[]){
		(<any>console).time("markLine")
		const ctx = this.context;
		const l = markLine.lines.length | 0;
		for (let i = 0 | 0; (i | 0) < (l | 0); i++) {
			var v = markLine[i];
			if (!v) continue;
			this.showDiffLine(
				i - 1,
				v.contentLength,
				v.add,
				v.del,
				ctx
			)
		}
		(<any>console).timeEnd("markLine")
	}
	*/

	parseAll(stdout: Buffer) {
		console.log("parseAll()")
		diffParse(stdout)
			.forEach((file: IParsedDiff) => {
				let markLine: { add: boolean, del: boolean, contentLength?: number }[] = []
			
				//console.log(`get buffer`)
				//markLine.fill({add:false,del:false})
				file.lines
					.filter(v => v.type === "add" || v.type === "del")
					.forEach((v) => {
						//console.log(v)
						//if (v.type === "add" || v.type === "del") {
						//showAddedLine(v.ln, v.content.length)
						//console.log(v)
						if (!markLine[v.ln]) markLine[v.ln] = { add: false, del: false }
						markLine[v.ln][v.type] = true;
						markLine[v.ln].contentLength = v.content.length;
						//}

					});

				//console.log(`show diff lines`);
				(<any>console).time("markLine")
				/*
				markLine
					.forEach((v, i, a) => {
						if (!v) return;
						this.showDiffLine(i - 1, v.contentLength, v.add, v.del, this.context)
					});
				*/
				const ctx = this.context;
				const l = file.lines.length | 0;
				for (let i = 0 | 0; (i | 0) < (l | 0); i++) {
					var v = markLine[i];
					if (!v) continue;
					this.showDiffLine(
						i - 1,
						v.contentLength,
						v.add,
						v.del,
						ctx
					)
				}
				(<any>console).timeEnd("markLine")

			})
		//let o = (<any>diff).parsePatch(stdout)
		//console.log(o)
	}


	showDiffLine(
		lines: number,
		charaNum: number,
		add: boolean,
		del: boolean,
		context: ExtContext
	) {
		const pos = new vscode.Position(lines, charaNum)

		const end = ae
			.document
			.lineAt(pos)
			.firstNonWhitespaceCharacterIndex;

		const decoRange = new vscode
			.Range(lines, 0, lines, end);
		
		//this.ranges[lines] = decoRange;
		/*	
		console.log(
			`ae:${ae.document.fileName}`,
			`pos: ${pos.line}`,
			`end: ${end.toString()}`,
			`decoRange: ${decoRange}`
		)*/
		
		/*
		if(this.decoType[lines]){
			this.decoType[lines].dispose();
		}*/

		this.createDeco(lines, charaNum, add, del, context);
		
		//ae.setDecorations()
		ae.setDecorations(
			this.decoType[lines],
			[decoRange]
		);
	}

	private createDeco(
		lines: number,
		charaNum: number,
		add: boolean,
		del: boolean,
		context: ExtContext
	) {
		//console.log("create deco")
		let col: string = ""
		let leftWidth: number = 2;
		let wholeLine: boolean = true;
		if (add && del) {
			//modifiled line
			col = "#080"	//light green
		} else if (add && !del) {
			//added line
			col = "#88f"	//light blue
		} else if (!add && del) {
			//deleted line
			col = "transparent"
			leftWidth = 0
			wholeLine = false;
		}

		//const triTop = context.asAbsolutePath(`img/tri_top.png`)
		

		let bg: string = "transparent";
		if (!add && del) {
			//console.log(`del line:${lines}`)
			bg = `${bg}; background:transparent url("${this.triBottom}") top left no-repeat !important`
			//console.log(`bgColor: ${bg}`)
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
		
		/*
		if(this.decoType[lines]){
			this.decoType[lines].dispose();
		}*/
		if (!this.decoType[lines])
			this.decoType[lines] = null;

		this.decoType[lines] = w
			.createTextEditorDecorationType(
			deco
			);
	}
}