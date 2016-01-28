import * as vscode from "vscode";
import * as child from "child_process";

const diffParse = require("diff-parse")

import * as event from "./event";
import * as cmd from "./command";
import * as ui from "./ui";

const w = vscode.window;
const ws = vscode.workspace;
const ae = w.activeTextEditor;
type ExtContext = vscode.ExtensionContext
type VSCodeChageEvent = vscode.TextEditor | vscode.TextDocumentChangeEvent;
type MarkedLine = { add: boolean, del: boolean, contentLength?: number }[];

export class GutterSvn {

	private timeout: number = null;
	private decoType: vscode.TextEditorDecorationType[] = [];

	constructor(
		private context: ExtContext
	) {
		if (!!ae) {
			this.triggerUpdateDecorations(context)
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
	
	

	initEvents(context: ExtContext) {
		
		event.subscribeEvent<VSCodeChageEvent>(
			w.onDidChangeActiveTextEditor,
			this.changeEvent,
			context
		);
		event.subscribeEvent<VSCodeChageEvent>(
			ws.onDidChangeTextDocument,
			this.changeEvent,
			context
		);
		
		event.subscribeEvent<vscode.TextDocument>(
			ws.onDidOpenTextDocument,
			this.fileEvent,
			context
		);
		event.subscribeEvent<vscode.TextDocument>(
			ws.onDidSaveTextDocument,
			this.fileEvent,
			context
		);
		console.log(`event subscribed`)

	}

	private changeEvent<T extends VSCodeChageEvent>(e: T) {
		console.log(`changeEvent called`)
		if (!!ae && e.document === ae.document) {
			console.log(`target is ${e.document.lineCount}`)
			this.triggerUpdateDecorations(this.context);
		}
	}

	private fileEvent<T extends vscode.TextDocument>(e: T) {
		console.log(`fileEvent called`)
		if (!!ae && e === ae.document) {
			console.log(`target is ${e.lineCount}`)
			this.triggerUpdateDecorations(this.context);
		}
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

/*
	wrapGetSvnDiff(context: ExtContext) {
		//return this.getSvnDiff(context)
		this.getSvnDiff(context)
	}
*/

	getSvnDiff(context: ExtContext) {
		console.log(`getSvnDiff()`)
		const tPath = vscode.window.activeTextEditor.document.fileName

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
	}
	
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
			.forEach((file: { lines: { type: string, ln: number, content: string }[] }) => {
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

		const ae = w.activeTextEditor;
		const pos = new vscode.Position(lines, charaNum)

		const end = ae
			.document
			.lineAt(pos)
			.firstNonWhitespaceCharacterIndex;

		const decoRange = new vscode
			.Range(lines, 0, lines, end);
		
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
			//teDeco,
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
		const triBottom = context.asAbsolutePath(`img/tri_bottom.png`)

		let bg: string = "transparent";
		if (!add && del) {
			//console.log(`del line:${lines}`)
			bg = `${bg}; background:transparent url("${triBottom}") top left no-repeat !important`
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