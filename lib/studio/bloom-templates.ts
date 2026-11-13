import { blank, fitText, type Design } from "./design"
import { nativeScene, SCENE_NAMES } from "./native-scenes"
import { uid } from "./storage"
import type { StudioCategory } from "./design-formats"

export type BloomTemplate = { id: string; name: string; category: StudioCategory; caption: string; style: number; accent: string; paper: string; ink: string; w: number; h: number; title: string; subtitle: string }
const PALETTES = [
 ["#426751","#f4f2e9","#243c32"], ["#9b5146","#f6eee6","#3c302b"], ["#176a59","#eef5ec","#213b32"], ["#385d78","#f0f3f5","#24394a"],
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
 return { id:`bloom-${category}-${String(i+1).padStart(2,"0")}`,name,category:category as StudioCategory,caption:SCENE_NAMES[category as keyof typeof SCENE_NAMES][i],style:i,accent,paper,ink,w,h,title:name,subtitle:category==="social"?"Ý tưởng của bạn xứng đáng được chia sẻ.":"Một khởi đầu để bạn kể câu chuyện của mình." }
}))
export function buildBloomDesign(meta: BloomTemplate, page=0): Design {
 const design:Design = {...blank(meta.w,meta.h,meta.name),bg:{from:meta.paper,to:meta.paper,angle:135},els:nativeScene(meta,page),provenance:{kind:"bloom",templateId:meta.id,license:"CC0-1.0"}}
 return typeof document === "undefined" ? design : {...design,...fitText(design,false)}
}
export function buildBloomDeck(meta: BloomTemplate): Design[] {
 const deck={id:uid(),name:meta.name,revision:5,source:"bloom" as const}
 return Array.from({length:5},(_,page)=>({...buildBloomDesign(meta,page),name:`${meta.name} · ${page+1}`,deck}))
}
