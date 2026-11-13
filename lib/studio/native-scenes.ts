import { shape, text, type El } from "./design"
import type { BloomTemplate } from "./bloom-templates"
import { templateArt } from "./template-art"
import { coverCrop } from "./imagefx"
import { uid } from "./storage"

export const SCENE_NAMES = {
 presentations: ["Journal nghiên cứu", "Bản vẽ dự án", "Portfolio gallery", "Pitch dashboard", "Brand manifesto", "Sổ tay ngôn ngữ", "Data report", "Content system", "Luận văn học thuật", "Bưu thiếp hành trình", "Product spotlight", "Workshop toolkit", "Báo cáo tài chính", "Event recap", "Case study", "Roadmap milestones", "Team directory", "Market intelligence", "Study planner", "Creative playground"],
 social: ["Product display", "Story scrapbook", "Quote typography", "Vé workshop", "Sale billboard", "Podcast vinyl", "Community banner", "Recruitment bulletin", "Flashcard từ vựng", "Event calendar", "Knowledge carousel", "Study thumbnail", "Thank-you letter", "Monthly type poster", "Team grid", "Book review", "Study checklist", "Chat invitation", "Editorial newsletter", "Milestone counter"],
 photos: ["Bốn mùa", "Magazine cover", "Triptych", "Polaroid đôi", "Weekend mosaic", "Portrait feature", "Travel scrapbook", "Birthday gallery", "Diptych", "Moodboard tự do", "City diary", "Contact sheet", "Graduation portrait", "Profile card", "Coffee journal", "Photo portfolio", "Before / After", "Family album", "Panorama strips", "Yearbook grid"],
 print: ["Exhibition typography", "Birthday cake card", "Certificate border", "Cafe menu", "Workshop schedule", "Business card", "Letterpress thanks", "Event ticket", "Weekly planner", "Research poster", "Coupon", "Notebook cover", "Service pricing", "Conference badge", "Celebration wreath", "Library bulletin", "Dinner menu", "Course prospectus", "Reading bookmark", "Club gazette"],
 whiteboard: ["Mind map", "Project swimlanes", "User journey", "SWOT matrix", "OKR tree", "Kanban", "Lesson flow", "Sticky brainstorm", "Priority matrix", "Event timeline", "Empathy map", "90-day roadmap", "Retro columns", "Fishbone", "Comparison grid", "Story arc", "Content calendar", "Research affinity", "Decision tree", "Semester review"],
} as const

