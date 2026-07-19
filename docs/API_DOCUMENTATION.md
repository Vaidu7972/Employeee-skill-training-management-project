# API Endpoints Documentation – SkillSphere

Detailed REST API specifications for SkillSphere backend services. Base URL: `http://localhost:5000/api`.

---

## 1. Authentication Services

### User Login
- **Endpoint**: `POST /auth/login`
- **Access**: Public
- **Payload**:
```json
{
  "email": "employee@skillsphere.local",
  "password": "Employee@2026",
  "portal": "EMPLOYEE_PORTAL"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "uuid", "email": "employee@...", "role": "EMPLOYEE", "employeeId": "uuid" },
    "accessToken": "jwt_access_string",
    "refreshToken": "jwt_refresh_string"
  }
}
```

### Refresh Token
- **Endpoint**: `POST /auth/refresh-token`
- **Payload**: `{ "refreshToken": "string" }`

---

## 2. Employee Profile Services

### Fetch Directory
- **Endpoint**: `GET /employees`
- **Access**: Authenticated users
- **Query Params**: `search`, `departmentId`, `designationId`, `managerId`, `status`, `page`, `limit`

### CSV Bulk Upload
- **Endpoint**: `POST /employees/import/csv`
- **Access**: `SUPER_ADMIN`
- **Content-Type**: `multipart/form-data` (file payload)

---

## 3. Skill & Gap Matrix

### Submit Self-Assessment
- **Endpoint**: `PUT /skills/assessment/:id`
- **Access**: `EMPLOYEE` (Resource Owner)
- **Payload**:
```json
{
  "selfRating": 4,
  "experienceMonths": 18,
  "employeeComments": "Worked on NestJS during project lifecycle.",
  "isDraft": false
}
```

### Review Assessment
- **Endpoint**: `PUT /skills/review/:id`
- **Access**: `SUPER_ADMIN`, `MANAGER`
- **Payload**:
```json
{
  "decision": "APPROVED",
  "finalRating": 4,
  "managerFeedback": "Demonstrated expertise during sprints."
}
```

---

## 4. Support Tickets Queue

### Create Support Ticket
- **Endpoint**: `POST /ticket`
- **Access**: `EMPLOYEE`
- **Payload**:
```json
{
  "subject": "Email login issue",
  "description": "Getting portal deactivation warning on login.",
  "category": "LOGIN_ISSUE",
  "priority": "HIGH"
}
```

### Add Ticket Response Chat
- **Endpoint**: `POST /ticket/:id/messages`
- **Access**: `EMPLOYEE`, `SUPER_ADMIN`, `ADMIN_SUPPORT`
- **Content-Type**: `multipart/form-data`
- **Payload fields**: `message`, `isInternal` (for admin internal notes)
