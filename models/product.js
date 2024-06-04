"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Product.init(
    {
      prod_name: DataTypes.STRING,
      prod_description: DataTypes.STRING,
      prod_image: DataTypes.STRING,
      prod_price: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Product",
      timestamps: false, // Disable the automatic `createdAt` and `updatedAt` fields
    }
  );
  return Product;
};
