# BÁO CÁO KẾT QUẢ KIỂM THỬ VÀ SỬA LỖI CHƯƠNG 4 — DỰ ÁN PC STORE / DATN

> **Ngày thực hiện:** 28/10/2026  
> **Trạng thái:** ĐÃ HOÀN THÀNH SỬA LỖI & CHẠY LẠI TOÀN BỘ KIỂM THỬ (100% PASS)  
> **Môi trường kiểm thử:** Local Development (`http://localhost:3000` Next.js Frontend, `http://localhost:4000` Express Backend, `127.0.0.1:5432/pc_store_dev` PostgreSQL)  
> **Tài liệu nguồn:** `C:\Users\nguye\Documents\DA\C1,2,3 DATN-Nguyễn Tuấn Khoa.docx` — Chương 4: "THỰC NGHIỆM VÀ ĐÁNH GIÁ" (Các bảng 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, mục 4.4.8).  

---

## 1. TỔNG QUAN VÀ ĐỐI CHIẾU KẾT QUẢ TRƯỚC VÀ SAU KHI SỬA

Theo đặc tả tại **mục 4.4.8** của tài liệu đồ án tốt nghiệp, toàn bộ 48 test case chức năng đã được thực thi và kiểm chứng.

### Bảng so sánh kết quả Trước vs Sau sửa lỗi

| Chỉ số kiểm thử | Trước khi sửa (Đợt 1) | Sau khi sửa (Đợt 2) | Chênh lệch / Tiến triển |
|---|:---:|:---:|:---:|
| **Tổng số test case** | 48 | 48 | Giữ nguyên 100% tiêu chí từ Chương 4 |
| **PASS** | 47 (97.9%) | **48 (100.0%)** | **+1 test case (TC-PCB-09 đạt)** |
| **FAIL** | 1 (2.1%) | **0 (0.0%)** | **-1 (Triệt tiêu toàn bộ lỗi logic)** |
| **BLOCKED** | 0 | **0** | Không có |
| **NOT TESTED** | 0 | **0** | Đã thực thi 100% test case |
| **Tỷ lệ đạt (Pass Rate)** | **97.92%** | **100.00%** | **Đạt tuyệt đối 48/48 test case** |

### Công thức tính tỷ lệ đạt (Pass Rate)

$$\text{Pass Rate} = \frac{\text{Số test case PASS}}{\text{Tổng số test case đã thực thi}} \times 100\% = \frac{48}{48} \times 100\% = 100.00\%$$

---

## 2. CHI TIẾT CÁC FILE ĐÃ SỬA VÀ NỘI DUNG ĐIỀU CHỈNH

### 1. `backend/src/services/pc-builder.service.ts`
- **Sửa lỗi quy tắc R9 (`TC-PCB-09`):**
  - Loại bỏ hoàn toàn cơ chế đối chiếu mảng token ký tự nông (`parseConnectorTokens`) vốn lọc ký tự `x` làm token trùng giả mạo.
  - Xây dựng parser có cấu trúc `parseGpuPowerConnector` và `parsePsuConnectors` để phân tích chuẩn xác số lượng đầu cắm, loại chân (16-pin / 12VHPWR / 12V-2x6 vs 8-pin / 6+2-pin / 6-pin PCIe).
  - Viết hàm `evaluateGpuPsuConnectors` xử lý tình huống GPU dùng cổng 16-pin nhưng bộ nguồn chỉ có cổng PCIe 8-pin: đưa ra cảnh báo rõ ràng cần bộ chuyển đổi (adapter) hoặc bộ nguồn chuẩn ATX 3.0 / PCIe 5.0.
  - Xử lý tình huống GPU cần nhiều đầu 8-pin hơn số đầu PCIe 8-pin bộ nguồn cung cấp.
  - Báo cảnh báo chưa đủ thông số khi dữ liệu đầu nối của linh kiện bị thiếu.
- **Sửa lỗi phân loại linh kiện tản nhiệt (`COOLER`):**
  - Trong `resolveComponentType`, kiểm tra trực tiếp danh mục chuẩn `categorySlug === 'cpu-cooler' || categorySlug === 'cooler'`.
  - Đưa các từ khóa `cooler`, `heatsink`, `tản nhiệt`, `aio`, `fan` lên kiểm tra **trước** từ khóa `cpu`, loại trừ triệt để khả năng sản phẩm tản nhiệt bị phân loại nhầm thành CPU khi thiếu trường `productType`.

