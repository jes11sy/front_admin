# Security Audit Report - Frontend Admin Panel

## Critical Security Issues

### 1. **Password Storage in IndexedDB (Weak Encryption)**
**File:** `src/lib/remember-me.ts`  
**Lines:** 85-116, 188-234  
**Issue:** Passwords encrypted using device fingerprint (userAgent, screen resolution) - weak key derivation. If device fingerprint changes (browser update, resolution change), decryption fails, but more importantly, this is not cryptographically secure for password storage.  
**Risk:** High - Passwords stored client-side even if encrypted  
**Recommendation:** Remove password storage entirely, use refresh tokens only

### 2. **Missing Content Security Policy**
**File:** `next.config.js`  
**Lines:** 36-68  
**Issue:** No Content-Security-Policy header configured. XSS protection relies only on sanitization.  
**Risk:** High - XSS attacks possible  
**Recommendation:** Add CSP headers with strict directives

### 3. **Rate Limiting Stored in Component State**
**File:** `src/app/login/page.tsx`  
**Lines:** 31-34, 172-187, 239-261  
**Issue:** Rate limiting counters stored in React state - can be reset by clearing state or refreshing page.  
**Risk:** Medium - Brute force attacks possible  
**Recommendation:** Implement server-side rate limiting or use localStorage with server validation

### 4. **TypeScript Build Errors Ignored**
**File:** `next.config.js`  
**Lines:** 14-16  
**Issue:** `ignoreBuildErrors: true` allows type errors in production builds.  
**Risk:** Medium - Runtime errors possible  
**Recommendation:** Fix TypeScript errors and remove this flag

### 5. **Missing CSRF Protection**
**File:** `src/lib/api.ts`  
**Lines:** 71-176  
**Issue:** No CSRF tokens in POST/PUT/DELETE requests. Relies only on httpOnly cookies.  
**Risk:** Medium - CSRF attacks possible if cookies accessible  
**Recommendation:** Add CSRF token validation for state-changing operations

### 6. **Debug Information in localStorage**
**File:** `src/app/login/page.tsx`, `src/app/client-layout.tsx`  
**Lines:** 87, 118, 131, 142, 152, 47, 72, 109, 143  
**Issue:** Debug messages stored in localStorage - potential XSS if keys are exposed.  
**Risk:** Low - Information disclosure  
**Recommendation:** Remove debug localStorage writes or use sessionStorage with expiration

## Bugs

### 7. **Memory Leak: setInterval Not Cleared on Error**
**File:** `src/components/BrowserAuthModal.tsx`  
**Lines:** 37-72, 74-91  
**Issue:** If `startBrowser()` fails or `checkAuthStatus()` throws, `checkIntervalRef.current` may not be cleared.  
**Risk:** Medium - Memory leak, unnecessary API calls  
**Recommendation:** Add try-finally blocks to ensure cleanup

### 8. **Race Condition: Multiple Auth Checks**
**File:** `src/app/client-layout.tsx`  
**Lines:** 27-154  
**Issue:** `authCheckStarted.current` check may not prevent race conditions if component re-renders quickly. Multiple auth checks can run simultaneously.  
**Risk:** Medium - Unnecessary API calls, potential state inconsistencies  
**Recommendation:** Use AbortController to cancel previous requests

### 9. **JSON Parsing Without Error Handling**
**File:** `src/components/BrowserAuthModal.tsx`  
**Lines:** 50, 79, 100  
**Issue:** `response.json()` called without try-catch. If server returns non-JSON, app crashes.  
**Risk:** Medium - Application crashes  
**Recommendation:** Wrap in try-catch with fallback handling

### 10. **Missing Error Handling in API Retry Logic**
**File:** `src/lib/api.ts`  
**Lines:** 96-133  
**Issue:** Retry logic doesn't handle network errors or timeouts properly. If refresh token fails, retry still attempts original request.  
**Risk:** Low - Poor error recovery  
**Recommendation:** Add network error detection and exponential backoff

