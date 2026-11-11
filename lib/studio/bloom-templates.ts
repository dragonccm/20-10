import { blank, shape, text, type Design, type El } from "./design"
import { uid } from "./storage"
import type { StudioCategory } from "./design-formats"

export type BloomTemplate = { id: string; name: string; category: StudioCategory; caption: string; style: number; accent: string; paper: string; ink: string; w: number; h: number; title: string; subtitle: string }
const PALETTES = [
 ["#5750b5","#f3f0ff","#25213e"], ["#a33c45","#fbf1e7","#392327"], ["#176a59","#eef5ec","#213b32"], ["#2669ad","#eff5fc","#173554"],
 ["#ba5426","#fff4e9","#412b22"], ["#9a4e83","#fbf0f7","#382239"], ["#b78e33","#f8f5e9","#383221"], ["#257e88","#eaf8f7","#183c40"],
 ["#5c647c","#f1f3f8","#242b3f"], ["#a04b3b","#f7eee6","#3e2c29"],
]
const names: Record<"social"|"print"|"photos"|"whiteboard"|"presentations",string[]> = {
 social:["Ra mắt sản phẩm","Story cuối tuần","Trích dẫn mỗi ngày","Workshop sáng tạo","Ưu đãi mùa mới","Podcast tuần này","Bìa cộng đồng","Thông báo tuyển thành viên","Từ vựng hôm nay","Lịch sự kiện","Carousel kiến thức","Thumbnail học cùng tôi","Lời cảm ơn","Chào tháng mới","Giới thiệu đội ngũ","Review một cuốn sách","Mẹo học tập","Lời mời giao lưu","Bản tin thương hiệu","Một cột mốc mới"],
 print:["Poster triển lãm","Thiệp sinh nhật","Chứng nhận hoàn thành","Thực đơn cà phê","Tờ rơi workshop","Danh thiếp tối giản","Thiệp cảm ơn","Thư mời sự kiện","Lịch tuần A4","Poster nghiên cứu","Phiếu ưu đãi","Bìa sổ tay","Bảng giá dịch vụ","Thẻ tên hội nghị","Thiệp chúc mừng","Thông báo thư viện","Menu tiệc","Tờ thông tin khóa học","Bookmark đọc sách","Bản tin câu lạc bộ"],
 photos:["Nhật ký bốn mùa","Ảnh bìa tạp chí","Bộ ba khoảnh khắc","Polaroid kỷ niệm","Album cuối tuần","Chân dung nghệ thuật","Travel journal","Khung ảnh sinh nhật","Hai nửa câu chuyện","Moodboard xô thơm","Một ngày ở Seoul","Collage sáu ảnh","Khoảnh khắc tốt nghiệp","Ảnh đại diện tối giản","Nhật ký cà phê","Portfolio nhiếp ảnh","Before & after","Kỷ niệm gia đình","Một chuyến đi xa","Trang lưu bút"],
 whiteboard:["Bản đồ ý tưởng","Kế hoạch dự án","Hành trình người dùng","Bảng SWOT","Mục tiêu quý","Kanban cá nhân","Sơ đồ bài học","Brainstorm nhóm","Ma trận ưu tiên","Kế hoạch sự kiện","Bản đồ đồng cảm","Lộ trình 90 ngày","Retrospective","Phân tích nguyên nhân","So sánh phương án","Sơ đồ câu chuyện","Kế hoạch nội dung","Nghiên cứu người dùng","Bảng quyết định","Tổng kết học kỳ"],
 presentations:["Báo cáo học thuật","Giới thiệu dự án","Hồ sơ sáng tạo","Đề xuất kinh doanh","Câu chuyện thương hiệu","Bài giảng ngoại ngữ","Kết quả khảo sát","Chiến lược nội dung","Bảo vệ khóa luận","Hành trình văn hóa","Pitch sản phẩm","Workshop kỹ năng","Báo cáo tháng","Tổng kết sự kiện","Nghiên cứu trường hợp","Lộ trình phát triển","Giới thiệu đội ngũ","Phân tích thị trường","Kế hoạch học tập","Cảm hứng sáng tạo"],
}
export const BLOOM_TEMPLATES: BloomTemplate[] = Object.entries(names).flatMap(([category,list]) => list.map((name,i) => {
 const [accent,paper,ink]=PALETTES[i%10];const w=category==="presentations"?1920:category==="whiteboard"?2400:category==="print"?1240:1080
 const h=category==="presentations"?1080:category==="whiteboard"?1500:category==="print"?(i===5?710:i===18?2300:1754):category==="social"?(i===1?1920:i===6?608:i===11?608:1350):1080
 return { id:`bloom-${category}-${String(i+1).padStart(2,"0")}`,name,category:category as StudioCategory,caption:["Editorial","Hình học","Tối giản","Tạp chí","Màu tương phản"][i%5],style:i%5,accent,paper,ink,w,h,title:name,subtitle:category==="social"?"Ý tưởng của bạn xứng đáng được chia sẻ.":"Một khởi đầu để bạn kể câu chuyện của mình." }
}))
const id = () => uid()
export function buildBloomDesign(meta: BloomTemplate, page=0): Design {
 const {w,h,accent,paper,ink,style}=meta;const templateIndex=Number(meta.id.split("-").at(-1))-1;const s=w/1080;const els:El[]=[]
 const r=(x:number,y:number,width:number,height:number,fill:string,extra:Partial<El>={})=>els.push(shape("rect",{x:x*s,y:y*s,w:width*s,h:height*s,fill,radius:0,...extra}))
 const c=(x:number,y:number,size:number,fill:string,opacity=1)=>els.push(shape("circle",{x:x*s,y:y*s,w:size*s,h:size*s,fill,opacity}))
 const t=(value:string,x:number,y:number,width:number,fs:number,color=ink,extra:Partial<El>={})=>els.push(text({x:x*s,y:y*s,w:width*s,h:Math.max(fs*1.3,value.split("\n").length*fs*1.25)*s,text:value,fontSize:fs*s,color,weight:400,lineHeight:1.15,...extra}))
 const H=h/s;const compact=H<850;const label=meta.category==="print"?"BLOOM / PRINT STUDIO":meta.category==="presentations"?"BLOOM / PRESENTATION":"BLOOM / CREATIVE STUDIO"
 if(meta.category==="print" && [2,3,5,8,12,16,18].includes(templateIndex)) {
   t("BLOOM / PRINT COLLECTION",70,55,940,18,accent,{letterSpacing:2*s})
   if(templateIndex===2) {
     r(45,115,990,H-170,accent);r(52,122,976,H-184,paper);t("CHỨNG NHẬN",120,240,840,84,ink,{font:"serif",align:"center",weight:700});t("HOÀN THÀNH CHƯƠNG TRÌNH",120,365,840,25,accent,{align:"center"});t("Họ tên người nhận",120,520,840,62,ink,{font:"serif",align:"center"});t("Đã tham gia và hoàn thành\nTên khóa học / chương trình",150,650,780,30,ink,{align:"center"});r(160,H-250,300,2,accent);r(620,H-250,300,2,accent);t("Ngày cấp",160,H-220,300,22,accent);t("Đại diện đơn vị",620,H-220,300,22,accent)
   } else if([3,12,16].includes(templateIndex)) {
     t(templateIndex===12?"Bảng giá dịch vụ":"Một chút ngon lành",70,150,930,76,ink,{font:"serif",weight:700});t("Chọn điều bạn yêu thích",70,280,930,28,accent)
     const items=templateIndex===12?["Tư vấn sáng tạo","Thiết kế cơ bản","Bộ nhận diện","Nội dung thương hiệu","Gói đồng hành"]:["Cà phê sữa","Trà trái cây","Matcha latte","Bánh trong ngày","Combo buổi sáng"]
     items.forEach((name,i)=>{t(name,80,405+i*155,700,38);t(["35.000","42.000","48.000","45.000","65.000"][i],810,410+i*155,200,28,accent,{align:"right"});r(80,485+i*155,920,1,accent,{opacity:.2})});t("Thay tên món, giá và thông tin liên hệ của bạn.",80,H-95,920,22,accent)
   } else if(templateIndex===8) {
     t("Tuần của tôi",70,140,920,78,ink,{font:"serif"});t("Từ ngày ______ đến ngày ______",70,255,920,25,accent)
     for(let i=0;i<7;i++){r(70,360+i*145,930,125,"#ffffff");t(["THỨ HAI","THỨ BA","THỨ TƯ","THỨ NĂM","THỨ SÁU","THỨ BẢY","CHỦ NHẬT"][i],95,385+i*145,850,23,accent);r(95,455+i*145,870,1,accent,{opacity:.18})}
   } else if(templateIndex===5) {
     r(0,0,360,H,accent);t("B.",60,H/2-90,280,150,"#ffffff",{font:"serif",weight:700});t("Họ tên của bạn",430,100,590,65,ink,{font:"serif"});t("Chức danh / Chuyên môn",435,205,570,27,accent);t("hello@example.com\n(+84) 000 000 000\nĐịa chỉ / Website của bạn",435,325,570,25)
   } else {
     r(70,145,930,H-290,accent);t("Một trang sách.\nMột thế giới mới.",130,270,820,100,"#ffffff",{font:"serif"});t("GHI LẠI ĐIỀU BẠN YÊU THÍCH",130,H-230,820,27,"#ffffff")
   }
 } else if(meta.category==="photos") {
   const count=[4,1,3,2,6][style];const cols=count===1?1:count===3?3:2;const rows=Math.ceil(count/cols);const gap=18;const aw=940;const ah=H-280
   for(let i=0;i<count;i++) {
     const fw=(aw-gap*(cols-1))/cols,fh=(ah-gap*(rows-1))/rows
     const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="${paper}"/><circle cx="570" cy="220" r="85" fill="${accent}" opacity=".3"/><path d="M0 800 300 360 490 620 650 440 800 800" fill="${accent}" opacity=".45"/><text x="400" y="720" font-family="Arial" font-size="26" text-anchor="middle" fill="${ink}">THAY BẰNG ẢNH CỦA BẠN</text></svg>`
     els.push({id:id(),type:"image",x:(70+(i%cols)*(fw+gap))*s,y:(190+Math.floor(i/cols)*(fh+gap))*s,w:fw*s,h:fh*s,opacity:1,src:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,nw:800,nh:800})
   }
   t(meta.name,70,55,900,60,ink,{font:"serif",weight:700});t("STORIES WORTH KEEPING",70,H-60,900,20,accent)
 } else if(meta.category==="whiteboard") {
   t(meta.name,65,45,960,48,ink,{weight:700});t("Kéo từng khối để sắp xếp · Thêm ý tưởng của bạn",65,110,960,20)
   const subjects=[
     ["Ý tưởng trung tâm","Vấn đề","Người dùng","Giải pháp","Nguồn lực","Thành công"],
     ["Dự án","Mục tiêu","Nhân sự","Công việc","Thời hạn","Bàn giao"],
     ["Khám phá","Cân nhắc","Trải nghiệm","Phản hồi","Đồng hành","Quay lại"],
     ["Điểm mạnh","Điểm yếu","Cơ hội","Thách thức"],
     ["Mục tiêu quý","Kết quả 1","Kết quả 2","Kết quả 3","Chỉ số","Người phụ trách"],
     ["Cần làm","Đang làm","Hoàn thành","Ưu tiên","Đang chờ","Ghi chú"],
   ];const labels=subjects[templateIndex%subjects.length]
   const nodes=style===0&&labels.length===6?[[400,270],[80,170],[760,170],[80,430],[760,430],[400,490]]:labels.map((_,i)=>[70+(i%3)*330,200+Math.floor(i/3)*240])
   for(let i=1;i<nodes.length;i++){const [ax,ay]=nodes[0],[bx,by]=nodes[i];const dx=bx-ax,dy=by-ay;els.push(shape("rect",{x:(ax+130+dx/2-Math.hypot(dx,dy)/2)*s,y:(ay+55+dy/2)*s,w:Math.hypot(dx,dy)*s,h:3*s,fill:accent,radius:0,rot:Math.atan2(dy,dx)*180/Math.PI}))}
   nodes.forEach(([x,y],i)=>{r(x,y,260,140,i===0?accent:"#ffffff",{radius:18*s});t(labels[i],x+24,y+25,212,27,i===0?"#ffffff":ink,{weight:600});t("Thêm ghi chú",x+24,y+80,212,18,i===0?"#ffffff":accent)})
 } else if(meta.category==="presentations" && page>0) {
   t(meta.name.toUpperCase(),65,45,900,22,accent,{weight:600});t(String(page+1).padStart(2,"0"),940,45,75,24,accent)
   const titles=["Tổng quan & mục tiêu","Những ý chính","Kế hoạch thực hiện","Kết luận & trao đổi"]
   t(titles[page-1],65,130,940,62,ink,{font:style%2?"sans":"serif",weight:700})
   if(page===2){for(let i=0;i<3;i++){r(65+i*325,270,300,240,i===1?accent:"#ffffff",{radius:12*s});t(`0${i+1}`,90+i*325,295,245,38,i===1?"#ffffff":accent,{weight:700});t(["Bối cảnh","Phân tích","Đề xuất"][i],90+i*325,365,245,30,i===1?"#ffffff":ink);t("Thêm dẫn chứng và\nnhận định của bạn.",90+i*325,425,245,20,i===1?"#ffffff":ink)}}
   else {r(65,265,8,245,accent);t(page===4?"Thông điệp bạn muốn\nngười nghe ghi nhớ.":"Luận điểm chính của bạn\nđược trình bày ở đây.",105,275,840,45,ink,{font:"serif"});t(page===4?"Cảm ơn bạn đã lắng nghe.\nCâu hỏi & thảo luận":"01   Thêm nội dung thứ nhất\n02   Thêm nội dung thứ hai\n03   Bổ sung ví dụ thực tế",110,410,840,25,accent)}
 } else {
   if(style!==2)t(label,70,55,920,19,accent,{weight:600,letterSpacing:2*s})
   const mainY=compact?110:H>1100?210:160;const titleLines=meta.name.split(" ");const mid=Math.ceil(titleLines.length/2);const title=titleLines.length>3?titleLines.slice(0,mid).join(" ")+"\n"+titleLines.slice(mid).join(" "):meta.name
   if(style===0) {r(70,compact?90:130,930,3,accent);t(title,70,mainY,900,Math.min(112,H*.13),ink,{font:"serif",weight:700});r(70,H-280,930,170,accent);t(meta.subtitle,100,H-250,850,34,"#ffffff");t("THÔNG TIN · THỜI GIAN · ĐỊA ĐIỂM",100,H-160,850,20,"#ffffff")}
   if(style===1) {c(600,H*.2,650,accent,.13);c(750,H*.58,270,accent,.3);t(title,70,mainY,900,Math.min(100,H*.14),ink,{weight:800});r(70,H-260,80,6,accent);t(meta.subtitle,70,H-215,750,32,ink);t("KHÁM PHÁ THÊM →",70,H-100,800,22,accent,{weight:700})}
   if(style===2) {r(0,0,1080,H,ink);t(label,70,55,920,19,paper,{letterSpacing:2*s});t(title,70,mainY,900,Math.min(105,H*.14),paper,{font:"serif",weight:700});r(70,H-300,930,2,paper);t(meta.subtitle,70,H-245,900,32,paper);t("THÊM THÔNG TIN CỦA BẠN",70,H-100,900,20,paper);c(820,H-140,55,accent)}
   if(style===3) {r(650,0,430,H,accent);t(title,70,mainY,560,Math.min(90,H*.14),ink,{font:"serif",weight:700});t(meta.subtitle,70,compact?H-180:H-300,520,compact?24:32);t("THAM GIA CÙNG CHÚNG TÔI",70,H-100,520,20,accent,{weight:700});c(720,H*.28,280,paper,.9);r(720,H*.62,280,8,paper)}
   if(style===4) {r(70,compact?90:150,940,H-(compact?180:270),"#ffffff",{radius:28*s});t(title,110,mainY+20,850,Math.min(92,H*.14),ink,{weight:800});t(meta.subtitle,110,compact?H-220:H-330,820,compact?24:32);r(110,H-(compact?130:200),380,compact?50:70,accent,{radius:35*s});t("ĐIỀN NỘI DUNG CỦA BẠN",130,H-(compact?115:180),340,18,"#ffffff",{weight:600,align:"center"});c(850,H-250,80,accent,.25)}
 }
 return {...blank(w,h,meta.name),bg:{from:paper,to:paper,angle:135},els,provenance:{kind:"bloom",templateId:meta.id,license:"CC0-1.0"}}
}
export function buildBloomDeck(meta: BloomTemplate): Design[] {
 const deck={id:uid(),name:meta.name,revision:3,source:"bloom" as const}
 return Array.from({length:5},(_,page)=>({...buildBloomDesign(meta,page),name:`${meta.name} · ${page+1}`,deck}))
}
