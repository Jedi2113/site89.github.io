/**
 * DEPRECATED: This file is no longer used. See secure-access.js instead.
 * 
 * The old access.js had several security vulnerabilities:
 * - Race condition: content displayed before clearance checked
 * - Unverified localStorage: clearance could be spoofed by modifying localStorage
 * - Client-side only: no server verification of access rights
 * 
 * Replace with secure-access.js which:
 * - Blocks page rendering until clearance verified with Firebase
 * - Fetches authoritative clearance from database (not localStorage)
 * - Fails securely (blocks access on error)
 * 
 * MIGRATION: Remove this script and add to your page head:
 *   <script src="/assets/js/secure-access.js"></script>
 */

console.warn('DEPRECATED: assets/js/access.js is no longer used. Use secure-access.js instead.');