### 11. **Unsafe Redirect URL Validation**
**File:** `src/app/login/page.tsx`  
**Lines:** 40-74  
**Issue:** Redirect validation allows any path starting with `/` - could redirect to `/admin/delete-all` or other dangerous paths.  
**Risk:** Low - Open redirect to internal paths  
**Recommendation:** Whitelist allowed redirect paths

### 12. **Missing Cleanup in useEffect Dependencies**
**File:** `src/app/avito/page.tsx`  
**Lines:** 140-149  
**Issue:** `checkAllConnectionsAndProxies` in dependency array may cause infinite loops if function reference changes.  
**Risk:** Low - Performance degradation  
**Recommendation:** Use useCallback or remove from dependencies

## Performance Issues

### 13. **Polling Instead of WebSocket/SSE**
**File:** `src/components/BrowserAuthModal.tsx`  
**Lines:** 58, 74-91  
**Issue:** `setInterval` polling every 2 seconds for auth status instead of WebSocket or Server-Sent Events.  
**Risk:** Low - Unnecessary server load  
**Recommendation:** Implement WebSocket connection for real-time updates

### 14. **No Request Deduplication**
**File:** `src/lib/api.ts`  
**Lines:** 71-176  
**Issue:** Multiple identical requests can be sent simultaneously (e.g., multiple components calling `getProfile()`).  
**Risk:** Low - Unnecessary network traffic  
**Recommendation:** Implement request caching/deduplication

### 15. **Large Bundle Size**
**File:** `next.config.js`  
**Lines:** 1-77  
**Issue:** No code splitting configuration visible. All routes may be bundled together.  
**Risk:** Low - Slow initial load  
**Recommendation:** Implement dynamic imports and route-based code splitting

### 16. **No Request Timeout Configuration**
**File:** `src/lib/api.ts`  
**Lines:** 71-176  
**Issue:** Fetch requests have no explicit timeout. Can hang indefinitely on network issues.  
**Risk:** Low - Poor user experience  
**Recommendation:** Add AbortController with timeout

### 17. **Inefficient State Updates**
**File:** `src/app/login/page.tsx`  
**Lines:** 308, 334  
**Issue:** `sanitizeString()` called on every keystroke - unnecessary processing.  
**Risk:** Low - Minor performance impact  
**Recommendation:** Debounce sanitization or move to onSubmit

### 18. **Missing Request Cancellation**
**File:** `src/app/client-layout.tsx`  
**Lines:** 56-82  
**Issue:** Auth check requests not cancelled when component unmounts or navigation occurs.  
**Risk:** Low - Unnecessary network requests  
**Recommendation:** Use AbortController to cancel requests on unmount

## Additional Observations

### 19. **Weak Encryption Key Derivation**
**File:** `src/lib/remember-me.ts`  
**Lines:** 85-116  
**Issue:** PBKDF2 with 100,000 iterations is good, but device fingerprint is predictable and can be replicated.  
**Risk:** Medium - Encrypted passwords can be decrypted if fingerprint is known  
**Recommendation:** Use hardware-backed secure storage or remove password storage

### 20. **Missing Input Validation on API Methods**
**File:** `src/lib/api.ts`  
**Lines:** 293-994  
**Issue:** Many API methods accept `any` type without validation (e.g., `createEmployee(data: any)`).  
**Risk:** Low - Type safety issues  
**Recommendation:** Add proper TypeScript interfaces and runtime validation

### 21. **No Request Rate Limiting Client-Side**
**File:** `src/lib/api.ts`  
**Lines:** 71-176  
**Issue:** No throttling or debouncing of API requests. Rapid user actions can flood server.  
**Risk:** Low - Server overload potential  
**Recommendation:** Implement request queue or throttling

---

**Report Generated:** 2026-01-27  
**Total Issues Found:** 21 (6 Critical, 6 Bugs, 9 Performance)
