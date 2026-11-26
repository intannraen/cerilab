/**
 * Adversarial Security Rules Specification Runner ("Dirty Dozen" Verification)
 * Run against Firebase Emulator Suite when testing rules offline.
 */
export interface AdversarialCase {
  id: number;
  name: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const dirtyDozenCases: AdversarialCase[] = [
  {
    id: 1,
    name: 'Self-Role Escalation',
    collection: 'users/attacker_uid',
    operation: 'create',
    payload: { uid: 'attacker_uid', role: 'librarian', displayName: 'Mallory', email: 'm@example.com', memberCode: 'CL-0001' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Profile Role Tampering',
    collection: 'users/member_uid',
    operation: 'update',
    payload: { role: 'librarian' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Ghost Field Injection on Loan',
    collection: 'loans/loan_ghost',
    operation: 'create',
    payload: { userId: 'member_uid', bookId: 'book_1', status: 'borrowed', isApproved: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Identity Spoofing on Loan',
    collection: 'loans/loan_spoof',
    operation: 'create',
    payload: { userId: 'victim_uid', bookId: 'book_1', status: 'borrowed' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Loan Creation',
    collection: 'loans/loan_orphan',
    operation: 'create',
    payload: { userId: 'member_uid', bookId: 'non_existent_book', status: 'borrowed' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unatomic Borrow (Free Copy Exploit)',
    collection: 'loans/loan_unatomic',
    operation: 'create',
    payload: { userId: 'member_uid', bookId: 'book_1', status: 'borrowed' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unauthorized Book Creation by Member',
    collection: 'books/book_rogue',
    operation: 'create',
    payload: { title: 'Rogue Book', totalCopies: 5, availableCopies: 5 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unauthorized Book Modification by Member',
    collection: 'books/book_1',
    operation: 'update',
    payload: { title: 'Hacked Title', totalCopies: 999 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Reversion on Returned Loan',
    collection: 'loans/loan_returned',
    operation: 'update',
    payload: { status: 'borrowed' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'PII Cross-Read on Other Member',
    collection: 'users/victim_uid',
    operation: 'get',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Timestamp Forgery on Loan',
    collection: 'loans/loan_backdated',
    operation: 'create',
    payload: { userId: 'member_uid', bookId: 'book_1', borrowedAt: '2020-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'ID Poisoning on Book Path',
    collection: 'books/invalid$id!with*spaces',
    operation: 'create',
    payload: { title: 'Poison' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
