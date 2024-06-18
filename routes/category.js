const express = require("express");
const router = express.Router();
const Category = require("../models").Category;
const passport = require("passport");
require("../config/passport")(passport);
const Helper = require("../utils/helper");
const helper = new Helper();
const multer = require("multer");
const upload = multer(); // This will handle form-data without file uploads
const { Op } = require("sequelize");

// Create a new Category
router.post(
  "/create",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper.checkPermission(req.user.role_id, "Category Create").then(() => {
      if (!req.body.path || !req.body.title) {
        res.status(400).send({
          status: 0,
          message: "The title and path is required",
        });
      } else {
        Category.create({
          parent_id: req.body.parent_id,
          title: req.body.title,
          icon: req.body.icon,
          path: req.body.path,
          sort_order: req.body.sort_order,
          status: req.body.status,
          role_id: req.body.roles || 1,
        })
          .then((perm) =>
            res.status(200).send({
              status: 1,
              message: "Category created successfully",
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
      .checkPermission(req.user.role_id, "Single Category Get")
      .then((rolePerm) => {
        Category.findByPk(req.params.id)
          .then((Category) => {
            if (Category)
              res.status(200).send({
                status: 1,
                message: "",
                data: {
                  ...Category.dataValues,
                },
              });
            else
              res.status(400).send({
                status: 0,
                message: "Category does not exist",
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
      .checkPermission(req.user.role_id, "Category List")
      .then(() => {
        Category.findAndCountAll({
          order: [["sort_order", "asc"]],
          attributes: {
            exclude: ["is_admin", "status", "created_at", "updated_at"],
          },
          where: {
            status: 1,
          },
        })
          .then((result) => {
            const categories = result.rows;
            const categoryMap = {};
            categories.forEach((category) => {
              if (!categoryMap[category.parent_id]) {
                categoryMap[category.parent_id] = [];
              }
              categoryMap[category.parent_id].push(category.dataValues);
            });

            const buildCategoryTree = (parentId) => {
              return (categoryMap[parentId] || []).map((category) => ({
                ...category,
                sub_menus: buildCategoryTree(category.id),
              }));
            };

            const combinedCategories = buildCategoryTree(0);
            res.status(200).send({
              status: 1,
              message: "",
              data: {
                records: combinedCategories,
              },
            });
          })
          .catch((error) => {
            console.error("Error fetching categories:", error);
            res.status(400).send({
              status: 0,
              message: "Error fetching categories",
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
function updateCategoryItems(items, rootid) {
  items.map((item, index) => {
    Category.update(
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
      updateCategoryItems(item.children, item.id);
    }
  });
}

// Update a Category
router.post(
  "/update",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Category Edit")
      .then(() => {
        updateCategoryItems(req.body, 0);
        res.status(200).send({
          status: 1,
          message: "Category updated successfully.",
        });
      })
      .catch((err) => res.status(400).send(err));
  }
);

// Delete a Category
router.delete(
  "/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Category Delete")
      .then((rolePerm) => {
        if (!req.params.id) {
          res.status(400).send({
            message: "Please pass Category ID.",
          });
        } else {
          Category.findByPk(req.params.id)
            .then((perm) => {
              if (!perm) {
                return res.status(400).send({
                  status: 0,
                  message: "Category does not exist!",
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
                    message: "Category deleted",
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
