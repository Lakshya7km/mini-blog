# Mini Blog

A simple Node.js + Express + EJS blog application that allows users to create, read, edit, and delete posts. Data is stored in a JSON file. Perfect for learning backend concepts and CRUD operations.

---

## Features

- Home page displaying all posts
- Create new posts (title + content)
- Edit existing posts
- Delete posts
- Optional: username tracking for user-specific posts

---

## Tech Stack

- Node.js
- Express.js
- EJS (Embedded JavaScript templates)
- File System (JSON file for storage)
- HTML & CSS for basic styling

---

## Project Structure

MiniBlog/
│
├─ views/
│ ├─ home.ejs
│ ├─ create.ejs
│ └─ edit.ejs
│
├─ posts.json
├─ index.js
└─ package.json


---

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd MiniBlog
Install dependencies:

npm install
Run the server:

node index.js
Open in browser:

http://localhost:4000
Usage
Visit /create to add a new post.

Home page / displays all posts.

Click Edit to update a post.

Click Delete to remove a post.

Notes
Posts are stored in posts.json in the project root.

This is a simple backend project for learning purposes; no authentication yet.

Can be extended with login functionality, user-specific posts, and timestamps.