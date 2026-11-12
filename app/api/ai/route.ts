import { companionReply } from "@/lib/studio/companion"
import { designActionSchema } from "@/lib/studio/design-actions"
// AI gateway: forwards a whitelisted task to an OpenAI-compatible endpoint (e.g. GLM).
// Configure with AI_BASE_URL, AI_API_KEY, AI_MODEL. Document content is never logged.

export const runtime = "nodejs"

const MAX_CHARS = 24000
const LANG: Record<string, string> = { en: "tiếng Anh", ko: "tiếng Hàn", vi: "tiếng Việt" }

function config() {
  const base = process.env.AI_BASE_URL
  const key = process.env.AI_API_KEY
  const model = process.env.AI_MODEL
  return base && key && model ? { base: base.replace(/\/+$/, ""), key, model } : null
}

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
type Spec = { system: string; user: string | Part[]; json?: boolean; temperature?: number }

const MAX_IMAGE_CHARS = 4_000_000 // ~3MB of base64; the client downscales photos well below this
const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

// Bloom is a gift to turn to when help is wanted; never turn absence into a debt.
const TEACHER =
  "Bạn là trợ lý đồng hành nhẹ nhàng, giúp người dùng đúng việc họ đang cần. Xưng mình và gọi người dùng là bạn khi phù hợp. Giải thích bằng tiếng Việt, ngắn gọn, rõ ràng, tôn trọng lựa chọn của người dùng. Khi góp ý, nói cụ thể điều có thể sửa và lý do; không phán xét năng lực hay sự chăm chỉ. Không thúc ép học, không tạo cảm giác tội lỗi vì nghỉ hoặc vắng mặt, không tự giao bài hay đặt mục tiêu nếu người dùng chưa yêu cầu. Không bịa nguồn, không bịa DOI. Nói rõ khi chưa đủ thông tin. Không dùng emoji."


function str(v: unknown, max = MAX_CHARS) {
  return typeof v === "string" ? v.slice(0, max) : ""
}

