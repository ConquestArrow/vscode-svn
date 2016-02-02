export interface SvnSt{
	status:{
		target:[
			{
				$:SvnPath,
				entry:[
					{
						$:SvnPath,
						"wc-status":[
							{
								$:{
									props:string,
									item:string,
									revision:string
								},
								commit:[
									{
										$:{
											revision: string
										},
										author:string,
										date:string[]
									}
								],
								lock?:any[]
							}
						]
					}
				]
			}
		]
	}
}
export interface SvnPath{
	path:string;
}

export function getStatusIcon(str:string){
	let icon = "";
	switch (str) {
		case "normal":
			//icon = "✅"; break;
			icon = " ✔ "; break;
		case "conflicted":
			icon = "💥"; break;
		case "unversioned":
			icon = "❔"; break;
		case "modified":
			icon = "⚠ "; break;
			//icon = " ✎ "; break;
		case "missing":
			icon = "❗"; break;
		case "added":
			icon = " ✚ "; break;
		case "locked":
			icon = "🔒"; break;
		case "replaced":
			icon = "♻ "; break;
			//icon = "🔄"; break;
		case "deleted":
			icon = "❌"; break;
		case "ignored":
			icon = "🚫"; break;
		case "no-WC":
			icon = "NO-WC"; break;
		default:
			icon = " ⊡ ";
			break;
	}
	return icon;
}

export interface StatusData{
	item:string,
	revision:string,
	isWC:boolean,
	lastCommit?:string,
	author?:string
}

export function parseStatus(data:SvnSt):StatusData{
	const target = data
		.status
		.target[0];
		
	console.log(target)
	
	if(!target.entry){
		//not working copy
		return {
			item: "no-WC",
			revision: "",
			isWC:false
		}
	}else{
		return target.entry[0]["wc-status"]
		.map(v=>{
			return {
				item:!!v.lock ? "locked" : v.$.item,
				revision: !!v.$.revision ? v.$.revision : "",
				isWC:true,
				lastCommit: hasLastCommitData(v) ? v.commit[0].$.revision : "",
				author: hasLastCommitData(v) ? v.commit[0].author : ""
			}
		})[0];
	}
}

function hasLastCommitData(v:{commit:[{$:{revision:string}}]}):boolean{
	return !!v.commit && !!v.commit[0] && !!v.commit[0].$ && !!v.commit[0].$.revision;
}

/*
function genPickUpList(v: { path: string, item: string, prop: string, longpath:string }) {
		let icon = ""
		switch (v.item) {
			case "normal":
				//icon = "✅"; break;
				icon = " ✔ "; break;
			case "conflicted":
				icon = "💥"; break;
			case "unversioned":
				icon = "❔"; break;
			case "modified":
				icon = "⚠ "; break;
				//icon = " ✎ "; break;
			case "missing":
				icon = "❗"; break;
			case "added":
				icon = " ✚ "; break;
			case "locked":
				icon = "🔒"; break;
			case "replaced":
				icon = "♻ "; break;
				//icon = "🔄"; break;
			case "deleted":
				icon = "❌"; break;
			default:
				icon = " ⊡ ";
				break;
		}

		let type = ""
		
		
		if (isDirectory(v.longpath)) {
			type = "📂";
		} else {
			type = "📃";
		}
		
		if(v.prop==="modified"){
			//directory modified
			icon = "⚠ ";
		}


		return {
			label:`${icon}${type} ${v.path}`,
			description: v.prop!="none" ? v.prop : v.item,
		}
	}
*/