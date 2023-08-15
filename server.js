const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
var session = require("express-session");
const { v4: uuidv4 } = require("uuid");
const upload = multer({ dest: "uploads/" });

app.use(express.static("uploads"));

app.use(function (req, res, next) {
  // execute anything before the route handler here

  // without next(), the request will hang
  // because express wont pass the request to the next handler

  console.log(req.method, req.url);
  next();
});

app.set("view engine", "ejs");
app.use(upload.single("photo"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//sesion
app.use(
  session({
    secret: "iam asecret on SSR",
    resave: true,
    saveUninitialized: true,
  })
);

//get homepage
app.get("/", function (req, res) {
  if (req.session.isLoggedIn === true) {
    res.render("dashboard", { user: req.session.user });
  } else {
    res.render("homepage", { error: null });
  }
});

//dashboard
app.get("/dashboard", function (req, res) {
  res.render("index");
});

//logout

app.get("/logout", async (req, res) => {
  if (req.session.isLoggedIn) {
    req.session.destroy((err) => {
      if (!err) res.redirect("/");
      else console.log(err);
    });
  }
});
//get login page

app.get("/login", function (req, res) {
  if (req.session.isLoggedIn) {
    res.redirect("/");
  } else {
    res.render("login", { error: null });
  }
});

//get signuppage
app.get("/signup", function (req, res) {
  res.render("signup", { error: null });
});

//signup page post

app.post("/signup", function (req, res) {
  const { email, firstname, lastname, password } = req.body;
  const user = {
    email: email,
    firstname: firstname,
    lastname: lastname,
    password: password,
  };
  //save user to file
  saveUser(user, function (error, flag) {
    if (error) {
      res.render("signup", { error: error });
    } else if (flag === true) {
      res.render("signup", { error: "User already exists. Go to login" });
    } else {
      res.redirect("/login");
    }
  });
});
//login post
app.post("/login", function (req, res) {
  const { email, password } = req.body;
  getAllusers(function (error, users) {
    if (error) {
      res.render("login", { error: error });
    } else {
      const match = users.find(function (user) {
        return user.email === email;
      });
      if (match === undefined) {
        res.render("login", { error: "User not registered !  GO to signup" });
      } else {
        if (match.email === email && match.password === password) {
          req.session.isLoggedIn = true;
          req.session.user = match;
          console.log(req.session.user);
          console.log(req.session);
          // res.send(match);
          res.redirect("/");
        } else {
          res.render("login", { error: "Password is incorrect" });
        }
      }
    }
  });
});

//when new todo recieved
app.post("/addnewtodo", function (req, res) {
  if (!req.session.isLoggedIn) res.redirect("/login");
  const id = uuidv4();
  try {
    fs.readFile(__dirname + "/todo.js", "utf8", function (err, data) {
      if (err) res.status(400).json(err);
      if (data.length === 0) {
        data = "[]";
      }
      let todos = JSON.parse(data);
      todos.push({
        useremail: req.session.user.email,
        name: req.session.user.firstname,
        title: req.body.tasktitle,
        isDone: false,
        id: id,
        image: req.file.filename,
      });
      fs.writeFile(
        __dirname + "/todo.js",
        JSON.stringify(todos),
        function (error) {
          if (error) res.status(400).json(err);
          else res.redirect("/");
        }
      );
    });
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
});

//get all the todos from the file
app.get("/todos", (req, res) => {
  const { useremail } = req.query;
  console.log(useremail);
  try {
    fs.readFile(__dirname + "/todo.js", "utf-8", function (err, data) {
      if (err) {
        return res.status(200).json({
          error: err,
        });
      }
      if (data.length === 0) {
        data = "[]";
      }
      let todos = JSON.parse(data);
      console.log(todos);
      const alltodo = todos.filter((todo) => {
        return todo.useremail === useremail;
      });
      if (alltodo) res.status(200).json({ data: alltodo });
    });
  } catch (error) {
    return res.status(400).json(error);
  }
});

//delete a todo
app.delete("/delete", async (req, res) => {
  const { id } = req.body;
  try {
    fs.readFile(__dirname + "/todo.js", "utf8", function (err, data) {
      if (err) res.status(400).json(err);

      let todos = JSON.parse(data);

      const remaintodos = todos.filter((todo) => {
        return todo.id !== id;
      });
      fs.writeFile("./todo.js", JSON.stringify(remaintodos), function (error) {
        if (error) res.status(400).json(err);
        else
          res.status(200).json({
            message: "Succesfully Deleted todo",
          });
      });
    });
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
});

//mark whether task is done or not
app.post("/markTodo", async (req, res) => {
  const { id, isDone } = req.body;

  try {
    fs.readFile(__dirname + "/todo.js", "utf8", function (err, data) {
      if (err) res.status(400).json(err);

      let todos = JSON.parse(data);
      const newdata = todos.map((todo) => {
        if (todo.id === id) todo.isDone = !todo.isDone;

        return todo;
      });

      fs.writeFile(
        __dirname + "/todo.js",
        JSON.stringify(newdata),
        function (error) {
          if (error) res.status(400).json(err);
          else
            res.status(200).json({
              message: "Succesfully Updated the current todo",
            });
        }
      );
    });
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
});

app.get("/styles.css", function (req, res) {
  res.sendFile(__dirname + "/styles.css");
});

app.listen(8000, () => {
  console.log("server is running at 8000");
});

//to get all the users from file
function getAllusers(callback) {
  fs.readFile("./user.js", "utf-8", function (error, data) {
    if (error) {
      callback(error);
    } else {
      if (data.length === 0) {
        data = "[]";
      }
      try {
        let users = JSON.parse(data);
        callback(null, users);
      } catch (error) {
        callback(null, []);
      }
    }
  });
}

// function save the user
function saveUser(newuser, callback) {
  getAllusers(function (error, users) {
    if (error) {
      callback(error);
    } else {
      const user = users.find(function (user) {
        return user.email === newuser.email;
      });
      if (user) {
        callback(null, true);
      } else {
        users.push(newuser);

        fs.writeFile("./user.js", JSON.stringify(users), function (error) {
          if (error) {
            callback(error);
          } else {
            callback();
          }
        });
      }
    }
  });
}