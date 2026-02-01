const express = require("express");
const app = express();
const fs = require("fs");
const ejs = require("ejs");
app.set("view engine", "ejs");
const path = require("path");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, "posts.json"), "utf-8");
  //   Convert to JS
  const posts = JSON.parse(data);
  res.render("home", { posts: posts });
});
//get
app.get("/login", (req, res) => {
  res.render("login");
});
//post
app.post("/login", (req, res) => {
  console.log(req.body);
  res.redirect("/");
});
//get
app.get("/create", (req, res) => {
  res.render("create");
});
//post
app.post("/create", (req, res) => {
  console.log(req.body);

  const data = fs.readFileSync(path.join(__dirname, "posts.json"), "utf-8");
  //   Convert to JS
  const posts = JSON.parse(data);
  //Push new post
  posts.push({
    title: req.body.title,
    content: req.body.content,
  });
  //Convert back to JSON
  const jsonData = JSON.stringify(posts, null, 2);
  fs.writeFileSync(path.join(__dirname, "posts.json"), jsonData);

  res.redirect("/");
});

app.get("/delete/:index", (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, "posts.json"), "utf-8");
  const posts = JSON.parse(data);
  // Remove the post at the given index
  const index = req.params.index;
  posts.splice(index, 1);
  fs.writeFileSync(
    path.join(__dirname, "posts.json"),
    JSON.stringify(posts, null, 2)
  );
  res.redirect("/");
});

app.get("/edit/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const data = fs.readFileSync(path.join(__dirname, "posts.json"), "utf-8");
  const posts = JSON.parse(data);
  const post = posts[index];

  res.render("edit", { post, index });
});

app.post("/edit/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const data = fs.readFileSync(path.join(__dirname, "posts.json"), "utf-8");
  const posts = JSON.parse(data);

  posts[index].title = req.body.title;
  posts[index].content = req.body.content;
  fs.writeFileSync(
    path.join(__dirname, "posts.json"),
    JSON.stringify(posts, null, 2)
  );
  res.redirect("/");
});
app.listen(4000, () => {
  console.log("Server running ");
});

// fs.readFileSync() → string → JSON.parse() → JS object → modify → JSON.stringify() → fs.writeFileSync()
