"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      Permission.belongsToMany(models.Role, {
        through: "RolePermission",
        as: "roles",
        foreignKey: "perm_id",
      });
    }
  }
  Permission.init(
    {
      name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
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
      modelName: "Permission",
      timestamps: false,
    }
  );
  return Permission;
};
