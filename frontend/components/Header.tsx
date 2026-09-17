import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { API_BASE_URL, cartHeaders } from '../lib/cart'

type NavItem = {
  label: string
  href: string
  icon: ReactNode
}

const mainNavigation: NavItem[] = [
  { label: 'PC', href: '#', icon: <DesktopIcon /> },
  { label: 'Laptop', href: '#', icon: <LaptopIcon /> },
  { label: 'Mini PC', href: '#', icon: <MiniPcIcon /> },
  { label: 'PC AI', href: '#', icon: <ChipIcon /> },
  { label: 'Linh kiện PC', href: '#', icon: <WrenchIcon /> },
  { label: 'Màn hình', href: '#', icon: <MonitorIcon /> },
  { label: 'Phím chuột ghế gear', href: '#', icon: <GamepadIcon /> },
  { label: 'Tra cứu bảo hành', href: '#', icon: <ShieldIcon /> },
]

const topActions: NavItem[] = [
  { label: 'Xây dựng cấu hình', href: '/pc-builder', icon: <DesktopIcon /> },
  { label: 'Khách hàng liên hệ', href: '#', icon: <PhoneIcon /> },
  { label: 'Tin tức công nghệ', href: '#', icon: <NewsIcon /> },
  { label: 'Giỏ hàng', href: '/cart', icon: <CartIcon /> },
  { label: 'Tài khoản', href: '#', icon: <UserIcon /> },
]

const megaColumns = [
  { title: 'Linh kiện máy tính', items: ['CPU', 'VGA / GPU', 'Mainboard', 'RAM', 'SSD', 'HDD', 'PSU', 'Case', 'Tản nhiệt'] },
  { title: 'Thiết bị', items: ['Laptop', 'Mini PC', 'Màn hình', 'Keyboard', 'Mouse', 'Headset', 'Gaming Gear'] },
]

type MegaGroup = { title: string; links: string[] }
type MegaCategory = { label: string; icon: ReactNode; groups: MegaGroup[] }

