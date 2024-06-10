const express = require("express");
const router = express.Router();
const Permission = require("../models").Permission;
const passport = require("passport");
require("../config/passport")(passport);
const Helper = require("../utils/helper");
const helper = new Helper();
const multer = require("multer");
const upload = multer(); // This will handle form-data without file uploads
const { Op } = require("sequelize");

// Create a new permission
router.post(
  "/create",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Permission Create")
      .then(() => {
        if (!req.body.name) {
          res.status(400).send({
            status: 0,
            message: "The name field is required",
          });
        } else {
          Permission.create({
            name: req.body.name,
            slug: req.body.name.split(" ").join("-"),
          })
            .then((perm) =>
              res.status(200).send({
                status: 1,
                message: "Permission created successfully",
              })
            )
            .catch((error) => {
              if (error.name == "SequelizeUniqueConstraintError") {
                res.status(400).send({
                  status: 0,
                  message: "The name has already been taken.",
                });
              } else {
                console.log(error);
                res.status(400).send(error);
              }
            });
        }
      })
      .catch((error) => {
        res.status(403).send(error);
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
      .checkPermission(req.user.role_id, "Single Permission Get")
      .then((rolePerm) => {
        Permission.findByPk(req.params.id)
          .then((permission) => {
            if (permission)
              res.status(200).send({
                status: 1,
                message: "",
                data: {
                  ...permission.dataValues,
                },
              });
            else
              res.status(400).send({
                status: 0,
                message: "permission does not exist",
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
      .checkPermission(req.user.role_id, "Permission List")
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

        Permission.findAndCountAll({
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
        Permission.findAndCountAll({
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
                  : `http://localhost:4004/api/admin/permissions/all?page=${page + 1}`,
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

// Update a permission
router.post(
  "/update/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Permission Edit")
      .then(() => {
        if (!req.params.id || !req.body.name) {
          res.status(400).send({
            status: 0,
            message: "The name field is required.",
          });
        } else {
          Permission.findByPk(req.params.id)
            .then((perm) => {
              if (!perm) {
                return res.status(400).send({
                  status: 0,
                  message: "Permission does not exist",
                });
              }
              Permission.update(
                {
                  name: req.body.name || perm.name,
                  slug: req.body.name.split(" ").join("-") || perm.slug,
                },
                {
                  where: {
                    id: req.params.id,
                  },
                }
              )
                .then((_) => {
                  if (_[0] === 1)
                    res.status(200).send({
                      status: 1,
                      message: "Permission updated successfully.",
                    });
                  else
                    res.status(400).send({
                      status: 0,
                      message: "Error In Update",
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

// Delete a permission
router.delete(
  "/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Permission Delete")
      .then((rolePerm) => {
        if (!req.params.id) {
          res.status(400).send({
            message: "Please pass permission ID.",
          });
        } else {
          Permission.findByPk(req.params.id)
            .then((perm) => {
              if (!perm) {
                return res.status(400).send({
                  status: 0,
                  message: "Permission does not exist!",
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
                    message: "permission deleted",
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
