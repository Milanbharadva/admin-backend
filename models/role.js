"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.hasMany(models.User, {
        foreignKey: "role_id",
        as: "users",
      });
      Role.belongsToMany(models.Permission, {
        through: "RolePermission",
        as: "permissions",
        foreignKey: "role_id",
      });
    }
  }
  Role.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.STRING,
      },
      updated_at: {
        type: DataTypes.STRING,
      },
    },
    {
      sequelize,
      modelName: "Role",
      timestamps: false,
    }
  );
  return Role;
};
