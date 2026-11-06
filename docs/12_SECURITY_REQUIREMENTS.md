# 12. SECURITY REQUIREMENTS SPECIFICATION

> **Document ID:** `DOC-12`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## 1. Security Defense-in-Depth Matrix

| Security Control Domain | Threat Mitigated | Mandatory Implementation Requirement |
| :--- | :--- | :--- |
| **1. Password Hashing** | Credential stuffing & rainbow-table offline cracking | Hash all passwords with `Argon2id` or `bcrypt` (cost $\ge 12$). Transparently migrate any legacy `SHA-256` hash to `bcrypt`/`Argon2id` on next successful login. Never log or return `password_hash`. |
| **2. Authentication & Token Rotation** | Stolen refresh token replay & session hijacking | Short-lived JWT Access Tokens (`15m`). Refresh tokens (`7d`) are stored as `SHA-256` hashes in `refresh_tokens`, rotated on every use, and grouped by `family_id`. Reusing a revoked refresh token immediately revokes all tokens in that `family_id`. |
| **3. Authorization (RBAC & IDOR)** | Vertical & horizontal privilege escalation | Enforce `@UseGuards(JwtAuthGuard, PermissionsGuard)` on all protected routes. Every customer query on orders, addresses, tickets, and AI chat sessions must filter by `WHERE user_id = req.user.id`. |
| **4. Input Validation & Sanitization** | Mass assignment, prototype pollution, malformed payloads | Global NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` + Zod schemas on frontend and AI tool inputs. |
| **5. SQL Injection Prevention** | Arbitrary SQL execution & data exfiltration | Use parameterized Prisma ORM queries exclusively. Any raw SQL (`$queryRaw` for `SELECT ... FOR UPDATE` or `tsvector`) must use tagged template literals (`Prisma.sql`), never string concatenation. |
| **6. XSS & Content Security Policy** | Reflected/Stored XSS in product descriptions, reviews, or AI chat | Use `helmet` HTTP headers with strict `Content-Security-Policy`; sanitize user-submitted review/ticket text and render AI Markdown through an allowlisted sanitizer (`DOMPurify` / `rehype-sanitize`). |
| **7. CSRF & CORS** | Cross-origin unauthorized state mutations | Configure strict `CORS` origin allowlist (`FRONTEND_URL`); enforce `SameSite=Lax` (or `Strict`) on cookies and require custom `Authorization: Bearer` header on API mutations. |
| **8. Rate Limiting & Brute-Force Protection** | Credential brute-forcing, DDoS, and AI token wallet exhaustion | `@nestjs/throttler`: `/auth/login` & `/auth/forgot-password` limited to `5 req / min / IP` + account lockout (`locked_until = NOW() + 15m`) after 5 failed attempts; `/ai/chat` limited to `15 req / min / user`. |
| **9. File Upload Validation** | Web-shell upload, malicious SVG/polyglot files, disk exhaustion | Accept only `image/jpeg`, `image/png`, `image/webp` ($\le 5\text{ MB}$). Verify file magic bytes, decode and re-encode via `Sharp` in memory (stripping EXIF/scripts), and stream directly to Cloudinary (`shopping_cart_be`). |
| **10. Payment Webhook Verification** | Spoofed payment confirmation requests | Verify cryptographic `HMAC-SHA256` / `HMAC-SHA512` signature headers against raw request body (`req.rawBody`), verify timestamp freshness ($\le 5\text{m}$), verify `amount == order.grand_total`, and enforce `provider_transaction_id` uniqueness. |
| **11. AI Security & Prompt Injection** | System prompt leak, unauthorized cross-user data access, price tampering | Never pass `user_id` or role permissions via LLM-generated tool arguments—inject `verifiedUserContext` directly in the server tool executor. Enforce read-only DB permissions on AI catalog tools. |
| **12. Secrets Management** | Leaked credentials in Git or client bundles | Load all secrets via `.env` validated at startup with Zod (`POSTGRES_URL`, `JWT_ACCESS_SECRET`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`). `.env` is gitignored; only `.env.example` is committed. |
| **13. Immutable Audit Logging** | Repudiation of admin price/stock/role changes | Log every admin mutation (`products.write`, `inventory.write`, `orders.write`, `users.manage`, `payments.refund`) in `audit_logs` with `before_state`, `after_state`, `actor_user_id`, and `ip_address`. |

