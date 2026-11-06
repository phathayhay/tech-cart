import assert from 'assert'
import { createHash } from 'crypto'
import { createNestApp } from '../../src/main'
import { PrismaService } from '../../src/prisma/prisma.service'

export async function runPhase3AuthAndUsersIntegrationTest(): Promise<void> {
  console.log('🧪 [Test] Starting Phase 3 Auth, Token Rotation, RBAC & Users Integration Test...')

  const app = await createNestApp()
  await app.init()
  const server = await app.listen(0)
  const address: any = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`
  const prisma = app.get(PrismaService)

  try {
    // 1. Test Legacy SHA-256 Password Auto-Upgrade to Bcrypt on Login (TASK-013)
    const legacyEmail = `legacy_${Date.now()}@techcart.com`
    const plainPass = 'Password123!'
    const legacySecret = process.env.PASSWORD_SECRET || ''
    const legacySha256 = createHash('sha256')
      .update(plainPass + legacySecret)
      .digest('hex')

    const createdLegacyUser = await prisma.user.create({
      data: {
        email: legacyEmail,
        passwordHash: legacySha256,
        fullName: 'Legacy User Upgrade Test'
      }
    })

    const legacyLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: legacyEmail, password: plainPass })
    })
    const legacyLoginJson: any = await legacyLoginRes.json()
    assert.strictEqual(legacyLoginRes.status, 200, 'Legacy SHA-256 login should succeed')
    assert.strictEqual(
      legacyLoginJson.data.password_upgraded_to_bcrypt,
      true,
      'Legacy SHA-256 password must be flagged as upgraded to bcrypt'
    )

    const upgradedDbUser = await prisma.user.findUnique({ where: { id: createdLegacyUser.id } })
    assert.ok(
      upgradedDbUser!.passwordHash.startsWith('$2b$'),
      'Stored password_hash in DB must now be a bcrypt $2b$ hash'
    )
    console.log('✅ [1/5] Legacy SHA-256 -> Bcrypt transparent upgrade verified.')

    // 2. Test Seeded Customer Login & RBAC Claims (TASK-014)
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@techcart.com', password: 'Password123!' })
    })
    const loginJson: any = await loginRes.json()
    assert.strictEqual(loginRes.status, 200)
    const token1Access: string = loginJson.data.access_token
    const token1Refresh: string = loginJson.data.refresh_token
    assert.ok(token1Access && token1Refresh, 'Access & Refresh tokens must be returned')
    assert.ok(loginJson.data.user.roles.includes('CUSTOMER'), 'User must have CUSTOMER role')
    console.log('✅ [2/5] Customer login & RBAC claims verified.')

    // 3. Test Profile & Shipping Address Single-Default Transaction (TASK-017)
    const meRes = await fetch(`${baseUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token1Access}` }
    })
    const meJson: any = await meRes.json()
    assert.strictEqual(meRes.status, 200)
    assert.strictEqual(meJson.data.email, 'customer@techcart.com')

    // Clean any old test addresses for customer
    await prisma.userAddress.deleteMany({ where: { userId: meJson.data.id } })

    // Create Address 1 (automatically default)
    const addr1Res = await fetch(`${baseUrl}/users/me/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1Access}`
      },
      body: JSON.stringify({
        label: 'Nhà riêng',
        recipient_name: 'Phạm Minh Phát',
        phone: '0909123456',
        street_line1: '123 Nguyễn Huệ',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        is_default: true
      })
    })
    const addr1Json: any = await addr1Res.json()
    assert.strictEqual(addr1Res.status, 201)
    assert.strictEqual(addr1Json.data.isDefault, true)

    // Create Address 2 with is_default: true -> must atomically unset Address 1!
    const addr2Res = await fetch(`${baseUrl}/users/me/addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1Access}`
      },
      body: JSON.stringify({
        label: 'Văn phòng',
        recipient_name: 'Phạm Minh Phát',
        phone: '0909123456',
        street_line1: '456 Lê Lợi',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        is_default: true
      })
    })
    const addr2Json: any = await addr2Res.json()
    assert.strictEqual(addr2Res.status, 201)
    assert.strictEqual(addr2Json.data.isDefault, true)

    const allAddresses = await prisma.userAddress.findMany({
      where: { userId: meJson.data.id }
    })
    const defaultAddresses = allAddresses.filter((a) => a.isDefault)
    assert.strictEqual(
      defaultAddresses.length,
      1,
      'Exactly ONE address must have isDefault = true after creating a new default address'
    )
    assert.strictEqual(defaultAddresses[0].id, addr2Json.data.id)
    console.log('✅ [3/5] User Profile & Single-Default Shipping Address transaction verified.')

    // 4. Test Refresh Token Rotation & Token Reuse Family Revocation (TASK-015)
    const refresh1Res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token1Refresh })
    })
    const refresh1Json: any = await refresh1Res.json()
    assert.strictEqual(refresh1Res.status, 200, 'First refresh token rotation must succeed')
    const token2Refresh: string = refresh1Json.data.refresh_token
    assert.notStrictEqual(token1Refresh, token2Refresh, 'Rotated refresh token must be new')

    // Now replay the OLD rotated token1Refresh -> MUST trigger 401 TOKEN_REUSE_DETECTED and revoke token2Refresh!
    const replayRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token1Refresh })
    })
    const replayJson: any = await replayRes.json()
    assert.strictEqual(replayRes.status, 401, 'Replaying a rotated refresh token must return 401')
    assert.strictEqual(replayJson.error.code, 'TOKEN_REUSE_DETECTED')

    // Verify that token2Refresh in the same family is now ALSO revoked!
    const afterCompromiseRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: token2Refresh })
    })
    assert.strictEqual(
      afterCompromiseRes.status,
      401,
      'Descendant token in compromised token family must also be rejected'
    )
    console.log('✅ [4/5] Refresh Token Rotation & Family Reuse Revocation verified.')

    // 5. Cleanup temporary legacy user
    await prisma.refreshToken.deleteMany({ where: { userId: createdLegacyUser.id } })
    await prisma.user.delete({ where: { id: createdLegacyUser.id } })
    console.log('✅ [5/5] Test cleanup complete.')
    console.log('🎉 PASS: All Phase 3 Auth, RBAC, Token Rotation & Users tests passed!')
  } finally {
    await app.close()
  }
}

if (require.main === module) {
  runPhase3AuthAndUsersIntegrationTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('FAIL:', err)
      process.exit(1)
    })
}
