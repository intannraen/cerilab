# Security Specification — CeriLib Digital Library

## 1. Data Invariants
1. **Identity Integrity**: A member profile (`/users/{userId}`) can only be read or created by its owner (`request.auth.uid == userId`) or a verified librarian. Self-created profiles are strictly locked to `role == 'member'`.
2. **RBAC Enforcement**: Only verified librarians (bootstrapped `intannraen@gmail.com` with `email_verified == true` or documents in `/librarians/{uid}`) can create, edit, or delete catalog books (`/books/{bookId}`), manage librarian roles, or view all members' loans.
3. **Catalog Copy Conservation & Atomicity**: A loan (`/loans/{loanId}`) cannot exist without a valid existing `/books/{bookId}` with `availableCopies >= 1`. Borrowing MUST atomically decrement `availableCopies` by 1 via `getAfter()`, and returning MUST atomically increment `availableCopies` by 1 via `getAfter()`.
4. **Terminal State Locking**: Once a loan reaches `status == 'returned'`, a member cannot revert it to `'borrowed'` or modify its fields.
5. **PII Isolation**: `/users/{userId}` and `/loans/{loanId}` contain member emails and names; `get` and `list` queries are strictly constrained to `resource.data.userId == request.auth.uid` (or `userId == request.auth.uid`) or `isLibrarian()`.
6. **Temporal Integrity**: All `createdAt`, `borrowedAt`, and `updatedAt` fields must equal `request.time`.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Self-Role Escalation**: Member creates `/users/{uid}` with `role: "librarian"`.
2. **Profile Role Tampering**: Member updates own `/users/{uid}` changing `role` to `"librarian"`.
3. **Ghost Field Injection**: Member creates `/loans/{loanId}` with extra field `isApproved: true`.
4. **Identity Spoofing on Loan**: Member A creates `/loans/{loanId}` with `userId: "memberB"`.
5. **Orphaned Loan Creation**: Member creates `/loans/{loanId}` referencing non-existent `bookId: "fake_book_999"`.
6. **Unatomic Borrow (Free Copy Exploit)**: Member creates `/loans/{loanId}` without atomically decrementing `/books/{bookId}.availableCopies`.
7. **Unauthorized Book Creation**: Non-librarian member attempts to create a document in `/books/{bookId}`.
8. **Unauthorized Book Modification**: Non-librarian member modifies `title` or `totalCopies` on `/books/{bookId}`.
9. **Terminal State Reversion**: Member updates a `'returned'` loan back to `status: 'borrowed'`.
10. **PII Cross-Read**: Member A attempts `get` or `list` on `/users/memberB` or `/loans` where `userId != memberA`.
11. **Timestamp Forgery**: Member creates `/loans/{loanId}` with backdated `borrowedAt` instead of `request.time`.
12. **ID Poisoning**: Attacker writes `/books/invalid$id!with*spaces` or a >128 char document ID.