/** Every collection has twenty authored compositions. Coordinates use a 1080-wide artboard. */
export function nativeScene(meta: BloomTemplate, page: number): El[] {
 const els: El[] = [], scale = meta.w / 1080, H = meta.h / scale
 const {accent:a,paper:p,ink:k}=meta, index=Number(meta.id.split("-").at(-1))-1
 const R=(x:number,y:number,w:number,h:number,fill=a,extra:Partial<El>={})=>els.push(shape("rect",{x:x*scale,y:y*scale,w:w*scale,h:h*scale,fill,radius:0,...extra}))
 const C=(x:number,y:number,d:number,fill=a,opacity=1)=>els.push(shape("circle",{x:x*scale,y:y*scale,w:d*scale,h:d*scale,fill,opacity}))
 const T=(value:string,x:number,y:number,w:number,fs=30,color=k,extra:Partial<El>={})=>{
  // Conservative line estimate keeps long Vietnamese labels inside their editable box.
  const lines=value.split("\n").reduce((n,line)=>n+Math.max(1,Math.ceil(line.length*fs*.56/w)),0)
  els.push(text({x:x*scale,y:y*scale,w:w*scale,h:Math.ceil(lines*fs*(fs>200?1.34:1.2))*scale,text:value,fontSize:fs*scale,color,weight:400,lineHeight:1.15,...extra}))
 }
 const L=(x1:number,y1:number,x2:number,y2:number,color=a,thickness=2)=>{
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)
  R((x1+x2-len)/2,(y1+y2)/2,len,thickness,color,{rot:Math.atan2(dy,dx)*180/Math.PI})
 }
 const photo=(x:number,y:number,w:number,h:number,seed=0,rot=0)=>{
  const svg=templateArt(index+seed,a,p,k)
  els.push({id:uid(),type:"image",x:x*scale,y:y*scale,w:w*scale,h:h*scale,opacity:1,rot,nw:800,nh:800,crop:coverCrop(800,800,w,h),src:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`})
 }
 const tag=(value:string,x:number,y:number,w=220)=>{R(x,y,w,36,a);T(value,x+12,y+8,w-24,15,"#ffffff",{weight:700})}
 const card=(title:string,body:string,x:number,y:number,w:number,h:number,filled=false)=>{
  R(x,y,w,h,filled?a:"#ffffff",{radius:8*scale})
  const fs=w<240?20:25, titleHeight=Math.ceil(title.length*fs*.56/(w-36))*fs*1.2
  T(title,x+18,y+18,w-36,fs,filled?"#ffffff":a,{weight:700})
  if(body&&h>titleHeight+85)T(body,x+18,y+30+titleHeight,w-36,19,filled?"#ffffff":k)
 }
 const title=(value=meta.name,x=64,y=70,w=950,fs=62,color=k)=>T(value,x,y,w,fs,color,{font:[0,4,8,9,13,14,19].includes(index)?"serif":"sans",weight:600})
 const foot=(label="BLOOM ORIGINAL · THÊM NỘI DUNG CỦA BẠN")=>T(label,60,H-40,960,14,a,{letterSpacing:scale})

 if(meta.category==="presentations") {
  const topics=[
   ["Câu hỏi nghiên cứu","Phương pháp & dữ liệu","Phát hiện nổi bật","Kết luận & nguồn"], ["Vấn đề cần giải quyết","Bản thiết kế giải pháp","Kế hoạch triển khai","Điều cần tiếp theo"],
   ["Góc nhìn sáng tạo","Dự án được chọn","Quy trình của tôi","Cùng tạo điều mới"], ["Cơ hội thị trường","Mô hình kinh doanh","Dự báo & nguồn lực","Đề xuất hợp tác"],
   ["Điều chúng tôi tin","Tính cách thương hiệu","Hệ nhận diện","Câu chuyện tiếp theo"], ["Mục tiêu buổi học","Từ vựng trọng tâm","Luyện tập hội thoại","Thử thách nhỏ"],
   ["Thiết kế khảo sát","Cơ cấu người trả lời","Kết quả & đối chiếu","Hàm ý từ dữ liệu"], ["Chân dung độc giả","Trụ cột nội dung","Lịch phát hành","Đo lường hiệu quả"],
   ["Bối cảnh & khoảng trống","Khung lý thuyết","Phân tích kết quả","Đóng góp & giới hạn"], ["Điểm đến & văn hóa","Bản đồ hành trình","Trải nghiệm địa phương","Những điều lưu giữ"],
   ["Nhu cầu người dùng","Sản phẩm hoạt động ra sao","Giá trị & khác biệt","Bước thử nghiệm"], ["Công cụ cần chuẩn bị","Thực hành cùng nhau","Chia sẻ kết quả","Tài nguyên mang về"],
   ["Tổng quan tháng","Kết quả theo chỉ tiêu","Chi phí & nguồn lực","Ưu tiên tháng tới"], ["Những con số sự kiện","Khoảnh khắc đáng nhớ","Phản hồi người tham gia","Lời cảm ơn"],
   ["Bài toán ban đầu","Những lựa chọn thiết kế","Tác động đã đo","Bài học rút ra"], ["Điểm xuất phát","Các mốc ưu tiên","Phụ thuộc & rủi ro","Đích đến"],
   ["Những người đồng hành","Chuyên môn & vai trò","Cách nhóm phối hợp","Kết nối với chúng tôi"], ["Toàn cảnh ngành","Phân khúc khách hàng","Bản đồ cạnh tranh","Hướng tăng trưởng"],
   ["Điều muốn chinh phục","Phân bổ thời gian","Theo dõi tiến bộ","Tự đánh giá"], ["Nguồn cảm hứng","Thử nghiệm hình thức","Phát triển ý tưởng","Gợi mở điều tiếp theo"],
  ]
  if(page===0) {
   const name=meta.name
   switch(index) {
    case 0: T("RESEARCH JOURNAL / 01",60,48,800,17,a);L(60,92,1020,92);title(name,60,145,690,90);T("Câu hỏi · Phương pháp · Khám phá",65,400,650,25);photo(765,120,260,355,8);T("TÊN TÁC GIẢ / ĐƠN VỊ",60,520,750,17,a);break
    case 1: R(0,0,1080,H,k);for(let x=45;x<1080;x+=90)L(x,0,x,H,p,.35);for(let y=30;y<H;y+=90)L(0,y,1080,y,p,.35);R(75,96,690,375,p);title(name,110,135,600,80);T("Ý tưởng → Bản thiết kế → Tác động",110,385,590,24,a);C(830,320,135,a);T("01",854,352,100,50,p);break
    case 2: title(name,50,45,960,62);photo(50,170,470,300,0);photo(540,170,260,300,1);photo(820,170,210,300,2);T("SELECTED WORKS / 2026",50,505,960,21,a);break
    case 3: R(0,0,1080,H,a);T("PITCH / 2026",55,42,900,18,p);title(name,55,125,550,75,p);T("Một cơ hội. Một hướng đi mới.",55,367,520,26,p);[125,215,300].forEach((height,i)=>{R(700+i*100,480-height,62,height,p);T(["01","02","03"][i],700+i*100,500,80,20,p)});break
    case 4: T("CHÚNG TÔI TIN VÀO",65,45,960,18,a);title(name.toUpperCase(),65,140,850,105);R(65,440,950,80,k);T("Ý NGHĨA TẠO NÊN SỰ KHÁC BIỆT.",90,463,880,27,p,{weight:700});break
    case 5: R(30,25,1020,H-50,"#ffffff");L(75,120,1000,120,a,1);for(let y=380;y<570;y+=55)L(75,y,1000,y,a,1);L(150,25,150,582,a);T("LESSON 01",195,70,750,21,a);title(name,195,165,730,78);tag("HELLO / 안녕하세요 / XIN CHÀO",195,430,700);break
    case 6: T("INSIGHTS / DATA REPORT",60,45,950,19,a);title(name,60,100,600,64);C(750,105,235,a);C(810,165,115,p);T("n = ___",790,210,160,27,k,{align:"center"});["Mẫu khảo sát","Phản hồi","Điểm nổi bật"].forEach((s,i)=>card(["01","02","03"][i],s,60+i*325,350,300,170,i===1));break
    case 7: title(name,60,50,970,68);["KHÁM PHÁ","SÁNG TẠO","PHÂN PHỐI"].forEach((s,i)=>{R(60+i*325,205+i*32,300,230,a,{opacity:1-i*.22});T(`0${i+1}`,80+i*325,235+i*32,250,63,p);T(s,80+i*325,370+i*32,250,19,p)});break
    case 8: R(0,0,1080,40,k);T("ĐƠN VỊ / CHUYÊN NGÀNH",80,90,920,18,a,{align:"center"});title(name,140,205,800,83);L(420,410,660,410);T("Tác giả: __________  |  Người hướng dẫn: __________",120,460,840,22,k,{align:"center"});break
    case 9: photo(0,0,1080,H,0);R(55,55,545,460,p,{rot:-3});T("POSTCARD / VIỆT NAM",90,85,480,18,a);title(name,90,165,450,70);T("Đi để hiểu. Gặp để nhớ.",90,425,440,24);for(let j=0;j<4;j++)L(750,360+j*30,1000,360+j*30,p);break
    case 10: title(name,60,75,510,87);T("Từ ý tưởng đến trải nghiệm.",60,365,510,28,a);R(675,65,275,465,k,{radius:34*scale});R(690,88,245,415,p,{radius:25*scale});C(750,200,125,a);R(725,375,175,18,a);break
    case 11: R(60,65,400,210,a,{rot:-5});T("WORK /\nSHOP",88,95,340,73,p,{weight:800});title(name,520,100,510,67);card("01 / KHÁM PHÁ","Đặt câu hỏi",65,340,300,180);card("02 / THỰC HÀNH","Biến ý tưởng thành hình",390,310,300,180,true);card("03 / CHIA SẺ","Học từ nhau",715,345,300,180);break
    case 12: R(0,0,320,H,k);T("MONTHLY\nREPORT",45,60,260,43,p,{weight:700});T("THÁNG / 2026",45,470,270,21,p);title(name,375,55,640,65);[.42,.68,.85].forEach((v,i)=>{T(["Mục tiêu","Thực hiện","Hiệu quả"][i],380,260+i*82,300,22);R(380,300+i*82,610,18,"#ffffff");R(380,300+i*82,610*v,18,a)});break
    case 13: title(name,60,42,960,66);photo(60,160,600,325,1);photo(680,160,330,145,2);photo(680,325,330,160,3);T("NHỮNG KHOẢNH KHẮC / NHỮNG NGƯỜI ĐỒNG HÀNH",60,520,960,18,a);break
    case 14: R(0,0,540,H,a);T("CASE\nSTUDY",55,70,460,115,p,{weight:800});title(name,600,70,430,60);["Bài toán","Giải pháp","Tác động"].forEach((s,i)=>{L(605,270+i*95,1015,270+i*95);T(`0${i+1}  ${s}`,605,290+i*95,410,25)});break
    case 15: title(name,55,50,970,76);L(110,380,960,380);["BẮT ĐẦU","THỬ NGHIỆM","MỞ RỘNG","BỨT PHÁ"].forEach((s,i)=>{C(90+i*280,355,50,a);T(`0${i+1}`,97+i*280,368,40,18,p);T(s,70+i*280,435,170,19,a)});break
    case 16: title(name,55,45,960,67);[0,1,2,3].forEach((i)=>{photo(55+i*255,175,225,235,i);T(["NGHIÊN CỨU","THIẾT KẾ","NỘI DUNG","PHÁT TRIỂN"][i],55+i*255,440,230,17,a)});break
    case 17: T("MARKET INTELLIGENCE",55,45,970,18,a);title(name,55,115,530,77);L(650,485,1000,485);L(650,210,650,485);[130,220,170,310].forEach((v,i)=>R(685+i*80,485-v,48,v,a,{opacity:.4+i*.2}));T("CƠ HỘI / XU HƯỚNG / TĂNG TRƯỞNG",55,470,530,18,a);break
    case 18: R(0,0,1080,155,a);title(name,55,40,960,62,p);["Mục tiêu","Thời gian","Tiến bộ"].forEach((s,i)=>{card(s,"Ghi điều bạn muốn đạt được",55+i*330,215,310,265);for(let j=0;j<3;j++)L(80+i*330,355+j*40,335+i*330,355+j*40,a,1)});break
    case 19: C(-70,-90,390,a,.16);R(700,75,280,280,a,{rot:18});C(650,295,225,k);R(760,315,200,135,p,{rot:-15});title(name,65,150,560,92);T("THỬ. SAI. KHÁM PHÁ. LÀM LẠI.",65,470,900,26,a,{weight:700});break
   }
  } else {
   T(`${meta.name.toUpperCase()} / ${String(page+1).padStart(2,"0")}`,55,30,970,16,a)
   const heading=topics[index][page-1],mode=(index+page*3)%20
   title(heading,55,90,950,57)
   const labels=page===4?["Điều đã học","Việc tiếp theo","Câu hỏi mở"]:page===3?["Chuẩn bị","Thực hiện","Đánh giá"]:["Bối cảnh","Quan sát","Nhận định"]
   switch(mode){
    case 0: R(55,210,420,320,a);T("Luận điểm\ntrọng tâm",85,250,350,62,p,{font:"serif"});labels.forEach((x,i)=>{T(`0${i+1}`,530,225+i*100,70,35,a);T(x,625,228+i*100,380,29);L(625,285+i*100,1000,285+i*100,a,1)});break
    case 1: labels.forEach((x,i)=>card(x,"Thêm thông tin, ví dụ\nvà dẫn chứng của bạn.",55+i*330,230,310,285,i===1));break
    case 2: photo(55,210,465,310,page);T("Một góc nhìn mới",565,230,430,40,a);T("Mô tả phát hiện và ý nghĩa của nó.\n\nBổ sung số liệu hoặc dẫn chứng\nđể làm rõ quan điểm.",565,320,440,25);break
    case 3: L(100,330,970,330);labels.forEach((x,i)=>{C(90+i*420,310,40,a);T(x,65+i*330,390,300,29);T(`Giai đoạn ${i+1}\nThêm mô tả của bạn`,65+i*330,450,300,20)});break
    case 4: T("01",55,205,310,180,a,{font:"serif"});T("Điều cần ghi nhớ",420,235,600,43);T("Viết một thông điệp ngắn gọn.\nGiải thích bằng một câu chuyện cụ thể.",420,340,600,28);L(420,480,1010,480);break
    case 5: ["THÔNG TIN","ĐỐI CHIẾU"].forEach((x,i)=>{R(55+i*500,215,470,300,i?a:"#ffffff");T(x,80+i*500,245,420,22,i?p:a);T(labels[i],80+i*500,315,410,40,i?p:k);T("Dẫn chứng và phân tích\nđược đặt ở đây.",80+i*500,420,410,25,i?p:k)});break
    case 6: [170,290,220,350].forEach((v,i)=>{R(95+i*145,530-v,85,v,a,{opacity:.35+i*.2});T(`0${i+1}`,110+i*145,540,100,17,a)});T("DỮ LIỆU CỦA BẠN",730,245,300,20,a);T("Biểu đồ\nminh họa",730,310,300,49);T("Thay hình khối bằng số liệu thực.",730,455,300,22);break
    case 7: R(60,220,950,305,k);T("“",90,225,100,120,p,{font:"serif"});T("Một câu trích dẫn hoặc\nphát hiện đáng suy ngẫm.",220,280,730,46,p,{font:"serif"});T("TÁC GIẢ / NGUỒN",220,455,730,18,p);break
    case 8: labels.forEach((x,i)=>{R(55,220+i*105,960,85,i===0?a:"#ffffff");T(`0${i+1}`,80,240+i*105,100,35,i===0?p:a);T(x,220,242+i*105,750,31,i===0?p:k)});break
    case 9: labels.forEach((x,i)=>{C(75+i*330,235,260,i===1?a:"#ffffff");T(`0${i+1}`,125+i*330,285,160,57,i===1?p:a,{align:"center"});T(x,70+i*330,515,280,25,k,{align:"center"})});break
    case 10: labels.forEach((x,i)=>{T(`0${i+1}`,55,220+i*108,100,48,a,{font:"serif"});T(x,190,230+i*108,450,31);T("Mô tả ngắn / Dẫn chứng",190,278+i*108,450,19)});R(760,220,255,305,k);T("GÓC NHÌN",785,255,205,19,p);T("Điều cần\nđối chiếu\nở đây.",785,330,205,32,p,{font:"serif"});break
    case 11: [...labels,"Điều cần lưu ý"].forEach((x,i)=>{const bx=55+i%2*495,by=210+Math.floor(i/2)*175;R(bx,by,470,155,i===0?a:"#ffffff");T(x,bx+20,by+20,430,28,i===0?p:k);T("Ghi nhận / Minh chứng",bx+20,by+105,430,20,i===0?p:a)});break
    case 12: C(105,220,315,a);C(180,295,165,p);T("___",200,350,125,47,k,{align:"center"});labels.forEach((x,i)=>{R(500,235+i*100,20,20,a,{opacity:1-i*.25});T(x,550,228+i*100,450,30);T("Chỉ số / Diễn giải",550,275+i*100,450,18,a)});break
    case 13: labels.forEach((x,i)=>{R(55+i*330,370-i*70,310,165+i*70,i===1?k:a);T(`0${i+1}`,80+i*330,390-i*70,260,40,p);T(x,80+i*330,480-i*70,260,26,p)});break
    case 14: R(0,205,1080,403,a);T("ĐIỀU CỐT LÕI",70,240,940,18,p);T("Một thông điệp rõ ràng\ngiúp mọi người cùng hiểu.",70,310,930,62,p,{font:"serif",weight:700});T("BỔ SUNG DẪN CHỨNG / VÍ DỤ / NGUỒN",70,520,930,19,p);break
    case 15: labels.forEach((x,i)=>{photo(55+i*330,215,310,205,i+page);T(x,55+i*330,450,310,29,a);T("Khoảnh khắc và câu chuyện\nđằng sau hình ảnh.",55+i*330,500,310,18)});break
    case 16: L(105,225,105,530);labels.forEach((x,i)=>{C(86,240+i*105,38,a);T(String(i+1),95,248+i*105,25,20,p);R(165,225+i*105,850,88,"#ffffff");T(x,190,250+i*105,760,32)});break
    case 17: R(55,215,300,315,k);T("SO SÁNH",80,250,250,22,p);T("Cùng một\ntiêu chí.",80,330,250,41,p,{font:"serif"});labels.forEach((x,i)=>{T(x,405,215+i*108,600,24);R(405,264+i*108,610,23,"#ffffff");R(405,264+i*108,[370,535,245][i],23,a)});break
    case 18: ["ĐẦU VÀO","THỰC HIỆN","ĐẦU RA"].forEach((x,i)=>{tag(x,55+i*330,215,310);card(labels[i],"Nội dung trọng tâm",55+i*330,275,310,120);R(55+i*330,420,310,105,"#ffffff");T("Người phụ trách\nThời hạn: ____",75+i*330,440,270,20,a)});break
    case 19: C(55,220,310,a);T("!",135,265,150,150,p,{font:"serif",align:"center"});T("Điểm mấu chốt",425,240,590,43,a,{font:"serif"});T("Viết điều bạn muốn người xem\nmang theo sau phần này.",425,330,590,32);L(425,470,1015,470);T("Dẫn chứng / Câu hỏi cần suy nghĩ",425,505,590,20);break
   }
  }
 } else if(meta.category==="social") {
  switch(index) {
   case 0: R(540,0,540,H,a);photo(575,220,450,650,0);T("NEW / 01",65,75,400,24,a);title("Một điều\nthật mới.",65,235,450,88);T(meta.name,65,560,440,35);tag("KHÁM PHÁ BỘ SƯU TẬP",65,H-160,425);break
   case 1: photo(100,145,880,1060,0);R(180,990,720,340,p,{rot:-4});title(meta.name,235,1060,610,85);T("Những điều nhỏ xíu đáng nhớ",110,H-165,860,33,a);break
   case 2: C(710,40,420,a,.12);T("“",80,90,350,220,a,{font:"serif"});title("Hôm nay,\nbắt đầu từ\nmột điều nhỏ.",95,380,900,92);L(100,1010,450,1010);T("TRÍCH DẪN MỖI NGÀY",100,1070,860,26,a);break
   case 3: R(60,70,960,H-140,k);T("ADMIT ONE / 2026",110,115,850,23,p);title(meta.name,110,250,840,106,p);L(110,720,970,720,p);T("THỨ BẢY\n09:00 – 12:00",110,805,420,49,p);T("ĐỊA ĐIỂM\nKhông gian của bạn",580,820,380,31,p);for(let i=0;i<30;i++)R(110+i*28,H-230,10+i%3*4,80,p);break
   case 4: R(0,0,1080,H,a);T("MÙA MỚI / CẢM HỨNG MỚI",60,75,960,26,p);T("SALE",60,205,960,235,p,{weight:800});T("Ưu đãi của bạn",65,540,950,65,p);R(65,740,950,265,p);T("ĐIỀN ƯU ĐÃI\nVÀ THỜI GIAN ÁP DỤNG",100,790,880,38,a,{weight:700});T("THÊM ĐIỀU KIỆN CHƯƠNG TRÌNH",65,H-130,950,23,p);break
   case 5: title(meta.name,65,65,960,90);C(160,345,760,k);for(let d=620;d>180;d-=90){C(160+(760-d)/2,345+(760-d)/2,d,p,.08)}C(395,580,290,a);T("PLAY",445,692,200,48,p,{weight:700,align:"center"});T("TẬP 01 / NHỮNG CÂU CHUYỆN MỚI",65,H-110,950,26,a);break
   case 6: R(0,0,1080,H,k);C(650,-140,650,a);C(850,265,160,p,.3);title(meta.name,55,115,680,79,p);T("Nơi những ý tưởng gặp nhau.",60,H-135,700,32,p);break
   case 7: T("WE ARE LOOKING FOR YOU",60,65,960,26,a);title("Cùng làm\nđiều hay.",60,185,960,125);["Vị trí tuyển","Điều bạn mang đến","Cách ứng tuyển"].forEach((x,i)=>{L(65,600+i*170,1015,600+i*170);T(`0${i+1}`,65,630+i*170,100,44,a);T(x,240,645+i*170,750,37)});tag("THAM GIA CÙNG CHÚNG TÔI",65,H-130,650);break
   case 8: R(70,100,940,H-210,"#ffffff",{radius:32*scale});tag("WORD OF THE DAY",120,165,420);T("bloom",120,380,840,160,a,{font:"serif",weight:700});T("/bluːm/   ·   động từ",120,600,840,35);L(120,730,960,730);T("Nở hoa; phát triển rực rỡ.",120,800,840,43);T("Let your ideas bloom.",120,1010,840,34,a,{italic:true});break
   case 9: title(meta.name,60,70,960,100);R(60,300,960,110,a);["T2","T3","T4","T5","T6","T7","CN"].forEach((x,i)=>T(x,80+i*135,335,100,30,p,{align:"center"}));for(let r=0;r<4;r++)for(let j=0;j<7;j++){R(60+j*137,430+r*150,125,130,"#ffffff");T(String(r*7+j+1),80+j*137,455+r*150,90,33,j===5?a:k)}T("Đánh dấu những ngày đáng mong đợi",60,H-135,960,30,a);break
   case 10: T("01 / KIẾN THỨC BỎ TÚI",60,60,960,25,a);T("3",60,170,340,380,a,{font:"serif"});title("điều bạn\ncần biết",430,290,580,82);["Đặt câu hỏi đúng","Chọn một việc nhỏ","Bắt đầu ngay hôm nay"].forEach((x,i)=>card(`0${i+1}`,x,60,690+i*170,960,145,i===1));break
   case 11: photo(0,0,1080,H,0);R(0,0,600,H,k,{opacity:.9});T("STUDY\nWITH ME",45,75,570,104,p,{weight:800});tag("25 PHÚT TẬP TRUNG",45,H-95,540);break
   case 12: R(85,85,910,H-170,"#ffffff");T("GỬI BẠN,",145,170,790,27,a);title("Cảm ơn\nvì đã ở đây.",145,355,790,96);L(145,800,935,800);T("Mỗi sự đồng hành đều là\nmột điều đáng trân trọng.",145,865,790,38);T("TỪ NHÓM CỦA BẠN ♡",145,H-180,790,27,a);break
   case 13: T("THÁNG",60,60,960,105,a,{weight:800});T("11",60,240,960,430,k,{font:"serif",weight:700});R(65,860,950,120,a);T("CHÀO NHỮNG KHỞI ĐẦU MỚI",90,898,900,37,p,{weight:700});T("LÊN KẾ HOẠCH / TÌM CẢM HỨNG / BẮT ĐẦU",65,H-150,950,24,a);break
   case 14: title(meta.name,60,60,960,96);for(let i=0;i<4;i++){const x=60+i%2*490,y=340+Math.floor(i/2)*430;photo(x,y,465,310,i);T(`THÀNH VIÊN 0${i+1}`,x,y+330,460,26,a)}break
   case 15: R(0,0,1080,H,k);R(100,110,550,750,a,{rot:-8});R(140,140,470,650,p,{rot:-8});T("TÊN\nCUỐN\nSÁCH",180,250,420,96,k,{font:"serif"});T("★★★★★",690,230,320,43,p);T("GÓC\nĐỌC\nSÁCH",690,370,320,64,p,{weight:700});T("Một ý tưởng từ trang sách…",90,1020,900,47,p);T("TÁC GIẢ / ĐIỀU BẠN MUỐN CHIA SẺ",90,H-145,900,23,p);break
   case 16: title("Học ít hơn.\nNhớ lâu hơn.",60,95,960,100);["Ôn lại sau 24 giờ","Tự đặt câu hỏi","Giải thích bằng lời của bạn","Nghỉ ngơi đúng lúc"].forEach((x,i)=>{R(65,510+i*155,65,65,a);T("✓",77,515+i*155,50,42,p);T(x,175,520+i*155,825,38)});break
   case 17: title("Hẹn bạn\nở buổi giao lưu!",65,75,950,95);R(65,440,740,160,"#ffffff",{radius:45*scale});T("Cuối tuần này bạn có rảnh không?",105,485,660,37);R(265,650,750,170,a,{radius:45*scale});T("Có chứ! Gặp nhau ở đâu nè?",305,700,670,37,p);R(65,885,760,165,"#ffffff",{radius:45*scale});T("Thời gian / Địa điểm của bạn",105,937,680,35);break
   case 18: T("THE BLOOM POST",60,60,960,80,k,{font:"serif",weight:700});L(60,170,1020,170);T("BẢN TIN / SỐ 01",60,200,960,23,a);photo(60,280,560,620,0);title("Câu chuyện\ntrong tuần",660,285,360,58);T("Điểm tin mới\n\nGóc chia sẻ\n\nĐiều sắp tới",660,570,350,32);L(60,980,1020,980);T("ĐỌC. KẾT NỐI. CÙNG TRƯỞNG THÀNH.",60,1040,960,29,a);break
   case 19: T("CÙNG NHAU CHÚNG TA ĐÃ ĐẠT",65,90,950,27,a);C(150,280,780,a);T("1.000",190,480,700,155,p,{weight:800,align:"center"});T("ĐIỀU TUYỆT VỜI",220,690,640,38,p,{align:"center"});title("Một cột mốc mới.",65,1110,950,70);break
  }
 } else if(meta.category==="photos") {
  const frame=(x:number,y:number,w:number,h:number,n:number,polaroid=false,rot=0)=>{if(polaroid)R(x-16,y-16,w+32,h+80,"#ffffff",{rot});photo(x,y,w,h,n,rot)}
  switch(index){
   case 0: title(meta.name,55,35,960,60);[0,1,2,3].forEach(i=>{frame(55+i%2*495,150+Math.floor(i/2)*400,475,340,i);T(["XUÂN","HẠ","THU","ĐÔNG"][i],55+i%2*495,510+Math.floor(i/2)*400,470,18,a)});break
   case 1: frame(0,0,1080,1080,1);T("BLOOM",50,30,980,155,p,{font:"serif",weight:700});T("THE\nPORTRAIT\nISSUE",60,490,600,87,p,{weight:700});T("01 / CÂU CHUYỆN CỦA BẠN",60,990,950,24,p);break
   case 2: T("THREE MOMENTS / ONE STORY",55,70,960,30,a);[0,1,2].forEach(i=>frame(55+i*330,180,310,680,i));title(meta.name,55,910,960,60);break
   case 3: frame(100,165,400,540,0,true,-8);frame(580,295,380,505,1,true,9);T("Những điều mình giữ lại.",80,930,920,50,k,{font:"serif"});break
   case 4: [[50,120,570,430],[640,120,390,280],[640,420,390,400],[50,570,275,380],[345,570,275,380],[640,840,390,110]].forEach((v,i)=>frame(v[0],v[1],v[2],v[3],i));T("WEEKEND / DIARY",50,45,960,25,a);break
   case 5: frame(60,90,640,850,0);frame(730,90,290,300,1);frame(730,420,290,300,2);T("PORTRAIT\nNO. 06",730,780,290,48,a,{font:"serif"});break
   case 6: R(40,40,1000,1000,"#ffffff");T("TRAVEL JOURNAL",90,80,900,57,a,{font:"serif"});frame(100,215,500,370,0,true,-4);frame(625,400,300,380,1,true,5);T("Ngày ___ / Nơi mình đến ___",100,850,850,37);L(100,960,950,960);break
   case 7: C(20,20,220,a,.2);C(850,800,260,a,.2);frame(290,170,500,610,0);frame(55,270,210,290,1);frame(815,400,210,290,2);title("Happy birthday",120,850,840,74);T("NGÀY CỦA BẠN / KHOẢNH KHẮC CỦA BẠN",100,970,880,23,a,{align:"center"});break
   case 8: frame(0,0,530,1080,0);frame(550,0,530,1080,1);R(240,450,600,170,p);title("Hai nửa\nmột câu chuyện.",275,475,530,49);break
   case 9: [[55,55,380,400],[465,75,545,280],[65,485,300,470],[400,390,360,500],[790,390,220,610]].forEach((v,i)=>frame(v[0],v[1],v[2],v[3],i));T("MOOD / 10",420,940,340,27,a);break
   case 10: frame(60,60,590,600,0);frame(680,240,340,570,1);frame(60,690,590,280,2);T("SEOUL\nDIARY",710,65,300,62,a,{weight:700});T("MỘT NGÀY ĐI BỘ QUA THÀNH PHỐ",690,880,320,24);break
   case 11: R(0,0,1080,1080,k);for(let i=0;i<6;i++){frame(55+i%3*330,100+Math.floor(i/3)*445,310,350,i);T(`FRAME ${String(i+1).padStart(2,"0")}`,55+i%3*330,465+Math.floor(i/3)*445,310,19,p)}break
   case 12: frame(100,70,650,840,0);R(735,600,285,330,a);T("CLASS\nOF\n2026",775,655,220,63,p,{weight:800});T("MỘT CHƯƠNG MỚI BẮT ĐẦU",100,970,900,29,a);break
   case 13: C(190,80,700,a,.13);frame(260,130,560,560,0);R(180,760,720,220,"#ffffff");title("Họ tên của bạn",220,805,640,57);T("Một dòng giới thiệu về mình",220,900,640,26,a);break
   case 14: frame(65,120,580,490,0,true,-3);frame(690,150,320,350,1,true,5);frame(390,660,600,260,2,true,2);T("COFFEE\n& LITTLE\nTHINGS",60,730,300,49,a,{font:"serif"});break
   case 15: T("SELECTED PHOTOGRAPHY",55,45,970,35,a);frame(55,130,610,620,0);frame(690,130,330,290,1);frame(690,445,330,305,2);[0,1,2,3].forEach(i=>frame(55+i*245,790,225,170,i+3));break
   case 16: frame(60,160,470,730,0);frame(550,160,470,730,1);T("BEFORE",60,80,470,46,a);T("AFTER",550,80,470,46,a);L(540,120,540,940);T("CÙNG MỘT GÓC NHÌN / MỘT SỰ THAY ĐỔI",60,980,960,27);break
   case 17: title("Gia đình là…",60,45,960,70);frame(60,170,960,470,0);[0,1,2].forEach(i=>frame(60+i*330,675,300,280,i+1));break
   case 18: [0,1,2].forEach(i=>{frame(50,55+i*330,760,295,i);T(`0${i+1}`,850,115+i*330,180,74,a,{font:"serif"})});T("TRAVEL LOG",850,930,180,20,a);break
   case 19: title("Những gương mặt thân quen",55,40,970,54);for(let i=0;i<9;i++)frame(55+i%3*330,160+Math.floor(i/3)*275,305,245,i);T("CLASS / FRIENDS / MEMORIES",55,1010,970,20,a);break
  }
 } else if(meta.category==="whiteboard") {
  const white=()=>{title(meta.name,45,25,990,42);T("KHÔNG GIAN ĐỂ NGHĨ CÙNG NHAU",45,88,990,16,a)};white()
  const note=(label:string,x:number,y:number,w=220,h=120,filled=false)=>card(label,"Thêm ý của bạn",x,y,w,h,filled)
  const grid=(heads:string[],cols:number,top=160,boxH=185)=>heads.forEach((name,i)=>note(name,45+i%cols*(1000/cols),top+Math.floor(i/cols)*(boxH+25),1000/cols-20,boxH,i===0))
  switch(index){
   case 0: [[260,170],[820,170],[260,480],[820,480]].forEach(([x,y])=>L(540,350,x,y));note("Ý tưởng trung tâm",405,290,270,115,true);["Vấn đề","Người dùng","Giải pháp","Thành công"].forEach((s,i)=>note(s,[80,770,80,770][i],[140,140,465,465][i]));break
   case 1: ["Khám phá","Thiết kế","Triển khai"].forEach((s,i)=>{R(45,150+i*140,990,120,"#ffffff");tag(s,60,175+i*140,210);["Người phụ trách","Đầu việc","Bàn giao"].forEach((n,j)=>T(n,320+j*235,190+i*140,210,21))});break
   case 2: L(100,230,990,230);["Biết đến","Tìm hiểu","Trải nghiệm","Phản hồi","Quay lại"].forEach((s,i)=>{C(80+i*203,205,50,a);T(s,45+i*205,280,185,22);R(45+i*205,335,185,220,"#ffffff");T("Hành động\n\nCảm xúc\n\nCơ hội",60+i*205,355,160,20)});break
   case 3: grid(["S / Điểm mạnh","W / Điểm yếu","O / Cơ hội","T / Thách thức"],2,145,200);break
   case 4: note("Mục tiêu quý",365,135,350,110,true);["Kết quả 1","Kết quả 2","Kết quả 3"].forEach((s,i)=>{L(540,245,210+i*330,340);note(s,65+i*330,340,290,140);T("Chỉ số ___ / Chủ sở hữu ___",65+i*330,520,290,20)});break
   case 5: ["CẦN LÀM","ĐANG LÀM","HOÀN THÀNH"].forEach((s,i)=>{R(45+i*335,145,315,455,"#ffffff");tag(s,60+i*335,165,285);for(let j=0;j<3-i;j++)note(`Công việc ${j+1}`,65+i*335,235+j*110,275,90,j===0)});break
   case 6: ["Khởi động","Khái niệm","Ví dụ","Thực hành","Tổng kết"].forEach((s,i)=>{const x=70+i%3*340,y=165+Math.floor(i/3)*260;if(i<4)L(x+200,y+100,i===2?270:x+355,i===2?475:y+100);note(s,x,y,260,145,i===0)});break
   case 7: for(let i=0;i<8;i++){R(65+i%4*250,165+Math.floor(i/4)*230,215,185,i%3===0?a:"#ffffff",{rot:(i%3-1)*5});T(`Ý TƯỞNG ${i+1}`,85+i%4*250,195+Math.floor(i/4)*230,175,23,i%3===0?p:k);T("Viết tự do,\nchưa cần đánh giá.",85+i%4*250,250+Math.floor(i/4)*230,175,18,i%3===0?p:k)}break
   case 8: L(540,155,540,600);L(65,380,1010,380);["Làm ngay","Lên lịch","Giao việc","Loại bỏ"].forEach((s,i)=>note(s,95+i%2*500,185+Math.floor(i/2)*235,420,160,i===0));T("MỨC TÁC ĐỘNG ↑ / NỖ LỰC →",65,620,950,18,a);break
   case 9: L(120,180,120,590);["Trước sự kiện","Ngày tổ chức","Sau sự kiện"].forEach((s,i)=>{C(103,205+i*145,34,a);T(s,175,195+i*145,310,28,a);T("Công việc / Phụ trách / Thời hạn",520,205+i*145,480,22);L(175,275+i*145,1000,275+i*145,a,1)});break
   case 10: ["Nghĩ & cảm thấy","Nhìn thấy","Nói & làm","Nghe thấy"].forEach((s,i)=>note(s,45+i%2*500,i<2?145:450,480,160,i===0));C(465,310,150,a);T("NGƯỜI\nDÙNG",485,352,110,24,p,{align:"center"});break
   case 11: ["THÁNG 1","THÁNG 2","THÁNG 3"].forEach((s,i)=>{tag(s,55+i*335,145,310);note("Mốc quan trọng",55+i*335,215,310,115);note("Đầu việc ưu tiên",55+i*335,355,310,115);T("KẾT QUẢ CẦN ĐẠT",55+i*335,520,310,18,a)});break
   case 12: grid(["Tiếp tục","Dừng lại","Bắt đầu"],3,145,360);["Điều đã tốt","Điều cản trở","Thử nghiệm mới"].forEach((s,i)=>T(s,65+i*333,380,290,25,a));break
   case 13: L(90,360,1000,360);["Con người","Quy trình","Công cụ","Dữ liệu"].forEach((s,i)=>{const x=260+i%2*330,y=i<2?170:535;L(x,y,x+115,360);note(s,x-115,i<2?125:475,230,100)});note("Vấn đề",845,310,190,100,true);break
   case 14: ["Tiêu chí","Phương án A","Phương án B"].forEach((s,i)=>tag(s,45+i*335,145,315));for(let i=0;i<3;i++)for(let j=0;j<3;j++){R(45+j*335,205+i*120,315,100,"#ffffff");T(j===0?["Chi phí","Tác động","Rủi ro"][i]:"Đánh giá ___",65+j*335,235+i*120,275,23)}break
   case 15: [[70,470],[260,330],[465,160],[670,300],[875,475]].forEach(([x,y],i,arr)=>{if(i<4)L(x+70,y+30,arr[i+1][0]+70,arr[i+1][1]+30);note(["Mở đầu","Xung đột","Cao trào","Giải quyết","Kết thúc"][i],x,y,155,110,i===2)});break
   case 16: for(let i=0;i<7;i++){T(["T2","T3","T4","T5","T6","T7","CN"][i],50+i*145,155,130,23,a);for(let j=0;j<3;j++){R(45+i*145,205+j*125,130,110,"#ffffff");T(j===0?"Ý tưởng":"Kênh / Giờ",55+i*145,235+j*125,110,18)}}break
   case 17: ["Hành vi","Nhu cầu","Điểm đau","Cơ hội"].forEach((s,i)=>{T(s,55+i*250,150,235,27,a);[0,1,2].forEach(j=>note(`Ghi nhận ${j+1}`,55+i*250,225+j*115,225,95,j===1))});break
   case 18: note("Quyết định cần đưa ra",365,140,350,100,true);L(540,240,280,350);L(540,240,800,350);note("Điều kiện A",145,350,275,95);note("Điều kiện B",665,350,275,95);["Có","Không","Có","Không"].forEach((s,i)=>{L(i<2?280:800,445,150+i*260,535);note(s,60+i*260,535,220,100)});break
   case 19: R(45,145,350,430,a);T("HỌC KỲ\nCỦA TÔI",75,195,290,55,p,{weight:700});T("Điều đáng tự hào nhất…",75,435,280,24,p);["Đã học","Đã làm","Muốn thử","Cần cải thiện"].forEach((s,i)=>note(s,435+i%2*300,145+Math.floor(i/2)*225,280,205));break
  }
 } else if(meta.category==="print") {
  const center=(v:string,y:number,fs=56)=>T(v,95,y,890,fs,k,{font:"serif",align:"center"})
  switch(index){
   case 0: R(0,0,1080,H,k);T("EXHIBITION / 2026",60,60,960,27,p);T("ART\nIN\nMOTION",60,230,960,210,p,{weight:800});C(720,670,390,a);T("TRIỂN LÃM SÁNG TẠO",65,H-330,950,45,p);T("Ngày / Giờ / Địa điểm",65,H-180,950,32,p);break
   case 1: center("Happy\nbirthday",140,120);[0,1,2].forEach(i=>R(200+i*70,590,25,150,a));R(130,745,820,300,a);R(210,665,660,110,"#ffffff");center("MỘT NGÀY THẬT ĐẶC BIỆT",1130,34);center("Dành cho người bạn yêu quý",1240,29);break
   case 2: R(35,35,1010,H-70,a);R(45,45,990,H-90,p);R(65,65,950,H-130,a);R(69,69,942,H-138,p);center("CHỨNG NHẬN",230,82);center("HOÀN THÀNH CHƯƠNG TRÌNH",380,29);center("Họ tên người nhận",570,67);center("Đã tham gia và hoàn thành\nTên chương trình / Đơn vị tổ chức",760,32);L(150,H-270,440,H-270);L(640,H-270,930,H-270);T("Ngày cấp",150,H-240,290,24,a);T("Đại diện đơn vị",640,H-240,290,24,a);break
   case 3: R(0,0,360,H,k);T("COF\nFEE",55,110,270,98,p,{weight:800});C(75,700,200,a);T("MENU",420,75,580,110,a,{font:"serif"});["Espresso","Cà phê sữa","Cold brew","Trà trái cây","Matcha latte","Bánh trong ngày"].forEach((s,i)=>{T(s,420,360+i*145,410,34);T(`${30+i*5}K`,850,365+i*145,150,31,a,{align:"right"});L(420,440+i*145,1000,440+i*145,a,1)});break
   case 4: title(meta.name,65,90,950,105);tag("HỌC / LÀM / CHIA SẺ",65,400,950);["09:00 / Khởi động","10:00 / Thực hành","11:30 / Chia sẻ"].forEach((s,i)=>{T(s,65,570+i*230,950,50,a);T("Nội dung hoạt động và người hướng dẫn",65,660+i*230,950,29)});break
   case 5: R(0,0,1080,H,a);R(400,0,680,H,p);T("B.",65,110,300,180,p,{font:"serif"});T("Họ tên của bạn",450,90,570,58,k,{weight:700});T("CHỨC DANH / CHUYÊN MÔN",450,190,570,21,a);T("hello@example.com\n(+84) 000 000 000\nĐịa chỉ / Website của bạn",450,300,570,27);break
   case 6: R(70,90,940,H-180,"#ffffff");center("A little note",180,43);center("Cảm ơn\nthật nhiều.",390,125);L(270,900,810,900);center("Vì sự đồng hành và những điều tốt đẹp\nbạn đã mang đến.",1030,35);center("TỪ CHÚNG MÌNH ♡",H-220,27);break
   case 7: R(70,85,940,H-170,k);T("YOU ARE INVITED",125,140,830,29,p);title("Một buổi tối\nđáng nhớ.",125,340,830,105,p);L(125,850,955,850,p);T("NGÀY ___ / GIỜ ___\nĐỊA ĐIỂM CỦA BẠN",125,980,830,43,p);C(15,H-290,120,p);C(945,H-290,120,p);T("VÉ / 001",125,H-210,830,29,p);break
   case 8: title("Tuần của tôi",65,65,950,87);T("Từ ngày ____ đến ngày ____",65,225,950,27,a);for(let i=0;i<7;i++){R(65,350+i*155,950,133,"#ffffff");T(["THỨ HAI","THỨ BA","THỨ TƯ","THỨ NĂM","THỨ SÁU","THỨ BẢY","CHỦ NHẬT"][i],90,375+i*155,900,24,a);L(90,450+i*155,990,450+i*155,a,1)}break
   case 9: R(0,0,1080,320,a);title("Tên đề tài\nnghiên cứu",60,55,960,85,p);T("Tác giả / Đơn vị",60,275,960,26,p);["Bối cảnh","Phương pháp","Kết quả","Thảo luận"].forEach((s,i)=>{const x=60+i%2*500,y=380+Math.floor(i/2)*510;T(s,x,y,460,41,a,{weight:700});for(let j=0;j<4;j++)L(x,y+100+j*55,x+450,y+100+j*55,a,1);if(i===2)[100,170,220].forEach((v,j)=>R(x+30+j*115,y+390-v,65,v,a))});break
   case 10: R(0,0,1080,H,k);T("A GIFT FOR YOU",65,85,950,33,p);T("−20%",65,370,950,240,p,{weight:800});T("PHIẾU ƯU ĐÃI",65,710,950,58,p);L(65,950,1015,950,p);T("MÃ: BLOOM20\nHạn sử dụng: ______\nĐiều kiện áp dụng: ______",65,1050,950,38,p);break
   case 11: R(65,0,30,H,a);C(310,360,560,a,.18);R(330,410,480,480,a,{rot:15});T("NOTE\nBOOK",160,170,850,150,k,{font:"serif",weight:700});T("Ý tưởng / Ghi chú / Những điều hay",160,H-245,800,32,a);break
   case 12: title(meta.name,60,80,960,95);["Cơ bản","Đồng hành","Chuyên sâu"].forEach((s,i)=>{R(60,345+i*330,960,290,i===1?a:"#ffffff");T(s,95,385+i*330,500,47,i===1?p:k);T("LIÊN HỆ",725,405+i*330,250,31,i===1?p:a);T("Phạm vi / Hạng mục / Quyền lợi",95,510+i*330,860,28,i===1?p:k)});break
   case 13: R(0,0,1080,400,a);C(440,60,200,p);T("CONFERENCE / 2026",65,470,950,32,a,{align:"center"});center("HỌ TÊN\nNGƯỜI THAM DỰ",650,95);center("ĐƠN VỊ / CHỨC DANH",1000,35);R(190,H-330,700,150,k);T("ATTENDEE",220,H-282,640,55,p,{align:"center",weight:800});break
   case 14: [0,1,2,3,4,5,6,7,8,9,10,11].forEach(i=>{const angle=i/12*Math.PI*2;C(480+Math.cos(angle)*340,580+Math.sin(angle)*420,100,a,.5)});center("Chúc mừng\nbạn!",500,100);center("MỘT THÀNH TỰU THẬT XỨNG ĐÁNG",H-230,30);break
   case 15: R(0,0,1080,210,k);T("LIBRARY / NOTICE",65,60,950,69,p,{font:"serif"});title("Hẹn bạn\nở thư viện",65,340,950,130);T("THÔNG TIN MỚI",65,850,950,35,a);T("Giờ mở cửa: ______\nSự kiện mới: ______\nLiên hệ: ______",65,1000,950,43);break
   case 16: center("THE DINNER",140,46);center("Một buổi tối\nấm áp",290,95);["KHAI VỊ","MÓN CHÍNH","TRÁNG MIỆNG"].forEach((s,i)=>{center(s,690+i*220,25);center("Tên món / Nguyên liệu theo mùa",755+i*220,33);L(390,840+i*220,690,840+i*220)});break
   case 17: R(0,0,430,H,a);T("LEARN\nSOME\nTHING\nNEW",50,100,340,90,p,{weight:800});T("KHÓA HỌC MỚI",480,90,550,26,a);title("Mở rộng\nthế giới\ncủa bạn.",480,230,540,83);["Nội dung học","Lịch khai giảng","Cách đăng ký"].forEach((s,i)=>{T(s,480,850+i*175,540,35,a);L(480,950+i*175,1020,950+i*175,a,1)});break
   case 18: R(80,100,920,H-200,k);T("MỘT\nTRANG\nSÁCH.",150,330,780,180,p,{font:"serif",weight:700});T("MỘT THẾ GIỚI MỚI.",150,H-510,780,64,p,{font:"serif"});T("ĐANG ĐỌC / TRANG ___",150,H-260,780,33,p);break
   case 19: T("THE CLUB GAZETTE",60,65,960,78,k,{font:"serif",weight:700});L(60,205,1020,205);T("SỐ 01 / THÁNG 11 / 2026",60,240,960,26,a);title("Điều hay\ntrong tháng",60,340,620,85);photo(710,335,310,455,0);["Tin mới","Góc thành viên","Lịch sắp tới"].forEach((s,i)=>{T(s,60+i*330,900,300,33,a);T("Thêm nội dung của bạn.\n\nKết nối và chia sẻ\nnhững ý tưởng mới.",60+i*330,990,290,26)});break
  }
 }
 if(!els.length) { title(meta.name); foot() }
 return els
}