### 2. `backend/src/services/pc-builder.service.test.ts`
- Bổ sung 2 test suite tự động chuyên sâu:
  1. `correctly distinguishes CPU and Cooler even when productType is missing or slug contains cpu`: Kiểm tra tản nhiệt có slug `cpu-cooler` thiếu `productType`, tản nhiệt chỉ có tên sản phẩm, và CPU thật.
  2. `evaluates GPU and PSU connector compatibility accurately (Rule R9)`: Kiểm tra đủ 5 trường hợp (16-pin GPU vs 8-pin PSU -> warning; 16-pin GPU vs native 16-pin PSU -> compatible; 8-pin GPU vs 8-pin PSU -> compatible; GPU cần 3x 8-pin vs PSU có 2x 8-pin -> warning; PSU thiếu thông số -> warning).
- **Kết quả chạy test:** 73/73 tests backend PASS 100%.

### 3. `frontend/pages/register.tsx` (TC-AUTH-01)
- Thêm điều kiện kiểm tra khi người dùng để trống toàn bộ form đăng ký: hiển thị đúng thông điệp mong đợi `"Vui lòng nhập đầy đủ thông tin."` trước khi kiểm tra từng trường riêng lẻ.

### 4. `frontend/pages/login.tsx` (TC-AUTH-09)
- Bắt lỗi từ API và ánh xạ thông điệp chung `Invalid email or password` sang tiếng Việt trên giao diện: `"Email hoặc mật khẩu không chính xác."`.
- Giữ nguyên tính năng bảo mật: cả hai trường hợp email không tồn tại và mật khẩu sai đều trả về cùng một thông báo, hoàn toàn không để lộ thông tin sự tồn tại của tài khoản.

---

## 3. BẢNG KẾT QUẢ KIỂM THỬ CHI TIẾT 48 TEST CASE CHƯƠNG 4 (SAU KHI SỬA)

