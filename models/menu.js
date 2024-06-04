"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Menu extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }

  Menu.init(
    {
      parent_id: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      title: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_admin: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Menu",
      timestamps: false,
    }
  );

  return Menu;
};
