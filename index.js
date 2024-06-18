var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var rolesRouter = require("./routes/roles");
var permsRouter = require("./routes/permissions");
var authRouter = require("./routes/auth");
var productRouter = require("./routes/products");
var menuRouter = require("./routes/menus");
var categoryRouter = require("./routes/category");
var globalconfigsRouter = require("./routes/globalconfigs");
const bodyParser = require("body-parser");
const { title } = require("process");
var port = 4004;
var app = express();
app.use(cors());
app.use(
  cors({
    origin: "*",
  })
);
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.use(bodyParser.json());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/api/admin/", authRouter);
app.use("/api/admin/users", usersRouter);
app.use("/api/admin/roles", rolesRouter);
app.use("/api/admin/permissions", permsRouter);
app.use("/api/admin/products", productRouter);
app.use("/api/admin/menus", menuRouter);
app.use("/api/admin/categories", categoryRouter);
app.use("/api/admin", globalconfigsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error", { title: "error " });
});
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});
module.exports = app;
