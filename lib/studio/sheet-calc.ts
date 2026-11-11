export function columnName(index:number):string { return String.fromCharCode(65+index) }
export function cellValue(cells:string[][],row:number,col:number,seen=new Set<string>(),budget={steps:0}):string|number {
 if(++budget.steps>1000)return "#LIMIT!"
 const raw=cells[row]?.[col]??"";if(!raw.startsWith("="))return raw
 const key=`${row}:${col}`;if(seen.has(key)||seen.size>100)return "#CYCLE!";const path=new Set(seen);path.add(key)
 const read=(ref:string):string|number=>{const m=/^([A-Z])([1-9]\d*)$/.exec(ref);if(!m)throw Error();const value=cellValue(cells,Number(m[2])-1,m[1].charCodeAt(0)-65,path,budget);if(typeof value==="string"&&value.startsWith("#"))throw Error(value);return value}
 const numberOf=(ref:string):number=>{const value=read(ref),n=Number(value);if(!Number.isFinite(n))throw Error();return n}
 try {
  let exp=raw.slice(1).toUpperCase().replace(/\s/g,"")
  exp=exp.replace(/(SUM|AVERAGE|MIN|MAX|COUNT)\(([A-Z][1-9]\d*):([A-Z][1-9]\d*)\)/g,(_,fn,a,b)=>{
   const ca=a.charCodeAt(0)-65,cb=b.charCodeAt(0)-65,ra=Number(a.slice(1))-1,rb=Number(b.slice(1))-1
   if(Math.abs(ra-rb)>100||Math.abs(ca-cb)>25)throw Error()
   const nums:number[]=[];for(let r=Math.min(ra,rb);r<=Math.max(ra,rb);r++)for(let c=Math.min(ca,cb);c<=Math.max(ca,cb);c++){const v=read(columnName(c)+(r+1));if(String(v).trim()!==""&&Number.isFinite(Number(v)))nums.push(Number(v))}
   const sum=nums.reduce((a,b)=>a+b,0);if(fn==="AVERAGE"&&!nums.length)throw Error();return String(fn==="SUM"?sum:fn==="AVERAGE"?sum/nums.length:fn==="MIN"?(nums.length?Math.min(...nums):0):fn==="MAX"?(nums.length?Math.max(...nums):0):nums.length)
  }).replace(/[A-Z][1-9]\d*/g,(ref)=>String(numberOf(ref)))
  const tokens=exp.match(/\d*\.?\d+(?:E[+-]?\d+)?|[()+*/-]/g);if(!tokens||tokens.join("")!==exp)throw Error();let i=0
  const atom=():number=>{const t=tokens[i++];if(t==="+")return atom();if(t==="-")return -atom();if(t==="("){const n=expression();if(tokens[i++]!==")")throw Error();return n}const n=Number(t);if(!Number.isFinite(n))throw Error();return n}
  const product=():number=>{let n=atom();while(tokens[i]==="*"||tokens[i]==="/"){const op=tokens[i++],v=atom();if(op==="/"&&v===0)throw Error();n=op==="*"?n*v:n/v}return n}
  const expression=():number=>{let n=product();while(tokens[i]==="+"||tokens[i]==="-"){const op=tokens[i++],v=product();n=op==="+"?n+v:n-v}return n}
  const result=expression();if(i!==tokens.length||!Number.isFinite(result))throw Error();return Math.round(result*1e8)/1e8
 }catch(error){return error instanceof Error&&["#CYCLE!","#LIMIT!"].includes(error.message)?error.message:"#VALUE!"}
}
export function sheetCsv(cells:string[][]) {
 return "\ufeff"+cells.map((row,r)=>row.map((_,c)=>{
  const value=String(cellValue(cells,r,c));const safe=/^[=+@-]/.test(value)&&!/^[-+]?\d+(\.\d+)?$/.test(value)?"'"+value:value
  return '"'+safe.replace(/"/g,'""')+'"'
 }).join(",")).join("\r\n")
}
