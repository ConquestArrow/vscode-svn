import * as vscode from "vscode"

type SubscribeFn<T> = (ls: (e:T)=>any, thisArg?: any, dispos?: vscode.Disposable[]) => vscode.Disposable;

/**
 * @param  {SubscribeFn<T>} fn
 * @param  {vscode.ExtensionContext} context
 * @param  {any=null} thisArg
 * @return Promise<T>
 */
export function subscribe<T>(
	fn: SubscribeFn<T>,
	context: vscode.ExtensionContext,
	thisArg: any = null
) {
	return new Promise<T>((resolve, reject)=>{
		let d = fn( e => resolve(e) , thisArg, context.subscriptions)
		context.subscriptions.push(d)
	})
}

export function subscribeEvent<T>(
	fn: SubscribeFn<T>,
	callback: (e:T)=>void,
	context:vscode.ExtensionContext,
	thisArg:any = null
){
	let d = fn(callback, thisArg, context.subscriptions);
	context.subscriptions.push(d);
}