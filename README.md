# 📚 VocabUp

### Nền tảng học từ vựng và luyện TOEIC theo lộ trình cá nhân

---

## I. Giới thiệu đề tài

### Lý do chọn đề tài

**Hiện trạng:**

Tiếng Anh, đặc biệt là từ vựng và TOEIC, là nhu cầu phổ biến đối với học sinh, sinh viên và người đi làm. Tuy nhiên, quá trình học thường diễn ra trên nhiều ứng dụng và nguồn tài liệu rời rạc.

**Hạn chế thực tế:**

Người học thường gặp các vấn đề sau:

1. Khó quản lý lượng từ vựng đã học và những từ thường xuyên quên.
2. Thiếu một lộ trình kết hợp giữa học từ, luyện nghe, luyện đọc và làm đề TOEIC.
3. Không có công cụ cá nhân hóa để tự tạo bộ từ theo nhu cầu hoặc tài liệu riêng.
4. Khó theo dõi tiến độ, điểm số, streak và hiệu quả học tập theo thời gian.

**Giải pháp:**

`VocabUp` được xây dựng như một nền tảng học tập tập trung, hỗ trợ người dùng:

- Học từ vựng theo khóa học và chủ đề.
- Tự tạo bộ từ cá nhân, nhập dữ liệu và sử dụng AI để hỗ trợ biên soạn.
- Luyện tập qua nhiều chế độ tương tác thay vì chỉ ghi nhớ thụ động.
- Ôn tập đúng thời điểm bằng cơ chế lặp lại ngắt quãng.
- Làm bài TOEIC và quan sát sự tiến bộ qua điểm số, XP và thống kê cá nhân.

---

## II. Yêu cầu chức năng

### Chức năng cốt lõi

| STT | Nhóm chức năng | Mô tả |
|-----|----------------|-------|
| 1 | Tài khoản | Đăng ký, đăng nhập bằng email hoặc Google, đồng bộ phiên đăng nhập với Supabase |
| 2 | Khóa học | Duyệt khóa học, chủ đề và kho flashcard theo từng cấp độ hoặc mục tiêu |
| 3 | Bộ từ cá nhân | Tạo, sửa, xóa, chia sẻ và sao chép chủ đề từ vựng của riêng mình |
| 4 | Import nội dung | Thêm từ thủ công hoặc nhập dữ liệu từ Excel, JSON, văn bản và hình ảnh |
| 5 | Học từ vựng | Flashcard, Quiz, Listening, Typing, Match, Flappy Bird và Vocabulary Rain |
| 6 | Ôn tập thông minh | Quản lý từ đến hạn ôn, đánh giá mức độ nhớ và tính lịch ôn bằng SRS/SM-2 |
| 7 | Luyện TOEIC | Luyện Listening, Reading, từng Part hoặc làm Full Test có giới hạn thời gian |
| 8 | Theo dõi tiến độ | XP, level, streak, daily task, số từ đã nhớ và bảng xếp hạng |
| 9 | Trợ lý AI | Hỏi đáp về từ vựng, bổ sung nghĩa/ví dụ và tạo nhanh nội dung học tập |
| 10 | Góp ý và báo lỗi | Gửi phản hồi trực tiếp từ khu vực cài đặt tài khoản |

### Chức năng mở rộng

- **Quản trị nội dung** — Quản lý người dùng, khóa học, chủ đề, flashcard và đề TOEIC trong khu vực Manager.
- **Import/export dữ liệu** — Sao lưu, chỉnh sửa và phục hồi khóa học hoặc đề thi bằng JSON/Excel.
- **Nội dung AI** — Tạo danh sách từ, bổ sung nghĩa, phiên âm, ví dụ và hỗ trợ phân tích tài liệu.
- **Media TOEIC** — Quản lý passage, hình ảnh và audio cho các nhóm câu hỏi.
- **Phản hồi người dùng** — Tiếp nhận, phân loại và cập nhật trạng thái góp ý hoặc báo lỗi.

---

## III. Kiến trúc và yêu cầu phi chức năng

Ứng dụng được chia thành ba lớp chính:

```text
React + Vite frontend
        │
        │ REST API / Supabase Auth
        ▼
Express backend
        │
        ├── Controllers / Services / Models
        ├── AI proxy và xử lý upload
        ▼
Supabase
        ├── PostgreSQL database
        ├── Authentication
        └── Storage cho media TOEIC
```

### Nguyên tắc triển khai

- Frontend dùng React Router và lazy loading cho các khu vực chức năng.
- Backend tổ chức theo mô hình route → controller → service → model.
- Dữ liệu công khai được cache ngắn hạn để giảm số lần truy vấn.
- Token Supabase được kiểm tra ở backend trước khi truy cập tài nguyên bảo vệ.
- Các bảng dữ liệu quan trọng được bật Row Level Security.
- AI key chỉ được sử dụng ở phía server thông qua endpoint proxy.

| Tiêu chí | Mô tả |
|----------|-------|
| **Hiệu năng** | Lazy loading, cache dữ liệu công khai và chia nhỏ bundle để giảm thời gian tải |
| **Bảo mật** | Xác thực JWT, phân quyền admin, Row Level Security và không đưa secret lên frontend |
| **Khả dụng** | Có loading state, empty state, xử lý lỗi API và dữ liệu guest fallback |
| **Khả năng mở rộng** | Tách frontend, API, service, model và database thành các lớp độc lập |
| **Khả năng sử dụng** | Giao diện responsive, hỗ trợ dark mode và nhiều phương thức học |
| **Khả năng bảo trì** | Code được tổ chức theo module, có script seed/migrate/verify cho dữ liệu |

---

## IV. Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | React 19, Vite, React Router |
| Backend | Node.js, Express |
| Ngôn ngữ | JavaScript, JSX, SQL |
| Cơ sở dữ liệu | Supabase PostgreSQL |
| Xác thực | Supabase Auth, JWT, Google OAuth |
| Lưu trữ file | Supabase Storage hoặc local storage khi chạy local |
| AI | OpenAI-compatible Chat Completions API |
| Import dữ liệu | XLSX, JSZip, PDF.js, Tesseract.js |
| Giao diện | CSS thuần, responsive layout, dark mode |
| Quản lý mã nguồn | Git và GitHub |
| Triển khai | Vercel hoặc môi trường Node.js tương thích |

---

## V. Thành viên nhóm

|     Họ tên     |   MSSV   | Vai trò |     GitHub     |
|----------------|----------|---------|----------------|
| Vũ Quang Dương | 22010057 |   ...   | Quangduong2703 |
| Đỗ Đức Việt    | 23010382 |   ...   |   vietdo2607   |
| Nguyễn Văn An  | 23010906 |   ...   |  AnNguyen1203  |
