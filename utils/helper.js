const RolePermission = require("../models").RolePermission;
const Permission = require("../models").Permission;

class Helper {
  constructor() {}

  checkPermission(roleId, permName) {
    return new Promise((resolve, reject) => {
      Permission.findOne({
        where: {
          name: permName,
        },
      })
        .then((perm) => {
          RolePermission.findOne({
            where: {
              role_id: roleId,
              perm_id: perm.id,
            },
          })
            .then((rolePermission) => {
              if (rolePermission) {
                resolve(rolePermission);
              } else {
                reject({ message: "Forbidden" });
              }
            })
            .catch((error) => {
              reject(error);
            });
        })
        .catch(() => {
          reject({ message: "Forbidden" });
        });
    });
  }
}

module.exports = Helper;