function build(task: string, b: Record<string, unknown>): Spec | null {
  const text = str(b.text)
  const lang = LANG[str(b.lang, 4)] ?? "ngôn ngữ của văn bản"
  switch (task) {
    case "companion":
      return {json:true,temperature:.6,system:TEACHER+` Bạn là Bloom, một trợ lý AI được thiết kế như một người bạn đồng hành. Có thể trò chuyện tự nhiên, lắng nghe hoặc giúp một việc nhỏ. Luôn trung thực rằng mình là AI, không giả là người thật, không tự nhận có cảm xúc, không tạo quan hệ độc quyền hoặc khiến người dùng phụ thuộc. Không nói mình nhớ người dùng khi họ vắng mặt, không gắn tình cảm của người tặng với việc dùng ứng dụng. Không suy đoán chẩn đoán tâm lý hay tính cách từ lời tâm sự. Không tự biến tâm sự thành bài tập, lịch học hoặc lời khuyên khi người dùng chỉ muốn được nghe. Chỉ hỏi một câu ngắn khi thật sự cần làm rõ. Tôn trọng chế độ trong yêu cầu: chat nghĩa là chỉ trò chuyện, draft và tool luôn null; help mới được đề xuất thao tác nếu người dùng thực sự yêu cầu. Bạn không được truy cập tài liệu, màn hình hay dữ liệu chưa được đưa vào cuộc trò chuyện. Không được nói đã thực hiện thao tác; giao diện mới thực hiện khi có quyền. Khả năng thao tác hiện tại: đề xuất bản nháp văn bản mới và đề xuất mở một công cụ; chưa thể tự sửa file, gửi mail, đăng bài hay điều khiển ứng dụng khác. Không hứa chức năng chưa có. Trả JSON đúng dạng {"reply":"lời trả lời tiếng Việt","draft":null hoặc {"title":"tên bản nháp","text":"văn bản thuần"},"tool":null hoặc "documents"|"writing"|"photos"|"slides"|"career"|"language"}. Văn bản trong draft là nội dung có thể sửa, không HTML.`,user:text}

    case "grammar":
      return {
        json: true,
        system:
          TEACHER +
          ` Nhiệm vụ: tìm lỗi ngữ pháp, chính tả, dùng từ, tiểu từ trong văn bản ${lang}. ` +
          'Chỉ trả về JSON dạng {"issues":[{"original":"...","suggested":"...","category":"...","explanation":"..."}]}. ' +
          '"original" phải là đoạn trích NGUYÊN VĂN, xuất hiện chính xác trong văn bản, ngắn nhất có thể nhưng đủ để xác định duy nhất (một cụm từ hoặc một câu). ' +
          '"suggested" là bản sửa cho đúng đoạn đó. "category" là một trong: grammar, spelling, word-choice, particle, punctuation, style. ' +
          '"explanation" bằng tiếng Việt, 1–2 câu. Không sửa những chỗ đã đúng. Tối đa 30 lỗi. Nếu không có lỗi, trả về {"issues":[]}.',
        user: text,
      }
    case "structure":
      return {
        system:
          TEACHER +
          ` Nhận xét cấu trúc bài viết ${lang}: luận điểm chính, bố cục mở–thân–kết, tính mạch lạc giữa các đoạn, lập luận và dẫn chứng. ` +
          "Trình bày bằng các mục ngắn: Điểm mạnh, Cần cải thiện (kèm gợi ý cụ thể theo từng đoạn), Bước tiếp theo. Không viết lại toàn bài." +
          (str(b.requirements) ? ` Yêu cầu của đề bài: ${str(b.requirements, 2000)}` : ""),
        user: text,
      }
    case "outline":
      return {
        system:
          TEACHER +
          ` Lập dàn ý chi tiết bằng ${lang} cho bài viết, gồm mở bài, các đoạn thân bài (mỗi đoạn: câu chủ đề + ý triển khai + gợi ý loại dẫn chứng) và kết bài. Không viết thành bài hoàn chỉnh.`,
        user: text,
      }
    case "summarize":
      return { system: TEACHER + " Tóm tắt văn bản sau bằng tiếng Việt trong 3–6 gạch đầu dòng, giữ ý chính.", user: text }
    case "academic":
      return {
        system:
          TEACHER +
          ` Viết lại đoạn văn sau theo văn phong học thuật bằng ${lang}, giữ nguyên ý và độ dài tương đương. Chỉ trả về đoạn đã viết lại, không giải thích.`,
        user: text,
      }
    case "translate": {
      const target = LANG[str(b.target, 4)] ?? "tiếng Việt"
      return {
        system: `Dịch chính xác, tự nhiên sang ${target}. Giữ thuật ngữ học thuật. Chỉ trả về bản dịch.`,
        user: text,
      }
    }
    case "korean":
      return {
        system:
          TEACHER +
          " Kiểm tra câu tiếng Hàn của người học. Trình bày: 1) Câu đã sửa (nếu cần), 2) Giải thích từng lỗi (tiểu từ, đuôi câu, chia động từ, kính ngữ), 3) Ý nghĩa tiếng Việt, 4) Một câu ví dụ tương tự.",
        user: text,
      }
    case "english":
      return {
        system:
          TEACHER +
          " Bạn là chuyên gia học thuật Cambridge. Kiểm tra câu tiếng Anh của người học. Trình bày: 1) Câu đã sửa chuẩn học thuật (Formal Academic English), 2) Giải thích chi tiết các lỗi (ngữ pháp, collocations, giới từ, sự phù hợp ngữ cảnh), 3) Gợi ý từ/cụm từ học thuật tương đương theo chuẩn Cambridge AWL / C1, 4) Dịch nghĩa tiếng Việt.",
        user: text,
      }
    case "interview":
      return {
        system:
          TEACHER +
          ` Bạn là người phỏng vấn tuyển dụng. Câu hỏi: "${str(b.question, 500)}". Nhận xét câu trả lời của ứng viên theo STAR (Situation, Task, Action, Result): điểm tốt, điểm thiếu, gợi ý cải thiện cụ thể, và lỗi ngôn ngữ nếu có. Không viết lại toàn bộ câu trả lời.`,
        user: text,
      }
    case "vocab": {
      const image = typeof b.image === "string" ? b.image : ""
      const instruction =
        "Trích từ vựng tiếng Hàn đáng học (danh từ, động từ, tính từ, trạng từ; bỏ qua tiểu từ, tên riêng, số). " +
        'Chỉ trả về JSON {"cards":[{"front":"...","back":"...","example":"..."}]}. ' +
        '"front": từ ở dạng từ điển, chia ĐÚNG gốc của từ xuất hiện trong bài (vd 끝내고 -> 끝내다, không phải 끝나다; 공부합니다 -> 공부하다). ' +
        '"back": nghĩa tiếng Việt ngắn gọn, đúng với ngữ cảnh. "example": câu chứa từ đó, trích nguyên văn từ nguồn. ' +
        "Không lặp từ. Tối đa 25 từ. Nếu không có chữ tiếng Hàn, trả về {\"cards\":[]}."
      if (image) {
        return {
          json: true,
          system: TEACHER + " " + instruction,
          user: [
            { type: "text", text: text ? `Ghi chú của người học: ${text.slice(0, 500)}` : "Trích từ vựng từ ảnh này." },
            { type: "image_url", image_url: { url: image } },
          ],
        }
      }
      return { json: true, system: TEACHER + " " + instruction, user: text }
    }
    case "cite-queries":
      return {
        json: true,
        system:
          TEACHER +
          " Người học có một đoạn văn học thuật và chưa biết cần dẫn nguồn cho ý nào. " +
          "Hãy xác định tối đa 3 nhận định trong đoạn cần có nguồn học thuật (số liệu, kết quả nghiên cứu, khái niệm, nhận định không phải hiểu biết phổ thông). " +
          'Chỉ trả về JSON {"advice":"...","claims":[{"claim":"...","why":"...","query":"..."}]}. ' +
          '"advice": 1–2 câu tiếng Việt giải thích ngắn đoạn này cần loại nguồn gì. ' +
          '"claim": trích nguyên văn ngắn gọn nhận định trong đoạn. "why": 1 câu tiếng Việt vì sao cần dẫn nguồn. ' +
          '"query": cụm từ khóa TIẾNG ANH 4–10 từ để tìm bài báo khoa học trên Crossref (thuật ngữ học thuật, không dùng dấu ngoặc kép, không toán tử). ' +
          'Không đề xuất tên bài báo, tác giả hay DOI cụ thể. Nếu đoạn văn không có ý nào cần dẫn nguồn, trả về {"advice":"...","claims":[]}.',
        user: text,
      }
    case "cite-rank":
      return {
        json: true,
        system:
          TEACHER +
          " Bạn nhận một đoạn văn và danh sách các bài báo THẬT (đánh số i) lấy từ Crossref. " +
          "Đánh giá mỗi bài có thể dùng làm nguồn cho đoạn văn không, CHỈ dựa vào tiêu đề, tạp chí và tóm tắt được cung cấp. " +
          'Chỉ trả về JSON {"ranked":[{"i":0,"score":0,"reason":"..."}]}. ' +
          '"score": 3 = hỗ trợ trực tiếp nhận định, 2 = liên quan rõ, 1 = liên quan một phần, 0 = không liên quan. ' +
          '"reason": 1 câu tiếng Việt nêu bài này nói về gì và hỗ trợ ý nào; nếu không có tóm tắt thì nói rõ là chỉ đánh giá theo tiêu đề. ' +
          "Không thêm bài nào ngoài danh sách, không bịa nội dung bài.",
        user: text,
      }
    case "html-edit":
      return { json: true, system: "Bạn là trợ lý chỉnh HTML/CSS/JS. Nhận mã và yêu cầu, trả JSON {html: toàn bộ mã đã chỉnh, summary: mô tả ngắn tiếng Việt}. Giữ nội dung không được yêu cầu. Mã tự chứa, không tài nguyên ngoài, không kết nối mạng hay thu thập dữ liệu. Với email: dùng bảng và CSS inline, không JavaScript. Với website/code: HTML có lang vi, viewport và accessibility. Không bịa backend gửi thư, thanh toán hay dịch vụ thực tế.", user: text }
    case "design-action":
      return {
        json: true,
        system: "Bạn là trợ lý biên tập thiết kế. Chỉ trả JSON {summary: mô tả ngắn tiếng Việt, operations: [...]} . " +
          "Ngữ cảnh gồm w,h,bg và els có id cố định. Không tạo lại toàn bộ trang. " +
          "Các lệnh hợp lệ: {op:'update',id,changes:{...}}, {op:'remove',id}, {op:'add',element:{type:'text|rect|circle',x,y,w,h,...}}, {op:'background',from:'#rrggbb',to:'#rrggbb',angle:135}. " +
          "changes chỉ được gồm x,y,w,h,rot,opacity,text,fontSize,color,fill,weight,align,font,italic,lineHeight,radius. Không thêm src, ảnh, id, URL, mã hoặc thuộc tính khác. " +
          "Nếu có selectedId: CHỈ update/remove đúng id đó, không thêm lớp hay đổi nền. Không sửa bất kỳ lớp locked=true nào. " +
          "Giữ nguyên nội dung không được yêu cầu, tọa độ theo pixel; không làm chữ tràn trang; màu #rrggbb; tối đa 80 lệnh. " +
          "Với yêu cầu dịch/sửa chính tả/rút gọn, chỉ sửa text của các lớp văn bản liên quan. Với phối màu, chỉ sửa color/fill/nền cần thiết. " +
          "Với yêu cầu bố cục, giữ ảnh và chữ, chỉ thay vị trí/kích thước liên quan. Không tự xóa hình trang trí nếu không được yêu cầu.",
        user: text,
      }
    case "design": {
      const imgs = Array.isArray(b.images) ? (b.images as string[]) : []
      return {
        json: true,
        temperature: 0.7,
        system:
          "Bạn là nhà thiết kế đồ họa chuyên nghiệp, làm ấn phẩm cho sinh viên (poster, bài đăng mạng xã hội, slide, thẻ học). " +
          `Hôm nay là ngày ${new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}; nếu cần ghi năm thì dùng năm hiện tại. ` +
          "Bạn tạo hoặc chỉnh thiết kế dạng JSON để phần mềm vẽ lên canvas. Toạ độ là pixel, gốc (0,0) ở góc trên trái. " +
          'Chỉ trả về JSON: {"name":"...","w":1080,"h":1080,"bg":{"from":"#rrggbb","to":"#rrggbb","angle":135},"els":[...]}. ' +
          "Mỗi phần tử trong els (vẽ theo thứ tự, phần tử sau đè lên phần tử trước) là một trong: " +
          '{"type":"text","x","y","w","h","text","fontSize","color","weight":400|500|600|700|800,"align":"left|center|right","font":"sans|serif","italic":bool,"lineHeight":1.1-1.6,"shadow":bool,"opacity":0-1,"rot":0-359}; ' +
          '{"type":"rect","x","y","w","h","fill","radius","opacity","shadow"}; {"type":"circle","x","y","w","h","fill","opacity"}; ' +
          '{"type":"image","ref":"imgN","x","y","w","h","radius"} (chỉ dùng lại ảnh có sẵn trong thiết kế hiện tại, giữ đúng tỉ lệ w/h của ảnh, không tự thêm ảnh mới). ' +
          "Nguyên tắc thiết kế: " +
          "1) Lề an toàn ít nhất 7% chiều rộng; không để chữ tràn ra ngoài trang. " +
          "2) Phân cấp rõ: tiêu đề 8–14% chiều rộng, phụ đề 4–5%, nội dung 3–4%; tối đa 3 cỡ chữ. " +
          "3) Chiều cao hộp chữ h >= số dòng × fontSize × lineHeight; tự xuống dòng bằng \n khi dòng dài hơn khoảng w/(0.55×fontSize) ký tự. " +
          "4) Bảng màu hài hòa 2–3 màu chính, chữ tương phản tốt với nền ngay dưới nó. " +
          "5) Dùng hình tròn/khối mờ (opacity 0.15–0.45) làm họa tiết ở góc, thẻ nền trắng bo góc (radius 24–60) để nhóm nội dung, nút dạng viên thuốc cho lời kêu gọi. " +
          "6) Căn chỉnh theo lưới, khoảng cách đều; 6–18 phần tử. " +
          "7) Nội dung thật, cụ thể, đúng ngôn ngữ người dùng yêu cầu (mặc định tiếng Việt; tiếng Hàn phải đúng chính tả). Không dùng emoji, không dùng ký tự đặc biệt lạ. " +
          "Ảnh người dùng: sticker (nền trong suốt) đặt tự do làm điểm nhấn, có thể chồng lên khối màu hoặc cạnh tiêu đề, không bo góc; ảnh chụp có nền đặt trong khung bo góc hoặc phủ kín một vùng. Ảnh không được che chữ. Chọn màu nền và màu nhấn hợp với màu trong ảnh. " +
          "Khi chỉnh sửa thiết kế có sẵn: giữ nội dung và bố cục những phần người dùng không nhắc tới, chỉ thay đổi đúng yêu cầu, giữ nguyên các phần tử image (ref).",
        user: imgs.length
          ? [{ type: "text", text }, ...imgs.map((url): Part => ({ type: "image_url", image_url: { url } }))]
          : text,
      }
    }
    case "cv-theme":
      return {
        json: true,
        temperature: 0.6,
        system:
          "Bạn là nhà thiết kế CV chuyên nghiệp. Dựa trên mô tả của người dùng, tạo một mẫu giao diện CV dạng JSON. " +
          'Chỉ trả về JSON: {"name":"tên mẫu ngắn tiếng Việt","layout":"classic|banner|sidebar|timeline|minimal|split|korean","side":"left|right",' +
          '"accent":"#rrggbb","ink":"#rrggbb","paper":"#rrggbb","panel":"#rrggbb","panel2":"#rrggbb","panelInk":"#rrggbb",' +
          '"font":"sans|serif|mix","heading":"underline|bar|pill|caps|dot","density":"compact|normal|airy","photo":"none|circle|rounded|square","skills":"tags|list|text"}. ' +
          "Ý nghĩa: layout classic = một cột, viền nhấn bên trái tên; banner = dải màu đầu trang; sidebar = cột bên tô màu (side chọn trái/phải); " +
          "timeline = dòng thời gian cho kinh nghiệm; minimal = căn giữa, thanh lịch; split = tên trái, liên hệ phải, thân hai cột; korean = 이력서 dạng bảng kẻ ô kiểu Hàn Quốc. " +
          "accent = màu nhấn tiêu đề mục; ink = màu chữ chính (tối, dễ đọc); paper = nền trang (trắng hoặc rất nhạt); panel/panel2 = màu cột bên hoặc dải đầu trang (panel2 để làm chuyển màu, bằng panel nếu không cần); panelInk = màu chữ trên panel, phải tương phản tốt. " +
          "font mix = tiêu đề có chân, nội dung không chân. CV phải chuyên nghiệp, dễ đọc khi in, màu không quá chói. " +
          "Nếu có mẫu hiện tại, chỉ thay đổi những gì người dùng yêu cầu.",
        user: text,
      }
    case "cover-letter":
      return {
        system:
          TEACHER +
          " Góp ý và chỉnh sửa thư xin việc sau cho chuyên nghiệp, tự nhiên, giữ nguyên thông tin thật của người viết, không thêm thành tích không có. Trả về bản đã chỉnh, sau đó là 3 gạch đầu dòng giải thích các thay đổi chính.",
        user: text,
      }
    case "doc-review": {
      const kind = str(b.kind, 10)
      const focus: Record<string, string> = {
        essay:
          "Đây là bài luận / bài viết học thuật. Nhận xét theo các mục: **Tổng quan** (1–2 câu), **Luận điểm chính**, **Cấu trúc và mạch lạc**, **Lập luận và dẫn chứng**, **Ngôn ngữ** (từ vựng, ngữ pháp, văn phong; trích vài ví dụ nguyên văn kèm cách sửa), **Ước lượng mức điểm** (IELTS Writing band nếu là tiếng Anh, TOPIK 쓰기 nếu là tiếng Hàn, thang 10 nếu tiếng Việt; nói rõ đây chỉ là ước lượng), và **3 việc nên sửa trước**.",
        cv:
          "Đây là CV. Hãy nhận xét như một nhà tuyển dụng: **Ấn tượng trong 6 giây đầu**, **Điểm mạnh**, **Điểm cần cải thiện** (cụ thể từng mục), **Thông tin còn thiếu**, **Từ khóa nên có** cho vị trí phù hợp, và **Gợi ý viết lại** 3 gạch đầu dòng tiêu biểu (chỉ dùng thông tin có thật trong CV, không bịa thành tích).",
        slides:
          "Đây là bài thuyết trình (văn bản trích từ các slide, có đánh dấu [Slide n]). Nhận xét: **Tổng quan và thông điệp chính**, **Mạch trình bày** (mở đầu, thân, kết), **Góp ý từng slide** (mỗi slide 1–2 dòng: quá nhiều chữ, thiếu ý, gợi ý hình minh họa...), **Thời lượng ước tính**, và **3 cải thiện quan trọng nhất**.",
        other:
          "Hãy giúp người học nắm tài liệu này: **Nội dung chính** (5–8 gạch đầu dòng), **Cấu trúc tài liệu**, **Thuật ngữ / khái niệm quan trọng** (giải thích ngắn), **Câu hỏi gợi mở** để tự kiểm tra hiểu bài.",
      }
      return { system: TEACHER + " " + (focus[kind] ?? focus.other) + " Trình bày bằng Markdown với tiêu đề ## và gạch đầu dòng.", user: text }
    }
    case "slide-script": {
      const minutes = Math.min(30, Math.max(1, Number(b.minutes) || 5))
      return {
        system:
          TEACHER +
          ` Viết kịch bản nói cho bài thuyết trình dưới đây bằng ${lang}, tổng thời lượng khoảng ${minutes} phút. ` +
          "Với mỗi slide, viết tiêu đề ## Slide n, rồi lời nói tự nhiên như đang nói trước lớp (không đọc lại nguyên văn slide), kèm câu chuyển ý sang slide sau. Thêm gợi ý ngắn trong ngoặc vuông về điệu bộ hoặc nhấn giọng khi cần. Cuối cùng là 3 câu hỏi khán giả có thể hỏi và gợi ý trả lời.",
        user: text,
        temperature: 0.6,
      }
    }
    case "doc-chat": {
      const history = str(b.history, 6000)
      return {
        system:
          TEACHER +
          " Trả lời câu hỏi của người học CHỈ dựa trên tài liệu được cung cấp. Khi có thể, nêu vị trí (ví dụ: Slide 3, Trang 2, đoạn mở bài). Nếu tài liệu không có thông tin, nói rõ là tài liệu không đề cập rồi mới gợi ý ngắn từ kiến thức chung (ghi rõ đó là kiến thức ngoài tài liệu). Trả lời ngắn gọn, bằng ngôn ngữ người học dùng để hỏi.",
        user: `TÀI LIỆU:\n${text}\n\n${history ? `HỘI THOẠI TRƯỚC:\n${history}\n\n` : ""}CÂU HỎI: ${str(b.question, 2000)}`,
      }
    }
    case "doc-quiz": {
      const count = Math.min(15, Math.max(3, Number(b.count) || 8))
      return {
        json: true,
        temperature: 0.5,
        system:
          TEACHER +
          ` Tạo ${count} câu hỏi trắc nghiệm giúp ôn tập nội dung tài liệu (kiểm tra hiểu, không hỏi chi tiết vụn vặt). Câu hỏi và đáp án viết bằng ngôn ngữ của tài liệu; phần giải thích bằng tiếng Việt. ` +
          'Chỉ trả về JSON {"questions":[{"q":"...","options":["...","...","...","..."],"answer":0,"explain":"..."}]}, "answer" là chỉ số (0–3) của đáp án đúng, các phương án nhiễu phải hợp lý. Mỗi câu chỉ có một đáp án đúng dựa trên tài liệu.',
        user: text,
      }
    }
    case "cv-parse":
      return {
        json: true,
        temperature: 0.1,
        system:
          "Bạn trích xuất thông tin từ CV thành JSON. Chỉ dùng thông tin có trong văn bản, không bịa, không dịch, giữ nguyên ngôn ngữ gốc. Trường nào không có thì để chuỗi rỗng hoặc mảng rỗng. " +
          'Trả về JSON {"lang":"vi|en|ko","name":"","title":"vị trí / chức danh mong muốn","email":"","phone":"","location":"","link":"","summary":"","education":[{"school":"","degree":"","from":"","to":"","detail":""}],"experience":[{"org":"","role":"","from":"","to":"","bullets":["..."]}],"projects":[{"name":"","detail":""}],"skills":["..."],"languages":[{"name":"","level":""}],"certificates":["..."]}. ' +
          '"from"/"to" giữ dạng ngắn như trong CV (vd 06/2025, 2023); "to" để rỗng nếu là hiện tại. Hoạt động CLB, tình nguyện, thực tập đưa vào experience. "lang" là ngôn ngữ chính của CV.',
        user: text,
      }
    case "ocr": {
      const image = typeof b.image === "string" ? b.image : ""
      return {
        temperature: 0,
        system:
          "Chép lại CHÍNH XÁC toàn bộ chữ trong ảnh tài liệu (có thể là tiếng Việt, tiếng Anh, tiếng Hàn). Giữ nguyên thứ tự đọc, tách đoạn bằng một dòng trống, giữ gạch đầu dòng. Không dịch, không sửa lỗi, không thêm lời bình. Chỉ trả về văn bản đã chép.",
        user: [
          { type: "text", text: "Chép lại chữ trong ảnh này." },
          { type: "image_url", image_url: { url: image } },
        ],
      }
    }
    default:
      return null
  }
}

