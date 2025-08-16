## Table: `quiz_question`

```sql
CREATE TABLE quiz_question (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT,
  question VARCHAR(400),
  options1 VARCHAR(100),
  options2 VARCHAR(100),
  options3 VARCHAR(100),
  options4 VARCHAR(100),
  answer VARCHAR(100),
  description VARCHAR(400),
  image TEXT,
  quizname VARCHAR(40),
  file_type VARCHAR(255),
  file_url TEXT
);
```

---

## Table: `users`

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Table: `eventregistration`

```sql
CREATE TABLE eventregistration (
  teamleadername VARCHAR(256),
  teamleaderid CHAR(8),
  leadmailid CHAR(22) PRIMARY KEY,
  teamname VARCHAR(256),
  memberi VARCHAR(256),
  memberiid CHAR(8),
  memberii VARCHAR(256),
  memberiiid CHAR(8),
  marks BIGINT
);
```

---

## Table: `quiz_setup`

```sql
CREATE TABLE quiz_setup (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  "time" TIME,
  date DATE,
  duration INTEGER
);
```

---

## Table: `member`

```sql
CREATE TABLE member (
  id BIGSERIAL PRIMARY KEY,
  image TEXT,
  name VARCHAR(40),
  role VARCHAR(40),
  about VARCHAR(100),
  instagram TEXT,
  linkedin TEXT,
  github TEXT
);
```

---

## Table: `blocked_gmail`

```sql
CREATE TABLE blocked_gmail (
  gmail CHAR(22)
);
```

---
