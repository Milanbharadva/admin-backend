const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();
require("../config/passport")(passport);
const User = require("../models").User;
const Role = require("../models").Role;
const Permission = require("../models").Permission;
const multer = require("multer");
const upload = multer();
const Menu = require("../models").Menu;

router.post("/login", upload.none(), function (req, res) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).send({
      status: 0,
      message: "The username and password fields are required.",
    });
  }
  User.findOne({
    where: {
      username: req.body.username,
    },
  })
    .then((user) => {
      if (!user) {
        return res.status(400).send({
          status: 0,
          message: "The selected username is invalid.",
        });
      }
      user.comparePassword(req.body.password, (err, isMatch) => {
        if (isMatch && !err) {
          var token = jwt.sign(
            JSON.parse(JSON.stringify(user)),
            "nodeauthsecret",
            {
              expiresIn: 86400 * 30,
            }
          );
          jwt.verify(token, "nodeauthsecret", function (err, data) {
            // console.log(err, data);
          });
          res.json({
            status: 1,
            message: "Login Successfully.",
            token: token,
          });
        } else {
          res.status(400).send({
            status: 0,
            msg: "Wrong password.",
          });
        }
      });
    })
    .catch((error) => res.status(400).send(error));
});
router.get(
  "/auth-profile",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    const sortColumn = req.body.sort_column || "id";
    const sortBy = req.body.sort_by || "asc";

    // Fetch user data with role and permissions
    const userPromise = User.findByPk(req.user.role_id, {
      attributes: ["id", "name", "username", "email", "phone", "avatar"],
      include: [
        {
          model: Role,
          as: "roles",
          attributes: {
            exclude: ["created_at", "updated_at"],
          },
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: {
                exclude: ["created_at", "updated_at"],
              },
            },
          ],
        },
      ],
    });

    // Fetch menu data and construct the hierarchy
    const menuPromise = Menu.findAndCountAll({
      order: [[sortColumn, sortBy.toUpperCase()]],
      attributes: {
        exclude: ["is_admin", "status", "created_at", "updated_at"],
      },
    });

    // Execute both promises concurrently
    Promise.all([userPromise, menuPromise])
      .then(([user, menuResult]) => {
        if (!user) {
          return res.status(400).send({
            status: 0,
            message: "User does not exist",
          });
        }

        const menus = menuResult.rows;
        const menuMap = {};
        menus.forEach((menu) => {
          if (!menuMap[menu.parent_id]) {
            menuMap[menu.parent_id] = [];
          }
          menuMap[menu.parent_id].push(menu.dataValues);
        });

        const buildMenuTree = (parentId) => {
          return (menuMap[parentId] || []).map((menu) => ({
            ...menu,
            sub_menus: buildMenuTree(menu.id),
          }));
        };

        const combinedMenus = buildMenuTree(0);
        const roles = {
          id: user.roles.dataValues.id,
          slug: user.roles.dataValues.slug,
          name: user.roles.dataValues.name,
        };

        const permissions = user.roles.dataValues.permissions.map(
          (permission) => ({
            id: permission.id,
            slug: permission.slug,
            name: permission.name,
          })
        );
        const response = {
          status: 1,
          message: "",
          data: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            phone: user.phone || "",
            avatar: user.avatar || "",
            roles: roles,
            permissions: permissions,
            menus: combinedMenus,
          },
        };

        res.status(200).send(response);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        res.status(400).send({
          status: 0,
          message: "Error fetching data",
          error: error.message,
        });
      });
  }
);

router.post(
  "/logout",
  passport.authenticate("jwt", { session: false }),
  upload.none(),
  function (req, res) {
    res.json({
      status: 1,
      message: "Logout successful.",
    });
  }
);

module.exports = router;
