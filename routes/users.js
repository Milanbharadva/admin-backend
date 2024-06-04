const express = require("express");
const router = express.Router();
const User = require("../models").User;
const Role = require("../models").Role;
const Permission = require("../models").Permission;
const passport = require("passport");
require("../config/passport")(passport);
const Helper = require("../utils/helper");
const helper = new Helper();
const multer = require("multer");
const upload = multer();
const { Op } = require("sequelize");
// Create a new User
router.post(
  "/create",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper.checkPermission(req.user.role_id, "User Create").then(() => {
      const { roles, email, password, username, ...optionalFields } = req.body;

      if (!roles || !email || !password || !username) {
        return res.status(400).send({
          msg: "Please pass Role ID, email, password, and username.",
        });
      }

      const userData = {
        email,
        password,
        username,
        role_id: roles[0],
        ...optionalFields,
      };

      User.create(userData)
        .then(() =>
          res.status(200).send({
            status: 1,
            message: "User created successfully",
          })
        )
        .catch((error) => {
          if (error.name == "SequelizeUniqueConstraintError") {
            res.status(400).send({
              status: 0,
              message: "The username has already been taken.",
            });
          }
        });
    });
    // .catch((error) => {
    //   res.status(403).send({
    //     status: 0,
    //     message: error.message || "Permission denied.",
    //   });
    // });
  }
);

// Get List of Users
router.post(
  "/list",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "User List")
      .then(() => {
        const page = parseInt(req.body.page, 10) || 1;
        const limit = parseInt(req.body.per_page, 10) || 10;
        const offset = (page - 1) * limit;
        const sortColumn = req.body.sort_column || "id";
        const sortBy = req.body.sort_by || "asc";
        const searchTerm =
          (req.body.global_filters && req.body.global_filters.value) || "";
        const searchColumns =
          (req.body.global_filters && req.body.global_filters.columns) || [];
        const filters = req.body.filters || [];

        let whereCondition = {};

        // Apply global search
        if (searchTerm && searchColumns.length > 0) {
          whereCondition[Op.and] = [
            {
              [Op.or]: searchColumns.map((column) => ({
                [column]: {
                  [Op.like]: `%${searchTerm}%`,
                },
              })),
            },
          ];
        }

        // Apply specific column filters
        if (filters.length > 0) {
          filters.forEach((filter) => {
            const filterColumn = filter.field;
            const filterOperation = filter.operation;
            const filterValue = filter.value;

            if (filterColumn && filterOperation && filterValue) {
              if (!whereCondition[Op.and]) {
                whereCondition[Op.and] = [];
              }
              whereCondition[Op.and].push({
                [filterColumn]: {
                  [Op[filterOperation]]: `%${filterValue}%`,
                },
              });
            }
          });
        }

        User.findAndCountAll({
          attributes: {
            exclude: [
              "role_id",
              "password",
              "remember_token",
              "platform",
              "ip",
              "user_agent",
            ],
          }, // Exclude fields you want to hide
          include: [
            {
              model: Role,
              as: "roles",
              attributes: {
                exclude: ["created_at", "updated_at"],
              },
            },
          ],
          limit: limit,
          offset: offset,
          order: [[sortColumn, sortBy.toUpperCase()]],
          where: whereCondition,
        })
          .then((result) => {
            const totalPages = Math.ceil(result.count / limit);
            res.status(200).send({
              status: 1,
              message: "",
              data: {
                total: result.count,
                per_page: limit,
                current_page: page,
                last_page: totalPages,
                records: result.rows,
              },
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

// Get User by ID
router.get(
  "/detail/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Single User Get")
      .then((rolePerm) => {
        User.findByPk(req.params.id, {
          attributes: {
            exclude: [
              "remember_token",
              "password",
              "role_id",
              "platform",
              "ip",
              "user_agent",
            ],
          },
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
        })
          .then((user) => {
            if (user) {
              res.status(200).send({
                status: 1,
                message: "",
                data: user, // Automatically includes associated Role and Permissions
              });
            } else {
              res.status(400).send({
                status: 0,
                message: "User not exist",
              });
            }
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

// Update a User
router.post(
  "/update/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  async function (req, res) {
    try {
      // Check permission
      await helper.checkPermission(req.user.role_id, "User Edit");

      // Check if Role ID is provided
      if (!req.params.id) {
        return res.status(400).send({
          msg: "Please pass User ID.",
        });
      }

      // Find the role by ID
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(400).send({
          status: 0,
          message: "User not found.",
        });
      }
      const { roles, ...otherFields } = req.body;
      // Update role's name and slug
      let updateField;
      if (roles) {
        updateField = {
          role_id: roles[0],
          ...otherFields,
        };
      } else {
        updateField = { ...otherFields };
      }
      const updatedRole = await User.update(updateField, {
        where: { id: req.params.id },
      });
      if (updatedRole) {
        return res.status(200).send({
          status: 1,
          message: "User updated successfully",
        });
      } else {
        return res.status(200).send({
          status: 0,
          message: "User updated failed",
        });
      }
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).send({
          status: 0,
          message: "The name has already been taken.",
        });
      } else {
        return res.status(500).send({
          success: false,
          msg: error.message || "An error occurred",
        });
      }
    }
  }
);

// Delete a User
router.delete(
  "/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Role Delete")
      .then((rolePerm) => {
        if (!req.params.id) {
          res.status(400).send({
            msg: "Please pass user ID.",
          });
        } else {
          User.findByPk(req.params.id)
            .then((user) => {
              if (user) {
                User.destroy({
                  where: {
                    id: req.params.id,
                  },
                })
                  .then((_) => {
                    res.status(200).send({
                      status: 1,
                      message: "User deleted",
                    });
                  })
                  .catch((err) => res.status(400).send(err));
              } else {
                res.status(400).send({
                  status: 0,
                  message: "User not found",
                });
              }
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
