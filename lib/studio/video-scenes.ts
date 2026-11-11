export type VideoConfig={title:string;subtitle:string;accent:string;paper:string;ink:string;duration:number;portrait:boolean}
/** Shared by the editor, recorder and gallery: a preview is the composition being edited. */
export function paintVideo(canvas:HTMLCanvasElement,cfg:VideoConfig,progress:number,variant:number) {
 const ctx=canvas.getContext("2d");if(!ctx)return
 const W=1000,H=canvas.height/canvas.width*1000,p=Math.max(0,Math.min(1,progress)),enter=1-Math.pow(1-Math.min(1,p*4),3),pulse=Math.sin(p*Math.PI*2),{accent:a,paper:bg,ink:k}=cfg
 ctx.save();ctx.scale(canvas.width/1000,canvas.width/1000)
 const R=(x:number,y:number,w:number,h:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
 const C=(x:number,y:number,r:number,color:string)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
 const T=(value:string,x:number,y:number,w:number,size:number,color=k,serif=false,maxH=H*.3,align:CanvasTextAlign="left")=>{
  let fs=size,lines:string[]=[]
  const wrap=()=>{ctx.font=`${serif?"600":"700"} ${fs}px ${serif?"Georgia":"Arial"}`;lines=[];for(const paragraph of value.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w&&line){lines.push(line);line=word}else line=next}lines.push(line)}}
  wrap();while(lines.length*fs*1.15>maxH&&fs>16){fs-=2;wrap()}
  ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="top";lines.forEach((s,i)=>ctx.fillText(s,align==="center"?x+w/2:align==="right"?x+w:x,y+i*fs*1.15,w))
 }
 const title=(x=60,y=H*.25,w=880,fs=88,color=k,maxH=H*.43)=>T(cfg.title,x+(1-enter)*35,y,w,fs,color,true,maxH)
 const sub=(y=H*.8,x=60,w=880,color=k)=>T(cfg.subtitle,x,y,w,28,color,false,H*.12)
 const label=(value="BLOOM / MOTION STUDIO",color=a)=>T(value,60,40,880,17,color,false,50)
 R(0,0,W,H,bg);ctx.globalAlpha=Math.min(1,p*8,(1-p)*12)
 switch(variant){
  case 0: C(900,H*.3,155+pulse*8,a);C(900,H*.3,110,bg);label();title(60,H*.3,650,98);R(60,H*.73,880*enter,5,a);sub(H*.82);break
  case 1: R(600,0,400,H,a);R(665,H*.19,255,H*.6,k);R(690,H*.24,205,H*.5,bg);C(790,H*.45,80,a);label("NEW PRODUCT / 01");title(60,H*.25,500,86);sub(H*.8,60,490);break
  case 2: C(500,H*.4,Math.min(205,H*.27),a);T(String(Math.max(1,Math.ceil(cfg.duration*(1-p)))),200,H*.25,600,Math.min(200,H*.24),bg,false,H*.3,"center");T(cfg.title,60,H*.73,880,50,k,true,H*.18,"center");label("READY / SET / GO");break
  case 3: T("“",45,H*.07,400,230,a,true,H*.4);title(135,H*.36,780,85,k,H*.38);sub(H*.85,135,780,a);break
  case 4: R(55,H*.12,890,H*.76,k);T("YOU ARE INVITED",90,H*.17,820,21,bg);title(90,H*.3,820,85,bg,H*.32);R(90,H*.7,820,2,bg);T("24 NOV / 09:00",90,H*.76,400,30,bg);C(55,H*.69,22,bg);C(945,H*.69,22,bg);break
  case 5: R(0,0,330,H,k);T("B.",55,H*.25,260,170,bg,true,H*.4);T("BRAND STORY",55,H*.8,260,20,bg);title(385,H*.25,560,85);sub(H*.78,385,555,a);break
  case 6: R(0,0,W,H,a);T("SALE",55,H*.12,900,180,bg,false,H*.33);R(55,H*.51,890,H*.28,bg);T(cfg.title,85,H*.55,830,55,a,false,H*.18);sub(H*.87,55,890,bg);break
  case 7: label("WEEKLY RECAP");title(60,H*.14,880,62,k,H*.22);["HỌC","LÀM","CHIA SẺ"].forEach((s,i)=>{R(60+i*303,H*.47-(i===1?enter*16:0),275,H*.34,i===1?a:"#ffffff");T(`0${i+1}`,80+i*303,H*.5,235,60,i===1?bg:a);T(s,80+i*303,H*.7,235,22,i===1?bg:k)});break
  case 8: R(0,0,20,H,a);label("A QUICK STUDY TIP");title(65,H*.15,870,74,k,H*.28);["ĐỌC","THỬ","NHỚ"].forEach((s,i)=>{const x=65+i*305;C(x+25,H*.59,25,a);T("✓",x+7,H*.56,50,32,bg);T(s,x,H*.73,260,27,k)});break
  case 9: R(95,H*.08,810,H*.84,"#ffffff");T("DEAR YOU,",140,H*.17,720,20,a);title(140,H*.32,720,97,k,H*.36);sub(H*.76,140,720,a);break
  case 10: R(35,35,930,H-70,a);R(42,42,916,H-84,bg);T("CLASS OF 2026",60,H*.15,880,39,a,true,H*.12,"center");T(cfg.title,120,H*.36,760,95,k,true,H*.32,"center");R(380,H*.78,240,3,a);break
  case 11: R(0,0,W,H,k);T("LIVE / ON AIR",60,H*.09,880,21,bg);title(60,H*.22,580,78,bg,H*.42);R(700,H*.2,240,H*.57,a);T("24",725,H*.27,190,95,bg,true,H*.2,"center");T("THÁNG 11\n20:00",725,H*.56,190,25,bg,false,H*.2,"center");break
  case 12: R(45,45,910,H-90,k);T("LESSON / 01",85,H*.13,830,20,bg);title(85,H*.27,590,80,bg,H*.38);for(let i=0;i<3;i++){R(735,H*.3+i*H*.12,130*(.65+i*.15)*enter,16,a)}T(cfg.subtitle,85,H*.78,800,25,bg,false,H*.1);break
  case 13: C(280,H*.48,Math.min(210,H*.34),k);C(280,H*.48,Math.min(115,H*.18),a);C(280,H*.48,15,bg);title(555,H*.24,390,65,k,H*.45);T("NEW EPISODE",555,H*.8,390,21,a);for(let i=0;i<8;i++)R(555+i*40,H*.69,10,(i%3+1)*13+Math.abs(pulse)*15,a);break
  case 14: label("COLLECTION / NEW ARRIVALS");title(60,H*.15,880,68,k,H*.22);R(60,H*.44,415,H*.38,a);R(505,H*.44,415,H*.38,k);C(265,H*.63,70+enter*8,bg);R(650,H*.52,120,H*.22,bg);break
  case 15: title(60,H*.12,850,98,k,H*.38);for(let i=0;i<5;i++)R(60+i*185,H*.84-i*H*.05,165,H*.08+i*H*.05,a);break
  case 16: [0,1,2].forEach(i=>{R(-40+i*25,H*(.12+i*.25),1080,H*.17,i===1?k:a);T(i===1?cfg.title:"LET'S MAKE IT HAPPEN",55+Math.sin(p*3+i)*20,H*(.15+i*.25),890,i===1?49:34,bg,false,H*.14)});break
  case 17: label("A NEW CHAPTER");T("11",55,H*.13,530,200,a,true,H*.4);title(600,H*.25,350,62,k,H*.4);[0,1,2,3,4,5,6].forEach(i=>R(65+i*130,H*.73,110,H*.14,i===3?a:"#ffffff"));sub(H*.9,65,890);break
  case 18: R(0,0,400,H,a);C(200,H*.39,130,bg);C(200,H*.33,50,k);R(115,H*.42,170,H*.15,k);T("SPEAKER / 01",50,H*.8,300,20,bg);title(455,H*.25,490,80);sub(H*.77,455,490,a);break
  case 19: for(let i=0;i<4;i++){ctx.beginPath();ctx.strokeStyle=a;ctx.lineWidth=2;ctx.arc(500,H*.5,100+i*70+pulse*10,0,Math.PI*2);ctx.stroke()}R(90,H*.28,820,H*.43,bg);T(cfg.title,100,H*.35,800,85,k,true,H*.3,"center");T(cfg.subtitle,100,H*.81,800,28,a,false,H*.12,"center");break
 }
 ctx.restore()
}
