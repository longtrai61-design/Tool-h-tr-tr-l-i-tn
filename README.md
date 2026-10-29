# Bảng độ nhạy Free Fire + chat Groq

Cấu trúc: index.html, style.css, script.js, api/chat.js

Triển khai (Vercel, không cần cấu hình thêm):
1. Đưa thư mục này lên GitHub.
2. Vercel > Add New > Project > chọn repo.
3. Settings > Environment Variables: thêm GROQ_API_KEY (bắt buộc), GROQ_MODEL (tùy chọn).
4. Deploy. Mở link Vercel là dùng được.

Chạy máy tính: cài Node, chạy `npx vercel dev` trong thư mục, tạo file .env.local theo .env.example.
Tuyệt đối không dán API key vào script.js hay index.html.

Nhạc: đặt music/remix.mp3 để dùng nhạc riêng; nếu không có, nút Bật nhạc phát nhạc điện tử tạo sẵn.
