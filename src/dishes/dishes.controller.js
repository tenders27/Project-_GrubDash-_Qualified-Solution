const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

const propertiesToValidate = [
    "name",
    "description",
    "price",
    "image_url"
];

function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find(dish => dish.id === dishId);
  
  if (!foundDish) {
    return next({
      status: 404,
      message: `Dish does not exist: ${dishId}`,
    });
  }

  res.locals.dish = foundDish;
  return next();
}

function bodyHasProperties(propertyNames) {
    return function(req, res, next) {
      const { data = {} } = req.body;
      for (const propertyName of propertyNames) {
        if (!data.hasOwnProperty(propertyName) || data[propertyName] == "") {
          next({
            status: 400,
            message: `Dish must include a '${propertyName}'`,
          });
        }

        if (propertyName === "price") {
          if (typeof data.price !== 'number' || !Number.isInteger(data.price) || data.price <= 0) {
            next({
              status: 400,
              message: "Dish must have a price that is an integer greater than 0",
            });
          }
        }
      }
      return next();
    };
}
// TODO: Implement the /dishes handlers needed to make the tests pass
function create(req, res, next) {
    const newId = nextId();
    const { data: { name, description, price, image_url } = {} } = req.body;
    const newDish = {
        id: newId,
        name,
        description,
        price,
        image_url,
    };
    dishes.push(newDish);
    res.status(201).json({ data: newDish });
}

function read(req, res) {
  res.status(200).json({ data: res.locals.dish });
}

function list(req, res, next) {
  res.json({ data: dishes });
}

function update(req, res, next) {
  const dishToUpdate = res.locals.dish;
  const { data: { id, name, description, price, image_url } = {} } = req.body;
  const { dishId } = req.params;

    // Check if id is in the body and if it matches the dishId from the route
    if (id && id !== dishId) {
      next({
        status: 400,
        message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
      });
    }
  
  // Update the dish
  dishToUpdate.name = name;
  dishToUpdate.description = description;
  dishToUpdate.price = price;
  dishToUpdate.image_url = image_url;

  res.json({ data: dishToUpdate})
}

module.exports = {
    create: [bodyHasProperties(propertiesToValidate), create],
    list,
    update: [dishExists, bodyHasProperties(propertiesToValidate), update],
    read: [dishExists, read],
}