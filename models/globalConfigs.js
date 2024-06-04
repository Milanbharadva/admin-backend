"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GlobalConfigs extends Model {
    static associate(models) {
      // Define associations here if needed
    }
  }
  GlobalConfigs.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      value: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      modelName: "GlobalConfigs",
      tableName: "GlobalConfigs", // Set the table name explicitly
      timestamps: false, // If timestamps are not needed
    }
  );
  return GlobalConfigs;
};
