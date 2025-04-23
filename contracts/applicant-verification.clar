;; Applicant Verification Contract
;; Validates identity of permit requestors

(define-data-var admin principal tx-sender)

;; Data structure for applicants
(define-map applicants
  { id: (string-utf8 36) }  ;; Unique ID for the applicant
  {
    name: (string-utf8 100),
    address: (string-utf8 100),
    verified: bool,
    verification-date: (optional uint)
  }
)

;; Register a new applicant
(define-public (register-applicant (id (string-utf8 36)) (name (string-utf8 100)) (address (string-utf8 100)))
  (let
    ((caller tx-sender))
    (if (map-insert applicants { id: id } { name: name, address: address, verified: false, verification-date: none })
        (ok true)
        (err u1)  ;; Error if applicant already exists
    )
  )
)

;; Verify an applicant (admin only)
(define-public (verify-applicant (id (string-utf8 36)))
  (let
    ((caller tx-sender))
    (if (is-eq caller (var-get admin))
        (match (map-get? applicants { id: id })
          applicant (begin
            (map-set applicants
              { id: id }
              (merge applicant { verified: true, verification-date: (some block-height) })
            )
            (ok true)
          )
          (err u2)  ;; Error if applicant not found
        )
        (err u3)  ;; Error if not admin
    )
  )
)

;; Check if an applicant is verified
(define-read-only (is-verified (id (string-utf8 36)))
  (match (map-get? applicants { id: id })
    applicant (ok (get verified applicant))
    (err u2)  ;; Error if applicant not found
  )
)

;; Get applicant details
(define-read-only (get-applicant (id (string-utf8 36)))
  (map-get? applicants { id: id })
)

;; Set a new admin
(define-public (set-admin (new-admin principal))
  (let
    ((caller tx-sender))
    (if (is-eq caller (var-get admin))
        (begin
          (var-set admin new-admin)
          (ok true)
        )
        (err u3)  ;; Error if not admin
    )
  )
)
