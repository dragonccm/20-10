export type StudioCategory = "presentations" | "social" | "photos" | "video" | "print" | "docs" | "whiteboard" | "sheets" | "code" | "websites" | "email" | "cv"
export type Format = { id: StudioCategory; name: string; short: string; description: string; color: string; engine: "canvas" | "cv" | "writing" | "video" | "sheet" | "html"; output: string; w: number; h: number }
export const FORMATS: Format[] = [
  { id:"presentations",name:"Thuyết trình",short:"Slide",description:"Bộ slide nhiều trang, chữ và hình chỉnh riêng",color:"#f97316",engine:"canvas",output:"PPTX · PNG · JPG",w:1920,h:1080 },
  { id:"social",name:"Mạng xã hội",short:"Mạng xã hội",description:"Bài đăng, story, bìa và thumbnail",color:"#ec4899",engine:"canvas",output:"PNG · JPG",w:1080,h:1350 },
  { id:"photos",name:"Ảnh",short:"Ảnh",description:"Bố cục ảnh và collage; thay bằng ảnh của bạn",color:"#0891b2",engine:"canvas",output:"PNG · JPG",w:1080,h:1080 },
  { id:"video",name:"Video",short:"Video",description:"Video chữ chuyển động, sửa nội dung và thời lượng",color:"#d946ef",engine:"video",output:"WebM / MP4 tùy trình duyệt",w:1280,h:720 },
  { id:"print",name:"In ấn",short:"In ấn",description:"Poster, thiệp, thực đơn và chứng nhận",color:"#9333ea",engine:"canvas",output:"PNG · JPG · PDF qua in",w:1240,h:1754 },
  { id:"docs",name:"Tài liệu",short:"Docs",description:"Soạn báo cáo, thư và phiếu học tập",color:"#0e7490",engine:"writing",output:"Word · PDF",w:1240,h:1754 },
  { id:"whiteboard",name:"Whiteboard",short:"Whiteboard",description:"Sơ đồ và kế hoạch bằng các khối kéo thả",color:"#16a34a",engine:"canvas",output:"PNG · JPG",w:2400,h:1500 },
  { id:"sheets",name:"Bảng tính",short:"Sheets",description:"Sửa ô, công thức cơ bản và xuất dữ liệu",color:"#0284c7",engine:"sheet",output:"CSV · JSON",w:1200,h:800 },
  { id:"code",name:"Code",short:"Code",description:"HTML/CSS/JS, xem trước trong vùng cách ly",color:"#7c3aed",engine:"html",output:"HTML",w:1440,h:900 },
  { id:"websites",name:"Website",short:"Website",description:"Trang web tự chứa, sửa mã và tải HTML",color:"#6366f1",engine:"html",output:"HTML",w:1440,h:900 },
  { id:"email",name:"Email",short:"Email",description:"Email HTML, nội dung và bố cục bảng",color:"#4338ca",engine:"html",output:"HTML",w:600,h:900 },
  { id:"cv",name:"CV & hồ sơ",short:"CV",description:"Sửa từng mục và xem trước hồ sơ A4",color:"#059669",engine:"cv",output:"PDF · JSON",w:794,h:1123 },
]
