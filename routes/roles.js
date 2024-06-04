const express = require("express");
const router = express.Router();
const User = require("../models").User;
const Role = require("../models").Role;
const Permission = require("../models").Permission;
const RolePermission = require("../models").RolePermission;
const passport = require("passport");
require("../config/passport")(passport);
const Helper = require("../utils/helper");
const helper = new Helper();
const multer = require("multer");
const upload = multer();
const { Op } = require("sequelize");

// Create a new Role
router.post(
  "/create",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  async function (req, res) {
    try {
      await helper.checkPermission(req.user.role_id, "Role Create");

      if (!req.body.name) {
        return res.status(400).send({
          status: 0,
          message: "The name field is required.",
        });
      }

      const role = await Role.create({
        name: req.body.name,
        slug: req.body.name.split(" ").join("-"),
      });

      if (role && role.id && req.body.permissions) {
        for (const permissionId of req.body.permissions) {
          try {
            const perm = await Permission.findByPk(permissionId);
            if (perm) {
              await role.addPermissions(perm, {
                through: {
                  selfGranted: false,
                },
              });
            } else {
              return res.status(400).send({
                success: false,
                message: `Permission with ID ${permissionId} not found.`,
              });
            }
          } catch (error) {
            return res.status(400).send({
              success: false,
              msg: error.message,
            });
          }
        }
      }

      return res.status(200).send({
        status: 1,
        message: "Role created successfully",
      });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).send({
          status: 0,
          message: "The name has already been taken.",
        });
      } else if (!res.headersSent) {
        return res.status(500).send({
          status: 0,
          message: error.message || "An error occurred",
        });
      }
    }
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
      .checkPermission(req.user.role_id, "Role List")
      .then((rolePerm) => {
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
        Role.findAndCountAll({
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
router.post(
  "/all",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Permission List")
      .then(() => {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.body.per_page, 10) || 10;
        const offset = (page - 1) * limit;
        const sortColumn = req.body.sort_column || "id";
        const sortBy = req.body.sort_by || "asc";
        const filters = req.body.q || [];

        let whereCondition = {};

        if (filters) {
          const filterColumn = "name";
          const filterOperation = "like";
          const filterValue = req.body.q;

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
        }
        Role.findAndCountAll({
          attributes: ["id", ["name", "text"]], // Fetch only 'id' and 'name' as 'text'
          limit: limit,
          offset: offset,
          order: [[sortColumn, sortBy.toUpperCase()]],
          where: whereCondition,
        })
          .then((result) => {
            const totalPages = Math.ceil(result.count / limit);
            res.status(200).send({
              current_page: page,
              data: result.rows,
              next_page_url:
                totalPages === page
                  ? null
                  : `http://localhost:4004/api/admin/roles/all?page=${page + 1}`,
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
// Get Role by ID
router.get(
  "/detail/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Single Role Get")
      .then((rolePerm) => {})
      .catch((error) => {
        res.status(403).send(error);
      });
    Role.findByPk(req.params.id, {
      include: {
        model: Permission,
        as: "permissions",
      },
    })
      .then((roles) => {
        if (roles)
          res.status(200).send({
            status: 1,
            message: "",
            data: {
              ...roles.dataValues,
            },
          });
        else
          res.status(400).send({
            status: 0,
            message: "Role not exist",
          });
      })
      .catch((error) => {
        res.status(400).send({
          success: false,
          msg: error,
        });
      });
  }
);

// Update a Role
router.post(
  "/update/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  async function (req, res) {
    try {
      // Check permission
      await helper.checkPermission(req.user.role_id, "Role Edit");

      // Check if Role ID is provided
      if (!req.params.id) {
        return res.status(400).send({
          msg: "Please pass Role ID.",
        });
      }

      // Find the role by ID
      const role = await Role.findByPk(req.params.id);
      if (!role) {
        return res.status(400).send({
          status: 0,
          message: "Role not found.",
        });
      }

      // Update role's name and slug
      const updatedRole = await Role.update(
        {
          name: req.body.name || role.name,
          slug: req.body.name ? req.body.name.split(" ").join("-") : role.slug,
        },
        {
          where: { id: req.params.id },
        }
      );
      // If permissions are provided, update them
      if (req.body.permissions) {
        await RolePermission.destroy({
          where: { role_id: role.id },
        });

        for (const permissionId of req.body.permissions) {
          const perm = await Permission.findByPk(permissionId);
          if (perm) {
            await role.addPermissions(perm, {
              through: { selfGranted: false },
            });
          } else {
            return res.status(400).send({
              success: false,
              message: `Permission with ID ${permissionId} not found.`,
            });
          }
        }
      }
      // Send success response
      return res.status(200).send({
        status: 1,
        message: "Role updated successfully",
      });
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

// Delete a Role
router.delete(
  "/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  async function (req, res) {
    try {
      await helper.checkPermission(req.user.role_id, "Role Delete");

      if (!req.params.id) {
        return res.status(400).send({
          msg: "Please pass role ID.",
        });
      }

      const role = await Role.findByPk(req.params.id);
      if (!role) {
        return res.status(400).send({
          status: 0,
          message: "Role not found",
        });
      }

      await Role.destroy({
        where: {
          id: req.params.id,
        },
      });

      await RolePermission.destroy({
        where: { role_id: req.params.id },
      });

      return res.status(200).send({
        status: 1,
        message: "Role deleted",
      });
    } catch (error) {
      if (!res.headersSent) {
        return res.status(500).send({
          success: false,
          msg: error.message || "An error occurred",
        });
      }
    }
  }
);

module.exports = router;
