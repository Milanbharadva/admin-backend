"use strict";
const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../config/passport")(passport);
const Helper = require("../utils/helper");
const helper = new Helper();
const multer = require("multer");
const GlobalConfigs = require("../models").GlobalConfigs;
const upload = multer();
router.post(
  "/globalconfigs/create",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "GlobalConfig Create")
      .then(() => {
        if (!req.body.slug || !req.body.value) {
          res.status(400).send({
            status: 0,
            message: "Both slug and value fields are required",
          });
        } else {
          GlobalConfigs.create({
            slug: req.body.slug,
            value: req.body.value,
            description: req.body.description || null,
            status: req.body.status || 1,
          })
            .then((config) =>
              res.status(200).send({
                status: 1,
                message: "Global configuration created successfully",
              })
            )
            .catch((error) => {
              if (error.name === "SequelizeUniqueConstraintError") {
                res.status(400).send({
                  status: 0,
                  message: "The slug has already been taken.",
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
router.post(
  "/globalsettings/store",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    const settings = req.body.settings;
    if (typeof settings !== "object" || settings === null) {
      return res.status(400).send({
        status: 0,
        message: "Invalid settings format",
      });
    }

    helper
      .checkPermission(req.user.role_id, "GlobalConfig Create")
      .then(() => {
        for (const itemKey in settings) {
          if (Object.prototype.hasOwnProperty.call(settings, itemKey)) {
            for (const inputItems of Object.values(settings[itemKey])) {
              for (const inputItem of Object.values(inputItems)) {
                if (inputItem.required == 1 && !inputItem.value) {
                  return res.status(400).send({
                    status: 0,
                    message: "All fields are required",
                  });
                }
              }
            }
          }
        }

        const createOrUpdatePromises = [];
        for (const itemKey in settings) {
          if (Object.prototype.hasOwnProperty.call(settings, itemKey)) {
            for (const inputItems of Object.values(settings[itemKey])) {
              for (const inputItem of Object.values(inputItems)) {
                createOrUpdatePromises.push(
                  GlobalConfigs.findOne({
                    where: { slug: inputItem.slug },
                  }).then((existingConfig) => {
                    if (existingConfig) {
                      return existingConfig.update({
                        value: inputItem.value,
                        status: inputItem.status || 1,
                      });
                    } else {
                      return GlobalConfigs.create({
                        slug: inputItem.slug,
                        value: inputItem.value,
                        status: inputItem.status || 1,
                      });
                    }
                  })
                );
              }
            }
          }
        }

        Promise.all(createOrUpdatePromises)
          .then(() => {
            res.status(200).send({
              status: 1,
              message: "Global configuration created/updated successfully",
            });
          })
          .catch((err) => {
            res.status(500).send({
              status: 0,
              message: "Error creating/updating global configurations",
              error: err.message,
            });
          });
      })
      .catch(() => {
        res.status(403).send({
          status: 0,
          message: "Permission denied",
        });
      });
  }
);

router.post(
  "/globalconfigs/list",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "GlobalConfig List")
      .then((rolePerm) => {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        GlobalConfigs.findAndCountAll({
          limit: limit,
          offset: offset,
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
                last_page: Math.ceil(result.count / limit),
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
router.get(
  "/globalsettings/list",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "GlobalConfig List")
      .then((rolePerm) => {
        GlobalConfigs.findAndCountAll().then((result) => {
          res.status(200).send({
            status: 1,
            message: "",
            data: result.rows,
          });
        });
      })
      .catch((error) => {
        res.status(403).send(error);
      });
  }
);
router.get(
  "/globalconfigs/detail/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Single GlobalConfig Get")
      .then(() => {
        GlobalConfigs.findByPk(req.params.id)
          .then((config) => {
            if (config)
              res.status(200).send({
                status: 1,
                message: "",
                data: config,
              });
            else
              res.status(400).send({
                status: 0,
                message: "Global configuration does not exist",
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
  "/globalconfigs/update/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  upload.none(),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "GlobalConfig Edit")
      .then(() => {
        GlobalConfigs.findByPk(req.params.id)
          .then((config) => {
            if (!config) {
              return res.status(400).send({
                status: 0,
                message: "Global configuration does not exist",
              });
            }
            GlobalConfigs.update(
              {
                slug: req.body.slug || config.slug,
                value: req.body.value || config.value,
                description: req.body.description || config.description,
                status: req.body.status || config.status,
                updated_at: new Date(),
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
                    message: "Global configuration updated successfully",
                  });
                else
                  res.status(400).send({
                    status: 0,
                    message: "Error in updating global configuration",
                  });
              })
              .catch((err) => res.status(400).send(err));
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
router.delete(
  "/globalconfigs/delete/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  function (req, res) {
    helper
      .checkPermission(req.user.role_id, "Globalconfig Delete")
      .then(() => {
        GlobalConfigs.findByPk(req.params.id)
          .then((config) => {
            if (!config) {
              return res.status(400).send({
                status: 0,
                message: "Global configuration does not exist",
              });
            }
            config
              .destroy()
              .then((_) => {
                res.status(200).send({
                  status: 1,
                  message: "Global configuration deleted",
                });
              })
              .catch((err) => res.status(400).send(err));
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

module.exports = router;
