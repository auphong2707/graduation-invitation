# Graduation Invitation — Âu Trung Phong

Thiệp mời tốt nghiệp một trang. **Không cần Node, không có bước build** — chỉ là HTML/CSS/JS tĩnh, chạy thẳng trên GitHub Pages.

```
index.html          cấu trúc trang
styles.css          toàn bộ giao diện
main.js             opening, countdown, calendar, attendance
config.js           ← thông tin sự kiện + Supabase (sửa ở đây)
public/profile.jpg  ← ảnh chân dung của bạn (vuông, ≥ 600×600; .jpg/.png/.webp đều được)
public/og-image.jpg ảnh preview khi chia sẻ link (1200×630)
supabase/schema.sql bảng attendance (chỉ cho INSERT)
```

## Xem thử trên máy

Mở `index.html` bằng trình duyệt là chạy. (Hoặc `python3 -m http.server` rồi vào http://localhost:8000.)

## Ảnh chân dung

Chép ảnh vào `public/` với tên `profile.jpg`, `profile.png` hoặc `profile.webp` (trang tự thử cả ba định dạng; tên khác thì sửa `profileImage` trong `config.js`). Ảnh tự crop tròn (`object-fit: cover`), nên để khuôn mặt ở giữa khung. Chưa có ảnh thì trang hiển thị vòng tròn monogram “ATP”.

## Deploy lên GitHub Pages

1. Tạo repo trên GitHub, rồi đẩy thư mục này lên nhánh `main`:
   ```bash
   git init && git add . && git commit -m "Graduation invitation"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPOSITORY.git
   git push -u origin main
   ```
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` tự chạy; vài phút sau trang có ở
   `https://USERNAME.github.io/REPOSITORY/`.

Mọi đường dẫn đều là tương đối, nên chạy đúng ở bất kỳ tên repo nào — không cần cấu hình `base`.

> Cách đơn giản hơn nữa: bỏ qua workflow, chọn **Source: Deploy from a branch → main / (root)**. Khi đó hãy điền Supabase thẳng vào `config.js`.

## Attendance (Supabase)

1. Tạo project tại https://supabase.com → **SQL Editor** → chạy `supabase/schema.sql`.
2. **Project Settings → API**: lấy *Project URL* và *anon / publishable key*.
3. Chọn một trong hai:
   - điền vào `config.js` (`supabaseUrl`, `supabaseAnonKey`) — key này vốn công khai; RLS chỉ cho phép thêm tên, không cho đọc; **hoặc**
   - thêm repository secrets `SUPABASE_URL` và `SUPABASE_ANON_KEY` (**Settings → Secrets and variables → Actions**); workflow sẽ điền vào lúc deploy.
4. Xem danh sách: Supabase → **Table Editor → attendance**.

Tuyệt đối không dùng `service_role` key trong trang.

Nếu chưa cấu hình Supabase, form vẫn hiện “Hẹn gặp bạn nhé, …” nhưng tên **không được lưu** (có cảnh báo trong console).

## Đổi thông tin

Sửa `config.js`. Tiêu đề và mô tả preview khi chia sẻ link (thẻ `<meta>` đầu `index.html`) và `public/og-image.jpg` là nội dung tĩnh — nhớ sửa tay nếu đổi tên/ngày.

## Xuống dòng tiếng Việt

Tiếng Việt cách nhau theo âm tiết, nên trình duyệt có thể ngắt giữa một từ (“Tốt / nghiệp”). Vì vậy:

- Trong `index.html`, các âm tiết của cùng một từ được nối bằng `&nbsp;` (ví dụ `Tốt&nbsp;nghiệp`). Khi sửa chữ, giữ quy tắc này.
- Chữ lấy từ `config.js` được `main.js` tự xử lý: tên người chỉ ngắt sau họ (“Âu / Trung Phong”), địa chỉ chỉ ngắt ở dấu phẩy, địa điểm giữ nguyên các từ như “Đại học”, “Bách khoa”, “Hà Nội” (danh sách `WORDS` trong `main.js`).
