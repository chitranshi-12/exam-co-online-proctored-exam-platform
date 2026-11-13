# exam.co API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication

### `POST /api/auth/google`
Exchange Firebase Google ID token for a 7-day exam.co teacher JWT.

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "teacher": {
    "id": "65b8c9d1a8e4b2a3c4d5e6f7",
    "name": "Dr. Eleanor Vance",
    "email": "e.vance@stanford.edu",
    "photo": "https://lh3.googleusercontent.com/..."
  }
}
```

---

### `GET /api/auth/me`
Retrieve current authenticated teacher profile.

**Headers:**
`Authorization: Bearer <TEACHER_JWT>`

**Response (200 OK):**
```json
{
  "success": true,
  "teacher": {
    "id": "65b8c9d1a8e4b2a3c4d5e6f7",
    "name": "Dr. Eleanor Vance",
    "email": "e.vance@stanford.edu",
    "photo": "https://..."
  }
}
```

---

## 2. Examinations (Teacher)

### `POST /api/exams`
Create a new proctored examination.

**Headers:** `Authorization: Bearer <TEACHER_JWT>`

**Request:**
```json
{
  "title": "CS 101 Midterm Examination",
  "institute": "Stanford Computer Science",
  "description": "Proctored assessment covering tree balancing and graphs.",
  "examCode": "CS2026",
  "durationMinutes": 45,
  "requireFullscreen": true,
  "shuffleQuestions": false,
  "status": "active",
  "questions": [
    {
      "text": "Which data structure follows LIFO?",
      "options": ["Queue", "Stack", "Heap", "Tree"],
      "correctIndex": 1,
      "marks": 1
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "exam": {
    "_id": "65b8cae2b9f5c3b4d5e6f7a8",
    "title": "CS 101 Midterm Examination",
    "status": "active",
    "examCode": "CS2026",
    "durationMinutes": 45
  }
}
```

---

### `PATCH /api/exams/:id/status`
Toggle exam status (`draft`, `active`, `closed`).

**Request:**
```json
{
  "status": "closed"
}
```

---

### `GET /api/exams/:id/link`
Retrieve candidate shareable link, access code, and QR data.

**Response (200 OK):**
```json
{
  "success": true,
  "link": "https://exam.co/exam/65b8cae2b9f5c3b4d5e6f7a8",
  "examCode": "CS2026",
  "qrData": "https://exam.co/exam/65b8cae2b9f5c3b4d5e6f7a8"
}
```

---

## 3. Public Student Flow

### `GET /api/public/exams/:examId`
Get public exam metadata (no questions or answers are ever leaked).

**Response (200 OK):**
```json
{
  "success": true,
  "exam": {
    "id": "65b8cae2b9f5c3b4d5e6f7a8",
    "title": "CS 101 Midterm Examination",
    "institute": "Stanford Computer Science",
    "durationMinutes": 45,
    "requireFullscreen": true
  }
}
```

---

### `POST /api/public/exams/:examId/enroll`
Enroll a candidate into an examination.

**Request:**
```json
{
  "name": "Alex Rivera",
  "rollNo": "CS2026-001",
  "institute": "Stanford CS",
  "email": "arivera@stanford.edu",
  "examCode": "CS2026"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "attempt": {
    "id": "65b8cc12d0a6e4c5f6a7b8c9",
    "name": "Alex Rivera",
    "rollNo": "CS2026-001",
    "status": "enrolled"
  },
  "questions": [
    {
      "id": "q1",
      "text": "Which data structure follows LIFO?",
      "options": ["Queue", "Stack", "Heap", "Tree"],
      "marks": 1
    }
  ]
}
```

---

## 4. Student Attempt Actions

### `POST /api/attempts/:id/start`
Starts countdown timer and initializes `deadlineAt`.

**Headers:** `Authorization: Bearer <ATTEMPT_JWT>`

---

### `PATCH /api/attempts/:id/answer`
Save candidate answer choice with automatic timestamping.

**Request:**
```json
{
  "questionId": "q1",
  "selectedIndex": 1,
  "markedForReview": false
}
```

---

### `POST /api/attempts/:id/submit`
Idempotent server-side scoring and assessment finalization.

---

### `POST /api/attempts/:id/violations`
Log a proctoring incident silently.

**Request:**
```json
{
  "examId": "65b8cae2b9f5c3b4d5e6f7a8",
  "type": "tab_switch",
  "details": "Candidate switched to an external browser tab",
  "occurredAt": "2026-11-11T21:40:00.000Z"
}
```

---

### `POST /api/attempts/:id/evidence`
Upload compressed screenshot or webcam image to GridFS bucket "evidence".

**Content-Type:** `multipart/form-data`
**Field:** `image` (max 200 KB, JPEG/WebP)

---

## 5. Live Monitoring & Reports

- `GET /api/monitor/exams/:examId/attempts` - Monitored student roster
- `GET /api/monitor/attempts/:id` - Full candidate audit timeline
- `GET /api/reports/exams/:examId/results.csv` - Download standings CSV
- `GET /api/reports/attempts/:id/report.pdf` - Download printable PDF audit report
- `GET /api/evidence/:fileId` - Stream stored evidence screenshot
- `GET /api/health` - Service health status