function parseJson(content: string) {
  const cleaned = content.replace(/```(?:json)?/gi, "")
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

/**
 * Extract the assistant text from an upstream body. Handles plain JSON, JSON followed by a
 * trailing "data: [DONE]" (some gateways), and real SSE streams of delta chunks.
 */
function readContent(raw: string): string {
  const body = raw.trim()
  const fromCompletion = (d: { choices?: { message?: { content?: string }; delta?: { content?: string } }[] }) =>
    d?.choices?.[0]?.message?.content ?? d?.choices?.[0]?.delta?.content ?? ""

  if (body.startsWith("{")) {
    const jsonPart = body.replace(/\s*data:\s*\[DONE\]\s*$/, "")
    try {
      return fromCompletion(JSON.parse(jsonPart))
    } catch {
      /* fall through to SSE parsing */
    }
  }
  let out = ""
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^data:\s*(.*)$/)
    if (!m || m[1] === "[DONE]") continue
    try {
      out += fromCompletion(JSON.parse(m[1]))
    } catch {
      /* ignore keep-alives / partial lines */
    }
  }
  return out
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export async function GET() {
  return Response.json({ configured: !!config() })
}

export async function POST(req: Request) {
  const c = config()
  if (!c) return error("AI chưa được cấu hình trên máy chủ, các chức năng khác vẫn dùng bình thường.", 503)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return error("Yêu cầu không hợp lệ.", 400)
  }

  const raw = typeof body.text === "string" ? body.text : ""
  const image = typeof body.image === "string" ? body.image : ""
  if (image) {
    if (body.task !== "vocab" && body.task !== "ocr") return error("Tác vụ này không nhận ảnh.", 400)
    if (image.length > MAX_IMAGE_CHARS) return error("Ảnh quá lớn, hãy chụp lại hoặc cắt bớt.", 413)
    if (!IMAGE_RE.test(image)) return error("Định dạng ảnh không hợp lệ (chỉ nhận JPG, PNG, WebP).", 400)
  }
  if (body.images !== undefined) {
    const list = body.images
    if (body.task !== "design" || !Array.isArray(list) || list.length > 4) return error("Ảnh gửi kèm không hợp lệ.", 400)
    if (list.some((u) => typeof u !== "string" || u.length > 800_000 || !IMAGE_RE.test(u))) return error("Ảnh xem trước không hợp lệ hoặc quá lớn.", 413)
  }
  if (!raw.trim() && !image) return error("Chưa có nội dung để xử lý.", 400)
  if (raw.length > MAX_CHARS) return error(`Văn bản quá dài (tối đa ${MAX_CHARS.toLocaleString("vi-VN")} ký tự mỗi lần).`, 413)

  const spec = build(String(body.task), body)
  if (!spec) return error("Tác vụ không được hỗ trợ.", 400)

  const send = (useJsonMode: boolean) =>
    fetch(`${c.base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${c.key}` },
      body: JSON.stringify({
        model: c.model,
        temperature: spec.temperature ?? 0.3,
        messages: [
          { role: "system", content: spec.system },
          { role: "user", content: spec.user },
        ],
        ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.any([req.signal, AbortSignal.timeout(120000)]),
    })

  let res: Response
  try {
    res = await send(!!spec.json)
    if (!res.ok && spec.json && res.status === 400) res = await send(false)
  } catch {
    return error("Không kết nối được tới dịch vụ AI.", 502)
  }
  if (!res.ok) {
    console.error(`[ai] upstream status ${res.status} for task ${String(body.task)}`)
    return error("Dịch vụ AI trả về lỗi, thử lại sau nhé.", 502)
  }

  const content = readContent(await res.text())

  if (spec.json) {
    const parsed = parseJson(content)
    if (!parsed) return error("AI trả về dữ liệu không đúng định dạng, thử lại nhé.", 502)
    if (body.task === "companion" && !companionReply.safeParse(parsed).success) return error("Mình chưa sắp xếp được câu trả lời. Bạn thử lại nhé.", 502)
    if (body.task === "design-action" && !designActionSchema.safeParse(parsed).success) return error("AI đề xuất thao tác chưa hợp lệ. Hãy thử lại.", 502)
    return Response.json(parsed)
  }
  return Response.json({ text: content.trim() })
}
