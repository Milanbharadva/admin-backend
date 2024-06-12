const express = require("express");
const router = express.Router();
const Menu = require("../models").Menu;
const passport = require("passport");
require("../config/passport")(passport);
const Helper = require("../utils/helper");
const helper = new Helper();
const multer = require("multer");
const upload = multer(); // This will handle form-data without file uploads
const { Op } = require("sequelize");

// Create a new Menu
router.post(
  "/create",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper.checkPermission(req.user.role_id, "Menu Create").then(() => {
      console.log(req.user.role_id);
      if (!req.body.path || !req.body.title) {
        res.status(400).send({
          status: 0,
          message: "The title and path is required",
        });
      } else {
        Menu.create({
          parent_id: req.body.parent_id,
          title: req.body.title,
          icon: req.body.icon,
          path: req.body.path,
          sort_order: req.body.sort_order,
          status: req.body.status,
          role_id: req.body.roles[0] || 1,
        })
          .then((perm) =>
            res.status(200).send({
              status: 1,
              message: "Menu created successfully",
            })
          )
          .catch((error) => {
            if (error.name == "SequelizeUniqueConstraintError") {
              res.status(400).send({
                status: 0,
                message: "The path has already been taken.",
              });
            } else {
              console.log(error);
              res.status(400).send(error);
            }
          });
      }
    });
  }
);
router.get(
  "/detail/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Single Menu Get")
      .then((rolePerm) => {
        Menu.findByPk(req.params.id)
          .then((Menu) => {
            if (Menu)
              res.status(200).send({
                status: 1,
                message: "",
                data: {
                  ...Menu.dataValues,
                },
              });
            else
              res.status(400).send({
                status: 0,
                message: "Menu does not exist",
              });
          })
          .catch((error) => {
            res.status(400).send(error);
          });
      })
      .catch((error) => {
        res.status(403).send(error);
      });
  }
);
router.post(
  "/list",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Menu List")
      .then(() => {
        Menu.findAndCountAll({
          order: [["sort_order", "asc"]],
          attributes: {
            exclude: ["is_admin", "status", "created_at", "updated_at"],
          },
          where: {
            status: 1,
          },
        })
          .then((result) => {
            const menus = result.rows;
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
            res.status(200).send({
              status: 1,
              message: "",
              data: {
                records: combinedMenus,
              },
            });
          })
          .catch((error) => {
            console.error("Error fetching menus:", error);
            res.status(400).send({
              status: 0,
              message: "Error fetching menus",
              error: error.message,
            });
          });
      })
      .catch((error) => {
        console.error("Permission check failed:", error);
        res.status(403).send({
          status: 0,
          message: "Permission denied",
          error: error.message,
        });
      });
  }
);
function updateMenuItems(items, rootid) {
  items.map((item, index) => {
    Menu.update(
      {
        parent_id: rootid,
        sort_order: index,
      },
      {
        where: {
          id: item.id,
        },
      }
    );
    if (item.children && item.children.length > 0) {
      updateMenuItems(item.children, item.id);
    }
  });
}

// Update a Menu
router.post(
  "/update",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    console.log(req.body);
    helper
      .checkPermission(req.user.role_id, "Menu Edit")
      .then(() => {
        updateMenuItems(req.body, 0);
        res.status(200).send({
          status: 1,
          message: "Menu updated successfully.",
        });
      })
      .catch((err) => res.status(400).send(err));
  }
);

// Delete a Menu
router.delete(
  "/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Menu Delete")
      .then((rolePerm) => {
        if (!req.params.id) {
          res.status(400).send({
            message: "Please pass Menu ID.",
          });
        } else {
          Menu.findByPk(req.params.id)
            .then((perm) => {
              if (!perm) {
                return res.status(400).send({
                  status: 0,
                  message: "Menu does not exist!",
                });
              }
              perm
                .destroy({
                  where: {
                    id: req.params.id,
                  },
                })
                .then((_) => {
                  res.status(200).send({
                    status: 1,
                    message: "Menu deleted",
                  });
                })
                .catch((err) => res.status(400).send(err));
            })
            .catch((error) => {
              res.status(400).send(error);
            });
        }
      })
      .catch((error) => {
        res.status(403).send(error);
      });
  }
);

module.exports = router;
