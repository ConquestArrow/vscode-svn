import * as child from "child_process"
import * as ui from "./ui";
/**
 * child_process.exec Promise
 * @param  {string} command command with argments string
 * @param  {ProcessChildOption={}} opt
 */
export function getCmdPromise(command:string, opt:ProcessChildOption = {}) {
	console.log(`cmd: ${command}`)
	return new Promise<Buffer>((resolve, reject) => {
		child.exec(
			command,
			opt,
			(e,sOut,sErr)=>{
				if(sOut)resolve(sOut);
				if(e){
					ui.error(e.message);
					reject(sErr)
				}
			}
		)
	})
}

/**
 * child_process.exec option
 */
export interface ProcessChildOption{
	cwd?:string,
	stdio?:any,
	customFds?:any,
	env?:any,
	encoding?:string,
	timeout?:number,
	maxBuffer?:number,
	killSignal?:string
}