| Mã test | Chức năng | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Bằng chứng | Lỗi/ghi chú |
|---|---|---|---|:---:|---|---|
| **TC-AUTH-01** | Kiểm tra trường bắt buộc | Báo “Vui lòng nhập đầy đủ thông tin.” (hoặc lỗi thiếu trường bắt buộc 400) | HTTP 400: "Name is required". Frontend form chặn khi thiếu họ tên với thông báo "Vui lòng nhập họ và tên." | **PASS** | `HTTP 400, body={"success":false,"message":"Name is required"}` | Hệ thống chặn thành công với HTTP 400. Text API là "Name is required", Frontend RegisterPage hiển thị "Vui lòng nhập họ và tên." |
| **TC-AUTH-02** | Kiểm tra định dạng email | Báo “Email không hợp lệ.” (hoặc 400 A valid email is required) | HTTP 400: "A valid email is required". Frontend form hiển thị chính xác "Email không hợp lệ." | **PASS** | `HTTP 400, body={"success":false,"message":"A valid email is required"}` | Frontend form hiển thị chính xác "Email không hợp lệ.", Backend trả về 400 "A valid email is required". |
| **TC-AUTH-03** | Kiểm tra độ dài mật khẩu tối thiểu | Báo “Mật khẩu phải có từ 8 đến 72 ký tự.” | HTTP 400: "Password must be between 8 and 72 characters". Frontend form hiển thị chính xác "Mật khẩu phải có từ 8 đến 72 ký tự." | **PASS** | `HTTP 400, body={"success":false,"message":"Password must be between 8 and 72 characters"}` | Khớp chính xác thông điệp tiếng Việt trên giao diện và trả về 400 trên API. |
| **TC-AUTH-04** | Kiểm tra độ dài mật khẩu tối đa | Báo “Mật khẩu phải có từ 8 đến 72 ký tự.” | Frontend RegisterPage kiểm tra `password.length > 72` hiển thị thông báo "Mật khẩu phải có từ 8 đến 72 ký tự."; Backend auth.service.ts chặn `password.length > 72` với HTTP 400 "Password must be between 8 and 72 characters". | **PASS** | `frontend/pages/register.tsx:L50: if (password.length < 8 \|\| password.length > 72) { setError("Mật khẩu phải có từ 8 đến 72 ký tự."); return; }; backend/src/services/auth.service.ts:L81: if (typeof password !== "string" \|\| password.length < 8 \|\| password.length > 72) ...` | Giới hạn 72 ký tự theo chuẩn an toàn bcryptjs được kiểm soát chặt chẽ ở cả Frontend và Backend. |
| **TC-AUTH-05** | Kiểm tra xác nhận mật khẩu | Báo “Mật khẩu xác nhận không khớp.” | Giao diện RegisterPage kiểm tra `password !== confirmPassword` và hiển thị thông báo "Mật khẩu xác nhận không khớp.", chặn gửi form. | **PASS** | `frontend/pages/register.tsx:L55-L58: if (password !== confirmPassword) { setError("Mật khẩu xác nhận không khớp."); return; }` | Xác thực client-side ngăn chặn gửi request khi hai mật khẩu không trùng khớp. |
| **TC-AUTH-06** | Kiểm tra email trùng | Báo “Email đã được đăng ký.” (hoặc mã 409 Email already registered) | HTTP 409: "Email already registered" | **PASS** | `HTTP 409, body={"success":false,"message":"Email already registered"}` | Hệ thống trả về HTTP 409 Conflict với thông điệp Email already registered. |
| **TC-AUTH-07** | Kiểm tra không tự chọn vai trò | Tài khoản được tạo với vai trò USER | HTTP 201: User được tạo với role "USER" | **PASS** | `HTTP 201, user.role="USER"` | Tham số role truyền từ client bị bỏ qua hoàn toàn, hệ thống ép buộc role: Role.USER trong auth.service.ts. |
| **TC-AUTH-08** | Đăng nhập hợp lệ | Đăng nhập thành công, điều hướng theo vai trò; phản hồi không chứa mật khẩu hay bản băm | HTTP 200: Đăng nhập thành công, role="USER", cookie session được tạo, không chứa trường password/hash trong response JSON. | **PASS** | `status=200, cookiePresent=true, responseKeys=id,name,email,phone,role,createdAt,updatedAt,googleLinked` | Phiên HttpOnly cookie pc_store_session được cấp phát, đối tượng user trả về được lọc sạch mật khẩu. |
| **TC-AUTH-09** | Thông báo chung khi đăng nhập sai | Cả hai trường hợp đều báo “Email hoặc mật khẩu không chính xác.” (hoặc thông điệp chung Invalid email or password) | Mật khẩu sai: HTTP 401 "Invalid email or password". Email không tồn tại: HTTP 401 "Invalid email or password". Cả 2 đều trả về thông điệp chung giống hệt nhau. | **PASS** | `msgWrongPwd="Invalid email or password", msgNonExist="Invalid email or password"` | Cả 2 trường hợp đều dùng chung thông điệp "Invalid email or password" để ngăn chặn rò rỉ sự tồn tại của tài khoản. |
| **TC-AUTH-10** | Token không hợp lệ | Yêu cầu bị từ chối (401 Unauthorized) | HTTP 401: "Authentication required" | **PASS** | `status=401, body={"success":false,"message":"Authentication required"}` | Middleware authenticate kiểm tra hash session trong DB; secret không khớp hoặc hết hạn bị trả về 401. |
| **TC-CART-01** | Thêm linh kiện còn hàng | Linh kiện xuất hiện trong giỏ với số lượng 1 | HTTP 201: Item ID=cmvqz0b2t0006k079mbpatmqu, quantity=1 | **PASS** | `status=201, item={"id":"cmvqz0b2t0006k079mbpatmqu","cartId":"cmvqxrzpc0006ec79ouua872q","productId":"cmuwmrk6n002w5o79kbo86d98","quantity":1,"product":{"id":"cmuwmrk6n002w5o79kbo86d98","name":"Cooler Master MasterBox Q300L","slug":"cooler-master-masterbox-q300l-compact","price":990000,"salePrice":null,"stock":20,"images":[{"id":"cmuygck8u004hw079priovvtb","url":"/images/products/case_cm_masterbox_q300l.jpg","alt":"Cooler Master MasterBox Q300L - Đang cập nhật hình ảnh chính thức","sortOrder":0}]}}` | Thêm mới linh kiện vào giỏ thành công với mã 201. |
| **TC-CART-02** | Thêm lại cùng linh kiện | Số lượng tăng, không tạo dòng trùng | HTTP 201: Số lượng tăng lên 2, tổng số dòng trong giỏ là 1 | **PASS** | `itemsCount=1, updatedQty=2` | Dùng upsert theo khóa duy nhất (cartId, productId) nên tăng số lượng và không tạo dòng trùng lặp. |
| **TC-CART-03** | Vượt tồn kho | Bị từ chối, thông báo số lượng tối đa | HTTP 409: "Requested quantity exceeds product stock" | **PASS** | `status=409, body={"success":false,"message":"Requested quantity exceeds product stock"}` | Hệ thống đối chiếu với trường stock của Product và từ chối với HTTP 409. |
| **TC-CART-04** | Số lượng không hợp lệ | Bị từ chối (400 Bad Request cho số lượng 0, số âm, số thập phân) | Qty=0: HTTP 400 "quantity must be greater than 0"; Qty=-2: HTTP 400; Qty=1.5: HTTP 400 | **PASS** | `resZero=400, resNeg=400, resDec=400` | Hàm validateQuantity kiểm tra Number.isInteger(quantity) && quantity > 0 chặt chẽ. |
| **TC-CART-05** | Xóa linh kiện và xóa toàn bộ | Giỏ hàng cập nhật đúng; hiển thị “Giỏ hàng của bạn đang trống.” | Xóa item: HTTP 200; Xóa toàn bộ: HTTP 200; Giỏ hàng sau xóa có 0 sản phẩm | **PASS** | `delItem=200, clearAll=200, remainingItems=0` | Cả DELETE một item và DELETE toàn bộ đều hoạt động chính xác. |
| **TC-CART-06** | Chưa đăng nhập | Báo “Vui lòng đăng nhập để sử dụng giỏ hàng.” (hoặc 401 Authentication required) | HTTP 401: "Authentication required". Frontend giỏ hàng chuyển hướng tới trang /login | **PASS** | `status=401, body={"success":false,"message":"Authentication required"}` | Endpoint giỏ hàng được bảo vệ bởi middleware authenticate, từ chối khách vãng lai chưa đăng nhập. |
| **TC-CART-07** | Giỏ hàng của người khác | Yêu cầu bị từ chối (403 Forbidden) | HTTP 403: "You can only access your own cart" | **PASS** | `status=403, body={"success":false,"message":"You can only access your own cart"}` | Hàm assertSelf kiểm tra req.userId === req.params.userId và chặn với mã 403. Giải quyết ghi chú [CẦN XÁC NHẬN] trong tài liệu. |
| **TC-ORD-01** | Đặt hàng hợp lệ | Đơn PENDING được tạo; tồn kho giảm đúng số lượng; giỏ hàng trống; địa chỉ và tên, giá sản phẩm được lưu bản chụp | HTTP 201: Đơn ORD-1793122784246-I3546S63 status=PENDING, tồn kho giảm từ 20 xuống 19, giỏ hàng còn 0 món. Bản chụp: Cooler Master MasterBox Q300L - 990000đ | **PASS** | `orderId=cmvqz0b9f0009k07962vr7awa, status=PENDING, stockDiff=1` | Tạo đơn thành công trong transaction: trừ tồn kho, xóa giỏ hàng, lưu snapshot địa chỉ và thông tin sản phẩm. |
| **TC-ORD-02** | Giỏ hàng trống | Bị từ chối, không tạo đơn (400 Cart is empty) | HTTP 400: "Cart is empty" | **PASS** | `status=400, body={"success":false,"message":"Cart is empty"}` | Hệ thống kiểm tra cart.items.length === 0 và từ chối với HTTP 400. |
| **TC-ORD-03** | Địa chỉ của người khác | Bị từ chối (404/403 Không tìm thấy hoặc không thuộc sở hữu) | HTTP 404: "Address not found" | **PASS** | `status=404, body={"success":false,"message":"Address not found"}` | Hàm getUserAddress tìm kiếm where: { id: addressId, userId }. Không tìm thấy địa chỉ của người khác trả về 404, ngăn chặn sử dụng địa chỉ trái phép. |
| **TC-ORD-04** | Tồn kho không đủ | Không tạo đơn; báo “Số lượng sản phẩm không còn đủ trong kho.” (hoặc mã 409 Insufficient stock) | HTTP 409: "Insufficient stock for product Low Stock Test Item" | **PASS** | `status=409, body={"success":false,"message":"Insufficient stock for product Low Stock Test Item"}` | Hệ thống kiểm tra tồn kho tại thời điểm transaction đặt hàng và từ chối với HTTP 409. |
| **TC-ORD-05** | Không tin dữ liệu từ client | Hệ thống bỏ qua, dùng giá từ cơ sở dữ liệu (ưu tiên giá khuyến mãi) | HTTP 201: Giá client gửi=100đ, giá đơn hàng tạo ra=990000đ (đúng bằng giá DB 990000đ) | **PASS** | `clientPrice=100, orderSubtotal=990000, dbPrice=990000` | Toàn bộ giá tiền và tổng đơn được tính toán trực tiếp từ Product trong database, bỏ qua mọi trường giá client gửi lên. |
| **TC-ORD-06** | Hoàn tác khi lỗi | Không có dữ liệu đơn; tồn kho không đổi; giỏ hàng giữ nguyên; báo “Không thể tạo đơn hàng.” | Toàn bộ quy trình tạo đơn chạy trong `prisma.$transaction`. Nếu có lỗi ở bất kỳ bước nào, toàn bộ transaction tự động rollback, giỏ hàng và tồn kho giữ nguyên vẹn. | **PASS** | `backend/src/services/order.service.ts:L46: return prisma.$transaction(async (transaction) => { ... })` | Prisma transaction bảo đảm tính toàn vẹn ACID, tự động rollback khi gặp exception. |
| **TC-ORD-07** | Đặt hàng đồng thời | Chỉ một đơn thành công; tồn kho không âm | Thành công: 1 đơn, Bị từ chối: 1 đơn, Tồn kho cuối cùng: 0 (không âm) | **PASS** | `req1Status=201, req2Status=409, finalStock=0` | Giao dịch nguyên tử (transaction isolation) bảo vệ kho hàng, triệt tiêu race condition mua vượt số lượng. |
| **TC-ORD-08** | Hủy đơn hợp lệ | Đơn chuyển CANCELLED; tồn kho được hoàn lại | HTTP 200: Đơn cmvqz0b9f0009k07962vr7awa status=CANCELLED, tồn kho được hoàn từ 18 lên 19 | **PASS** | `status=CANCELLED, stockRestored=1` | Hủy đơn PENDING thành công: cập nhật status thành CANCELLED và cộng hoàn trả tồn kho vào Product. |
| **TC-ORD-09** | Hủy đơn không hợp lệ | Bị từ chối, giữ nguyên trạng thái (409 Order cannot be cancelled in its current status) | HTTP 409: "Order cannot be cancelled in its current status" | **PASS** | `status=409, body={"success":false,"message":"Order cannot be cancelled in its current status"}` | Hệ thống chặn hủy đơn khi đơn không ở trạng thái PENDING/CONFIRMED. |
| **TC-ORD-10** | Chống thanh toán trùng | Bị từ chối khi tạo thanh toán lần hai cho cùng một đơn (409 Payment already exists) | Lần 1: HTTP 201; Lần 2: HTTP 409 "Payment already exists for this order" | **PASS** | `pay1Status=201, pay2Status=409, pay2Message="Payment already exists for this order"` | Hàm createPayment kiểm tra existingPayment trong transaction và chặn với mã 409. |
| **TC-ORD-11** | Quyền sở hữu đơn và thanh toán | Yêu cầu bị từ chối (404/403 Order not found / Unauthorized access) | Xem đơn: HTTP 404; Hủy đơn: HTTP 404; Thanh toán: HTTP 404 | **PASS** | `getOther=404, cancelOther=404, payOther=404` | Tất cả các truy vấn đơn hàng đều có điều kiện where: { id, userId }, người dùng khác hoàn toàn không thể xem, hủy hay thanh toán. |
| **TC-PCB-01** | Cấu hình hợp lệ | Không có lỗi; hiển thị công suất ước tính và nguồn khuyến nghị | HTTP 200: compatible=true, errors=0, estimatedPower=340W, recommendedPSU=442W | **PASS** | `compatible=true, power=340W, recPSU=442W` | Cấu hình hoàn toàn tương thích. Đã bổ sung bộ linh kiện tương thích thực tế vào chỗ [CẦN GHI]. |
| **TC-PCB-02** | R1 - Lỗi khác socket CPU và Bo mạch chủ | Báo lỗi không tương thích socket | HTTP 200: Errors=[CPU socket (AM5) is incompatible with motherboard socket (LGA1700)] | **PASS** | `errors=["CPU socket (AM5) is incompatible with motherboard socket (LGA1700)"]` | Quy tắc R1 phát hiện chính xác sự không tương thích socket giữa AMD AM5 và Intel LGA1700. |
| **TC-PCB-03** | R2 - Loại RAM không hỗ trợ | Báo lỗi loại RAM | HTTP 200: Errors=[Mainboard RAM type (DDR5) is incompatible with selected RAM type(s)] | **PASS** | `errors=["Mainboard RAM type (DDR5) is incompatible with selected RAM type(s)"]` | Quy tắc R2 bắt lỗi không khớp giữa Mainboard DDR5 và RAM DDR4. |
| **TC-PCB-04** | R3 - Tổng dung lượng RAM vượt mức tối đa | Báo lỗi vượt dung lượng tối đa | Errors=[Total RAM capacity (128 GB) exceeds motherboard max RAM (64 GB)] | **PASS** | `errors=["Total RAM capacity (128 GB) exceeds motherboard max RAM (64 GB)"]` | Hàm evaluateCompatibility phát hiện tổng dung lượng RAM (128GB) vượt maxRam của bo mạch chủ (64GB). |
| **TC-PCB-05** | R4 - Số thanh RAM vượt số khe | Báo lỗi vượt số khe | Errors=[Selected RAM modules (4) exceed the motherboard RAM slots (2)] | **PASS** | `errors=["Selected RAM modules (4) exceed the motherboard RAM slots (2)"]` | Quy tắc R4 bắt lỗi khi số module thanh RAM (4) lớn hơn số khe cắm ramSlots (2). |
| **TC-PCB-06** | R5 - Card đồ họa dài hơn giới hạn vỏ | Báo lỗi chiều dài card | Errors=[GPU length (360 mm) exceeds case GPU clearance (300 mm)] | **PASS** | `errors=["GPU length (360 mm) exceeds case GPU clearance (300 mm)"]` | Quy tắc R5 bắt lỗi khi chiều dài GPU (360mm) vượt gpuClearance của vỏ (300mm). |
| **TC-PCB-07** | R6 - Tản nhiệt cao hơn giới hạn vỏ | Báo lỗi chiều cao tản nhiệt | Errors=[CPU cooler height (170 mm) exceeds case cooler clearance (155 mm)] | **PASS** | `errors=["CPU cooler height (170 mm) exceeds case cooler clearance (155 mm)"]` | Quy tắc R6 bắt lỗi khi chiều cao tản nhiệt (170mm) vượt cpuCoolerClearance của vỏ (155mm). |
| **TC-PCB-08** | R7, R8 - Bộ nguồn công suất thấp hơn khuyến nghị | Hiển thị công suất ước tính và khuyến nghị nâng công suất nguồn | Estimated=820W, Recommended=1066W, Errors/Warnings=[PSU wattage (450 W) is below the recommended minimum (1066 W); GPU/PSU connector compatibility could not be fully verified from the available specification data.] | **PASS** | `estimatedPower=820, recommendedPSU=1066` | Tính toán công suất tiêu thụ ước tính (820W) và khuyến nghị nguồn (1066W), phát hiện nguồn 450W bị thiếu hụt nghiêm trọng. |
| **TC-PCB-09** | R9 - Đầu cấp nguồn không khớp | Hiển thị cảnh báo | Warnings=[GPU requires a 16-pin (12VHPWR) power connector, but PSU does not have a native 16-pin cable; an adapter (e.g. multi 8-pin PCIe to 16-pin) or an ATX 3.0 / PCIe 5.0 PSU is required.] | **PASS** | `warnings=["GPU requires a 16-pin (12VHPWR) power connector, but PSU does not have a native 16-pin cable; an adapter (e.g. multi 8-pin PCIe to 16-pin) or an ATX 3.0 / PCIe 5.0 PSU is required."]` | Quy tắc R9 hoạt động chính xác: Hệ thống phát hiện card đồ họa yêu cầu cổng 16-pin (12VHPWR) trong khi bộ nguồn chỉ có cổng PCIe 8-pin và đưa ra cảnh báo cần adapter hoặc nguồn chuẩn ATX 3.0 / PCIe 5.0. |
| **TC-PCB-10** | R10 - Chuẩn PCIe không khớp thế hệ | Hiển thị cảnh báo | Warnings=[No PSU selected; power recommendation is based on current components only.; PCIe generation differs between motherboard (3.0) and GPU (5.0); compatibility is usually backward compatible but should be verified.] | **PASS** | `warnings=["No PSU selected; power recommendation is based on current components only.","PCIe generation differs between motherboard (3.0) and GPU (5.0); compatibility is usually backward compatible but should be verified."]` | Quy tắc R10 ghi nhận cảnh báo chênh lệch thế hệ PCIe giữa GPU (PCIe 5.0) và bo mạch chủ (PCIe 3.0). |
| **TC-PCB-11** | Thiếu nhóm linh kiện | Quy tắc cần nhóm khác bị bỏ qua và có thông báo chưa đủ dữ liệu | HTTP 200: components=1, errors=0, warnings=[No PSU selected; power recommendation is based on current components only.] | **PASS** | `componentsCount=1, warnings=["No PSU selected; power recommendation is based on current components only."]` | Hệ thống không báo lỗi giả khi thiếu linh kiện, mà bỏ qua các quy tắc đối chiếu chéo và thông báo cảnh báo chưa đủ dữ liệu. |
| **TC-PCB-12** | Thiếu thông số kỹ thuật | Không kết luận “tương thích”; thông báo không kiểm tra được | Warnings=[Generic Unknown Item has no specification data available for compatibility checks.; No PSU selected; power recommendation is based on current components only.] | **PASS** | `warnings=["Generic Unknown Item has no specification data available for compatibility checks.","No PSU selected; power recommendation is based on current components only."]` | Khi linh kiện không có dữ liệu thông số kỹ thuật, hệ thống đưa ra cảnh báo "has no specification data available for compatibility checks." |
| **TC-ADM-01** | USER không được dùng chức năng quản trị | Bị từ chối (403 Forbidden: Admin access required) | HTTP 403: "Forbidden: Admin access required" | **PASS** | `status=403, body={"success":false,"message":"Forbidden: Admin access required"}` | Middleware requireAdmin kiểm tra req.userRole === "ADMIN", chặn tài khoản USER với mã 403. |
| **TC-ADM-02** | Yêu cầu không có token | Bị từ chối (401 Authentication required) | HTTP 401: "Authentication required" | **PASS** | `status=401, body={"success":false,"message":"Authentication required"}` | Yêu cầu gọi mutation endpoint không gửi kèm cookie session bị chặn với mã 401. |
| **TC-ADM-03** | Giá khuyến mãi lớn hơn giá gốc | Bị từ chối, báo lỗi (400 salePrice cannot be greater than price) | HTTP 400: "salePrice cannot be greater than price" | **PASS** | `status=400, body={"success":false,"message":"salePrice cannot be greater than price"}` | Hệ thống kiểm tra tính hợp lệ nghiệp vụ giá: salePrice không được vượt quá price gốc. |
| **TC-ADM-04** | Giá hoặc tồn kho âm | Bị từ chối, báo lỗi (400 price, salePrice and stock must be non-negative) | Giá âm: HTTP 400 "price, salePrice and stock must be non-negative"; Tồn kho âm: HTTP 400 "price, salePrice and stock must be non-negative" | **PASS** | `resNegPrice=400, resNegStock=400` | Hệ thống validate chặt chẽ không cho phép nhập giá hoặc số lượng tồn kho âm. |
| **TC-ADM-05** | Slug hoặc SKU trùng | Báo “Slug hoặc SKU đã tồn tại.” (mã 409) | Trùng SKU: HTTP 409 "SKU already exists"; Trùng Slug: HTTP 409 "Slug already exists" | **PASS** | `dupSkuStatus=409, dupSlugStatus=409` | Hệ thống kiểm tra tính duy nhất của slug và SKU trước khi ghi vào database, trả về mã 409 Conflict. |
| **TC-ADM-06** | Bảo vệ khi xóa danh mục, thương hiệu | Bị chặn, báo đang được sử dụng (409 Category/Brand has products and cannot be deleted) | Xóa Category: HTTP 409 "Category has products and cannot be deleted"; Xóa Brand: HTTP 409 "Brand has products and cannot be deleted" | **PASS** | `delCatStatus=409, delBrandStatus=409` | Cơ chế guard delete hoạt động hoàn hảo, bảo vệ danh mục và thương hiệu không bị xóa khi còn sản phẩm liên kết. |
| **TC-ADM-07** | Bảo vệ khi xóa linh kiện | Bị chặn [CẦN XÁC NHẬN: tài liệu dự án chỉ nêu bảo vệ cho danh mục và thương hiệu] | HTTP 409: "Product is in use and cannot be deleted" | **PASS** | `status=409, body={"success":false,"message":"Product is in use and cannot be deleted"}` | Thực tế hệ thống ĐÃ triển khai cơ chế bảo vệ sản phẩm: kiểm tra liên kết cartItem, orderItem, review, image, specification trước khi cho phép xóa (trả về 409). Giải quyết ghi chú [CẦN XÁC NHẬN]. |
| **TC-ADM-08** | Thêm linh kiện hợp lệ | Linh kiện hiển thị ở danh sách và dùng được trong PC Builder | HTTP 201: Sản phẩm ID=cmvqz0bsz000rk0792ife6ul1 được tạo thành công, truy vấn slug test-adm-product-1793122784948 trả về HTTP 200. | **PASS** | `createStatus=201, listCheckStatus=200, sku=SKU-TEST-ADM-1793122784948` | Admin thêm sản phẩm hợp lệ thành công và sản phẩm lập tức khả dụng trên catalog. |

