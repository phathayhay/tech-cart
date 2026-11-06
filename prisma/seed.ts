import { PrismaClient, DiscountType, ProductStatus, AccountStatus, InventoryTxType } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

export async function runSeed(): Promise<void> {
  console.log('🌱 [Seed] Starting idempotent PostgreSQL seed (Currency: VND)...')

  // 0. Apply custom PostgreSQL CHECK constraints & FTS GIN index
  const sqlFile = path.resolve(__dirname, '../database/constraints_and_fts.sql')
  if (fs.existsSync(sqlFile)) {
    const rawSql = fs.readFileSync(sqlFile, 'utf8')
    const statements = rawSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt)
    }
    console.log('✅ [Seed] Custom PostgreSQL CHECK constraints & GIN FTS index verified.')
  }

  // 1. Seed Permissions
  const permissionDefs = [
    { code: 'catalog.read', module: 'CATALOG', description: 'Xem sản phẩm và danh mục' },
    { code: 'products.write', module: 'CATALOG', description: 'Thêm/sửa/ẩn sản phẩm và biến thể' },
    { code: 'categories.write', module: 'CATALOG', description: 'Quản lý cây danh mục' },
    { code: 'cart.manage_own', module: 'CART', description: 'Quản lý giỏ hàng cá nhân' },
    { code: 'checkout.create', module: 'CHECKOUT', description: 'Đặt hàng và thanh toán' },
    { code: 'orders.read_own', module: 'ORDERS', description: 'Xem đơn hàng cá nhân' },
    { code: 'orders.cancel_own', module: 'ORDERS', description: 'Hủy đơn hàng cá nhân khi chờ xử lý' },
    { code: 'orders.read_all', module: 'ORDERS', description: 'Xem toàn bộ đơn hàng hệ thống' },
    { code: 'orders.write', module: 'ORDERS', description: 'Cập nhật trạng thái đơn và vận đơn' },
    { code: 'inventory.read', module: 'INVENTORY', description: 'Xem tồn kho và lịch sử kho' },
    { code: 'inventory.write', module: 'INVENTORY', description: 'Nhập kho và điều chỉnh tồn kho' },
    { code: 'promotions.write', module: 'PROMOTIONS', description: 'Quản lý voucher và khuyến mãi' },
    { code: 'payments.refund', module: 'PAYMENTS', description: 'Thực hiện hoàn tiền đơn hàng' },
    { code: 'reviews.create_verified', module: 'REVIEWS', description: 'Đánh giá sản phẩm đã mua' },
    { code: 'reviews.moderate', module: 'REVIEWS', description: 'Duyệt và phản hồi đánh giá' },
    { code: 'support.manage_own', module: 'SUPPORT', description: 'Tạo và phản hồi phiếu hỗ trợ cá nhân' },
    { code: 'support.manage_all', module: 'SUPPORT', description: 'Xử lý toàn bộ phiếu hỗ trợ khách hàng' },
    { code: 'users.manage', module: 'USERS', description: 'Quản lý tài khoản và phân quyền' },
    { code: 'analytics.read', module: 'ANALYTICS', description: 'Xem báo cáo doanh thu và chuyển đổi' },
    { code: 'ai.chat', module: 'AI', description: 'Tương tác với Trợ lý mua sắm AI' },
    { code: 'ai.manage', module: 'AI', description: 'Cấu hình chính sách AI và giám sát chi phí token' },
    { code: 'audit.read', module: 'AUDIT', description: 'Xem nhật ký kiểm toán hệ thống' }
  ]

  const permissionMap = new Map<string, string>()
  for (const perm of permissionDefs) {
    const saved = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: perm
    })
    permissionMap.set(perm.code, saved.id)
  }

  // 2. Seed Roles & RolePermissions
  const roleDefs = [
    {
      code: 'CUSTOMER',
      name: 'Khách hàng',
      description: 'Khách hàng mua sắm đã đăng ký tài khoản',
      perms: [
        'catalog.read',
        'cart.manage_own',
        'checkout.create',
        'orders.read_own',
        'orders.cancel_own',
        'reviews.create_verified',
        'support.manage_own',
        'ai.chat'
      ]
    },
    {
      code: 'SUPPORT_AGENT',
      name: 'Chuyên viên Hỗ trợ (CSKH)',
      description: 'Nhân viên hỗ trợ đơn hàng, đánh giá và xử lý phiếu CSKH',
      perms: [
        'catalog.read',
        'orders.read_all',
        'orders.write',
        'reviews.moderate',
        'support.manage_all',
        'ai.chat'
      ]
    },
    {
      code: 'INVENTORY_MANAGER',
      name: 'Quản lý Kho & Sản phẩm',
      description: 'Nhân viên quản lý danh mục, sản phẩm, biến thể, tồn kho và giao vận',
      perms: [
        'catalog.read',
        'products.write',
        'categories.write',
        'inventory.read',
        'inventory.write',
        'orders.read_all',
        'orders.write',
        'analytics.read'
      ]
    },
    {
      code: 'SUPER_ADMIN',
      name: 'Quản trị viên Cấp cao',
      description: 'Toàn quyền quản trị hệ thống, tài chính, khuyến mãi và AI',
      perms: permissionDefs.map((p) => p.code)
    }
  ]

  const roleMap = new Map<string, string>()
  for (const r of roleDefs) {
    const savedRole = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: { code: r.code, name: r.name, description: r.description }
    })
    roleMap.set(r.code, savedRole.id)

    for (const permCode of r.perms) {
      const permId = permissionMap.get(permCode)!
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: savedRole.id, permissionId: permId } },
        update: {},
        create: { roleId: savedRole.id, permissionId: permId }
      })
    }
  }
  console.log('✅ [Seed] Roles & 22 Granular Permissions seeded.')

  // 3. Seed Default Accounts (Password: Password123!)
  const defaultPasswordHash = await bcrypt.hash('Password123!', 12)
  const testUsers = [
    {
      email: 'admin@techcart.com',
      username: 'superadmin',
      fullName: 'Nguyễn Quản Trị (Super Admin)',
      phone: '0901000001',
      roleCode: 'SUPER_ADMIN'
    },
    {
      email: 'inventory@techcart.com',
      username: 'warehouse_mgr',
      fullName: 'Trần Kho Vận (Inventory Manager)',
      phone: '0901000002',
      roleCode: 'INVENTORY_MANAGER'
    },
    {
      email: 'support@techcart.com',
      username: 'support_agent',
      fullName: 'Lê Hỗ Trợ (Customer Support)',
      phone: '0901000003',
      roleCode: 'SUPPORT_AGENT'
    },
    {
      email: 'customer@techcart.com',
      username: 'khachhang_vip',
      fullName: 'Phạm Minh Phát (Khách hàng)',
      phone: '0909123456',
      roleCode: 'CUSTOMER'
    }
  ]

  for (const u of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        phone: u.phone,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date()
      },
      create: {
        email: u.email,
        username: u.username,
        passwordHash: defaultPasswordHash,
        fullName: u.fullName,
        phone: u.phone,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date()
      }
    })

    const roleId = roleMap.get(u.roleCode)!
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId }
    })

    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id }
    })
  }
  console.log('✅ [Seed] 4 Default Staff & Customer Accounts seeded (Password: Password123!).')

  // 4. Seed Categories
  const categoryDefs = [
    {
      name: 'Tai nghe & Âm thanh',
      slug: 'tai-nghe-am-thanh',
      description: 'Tai nghe chống ồn chủ động ANC, tai nghe Hi-Res và thiết bị âm thanh phòng thu',
      sortOrder: 1
    },
    {
      name: 'Bàn phím Cơ Custom',
      slug: 'ban-phim-co',
      description: 'Bàn phím cơ khung nhôm CNC, mạch Hotswap, kết nối 3 chế độ Không dây',
      sortOrder: 2
    },
    {
      name: 'Đồng hồ & Thiết bị Đeo',
      slug: 'dong-ho-thiet-bi-deo',
      description: 'Đồng hồ thông minh khung Titanium, GPS băng tần kép và cảm biến sức khỏe',
      sortOrder: 3
    },
    {
      name: 'Màn hình Đồ họa & Gaming',
      slug: 'man-hinh-may-tinh',
      description: 'Màn hình 4K OLED, Mini-LED chuẩn màu Delta E < 1 cho Designer và Gamer',
      sortOrder: 4
    },
    {
      name: 'Chuột Không dây Siêu nhẹ',
      slug: 'chuot-khong-day',
      description: 'Chuột eSports siêu nhẹ dưới 55g, mắt đọc quang học 30.000 DPI, Polling Rate 4000Hz',
      sortOrder: 5
    },
    {
      name: 'Phụ kiện & Hub Thunderbolt',
      slug: 'phu-kien-hub',
      description: 'Docking Station Thunderbolt 4, sạc nhanh GaN và phụ kiện bàn làm việc tối giản',
      sortOrder: 6
    }
  ]

  const categoryMap = new Map<string, string>()
  for (const cat of categoryDefs) {
    const saved = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      create: cat
    })
    categoryMap.set(cat.slug, saved.id)
  }

  // 5. Seed Product Attributes & Values
  const colorAttr = await prisma.productAttribute.upsert({
    where: { code: 'color' },
    update: { name: 'Màu sắc' },
    create: { code: 'color', name: 'Màu sắc' }
  })
  const switchAttr = await prisma.productAttribute.upsert({
    where: { code: 'switch_type' },
    update: { name: 'Loại Switch' },
    create: { code: 'switch_type', name: 'Loại Switch' }
  })

  const attrValueWhite = await prisma.productAttributeValue.upsert({
    where: { attributeId_value: { attributeId: colorAttr.id, value: 'Trắng Bạch Kim' } },
    update: { swatchHex: '#F8FAFC' },
    create: { attributeId: colorAttr.id, value: 'Trắng Bạch Kim', swatchHex: '#F8FAFC', sortOrder: 1 }
  })
  const attrValueBlack = await prisma.productAttributeValue.upsert({
    where: { attributeId_value: { attributeId: colorAttr.id, value: 'Đen Vũ Trụ' } },
    update: { swatchHex: '#0F172A' },
    create: { attributeId: colorAttr.id, value: 'Đen Vũ Trụ', swatchHex: '#0F172A', sortOrder: 2 }
  })
  const attrValueLinear = await prisma.productAttributeValue.upsert({
    where: { attributeId_value: { attributeId: switchAttr.id, value: 'Red Linear (Êm ái)' } },
    update: {},
    create: { attributeId: switchAttr.id, value: 'Red Linear (Êm ái)', sortOrder: 1 }
  })
  const attrValueTactile = await prisma.productAttributeValue.upsert({
    where: { attributeId_value: { attributeId: switchAttr.id, value: 'Brown Tactile (Khấc nhẹ)' } },
    update: {},
    create: { attributeId: switchAttr.id, value: 'Brown Tactile (Khấc nhẹ)', sortOrder: 2 }
  })

  // 6. Seed 8 Flagship Products (6 Featured on 360° Wheel + 2 Catalog) in VND
  const productsSeed = [
    {
      name: 'Tai nghe Chống ồn Sony WH-1000XM5 Wireless ANC',
      slug: 'tai-nghe-sony-wh-1000xm5-wireless-anc',
      skuPrefix: 'SONY-XM5',
      brand: 'Sony',
      categorySlug: 'tai-nghe-am-thanh',
      basePrice: 6990000,
      compareAtPrice: 8490000,
      ratingAvg: 4.9,
      ratingCount: 128,
      soldCount: 540,
      isFeaturedOnWheel: true,
      wheelSortOrder: 1,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=85',
      shortDescription: 'Chống ồn chủ động 8 micro với bộ xử lý kép V1 + QN1, pin 30 giờ, chuẩn Hi-Res Audio LDAC.',
      description:
        'Sony WH-1000XM5 thiết lập chuẩn mực mới cho tai nghe chống ồn không dây cao cấp với 8 micro thu tạp âm và Auto NC Optimizer. Đệm tai da tổng hợp mềm mại, trọng lượng nhẹ 250g, hỗ trợ kết nối đa điểm 2 thiết bị cùng lúc và sạc nhanh USB-PD (3 phút sạc cho 3 giờ nghe nhạc).',
      specifications: {
        driver: '30mm Carbon Fiber Dome',
        battery_life: '30 giờ (Bật ANC) / 40 giờ (Tắt ANC)',
        connectivity: 'Bluetooth 5.2 (LDAC, AAC, SBC), Jack 3.5mm',
        weight: '250g',
        warranty: '12 tháng chính hãng Sony Việt Nam'
      },
      stock: 45
    },
    {
      name: 'Bàn phím Cơ Nhôm CNC Keychron Q1 Pro QMK/VIA Wireless',
      slug: 'ban-phim-co-keychron-q1-pro-wireless',
      skuPrefix: 'KC-Q1PRO',
      brand: 'Keychron',
      categorySlug: 'ban-phim-co',
      basePrice: 4690000,
      compareAtPrice: 5290000,
      ratingAvg: 4.85,
      ratingCount: 94,
      soldCount: 320,
      isFeaturedOnWheel: true,
      wheelSortOrder: 2,
      imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=900&q=85',
      shortDescription: 'Khung nhôm 6063 nguyên khối CNC, cấu trúc Double-Gasket, mạch Hotswap, QMK/VIA.',
      description:
        'Keychron Q1 Pro là bàn phím cơ custom không dây khung nhôm 75% hoàn toàn bằng kim loại được gia công CNC tinh xảo. Cấu trúc Double-Gasket mang lại âm gõ đằm ấm (thocky), núm xoay nhôm đa năng, keycap PBT Double-shot KSA profile và pin 4000mAh.',
      specifications: {
        layout: '75% (82 phím + Núm xoay kim loại)',
        case_material: 'Nhôm 6063 CNC nguyên khối',
        mount_style: 'Double-Gasket Mount, PC Plate',
        connectivity: 'Bluetooth 5.1 (3 thiết bị) & USB-C có dây',
        battery_life: 'Lên đến 100 giờ (Pin 4000mAh)',
        warranty: '12 tháng chính hãng'
      },
      stock: 30
    },
    {
      name: 'Đồng hồ Thông minh Apple Watch Ultra 2 GPS + Cellular 49mm Titanium',
      slug: 'apple-watch-ultra-2-49mm-titanium',
      skuPrefix: 'AW-ULTRA2',
      brand: 'Apple',
      categorySlug: 'dong-ho-thiet-bi-deo',
      basePrice: 19990000,
      compareAtPrice: 21990000,
      ratingAvg: 4.95,
      ratingCount: 215,
      soldCount: 410,
      isFeaturedOnWheel: true,
      wheelSortOrder: 3,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85',
      shortDescription: 'Vỏ Titanium chuẩn hàng không vũ trụ, màn hình Retina 3000 nits, GPS tần số kép L1+L5.',
      description:
        'Thiết kế cho các vận động viên chuyên nghiệp và người yêu khám phá. Trang bị chip S9 SiP mạnh mẽ, thao tác chạm hai lần (Double Tap), chống nước 100m chuẩn lặn EN13319 và thời lượng pin lên đến 72 giờ ở chế độ nguồn điện thấp.',
      specifications: {
        display: 'Always-On Retina LTPO OLED 3000 nits, Kính Sapphire phẳng',
        case_material: 'Titanium tự nhiên 49mm',
        water_resistance: '100m (Chuẩn lặn 40m EN13319, IP6X)',
        sensors: 'ECG, SpO2, Cảm biến nhiệt độ, Độ sâu, La bàn',
        battery_life: '36 giờ tiêu chuẩn / 72 giờ tiết kiệm pin',
        warranty: '12 tháng chính hãng Apple Việt Nam (VN/A)'
      },
      stock: 25
    },
    {
      name: 'Màn hình Đồ họa LG UltraFine 27" 4K OLED Pro 120Hz USB-C 90W',
      slug: 'man-hinh-lg-ultrafine-27-4k-oled-pro',
      skuPrefix: 'LG-27OLED',
      brand: 'LG',
      categorySlug: 'man-hinh-may-tinh',
      basePrice: 15490000,
      compareAtPrice: 17990000,
      ratingAvg: 4.8,
      ratingCount: 67,
      soldCount: 185,
      isFeaturedOnWheel: true,
      wheelSortOrder: 4,
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=900&q=85',
      shortDescription: 'Tấm nền 4K OLED tự phát sáng, 99% DCI-P3, Delta E < 1, sạc ngược MacBook 90W qua USB-C.',
      description:
        'Màn hình chuẩn tham chiếu dành cho nhiếp ảnh gia, dựng phim và lập trình viên. Độ tương phản 1.000.000:1 với màu đen tuyệt đối, tần số quét 120Hz mượt mà, tích hợp KVM Switch và cổng Thunderbolt / USB-C 90W Power Delivery.',
      specifications: {
        panel: '27 inch 4K UHD (3840 x 2160) OLED',
        refresh_rate: '120Hz, 0.1ms (GtG)',
        color_gamut: '99% DCI-P3, 10-bit màu, Factory Calibrated (Delta E < 1)',
        ports: '1x USB-C (90W PD), 2x DisplayPort 1.4, 1x HDMI 2.1, 4x USB 3.2',
        ergonomics: 'Chân đế nâng hạ, xoay dọc Pivot 90 độ, VESA 100x100',
        warranty: '24 tháng chính hãng LG'
      },
      stock: 18
    },
    {
      name: 'Chuột Gaming Không dây Logitech G Pro X Superlight 2 Lightspeed',
      slug: 'chuot-logitech-g-pro-x-superlight-2',
      skuPrefix: 'LOGI-GPX2',
      brand: 'Logitech G',
      categorySlug: 'chuot-khong-day',
      basePrice: 3390000,
      compareAtPrice: 3890000,
      ratingAvg: 4.9,
      ratingCount: 312,
      soldCount: 890,
      isFeaturedOnWheel: true,
      wheelSortOrder: 5,
      imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=900&q=85',
      shortDescription: 'Siêu nhẹ 60g, cảm biến HERO 2 32.000 DPI, switch quang-cơ Lightforce, Polling Rate 4000Hz.',
      description:
        'Vũ khí tối thượng được phát triển cùng các tuyển thủ eSports hàng đầu thế giới. Trang bị switch lai quang-cơ LIGHTFORCE loại bỏ hoàn toàn lỗi double-click, mắt đọc HERO 2 chính xác từng sub-micron và pin 95 giờ liên tục.',
      specifications: {
        sensor: 'HERO 2 Optical (100 - 32.000 DPI, 500+ IPS)',
        weight: '60g siêu nhẹ',
        switches: 'LIGHTFORCE Hybrid Optical-Mechanical',
        polling_rate: '4000Hz Wireless LIGHTSPEED (USB-C)',
        battery_life: '95 giờ di chuyển liên tục',
        warranty: '24 tháng chính hãng Đổi mới'
      },
      stock: 60
    },
    {
      name: 'Docking Station CalDigit TS4 Thunderbolt 4 18-in-1 98W PD',
      slug: 'dock-caldigit-ts4-thunderbolt-4-18-in-1',
      skuPrefix: 'CD-TS4',
      brand: 'CalDigit',
      categorySlug: 'phu-kien-hub',
      basePrice: 9490000,
      compareAtPrice: 10500000,
      ratingAvg: 4.92,
      ratingCount: 83,
      soldCount: 210,
      isFeaturedOnWheel: true,
      wheelSortOrder: 6,
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=900&q=85',
      shortDescription: '18 cổng kết nối mở rộng, băng thông 40Gb/s, xuất 2 màn hình 6K 60Hz, LAN 2.5GbE, sạc 98W.',
      description:
        'Trạm kết nối Thunderbolt 4 mạnh mẽ nhất cho hệ sinh thái Mac Studio, MacBook Pro M-Series và Windows Workstation. Vỏ hợp kim nhôm tản nhiệt nguyên khối, tích hợp đầu đọc thẻ SD/microSD UHS-II tốc độ cao và cổng mạng 2.5 Gigabit Ethernet.',
      specifications: {
        host_interface: 'Thunderbolt 4 (40Gb/s) / USB4 tương thích ngược',
        power_delivery: '98W Host Charging (Đủ cho MacBook Pro 16 inch)',
        display_support: '1x 8K 60Hz hoặc 2x 6K 60Hz / 4K 144Hz',
        network: '2.5 Gigabit Ethernet RJ45',
        total_ports: '18 cổng (3x TB4, 5x USB-A, 3x USB-C,DP 1.4, SD/microSD UHS-II, Audio)',
        warranty: '24 tháng chính hãng'
      },
      stock: 22
    },
    {
      name: 'Tai nghe Bose QuietComfort Ultra Headphones Spatial Audio',
      slug: 'tai-nghe-bose-quietcomfort-ultra-headphones',
      skuPrefix: 'BOSE-QCU',
      brand: 'Bose',
      categorySlug: 'tai-nghe-am-thanh',
      basePrice: 8490000,
      compareAtPrice: 9990000,
      ratingAvg: 4.82,
      ratingCount: 74,
      soldCount: 195,
      isFeaturedOnWheel: false,
      wheelSortOrder: 7,
      imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&q=85',
      shortDescription: 'Công nghệ âm thanh vòm Bose Immersive Audio, CustomTune cá nhân hóa âm học theo tai.',
      description:
        'Bose QuietComfort Ultra mang đến khả năng triệt tiêu tiếng ồn yên tĩnh bậc nhất thế giới cùng chế độ Aware Mode tự nhiên. Thiết kế gập gọn sang trọng với khớp nối kim loại anodized.',
      specifications: {
        spatial_audio: 'Bose Immersive Audio & CustomTune',
        battery_life: '24 giờ',
        connectivity: 'Bluetooth 5.3 (Snapdragon Sound aptX Adaptive), Jack 2.5mm',
        weight: '254g',
        warranty: '12 tháng chính hãng Bose'
      },
      stock: 35
    },
    {
      name: 'Bàn phím Cơ Không dây NuPhy Air75 V2 Low-Profile QMK/VIA',
      slug: 'ban-phim-co-nuphy-air75-v2-low-profile',
      skuPrefix: 'NUPHY-A75V2',
      brand: 'NuPhy',
      categorySlug: 'ban-phim-co',
      basePrice: 3190000,
      compareAtPrice: 3590000,
      ratingAvg: 4.78,
      ratingCount: 112,
      soldCount: 430,
      isFeaturedOnWheel: false,
      wheelSortOrder: 8,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=85',
      shortDescription: 'Bàn phím cơ Low-Profile siêu mỏng đặt vừa trên bàn phím MacBook, Polling Rate 1000Hz 2.4GHz.',
      description:
        'NuPhy Air75 V2 nâng cấp toàn diện với firmware mã nguồn mở QMK/VIA, tần số phản hồi 1000Hz ở chế độ không dây 2.4GHz và chân đế đặt vừa khít lên trên bàn phím MacBook mà không chạm phím.',
      specifications: {
        layout: '75% Low-Profile (84 phím)',
        case_material: 'Khung trên Nhôm CNC + Đáy ABS trong mờ',
        connectivity: '2.4GHz (1000Hz), Bluetooth 5.1, USB-C',
        battery_life: 'Lên đến 220 giờ (Tắt LED, Pin 4000mAh)',
        warranty: '12 tháng chính hãng'
      },
      stock: 40
    }
  ]

  for (const p of productsSeed) {
    const categoryId = categoryMap.get(p.categorySlug)!
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        brand: p.brand,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        currencyCode: 'VND',
        shortDescription: p.shortDescription,
        description: p.description,
        specifications: p.specifications,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        soldCount: p.soldCount,
        isFeaturedOnWheel: p.isFeaturedOnWheel,
        wheelSortOrder: p.wheelSortOrder,
        status: ProductStatus.ACTIVE
      },
      create: {
        categoryId,
        name: p.name,
        slug: p.slug,
        skuPrefix: p.skuPrefix,
        brand: p.brand,
        basePrice: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        currencyCode: 'VND',
        shortDescription: p.shortDescription,
        description: p.description,
        specifications: p.specifications,
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
        soldCount: p.soldCount,
        isFeaturedOnWheel: p.isFeaturedOnWheel,
        wheelSortOrder: p.wheelSortOrder,
        status: ProductStatus.ACTIVE
      }
    })

    // Seed primary image
    const existingImages = await prisma.productImage.findMany({ where: { productId: product.id } })
    if (existingImages.length === 0) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: p.imageUrl,
          altText: p.name,
          isPrimary: true,
          sortOrder: 0
        }
      })
    }

    // Seed Default Variant ("Trắng Bạch Kim") + Secondary Variant ("Đen Vũ Trụ")
    const variantsToSeed = [
      {
        sku: `${p.skuPrefix}-WHT`,
        variantName: `${p.name} - Trắng Bạch Kim`,
        price: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        isDefault: true,
        attrValId: attrValueWhite.id,
        extraAttrId: p.categorySlug === 'ban-phim-co' ? attrValueLinear.id : null,
        stock: p.stock
      },
      {
        sku: `${p.skuPrefix}-BLK`,
        variantName: `${p.name} - Đen Vũ Trụ`,
        price: p.basePrice,
        compareAtPrice: p.compareAtPrice,
        isDefault: false,
        attrValId: attrValueBlack.id,
        extraAttrId: p.categorySlug === 'ban-phim-co' ? attrValueTactile.id : null,
        stock: Math.max(10, Math.floor(p.stock * 0.7))
      }
    ]

    for (const v of variantsToSeed) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {
          variantName: v.variantName,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          imageUrl: p.imageUrl,
          isDefault: v.isDefault,
          isActive: true
        },
        create: {
          productId: product.id,
          sku: v.sku,
          variantName: v.variantName,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          imageUrl: p.imageUrl,
          isDefault: v.isDefault,
          isActive: true
        }
      })

      await prisma.variantAttributeValue.upsert({
        where: {
          variantId_attributeValueId: { variantId: variant.id, attributeValueId: v.attrValId }
        },
        update: {},
        create: { variantId: variant.id, attributeValueId: v.attrValId }
      })

      if (v.extraAttrId) {
        await prisma.variantAttributeValue.upsert({
          where: {
            variantId_attributeValueId: { variantId: variant.id, attributeValueId: v.extraAttrId }
          },
          update: {},
          create: { variantId: variant.id, attributeValueId: v.extraAttrId }
        })
      }

      const existingInv = await prisma.inventory.findUnique({ where: { variantId: variant.id } })
      if (!existingInv) {
        const inv = await prisma.inventory.create({
          data: {
            variantId: variant.id,
            quantityOnHand: v.stock,
            quantityReserved: 0,
            lowStockThreshold: 5
          }
        })
        await prisma.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            txType: InventoryTxType.INITIAL_SEED,
            quantityChange: v.stock,
            balanceAfter: v.stock,
            referenceType: 'SEED_INIT',
            note: 'Khởi tạo tồn kho ban đầu'
          }
        })
      }
    }
  }
  console.log('✅ [Seed] 8 Flagship Products, 16 SKU Variants & Inventory Ledger seeded in VND.')

  // 7. Seed Vouchers (in VND)
  const now = new Date()
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
  const vouchersSeed = [
    {
      code: 'WELCOME10',
      name: 'Giảm 10% Đơn hàng Đầu tiên (Tối đa 500.000 ₫)',
      description: 'Áp dụng cho mọi đơn hàng từ 1.000.000 ₫ trở lên',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscountAmount: 500000,
      minOrderSubtotal: 1000000,
      usageLimitTotal: 1000,
      usageLimitPerUser: 1
    },
    {
      code: 'TECHSAVE500K',
      name: 'Giảm trực tiếp 500.000 ₫ cho đơn từ 5.000.000 ₫',
      description: 'Ưu đãi đặc quyền khi mua sắm thiết bị công nghệ cao cấp',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 500000,
      maxDiscountAmount: 500000,
      minOrderSubtotal: 5000000,
      usageLimitTotal: 500,
      usageLimitPerUser: 2
    },
    {
      code: 'FREESHIP',
      name: 'Miễn phí vận chuyển toàn quốc',
      description: 'Miễn 100% phí vận chuyển cho đơn hàng từ 500.000 ₫',
      discountType: DiscountType.FREE_SHIPPING,
      discountValue: 100000,
      maxDiscountAmount: 100000,
      minOrderSubtotal: 500000,
      usageLimitTotal: 2000,
      usageLimitPerUser: 5
    }
  ]

  for (const vc of vouchersSeed) {
    await prisma.voucher.upsert({
      where: { code: vc.code },
      update: {
        name: vc.name,
        description: vc.description,
        discountType: vc.discountType,
        discountValue: vc.discountValue,
        maxDiscountAmount: vc.maxDiscountAmount,
        minOrderSubtotal: vc.minOrderSubtotal,
        isActive: true,
        endAt: nextYear
      },
      create: {
        ...vc,
        startAt: now,
        endAt: nextYear,
        isActive: true
      }
    })
  }
  console.log('✅ [Seed] 3 Active Vouchers (WELCOME10, TECHSAVE500K, FREESHIP) seeded.')

  // 8. Seed Store Policies for AI Shopping Assistant Grounding
  const policiesSeed = [
    {
      slug: 'chinh-sach-van-chuyen',
      category: 'SHIPPING',
      title: 'Chính sách Giao hàng & Phí Vận chuyển',
      content:
        'TechCart Pro hỗ trợ 3 phương thức giao hàng toàn quốc: (1) Giao tiêu chuẩn (STANDARD): 30.000 ₫ (2-4 ngày làm việc), MIỄN PHÍ cho đơn hàng có giá trị sau giảm giá từ 2.000.000 ₫ trở lên. (2) Giao nhanh (EXPRESS): 60.000 ₫ (1-2 ngày làm việc). (3) Giao hỏa tốc nội thành 2 giờ (SAME_DAY): 100.000 ₫.'
    },
    {
      slug: 'chinh-sach-doi-tra-hoan-tien',
      category: 'RETURNS',
      title: 'Chính sách Đổi trả 30 ngày & Hoàn tiền',
      content:
        'Khách hàng được quyền yêu cầu đổi mới hoặc hoàn tiền 100% trong vòng 30 ngày kể từ ngày nhận hàng (trạng thái DELIVERED) nếu sản phẩm có lỗi phần cứng từ nhà sản xuất. Sản phẩm đổi trả cần đầy đủ hộp, phụ kiện và số Serial khớp với hóa đơn điện tử.'
    },
    {
      slug: 'chinh-sach-bao-hanh',
      category: 'WARRANTY',
      title: 'Chính sách Bảo hành Chính hãng',
      content:
        'Tất cả sản phẩm tại TechCart Pro đều là hàng chính hãng 100%, bảo hành từ 12 đến 24 tháng theo tiêu chuẩn nhà sản xuất (Sony, Apple, Keychron, LG, Logitech, CalDigit). Bảo hành điện tử tự động kích hoạt theo mã đơn hàng (Order Code).'
    },
    {
      slug: 'phuong-thuc-thanh-toan',
      category: 'PAYMENT',
      title: 'Phương thức Thanh toán An toàn (VNPay & COD)',
      content:
        'TechCart Pro hỗ trợ: (1) Thanh toán trực tuyến qua cổng VNPay (QR Pay, Thẻ ATM nội địa, Visa/Mastercard/JCB) với xác thực chữ ký số HMAC-SHA512 tức thời. (2) Thanh toán tiền mặt khi nhận hàng (COD - Đồng kiểm khi nhận). Với đơn thanh toán VNPay, hệ thống giữ chỗ tồn kho (Reserve) trong 15 phút.'
    },
    {
      slug: 'quy-dinh-huy-don-hang',
      category: 'FAQ',
      title: 'Quy định Hủy đơn hàng & Giữ chỗ Tồn kho',
      content:
        'Khách hàng có thể tự hủy đơn hàng trực tiếp trên hệ thống khi đơn đang ở trạng thái PENDING (Chờ xác nhận) hoặc CONFIRMED (Đã xác nhận, trước khi kho đóng gói PROCESSING). Ngay khi hủy, tồn kho giữ chỗ và lượt dùng Voucher sẽ được hoàn lại tự động.'
    }
  ]

  for (const pol of policiesSeed) {
    await prisma.storePolicy.upsert({
      where: { slug: pol.slug },
      update: { category: pol.category, title: pol.title, content: pol.content, isActive: true },
      create: { ...pol, isActive: true }
    })
  }
  console.log('✅ [Seed] 5 Official Store Policies seeded for AI Shopping Assistant.')
  console.log('🎉 [Seed] Phase 2 Database Seeding Completed Successfully!')
}

if (require.main === module) {
  runSeed()
    .catch((err) => {
      console.error('❌ [Seed Error]:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
