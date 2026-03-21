# 📱 Comprehensive API Documentation for Talk_Social (Mobile/FE)

Tài liệu này tổng hợp toàn bộ các API, cơ chế xác thực và các sự kiện Real-time phục vụ cho việc phát triển Front-End (App/Web).

---

## 🔐 1. Authentication (Xác thực & Bảo mật)

Hệ thống sử dụng xác thực qua JWT. Mọi yêu cầu (trừ Đăng ký/Đăng nhập) phải đính kèm header:  
`Authorization: Bearer <accessToken>`

### 1.1. Đăng ký tài khoản (Register)
- **Endpoint**: `POST /users`
- **Body**:
  ```json
  {
    "phoneNumber": "0987654321",
    "password": "secure_password",
    "username": "Nhat Thai",
    "email": "thai@example.com"
  }
  ```

### 1.2. Đăng nhập (Login)
- **Endpoint**: `POST /authentication`
- **Body**: `{ "strategy": "local", "phoneNumber": "...", "password": "..." }`
- **Phản hồi**:
  ```json
  {
    "accessToken": "ey...", // Sống trong 15 phút
    "refreshToken": "abc...", // Sống trong 3 ngày
    "user": { "_id": "...", "username": "..." }
  }
  ```

### 1.3. Làm mới Access Token (Refresh Token)
Khi Access Token hết hạn (401), dùng Refresh Token để lấy cặp mới:
- **Endpoint**: `POST /authentication/refresh`
- **Body**: `{ "refreshToken": "..." }`

---

## 👥 2. User & Friend Management (Tìm kiếm & Kết bạn)

### 2.1. Tìm kiếm người dùng theo Số điện thoại
- **Endpoint**: `GET /users?phoneNumber=0901234567`
- **Mục đích**: Tìm đối phương trước khi gửi lời mời kết bạn.

### 2.2. Gửi lời mời kết bạn (Friend Request)
- **Endpoint**: `POST /friend-requests`
- **Body**: `{ "toUserId": "id_nguoi_nhan" }`

### 2.3. Chấp nhận/Từ chối kết bạn
- **Endpoint**: `PATCH /friend-requests/:id`
- **Body**: `{ "status": "accepted" }` hoặc `{ "status": "rejected" }`
- **Lưu ý**: Khi chấp nhận, một **Chat Room** sẽ tự động được tạo giữa 2 người.

---

## 📽️ 3. Video Service (Streaming & Sharing)

### 3.1. Đăng Video (Dán Link)
- **Endpoint**: `POST /videos`
- **Body**: `{ "url": "https://...", "title": "My Video" }`
- **Lưu ý**: Link gốc sẽ bị ẩn trong các API tìm kiếm thông thường.

### 3.2. Streaming Video (Hỗ trợ tua - Seekable)
- **Sử dụng**: FE dùng trực tiếp URL này vào thẻ `<video src="..." />`
- **Endpoint**: `GET /videos/:id/stream`

---

## 💬 4. Chat Advanced (Rooms & Messages)

### 4.1. Lấy danh sách Phòng & Lịch sử
- **Phòng chat**: `GET /rooms`
- **Tin nhắn**: `GET /messages?roomId=...`

### 4.2. Gửi tin nhắn & Trả lời (Reply)
- **Endpoint**: `POST /messages`
- **Body**:
  ```json
  {
    "text": "Hello!",
    "roomId": "room_id",
    "type": "text",
    "replyToId": "msg_id_goc" // (Optional) Để trả lời tin nhắn cụ thể
  }
  ```

### 4.3. Đánh dấu "Đã xem" (Read Receipts)
- **Endpoint**: `PATCH /messages/:id`
- **Body**: `{ "readBy": [] }` (BE tự thêm ID của bạn vào).

### 4.4. Trạng thái Đang soạn tin (Typing/Stop Typing)
FE gọi qua Socket.io:
- **Bắt đầu**: `socket.emit('messages typing', { roomId: '...' })`
- **Kết thúc**: `socket.emit('messages stopTyping', { roomId: '...' })`

---

## ⚡ 5. Real-time Events (Socket.io)

Lắng nghe các sự kiện để cập nhật UI tức thời mà không cần tải lại trang:

| Service | Event | Ý nghĩa |
| :--- | :--- | :--- |
| **messages** | `created` | Nhận tin nhắn mới |
| **messages** | `patched` | Tin nhắn đã được đọc (Read Receipt) |
| **messages** | `typing` | Đối phương đang soạn tin |
| **messages** | `stopTyping`| Đối phương đã dừng soạn tin |
| **friend-requests**| `created` | Nhận lời mời kết bạn mới |
| **rooms** | `created` | Phòng chat mới được tạo sau khi kết bạn |
| **videos** | `created` | Bạn bè vừa đăng video mới |

---

## 💡 Hướng dẫn cho AI Agent xây dựng FE
1. **Quản lý Token**: Lưu `accessToken` và `refreshToken`. Nếu `accessToken` hết hạn, gọi API Refresh trước khi thử lại Request cũ.
2. **Socket Authentication**: Sau khi kết nối Socket, hãy gửi sự kiện `authenticate` với JWT để định danh kết nối, giúp nhận được các sự kiện dành riêng cho user đó.
3. **Cập nhật UI**: Luôn ưu tiên cập nhật UI dựa trên Socket Events để trải nghiệm mượt mà nhất.

---
*Tài liệu này được biên soạn tổng hợp cho toàn bộ dự án APP_CHAT.*