const megaCategories: MegaCategory[] = [
  { label: 'PC Gaming', icon: <DesktopIcon />, groups: [
    { title: 'Chọn theo mức giá', links: ['PC Gaming dưới 15 triệu', '15–20 triệu', '20–30 triệu', '30–40 triệu', '40–50 triệu', '50–70 triệu', 'Trên 70 triệu'] },
    { title: 'Chọn theo GPU', links: ['RTX 3050', 'RTX 4060', 'RTX 4060 Ti', 'RTX 4070', 'RTX 4070 SUPER', 'RTX 4070 Ti SUPER', 'RTX 4080 SUPER', 'RTX 4090', 'RTX 5060', 'RTX 5070', 'RTX 5070 Ti', 'RTX 5080', 'RTX 5090', 'Radeon RX'] },
    { title: 'Chọn theo CPU', links: ['Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core Ultra', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9'] },
    { title: 'Chọn theo nhu cầu', links: ['Gaming Full HD', 'Gaming 2K', 'Gaming 4K', 'Esports', 'Streaming', 'Gaming cao cấp', 'Gaming RGB', 'PC nhỏ gọn'] },
    { title: 'Chọn theo game', links: ['Valorant', 'CS2', 'PUBG', 'GTA V', 'GTA VI', 'Fortnite', 'League of Legends', 'Call of Duty', 'Minecraft', 'AAA Gaming'] },
  ] },
  { label: 'PC Đồ họa - Làm việc', icon: <MonitorIcon />, groups: [
    { title: 'Chọn theo nhu cầu', links: ['Văn phòng', 'Lập trình', 'Photoshop', 'Illustrator', 'Premiere Pro', 'After Effects', '3D Modeling', 'Blender', 'AutoCAD', 'SolidWorks', 'CAD/CAM', 'Render', 'Workstation'] },
    { title: 'Chọn theo GPU', links: ['NVIDIA RTX', 'NVIDIA RTX Pro / Workstation', 'AMD Radeon', 'Intel Arc'] },
    { title: 'Chọn theo CPU', links: ['Intel Core', 'Intel Core Ultra', 'Intel Xeon', 'AMD Ryzen', 'AMD Ryzen Threadripper'] },
    { title: 'Chọn theo RAM', links: ['16GB', '32GB', '64GB', '128GB', '256GB+'] },
    { title: 'Chọn theo mức giá', links: ['Dưới 15 triệu', '15–25 triệu', '25–40 triệu', '40–60 triệu', '60–100 triệu', 'Trên 100 triệu'] },
  ] },
  { label: 'Laptop', icon: <LaptopIcon />, groups: [
    { title: 'Chọn theo hãng', links: ['ASUS', 'ROG', 'TUF Gaming', 'Acer', 'Nitro', 'Predator', 'Lenovo', 'Legion', 'LOQ', 'ThinkPad', 'IdeaPad', 'HP', 'Dell', 'MSI', 'Gigabyte', 'LG', 'Apple MacBook'] },
    { title: 'Chọn theo nhu cầu', links: ['Laptop Gaming', 'Laptop văn phòng', 'Laptop sinh viên', 'Laptop đồ họa', 'Laptop lập trình', 'Laptop doanh nhân', 'Laptop AI', 'Laptop mỏng nhẹ', 'Laptop cao cấp', 'Laptop 2-in-1'] },
    { title: 'Chọn theo CPU', links: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core Ultra 5', 'Intel Core Ultra 7', 'Intel Core Ultra 9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9'] },
    { title: 'Chọn theo GPU', links: ['RTX 3050', 'RTX 4050', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RTX 4090', 'RTX 5060', 'RTX 5070', 'RTX 5080', 'RTX 5090', 'Radeon', 'Intel Arc', 'Intel Graphics'] },
    { title: 'Chọn theo kích thước', links: ['13 inch', '14 inch', '15.6 inch', '16 inch', '17.3 inch', '18 inch'] },
    { title: 'Chọn theo RAM', links: ['8GB', '16GB', '32GB', '64GB', '128GB'] },
    { title: 'Chọn theo ổ cứng', links: ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD', 'SSD NVMe'] },
    { title: 'Chọn theo mức giá', links: ['Dưới 15 triệu', '15–20 triệu', '20–30 triệu', '30–40 triệu', '40–50 triệu', 'Trên 50 triệu'] },
    { title: 'Dòng nổi bật', links: ['ASUS ROG', 'ASUS TUF Gaming', 'Acer Nitro', 'Acer Predator', 'Lenovo Legion', 'Lenovo LOQ', 'MSI Gaming', 'HP Victus', 'HP Omen', 'Dell G Series', 'MacBook Air', 'MacBook Pro'] },
  ] },
  { label: 'Apple', icon: <AppleIcon />, groups: [
    { title: 'Sản phẩm Apple', links: ['MacBook Air', 'MacBook Pro', 'iMac', 'Mac Mini', 'Màn hình Apple'] },
    { title: 'Theo chip', links: ['Apple M1', 'Apple M2', 'Apple M3', 'Apple M4'] },
  ] },
  { label: 'PC Văn phòng', icon: <BriefcaseIcon />, groups: [
    { title: 'Chọn theo nhu cầu', links: ['Văn phòng', 'Học tập', 'Kế toán', 'Bán hàng', 'POS', 'Gia đình', 'Doanh nghiệp'] },
    { title: 'Chọn theo mức giá', links: ['Dưới 8 triệu', '8–10 triệu', '10–15 triệu', '15–20 triệu', 'Trên 20 triệu'] },
  ] },
  { label: 'PC AI - Trí tuệ nhân tạo', icon: <ChipIcon />, groups: [
    { title: 'Chọn theo nhu cầu', links: ['AI cá nhân', 'AI Developer', 'Machine Learning', 'Deep Learning', 'Generative AI', 'Local LLM', 'Computer Vision', 'AI Research', 'AI Workstation'] },
    { title: 'Chọn theo GPU', links: ['RTX 4060 Ti', 'RTX 4070 Ti SUPER', 'RTX 4080 SUPER', 'RTX 4090', 'RTX 5070', 'RTX 5070 Ti', 'RTX 5080', 'RTX 5090', 'GPU VRAM cao'] },
    { title: 'Chọn theo VRAM', links: ['8GB', '12GB', '16GB', '24GB', '32GB+'] },
    { title: 'Chọn theo RAM', links: ['32GB', '64GB', '128GB', '256GB+'] },
    { title: 'Chọn theo mức giá', links: ['30–50 triệu', '50–80 triệu', '80–120 triệu', '120–200 triệu', 'Trên 200 triệu'] },
  ] },
  { label: 'Linh kiện máy tính', icon: <WrenchIcon />, groups: [
    { title: 'Bộ xử lý & nền tảng', links: ['CPU Intel', 'CPU AMD', 'Mainboard Intel', 'Mainboard AMD', 'Chipset mới'] },
    { title: 'Bộ nhớ & lưu trữ', links: ['RAM DDR4', 'RAM DDR5', 'SSD NVMe', 'SSD SATA', 'HDD'] },
    { title: 'Đồ họa & nguồn', links: ['NVIDIA GeForce', 'AMD Radeon', 'PSU 80 Plus', 'Case PC', 'Tản nhiệt'] },
    { title: 'Chọn nhanh linh kiện', links: ['CPU', 'VGA / Card màn hình', 'Mainboard', 'RAM', 'SSD / HDD', 'PSU / Nguồn', 'Case', 'Tản nhiệt'] },
  ] },
  { label: 'CPU', icon: <ChipIcon />, groups: [
    { title: 'Chọn theo hãng', links: ['Intel', 'AMD'] },
    { title: 'Chọn theo dòng', links: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core Ultra 5', 'Intel Core Ultra 7', 'Intel Core Ultra 9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'AMD Threadripper'] },
    { title: 'Chọn theo socket', links: ['LGA 1700', 'LGA 1851', 'AM4', 'AM5', 'sTR5'] },
    { title: 'Chọn theo nhu cầu', links: ['Gaming', 'Văn phòng', 'Đồ họa', 'Streaming', 'Workstation'] },
    { title: 'Chọn theo phân khúc giá', links: ['Dưới 3 triệu', '3–5 triệu', '5–8 triệu', '8–12 triệu', 'Trên 12 triệu'] },
  ] },
  { label: 'VGA / Card màn hình', icon: <DesktopIcon />, groups: [
    { title: 'Chọn theo hãng GPU', links: ['NVIDIA', 'AMD', 'Intel'] },
    { title: 'Chọn theo thương hiệu', links: ['ASUS', 'MSI', 'Gigabyte', 'Zotac', 'PNY', 'Colorful', 'Galax', 'Palit', 'Inno3D', 'Sapphire', 'PowerColor', 'XFX'] },
    { title: 'Chọn theo dòng', links: ['GeForce RTX', 'GeForce GTX', 'Radeon RX', 'Intel Arc'] },
    { title: 'Chọn theo VRAM', links: ['4GB', '6GB', '8GB', '12GB', '16GB', '24GB trở lên'] },
    { title: 'Chọn theo nhu cầu', links: ['Gaming', 'AI', 'Đồ họa', 'Render', 'Streaming'] },
  ] },
  { label: 'Mainboard', icon: <MonitorIcon />, groups: [
    { title: 'Chọn theo hãng', links: ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Colorful', 'NZXT', 'Biostar'] },
    { title: 'Chọn theo nền tảng', links: ['Intel', 'AMD'] },
    { title: 'Chọn theo socket', links: ['LGA 1700', 'LGA 1851', 'AM4', 'AM5'] },
    { title: 'Chọn theo form factor', links: ['ATX', 'Micro ATX', 'Mini ITX', 'E-ATX'] },
    { title: 'Chọn theo nhu cầu', links: ['Gaming', 'Workstation', 'PC văn phòng', 'PC nhỏ gọn'] },
  ] },
  { label: 'RAM', icon: <StorageIcon />, groups: [
    { title: 'Chọn theo hãng', links: ['Kingston', 'Corsair', 'G.Skill', 'TeamGroup', 'ADATA', 'Lexar', 'Crucial', 'Patriot', 'Apacer', 'Samsung'] },
    { title: 'Chọn theo thế hệ', links: ['DDR4', 'DDR5'] },
    { title: 'Chọn theo dung lượng', links: ['8GB', '16GB', '32GB', '64GB', '128GB+'] },
    { title: 'Chọn theo bus', links: ['2666MHz', '3200MHz', '3600MHz', '4800MHz', '5600MHz', '6000MHz', '6400MHz+'] },
    { title: 'Chọn theo kit', links: ['1 thanh', '2 thanh', '4 thanh'] },
  ] },
  { label: 'SSD / HDD', icon: <StorageIcon />, groups: [
    { title: 'SSD theo phân khúc', links: ['SSD cao cấp', 'SSD gaming', 'SSD phổ thông', 'SSD giá tốt'] },
    { title: 'Chọn theo giao tiếp', links: ['SATA III', 'NVMe PCIe 3.0', 'NVMe PCIe 4.0', 'NVMe PCIe 5.0', 'M.2 2230', 'M.2 2280', '2.5 inch'] },
    { title: 'Chọn theo dung lượng', links: ['256GB', '500GB', '512GB', '1TB', '2TB', '4TB', '8TB+'] },
    { title: 'Chọn theo nhu cầu', links: ['Gaming', 'Windows / hệ điều hành', 'Laptop', 'PC', 'Workstation', 'Đồ họa / dựng phim', 'Máy chủ / NAS'] },
    { title: 'HDD', links: ['HDD 2.5 inch', 'HDD 3.5 inch', 'HDD cho NAS', 'HDD 1TB', 'HDD 2TB', 'HDD 4TB trở lên'] },
  ] },
  { label: 'PSU / Nguồn', icon: <NetworkIcon />, groups: [
    { title: 'Chọn theo hãng', links: ['Corsair', 'Cooler Master', 'ASUS', 'MSI', 'Gigabyte', 'FSP', 'Seasonic', 'Thermaltake', 'Super Flower', 'DeepCool', 'Antec', 'XPG'] },
    { title: 'Chọn theo công suất', links: ['450W', '550W', '650W', '750W', '850W', '1000W', '1200W+'] },
    { title: 'Chọn theo chứng nhận', links: ['80 Plus Bronze', '80 Plus Gold', '80 Plus Platinum', '80 Plus Titanium'] },
    { title: 'Chọn theo modular', links: ['Non Modular', 'Semi Modular', 'Full Modular'] },
  ] },
  { label: 'Case', icon: <DesktopIcon />, groups: [
    { title: 'Chọn theo form', links: ['Mini ITX', 'Micro ATX', 'ATX', 'Full Tower'] },
    { title: 'Chọn theo kiểu', links: ['Gaming', 'Kính cường lực', 'Panoramic', 'Mesh', 'Dual Chamber', 'Mini Case'] },
    { title: 'Chọn theo hãng', links: ['ASUS', 'NZXT', 'Corsair', 'Lian Li', 'Cooler Master', 'Fractal Design', 'Montech', 'DeepCool', 'Thermaltake', 'Antec'] },
  ] },
  { label: 'Tản nhiệt', icon: <GamepadIcon />, groups: [
    { title: 'Chọn theo loại', links: ['Tản khí', 'AIO 120mm', 'AIO 240mm', 'AIO 280mm', 'AIO 360mm', 'AIO 420mm'] },
    { title: 'Chọn theo hãng', links: ['DeepCool', 'Cooler Master', 'Corsair', 'ASUS', 'NZXT', 'Thermalright', 'Noctua', 'ID-COOLING', 'Arctic', 'Lian Li'] },
    { title: 'Chọn theo socket', links: ['AM4', 'AM5', 'LGA 1700', 'LGA 1851'] },
  ] },
  { label: 'Màn hình máy tính', icon: <MonitorIcon />, groups: [
    { title: 'Chọn theo hãng', links: ['ASUS', 'MSI', 'ViewSonic', 'Samsung', 'LG', 'Gigabyte', 'Dell', 'Cooler Master', 'AOC', 'Acer', 'Lenovo', 'Philips'] },
    { title: 'Chọn theo kích thước', links: ['22 inch', '23 inch', '24 inch', '25 inch', '27 inch', '29 inch', '32 inch', '34 inch', '38 inch trở lên'] },
    { title: 'Chọn độ phân giải', links: ['Full HD', '2K QHD', '2.5K', '4K UHD', '5K', '6K'] },
    { title: 'Chọn tần số quét', links: ['60Hz', '75Hz', '100Hz', '120Hz', '144Hz', '165Hz', '180Hz', '240Hz', '360Hz'] },
    { title: 'Chọn theo nhu cầu', links: ['Gaming', 'Văn phòng', 'Đồ họa', 'Thiết kế', 'Màn hình cong', 'Màn hình Ultrawide', 'Màn hình esports'] },
  ] },
  { label: 'Thiết bị lưu trữ', icon: <StorageIcon />, groups: [
    { title: 'SSD theo phân khúc', links: ['SSD cao cấp', 'SSD gaming', 'SSD phổ thông', 'SSD giá tốt', 'Thương hiệu Trung Quốc / New Gen'] },
    { title: 'Chọn theo hãng', links: ['Samsung', 'WD', 'SanDisk', 'Kingston', 'Crucial', 'KIOXIA', 'Seagate', 'ADATA', 'Lexar', 'Corsair', 'PNY', 'TeamGroup', 'Gigabyte', 'MSI', 'HIKSEMI', 'Netac', 'Fanxiang', 'ZhiTai', 'KingSpec', 'BIWIN', 'Gloway', 'Asgard', 'Colorful'] },
    { title: 'Chọn theo giao tiếp', links: ['SATA III', 'NVMe PCIe 3.0', 'NVMe PCIe 4.0', 'NVMe PCIe 5.0', 'M.2 2230', 'M.2 2280', '2.5 inch'] },
    { title: 'Chọn theo dung lượng', links: ['256GB', '500GB', '512GB', '1TB', '2TB', '4TB', '8TB+'] },
    { title: 'Chọn theo nhu cầu', links: ['Gaming', 'Windows / hệ điều hành', 'Laptop', 'PC', 'Workstation', 'Đồ họa / dựng phim', 'Máy chủ / NAS'] },
  ] },
  { label: 'Thiết bị văn phòng', icon: <BriefcaseIcon />, groups: [
    { title: 'Chọn theo nhóm', links: ['Máy in', 'Máy scan', 'Máy chiếu', 'Mực in', 'Máy chấm công', 'Webcam', 'UPS', 'Máy hủy tài liệu', 'Phụ kiện văn phòng'] },
    { title: 'Chọn theo hãng', links: ['HP', 'Canon', 'Brother', 'Epson', 'Fujifilm', 'Panasonic', 'Logitech', 'ViewSonic', 'BenQ'] },
    { title: 'Chọn theo nhu cầu', links: ['Văn phòng gia đình', 'Doanh nghiệp', 'In tài liệu', 'In màu', 'Scan', 'Họp trực tuyến', 'Trình chiếu'] },
  ] },
  { label: 'Phím, chuột, ghế, gear', icon: <GamepadIcon />, groups: [
    { title: 'Chọn theo nhóm', links: ['Bàn phím', 'Chuột', 'Tai nghe', 'Mousepad', 'Webcam', 'Micro', 'Ghế Gaming', 'Bàn Gaming', 'Arm Monitor', 'Phụ kiện Gaming'] },
    { title: 'Chọn theo hãng bàn phím', links: ['Logitech', 'Razer', 'SteelSeries', 'Corsair', 'ASUS', 'Keychron', 'Akko', 'MonsGeek', 'FL-Esports', 'Dareu', 'Aula', 'Royal Kludge', 'NuPhy', 'IQUNIX', 'Wooting'] },
    { title: 'Chọn theo hãng chuột', links: ['Logitech', 'Razer', 'ZOWIE', 'SteelSeries', 'ASUS', 'Corsair', 'HyperX', 'Glorious', 'Pulsar', 'Lamzu', 'ATK', 'MCHOSE', 'VXE', 'VGN', 'WLMOUSE', 'Darmoshark', 'Waizowl', 'AJAZZ', 'DELUX', 'Rapoo'] },
    { title: 'Chọn theo loại bàn phím', links: ['Mechanical', 'Membrane', 'Wireless', 'Bluetooth', '2.4GHz', 'Hall Effect', 'Rapid Trigger', '60%', '65%', '75%', 'TKL', 'Full Size'] },
    { title: 'Chọn theo chuột', links: ['Wireless', 'Wired', 'Bluetooth', '2.4GHz', 'Lightweight', 'Ergonomic', 'FPS', 'MOBA', 'Esports', '1000Hz', '2000Hz', '4000Hz', '8000Hz'] },
    { title: 'Chọn theo ghế', links: ['Ghế Gaming', 'Ghế công thái học', 'Ghế văn phòng', 'Ghế cao cấp', 'Ghế dưới 5 triệu', 'Ghế 5–10 triệu', 'Ghế trên 10 triệu'] },
  ] },
  { label: 'Thiết bị mạng', icon: <NetworkIcon />, groups: [
    { title: 'Chọn theo nhóm', links: ['Router WiFi', 'Mesh WiFi', 'Access Point', 'Switch', 'Card mạng', 'WiFi Adapter', 'USB WiFi', 'Repeater', 'Modem', 'Router Gaming', 'Thiết bị mạng 5G'] },
    { title: 'Chọn theo hãng', links: ['TP-Link', 'ASUS', 'Tenda', 'Xiaomi', 'Ubiquiti', 'Ruijie', 'MikroTik', 'D-Link', 'TOTOLINK', 'Mercusys', 'FPT', 'Viettel'] },
    { title: 'Chọn theo chuẩn WiFi', links: ['WiFi 5', 'WiFi 6', 'WiFi 6E', 'WiFi 7'] },
    { title: 'Chọn theo tốc độ', links: ['100Mbps', '1Gbps', '2.5Gbps', '5Gbps', '10Gbps'] },
    { title: 'Chọn theo nhu cầu', links: ['Gia đình', 'Gaming', 'Văn phòng', 'Doanh nghiệp', 'Streaming', 'WiFi diện rộng'] },
  ] },
  { label: 'Webcam / phụ kiện', icon: <WebcamIcon />, groups: [
    { title: 'Webcam - chọn theo hãng', links: ['Logitech', 'Razer', 'ASUS', 'AVerMedia', 'Elgato', 'Anker', 'HIKVISION'] },
    { title: 'Webcam - chọn theo độ phân giải', links: ['720p', '1080p', '2K', '4K'] },
    { title: 'Micro - chọn theo loại', links: ['USB', 'XLR', 'Condenser', 'Dynamic', 'Streaming', 'Podcast'] },
    { title: 'Micro - chọn theo hãng', links: ['HyperX', 'Razer', 'Logitech', 'Elgato', 'FIFINE', 'Maono', 'Thronmax', 'Audio-Technica'] },
    { title: 'Thiết bị hình ảnh', links: ['Capture Card', 'Tripod', 'Đèn livestream'] },
  ] },
  { label: 'Loa / tai nghe', icon: <HeadsetIcon />, groups: [
    { title: 'Tai nghe - chọn theo loại', links: ['Gaming', 'Wireless', 'Wired', 'Bluetooth', 'In-ear', 'Over-ear', 'Noise Cancelling'] },
    { title: 'Tai nghe - chọn theo hãng', links: ['HyperX', 'Razer', 'Logitech', 'SteelSeries', 'Corsair', 'ASUS', 'Sony', 'JBL', 'Audio-Technica', 'Sennheiser'] },
    { title: 'Loa', links: ['Loa máy tính', 'Soundbar', 'Loa Bluetooth', 'Loa streaming'] },
    { title: 'Theo nhu cầu', links: ['Gaming', 'Âm nhạc', 'Họp online', 'Streaming'] },
  ] },
  { label: 'Phần mềm / phụ kiện khác', icon: <ShieldIcon />, groups: [
    { title: 'Phần mềm', links: ['Windows', 'Microsoft 365', 'Phần mềm đồ họa', 'Antivirus'] },
    { title: 'Phụ kiện khác', links: ['Dây cáp', 'Keo tản nhiệt', 'Vệ sinh máy', 'Linh kiện thay thế'] },
  ] },
]

export default function Header() {
  const { user, token, loading: authLoading, authenticated, logout } = useAuth()
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('PC Gaming')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [cartRefresh, setCartRefresh] = useState(0)
  const categoryMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const refreshCart = () => setCartRefresh((value) => value + 1)
    window.addEventListener('tk-cart-updated', refreshCart)
    return () => window.removeEventListener('tk-cart-updated', refreshCart)
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target as Node)) {
        setCategoryOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (authLoading || !authenticated || !user?.id) {
      setCartCount(0)
      return
    }
    const controller = new AbortController()
    fetch(`${API_BASE_URL}/api/cart/${encodeURIComponent(user.id)}`, {
      signal: controller.signal,
      headers: cartHeaders(token),
    })
      .then(async (response) => {
        if (!response.ok) return
        const payload = await response.json() as { data?: { items?: Array<{ quantity: number }> } }
        if (!controller.signal.aborted) setCartCount((payload.data?.items ?? []).reduce((sum, item) => sum + item.quantity, 0))
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== 'AbortError') setCartCount(0)
      })
    return () => controller.abort()
  }, [authLoading, authenticated, cartRefresh, token, user?.id])

  return (
    <header className="sticky top-0 z-50 border-b border-blue-900/20 bg-gradient-to-r from-[#0e5be3] via-[#0d4fc0] to-[#0b3d8f] text-white shadow-[0_10px_28px_rgba(8,45,120,0.18)]">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-4 xl:px-6">
        <div className="flex items-center gap-3 py-3 xl:gap-4">
          <Link href="/" className="mr-1 inline-flex items-center text-3xl font-black tracking-tight text-white drop-shadow-sm sm:text-4xl">
            TK
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-sm font-medium text-white/90 lg:flex">
            <MapPinIcon />
            <span>Hà Nội</span>
          </div>

          <div className="relative hidden flex-1 max-w-[720px] md:block">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <SearchIcon />
            </span>
            <input
              aria-label="Tìm kiếm sản phẩm"
              name="product-search"
              autoComplete="off"
              placeholder="Bạn cần tìm gì?"
              className="w-full rounded-full border border-white/20 bg-white px-4 py-3 pl-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none ring-0 focus:border-white"
            />
          </div>

          <nav className="hidden items-center gap-2 xl:flex">
            {topActions.filter((item) => !['Tài khoản', 'Giỏ hàng'].includes(item.label)).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 hover:text-white"
              >
                <span className="text-base text-white/85">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <Link href="/cart" className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10">
              <span className="text-base text-white/85"><CartIcon /></span><span>Giỏ hàng</span>
              {authenticated && cartCount > 0 ? <span className="absolute -right-1 -top-2 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">{cartCount}</span> : null}
            </Link>
            {authLoading ? <span className="rounded-full border border-white/15 px-3 py-2 text-sm text-white/70">Đang tải...</span> : authenticated && user ? (
              <div className="relative">
                <button type="button" onClick={() => setAccountOpen((open) => !open)} aria-expanded={accountOpen} className="inline-flex max-w-48 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10">
                  <UserIcon /><span className="truncate">{user.name || user.email}</span>
                </button>
                {accountOpen ? <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-xl"><p className="truncate px-3 py-2 text-xs text-slate-500">{user.email}</p><span className="block rounded-lg px-3 py-2 text-slate-400">Tài khoản</span><Link href="/orders" onClick={() => setAccountOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-blue-700">Đơn hàng của tôi</Link><span className="block rounded-lg px-3 py-2 text-slate-400">Địa chỉ</span><button type="button" onClick={() => { logout(); setAccountOpen(false) }} className="w-full rounded-lg px-3 py-2 text-left font-bold text-red-600 hover:bg-red-50">Đăng xuất</button></div> : null}
              </div>
            ) : <><Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"><UserIcon />Đăng nhập</Link><Link href="/register" className="inline-flex items-center rounded-full bg-white px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">Đăng ký</Link></>}
          </nav>

          <button
            type="button"
            aria-label="Mở menu mobile"
            onClick={() => setMobileOpen(true)}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/15 xl:hidden"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#0b3b8d]">
        <div className="mx-auto max-w-[1600px] px-3 sm:px-4 xl:px-6">
          <div className="relative hidden items-center gap-3 py-2.5 xl:flex">
            <div ref={categoryMenuRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setCategoryOpen((open) => !open)}
                aria-expanded={categoryOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-blue-700 shadow-sm transition hover:bg-blue-50"
              >
                <span className="text-base"><HamburgerIcon /></span>
                <span>Danh mục sản phẩm</span>
              </button>

              {categoryOpen && (
                <div className="absolute left-0 top-[calc(100%+0.7rem)] z-[70] flex max-h-[min(72vh,650px)] w-[min(1180px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.2)]">
                  <div className="w-[260px] flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
                    {megaCategories.map((category) => (
                      <button
                        key={category.label}
                        type="button"
                        onClick={() => setSelectedCategory(category.label)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${selectedCategory === category.label ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-700 hover:bg-blue-100 hover:text-blue-700'}`}
                      >
                        <span className={selectedCategory === category.label ? 'text-white' : 'text-blue-600'}>{category.icon}</span>
                        <span>{category.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 overflow-y-auto p-5">
                    {(() => {
                      const category = megaCategories.find((item) => item.label === selectedCategory) || megaCategories[0]
                      return (
                        <>
                          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-black text-slate-900">{category.label}</h3>
                            <Link href={`/products?search=${encodeURIComponent(category.label)}`} className="text-xs font-bold text-blue-700 hover:text-blue-500">Xem tất cả →</Link>
                          </div>
                          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
                            {category.groups.map((group) => (
                              <div key={group.title}>
                                <h4 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600">{group.title}</h4>
                                <div className="grid grid-cols-2 gap-1">
                                  {group.links.map((link) => (
                                    <Link key={link} href={`/products?search=${encodeURIComponent(link)}`} className="rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">{link}</Link>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            <nav className="flex items-center gap-1 whitespace-nowrap">
              {mainNavigation.map((item) => (
                <div key={item.label} className="group relative">
                  <Link
                    href={item.href}
                    onMouseEnter={() => {
                      if (item.label === 'Laptop') {
                        setSelectedCategory('Laptop')
                        setCategoryOpen(true)
                      }
                    }}
                    onClick={(event) => {
                      if (item.label === 'Linh kiện PC' || item.label === 'Laptop') {
                        event.preventDefault()
                        setSelectedCategory(item.label === 'Linh kiện PC' ? 'Linh kiện máy tính' : 'Laptop')
                        setCategoryOpen(true)
                      }
                    }}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
                  >
                    <span className="text-base text-white/85">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.label !== 'Tra cứu bảo hành' && <ChevronDownIcon />}
                  </Link>

                  {item.label !== 'Tra cứu bảo hành' && (
                    <div className="invisible absolute left-0 top-full z-40 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-[0_18px_38px_rgba(15,23,42,0.18)] transition group-hover:visible group-hover:opacity-100">
                      {item.label === 'PC' && (
                        <ul className="space-y-1">
                          {['Gaming', 'Workstation', 'Bộ máy tiêu chuẩn'].map((sub) => (
                            <li key={sub}><Link href="#" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{sub}</Link></li>
                          ))}
                        </ul>
                      )}
                      {item.label === 'Laptop' && (
                        <ul className="space-y-1">
                          {['Gaming', 'Văn phòng', 'Đồ họa sáng tạo', 'Workstation'].map((sub) => (
                            <li key={sub}><Link href="#" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{sub}</Link></li>
                          ))}
                        </ul>
                      )}
                      {item.label === 'Mini PC' && (
                        <ul className="space-y-1">
                          {['Văn phòng', 'AI', 'Rạp phim tại nhà', 'Nhỏ gọn'].map((sub) => (
                            <li key={sub}><Link href="#" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{sub}</Link></li>
                          ))}
                        </ul>
                      )}
                      {item.label === 'PC AI' && (
                        <ul className="space-y-1">
                          {['RTX Workstation', 'NPU AI', 'Creator', 'Server AI'].map((sub) => (
                            <li key={sub}><Link href="#" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{sub}</Link></li>
                          ))}
                        </ul>
                      )}
                      {item.label === 'Linh kiện PC' && (
                        <ul className="space-y-1">
                          {['CPU', 'Mainboard', 'RAM', 'VGA', 'PSU', 'Case'].map((sub) => (
                            <li key={sub}><Link href="#" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{sub}</Link></li>
                          ))}
                        </ul>
                      )}
                      {item.label === 'Màn hình' && (
                        <ul className="space-y-1">
                          {['Gaming', 'Office', 'Creator', 'Ultrawide'].map((sub) => (
                            <li key={sub}><Link href="#" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{sub}</Link></li>
                          ))}
                        </ul>
                      )}
                      {item.label === 'Phím chuột ghế gear' && (
                        <ul className="space-y-1">
                          {['Bàn phím', 'Chuột', 'Tai nghe', 'Ghế'].map((sub) => (
                            <li key={sub}><Link href="#" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700">{sub}</Link></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/45 xl:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-sm overscroll-contain overflow-y-auto bg-white p-4 text-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <Link href="/" onClick={() => setMobileOpen(false)} className="text-3xl font-black tracking-tight text-blue-700">
                TK
              </Link>
              <button type="button" aria-label="Đóng menu" className="rounded-lg border border-slate-200 p-2 text-slate-700" onClick={() => setMobileOpen(false)}>
                <CloseIcon />
              </button>
            </div>

            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <button
                type="button"
                aria-expanded={mobileCategoryOpen}
                onClick={() => setMobileCategoryOpen((open) => !open)}
                className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-3 font-bold uppercase tracking-[0.08em] text-blue-700 shadow-sm"
              >
                <span><HamburgerIcon /></span>
                <span>Danh mục sản phẩm</span>
                <span className="ml-auto text-slate-400">{mobileCategoryOpen ? '−' : '+'}</span>
              </button>
              {mobileCategoryOpen && (
                <div className="mt-3 space-y-1 rounded-xl bg-white p-2">
                  {megaCategories.map((category) => (
                    <details key={category.label} className="group rounded-lg border border-slate-100">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                        <span className="text-blue-600">{category.icon}</span>
                        <span>{category.label}</span>
                        <span className="ml-auto text-slate-400 transition group-open:rotate-180"><ChevronDownIcon /></span>
                      </summary>
                      <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                        {category.groups.map((group) => (
                          <div key={group.title}>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{group.title}</p>
                            <div className="grid grid-cols-2 gap-1">
                              {group.links.map((link) => (
                                <Link key={link} href={`/products?search=${encodeURIComponent(link)}`} onClick={() => setMobileOpen(false)} className="rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700">{link}</Link>
                              ))}
                            </div>

                            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                              {authenticated && user ? (
                                <>
                                  <p className="truncate text-sm font-black text-slate-900">{user.name || user.email}</p>
                                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                                  <button type="button" onClick={() => { logout(); setMobileOpen(false) }} className="mt-3 w-full rounded-lg bg-red-50 px-3 py-2 text-left text-sm font-bold text-red-600">Đăng xuất</button>
                                </>
                              ) : (
                                <div className="flex gap-2">
                                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg bg-blue-700 px-3 py-2 text-center text-sm font-bold text-white">Đăng nhập</Link>
                                  <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-center text-sm font-bold text-blue-700">Đăng ký</Link>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {mainNavigation.map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50">
                  <Link href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-slate-800">
                    <span className="flex items-center gap-3">
                      <span className="text-blue-600">{item.icon}</span>
                      {item.label}
                    </span>
                    {item.label !== 'Tra cứu bảo hành' && <ChevronDownIcon />}
                  </Link>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </header>
  )
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 5 5" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.9 19.9 0 0 1-8.7-3.3 19.5 19.5 0 0 1-6-6A19.9 19.9 0 0 1 2 5.1 2 2 0 0 1 4 3h3a2 2 0 0 1 2 1.7l.6 3.2a2 2 0 0 1-.6 1.9l-1.3 1.3a16 16 0 0 0 7.4 7.4l1.3-1.3a2 2 0 0 1 1.9-.6l3.2.6A2 2 0 0 1 22 16.9Z" />
    </svg>
  )
}

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a2 2 0 0 1 2 2v12.5A2.5 2.5 0 0 1 18.5 20H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="18" cy="19" r="1.5" />
      <path d="M3 4h2l2.3 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L19 7H7" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.6-3.2 5-5 8-5s6.4 1.8 8 5" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function DesktopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

function LaptopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v7.5H3V7.5Z" />
      <path d="M2 18h20l-1.5 2h-17L2 18Z" />
    </svg>
  )
}

function MiniPcIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="4" y="5" width="16" height="10" rx="2" />
      <path d="M9 19h6M8 15h8" />
    </svg>
  )
}

function ChipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M15.5 4.5a3.5 3.5 0 0 0-5 4.5L4 18l2 2 6.5-6.5a3.5 3.5 0 0 0 3-9Zm-7 11 3 3" />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

function GamepadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M6 12h3m-1.5-1.5v3M15 8h.01M18 12h.01M7 8h.01M8 10.5a8 8 0 0 1 8 0l1.5 1.5A2 2 0 0 1 17 16H7a2 2 0 0 1-1.5-3.5L7 10.5Z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 3l7 3v6c0 4.4-3 8.5-7 9-4-0.5-7-4.6-7-9V6l7-3Z" />
      <path d="M9.5 12.5l1.5 1.5 3.5-4" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <path d="M15.5 7.5c-1.2 0-2.2.7-3.5.7s-2.1-.7-3.4-.7c-2.1 0-4.2 1.7-4.2 5.2 0 2.1.8 4.3 1.8 5.7.9 1.2 1.9 2.5 3.2 2.4 1.2 0 1.6-.8 3-.8s1.8.8 3 .8c1.3 0 2.2-1.2 3.1-2.4.6-.8 1.2-1.8 1.5-2.8-3.7-1.5-3.8-6.2-.1-7.6-.8-1-2.1-1.5-3.4-1.5Z" />
      <path d="M15 3.5c.1 1.2-.4 2.3-1.2 3.1-.8.8-1.9 1.3-3 1.2-.1-1.1.3-2.3 1.1-3.1.8-.8 2-1.2 3.1-1.2Z" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2" />
    </svg>
  )
}

function StorageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
    </svg>
  )
}

function NetworkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="9" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /><path d="M12 9v3M6 15v-3h12v3" />
    </svg>
  )
}

function WebcamIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="4" y="6" width="16" height="12" rx="3" /><circle cx="12" cy="12" r="3" /><path d="M8 21h8M12 18v3" />
    </svg>
  )
}

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v5H5a1 1 0 0 1-1-1v-4ZM20 14h-3v5h2a1 1 0 0 0 1-1v-4Z" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-white/70">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