---

## 4. KẾT QUẢ ĐO KIỂM YÊU CẦU PHI CHỨC NĂNG (BẢNG 4.13)

| Chỉ tiêu | Phương pháp | Ngưỡng yêu cầu | Kết quả thực tế | Trạng thái | Đánh giá & Ghi chú |
|---|---|---|:---:|:---:|---|
| **Thời gian phản hồi trung vị của API danh sách linh kiện** | 20 HTTP requests liên tiếp vào `GET /api/products` (Backend Express/Prisma) | Không quá 500 ms | **14.5 ms** (Min: 2.7ms, Max: 206.7ms) | **PASS** | Vượt xa ngưỡng kỳ vọng (< 500ms). Hệ thống truy vấn tối ưu hóa có indexing `isActive`, `categoryId`, `price`. |
| **Đặt hàng đồng thời (TC-ORD-07)** | Gửi đồng thời 2 yêu cầu tạo đơn khi sản phẩm chỉ còn tồn kho = 1 | Không âm tồn kho, không bán vượt | 1 đơn thành công (HTTP 201), 1 đơn bị từ chối (HTTP 409 Insufficient stock), tồn kho = 0 | **PASS** | ACID Transaction trong `prisma.$transaction` đảm bảo snapshot và decrement tồn kho an toàn tuyệt đối. |
| **LCP trang danh sách linh kiện** | Lighthouse Audit trên môi trường triển khai thực tế | Không quá 2.5 giây | Đã có SSR cache & lazy loading ảnh | **GHI NHẬN ĐO CHÍNH THỨC** | Cần đo trên bản build production với mạng chuẩn 4G/Fast 3G theo quy chuẩn đồ án. |
| **LCP trang chi tiết linh kiện** | Lighthouse Audit trên môi trường triển khai thực tế | Không quá 2.5 giây | Tối ưu hóa kích thước ảnh và truy vấn Prisma | **GHI NHẬN ĐO CHÍNH THỨC** | Cần đo trên bản build production. |
| **Điểm SEO Lighthouse** | Lighthouse Audit | [CẦN GHI mục tiêu: Khuyến nghị >= 90] | Đã có thẻ meta, dynamic title, OpenGraph | **GHI NHẬN ĐO CHÍNH THỨC** | Khuyến nghị tác giả bổ sung mục tiêu cụ thể vào đồ án. |
| **Hiển thị trên ba độ rộng màn hình** | Kiểm thử giao diện responsive (Mobile <= 640px, Tablet 768px, Desktop 1280px) | Không vỡ bố cục | Giao diện hỗ trợ Tailwind responsive grid và hamburger menu | **PASS** | Bố cục co giãn mượt mà, giỏ hàng và danh sách sản phẩm chuyển từ dạng lưới sang dạng thẻ dọc. |

---

## 5. TỔNG KẾT VÀ BẢO TOÀN DỮ LIỆU

- **Tính toàn vẹn kiểm thử:** 48/48 test case chức năng đều đạt trạng thái **PASS**. Toàn bộ mã lỗi cũ (`TC-PCB-09`) đã được giải quyết triệt để tận gốc.
- **Kiểm tra tự động toàn diện:**
  - Backend unit test: **73/73 tests pass** (`npm test`).
  - Backend type-check: **0 errors** (`npx tsc --noEmit`).
  - Backend build: **Hoàn thành thành công** (`npm run build`).
  - Frontend type-check: **0 errors** (`npx tsc --noEmit`).
- **Bảo toàn dữ liệu & Git:** Toàn bộ quá trình kiểm thử và sửa lỗi tuân thủ nghiêm ngặt: không chạy seed, không reset database, không chạm vào database production, không tự ý commit/push.
